const fs = require("fs");
const assert = require("assert");

const html = fs.readFileSync("catalogo/index.html", "utf8");
const css = fs.readFileSync("catalogo/catalogo-etapa4-2-1.css", "utf8");

assert(html.includes("catalogo-etapa4-2.css"), "Debe conservar los ajustes de Etapa 4.2");
assert(html.includes("catalogo-etapa4-2-1.css"), "Debe cargar la corrección 4.2.1 después de 4.2");
assert(css.includes("scroll-padding-bottom"), "Debe evitar que controles desplazados queden detrás de la barra");
assert(css.includes("padding-bottom: calc(142px + env(safe-area-inset-bottom))"), "Debe reservar espacio adicional al final del catálogo");
assert(css.includes("min-height: 54px"), "La barra móvil debe ser más compacta");
assert(css.includes(".cart-item__image .product-card__placeholder small"), "Debe tratar específicamente el placeholder del carrito");
assert(css.includes("display: none"), "El texto Sin imagen no debe quedar cortado dentro de la miniatura");
assert(css.includes("width: 40px") && css.includes("height: 40px"), "El icono del placeholder del carrito debe entrar completo");

console.log("Catálogo Etapa 4.2.1 correcciones carrito móvil: OK");
