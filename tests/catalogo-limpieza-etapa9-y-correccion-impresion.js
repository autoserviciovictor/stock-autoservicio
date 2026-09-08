const fs=require("fs");const assert=require("assert");
const server=fs.readFileSync("server.js","utf8");
const html=fs.readFileSync("index.html","utf8");
const js=fs.readFileSync("catalogo-admin.js","utf8");

assert(!server.includes("catalogo-pedidos-notificaciones"),"Servidor no debe incluir módulo de notificaciones");
assert(!server.includes("/admin/catalogo/pedidos-notificaciones/estado"),"No debe quedar endpoint de notificaciones");
assert(!server.includes("/admin/catalogo/pedidos/:numero/notificar"),"No debe quedar reenvío de avisos");
assert(!html.includes("catalogo-etapa9.css"),"No debe cargar CSS de etapa 9");
assert(!html.includes("catalogPedidoAvisoWhatsappEstado"),"No debe mostrar tarjeta de avisos");
assert(!js.includes("renderAvisosWhatsappPedido"),"No debe quedar lógica de avisos");
assert(js.includes('document.createElement("iframe")'),"Impresión debe usar iframe invisible");
assert(!js.includes('window.open("", "_blank", "width=900,height=760")'),"No debe abrir ventana visible adicional");
console.log("Limpieza Etapa 9 + corrección impresión: OK");
