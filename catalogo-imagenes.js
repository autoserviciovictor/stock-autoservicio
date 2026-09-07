const sharp = require("sharp");
const {
  obtenerProductoCatalogoAdminDb,
  guardarResultadoImagenCatalogoDb,
  obtenerImagenCatalogoDb,
  listarPendientesImagenCatalogoDb,
} = require("./db-catalogo-publico");
const { ESTADOS_IMAGEN } = require("./catalogo-imagenes-estado");
const { buscarCandidatosMultiples, urlHttps } = require("./catalogo-imagenes-busqueda");

const IMAGEN_TIMEOUT_MS = 8000;
const MAX_IMAGEN_BYTES = 8 * 1024 * 1024;
const MAX_LOTE = 60;
const CONCURRENCIA = 3;
const LADO_CATALOGO = 600;
const FONDO_BLANCO_MINIMO = 0.88;

async function descargarImagen(url, timeoutMs = IMAGEN_TIMEOUT_MS) {
  const segura = urlHttps(url);
  if (!segura) throw new Error("URL de imagen inválida");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(segura, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
        "User-Agent": "AutoservicioVictorCatalogo/1.0 (image-quality-check)",
      },
    });
    if (!r.ok) throw new Error(`La imagen respondió HTTP ${r.status}`);
    const tipo = String(r.headers.get("content-type") || "").toLowerCase();
    if (!tipo.startsWith("image/")) throw new Error("El recurso encontrado no es una imagen");
    const largo = Number(r.headers.get("content-length") || 0);
    if (largo > MAX_IMAGEN_BYTES) throw new Error("La imagen supera el tamaño permitido");
    const data = Buffer.from(await r.arrayBuffer());
    if (!data.length || data.length > MAX_IMAGEN_BYTES) throw new Error("La imagen está vacía o es demasiado grande");
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function porcentajeBlancoEnBorde(raw, width, height, channels) {
  let total = 0;
  let blancos = 0;
  const espesor = Math.max(2, Math.round(Math.min(width, height) * 0.08));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const borde = x < espesor || y < espesor || x >= width - espesor || y >= height - espesor;
      if (!borde) continue;
      const i = (y * width + x) * channels;
      const r = raw[i] ?? 255;
      const g = raw[i + 1] ?? r;
      const b = raw[i + 2] ?? r;
      total += 1;
      if (r >= 238 && g >= 238 && b >= 238) blancos += 1;
    }
  }
  return total ? blancos / total : 0;
}

function cajaProducto(raw, width, height, channels) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let pixeles = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      const r = raw[i] ?? 255;
      const g = raw[i + 1] ?? r;
      const b = raw[i + 2] ?? r;
      if (r < 242 || g < 242 || b < 242) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        pixeles += 1;
      }
    }
  }
  if (maxX < 0 || maxY < 0) return null;
  return {
    minX,
    minY,
    maxX,
    maxY,
    ancho: maxX - minX + 1,
    alto: maxY - minY + 1,
    ocupacion: pixeles / (width * height),
  };
}

async function analizarCalidadImagen(buffer) {
  try {
    const base = sharp(buffer, { failOn: "none" }).rotate();
    const meta = await base.metadata();
    const width = Number(meta.width) || 0;
    const height = Number(meta.height) || 0;
    if (width < 400 || height < 400) {
      return { acepta: false, motivo: "resolución menor a 400×400", width, height, score: 0 };
    }

    const { data, info } = await base.clone().resize(128, 128, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const blancoBorde = porcentajeBlancoEnBorde(data, info.width, info.height, info.channels);
    const caja = cajaProducto(data, info.width, info.height, info.channels);
    if (!caja) return { acepta: false, motivo: "no se detectó el producto", width, height, score: 0 };

    const anchoRel = caja.ancho / info.width;
    const altoRel = caja.alto / info.height;
    const tocaBorde = caja.minX <= 1 || caja.minY <= 1 || caja.maxX >= info.width - 2 || caja.maxY >= info.height - 2;

    if (blancoBorde < FONDO_BLANCO_MINIMO) {
      return { acepta: false, motivo: "el fondo no es suficientemente blanco", width, height, blancoBorde, score: Math.round(blancoBorde * 100) };
    }
    if (tocaBorde || anchoRel > 0.96 || altoRel > 0.96) {
      return { acepta: false, motivo: "el producto está recortado o toca los bordes", width, height, blancoBorde, score: 55 };
    }
    if (anchoRel < 0.16 || altoRel < 0.34 || caja.ocupacion < 0.035) {
      return { acepta: false, motivo: "el producto aparece demasiado pequeño", width, height, blancoBorde, score: 55 };
    }

    const score = Math.min(99, Math.max(70, Math.round(blancoBorde * 80 + Math.min(0.19, caja.ocupacion) * 100)));
    return { acepta: true, motivo: "fondo blanco y escala apta", width, height, blancoBorde, score, caja };
  } catch (error) {
    return { acepta: false, motivo: `imagen no procesable: ${error?.message || "formato inválido"}`, score: 0 };
  }
}

async function normalizarImagenCatalogo(buffer) {
  return sharp(buffer, { failOn: "none" })
    .rotate()
    .flatten({ background: "#ffffff" })
    .trim({ background: "#ffffff", threshold: 12 })
    .resize(LADO_CATALOGO - 96, LADO_CATALOGO - 96, { fit: "inside", withoutEnlargement: true })
    .extend({ top: 48, bottom: 48, left: 48, right: 48, background: "#ffffff" })
    .resize(LADO_CATALOGO, LADO_CATALOGO, { fit: "contain", background: "#ffffff" })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

async function validarCandidato(candidato) {
  if (!candidato?.url) return null;
  const urls = [...new Set([candidato.url, candidato.fallbackUrl].map(urlHttps).filter(Boolean))];
  for (const url of urls) {
    try {
      const buffer = await descargarImagen(url);
      const calidad = await analizarCalidadImagen(buffer);
      if (!calidad.acepta) continue;
      const normalizada = await normalizarImagenCatalogo(buffer);
      return {
        ...candidato,
        url,
        puntaje: Math.max(Number(candidato.puntaje) || 0, calidad.score || 0),
        calidadVerificada: true,
        calidad,
        normalizada,
        mime: "image/jpeg",
      };
    } catch {
      // Si el sitio original bloquea la descarga, intentamos la miniatura proxy de Brave.
    }
  }
  return null;
}

async function prepararPreviewCandidatos(candidatos = [], limite = 6) {
  for (const candidato of candidatos.slice(0, Math.max(1, limite))) {
    const valido = await validarCandidato({
      ...candidato,
      puntaje: candidato.puntajePreliminar,
      exacta: candidato.exactaEAN,
    });
    if (valido) return valido;
  }
  return null;
}

async function buscarImagenProducto(codigo, { guardar = true } = {}) {
  const producto = await obtenerProductoCatalogoAdminDb(codigo);
  if (!producto) throw new Error("Producto no encontrado");

  const confirmada = await obtenerImagenCatalogoDb(producto.codigo, "confirmada");
  if (producto.estadoImagen === ESTADOS_IMAGEN.CONFIRMADA && confirmada?.data) {
    return {
      encontrado: true,
      confirmado: true,
      omitido: true,
      motivo: "imagen_confirmada",
      producto,
    };
  }

  if (!guardar) {
    const busqueda = await buscarCandidatosMultiples(producto);
    return { producto, ...busqueda };
  }

  await guardarResultadoImagenCatalogoDb(producto.codigo, {
    estado: ESTADOS_IMAGEN.BUSCANDO,
    candidatoUrl: "",
    candidatoFuente: "",
    candidatoTitulo: "",
    candidatoPuntaje: 0,
    candidatoData: null,
    candidatoMime: "",
    candidatos: [],
    error: "",
  });

  try {
    // P1B: las fuentes solo descubren candidatos. Ninguna fuente confirma o
    // escribe una imagen final. Guardamos la lista completa para la P2.
    const busqueda = await buscarCandidatosMultiples(producto);
    if (busqueda.candidatos.length) {
      // Conservamos una vista previa compatible con el editor actual, pero no
      // representa una selección definitiva. La P2 puntuará y elegirá sola.
      const preview = await prepararPreviewCandidatos(busqueda.candidatos);
      const representativo = preview || busqueda.candidatos[0];
      await guardarResultadoImagenCatalogoDb(producto.codigo, {
        estado: ESTADOS_IMAGEN.CANDIDATO,
        candidatoUrl: representativo.url,
        candidatoFuente: representativo.fuente,
        candidatoTitulo: representativo.titulo,
        candidatoPuntaje: preview ? preview.puntaje : representativo.puntajePreliminar,
        candidatoData: preview?.normalizada || null,
        candidatoMime: preview?.mime || "",
        candidatos: busqueda.candidatos,
        error: preview ? "" : `${busqueda.candidatos.length} candidatos encontrados; la selección automática se realizará en la P2.`,
      });
      return {
        encontrado: true,
        confirmado: false,
        candidato: representativo,
        candidatos: busqueda.candidatos,
        cantidadCandidatos: busqueda.candidatos.length,
        fuentes: busqueda.fuentes,
        consultas: busqueda.consultas,
        producto: await obtenerProductoCatalogoAdminDb(producto.codigo),
      };
    }

    const mensaje = busqueda.braveConfigurado
      ? "No se encontraron candidatos de imagen para este producto."
      : "No se encontraron candidatos por EAN. La búsqueda ampliada requiere BRAVE_SEARCH_API_KEY.";
    await guardarResultadoImagenCatalogoDb(producto.codigo, {
      estado: ESTADOS_IMAGEN.SIN_RESULTADO,
      candidatoUrl: "",
      candidatoFuente: "",
      candidatoTitulo: "",
      candidatoPuntaje: 0,
      candidatoData: null,
      candidatoMime: "",
      candidatos: [],
      error: mensaje,
    });
    return {
      encontrado: false,
      confirmado: false,
      candidato: null,
      candidatos: [],
      cantidadCandidatos: 0,
      mensaje,
      requiereConfiguracion: busqueda.requiereConfiguracion,
      producto: await obtenerProductoCatalogoAdminDb(producto.codigo),
    };
  } catch (error) {
    await guardarResultadoImagenCatalogoDb(producto.codigo, {
      estado: ESTADOS_IMAGEN.ERROR,
      candidatos: [],
      error: error?.message || "Error inesperado durante la búsqueda de imagen",
    });
    throw error;
  }
}

async function obtenerImagenNormalizadaProducto(codigo, tipo = "candidato") {
  const guardada = await obtenerImagenCatalogoDb(codigo, tipo);
  if (guardada?.data) return { buffer: guardada.data, mime: guardada.mime || "image/jpeg" };

  // Compatibilidad con imágenes guardadas antes de esta corrección: se importan una sola vez.
  const producto = await obtenerProductoCatalogoAdminDb(codigo);
  if (!producto) throw new Error("Producto no encontrado");
  const esCandidato = tipo === "candidato";
  const url = esCandidato ? (producto.candidatoImagen || producto.imagen) : producto.imagen;
  if (!url) throw new Error("El producto no tiene una imagen descargada disponible");
  const original = await descargarImagen(url);
  const calidad = await analizarCalidadImagen(original);
  if (!calidad.acepta) throw new Error(`La imagen guardada fue rechazada: ${calidad.motivo}`);
  const normalizada = await normalizarImagenCatalogo(original);
  if (esCandidato) {
    await guardarResultadoImagenCatalogoDb(codigo, { candidatoData: normalizada, candidatoMime: "image/jpeg", error: "" });
  } else {
    await guardarResultadoImagenCatalogoDb(codigo, { imagenData: normalizada, imagenMime: "image/jpeg", error: "" }, { forzarConfirmada: true });
  }
  return { buffer: normalizada, mime: "image/jpeg" };
}

async function importarImagenManual(codigo, url) {
  const producto = await obtenerProductoCatalogoAdminDb(codigo);
  if (!producto) throw new Error("Producto no encontrado");
  const buffer = await descargarImagen(url);
  const calidad = await analizarCalidadImagen(buffer);
  if (!calidad.acepta) {
    const error = new Error(`La imagen fue rechazada: ${calidad.motivo}`);
    error.status = 422;
    throw error;
  }
  const normalizada = await normalizarImagenCatalogo(buffer);
  await guardarResultadoImagenCatalogoDb(producto.codigo, {
    imagen: String(url || "").trim(),
    fuente: "Manual · descargada y normalizada",
    estado: ESTADOS_IMAGEN.CONFIRMADA,
    imagenData: normalizada,
    imagenMime: "image/jpeg",
    candidatoUrl: "",
    candidatoFuente: "",
    candidatoTitulo: "",
    candidatoPuntaje: 0,
    candidatoData: null,
    candidatoMime: "",
    candidatos: [],
    error: "",
  }, { forzarConfirmada: true });
  return obtenerProductoCatalogoAdminDb(producto.codigo);
}

async function mapConcurrencia(items, concurrencia, fn) {
  const salida = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      try { salida[i] = await fn(items[i], i); }
      catch (error) { salida[i] = { error: error?.message || String(error) }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrencia, items.length) }, worker));
  return salida;
}

async function buscarImagenesLote({ limite = 20 } = {}) {
  const cantidad = Math.max(1, Math.min(MAX_LOTE, Number(limite) || 20));
  const pendientes = await listarPendientesImagenCatalogoDb(cantidad);
  const resultados = await mapConcurrencia(pendientes, CONCURRENCIA, (p) => buscarImagenProducto(p.codigo));
  const resumen = { procesados: pendientes.length, confirmadas: 0, candidatas: 0, sinResultado: 0, errores: 0, omitidas: 0 };
  for (const r of resultados) {
    if (r?.error) resumen.errores += 1;
    else if (r?.omitido) resumen.omitidas += 1;
    else if (r?.confirmado) resumen.confirmadas += 1;
    else if (r?.encontrado) resumen.candidatas += 1;
    else resumen.sinResultado += 1;
  }
  return resumen;
}

module.exports = {
  buscarImagenProducto,
  buscarImagenesLote,
  obtenerImagenNormalizadaProducto,
  importarImagenManual,
  analizarCalidadImagen,
};
