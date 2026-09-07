const {
  obtenerEstadoProcesoImagenesDb,
  iniciarProcesoImagenesDb,
  pausarProcesoImagenesDb,
  finalizarProcesoImagenesDb,
  sumarResultadoProcesoImagenesDb,
  listarPendientesProcesoImagenesDb,
} = require('./db-catalogo-publico');
const { buscarImagenProducto } = require('./catalogo-imagenes');

const TAMANO_TANDA = 8;
const CONCURRENCIA = 2;
const ESPERA_ENTRE_TANDAS_MS = 900;
let bucleActivo = false;
let temporizador = null;

function dormir(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapConcurrencia(items, concurrencia, fn) {
  const salida = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      try { salida[i] = await fn(items[i]); }
      catch (error) { salida[i] = { error: error?.message || String(error) }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrencia, items.length || 1) }, worker));
  return salida;
}

function tipoResultado(r = {}) {
  if (r.error) return 'error';
  if (r.omitido) return 'omitida';
  if (r.confirmado) return 'confirmada';
  if (r.encontrado) return 'revisar';
  return 'sin_resultado';
}

async function procesarUnaTanda() {
  const estado = await obtenerEstadoProcesoImagenesDb();
  if (estado.estado !== 'running') return { continuar: false, estado };
  const pendientes = await listarPendientesProcesoImagenesDb(TAMANO_TANDA);
  if (!pendientes.length) {
    const final = await finalizarProcesoImagenesDb('Proceso completado');
    return { continuar: false, estado: final };
  }

  const resultados = await mapConcurrencia(pendientes, CONCURRENCIA, async (p) => {
    const resultado = await buscarImagenProducto(p.codigo, { guardar: true, confirmarAutomaticamente: true });
    return { ...resultado, codigo: p.codigo };
  });

  for (let i = 0; i < resultados.length; i += 1) {
    const r = resultados[i] || {};
    await sumarResultadoProcesoImagenesDb(tipoResultado(r), r.codigo || pendientes[i]?.codigo || '');
  }
  return { continuar: true, estado: await obtenerEstadoProcesoImagenesDb() };
}

async function ejecutarBucle() {
  if (bucleActivo) return;
  bucleActivo = true;
  try {
    while (true) {
      const { continuar } = await procesarUnaTanda();
      if (!continuar) break;
      await dormir(ESPERA_ENTRE_TANDAS_MS);
    }
  } catch (error) {
    console.error('Error en proceso masivo de imágenes:', error);
    await pausarProcesoImagenesDb().catch(() => {});
  } finally {
    bucleActivo = false;
  }
}

function lanzarBucle() {
  if (bucleActivo) return;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => ejecutarBucle().catch((e) => console.error(e)), 0);
}

async function iniciarProcesoImagenes({ reanudar = false } = {}) {
  const estado = await iniciarProcesoImagenesDb({ reanudar });
  lanzarBucle();
  return estado;
}

async function pausarProcesoImagenes() {
  return pausarProcesoImagenesDb();
}

async function obtenerEstadoProcesoImagenes() {
  return obtenerEstadoProcesoImagenesDb();
}

async function reanudarProcesoPendienteAlIniciar() {
  const estado = await obtenerEstadoProcesoImagenesDb();
  if (estado.estado === 'running') lanzarBucle();
}

module.exports = {
  iniciarProcesoImagenes,
  pausarProcesoImagenes,
  obtenerEstadoProcesoImagenes,
  reanudarProcesoPendienteAlIniciar,
  procesarUnaTanda,
};
