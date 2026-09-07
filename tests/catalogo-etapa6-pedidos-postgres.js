const fs = require("fs");
const assert = require("assert");

const server = fs.readFileSync("server.js", "utf8");
const db = fs.readFileSync("db-catalogo-pedidos.js", "utf8");
const js = fs.readFileSync("catalogo/catalogo-base.js", "utf8");
const html = fs.readFileSync("catalogo/index.html", "utf8");
const css = fs.readFileSync("catalogo/catalogo-etapa6.css", "utf8");

assert(db.includes("CREATE TABLE IF NOT EXISTS catalog_orders"), "Debe crear tabla de pedidos");
assert(db.includes("CREATE TABLE IF NOT EXISTS catalog_order_items"), "Debe crear detalle de productos");
assert(db.includes("client_token TEXT NOT NULL UNIQUE"), "Debe ser idempotente");
assert(db.includes("product_catalog") && db.includes("s.visible=TRUE"), "El servidor debe recalcular con catálogo visible");
assert(db.includes("PEDIDO_MINIMO_DELIVERY = 50000"), "Debe validar mínimo en backend");
assert(db.includes("catalog_order_number_seq"), "Debe generar número único");
assert(db.includes("BEGIN") && db.includes("COMMIT") && db.includes("ROLLBACK"), "Debe guardar transaccionalmente");

assert(server.includes('app.post("/catalogo/api/pedidos"'), "Debe exponer POST público de pedidos");
assert(server.includes("limitarPedidosCatalogo"), "Debe limitar abuso del endpoint");
assert(server.includes("crearPedidoCatalogoDb"), "Debe persistir por DB");

assert(js.includes("registrarPedidoCatalogo"), "Frontend debe registrar antes de WhatsApp");
assert(js.includes("payloadPedidoCatalogo"), "Frontend debe enviar productos por código/cantidad");
assert(js.includes("state.pedidoRegistrado?.numero"), "WhatsApp debe incluir número de pedido");
assert(js.includes("No se pudo registrar el pedido. No se abrió WhatsApp."), "No debe abrir WhatsApp si falla el guardado");
assert(js.indexOf("await registrarPedidoCatalogo()") < js.indexOf("window.open(url"), "Debe registrar antes de abrir WhatsApp");

assert(html.includes("checkoutOrderNumber"), "Debe mostrar número de pedido");
assert(css.includes(".checkout-order-confirmation"), "Debe estilizar confirmación");

console.log("Catálogo Etapa 6 pedidos PostgreSQL: OK");
