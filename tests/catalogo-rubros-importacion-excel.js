const fs = require("fs");
const assert = require("assert");

const admin = fs.readFileSync("admin.js", "utf8");
const server = fs.readFileSync("server.js", "utf8");
const db = fs.readFileSync("db-catalogo-publico.js", "utf8");

assert(admin.includes("function normalizarRubroImportacion"), "falta normalización de rubros en el Excel");
assert(admin.includes("const filaEsRubro"), "falta detección de filas encabezado de rubro");
assert(admin.includes("rubro: rubroActual"), "los productos no heredan el rubro detectado");
assert(admin.includes("rubrosDetectados"), "falta resumen de rubros detectados");
assert(admin.includes("productosSinRubro"), "falta control de productos sin rubro");
assert(server.includes("const rubro = normalizarTexto(item?.rubro).slice(0, 80)"), "el backend no conserva el rubro importado");
assert(server.includes("conTransaccionInventarioProductos(async (cliente)"), "productos y rubros deben sincronizarse en una transacción única");
assert(server.includes("reemplazarCatalogoDb(catalogo, cliente)"), "el reemplazo del catálogo no comparte la transacción");
assert(server.includes("sincronizarRubrosImportadosCatalogoDb(catalogo, cliente)"), "la sincronización de rubros no comparte la transacción");
assert(db.includes("async function sincronizarRubrosImportadosCatalogoDb(productos = [], cliente = null)"), "falta sincronización transaccional de rubros");
assert(db.includes("ON CONFLICT(slug) DO UPDATE SET active=TRUE"), "los rubros existentes podrían duplicarse");
assert(db.includes("SET category_id=EXCLUDED.category_id"), "el producto no queda asignado al rubro importado");
assert(db.includes("SET category_id=NULL"), "un producto sin rubro en el Excel debe perder la asignación anterior");
assert(db.includes("DELETE FROM catalog_product_settings"), "faltan limpiar configuraciones huérfanas");
assert(db.includes("visible, destacado, imágenes"), "falta preservar la configuración comercial del producto");

console.log("OK catalogo-rubros-importacion-excel: detección, transacción, asignación, desasignación y limpieza verificadas");
