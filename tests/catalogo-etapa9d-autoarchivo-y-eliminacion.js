const fs=require("fs");const assert=require("assert");
const db=fs.readFileSync("db-catalogo-pedidos.js","utf8");
const server=fs.readFileSync("server.js","utf8");
const html=fs.readFileSync("index.html","utf8");
const js=fs.readFileSync("catalogo-admin.js","utf8");
const css=fs.readFileSync("catalogo-etapa9d.css","utf8");

assert(db.includes("archivarPedidosDiasAnterioresDb"),"Debe existir autoarchivo");
assert(db.includes("created_at AT TIME ZONE 'America/Argentina/Buenos_Aires'"),"Autoarchivo debe usar fecha argentina");
assert(db.includes("eliminarPedidoArchivadoCatalogoDb"),"Debe existir eliminación de archivados");
assert(db.includes("DELETE FROM catalog_orders"),"Debe eliminar realmente");
assert(db.includes("AND archived_at IS NOT NULL"),"Solo archivados se eliminan");
assert(db.includes("await archivarPedidosDiasAnterioresDb();"),"Listado/resumen deben asegurar autoarchivo");

assert(server.includes("iniciarProgramadorAutoarchivoPedidos"),"Debe iniciar autoarchivo automático");
assert(server.includes("15 * 60 * 1000"),"Debe revisar periódicamente");
assert(server.includes('app.delete("/admin/catalogo/pedidos/:numero"'),"Debe existir DELETE");
assert(!server.includes('/admin/catalogo/pedidos/:numero/archivado'),"No debe quedar archivado manual");

assert(html.includes('data-pedido-filtro="archivados"'),"Debe existir filtro Archivados");
assert(!html.includes('id="catalogPedidoArchivar"'),"No debe existir botón Archivar");

assert(js.includes("eliminarPedidoArchivado"),"Debe poder eliminar archivados");
assert(js.includes('data-pedido-delete='),"Eliminar debe aparecer en la fila");
assert(js.includes('estado.pedidosFiltroRapido === "archivados"'),"Eliminar solo en Archivados");
assert(js.includes('method: "DELETE"'),"Debe usar DELETE");
assert(js.includes("window.confirm"),"Debe pedir confirmación");
assert(!js.includes("alternarArchivadoPedido"),"No debe quedar archivado manual");

assert(css.includes(".catalog-delete-btn"),"Debe estilizar Eliminar");
assert(!server.includes("catalogo-pedidos-notificaciones"),"No debe reintroducir WhatsApp");
assert(!html.includes("catalogPedidoAvisoWhatsappEstado"),"No debe reintroducir UI WhatsApp");

console.log("Catálogo Etapa 9D autoarchivo diario + eliminación de archivados: OK");
