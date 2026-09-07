const ESTADOS_IMAGEN = Object.freeze({
  SIN_IMAGEN: "sin_imagen",
  BUSCANDO: "buscando",
  CANDIDATO: "candidato",
  CONFIRMADA: "confirmada",
  SIN_RESULTADO: "sin_resultado",
  ERROR: "error",
});

const ESTADOS_IMAGEN_VALIDOS = Object.freeze(Object.values(ESTADOS_IMAGEN));

const ESTADOS_LEGACY = Object.freeze({
  pendiente: ESTADOS_IMAGEN.BUSCANDO,
  revisar: ESTADOS_IMAGEN.CANDIDATO,
});

function normalizarEstadoImagen(valor) {
  const estado = String(valor || "").trim().toLowerCase();
  if (ESTADOS_LEGACY[estado]) return ESTADOS_LEGACY[estado];
  return ESTADOS_IMAGEN_VALIDOS.includes(estado) ? estado : ESTADOS_IMAGEN.SIN_IMAGEN;
}

function tieneImagenConfirmada(fila = {}) {
  return normalizarEstadoImagen(fila.image_status) === ESTADOS_IMAGEN.CONFIRMADA
    && Boolean(fila.image_data);
}

function puedeBuscarAutomaticamente(fila = {}) {
  return !tieneImagenConfirmada(fila);
}

function validarTransicionImagen(desde, hacia, { forzar = false } = {}) {
  const origen = normalizarEstadoImagen(desde);
  const destino = normalizarEstadoImagen(hacia);
  if (forzar || origen === destino) return destino;

  if (origen === ESTADOS_IMAGEN.CONFIRMADA) {
    throw new Error("La imagen confirmada está protegida y no puede ser sobrescrita automáticamente");
  }

  const permitidas = {
    [ESTADOS_IMAGEN.SIN_IMAGEN]: [ESTADOS_IMAGEN.BUSCANDO, ESTADOS_IMAGEN.CANDIDATO, ESTADOS_IMAGEN.SIN_RESULTADO, ESTADOS_IMAGEN.ERROR],
    [ESTADOS_IMAGEN.BUSCANDO]: [ESTADOS_IMAGEN.CANDIDATO, ESTADOS_IMAGEN.CONFIRMADA, ESTADOS_IMAGEN.SIN_RESULTADO, ESTADOS_IMAGEN.ERROR, ESTADOS_IMAGEN.SIN_IMAGEN],
    [ESTADOS_IMAGEN.CANDIDATO]: [ESTADOS_IMAGEN.BUSCANDO, ESTADOS_IMAGEN.CONFIRMADA, ESTADOS_IMAGEN.SIN_IMAGEN, ESTADOS_IMAGEN.ERROR],
    [ESTADOS_IMAGEN.SIN_RESULTADO]: [ESTADOS_IMAGEN.BUSCANDO, ESTADOS_IMAGEN.CANDIDATO, ESTADOS_IMAGEN.SIN_IMAGEN, ESTADOS_IMAGEN.ERROR],
    [ESTADOS_IMAGEN.ERROR]: [ESTADOS_IMAGEN.BUSCANDO, ESTADOS_IMAGEN.CANDIDATO, ESTADOS_IMAGEN.SIN_RESULTADO, ESTADOS_IMAGEN.SIN_IMAGEN],
  };

  if (!(permitidas[origen] || []).includes(destino)) {
    throw new Error(`Transición de imagen inválida: ${origen} → ${destino}`);
  }
  return destino;
}

module.exports = {
  ESTADOS_IMAGEN,
  ESTADOS_IMAGEN_VALIDOS,
  normalizarEstadoImagen,
  tieneImagenConfirmada,
  puedeBuscarAutomaticamente,
  validarTransicionImagen,
};
