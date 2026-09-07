const fs = require("fs");
const assert = require("assert");

const version = JSON.parse(fs.readFileSync("version.json", "utf8"));
const index = fs.readFileSync("index.html", "utf8");
const sw = fs.readFileSync("service-worker.js", "utf8");
const server = fs.readFileSync("server.js", "utf8");
const dbCatalogo = fs.readFileSync("db-catalogo-publico.js", "utf8");

const buildsIndex = [...index.matchAll(/[?&]v=([^"'\s>]+)/g)].map((m) => m[1]);
assert(buildsIndex.length > 0, "index no tiene versiones de assets");
assert(new Set(buildsIndex).size === 1, "index mezcla versiones de assets");
assert(buildsIndex[0] === version.assetBuild, "index y version.json usan builds distintos");
assert(sw.includes(`autoservicio-v${version.assetBuild}`), "service worker y version.json usan builds distintos");
assert(sw.includes(`./etiquetas.js?v=${version.assetBuild}`), "etiquetas no usa el build canónico en service worker");
assert(server.includes("conTransaccionInventarioProductos(async (cliente)"), "la importación de productos/rubros no es atómica");
assert(dbCatalogo.includes("SET category_id=NULL"), "falta limpiar rubro anterior si el Excel no trae rubro");
assert(dbCatalogo.includes("NOT EXISTS (SELECT 1 FROM product_catalog"), "faltan limpiar configuraciones huérfanas");

console.log("OK auditoria-catalogo-070926: cache, transacción y limpieza de catálogo verificados");
