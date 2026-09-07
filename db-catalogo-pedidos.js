const crypto = require("crypto");
const { obtenerPool, query } = require("./db");

let esquemaAsegurado = false;
let promesaEsquema = null;

const ESTADOS_PEDIDO = ["recibido", "preparando", "listo", "entregado", "cancelado"];
const FORMAS_PAGO = ["Efectivo", "Tarjeta", "Transferencia", "Mercado Pago"];
const TIPOS_ENTREGA = ["delivery", "retiro"];
const HORARIOS_DELIVERY = ["12:00", "17:00"];
const PEDIDO_MINIMO_DELIVERY = 50000;

function texto(valor, maximo = 160) {
  return String(valor == null ? "" : valor).trim().replace(/\s+/g, " ").slice(0, maximo);
}

function telefono(valor) {
  return texto(valor, 30).replace(/[^\d+ ()-]/g, "");
}

function cantidad(valor) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1 || n > 999) return 0;
  return n;
}

function tokenCliente(valor) {
  const token = texto(valor, 100);
  return /^[a-zA-Z0-9_-]{12,100}$/.test(token) ? token : "";
}

async function asegurarEsquemaCatalogoPedidos() {
  if (esquemaAsegurado) return;
  if (promesaEsquema) return promesaEsquema;

  promesaEsquema = (async () => {
    await query(`CREATE SEQUENCE IF NOT EXISTS catalog_order_number_seq START WITH 1`);

    await query(`CREATE TABLE IF NOT EXISTS catalog_orders (
      order_id BIGSERIAL PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      client_token TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      delivery_type TEXT NOT NULL,
      delivery_address TEXT NOT NULL DEFAULT '',
      delivery_reference TEXT NOT NULL DEFAULT '',
      delivery_time TEXT NOT NULL DEFAULT '',
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'recibido',
      total NUMERIC(14,2) NOT NULL DEFAULT 0,
      item_units INTEGER NOT NULL DEFAULT 0,
      item_lines INTEGER NOT NULL DEFAULT 0,
      whatsapp_opened BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT catalog_orders_delivery_type_valid CHECK (delivery_type IN ('delivery','retiro')),
      CONSTRAINT catalog_orders_payment_valid CHECK (payment_method IN ('Efectivo','Tarjeta','Transferencia','Mercado Pago')),
      CONSTRAINT catalog_orders_status_valid CHECK (status IN ('recibido','preparando','listo','entregado','cancelado')),
      CONSTRAINT catalog_orders_total_nonnegative CHECK (total >= 0),
      CONSTRAINT catalog_orders_customer_name_nonempty CHECK (length(btrim(customer_name)) >= 3),
      CONSTRAINT catalog_orders_customer_phone_nonempty CHECK (length(btrim(customer_phone)) >= 8)
    )`);

    await query(`CREATE INDEX IF NOT EXISTS catalog_orders_created_idx ON catalog_orders(created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS catalog_orders_status_idx ON catalog_orders(status, created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS catalog_orders_phone_idx ON catalog_orders(customer_phone, created_at DESC)`);

    await query(`CREATE TABLE IF NOT EXISTS catalog_order_items (
      order_item_id BIGSERIAL PRIMARY KEY,
      order_id BIGINT NOT NULL REFERENCES catalog_orders(order_id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      article TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price NUMERIC(14,2) NOT NULL,
      line_total NUMERIC(14,2) NOT NULL,
      sale_unit TEXT NOT NULL DEFAULT 'unidad',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT catalog_order_items_quantity_valid CHECK (quantity BETWEEN 1 AND 999),
      CONSTRAINT catalog_order_items_price_nonnegative CHECK (unit_price >= 0 AND line_total >= 0)
    )`);
    await query(`CREATE INDEX IF NOT EXISTS catalog_order_items_order_idx ON catalog_order_items(order_id, order_item_id)`);

    esquemaAsegurado = true;
  })();

  try {
    await promesaEsquema;
  } finally {
    promesaEsquema = null;
  }
}

function validarCabeceraPedido(pedido = {}) {
  const nombre = texto(pedido.nombre, 80);
  const tel = telefono(pedido.telefono);
  const entrega = texto(pedido.entrega, 20).toLowerCase();
  const direccion = texto(pedido.direccion, 160);
  const referencia = texto(pedido.referencia, 160);
  const horario = texto(pedido.horario, 10);
  const pago = texto(pedido.pago, 40);
  const clientToken = tokenCliente(pedido.clientToken);

  if (nombre.length < 3) throw Object.assign(new Error("Ingresá nombre y apellido"), { status: 400 });
  if (tel.replace(/\D/g, "").length < 8) throw Object.assign(new Error("Ingresá un teléfono válido"), { status: 400 });
  if (!TIPOS_ENTREGA.includes(entrega)) throw Object.assign(new Error("Tipo de entrega inválido"), { status: 400 });
  if (!FORMAS_PAGO.includes(pago)) throw Object.assign(new Error("Forma de pago inválida"), { status: 400 });
  if (!clientToken) throw Object.assign(new Error("Identificador de pedido inválido"), { status: 400 });

  if (entrega === "delivery") {
    if (direccion.length < 5) throw Object.assign(new Error("Ingresá la dirección de entrega"), { status: 400 });
    if (!HORARIOS_DELIVERY.includes(horario)) throw Object.assign(new Error("Horario de delivery inválido"), { status: 400 });
  }

  return {
    nombre, telefono: tel, entrega,
    direccion: entrega === "delivery" ? direccion : "",
    referencia: entrega === "delivery" ? referencia : "",
    horario: entrega === "delivery" ? horario : "",
    pago, clientToken,
  };
}

async function cargarProductosAutoritativos(cliente, items = []) {
  if (!Array.isArray(items) || !items.length || items.length > 150) {
    throw Object.assign(new Error("El pedido debe tener entre 1 y 150 productos"), { status: 400 });
  }

  const consolidados = new Map();
  for (const item of items) {
    const code = texto(item?.codigo, 160);
    const qty = cantidad(item?.cantidad);
    if (!code || !qty) throw Object.assign(new Error("Hay un producto o cantidad inválida"), { status: 400 });
    consolidados.set(code, Math.min(999, (consolidados.get(code) || 0) + qty));
  }

  const codigos = [...consolidados.keys()];
  const r = await cliente.query(
    `SELECT p.code, p.article, p.price, COALESCE(s.sale_unit,'unidad') AS sale_unit
       FROM product_catalog p
       JOIN catalog_product_settings s ON s.code=p.code
       JOIN catalog_categories c ON c.category_id=s.category_id
      WHERE p.code = ANY($1::text[]) AND s.visible=TRUE AND c.active=TRUE`,
    [codigos],
  );

  if (r.rows.length !== codigos.length) {
    throw Object.assign(new Error("Uno o más productos ya no están disponibles en el catálogo"), { status: 409 });
  }

  const porCodigo = new Map(r.rows.map((x) => [String(x.code), x]));
  return codigos.map((code) => {
    const p = porCodigo.get(code);
    const qty = consolidados.get(code);
    const precio = Number(p.price) || 0;
    return {
      codigo: code,
      nombre: String(p.article || ""),
      cantidad: qty,
      precio,
      total: Math.round(precio * qty * 100) / 100,
      unidadVenta: String(p.sale_unit || "unidad"),
    };
  });
}

async function numeroPedidoSiguiente(cliente) {
  const r = await cliente.query(`SELECT nextval('catalog_order_number_seq')::bigint AS n`);
  const n = Number(r.rows[0]?.n) || 1;
  const fecha = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date()).replaceAll("-", "");
  return `CAT-${fecha}-${String(n).padStart(6, "0")}`;
}

async function obtenerPedidoPorTokenDb(clientToken) {
  await asegurarEsquemaCatalogoPedidos();
  const r = await query(
    `SELECT order_id, order_number, total, status, created_at
       FROM catalog_orders WHERE client_token=$1 LIMIT 1`,
    [tokenCliente(clientToken)],
  );
  if (!r.rowCount) return null;
  const f = r.rows[0];
  return {
    id: Number(f.order_id),
    numero: String(f.order_number),
    total: Number(f.total) || 0,
    estado: String(f.status),
    creadoEn: f.created_at,
    existente: true,
  };
}

async function crearPedidoCatalogoDb(pedido = {}) {
  await asegurarEsquemaCatalogoPedidos();
  const cabecera = validarCabeceraPedido(pedido);

  const yaExiste = await obtenerPedidoPorTokenDb(cabecera.clientToken);
  if (yaExiste) return yaExiste;

  const pool = obtenerPool();
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");

    const productos = await cargarProductosAutoritativos(cliente, pedido.items);
    const total = Math.round(productos.reduce((acc, x) => acc + x.total, 0) * 100) / 100;
    const unidades = productos.reduce((acc, x) => acc + x.cantidad, 0);

    if (cabecera.entrega === "delivery" && total < PEDIDO_MINIMO_DELIVERY) {
      throw Object.assign(
        new Error(`El pedido mínimo para delivery es $ ${PEDIDO_MINIMO_DELIVERY.toLocaleString("es-AR")}`),
        { status: 400 },
      );
    }

    const numero = await numeroPedidoSiguiente(cliente);
    const ins = await cliente.query(
      `INSERT INTO catalog_orders(
        order_number, client_token, customer_name, customer_phone,
        delivery_type, delivery_address, delivery_reference, delivery_time,
        payment_method, status, total, item_units, item_lines
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'recibido',$10,$11,$12)
      RETURNING order_id, created_at`,
      [
        numero, cabecera.clientToken, cabecera.nombre, cabecera.telefono,
        cabecera.entrega, cabecera.direccion, cabecera.referencia, cabecera.horario,
        cabecera.pago, total, unidades, productos.length,
      ],
    );
    const orderId = Number(ins.rows[0].order_id);

    for (const p of productos) {
      await cliente.query(
        `INSERT INTO catalog_order_items(order_id, code, article, quantity, unit_price, line_total, sale_unit)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [orderId, p.codigo, p.nombre, p.cantidad, p.precio, p.total, p.unidadVenta],
      );
    }

    await cliente.query("COMMIT");
    return {
      id: orderId,
      numero,
      total,
      estado: "recibido",
      creadoEn: ins.rows[0].created_at,
      existente: false,
    };
  } catch (error) {
    await cliente.query("ROLLBACK");
    if (error?.code === "23505" && cabecera.clientToken) {
      const existente = await obtenerPedidoPorTokenDb(cabecera.clientToken);
      if (existente) return existente;
    }
    throw error;
  } finally {
    cliente.release();
  }
}

async function marcarWhatsappAbiertoPedidoDb(numero) {
  await asegurarEsquemaCatalogoPedidos();
  const n = texto(numero, 40);
  if (!n) return false;
  const r = await query(
    `UPDATE catalog_orders SET whatsapp_opened=TRUE, updated_at=NOW()
      WHERE order_number=$1 RETURNING order_id`,
    [n],
  );
  return r.rowCount > 0;
}

async function listarPedidosCatalogoDb({ limite = 100, estado = "" } = {}) {
  await asegurarEsquemaCatalogoPedidos();
  const max = Math.max(1, Math.min(500, Number(limite) || 100));
  const e = texto(estado, 30);
  const params = [];
  let where = "";
  if (e && ESTADOS_PEDIDO.includes(e)) {
    params.push(e);
    where = "WHERE o.status=$1";
  }
  params.push(max);
  const limParam = params.length;
  const r = await query(
    `SELECT o.order_id,o.order_number,o.customer_name,o.customer_phone,o.delivery_type,
            o.delivery_address,o.delivery_reference,o.delivery_time,o.payment_method,o.status,
            o.total,o.item_units,o.item_lines,o.whatsapp_opened,o.created_at,o.updated_at
       FROM catalog_orders o
       ${where}
      ORDER BY o.created_at DESC
      LIMIT $${limParam}`,
    params,
  );
  return r.rows.map((f) => ({
    id: Number(f.order_id),
    numero: String(f.order_number),
    cliente: String(f.customer_name),
    telefono: String(f.customer_phone),
    entrega: String(f.delivery_type),
    direccion: String(f.delivery_address),
    referencia: String(f.delivery_reference),
    horario: String(f.delivery_time),
    pago: String(f.payment_method),
    estado: String(f.status),
    total: Number(f.total) || 0,
    unidades: Number(f.item_units) || 0,
    productos: Number(f.item_lines) || 0,
    whatsappAbierto: Boolean(f.whatsapp_opened),
    creadoEn: f.created_at,
    actualizadoEn: f.updated_at,
  }));
}

module.exports = {
  ESTADOS_PEDIDO,
  FORMAS_PAGO,
  TIPOS_ENTREGA,
  HORARIOS_DELIVERY,
  PEDIDO_MINIMO_DELIVERY,
  asegurarEsquemaCatalogoPedidos,
  crearPedidoCatalogoDb,
  obtenerPedidoPorTokenDb,
  marcarWhatsappAbiertoPedidoDb,
  listarPedidosCatalogoDb,
};
