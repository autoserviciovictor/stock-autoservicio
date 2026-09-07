const fs = require("fs");
const assert = require("assert");

const db = fs.readFileSync("db-catalogo-publico.js", "utf8");
const server = fs.readFileSync("server.js", "utf8");
const imagenes = fs.readFileSync("catalogo-imagenes.js", "utf8");
const busqueda = fs.readFileSync("catalogo-imagenes-busqueda.js", "utf8");
const admin = fs.readFileSync("catalogo-admin.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

assert(db.includes("image_candidate_url"), "falta candidato de imagen");
assert(db.includes("image_checked_at"), "falta control de búsqueda");
assert(db.includes("guardarResultadoImagenCatalogoDb"), "falta persistencia de imagen");
assert(db.includes("confirmarCandidatoImagenCatalogoDb"), "falta confirmación de candidato");
assert(db.includes("listarPendientesProcesoImagenesDb"), "falta cola masiva reanudable");
assert(server.includes('/admin/catalogo/productos/:codigo/imagen/buscar'), "falta endpoint buscar imagen");
assert(server.includes('/admin/catalogo/imagenes/proceso/iniciar'), "falta endpoint de proceso masivo");
assert(server.includes('/admin/catalogo/productos/:codigo/imagen/confirmar'), "falta endpoint confirmar");
assert(busqueda.includes("openfoodfacts.org"), "falta búsqueda por EAN en Open Food Facts");
assert(busqueda.includes("openproductsfacts.org"), "falta fallback Open Products Facts");
assert(busqueda.includes("BRAVE_SEARCH_API_KEY"), "falta proveedor comercial Brave Search");
assert(fs.readFileSync("catalogo-imagenes-proceso.js","utf8").includes("CONCURRENCIA = 2"), "falta límite de concurrencia");
assert(admin.includes("catalogFiltroImagen"), "falta filtro de imágenes");
assert(admin.includes("iniciarProcesoImagenesMasivo"), "falta acción de proceso masivo");
assert(admin.includes("guardarImagenManualActual"), "falta carga manual por URL");
assert(html.includes('id="catalogProductoImagenPreview"'), "falta vista previa");
assert(html.includes('id="catalogProductoConfirmarImagen"'), "falta confirmación visual");
assert(html.includes('id="catalogBtnBuscarImagenes"'), "falta botón de lote");
console.log("OK catalogo-etapa3: EAN, candidatos, revisión, carga manual y lote verificados");
