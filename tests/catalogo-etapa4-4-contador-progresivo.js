const fs = require("fs");
const assert = require("assert");

const html = fs.readFileSync("catalogo/index.html", "utf8");
const js = fs.readFileSync("catalogo/catalogo-base.js", "utf8");
const css = fs.readFileSync("catalogo/catalogo-etapa4-4.css", "utf8");

assert(html.includes("catalogo-etapa4-4.css"), "Debe cargar la Etapa 4.4");

assert(js.includes('data-action="add-first"'), "Sin cantidad debe mostrarse únicamente Agregar");
assert(js.includes('data-action="open-qty"'), "La cantidad acumulada debe poder reabrir el editor");
assert(js.includes('data-action="cart-minus"') && js.includes('data-action="cart-plus"'), "El editor debe mostrar - y +");
assert(js.includes("programarCierreCantidad"), "El editor debe cerrarse automáticamente por inactividad");
assert(js.includes("1600"), "Debe existir un período breve de inactividad");
assert(js.includes("nueva <= 0"), "Restar hasta cero debe quitar el producto");
assert(js.includes("renderControlCompra"), "La tarjeta debe actualizar solo su control de compra");
assert(js.includes("state.editoresCantidad"), "Debe controlar qué contador está abierto");

assert(css.includes(".purchase-count-button"), "Debe existir el botón de cantidad resumida");
assert(css.includes(".purchase-qty-editor"), "Debe existir el editor temporal de cantidad");
assert(css.includes("width: 100%"), "Los estados del control deben conservar el mismo ancho");

console.log("Catálogo Etapa 4.4 contador progresivo: OK");
