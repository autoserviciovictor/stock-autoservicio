const { codigoEAN } = require('./catalogo-imagenes-busqueda');

function limpio(valor = '') {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(valor = '') {
  const stop = new Set(['de','del','la','las','el','los','con','sin','para','por','un','una','gr','g','kg','ml','lt','l','cc','x']);
  return limpio(valor).split(/\s+/).filter((p) => p.length >= 2 && !stop.has(p));
}

function coincidenciaTexto(producto = {}, candidato = {}) {
  const objetivo = [...new Set(tokens([producto.marca, producto.nombre, producto.presentacion].filter(Boolean).join(' ')))];
  if (!objetivo.length) return 0;
  const corpus = new Set(tokens([candidato.titulo, candidato.marca, candidato.presentacion, candidato.fuente, candidato.dominio].filter(Boolean).join(' ')));
  const aciertos = objetivo.filter((t) => corpus.has(t)).length;
  return Math.round((aciertos / objetivo.length) * 100);
}

function medidas(valor = '') {
  const salida = [];
  const re = /(\d+(?:[.,]\d+)?)\s*(kg|g|gr|ml|cc|l|lt|lts|un|u)\b/gi;
  const unidades = { gr: 'g', lt: 'l', lts: 'l', u: 'un' };
  let m;
  while ((m = re.exec(String(valor || '')))) {
    const numero = String(m[1]).replace(',', '.').replace(/\.0+$/, '');
    const unidad = unidades[String(m[2]).toLowerCase()] || String(m[2]).toLowerCase();
    salida.push(`${numero}${unidad}`);
  }
  return [...new Set(salida)];
}

function coincidenciaPresentacion(producto = {}, candidato = {}) {
  const objetivo = medidas([producto.presentacion, producto.nombre].filter(Boolean).join(' '));
  if (!objetivo.length) return 50;
  const halladas = new Set(medidas([candidato.presentacion, candidato.titulo].filter(Boolean).join(' ')));
  const hits = objetivo.filter((v) => halladas.has(v)).length;
  return Math.round((hits / objetivo.length) * 100);
}

function puntuarCandidato(producto, candidato, calidad = {}) {
  const preliminar = Math.max(0, Math.min(100, Number(candidato?.puntajePreliminar) || 0));
  const texto = coincidenciaTexto(producto, candidato);
  const presentacion = coincidenciaPresentacion(producto, candidato);
  const calidadScore = Math.max(0, Math.min(100, Number(calidad?.score) || 0));
  const ean = codigoEAN(producto?.codigo);
  const exacto = Boolean(candidato?.exactaEAN || (ean && `${candidato?.titulo || ''} ${candidato?.url || ''}`.includes(ean)));

  let total = preliminar * 0.34 + texto * 0.26 + presentacion * 0.12 + calidadScore * 0.28;
  if (exacto) total += 18;
  if (candidato?.proveedor === 'open_food_facts' || candidato?.proveedor === 'open_products_facts') total += exacto ? 7 : 2;
  if (calidad?.fondoBlanco) total += 4;
  total = Math.max(0, Math.min(100, Math.round(total)));

  const confianza = total >= 84 ? 'alta' : total >= 68 ? 'media' : 'baja';
  return { total, confianza, exactoEAN: exacto, texto, presentacion, calidad: calidadScore };
}

function ordenarEvaluados(evaluados = []) {
  return [...evaluados].sort((a, b) =>
    Number(b?.evaluacion?.exactoEAN) - Number(a?.evaluacion?.exactoEAN)
    || (Number(b?.evaluacion?.total) || 0) - (Number(a?.evaluacion?.total) || 0)
    || String(a?.candidato?.id || '').localeCompare(String(b?.candidato?.id || ''))
  );
}

function decidirSeleccion(evaluados = []) {
  const ordenados = ordenarEvaluados(evaluados);
  const mejor = ordenados[0] || null;
  if (!mejor) return { accion: 'sin_resultado', mejor: null, evaluados: ordenados };
  const score = Number(mejor.evaluacion?.total) || 0;
  const exacto = Boolean(mejor.evaluacion?.exactoEAN);
  const calidad = Number(mejor.evaluacion?.calidad) || 0;

  // Priorizamos automatización: coincidencias EAN con imagen utilizable o
  // candidatos de confianza media/alta se confirman sin intervención humana.
  if ((exacto && calidad >= 56 && score >= 62) || score >= 68) {
    return { accion: 'confirmar', mejor, evaluados: ordenados };
  }
  return { accion: 'revisar', mejor, evaluados: ordenados };
}

module.exports = {
  coincidenciaTexto,
  coincidenciaPresentacion,
  medidas,
  puntuarCandidato,
  ordenarEvaluados,
  decidirSeleccion,
};
