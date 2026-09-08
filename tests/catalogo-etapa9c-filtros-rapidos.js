const fs=require("fs");const assert=require("assert");
const db=fs.readFileSync("db-catalogo-pedidos.js","utf8");
const server=fs.readFileSync("server.js","utf8");
const html=fs.readFileSync("index.html","utf8");
const js=fs.readFileSync("catalogo-admin.js","utf8");

for (const filtro of ["todos","recibido","preparando","listo","entregado","cancelado","hoy"]) {
  assert(html.includes(`data-pedido-filtro="${filtro}"`), `Falta filtro rápido ${filtro}`);
}

assert(html.includes("catalogo-etapa9c.css?v=1960-d21-cierre-etapa6-010926"),"CSS 9C debe usar el mismo build");
assert(js.includes("pedidosFiltroRapido"),"Debe mantener estado del filtro rápido");
assert(js.includes("aplicarFiltroRapidoPedidos"),"Debe implementar aplicación del filtro rápido");
assert(js.includes('p.set("fecha", "hoy")'),"El filtro Hoy debe enviarse al backend");
assert(server.includes("fecha: req.query.fecha"),"El servidor debe recibir filtro de fecha");
assert(db.includes('fecha = ""'),"La consulta debe aceptar filtro de fecha");
assert(db.includes("America/Argentina/Buenos_Aires"),"Hoy debe calcularse con zona horaria argentina");
assert(!server.includes("catalogo-pedidos-notificaciones"),"No debe reintroducir notificaciones WhatsApp");
assert(!html.includes("catalogPedidoAvisoWhatsappEstado"),"No debe reintroducir UI de notificaciones");

console.log("Catálogo Etapa 9C filtros rápidos de pedidos: OK");
