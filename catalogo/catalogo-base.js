import { API_BASE_URL } from "../config.js?v=1960-d21-cierre-etapa6-010926";

const CART_STORAGE_KEY = "autoservicio-victor-catalogo-carrito-v1";
const PAGE_SIZE = 32;
const state = {
  rubros: [],
  productos: [],
  rubro: "",
  busqueda: "",
  pagina: 1,
  paginas: 0,
  total: 0,
  loading: false,
  estadoCatalogo: null,
  carrito: cargarCarrito(),
  cantidades: new Map(),
};

const $ = (id) => document.getElementById(id);
const els = {
  quick: $("catalogoQuickCategories"),
  nav: $("catalogoCategoryNav"),
  mobileNav: $("catalogoMobileCategoryNav"),
  grid: $("catalogoProductsGrid"),
  count: $("catalogoProductsCount"),
  title: $("catalogoProductsTitle"),
  eyebrow: $("catalogoContextEyebrow"),
  feedback: $("catalogoFeedback"),
  loadMoreWrap: $("catalogoLoadMoreWrap"),
  loadMore: $("catalogoLoadMore"),
  search: $("catalogoSearch"),
  searchCompact: $("catalogoSearchCompact"),
  searchForm: $("catalogoSearchForm"),
  searchFormCompact: $("catalogoSearchFormCompact"),
  cartButton: $("catalogoCartButton"),
  cartBadge: $("catalogoCartBadge"),
  cart: $("catalogoCart"),
  cartClose: $("catalogoCartClose"),
  cartItems: $("catalogoCartItems"),
  cartTotal: $("catalogoCartTotal"),
  cartProductsLabel: $("catalogoCartProductsLabel"),
  cartContinue: $("catalogoCartContinue"),
  overlay: $("catalogoOverlay"),
  menuBtn: $("catalogoMenuBtn"),
  mobileCategories: $("catalogoMobileCategories"),
  categoriesClose: $("catalogoCategoriesClose"),
  searchFocusBtn: $("catalogoSearchFocusBtn"),
  mobileCartbar: $("catalogoMobileCartbar"),
  mobileCartCount: $("catalogoMobileCartCount"),
  mobileCartTotal: $("catalogoMobileCartTotal"),
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
}

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "Consultar";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(number);
}

function pluralProductos(n) { return `${n} ${n === 1 ? "producto" : "productos"}`; }

function categoryIcon(name = "") {
  const n = String(name).toLowerCase();
  if (/beb|agua|jugo|cerve|vino|gase/.test(n)) return "◉";
  if (/carne|carnic/.test(n)) return "◇";
  if (/lact|ques|fiambre/.test(n)) return "▱";
  if (/limp|higiene|perf/.test(n)) return "✦";
  if (/verd|fruta/.test(n)) return "●";
  if (/congel/.test(n)) return "❄";
  if (/pan|gallet|harina/.test(n)) return "▰";
  if (/almacen|aderezo/.test(n)) return "▣";
  return "□";
}

function cargarCarrito() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x && x.codigo && Number(x.cantidad) > 0).map((x) => ({ ...x, cantidad: Math.min(999, Math.max(1, Number(x.cantidad) || 1)) }));
  } catch { return []; }
}

function guardarCarrito() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.carrito));
}

function cantidadTemporal(codigo) { return state.cantidades.get(codigo) || 1; }
function setCantidadTemporal(codigo, cantidad) { state.cantidades.set(codigo, Math.min(999, Math.max(1, Number(cantidad) || 1))); }

function imagenProducto(producto, clase = "") {
  const codigo = encodeURIComponent(producto.codigo);
  const src = `${API_BASE_URL}/catalogo/api/productos/${codigo}/imagen`;
  return `<span class="product-card__placeholder" aria-hidden="true"><span class="product-card__placeholder-box">▣</span><small>Sin imagen</small></span><img class="${clase}" src="${src}" alt="" loading="lazy" decoding="async" onload="this.previousElementSibling.hidden=true" onerror="this.remove()">`;
}

function renderSkeletons() {
  els.grid.innerHTML = Array.from({ length: 8 }, () => '<div class="skeleton-card" aria-hidden="true"></div>').join("");
}

function categoryButton(rubro, mobile = false) {
  const slug = rubro?.slug || "";
  const active = state.rubro === slug;
  const name = rubro?.nombre || "Todos";
  const count = rubro?.productos ?? state.total;
  return `<button class="category-button${active ? " is-active" : ""}" type="button" data-rubro="${escapeHtml(slug)}"${active ? ' aria-current="true"' : ""}>
    <span class="category-button__icon" aria-hidden="true">${slug ? categoryIcon(name) : "⌂"}</span>
    <span>${escapeHtml(name)}</span>
    ${mobile || Number.isFinite(Number(count)) ? `<span class="category-button__count">${Number(count).toLocaleString("es-AR")}</span>` : ""}
  </button>`;
}

function renderCategories() {
  const todos = { nombre: "Todos", slug: "", productos: state.rubros.reduce((a, r) => a + (Number(r.productos) || 0), 0) };
  const list = [todos, ...state.rubros];
  els.nav.innerHTML = list.map((r) => categoryButton(r)).join("");
  els.mobileNav.innerHTML = list.map((r) => categoryButton(r, true)).join("");
  els.quick.innerHTML = list.slice(0, 9).map((r) => {
    const active = state.rubro === r.slug;
    return `<button class="quick-category${active ? " is-active" : ""}" type="button" data-rubro="${escapeHtml(r.slug)}">
      <span class="quick-category__icon" aria-hidden="true">${r.slug ? categoryIcon(r.nombre) : "▦"}</span>
      <span>${escapeHtml(r.nombre)}</span>
    </button>`;
  }).join("");
}

function renderProductCard(producto) {
  const qty = cantidadTemporal(producto.codigo);
  const inCart = state.carrito.some((x) => x.codigo === producto.codigo);
  return `<article class="product-card" data-product="${escapeHtml(producto.codigo)}">
    <div class="product-card__image">
      ${producto.destacado ? '<span class="product-card__featured">DESTACADO</span>' : ""}
      ${imagenProducto(producto)}
    </div>
    <div class="product-card__body">
      <div class="product-card__rubric">${escapeHtml(producto.rubro?.nombre || "Producto")}</div>
      <h3 title="${escapeHtml(producto.nombre)}">${escapeHtml(producto.nombre)}</h3>
      <div class="product-card__meta"><strong class="product-card__price">${formatMoney(producto.precio)}</strong><span class="product-card__unit">${escapeHtml(producto.unidadVenta || "unidad")}</span></div>
      <div class="product-card__actions">
        <div class="qty-control" aria-label="Cantidad">
          <button type="button" data-action="qty-minus" data-code="${escapeHtml(producto.codigo)}" aria-label="Restar cantidad">−</button>
          <span data-qty-for="${escapeHtml(producto.codigo)}">${qty}</span>
          <button type="button" data-action="qty-plus" data-code="${escapeHtml(producto.codigo)}" aria-label="Sumar cantidad">+</button>
        </div>
        <button class="add-button${inCart ? " is-added" : ""}" type="button" data-action="add" data-code="${escapeHtml(producto.codigo)}">${inCart ? "Agregar más" : "Agregar"}</button>
      </div>
    </div>
  </article>`;
}

function renderProducts({ append = false } = {}) {
  if (!state.productos.length && !append) {
    const noVisible = !state.busqueda && !state.rubro;
    els.grid.innerHTML = `<div class="catalogo-empty"><div><div class="catalogo-empty__icon">⌕</div><h3>${noVisible ? "Todavía no hay productos publicados" : "No encontramos productos"}</h3><p>${noVisible ? "El catálogo está listo. Los productos aparecerán acá cuando sean marcados como visibles desde la administración." : "Probá con otro nombre, código o rubro."}</p></div></div>`;
    return;
  }
  const html = state.productos.map(renderProductCard).join("");
  if (append) els.grid.insertAdjacentHTML("beforeend", html); else els.grid.innerHTML = html;
}

function updateHeading() {
  const selected = state.rubros.find((r) => r.slug === state.rubro);
  if (state.busqueda) {
    els.eyebrow.textContent = "RESULTADOS";
    els.title.textContent = `“${state.busqueda}”`;
  } else if (selected) {
    els.eyebrow.textContent = "RUBRO";
    els.title.textContent = selected.nombre;
  } else {
    els.eyebrow.textContent = "CATÁLOGO";
    els.title.textContent = "Todos los productos";
  }
  els.count.textContent = pluralProductos(state.total);
  els.loadMoreWrap.hidden = state.pagina >= state.paginas || state.total === 0;
}

async function apiJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (!data?.ok) throw new Error(data?.mensaje || "Respuesta inválida");
  return data;
}

async function cargarEstadoCatalogo() {
  try {
    state.estadoCatalogo = await apiJson("/catalogo/api/estado");
  } catch (error) {
    console.warn("No se pudo consultar el estado del catálogo:", error);
    state.estadoCatalogo = null;
  }
}

async function cargarRubros() {
  try {
    const data = await apiJson("/catalogo/api/rubros");
    state.rubros = Array.isArray(data.rubros) ? data.rubros : [];
  } catch (error) {
    console.error("No se pudieron cargar los rubros:", error);
    state.rubros = [];
    els.feedback.textContent = "No pudimos cargar los rubros. Podés seguir usando el buscador.";
  }
  renderCategories();
}

async function cargarProductos({ append = false } = {}) {
  if (state.loading) return;
  state.loading = true;
  els.feedback.textContent = "";
  if (!append) renderSkeletons();
  try {
    const params = new URLSearchParams({ pagina: String(state.pagina), limite: String(PAGE_SIZE) });
    if (state.busqueda) params.set("q", state.busqueda);
    if (state.rubro) params.set("rubro", state.rubro);
    const data = await apiJson(`/catalogo/api/productos?${params}`);
    const nuevos = Array.isArray(data.productos) ? data.productos : [];
    state.productos = append ? [...state.productos, ...nuevos] : nuevos;
    state.total = Number(data.total) || 0;
    state.paginas = Number(data.paginas) || 0;
    renderProducts({ append: false });
    updateHeading();
    renderCategories();
  } catch (error) {
    console.error("No se pudieron cargar los productos:", error);
    if (!append) state.productos = [];
    els.grid.innerHTML = '<div class="catalogo-empty"><div><div class="catalogo-empty__icon">!</div><h3>Catálogo temporalmente no disponible</h3><p>Intentá nuevamente en unos instantes.</p></div></div>';
    els.count.textContent = "No se pudieron cargar los productos";
    els.feedback.textContent = "Hubo un problema de conexión con el catálogo.";
  } finally {
    state.loading = false;
  }
}

function seleccionarRubro(slug = "") {
  if (state.rubro === slug && !state.busqueda) return;
  state.rubro = slug;
  state.busqueda = "";
  els.search.value = "";
  els.searchCompact.value = "";
  state.pagina = 1;
  cerrarDrawers();
  cargarProductos();
  document.getElementById("productos")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buscar(texto = "") {
  const q = String(texto || "").trim().replace(/\s+/g, " ").slice(0, 100);
  state.busqueda = q;
  state.pagina = 1;
  els.search.value = q;
  els.searchCompact.value = q;
  cargarProductos();
  document.getElementById("productos")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buscarProducto(codigo) { return state.productos.find((p) => p.codigo === codigo) || state.carrito.find((p) => p.codigo === codigo); }

function cambiarCantidadTemporal(codigo, delta) {
  const next = cantidadTemporal(codigo) + delta;
  setCantidadTemporal(codigo, next);
  document.querySelectorAll(`[data-qty-for="${CSS.escape(codigo)}"]`).forEach((el) => { el.textContent = String(cantidadTemporal(codigo)); });
}

function agregarAlCarrito(codigo) {
  const producto = buscarProducto(codigo);
  if (!producto) return;
  const cantidad = cantidadTemporal(codigo);
  const existente = state.carrito.find((x) => x.codigo === codigo);
  if (existente) existente.cantidad = Math.min(999, existente.cantidad + cantidad);
  else state.carrito.push({
    codigo: producto.codigo,
    nombre: producto.nombre,
    precio: producto.precio,
    unidadVenta: producto.unidadVenta,
    rubro: producto.rubro,
    cantidad,
  });
  guardarCarrito();
  renderCart();
  document.querySelectorAll(`[data-action="add"][data-code="${CSS.escape(codigo)}"]`).forEach((btn) => { btn.classList.add("is-added"); btn.textContent = "Agregar más"; });
}

function actualizarCantidadCarrito(codigo, delta) {
  const item = state.carrito.find((x) => x.codigo === codigo);
  if (!item) return;
  item.cantidad = Math.max(1, Math.min(999, item.cantidad + delta));
  guardarCarrito();
  renderCart();
}

function quitarDelCarrito(codigo) {
  state.carrito = state.carrito.filter((x) => x.codigo !== codigo);
  guardarCarrito();
  renderCart();
  document.querySelectorAll(`[data-action="add"][data-code="${CSS.escape(codigo)}"]`).forEach((btn) => { btn.classList.remove("is-added"); btn.textContent = "Agregar"; });
}

function cartTotals() {
  return state.carrito.reduce((acc, item) => {
    const cantidad = Number(item.cantidad) || 0;
    acc.unidades += cantidad;
    acc.total += (Number(item.precio) || 0) * cantidad;
    return acc;
  }, { unidades: 0, total: 0 });
}

function renderCart() {
  const totals = cartTotals();
  els.cartBadge.hidden = totals.unidades === 0;
  els.cartBadge.textContent = totals.unidades > 99 ? "99+" : String(totals.unidades);
  els.cartProductsLabel.textContent = pluralProductos(state.carrito.length);
  els.cartTotal.textContent = formatMoney(totals.total);
  els.mobileCartCount.textContent = pluralProductos(state.carrito.length);
  els.mobileCartTotal.textContent = formatMoney(totals.total);
  els.mobileCartbar.hidden = state.carrito.length === 0;

  if (!state.carrito.length) {
    els.cartItems.innerHTML = '<div class="cart-empty"><div><span aria-hidden="true">🛒</span><strong>Tu carrito está vacío</strong><small>Agregá productos para empezar tu pedido.</small></div></div>';
    return;
  }
  els.cartItems.innerHTML = state.carrito.map((item) => `<article class="cart-item">
    <div class="cart-item__image">${imagenProducto(item)}</div>
    <div><h3>${escapeHtml(item.nombre)}</h3><div class="cart-item__price">${formatMoney(item.precio)}</div><div class="qty-control"><button type="button" data-cart-action="minus" data-code="${escapeHtml(item.codigo)}">−</button><span>${item.cantidad}</span><button type="button" data-cart-action="plus" data-code="${escapeHtml(item.codigo)}">+</button></div></div>
    <button class="cart-item__remove" type="button" data-cart-action="remove" data-code="${escapeHtml(item.codigo)}" aria-label="Quitar ${escapeHtml(item.nombre)}">×</button>
  </article>`).join("");
}

function abrirDrawer(tipo) {
  const isCart = tipo === "cart";
  els.cart.classList.toggle("is-open", isCart);
  els.mobileCategories.classList.toggle("is-open", !isCart);
  els.cart.setAttribute("aria-hidden", String(!isCart));
  els.mobileCategories.setAttribute("aria-hidden", String(isCart));
  els.menuBtn.setAttribute("aria-expanded", String(!isCart));
  els.overlay.hidden = false;
  document.body.classList.add("drawer-open");
}

function cerrarDrawers() {
  els.cart.classList.remove("is-open");
  els.mobileCategories.classList.remove("is-open");
  els.cart.setAttribute("aria-hidden", "true");
  els.mobileCategories.setAttribute("aria-hidden", "true");
  els.menuBtn.setAttribute("aria-expanded", "false");
  els.overlay.hidden = true;
  document.body.classList.remove("drawer-open");
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const category = event.target.closest("[data-rubro]");
    if (category) return seleccionarRubro(category.dataset.rubro || "");

    const action = event.target.closest("[data-action]");
    if (action) {
      const code = action.dataset.code || "";
      if (action.dataset.action === "qty-minus") cambiarCantidadTemporal(code, -1);
      if (action.dataset.action === "qty-plus") cambiarCantidadTemporal(code, 1);
      if (action.dataset.action === "add") agregarAlCarrito(code);
      return;
    }

    const cartAction = event.target.closest("[data-cart-action]");
    if (cartAction) {
      const code = cartAction.dataset.code || "";
      if (cartAction.dataset.cartAction === "minus") actualizarCantidadCarrito(code, -1);
      if (cartAction.dataset.cartAction === "plus") actualizarCantidadCarrito(code, 1);
      if (cartAction.dataset.cartAction === "remove") quitarDelCarrito(code);
    }
  });

  els.searchForm.addEventListener("submit", (e) => { e.preventDefault(); buscar(els.search.value); });
  els.searchFormCompact.addEventListener("submit", (e) => { e.preventDefault(); buscar(els.searchCompact.value); });
  let timer;
  els.searchCompact.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => buscar(els.searchCompact.value), 450); });
  els.loadMore.addEventListener("click", async () => {
    if (state.pagina >= state.paginas || state.loading) return;
    state.pagina += 1;
    const anteriores = [...state.productos];
    state.loading = true;
    try {
      const params = new URLSearchParams({ pagina: String(state.pagina), limite: String(PAGE_SIZE) });
      if (state.busqueda) params.set("q", state.busqueda);
      if (state.rubro) params.set("rubro", state.rubro);
      const data = await apiJson(`/catalogo/api/productos?${params}`);
      state.productos = [...anteriores, ...(data.productos || [])];
      state.total = Number(data.total) || state.total;
      state.paginas = Number(data.paginas) || state.paginas;
      renderProducts(); updateHeading();
    } catch (error) {
      state.pagina -= 1;
      els.feedback.textContent = "No pudimos cargar más productos. Intentá nuevamente.";
    } finally { state.loading = false; }
  });
  els.cartButton.addEventListener("click", () => abrirDrawer("cart"));
  els.mobileCartbar.addEventListener("click", () => abrirDrawer("cart"));
  els.cartClose.addEventListener("click", cerrarDrawers);
  els.cartContinue.addEventListener("click", cerrarDrawers);
  els.menuBtn.addEventListener("click", () => abrirDrawer("categories"));
  els.categoriesClose.addEventListener("click", cerrarDrawers);
  els.overlay.addEventListener("click", cerrarDrawers);
  els.searchFocusBtn.addEventListener("click", () => { els.search.focus(); els.search.scrollIntoView({ behavior: "smooth", block: "center" }); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarDrawers(); });
}

async function iniciar() {
  bindEvents();
  renderCart();
  renderSkeletons();
  await cargarEstadoCatalogo();
  await cargarRubros();
  await cargarProductos();
}

iniciar();
