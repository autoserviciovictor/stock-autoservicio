const assert = require("assert");
const {
  parsearResultadosDuckDuckGo,
  extraerImagenesPagina,
  extraerTituloPagina,
} = require("../catalogo-imagenes-busqueda");

const htmlBusqueda = `
<div class="result">
  <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fagustotuyo.com.ar%2Fproducto%2Fjamon-ahumado">
    A Gusto Tuyo - Jamón Ahumado 250gr
  </a>
</div>`;

const resultados = parsearResultadosDuckDuckGo(htmlBusqueda);
assert.strictEqual(resultados.length, 1, "Debe detectar un resultado web gratuito");
assert.strictEqual(resultados[0].dominio, "agustotuyo.com.ar");
assert(resultados[0].titulo.includes("Jamón Ahumado"), "Debe conservar el título del producto");

const htmlProducto = `
<html>
<head>
  <meta property="og:title" content="A Gusto Tuyo Aderezo Jamón Ahumado 250gr">
  <meta property="og:image" content="/imagenes/jamon-ahumado-250gr.jpg">
  <script type="application/ld+json">
    {"@type":"Product","name":"Jamón Ahumado","image":["https://agustotuyo.com.ar/img/jamon-ahumado.jpg"]}
  </script>
</head>
</html>`;

assert.strictEqual(
  extraerTituloPagina(htmlProducto),
  "A Gusto Tuyo Aderezo Jamón Ahumado 250gr",
  "Debe leer og:title de la página del producto"
);

const imagenes = extraerImagenesPagina(htmlProducto, "https://agustotuyo.com.ar/producto/jamon-ahumado");
assert(imagenes.includes("https://agustotuyo.com.ar/imagenes/jamon-ahumado-250gr.jpg"), "Debe resolver og:image relativo");
assert(imagenes.includes("https://agustotuyo.com.ar/img/jamon-ahumado.jpg"), "Debe extraer imagen de Product JSON-LD");

const codigo = require("fs").readFileSync("catalogo-imagenes-busqueda.js", "utf8");
assert(codigo.includes("https://html.duckduckgo.com/html/?"), "Debe usar búsqueda web gratuita por nombre");
assert(codigo.includes('modo: "web_por_nombre"'), "Debe identificar el nuevo modo web por nombre");
assert(codigo.includes("og:image"), "Debe obtener imagen original desde metadatos de la página");
assert(codigo.includes("application/ld+json") || codigo.includes("application\\/ld\\+json"), "Debe soportar Product JSON-LD");
assert(!codigo.includes("google.com/search?tbm=isch"), "No debe raspar Google Images");

console.log("Catálogo Etapa 3B web gratuita por nombre: OK");
