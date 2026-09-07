const fs = require("fs");
const assert = require("assert");

const html = fs.readFileSync("catalogo/index.html", "utf8");
const css = fs.readFileSync("catalogo/catalogo-etapa4-2.css", "utf8");
const js = fs.readFileSync("catalogo/catalogo-base.js", "utf8");

assert(html.includes("catalogo-etapa4-2.css"), "El catálogo debe cargar la hoja responsive de Etapa 4.2");
assert(css.includes("@media (max-width: 768px)"), "Debe existir optimización para móvil");
assert(css.includes(".catalogo-benefits") && css.includes("display: none"), "Las tarjetas informativas deben ocultarse en móvil");
assert(css.includes("grid-template-columns: 1fr"), "Los productos deben conservar una sola columna en móvil");
assert(css.includes("padding-bottom: calc(112px + env(safe-area-inset-bottom))"), "Debe reservar espacio para la barra flotante");
assert(css.includes("height: 100dvh"), "El carrito móvil debe usar la altura útil completa");
assert(css.includes(".catalogo-mobile-cartbar"), "Debe conservarse la barra flotante del carrito");

assert(js.includes("localStorage.getItem(CART_STORAGE_KEY)"), "El carrito debe recuperarse de localStorage");
assert(js.includes("localStorage.setItem(CART_STORAGE_KEY"), "El carrito debe persistirse en localStorage");
assert(js.includes("catalogoMobileCartbar"), "Debe conservarse la barra inferior del carrito");
assert(js.includes("quitarDelCarrito"), "Debe poder eliminar productos del carrito");
assert(js.includes("actualizarCantidadCarrito"), "Debe poder cambiar cantidades en el carrito");

console.log("Catálogo Etapa 4.2 móvil + carrito: OK");
