const fs=require("fs");const assert=require("assert");
const db=fs.readFileSync("db-catalogo-pedidos.js","utf8");
const server=fs.readFileSync("server.js","utf8");
const html=fs.readFileSync("index.html","utf8");
const js=fs.readFileSync("catalogo-admin.js","utf8");
const css=fs.readFileSync("catalogo-etapa8c.css","utf8");

assert(db.includes("ADD COLUMN IF NOT EXISTS internal_notes"),"Debe guardar observaciones internas");
assert(db.includes("actualizarObservacionesPedidoCatalogoDb"),"Debe actualizar observaciones");
assert(!db.includes("prepared_by_name"),"No debe mantener control digital de preparación");

assert(server.includes('/admin/catalogo/pedidos/:numero/observaciones'),"Debe exponer endpoint de observaciones");
assert(!server.includes('/admin/catalogo/pedidos/:numero/control'),"No debe exponer endpoint de control de preparación");

assert(html.includes("catalogPedidoObservaciones"),"Debe mostrar observaciones internas");
assert(html.includes("catalogPedidoGuardarObservaciones"),"Debe tener botón guardar observaciones");
assert(!html.includes("catalogPedidoPreparacionItems"),"No debe mostrar checks de preparación");
assert(!html.includes("catalogPedidoPreparacionBarra"),"No debe mostrar barra de preparación");

assert(js.includes("renderObservacionesPedido"),"Debe renderizar observaciones");
assert(js.includes("guardarObservacionesPedido"),"Debe guardar observaciones");
assert(!js.includes("renderControlPreparacionPedido"),"No debe renderizar control digital");
assert(js.includes("p.observacionesInternas"),"La impresión debe incluir observaciones guardadas");

assert(css.includes(".catalog-order-notes-card"),"Debe estilizar observaciones");
assert(!css.includes(".catalog-order-prep-item"),"No debe estilizar controles de preparación");

console.log("Catálogo Etapa 8C simplificada: OK");
