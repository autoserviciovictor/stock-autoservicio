const fs = require("fs");
const assert = require("assert");

const imagenes = fs.readFileSync("catalogo-imagenes.js", "utf8");
const busqueda = fs.readFileSync("catalogo-imagenes-busqueda.js", "utf8");
const admin = fs.readFileSync("catalogo-admin.js", "utf8");
const css = fs.readFileSync("catalogo-admin.css", "utf8");

assert(busqueda.includes("BRAVE_SEARCH_API_KEY"), "falta BRAVE_SEARCH_API_KEY");
assert(busqueda.includes("https://api.search.brave.com/res/v1/images/search"), "falta endpoint oficial de Brave Image Search");
assert(busqueda.includes('"X-Subscription-Token": apiKey'), "falta autenticación de Brave Search");
assert(busqueda.includes('country: "AR"'), "falta priorización de resultados de Argentina");
assert(busqueda.includes('search_lang: "es"'), "falta idioma español");
assert(busqueda.includes('safesearch: "strict"'), "falta SafeSearch estricto");
assert(busqueda.includes("MAX_RESULTADOS_BRAVE = 30"), "falta lote razonable de candidatos");
assert(busqueda.includes("buscarEnOpenFacts") && busqueda.includes("buscarEnBrave"), "falta orquestación de fuentes de búsqueda");
assert(busqueda.indexOf("await buscarEnOpenFacts(producto)") < busqueda.indexOf("await buscarEnBrave(producto)"), "el EAN debe consultarse antes que Brave");
assert(!busqueda.includes("GOOGLE_CSE_API_KEY") && !imagenes.includes("GOOGLE_CSE_API_KEY"), "quedó una dependencia vieja de Google CSE");
assert(!busqueda.includes("GOOGLE_CSE_CX") && !imagenes.includes("GOOGLE_CSE_CX"), "quedó una dependencia vieja de Google CSE");
assert(admin.includes('data.requiereConfiguracion ? "aviso" : "error"'), "falta estado informativo cuando Brave todavía no está configurado");
assert(css.includes(".catalog-image-search-status.aviso"), "falta estilo de aviso no destructivo");

console.log("OK catalogo-etapa3-brave-search: EAN primero, Brave Search y aviso de configuración verificados");
