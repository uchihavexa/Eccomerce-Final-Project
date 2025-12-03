// ===============================
// CONFIG & STATE
// ===============================
const API_URL = "https://dummyjson.com/products?limit=100";

const STORAGE_KEYS = {
  cart: "store_cart",
  theme: "store_theme",
  filters: "store_filters",
  wishlist: "store_wishlist",
};

let products = [];
let filteredProducts = [];
let cart = [];
let wishlist = [];

let currentPage = 1;
const pageSize = 12;
const LOW_STOCK_THRESHOLD = 5;

const dom = {};

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  initTheme();
  initAnimations();
  initFlashSaleCountdown();
  initHeroSwiper();
  initCartFromStorage();
  initWishlistFromStorage();
  initGlobalListeners();
  fetchAndRenderProducts();
});

// ===============================
// DOM REFERENCES
// ===============================
function cacheDom() {
  dom.productsGrid = document.getElementById("products-grid");
  dom.loader = document.getElementById("loader");
  dom.searchInput = document.getElementById("search-input");
  dom.categoryFilter = document.getElementById("category-filter");
  dom.sortSelect = document.getElementById("sort-select");
  dom.clearFiltersBtn = document.getElementById("clear-filters-btn");
  dom.pagination = document.getElementById("pagination");

  dom.themeToggle = document.getElementById("theme-toggle");
  dom.themeIcon = dom.themeToggle?.querySelector(".theme-icon");

  dom.cartToggle = document.getElementById("cart-toggle");
  dom.cartPanel = document.getElementById("cart-panel");
  dom.cartBackdrop = document.getElementById("cart-backdrop");
  dom.cartCloseBtn = document.getElementById("cart-close-btn");
  dom.cartItems = document.getElementById("cart-items");
  dom.cartTotal = document.getElementById("cart-total");
  dom.cartCount = document.getElementById("cart-count");
  dom.clearCartBtn = document.getElementById("clear-cart-btn");
  dom.checkoutBtn = document.getElementById("checkout-btn");

  dom.featuredWrapper = document.getElementById("featured-slider-wrapper");

  // Wishlist
  dom.wishlistToggle = document.getElementById("wishlist-toggle");
  dom.wishlistPanel = document.getElementById("wishlist-panel");
  dom.wishlistBackdrop = document.getElementById("wishlist-backdrop");
  dom.wishlistCloseBtn = document.getElementById("wishlist-close-btn");
  dom.wishlistItems = document.getElementById("wishlist-items");
  dom.wishlistCount = document.getElementById("wishlist-count");

  // Mobile nav
  dom.mobileBtn = document.getElementById("mobile-menu-btn");
  dom.mobileNav = document.getElementById("mobile-nav");
  dom.mobileClose = document.getElementById("mobile-nav-close");
  dom.mobileBackdrop = document.getElementById("mobile-backdrop");

  // Quick View Modal
  dom.qvModal = document.getElementById("quickview-modal");
  dom.qvBackdrop = document.getElementById("quickview-backdrop");
  dom.qvClose = document.getElementById("quickview-close");
  dom.qvMainImg = document.getElementById("quickview-main-img");
  dom.qvThumbs = document.getElementById("quickview-thumbs");
  dom.qvTitle = document.getElementById("quickview-title");
  dom.qvCategory = document.getElementById("quickview-category");
  dom.qvDesc = document.getElementById("quickview-desc");
  dom.qvPrice = document.getElementById("quickview-price");
  dom.qvRating = document.getElementById("quickview-rating");
  dom.qvStock = document.getElementById("quickview-stock");
  dom.qvAddCart = document.getElementById("quickview-addcart");
  dom.qvFav = document.getElementById("quickview-fav");
  dom.notificationContainer = document.getElementById("notification-container");
}

// ===============================
// THEME (LIGHT / DARK) + LOCALSTORAGE
// ===============================
function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.theme);
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const initialTheme = saved || (prefersDark ? "dark" : "light");
  setTheme(initialTheme);

  if (dom.themeToggle) {
    dom.themeToggle.addEventListener("click", () => {
      const current =
        document.documentElement.getAttribute("data-theme") || "light";
      const next = current === "light" ? "dark" : "light";
      setTheme(next);
    });
  }
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEYS.theme, theme);

  if (dom.themeIcon) {
    dom.themeIcon.innerHTML =
      theme === "light"
        ? '<i class="fa-solid fa-moon"></i>'
        : '<i class="fa-solid fa-sun"></i>';
  }
}

// ===============================
// LISTENERS
// ===============================
function initGlobalListeners() {
  // Filters
  dom.searchInput?.addEventListener("input", () => {
    currentPage = 1;
    applyFilters();
  });
  dom.categoryFilter?.addEventListener("change", () => {
    currentPage = 1;
    applyFilters();
  });
  dom.sortSelect?.addEventListener("change", () => {
    currentPage = 1;
    applyFilters();
  });

  dom.clearFiltersBtn?.addEventListener("click", () => {
    resetFilters();
    currentPage = 1;
    applyFilters();
  });

  // Cart
  dom.cartToggle?.addEventListener("click", openCart);
  dom.cartCloseBtn?.addEventListener("click", closeCart);
  dom.cartBackdrop?.addEventListener("click", closeCart);
  dom.clearCartBtn?.addEventListener("click", clearCart);
  dom.checkoutBtn?.addEventListener("click", handleCheckout);

  // Wishlist
  dom.wishlistToggle?.addEventListener("click", openWishlist);
  dom.wishlistCloseBtn?.addEventListener("click", closeWishlist);
  dom.wishlistBackdrop?.addEventListener("click", closeWishlist);

  // Mobile nav
  dom.mobileBtn?.addEventListener("click", () => {
    dom.mobileNav?.classList.add("open");
    dom.mobileBackdrop?.classList.add("open");
  });

  dom.mobileClose?.addEventListener("click", closeMobileNav);
  dom.mobileBackdrop?.addEventListener("click", closeMobileNav);

  document.querySelectorAll(".mobile-nav-link").forEach((link) => {
    link.addEventListener("click", closeMobileNav);
  });

  // Pagination (event delegation)
  dom.pagination?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-page]");
    if (!btn) return;

    const type = btn.dataset.page;
    const maxPage = Math.max(1, Math.ceil(filteredProducts.length / pageSize));

    if (type === "prev") {
      currentPage = Math.max(1, currentPage - 1);
    } else if (type === "next") {
      currentPage = Math.min(maxPage, currentPage + 1);
    } else {
      currentPage = Number(type);
    }

    renderProducts();
    renderPagination();

    document
      .getElementById("store")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Quick View close
  dom.qvClose?.addEventListener("click", closeQuickView);
  dom.qvBackdrop?.addEventListener("click", closeQuickView);

  // ESC key closes modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCart();
      closeWishlist();
      closeQuickView();
      closeMobileNav();
    }
  });
}

function closeMobileNav() {
  dom.mobileNav?.classList.remove("open");
  dom.mobileBackdrop?.classList.remove("open");
}

// ===============================
// SWIPERS
// ===============================
function initHeroSwiper() {
  // eslint-disable-next-line no-undef
  new Swiper(".hero-swiper", {
    loop: true,
    autoplay: {
      delay: 4500,
    },
    effect: "slide",
    spaceBetween: 0,
    pagination: {
      el: ".hero-swiper .swiper-pagination",
      clickable: true,
    },
    navigation: {
      nextEl: ".hero-swiper .swiper-button-next",
      prevEl: ".hero-swiper .swiper-button-prev",
    },
  });
}

function buildFeaturedSlider(list) {
  if (!dom.featuredWrapper) return;

  dom.featuredWrapper.innerHTML = "";

  const sorted = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const top = sorted.slice(0, 10);

  top.forEach((product) => {
    const slide = document.createElement("div");
    slide.className = "swiper-slide featured-slide";
    slide.innerHTML = `
      <article class="featured-card">
        <div class="featured-image">
          <img
            src="${product.thumbnail}"
            alt="${escapeHtml(product.title)}"
            loading="lazy"
          />
        </div>
        <div class="featured-body">
          <h3>${escapeHtml(product.title)}</h3>
          <p>${escapeHtml((product.description || "").slice(0, 60))}...</p>
          <div class="featured-meta">
            <span>$${Number(product.price).toFixed(2)}</span>
            <span>★ ${product.rating}</span>
          </div>
        </div>
      </article>
    `;
    dom.featuredWrapper.appendChild(slide);
  });

  // eslint-disable-next-line no-undef
  new Swiper(".featured-swiper", {
    loop: true,
    spaceBetween: 16,
    slidesPerView: 1.1,
    breakpoints: {
      640: { slidesPerView: 2.1 },
      1024: { slidesPerView: 3.1 },
    },
    pagination: {
      el: ".featured-swiper .swiper-pagination",
      clickable: true,
    },
    navigation: {
      nextEl: ".featured-swiper .swiper-button-next",
      prevEl: ".featured-swiper .swiper-button-prev",
    },
  });
}

// ===============================
// FETCH PRODUCTS FROM API
// ===============================
async function fetchAndRenderProducts() {
  toggleLoader(true);

  try {
    const res = await fetch(API_URL);
    if (!res.ok) {
      throw new Error("Network error while fetching products.");
    }

    const data = await res.json();
    products = Array.isArray(data.products) ? data.products : [];

    buildCategoryOptions(products);
    restoreFilters();
    applyFilters();
    buildFeaturedSlider(products);
    renderWishlist(); // initialize after products loaded
  } catch (error) {
    console.error(error);
    Swal.fire(
      "Error",
      "Failed to load products from the API. Please try again later.",
      "error"
    );
  } finally {
    toggleLoader(false);
  }
}

function toggleLoader(show) {
  if (!dom.loader) return;
  dom.loader.classList.toggle("hidden", !show);
}

// ===============================
// FILTERS & SORTING (+ LOCALSTORAGE)
// ===============================
function buildCategoryOptions(list) {
  if (!dom.categoryFilter) return;

  const categories = Array.from(new Set(list.map((p) => p.category))).sort();

  dom.categoryFilter.innerHTML =
    `<option value="all">All categories</option>` +
    categories
      .map(
        (cat) =>
          `<option value="${cat}">${escapeHtml(capitalize(cat))}</option>`
      )
      .join("");
}

function getCurrentFilters() {
  return {
    search: (dom.searchInput?.value || "").trim().toLowerCase(),
    category: dom.categoryFilter?.value || "all",
    sortBy: dom.sortSelect?.value || "default",
  };
}

function applyFilters() {
  const { search, category, sortBy } = getCurrentFilters();
  saveFilters();

  let result = [...products];

  if (search) {
    result = result.filter((p) => {
      const haystack = `${p.title} ${p.brand || ""} ${
        p.description || ""
      }`.toLowerCase();
      return haystack.includes(search);
    });
  }

  if (category && category !== "all") {
    result = result.filter((p) => p.category === category);
  }

  switch (sortBy) {
    case "price-asc":
      result.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      result.sort((a, b) => b.price - a.price);
      break;
    case "rating-desc":
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    default:
      result.sort((a, b) => a.id - b.id);
  }

  filteredProducts = result;
  currentPage = 1;
  renderProducts();
  renderPagination();
}

function resetFilters() {
  if (dom.searchInput) dom.searchInput.value = "";
  if (dom.categoryFilter) dom.categoryFilter.value = "all";
  if (dom.sortSelect) dom.sortSelect.value = "default";

  localStorage.removeItem(STORAGE_KEYS.filters);
}

function saveFilters() {
  const filters = getCurrentFilters();
  localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify(filters));
}

function restoreFilters() {
  const raw = localStorage.getItem(STORAGE_KEYS.filters);
  if (!raw) return;

  try {
    const filters = JSON.parse(raw);
    if (dom.searchInput && "search" in filters)
      dom.searchInput.value = filters.search;
    if (dom.categoryFilter && "category" in filters)
      dom.categoryFilter.value = filters.category;
    if (dom.sortSelect && "sortBy" in filters)
      dom.sortSelect.value = filters.sortBy;
  } catch {
    // ignore malformed data
  }
}

// ===============================
// RENDER PRODUCTS + PAGINATION
// ===============================
function renderProducts() {
  if (!dom.productsGrid) return;
  dom.productsGrid.innerHTML = "";

  if (!filteredProducts.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No products match your filters.";
    dom.productsGrid.appendChild(empty);
    return;
  }

  const maxPage = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  currentPage = Math.min(currentPage, maxPage);

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = filteredProducts.slice(start, end);

  pageItems.forEach((product, idx) => {
    const card = document.createElement("article");
    card.className = "product-card";
    const globalIndex = start + idx;
    const direction = globalIndex % 2 === 0 ? "fade-right" : "fade-left";
    card.dataset.aos = direction;
    card.dataset.aosOffset = "80";
    card.dataset.aosDuration = "700";

    const safeTitle = escapeHtml(product.title);
    const safeCategory = escapeHtml(capitalize(product.category));
    const desc = escapeHtml((product.description || "").slice(0, 80));
    const remainingStock = getRemainingStock(product.id);
    const stockLabel = formatStockLabel(remainingStock);
    const stockBadgeClass = getStockBadgeClass(remainingStock);
    const isOut = isOutOfStock(remainingStock);
    const addBtnLabel = isOut ? "Out of stock" : "Add to cart";
    const stockBadgeHtml =
      stockLabel && stockBadgeClass
        ? `<span class="stock-badge ${stockBadgeClass}">${escapeHtml(
            stockLabel
          )}</span>`
        : "";

    card.innerHTML = `
      <div class="product-image">
        <img
          src="${product.thumbnail}"
          alt="${safeTitle}"
          loading="lazy"
        />
      </div>
      <div class="product-body">
        <h3 class="product-title">${safeTitle}</h3>
        <p class="product-category">${safeCategory}</p>
        <p class="product-description">${desc}...</p>
        <div class="product-meta">
          <span class="product-price">$${Number(product.price).toFixed(
            2
          )}</span>
          <span class="product-rating">★ ${product.rating}</span>
        </div>
        ${stockBadgeHtml}
        <div class="product-actions">
          <button
            class="btn btn-primary btn-add-cart"
            data-id="${product.id}"
            ${isOut ? "disabled" : ""}
          >
            <i class="fa-solid fa-cart-plus"></i>
            ${addBtnLabel}
          </button>
          <button
            class="fav-btn ${isFavorite(product.id) ? "active" : ""}"
            data-id="${product.id}"
            aria-label="Toggle favorite"
          >
            <i class="${
              isFavorite(product.id)
                ? "fa-solid fa-heart"
                : "fa-regular fa-heart"
            }"></i>
          </button>
        </div>
      </div>
    `;

    dom.productsGrid.appendChild(card);

    // Quick view: image & title click
    const img = card.querySelector(".product-image img");
    const titleEl = card.querySelector(".product-title");
    img.addEventListener("click", () => openQuickView(product.id));
    titleEl.addEventListener("click", () => openQuickView(product.id));
  });

  // Bind add-to-cart buttons
  dom.productsGrid.querySelectorAll(".btn-add-cart").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      addToCart(id);
    });
  });

  // Bind favorite buttons
  dom.productsGrid.querySelectorAll(".fav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      toggleFavorite(id);
    });
  });

  refreshAnimations();
}

function renderPagination() {
  if (!dom.pagination) return;

  const total = filteredProducts.length;
  const maxPage = Math.ceil(total / pageSize);

  if (maxPage <= 1) {
    dom.pagination.innerHTML = "";
    return;
  }

  let html = `<div class="pagination-inner">`;

  html += `<button class="page-btn" data-page="prev" ${
    currentPage === 1 ? "disabled" : ""
  }>Prev</button>`;

  for (let p = 1; p <= maxPage; p++) {
    html += `<button class="page-btn ${
      p === currentPage ? "active" : ""
    }" data-page="${p}">${p}</button>`;
  }

  html += `<button class="page-btn" data-page="next" ${
    currentPage === maxPage ? "disabled" : ""
  }>Next</button>`;

  html += `</div>`;

  dom.pagination.innerHTML = html;
}

// ===============================
// CART LOGIC + LOCALSTORAGE
// ===============================
function initCartFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEYS.cart);
  if (raw) {
    try {
      cart = JSON.parse(raw) || [];
    } catch {
      cart = [];
    }
  }
  updateCartCount();
  renderCart();
}

function saveCart() {
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
}

function addToCart(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  const remainingStock = getRemainingStock(productId);
  if (isOutOfStock(remainingStock)) {
    showNotification(
      `${product.title} is out of stock or already in your cart at the maximum quantity.`,
      {
        type: "info",
        icon: "fa-circle-info",
      }
    );
    return;
  }

  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      title: product.title,
      price: product.price,
      thumbnail: product.thumbnail,
      qty: 1,
    });
  }

  saveCart();
  updateCartCount();
  renderCart();
  refreshInventoryViews();

  showNotification(`${product.title} added to cart successfully.`, {
    type: "success",
    icon: "fa-check",
  });
}

function updateCartCount() {
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  if (dom.cartCount) {
    dom.cartCount.textContent = String(totalQty);
  }
}

function renderCart() {
  if (!dom.cartItems) return;

  dom.cartItems.innerHTML = "";

  if (!cart.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Your cart is empty.";
    dom.cartItems.appendChild(empty);

    if (dom.cartTotal) {
      dom.cartTotal.textContent = "$0.00";
    }
    return;
  }

  let total = 0;

  cart.forEach((item) => {
    const lineTotal = item.price * item.qty;
    total += lineTotal;

    const row = document.createElement("div");
    row.className = "cart-item";

    const safeTitle = escapeHtml(item.title);

    row.innerHTML = `
      <div class="cart-item-image">
        <img src="${item.thumbnail}" alt="${safeTitle}" />
      </div>
      <div class="cart-item-info">
        <h4>${safeTitle}</h4>
        <div class="cart-item-meta">
          <span>$${Number(item.price).toFixed(2)}</span>
          <span>x ${item.qty}</span>
          <span class="cart-item-line-total">$${lineTotal.toFixed(2)}</span>
        </div>
        <div class="cart-item-actions">
          <button
            class="icon-button qty-btn"
            data-action="dec"
            data-id="${item.id}"
          >
            <i class="fa-solid fa-minus"></i>
          </button>
          <button
            class="icon-button qty-btn"
            data-action="inc"
            data-id="${item.id}"
          >
            <i class="fa-solid fa-plus"></i>
          </button>
          <button
            class="icon-button remove-btn"
            data-id="${item.id}"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;

    dom.cartItems.appendChild(row);
  });

  if (dom.cartTotal) {
    dom.cartTotal.textContent = `$${total.toFixed(2)}`;
  }

  // quantity buttons
  dom.cartItems.querySelectorAll(".qty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      const action = btn.dataset.action;
      if (action === "inc") changeQty(id, 1);
      if (action === "dec") changeQty(id, -1);
    });
  });

  // remove buttons
  dom.cartItems.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      confirmRemoveItem(id);
    });
  });
}

function changeQty(id, delta) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;

  if (delta > 0) {
    const stock = getProductStock(id);
    if (stock !== null && item.qty >= stock) {
      showNotification(
        `You already added all available stock of ${item.title}.`,
        {
          type: "info",
          icon: "fa-circle-info",
        }
      );
      return;
    }
  }

  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter((i) => i.id !== id);
  }

  saveCart();
  updateCartCount();
  renderCart();
  refreshInventoryViews();
}

async function confirmRemoveItem(id) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;

  const result = await Swal.fire({
    title: "Delete product?",
    text: `Are you sure you want to delete ${item.title} from your cart?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Remove",
    cancelButtonText: "Cancel",
  });

  if (result.isConfirmed) {
    cart = cart.filter((i) => i.id !== id);
    saveCart();
    updateCartCount();
    renderCart();
    refreshInventoryViews();
    showNotification(`${item.title} deleted successfully.`, {
      type: "danger",
      icon: "fa-check",
    });
  }
}

async function clearCart() {
  if (!cart.length) return;

  const result = await Swal.fire({
    title: "Clear cart?",
    text: "This will remove all items from your cart.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, clear it",
    cancelButtonText: "Cancel",
  });

  if (result.isConfirmed) {
    cart = [];
    saveCart();
    updateCartCount();
    renderCart();
    refreshInventoryViews();
    Swal.fire({
      title: "Cart cleared",
      text: "All items have been removed from your cart.",
      icon: "success",
      confirmButtonText: "Got it",
    });
  }
}

function openCart() {
  dom.cartPanel?.classList.add("open");
  dom.cartBackdrop?.classList.add("open");
}

function closeCart() {
  dom.cartPanel?.classList.remove("open");
  dom.cartBackdrop?.classList.remove("open");
}

// ===============================
// WISHLIST / FAVORITES
// ===============================
function initWishlistFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEYS.wishlist);
  if (raw) {
    try {
      wishlist = JSON.parse(raw) || [];
    } catch {
      wishlist = [];
    }
  }
  updateWishlistCount();
}

function saveWishlist() {
  localStorage.setItem(STORAGE_KEYS.wishlist, JSON.stringify(wishlist));
}

function isFavorite(id) {
  return wishlist.includes(id);
}

async function toggleFavorite(id) {
  const product = products.find((p) => p.id === id);
  const productName = product ? product.title : "This product";
  const currentlyFavorite = isFavorite(id);

  if (currentlyFavorite) {
    const result = await Swal.fire({
      title: "Remove favorite?",
      text: `Are you sure you want to delete ${productName} from favorites?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;
    wishlist = wishlist.filter((x) => x !== id);
    showNotification(`${productName} deleted successfully.`, {
      type: "danger",
      icon: "fa-check",
    });
  } else {
    if (!product) return;
    wishlist.push(id);
    showNotification(`${productName} added to favorites successfully.`, {
      type: "success",
      icon: "fa-check",
    });
  }

  saveWishlist();
  updateWishlistCount();
  renderWishlist();
  renderProducts(); // refresh hearts on cards
}

function updateWishlistCount() {
  if (dom.wishlistCount) {
    dom.wishlistCount.textContent = String(wishlist.length);
  }
}

function renderWishlist() {
  if (!dom.wishlistItems) return;

  dom.wishlistItems.innerHTML = "";

  if (!wishlist.length || !products.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No favorites yet.";
    dom.wishlistItems.appendChild(empty);
    return;
  }

  wishlist.forEach((id) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;

    const item = document.createElement("div");
    item.className = "cart-item";

    const safeTitle = escapeHtml(p.title);
    const remainingStock = getRemainingStock(p.id);
    const stockLabel = formatStockLabel(remainingStock);
    const stockBadgeClass = getStockBadgeClass(remainingStock);
    const stockBadgeHtml =
      stockLabel && stockBadgeClass
        ? `<span class="stock-badge ${stockBadgeClass}">${escapeHtml(
            stockLabel
          )}</span>`
        : "";
    const disableAddToCart = isOutOfStock(remainingStock);

    item.innerHTML = `
      <div class="cart-item-image">
        <img src="${p.thumbnail}" alt="${safeTitle}" />
      </div>
      <div class="cart-item-info">
        <h4>${safeTitle}</h4>
        <div class="cart-item-meta">
          <span>$${Number(p.price).toFixed(2)}</span>
          <span>★ ${p.rating}</span>
          ${stockBadgeHtml}
        </div>
        <div class="cart-item-actions">
          <button
            class="icon-button"
            data-action="addcart"
            data-id="${p.id}"
            ${disableAddToCart ? "disabled" : ""}
          >
            <i class="fa-solid fa-cart-plus"></i>
          </button>
          <button
            class="icon-button"
            data-action="removefav"
            data-id="${p.id}"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;

    dom.wishlistItems.appendChild(item);
  });

  // actions
  dom.wishlistItems
    .querySelectorAll(".cart-item-actions .icon-button")
    .forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.dataset.id);
        const action = btn.dataset.action;
        if (action === "addcart") addToCart(id);
        if (action === "removefav") await toggleFavorite(id);
      });
    });
}

function openWishlist() {
  dom.wishlistPanel?.classList.add("open");
  dom.wishlistBackdrop?.classList.add("open");
}

function closeWishlist() {
  dom.wishlistPanel?.classList.remove("open");
  dom.wishlistBackdrop?.classList.remove("open");
}

// ===============================
// QUICK VIEW MODAL
// ===============================
function openQuickView(id) {
  const product = products.find((p) => p.id === id);
  if (!product || !dom.qvModal) return;

  dom.qvTitle.textContent = product.title;
  dom.qvCategory.textContent = capitalize(product.category || "");
  dom.qvDesc.textContent = product.description || "";
  dom.qvPrice.textContent = `$${Number(product.price).toFixed(2)}`;
  dom.qvRating.textContent = `★ ${product.rating}`;
  const remainingStock = getRemainingStock(id);
  const stockLabel = formatStockLabel(remainingStock);
  if (dom.qvStock) {
    dom.qvStock.textContent = stockLabel;
    dom.qvStock.classList.remove("low-stock", "out-stock", "hidden");
    if (!stockLabel) {
      dom.qvStock.classList.add("hidden");
    } else if (isOutOfStock(remainingStock)) {
      dom.qvStock.classList.add("out-stock");
    } else if (isLowStock(remainingStock)) {
      dom.qvStock.classList.add("low-stock");
    }
  }
  if (dom.qvAddCart) {
    dom.qvAddCart.disabled = isOutOfStock(remainingStock);
  }

  // main image
  dom.qvMainImg.src = product.thumbnail;
  dom.qvMainImg.alt = product.title;

  // thumbnails
  dom.qvThumbs.innerHTML = "";
  const imgs =
    Array.isArray(product.images) && product.images.length
      ? product.images
      : [product.thumbnail];

  imgs.forEach((imgUrl) => {
    const t = document.createElement("img");
    t.src = imgUrl;
    t.alt = product.title;
    t.addEventListener("click", () => {
      dom.qvMainImg.src = imgUrl;
    });
    dom.qvThumbs.appendChild(t);
  });

  // wishlist button state
  setQuickViewFavButton(id);

  dom.qvFav.onclick = async () => {
    await toggleFavorite(id);
    setQuickViewFavButton(id);
  };

  dom.qvAddCart.onclick = () => {
    addToCart(id);
  };

  dom.qvModal.classList.add("open");
  dom.qvBackdrop.classList.add("open");
}

function setQuickViewFavButton(id) {
  if (!dom.qvFav) return;
  if (isFavorite(id)) {
    dom.qvFav.innerHTML = '<i class="fa-solid fa-heart"></i> Remove Favorite';
  } else {
    dom.qvFav.innerHTML = '<i class="fa-regular fa-heart"></i> Add Favorite';
  }
}

function closeQuickView() {
  dom.qvModal?.classList.remove("open");
  dom.qvBackdrop?.classList.remove("open");
}

// ===============================
// CHECKOUT
// ===============================
function handleCheckout() {
  if (!cart.length) {
    Swal.fire(
      "Cart is empty",
      "Add some products before checking out.",
      "info"
    );
    return;
  }

  Swal.fire(
    "Checkout",
    "This is a demo checkout. Integrate a real payment flow here.",
    "success"
  );
}

// ===============================
// HELPERS
// ===============================
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getCartQuantity(productId) {
  const item = cart.find((i) => i.id === productId);
  return item ? item.qty : 0;
}

function getProductStock(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product || typeof product.stock !== "number") return null;
  return product.stock;
}

function getRemainingStock(productId) {
  const stock = getProductStock(productId);
  if (stock === null) return Infinity;
  const qtyInCart = getCartQuantity(productId);
  return Math.max(0, stock - qtyInCart);
}

function formatStockLabel(stock) {
  if (!Number.isFinite(stock)) return "";
  if (stock <= 0) return "Out of stock";
  if (stock <= LOW_STOCK_THRESHOLD) {
    return `Only ${stock} left`;
  }
  return `${stock} in stock`;
}

function isLowStock(stock) {
  return Number.isFinite(stock) && stock > 0 && stock <= LOW_STOCK_THRESHOLD;
}

function isOutOfStock(stock) {
  return Number.isFinite(stock) && stock <= 0;
}

function getStockBadgeClass(stock) {
  if (!Number.isFinite(stock)) return "";
  if (isOutOfStock(stock)) return "out-stock";
  if (isLowStock(stock)) return "low-stock";
  return "in-stock";
}

function refreshInventoryViews() {
  renderProducts();
  renderWishlist();
}

function showNotification(message, options = {}) {
  const { type = "success", icon, duration = 2000 } = options;
  const container =
    dom.notificationContainer ||
    document.getElementById("notification-container");
  if (!container) return;
  dom.notificationContainer = container;

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;

  const iconClass = icon || getNotificationIcon(type);
  const iconHtml = iconClass
    ? `<span class="notification-icon"><i class="fa-solid ${iconClass}"></i></span>`
    : "";

  notification.innerHTML = `${iconHtml}<span>${escapeHtml(message)}</span>`;
  container.appendChild(notification);

  requestAnimationFrame(() => notification.classList.add("show"));

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

function getNotificationIcon(type) {
  switch (type) {
    case "danger":
      return "fa-triangle-exclamation";
    case "info":
      return "fa-circle-info";
    default:
      return "fa-check";
  }
}
function initFlashSaleCountdown() {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 2);

  function updateCountdown() {
    const now = new Date().getTime();
    const distance = targetDate.getTime() - now;

    if (distance <= 0) {
      setCountdownValues(0, 0, 0, 0);
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    setCountdownValues(days, hours, minutes, seconds);
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

function initAnimations() {
  if (window.AOS && typeof window.AOS.init === "function") {
    window.AOS.init({
      duration: 700,
      easing: "ease-out-cubic",
      once: true,
      offset: 80,
    });
  }
}

function refreshAnimations() {
  if (window.AOS && typeof window.AOS.refresh === "function") {
    window.AOS.refresh();
  }
}

function setCountdownValues(days, hours, minutes, seconds) {
  const pad = (n) => String(n).padStart(2, "0");
  const daysEl = document.getElementById("flash-days");
  const hoursEl = document.getElementById("flash-hours");
  const minutesEl = document.getElementById("flash-minutes");
  const secondsEl = document.getElementById("flash-seconds");

  if (daysEl) daysEl.textContent = pad(days);
  if (hoursEl) hoursEl.textContent = pad(hours);
  if (minutesEl) minutesEl.textContent = pad(minutes);
  if (secondsEl) secondsEl.textContent = pad(seconds);
}
