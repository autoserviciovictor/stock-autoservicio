const fs = require('fs');
const assert = require('assert');

const busqueda = fs.readFileSync('catalogo-imagenes-busqueda.js', 'utf8');
const imagenes = fs.readFileSync('catalogo-imagenes.js', 'utf8');
const seleccion = fs.readFileSync('catalogo-imagenes-seleccion.js', 'utf8');
const admin = fs.readFileSync('catalogo-admin.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert(busqueda.includes('world.openfoodfacts.org'), 'Debe conservar Open Food Facts');
assert(busqueda.includes('world.openbeautyfacts.org'), 'Debe agregar Open Beauty Facts');
assert(busqueda.includes('world.openpetfoodfacts.org'), 'Debe agregar Open Pet Food Facts');
assert(busqueda.includes('world.openproductsfacts.org'), 'Debe conservar Open Products Facts');
assert(busqueda.includes('search.openfoodfacts.org/search'), 'Debe agregar búsqueda gratuita por texto con Search-a-licious');
assert(busqueda.includes('/cgi/search.pl?'), 'Debe mantener fallback gratuito de texto si Search-a-licious no responde');
assert(busqueda.includes('Estrategia gratuita primero'), 'La orquestación debe priorizar fuentes gratuitas');
assert(busqueda.includes('if (!gratis.candidatos.length && process.env.BRAVE_SEARCH_API_KEY)'), 'Brave solo puede ser respaldo opcional');
assert(busqueda.includes('requiereConfiguracion: false'), 'La ausencia de Brave no debe bloquear la búsqueda');
assert(imagenes.includes('fuentes gratuitas disponibles'), 'El mensaje sin resultados no debe exigir Brave');
assert(seleccion.includes("'open_beauty_facts'"), 'La selección debe confiar en EAN exactos de Open Beauty Facts');
assert(seleccion.includes("'open_pet_food_facts'"), 'La selección debe confiar en EAN exactos de Open Pet Food Facts');
assert(html.includes('catalogBtnReiniciarImagenes'), 'Debe existir un control para reiniciar el lote pausado');
assert(admin.includes('reiniciarImagenesGratis'), 'Debe poder reiniciar la búsqueda gratuita desde cero');
assert(admin.includes('JSON.stringify({ reanudar: false })'), 'Reiniciar debe crear un lote nuevo para reintentar los ya procesados');

console.log('Catálogo Etapa 3B gratis sin Brave: OK');
