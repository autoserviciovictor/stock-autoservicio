const fs = require("fs");
const assert = require("assert");

const estado = fs.readFileSync("catalogo-imagenes-estado.js", "utf8");
const imagenes = fs.readFileSync("catalogo-imagenes.js", "utf8");
const db = fs.readFileSync("db-catalogo-publico.js", "utf8");
const server = fs.readFileSync("server.js", "utf8");

assert(estado.includes('SIN_IMAGEN: "sin_imagen"'), "falta estado sin_imagen");
assert(estado.includes('BUSCANDO: "buscando"'), "falta estado buscando");
assert(estado.includes('CANDIDATO: "candidato"'), "falta estado candidato");
assert(estado.includes('CONFIRMADA: "confirmada"'), "falta estado confirmada");
assert(estado.includes('SIN_RESULTADO: "sin_resultado"'), "falta estado sin_resultado");
assert(estado.includes('ERROR: "error"'), "falta estado error");
assert(estado.includes("La imagen confirmada está protegida"), "falta protección central de imagen confirmada");
assert(db.includes("forzarConfirmada"), "la persistencia no distingue acciones explícitas de procesos automáticos");
assert(db.includes("tieneImagenConfirmada(s) && !forzarConfirmada"), "la BD no protege la imagen confirmada");
assert(db.includes("datos.candidatoData !== undefined"), "la protección no cubre candidatos sobre una confirmada");
assert(db.includes("normalizarEstadoImagen(f.image_status) !== ESTADOS_IMAGEN.CONFIRMADA"), "la lectura pública no exige estado confirmado");
assert(db.includes("normalizarEstadoImagen(f.image_status) !== ESTADOS_IMAGEN.CANDIDATO"), "la lectura de candidato no exige estado candidato");
assert(db.includes("SET image_status='buscando' WHERE image_status='pendiente'"), "falta migración del estado histórico pendiente");
assert(db.includes("SET image_status='candidato' WHERE image_status='revisar'"), "falta migración del estado histórico revisar");
assert(!db.includes("async function guardarImagenManualCatalogoDb"), "quedó el flujo viejo de URL manual directa en DB");
assert(!server.includes("guardarImagenManualCatalogoDb"), "server conserva import viejo de imagen manual");
assert(imagenes.includes('motivo: "imagen_confirmada"'), "la búsqueda automática no omite confirmadas");
assert(imagenes.includes("ESTADOS_IMAGEN.BUSCANDO"), "la búsqueda no registra estado buscando");
assert(imagenes.includes("ESTADOS_IMAGEN.CANDIDATO"), "la búsqueda no registra candidato");
assert(imagenes.includes("ESTADOS_IMAGEN.SIN_RESULTADO"), "la búsqueda no registra sin_resultado");
assert(imagenes.includes("ESTADOS_IMAGEN.ERROR"), "la búsqueda no registra error");
assert(imagenes.includes("{ forzarConfirmada: true }"), "las acciones explícitas no tienen vía controlada para reemplazar/quitar");
assert(!imagenes.includes('estado: "revisar"'), "quedó estado viejo revisar en lógica de imágenes");
assert(!imagenes.includes('estado: "pendiente"'), "quedó estado viejo pendiente en lógica de imágenes");

console.log("OK catalogo-etapa3b-p1a: ciclo de vida único y protección de imágenes confirmadas");
