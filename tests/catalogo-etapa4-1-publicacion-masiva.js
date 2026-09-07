const fs = require("fs");
const assert = require("assert");

const publicoJs = fs.readFileSync("catalogo/catalogo-base.js", "utf8");
const publicoCss = fs.readFileSync("catalogo/catalogo-base.css", "utf8");
const adminJs = fs.readFileSync("catalogo-admin.js", "utf8");
const adminCss = fs.readFileSync("catalogo-admin.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const db = fs.readFileSync("db-catalogo-publico.js", "utf8");
const server = fs.readFileSync("server.js", "utf8");

assert(publicoJs.includes('product-card__placeholder-box'), "Debe mostrar placeholder estable cuando no hay imagen");
assert(publicoJs.includes('onerror="this.remove()"'), "Una imagen rota no debe mostrar texto alt en la tarjeta");
assert(publicoCss.includes("repeat(auto-fit, minmax(190px, 1fr))"), "PC debe aprovechar mejor el ancho disponible");
assert(html.includes('id="catalogBtnPublicarMasivo"'), "Debe existir publicar masivo");
assert(html.includes('id="catalogBtnOcultarMasivo"'), "Debe existir ocultar masivo");
assert(adminJs.includes("cambiarVisibilidadMasiva(true)"), "Administración debe poder publicar masivamente");
assert(adminJs.includes("cambiarVisibilidadMasiva(false)"), "Administración debe poder ocultar masivamente");
assert(adminJs.includes("Esta acción afecta a todos los productos de ese alcance"), "La acción masiva debe pedir confirmación explícita");
assert(db.includes("actualizarVisibilidadMasivaCatalogoAdminDb"), "DB debe implementar visibilidad masiva");
assert(db.includes("s.category_id IS NOT NULL"), "Publicación masiva no debe publicar productos sin rubro");
assert(server.includes('/admin/catalogo/productos/visibilidad-masiva'), "Servidor debe exponer endpoint administrativo masivo");
assert(adminCss.includes(".catalog-bulk-actions"), "Debe existir estilo de acciones masivas");

console.log("Catálogo Etapa 4.1 publicación masiva y ajustes: OK");
