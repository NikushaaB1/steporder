

const API = 'https://restaurant.stepprojects.ge/api';

const state = {
  products: [],
  categories: [],
  activeCategory: 'all',
  filters: {
    spiciness: null,
    noNuts: false,
    vegOnly: false,
  },
  cart: JSON.parse(localStorage.getItem('cart') || '[]'),
};

const $ = (s) => document.querySelector(s);
const tabsEl    = $('#categoryTabs');
const gridEl    = $('#cardsGrid');
const spiceSlider = $('#spiceSlider');
const spiceVal  = $('#spiceVal');
const noNutsEl  = $('#noNuts');
const vegOnlyEl = $('#vegOnly');
const btnReset  = $('#btnReset');
const btnApply  = $('#btnApply');
const header    = $('#header');
const cartBtn   = $('#cartBtn');
const cartCount = $('#cartCount');
const cartDrawer= $('#cartDrawer');
const cartOverlay = $('#cartOverlay');
const cartItemsEl = $('#cartItems');
const cartTotalEl = $('#cartTotal');

init();

async function init() {
  bindUI();
  showSkeletons();
  try {
    const [cats, prods] = await Promise.all([
      fetch(`${API}/Categories/GetAll`).then(r => r.json()),
      fetch(`${API}/Products/GetAll`).then(r => r.json()),
    ]);
    state.categories = cats;
    state.products = prods;
    sanitizeCart();
    renderTabs();
    renderCards();
    renderCart();
  } catch (e) {
    console.error(e);
    gridEl.innerHTML = `<div class="empty-state"><span>⚠️</span>Failed to load menu. Please try again.</div>`;
  }
}

function bindUI() {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 30);
  });

  spiceSlider.addEventListener('input', (e) => {
    const v = +e.target.value;
    spiceVal.textContent = v === 0 ? 'Not Chosen' : '🌶️'.repeat(v);
    state.filters.spiciness = v === 0 ? null : v;
  });

  noNutsEl.addEventListener('change', e => state.filters.noNuts = e.target.checked);
  vegOnlyEl.addEventListener('change', e => state.filters.vegOnly = e.target.checked);

  btnApply.addEventListener('click', renderCards);
  btnReset.addEventListener('click', () => {
    state.filters = { spiciness: null, noNuts: false, vegOnly: false };
    spiceSlider.value = 0;
    spiceVal.textContent = 'Not Chosen';
    noNutsEl.checked = false;
    vegOnlyEl.checked = false;
    renderCards();
  });

  cartBtn.addEventListener('click', openCart);
  $('#cartClose').addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);
}

function renderTabs() {
  const tabs = ['All', ...state.categories.map(c => c.name)];
  tabsEl.innerHTML = tabs.map(t => `
    <button class="tab ${ (state.activeCategory === 'all' && t === 'All') || state.activeCategory === t ? 'active' : '' }"
            data-cat="${t}">${t}</button>
  `).join('');
  tabsEl.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      state.activeCategory = cat === 'All' ? 'all' : cat;
      tabsEl.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === btn));
      renderCards();
    });
  });
}

function showSkeletons() {
  gridEl.innerHTML = Array.from({length:6}).map(() => `<div class="skeleton"></div>`).join('');
}

function renderCards() {
  const list = filterProducts();
  if (!list.length) {
    gridEl.innerHTML = `<div class="empty-state"><span>🍽️</span>No dishes match your filters.</div>`;
    return;
  }
  gridEl.innerHTML = list.map(cardHTML).join('');
  gridEl.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => addToCart(+btn.dataset.id));
  });
}

function filterProducts() {
  return state.products.filter(p => {
    if (state.activeCategory !== 'all') {
      const cat = state.categories.find(c => c.id === p.categoryId);
      if (!cat || cat.name !== state.activeCategory) return false;
    }
    if (state.filters.spiciness !== null && p.spiciness !== state.filters.spiciness) return false;
    if (state.filters.noNuts && p.nuts) return false;
    if (state.filters.vegOnly && !p.vegeterian) return false;
    return true;
  });
}

function cardHTML(p) {
  const spice = p.spiciness > 0 ? `<div class="spice-badge">${'🌶️'.repeat(p.spiciness)}</div>` : '';
  return `
    <article class="card">
      <div class="card-img">
        ${spice}
        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300/eee/999?text=No+Image'"/>
      </div>
      <div class="card-info">
        <h3 class="card-title">${p.name}</h3>
        <div class="card-tags">
          <span class="${p.nuts ? 'tag-on' : 'tag-off'}">${p.nuts ? '●' : '○'} Nuts</span>
          <span class="${p.vegeterian ? 'tag-on' : 'tag-off'}">${p.vegeterian ? '●' : '○'} Vegetarian</span>
        </div>
        <div class="card-bottom">
          <span class="price">${p.price}</span>
          <button class="add-btn" data-id="${p.id}">Add to cart</button>
        </div>
      </div>
    </article>
  `;
}

function addToCart(id) {
  const product = state.products.find(p => p.id === id);
  if (!product) return;
  const existing = state.cart.find(i => i.id === id);
  if (existing) existing.qty += 1;
  else state.cart.push({ id, name: product.name, price: product.price, image: product.image, qty: 1 });
  saveCart();
  renderCart();
  toast(`Added "${product.name}" to cart 🛒`);
}

function removeFromCart(id) {
  state.cart = state.cart.filter(i => i.id !== id);
  saveCart(); renderCart();
}

function changeQty(id, delta) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) return removeFromCart(id);
  saveCart(); renderCart();
}

function saveCart() { localStorage.setItem('cart', JSON.stringify(state.cart)); }

function sanitizeCart() {
  const validCart = state.cart.filter(item => {
    const product = state.products.find(p => p.id === item.id);
    return product && typeof product.price === 'number' && !Number.isNaN(product.price) && item.qty > 0;
  });
  if (validCart.length !== state.cart.length) {
    state.cart = validCart;
    saveCart();
  }
}

function renderCart() {
  const totalQty = state.cart.reduce((s,i) => s + i.qty, 0);
  cartCount.textContent = totalQty;
  if (!state.cart.length) {
    cartItemsEl.innerHTML = `<div class="cart-empty">🛒<br/><br/>Your cart is empty</div>`;
  } else {
    cartItemsEl.innerHTML = state.cart.map(i => `
      <div class="cart-item">
        <img src="${i.image}" alt="${i.name}" onerror="this.src='https://via.placeholder.com/60'"/>
        <div class="cart-item-info">
          <h4>${i.name}</h4>
          <div class="ci-price">$${(i.price * i.qty).toFixed(2)}</div>
        </div>
        <div class="qty-ctrl">
          <button data-act="dec" data-id="${i.id}">−</button>
          <span>${i.qty}</span>
          <button data-act="inc" data-id="${i.id}">+</button>
        </div>
      </div>
    `).join('');
    cartItemsEl.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = +btn.dataset.id;
        changeQty(id, btn.dataset.act === 'inc' ? 1 : -1);
      });
    });
  }
  const total = state.cart.reduce((s,i) => s + i.price * i.qty, 0);
  cartTotalEl.textContent = `$${total.toFixed(2)}`;
}

function openCart() {
  cartDrawer.classList.add('open');
  cartOverlay.classList.add('open');
}
function closeCart() {
  cartDrawer.classList.remove('open');
  cartOverlay.classList.remove('open');
}

let toastTimer;
function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

const PRODUCT_DETAILS = {
  1: { desc: "Authentic Thai minced chicken salad with toasted rice powder, fresh herbs, lime, and a hint of chili. A vibrant explosion of flavor in every bite.",
       ing: ["Minced chicken", "Toasted rice powder", "Lime juice", "Fish sauce", "Mint", "Cilantro", "Shallots", "Chili flakes", "Peanuts"] },
  2: { desc: "Crisp green papaya tossed with cherry tomatoes, long beans, and a tangy chili-lime dressing. Refreshing, crunchy and 100% vegetarian.",
       ing: ["Green papaya", "Cherry tomatoes", "Long beans", "Garlic", "Lime juice", "Palm sugar", "Soy sauce", "Chili"] },
  3: { desc: "Iconic spicy and sour Thai soup with chicken, lemongrass, galangal, and kaffir lime leaves. Bright, fragrant and warming.",
       ing: ["Chicken", "Lemongrass", "Galangal", "Kaffir lime leaves", "Mushrooms", "Tomato", "Lime juice", "Chili paste"] },
  4: { desc: "Creamy coconut chicken soup infused with galangal and lime. Mild, silky, and deeply comforting.",
       ing: ["Chicken", "Coconut milk", "Galangal", "Lemongrass", "Mushrooms", "Lime juice", "Cilantro"] },
  5: { desc: "Coconut shrimp soup with delicate aromatics and tender prawns. A luxurious bowl of warmth.",
       ing: ["Shrimp", "Coconut milk", "Galangal", "Lemongrass", "Mushrooms", "Lime", "Fish sauce"] },
  6: { desc: "Fiery hot & sour shrimp soup — Thailand's most famous bowl. Bold, aromatic, unforgettable.",
       ing: ["Shrimp", "Lemongrass", "Galangal", "Kaffir lime", "Tomato", "Mushrooms", "Lime juice", "Thai chili"] },
  7: { desc: "Plant-based version of Tom Yam — bold, sour, spicy and packed with vegetables.",
       ing: ["Tofu", "Mushrooms", "Lemongrass", "Galangal", "Tomato", "Kaffir lime", "Lime juice", "Chili paste"] },
};

const CATEGORY_FALLBACK = {
  1: { desc: "A fresh, vibrant salad bursting with seasonal ingredients and bold dressing.",
       ing: ["Mixed greens", "Fresh herbs", "Citrus dressing", "Seasonal vegetables", "Spices"] },
  2: { desc: "A warming bowl of soup, slow-simmered with aromatic herbs and rich broth.",
       ing: ["Broth", "Aromatic herbs", "Vegetables", "Spices", "Lime juice"] },
  3: { desc: "Tender, flavorful chicken dish prepared with traditional spices and care.",
       ing: ["Chicken", "Garlic", "Onion", "Spices", "Herbs", "Sauce"] },
  4: { desc: "Premium beef dish, slow-cooked for maximum tenderness and flavor.",
       ing: ["Beef", "Garlic", "Onion", "Spices", "Herbs", "Sauce"] },
  5: { desc: "Fresh seafood prepared with delicate spices that highlight its natural flavor.",
       ing: ["Fresh seafood", "Lime", "Herbs", "Garlic", "Spices"] },
  6: { desc: "A hearty vegetable dish celebrating the best of seasonal produce.",
       ing: ["Seasonal vegetables", "Herbs", "Garlic", "Olive oil", "Spices"] },
  7: { desc: "Perfect bite-sized snack, crispy outside and full of flavor inside.",
       ing: ["Mixed batter", "Herbs", "Spices", "Dipping sauce"] },
  8: { desc: "The perfect side to complement your main dish.",
       ing: ["Fresh ingredients", "Herbs", "Light seasoning"] },
};

function getProductDetails(p) {
  return PRODUCT_DETAILS[p.id] || CATEGORY_FALLBACK[p.categoryId] || {
    desc: "A delicious dish prepared with the finest ingredients.",
    ing: ["Premium ingredients", "Fresh herbs", "Traditional spices"],
  };
}

const modalEl     = document.getElementById('productModal');
const modalOverlay= document.getElementById('modalOverlay');
const modalBody   = document.getElementById('modalBody');
const modalClose  = document.getElementById('modalClose');

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

function openProduct(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  const details = getProductDetails(p);
  const cat = state.categories.find(c => c.id === p.categoryId);
  const spice = p.spiciness > 0 ? `<div class="spice-badge">${'🌶️'.repeat(p.spiciness)}</div>` : '';

  modalBody.innerHTML = `
    <div class="modal-img">
      ${spice}
      <img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/600x500/eee/999?text=No+Image'"/>
    </div>
    <div class="modal-info">
      <div class="modal-cat">${cat ? cat.name : 'Dish'}</div>
      <h2 class="modal-title">${p.name}</h2>
      <div class="modal-tags">
        ${p.spiciness > 0 ? `<span class="modal-tag spice">🌶️ Spice level ${p.spiciness}/5</span>` : `<span class="modal-tag">Mild</span>`}
        ${p.vegeterian ? `<span class="modal-tag veg">🌱 Vegetarian</span>` : ''}
        ${p.nuts ? `<span class="modal-tag nuts">🥜 Contains nuts</span>` : `<span class="modal-tag">Nut-free</span>`}
      </div>
      <div class="modal-section">
        <h4>Description</h4>
        <p class="modal-desc">${details.desc}</p>
      </div>
      <div class="modal-section">
        <h4>Ingredients</h4>
        <ul class="ingredient-list">
          ${details.ing.map(i => `<li>${i}</li>`).join('')}
        </ul>
      </div>
      <div class="modal-foot">
        <div class="modal-price">${p.price.toFixed(2)}</div>
        <div class="qty-picker">
          <button id="qtyMinus">−</button>
          <span id="qtyVal">1</span>
          <button id="qtyPlus">+</button>
        </div>
        <button class="modal-add-btn" id="modalAdd">Add to Cart</button>
      </div>
    </div>
  `;

  let qty = 1;
  const qtyValEl = document.getElementById('qtyVal');
  document.getElementById('qtyMinus').addEventListener('click', () => { if (qty > 1) { qty--; qtyValEl.textContent = qty; } });
  document.getElementById('qtyPlus').addEventListener('click', () => { qty++; qtyValEl.textContent = qty; });
  document.getElementById('modalAdd').addEventListener('click', () => {
    for (let i = 0; i < qty; i++) addToCart(p.id);
    closeModal();
  });

  modalEl.classList.add('open');
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalEl.classList.remove('open');
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
  const img = e.target.closest('.card .card-img');
  const title = e.target.closest('.card .card-title');
  if (img || title) {
    const card = (img || title).closest('.card');
    const btn = card.querySelector('.add-btn');
    if (btn) openProduct(+btn.dataset.id);
  }
});
