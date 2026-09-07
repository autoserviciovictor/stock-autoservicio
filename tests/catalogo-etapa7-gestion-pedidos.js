const fs=require("fs");const assert=require("assert");
const db=fs.readFileSync("db-catalogo-pedidos.js","utf8");
const server=fs.readFileSync("server.js","utf8");
const html=fs.readFileSync("index.html","utf8");
const js=fs.readFileSync("catalogo-admin.js","utf8");
const css=fs.readFileSync("catalogo-etapa7.css","utf8");

assert(db.includes("obtenerPedidoCatalogoAdminDb"),"Debe leer detalle del pedido");
assert(db.includes("actualizarEstadoPedidoCatalogoDb"),"Debe actualizar estado");
assert(db.includes("obtenerResumenPedidosCatalogoDb"),"Debe calcular resumen");
assert(db.includes("OFFSET"),"Debe paginar pedidos");
assert(db.includes("LOWER(o.order_number)"),"Debe buscar pedidos");

assert(server.includes('/admin/catalogo/pedidos/resumen'),"Debe exponer resumen admin");
assert(server.includes('app.get("/admin/catalogo/pedidos"'),"Debe listar pedidos");
assert(server.includes('/admin/catalogo/pedidos/:numero/estado'),"Debe cambiar estado");
assert(server.includes("requerirAdministrador"),"Rutas deben ser administrativas");

assert(html.includes('data-catalog-tab="pedidos"'),"Debe tener pestaña Pedidos");
assert(html.includes("catalogPedidosBody"),"Debe tener tabla de pedidos");
assert(html.includes("catalogPedidoModal"),"Debe tener detalle modal");

assert(js.includes("cargarPedidos"),"Debe cargar pedidos");
assert(js.includes("abrirPedido"),"Debe abrir pedido");
assert(js.includes("guardarEstadoPedido"),"Debe guardar estado");
assert(js.includes("catalogPedidosBadge"),"Debe mostrar pedidos recibidos");
assert(css.includes(".catalog-order-status"),"Debe estilizar estados");
assert(css.includes(".catalog-order-modal"),"Debe estilizar detalle");

console.log("Catálogo Etapa 7 gestión de pedidos: OK");
