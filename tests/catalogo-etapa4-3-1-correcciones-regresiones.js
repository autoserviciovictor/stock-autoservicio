const fs = require("fs");
const assert = require("assert");

const html = fs.readFileSync("catalogo/index.html", "utf8");
const css = fs.readFileSync("catalogo/catalogo-etapa4-3-1.css", "utf8");

assert(html.includes("catalogo-etapa4-3.css"), "Debe conservar el pulido 4.3");
assert(html.includes("catalogo-etapa4-3-1.css"), "Debe cargar la corrección 4.3.1");

assert(css.includes(".catalogo-sidebar") && css.includes("overflow: hidden"), "El sidebar no debe invadir productos");
assert(css.includes("text-overflow: ellipsis"), "Los rubros largos deben truncarse");
assert(css.includes("@media (min-width: 769px)"), "Debe separar escritorio");
assert(css.includes("@media (max-width: 768px)"), "Debe separar móvil");

assert(css.includes("flex-direction: column"), "La tarjeta móvil debe ordenar contenido en columna");
assert(css.includes("grid-template-columns: 82px minmax(0, 1fr)"), "La tarjeta móvil debe mantener imagen + contenido");
assert(css.includes("-webkit-line-clamp: 2"), "Los nombres deben quedar controlados");
assert(css.includes("white-space: nowrap"), "Precio y unidad no deben montarse");

assert(css.includes(".cart-item__image .product-card__placeholder small"), "Debe corregir placeholder del carrito");
assert(css.includes("display: none"), "No debe mostrarse texto cortado en miniatura");

console.log("Catálogo Etapa 4.3.1 correcciones regresiones: OK");
