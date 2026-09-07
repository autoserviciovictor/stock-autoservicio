const fs = require("fs");
const assert = require("assert");

const busqueda = fs.readFileSync("catalogo-imagenes-busqueda.js", "utf8");
const imagenes = fs.readFileSync("catalogo-imagenes.js", "utf8");
const db = fs.readFileSync("db-catalogo-publico.js", "utf8");
const server = fs.readFileSync("server.js", "utf8");

assert(busqueda.includes("buscarCandidatosMultiples"), "P1B debe centralizar la búsqueda múltiple");
assert(busqueda.includes("Open Food Facts") && busqueda.includes("Open Products Facts"), "Debe conservar búsqueda exacta por EAN");
assert(busqueda.includes("Brave Search") && busqueda.includes("consultasBrave"), "Debe ampliar por Brave con consultas controladas");
assert(busqueda.includes("deduplicarYOrdenar"), "Debe deduplicar candidatos antes de persistirlos");
assert(busqueda.includes("MAX_CANDIDATOS = 24"), "Debe limitar el conjunto persistido de candidatos");
assert(db.includes("image_candidates JSONB"), "La base debe guardar varios candidatos en JSONB");
assert(db.includes("image_candidates=EXCLUDED.image_candidates"), "La lista de candidatos debe actualizarse de forma explícita");
assert(imagenes.includes("candidatos: busqueda.candidatos"), "La búsqueda debe persistir la lista de candidatos");
assert(imagenes.includes("imagen_confirmada") && imagenes.includes("omitido: true"), "La búsqueda no debe sobrescribir una imagen confirmada");
assert(!busqueda.includes("image_data") && !busqueda.includes("guardarResultadoImagenCatalogoDb"), "Las fuentes de búsqueda no deben escribir imágenes finales");
assert(server.includes('/imagen/candidatos'), "Debe existir un endpoint administrativo para inspeccionar candidatos");
console.log("Catálogo Etapa 3B P1B búsqueda múltiple: OK");
