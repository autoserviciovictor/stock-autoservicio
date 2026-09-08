const fs=require("fs");const assert=require("assert");
const js=fs.readFileSync("catalogo-admin.js","utf8");
const server=fs.readFileSync("server.js","utf8");
const html=fs.readFileSync("index.html","utf8");

assert(js.includes('document.createElement("iframe")'),"Debe imprimir con iframe invisible");
assert(js.includes("catalogPedidoPrintFrame"),"Debe usar iframe temporal de impresión");
assert(!js.includes('window.open("", "_blank", "width=900,height=760")'),"No debe abrir una ventana visible adicional");
assert(!server.includes("catalogo-pedidos-notificaciones"),"No debe incluir notificaciones automáticas por WhatsApp");
assert(!html.includes("catalogPedidoAvisoWhatsappEstado"),"No debe mostrar avisos de estado al cliente");

console.log("Corrección impresión sin ventana extra y sin notificaciones: OK");
