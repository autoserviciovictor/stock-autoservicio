const crypto = require("crypto");

const OFF_TIMEOUT_MS = 6500;
const BRAVE_TIMEOUT_MS = 7000;
const MAX_CANDIDATOS = 24;
const MAX_RESULTADOS_BRAVE = 30;

function codigoEAN(valor = "") {
  const limpio = String(valor || "").replace(/\D/g, "");
  return limpio.length >= 8 && limpio.length <= 14 ? limpio : "";
}

function urlHttps(valor = "") {
  try {
    const u = new URL(String(valor || "").trim());
    if (u.protocol !== "https:") return "";
    return u.href.slice(0, 1200);
  } catch {
    return "";
  }
}

function texto(valor = "", maximo = 220) {
  return String(valor || "").trim().replace(/\s+/g, " ").slice(0, maximo);
}

function dominioDeUrl(url = "") {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); }
  catch { return ""; }
}

function idCandidato(candidato = {}) {
  const base = [candidato.proveedor, candidato.url, candidato.fallbackUrl].filter(Boolean).join("|");
  return crypto.createHash("sha1").update(base).digest("hex").slice(0, 16);
}

async function fetchJson(url, timeoutMs, extraHeaders = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "AutoservicioVictorCatalogo/1.0 (product-image-discovery)",
        ...extraHeaders,
      },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function palabrasSignificativas(valor = "") {
  const stop = new Set(["de","del","la","las","el","los","con","sin","x","por","para","un","una","gr","g","kg","ml","lt","l","cc"]);
  return texto(valor, 300).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").split(" ").filter((p) => p.length >= 3 && !stop.has(p));
}

function puntajeTexto(producto, titulo = "") {
  const objetivo = new Set(palabrasSignificativas([producto.marca, producto.nombre, producto.presentacion].filter(Boolean).join(" ")));
  if (!objetivo.size) return 0;
  const halladas = new Set(palabrasSignificativas(titulo));
  let coincidencias = 0;
  for (const p of objetivo) if (halladas.has(p)) coincidencias += 1;
  return Math.round((coincidencias / objetivo.size) * 18);
}

function normalizarCandidato(candidato, producto) {
  const url = urlHttps(candidato.url);
  const fallbackUrl = urlHttps(candidato.fallbackUrl);
  if (!url && !fallbackUrl) return null;
  const ancho = Math.max(0, Number(candidato.ancho) || 0);
  const alto = Math.max(0, Number(candidato.alto) || 0);
  if (ancho && alto && (ancho < 220 || alto < 220)) return null;
  const ratio = ancho && alto ? ancho / alto : 1;
  if (ratio < 0.28 || ratio > 3.5) return null;

  const exactaEAN = Boolean(candidato.exactaEAN);
  const base = Math.max(0, Number(candidato.puntajePreliminar) || 0);
  const textoBonus = puntajeTexto(producto, candidato.titulo);
  const resolucionBonus = ancho >= 800 && alto >= 800 ? 5 : ancho >= 500 && alto >= 500 ? 3 : 0;
  const ratioBonus = Math.max(0, Math.round((1 - Math.min(1, Math.abs(1 - ratio))) * 4));
  const puntajePreliminar = Math.min(100, Math.round(base + textoBonus + resolucionBonus + ratioBonus));

  const limpio = {
    id: "",
    url: url || fallbackUrl,
    fallbackUrl: url && fallbackUrl && fallbackUrl !== url ? fallbackUrl : "",
    proveedor: texto(candidato.proveedor, 50),
    fuente: texto(candidato.fuente, 180),
    dominio: texto(candidato.dominio || dominioDeUrl(url || fallbackUrl), 120),
    titulo: texto(candidato.titulo, 220),
    marca: texto(candidato.marca || producto.marca, 120),
    presentacion: texto(candidato.presentacion || producto.presentacion, 120),
    consulta: texto(candidato.consulta, 380),
    ancho,
    alto,
    exactaEAN,
    tipoCoincidencia: texto(candidato.tipoCoincidencia || (exactaEAN ? "ean_exacto" : "texto"), 50),
    puntajePreliminar,
  };
  limpio.id = idCandidato(limpio);
  return limpio;
}

function deduplicarYOrdenar(candidatos, producto) {
  const porUrl = new Map();
  for (const bruto of candidatos) {
    const c = normalizarCandidato(bruto, producto);
    if (!c) continue;
    const clave = c.url.toLowerCase();
    const previo = porUrl.get(clave);
    if (!previo || c.puntajePreliminar > previo.puntajePreliminar) porUrl.set(clave, c);
  }
  return [...porUrl.values()]
    .sort((a, b) => (Number(b.exactaEAN) - Number(a.exactaEAN)) || (b.puntajePreliminar - a.puntajePreliminar) || a.id.localeCompare(b.id))
    .slice(0, MAX_CANDIDATOS);
}

function candidatosOpenFacts(data, proveedor, fuente, consulta, producto) {
  if (!data || Number(data.status) !== 1 || !data.product) return [];
  const p = data.product || {};
  const urls = [p.image_front_url, p.image_url, p.image_front_small_url].map(urlHttps).filter(Boolean);
  return [...new Set(urls)].map((url, indice) => ({
    url,
    proveedor,
    fuente,
    titulo: texto(p.product_name || producto.nombre),
    marca: texto(p.brands || producto.marca, 120),
    presentacion: texto(p.quantity || producto.presentacion, 120),
    consulta,
    exactaEAN: true,
    tipoCoincidencia: "ean_exacto",
    puntajePreliminar: 78 - indice * 2,
  }));
}

async function buscarEnOpenFacts(producto) {
  const ean = codigoEAN(producto.codigo);
  if (!ean) return { candidatos: [], fuentes: [], consultas: [] };
  const fields = "code,product_name,brands,quantity,image_front_url,image_url,image_front_small_url";
  const fuentes = [
    { proveedor: "open_food_facts", fuente: "Open Food Facts", url: `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(ean)}.json?fields=${fields}` },
    { proveedor: "open_products_facts", fuente: "Open Products Facts", url: `https://world.openproductsfacts.org/api/v2/product/${encodeURIComponent(ean)}.json?fields=${fields}` },
  ];
  const candidatos = [];
  for (const f of fuentes) {
    const data = await fetchJson(f.url, OFF_TIMEOUT_MS);
    candidatos.push(...candidatosOpenFacts(data, f.proveedor, f.fuente, ean, producto));
  }
  return { candidatos, fuentes: fuentes.map((f) => f.fuente), consultas: [ean] };
}

function consultasBrave(producto) {
  const ean = codigoEAN(producto.codigo);
  const descripcion = texto([producto.marca, producto.nombre, producto.presentacion].filter(Boolean).join(" "), 280);
  const base = texto([descripcion, "producto packshot fondo blanco envase"].filter(Boolean).join(" "), 360);
  const conEan = ean ? texto(`${ean} ${base}`, 380) : "";
  const consultas = [];
  if (conEan) consultas.push({ q: conEan, tipo: "ean_y_texto" });
  if (base && (!conEan || base !== conEan)) consultas.push({ q: base, tipo: "texto_ampliado" });
  return consultas.slice(0, 2);
}

async function ejecutarBrave(consulta, apiKey, producto) {
  const params = new URLSearchParams({
    q: consulta.q,
    country: "AR",
    search_lang: "es",
    safesearch: "strict",
    count: String(MAX_RESULTADOS_BRAVE),
    spellcheck: "true",
  });
  const data = await fetchJson(`https://api.search.brave.com/res/v1/images/search?${params}`, BRAVE_TIMEOUT_MS, {
    "X-Subscription-Token": apiKey,
  });
  const items = Array.isArray(data?.results) ? data.results : [];
  return items.map((item) => {
    const url = urlHttps(item?.properties?.url);
    const fallbackUrl = urlHttps(item?.thumbnail?.src);
    if (!url && !fallbackUrl) return null;
    const ancho = Number(item?.properties?.width) || Number(item?.thumbnail?.width) || 0;
    const alto = Number(item?.properties?.height) || Number(item?.thumbnail?.height) || 0;
    const confianza = String(item?.confidence || "").toLowerCase();
    const bonus = confianza === "high" ? 8 : confianza === "medium" ? 4 : 0;
    const dominio = texto(item?.source || item?.meta_url?.hostname || dominioDeUrl(url || fallbackUrl), 120);
    const titulo = texto(item?.title || producto.nombre);
    const ean = codigoEAN(producto.codigo);
    const exactaEAN = Boolean(ean && (`${titulo} ${url}`.includes(ean)));
    return {
      url: url || fallbackUrl,
      fallbackUrl: url && fallbackUrl && fallbackUrl !== url ? fallbackUrl : "",
      proveedor: "brave",
      fuente: `Brave Search · ${dominio}`,
      dominio,
      titulo,
      marca: producto.marca || "",
      presentacion: producto.presentacion || "",
      consulta: consulta.q,
      ancho,
      alto,
      exactaEAN,
      tipoCoincidencia: exactaEAN ? "ean_en_resultado" : consulta.tipo,
      puntajePreliminar: 50 + bonus + (exactaEAN ? 16 : 0),
    };
  }).filter(Boolean);
}

async function buscarEnBrave(producto) {
  const apiKey = texto(process.env.BRAVE_SEARCH_API_KEY || "", 400);
  if (!apiKey) return { candidatos: [], fuentes: [], consultas: [], configurado: false };
  const consultas = consultasBrave(producto);
  const candidatos = [];
  const consultasEjecutadas = [];
  for (let i = 0; i < consultas.length; i += 1) {
    const consulta = consultas[i];
    const encontrados = await ejecutarBrave(consulta, apiKey, producto);
    candidatos.push(...encontrados);
    consultasEjecutadas.push(consulta.q);
    // Evitamos gastar una segunda solicitud si la primera ya dio variedad suficiente.
    if (i === 0 && encontrados.length >= 10) break;
  }
  return { candidatos, fuentes: ["Brave Search"], consultas: consultasEjecutadas, configurado: true };
}

async function buscarCandidatosMultiples(producto) {
  const open = await buscarEnOpenFacts(producto);
  const brave = await buscarEnBrave(producto);
  const candidatos = deduplicarYOrdenar([...open.candidatos, ...brave.candidatos], producto);
  return {
    candidatos,
    cantidad: candidatos.length,
    fuentes: [...new Set([...open.fuentes, ...brave.fuentes])],
    consultas: [...new Set([...open.consultas, ...brave.consultas])],
    braveConfigurado: brave.configurado,
    requiereConfiguracion: !brave.configurado && candidatos.length === 0,
  };
}

module.exports = {
  buscarCandidatosMultiples,
  codigoEAN,
  urlHttps,
  deduplicarYOrdenar,
  consultasBrave,
};
