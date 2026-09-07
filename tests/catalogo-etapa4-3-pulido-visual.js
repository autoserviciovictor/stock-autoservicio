const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('catalogo/index.html', 'utf8');
const css = fs.readFileSync('catalogo/catalogo-etapa4-3.css', 'utf8');
const adminCss = fs.readFileSync('catalogo-admin.css', 'utf8');

assert(html.includes('catalogo-etapa4-3.css'), 'El catálogo debe cargar los ajustes visuales de Etapa 4.3');
assert(css.includes('--catalog-font'), 'Debe existir una tipografía unificada');
assert(css.includes('grid-template-rows: auto 42px auto auto'), 'Las tarjetas de escritorio deben alinear nombres, precios y acciones');
assert(css.includes('font-variant-numeric: tabular-nums'), 'Los precios y contadores deben alinearse numéricamente');
assert(css.includes('grid-template-columns: 42px 1fr 42px'), 'La cabecera móvil debe centrar el logo entre controles simétricos');
assert(css.includes('width: min(328px, 82vw)'), 'El drawer móvil de categorías debe ser menos invasivo');
assert(css.includes('width: min(400px, 100%)'), 'El carrito de escritorio debe ser más compacto');
assert(adminCss.includes('Etapa 4.3 — pulido de barra administrativa'), 'Debe existir el pulido administrativo');
assert(adminCss.includes('grid-row: 2'), 'Las acciones masivas deben pasar a una segunda fila estable');
assert(adminCss.includes('#catalogBtnRecargar'), 'La recarga debe tener posición explícita en la grilla');

console.log('Catálogo Etapa 4.3 pulido visual: OK');
