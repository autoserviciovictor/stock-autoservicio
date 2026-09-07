const fs = require("fs");
const assert = require("assert");

const html = fs.readFileSync("index.html", "utf8");
const admin = fs.readFileSync("catalogo-admin.js", "utf8");
const db = fs.readFileSync("db-catalogo-publico.js", "utf8");
const imagenes = fs.readFileSync("catalogo-imagenes.js", "utf8");

assert(!html.includes('id="catalogProductoOrden"'), "el orden manual de productos sigue visible");
assert(!html.includes('id="catalogRubroOrden"'), "el orden manual de rubros sigue visible");
assert(!html.includes('<th class="catalog-col-order">Orden</th>'), "la columna Orden sigue visible");
assert(!admin.includes('$("catalogProductoOrden")'), "catalogo-admin todavía depende del orden manual de productos");
assert(!admin.includes('$("catalogRubroOrden")'), "catalogo-admin todavía depende del orden manual de rubros");
assert(db.includes("ORDER BY c.name, c.category_id"), "los rubros no usan orden automático alfabético");
assert(db.includes("ORDER BY s.featured DESC, c.name, p.article, p.code"), "el catálogo público no usa orden automático por rubro/producto");
assert(db.includes("ORDER BY COALESCE(s.visible,FALSE) DESC, COALESCE(c.name,'zzzzzzzz'), p.article, p.code"), "el listado admin no usa orden automático");
assert(!html.includes('id="catalogFiltroImagen" class="oculto"'), "el filtro de imágenes no debe quedar oculto");
assert(!html.includes('id="catalogBtnBuscarImagenes" class="catalog-btn catalog-btn-secondary catalog-image-batch-btn oculto"'), "el proceso automático no debe quedar oculto");
assert(html.includes("Completar imágenes automáticamente"), "falta acción de imágenes automáticas");
assert(!imagenes.includes("GOOGLE_CSE_API_KEY") && !imagenes.includes("GOOGLE_CSE_CX"), "quedaron dependencias antiguas de Google CSE");
const activar = admin.slice(admin.indexOf("async function activar()"));
const cargasIniciales = (activar.match(/await cargarProductos\(\{ conservarPagina: false \}\);/g) || []).length;
assert.strictEqual(cargasIniciales, 1, "activar() carga productos más de una vez");

console.log("OK catalogo-etapa3-cierre: orden automático e imágenes automáticas activas");
