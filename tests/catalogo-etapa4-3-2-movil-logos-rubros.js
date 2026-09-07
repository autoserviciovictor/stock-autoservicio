const fs = require("fs");
const assert = require("assert");

const html = fs.readFileSync("catalogo/index.html", "utf8");
const js = fs.readFileSync("catalogo/catalogo-base.js", "utf8");
const css = fs.readFileSync("catalogo/catalogo-etapa4-3-2.css", "utf8");

assert(html.includes("catalogo-etapa4-3-1.css"), "Debe conservar 4.3.1");
assert(html.includes("catalogo-etapa4-3-2.css"), "Debe cargar 4.3.2 después de 4.3.1");

assert(js.includes("function categoryTone"), "Debe existir color por rubro");
assert(js.includes("category-logo__svg"), "Los rubros deben usar logos SVG");
assert(js.includes("tone-amber") && js.includes("tone-blue"), "Debe haber tonos diferenciados por rubro");
assert(js.includes('categoryIcon("todos")'), "Todos debe tener su propio logo");

assert(css.includes(".category-logo__svg"), "Debe estilizar los logos de rubro");
assert(css.includes(".catalogo-mobile-categories .category-button__count"), "Debe alinear la cantidad de productos");
assert(css.includes("grid-template-columns: 76px minmax(0, 1fr)"), "Debe reducir la columna de imagen móvil");
assert(css.includes("min-height: 116px"), "Debe dar más aire vertical a la tarjeta móvil");
assert(css.includes("padding-bottom: calc(166px + env(safe-area-inset-bottom))"), "Debe reservar espacio inferior extra");
assert(css.includes("margin-top: auto"), "Los controles deben quedar alineados al fondo de cada tarjeta");

console.log("Catálogo Etapa 4.3.2 móvil + logos rubros: OK");
