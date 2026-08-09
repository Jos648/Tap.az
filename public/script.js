// ============================================================
// 1. DATA & API LAYER
// ============================================================
const API_BASE_URL = '/api/auth'; // Frontend backend ilə eyni serverdən (eyni origin) servis olunur
const ITEMS_API_URL = '/api/items';

const authService = {
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return await response.json();
    } catch (error) {
      return { success: false, message: 'Server bağlantı xətası.' };
    }
  },

  async register(username, email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      return await response.json();
    } catch (error) {
      return { success: false, message: 'Server bağlantı xətası.' };
    }
  },

  async verifyOTP(email, code) {
    try {
      const response = await fetch(`${API_BASE_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      return await response.json();
    } catch (error) {
      return { success: false, message: 'Server bağlantı xətası.' };
    }
  }
};

// Backend-dən gələn elanı frontend-in gözlədiyi görünüş formatına çevirir
// (əsasən `createdAt`-dan insan-oxunaqlı `time` sahəsi yaradır).
function mapItemFromApi(item) {
  return { ...item, time: formatRelativeTime(item.createdAt) };
}

function formatRelativeTime(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'İndi';
  if (diffMin < 60) return `${diffMin} dəq əvvəl`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} saat əvvəl`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} gün əvvəl`;
  return new Date(iso).toLocaleDateString('az-AZ');
}

const listingsService = {
  async getListings(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.category) params.set('category', filters.category);
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      const response = await fetch(`${ITEMS_API_URL}?${params.toString()}`);
      const result = await response.json();
      if (!result.success) return { success: false, message: result.message || 'Elanlar yüklənə bilmədi.' };
      return { success: true, data: result.data.map(mapItemFromApi) };
    } catch (error) {
      return { success: false, message: 'Server bağlantı xətası.' };
    }
  },
  async getListingById(id) {
    try {
      const response = await fetch(`${ITEMS_API_URL}/${id}`);
      const result = await response.json();
      if (!result.success) return { success: false, message: result.message || 'Elan tapılmadı.' };
      return { success: true, data: mapItemFromApi(result.data) };
    } catch (error) {
      return { success: false, message: 'Server bağlantı xətası.' };
    }
  },
  async createListing(data) {
    try {
      const token = storage.getToken();
      const response = await fetch(ITEMS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!result.success) {
        const detail = Array.isArray(result.errors) ? result.errors.map(e => e.message).join(' ') : '';
        return { success: false, message: detail || result.message || 'Elan yerləşdirilə bilmədi.' };
      }
      return { success: true, data: mapItemFromApi(result.data) };
    } catch (error) {
      return { success: false, message: 'Server bağlantı xətası.' };
    }
  },
  async deleteListing(id) {
    try {
      const token = storage.getToken();
      const response = await fetch(`${ITEMS_API_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const result = await response.json();
      if (!result.success) return { success: false, message: result.message || 'Elan silinə bilmədi.' };
      return { success: true };
    } catch (error) {
      return { success: false, message: 'Server bağlantı xətası.' };
    }
  },
  async updateListing(id, data) {
    try {
      const token = storage.getToken();
      const response = await fetch(`${ITEMS_API_URL}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!result.success) {
        const detail = Array.isArray(result.errors) ? result.errors.map(e => e.message).join(' ') : '';
        return { success: false, message: detail || result.message || 'Elan yenilənə bilmədi.' };
      }
      return { success: true, data: mapItemFromApi(result.data) };
    } catch (error) {
      return { success: false, message: 'Server bağlantı xətası.' };
    }
  }
};

// ============================================================
// 2. UTILS & STORAGE
// ============================================================
const storage = {
  getToken: () => localStorage.getItem('auth_token'),
  setToken: (token) => localStorage.setItem('auth_token', token),
  getUserEmail: () => localStorage.getItem('user_email'),
  setUserEmail: (email) => localStorage.setItem('user_email', email),
  clear: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
  },
  getTheme: () => localStorage.getItem('theme') || 'light',
  setTheme: (theme) => localStorage.setItem('theme', theme),
  getFavorites: () => {
    try {
      return JSON.parse(localStorage.getItem('favorites') || '[]');
    } catch (e) {
      return [];
    }
  },
  isFavorite: (id) => storage.getFavorites().includes(Number(id)),
  toggleFavorite: (id) => {
    id = Number(id);
    const favs = storage.getFavorites();
    const idx = favs.indexOf(id);
    if (idx >= 0) {
      favs.splice(idx, 1);
    } else {
      favs.push(id);
    }
    localStorage.setItem('favorites', JSON.stringify(favs));
    return favs.includes(id);
  }
};

const validators = {
  email: (str) => /^[^\s@]+@gmail\.com$/.test(str.toLowerCase()),
  password: (str) => str.length >= 6,
  username: (str) => str.trim().length >= 3,
  otp: (str) => /^\d{6}$/.test(str)
};

// ============================================================
// 3. VIEW ROUTER
// ============================================================
const router = {
  currentView: null,
  navigate(viewName, params = null) {
    document.querySelectorAll('section[data-view]').forEach(s => s.classList.remove('active'));
    const targetSection = document.querySelector(`section[data-view="${viewName}"]`);
    
    if (targetSection) {
      targetSection.classList.add('active');
      this.currentView = viewName;
      window.scrollTo(0, 0);
      
      if (viewName === 'listings') listingsController.init();
      if (viewName === 'profile') profileController.init();
      if (viewName === 'listing-detail' && params) listingsController.loadDetail(params);
      if (viewName === 'favorites') favoritesController.init();
      if (viewName === 'post-listing') postController.enter(params);
      
      const token = storage.getToken();
      document.getElementById('main-nav').style.display = token ? 'flex' : 'none';
    }
  }
};

// ============================================================
// 4. COMPONENT LOGIC & UI UTILS
// ============================================================
const ui = {
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const element = document.createElement('div');
    element.className = `toast toast-${type}`;
    element.innerText = message;
    container.appendChild(element);
    setTimeout(() => element.remove(), 3000);
  },
  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    storage.setTheme(next);
    document.getElementById('theme-toggle').innerText = next === 'dark' ? 'Açıq Rejim' : 'Tünd Rejim';
  },
  initTheme() {
    const activeTheme = storage.getTheme();
    document.documentElement.setAttribute('data-theme', activeTheme);
    document.getElementById('theme-toggle').innerText = activeTheme === 'dark' ? 'Açıq Rejim' : 'Tünd Rejim';
  },
  renderSkeletonGrid(targetEl) {
    targetEl.innerHTML = Array(3).fill(0).map(() => `
      <div class="listing-card">
        <div class="listing-card-img skeleton"></div>
        <div class="listing-card-content">
          <div class="skeleton skeleton-text" style="width: 50%;"></div>
          <div class="skeleton skeleton-text" style="width: 80%;"></div>
          <div class="skeleton skeleton-text" style="width: 30%;"></div>
        </div>
      </div>
    `).join('');
  }
};

// ============================================================
// 5. VIEW CONTROLLERS (AUTH INTEGRATION)
// ============================================================
const authController = {
  pendingEmail: '',
  cooldownTimer: null,

  init() {
    document.getElementById('login-form').onsubmit = this.handleLogin.bind(this);
    document.getElementById('register-form').onsubmit = this.handleRegister.bind(this);
    document.getElementById('otp-form').onsubmit = this.handleOTPVerify.bind(this);
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    
    let valid = true;
    if (!validators.email(email)) {
      document.getElementById('login-email-error').style.display = 'block';
      valid = false;
    } else {
      document.getElementById('login-email-error').style.display = 'none';
    }

    if (!pass) {
      document.getElementById('login-password-error').style.display = 'block';
      valid = false;
    } else {
      document.getElementById('login-password-error').style.display = 'none';
    }

    if (!valid) return;

    const res = await authService.login(email, pass);
    if (res.success) {
      storage.setToken(res.token);
      storage.setUserEmail(email);
      ui.showToast('Uğurla daxil oldunuz!', 'success');
      router.navigate('listings');
    } else {
      ui.showToast(res.message || 'Giriş uğursuz oldu.', 'danger');
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const pass = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;

    let valid = true;
    if (!validators.username(username)) {
      document.getElementById('register-username-error').style.display = 'block';
      valid = false;
    } else {
      document.getElementById('register-username-error').style.display = 'none';
    }

    if (!validators.email(email)) {
      document.getElementById('register-email-error').style.display = 'block';
      valid = false;
    } else {
      document.getElementById('register-email-error').style.display = 'none';
    }

    if (!validators.password(pass)) {
      document.getElementById('register-password-error').style.display = 'block';
      valid = false;
    } else {
      document.getElementById('register-password-error').style.display = 'none';
    }

    if (pass !== confirm) {
      document.getElementById('register-confirm-error').style.display = 'block';
      valid = false;
    } else {
      document.getElementById('register-confirm-error').style.display = 'none';
    }

    if (!valid) return;

    const res = await authService.register(username, email, pass);
    if (res.success) {
      this.pendingEmail = email;
      ui.showToast('Təsdiq kodu Gmail ünvanınıza göndərildi.', 'info');
      router.navigate('otp-verify');
      this.startCooldown();
    } else {
      ui.showToast(res.message || 'Qeydiyyat xətası.', 'danger');
    }
  },

  async handleOTPVerify(e) {
    e.preventDefault();
    const code = document.getElementById('otp-code').value.trim();

    if (!validators.otp(code)) {
      document.getElementById('otp-code-error').style.display = 'block';
      return;
    } else {
      document.getElementById('otp-code-error').style.display = 'none';
    }

    const res = await authService.verifyOTP(this.pendingEmail, code);
    if (res.success) {
      ui.showToast('Hesabınız uğurla aktivləşdirildi! İndi daxil ola bilərsiniz.', 'success');
      router.navigate('login');
    } else {
      ui.showToast(res.message || 'Kod yanlışdır və ya vaxtı bitib.', 'danger');
    }
  },

  startCooldown() {
    let timeLeft = 30;
    const btn = document.getElementById('otp-resend-btn');
    const span = document.getElementById('otp-cooldown');
    btn.disabled = true;

    clearInterval(this.cooldownTimer);
    this.cooldownTimer = setInterval(() => {
      timeLeft--;
      span.innerText = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(this.cooldownTimer);
        btn.disabled = false;
        btn.innerHTML = "Yenidən göndər";
      }
    }, 1000);
  },

  async resendOTP() {
    if (!this.pendingEmail) return;
    const response = await fetch(`${API_BASE_URL}/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.pendingEmail })
    });
    const res = await response.json();
    if (res.success) {
      ui.showToast('Yeni kod göndərildi.', 'success');
      this.startCooldown();
    } else {
      ui.showToast(res.message, 'danger');
    }
  },

  logout() {
    storage.clear();
    ui.showToast('Çıxış edildi.');
    router.navigate('login');
  }
};

// ============================================================
// 6. LISTINGS & PROFILE CONTROLLERS
// ============================================================
const listingsController = {
  categories: [
    { id: '', label: 'Hamısı' },
    { id: 'brawl-stars', label: 'Brawl Stars' },
    { id: 'pubg', label: 'PUBG Mobile' },
    { id: 'free-fire', label: 'Free Fire' },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'efootball', label: 'eFootball' },
    { id: 'elim-yandi', label: 'Əlim Yandı' }
  ],
  currentCategory: '',
  searchDebounceTimer: null,

  init() {
    this.renderCategories();
    this.loadListings();
    
    const searchInput = document.getElementById('search-input');
    searchInput.oninput = () => {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.loadListings(searchInput.value);
      }, 300);
    };
  },
  renderCategories() {
    const container = document.getElementById('category-container');
    container.innerHTML = this.categories.map(c => `
      <button class="category-chip ${this.currentCategory === c.id ? 'active' : ''}" 
              onclick="listingsController.selectCategory('${c.id}')">${c.label}</button>
    `).join('');
  },
  selectCategory(id) {
    this.currentCategory = id;
    this.renderCategories();
    this.loadListings(document.getElementById('search-input').value);
  },
  async loadListings(search = '') {
    const grid = document.getElementById('listings-grid');
    ui.renderSkeletonGrid(grid);
    
    const res = await listingsService.getListings({ category: this.currentCategory, search });
    if (res.success && res.data.length > 0) {
      grid.innerHTML = res.data.map(l => this.createCardHtml(l)).join('');
    } else {
      grid.innerHTML = `
        <div class="state-container" style="grid-column: 1/-1;">
          <p class="state-title">Heç bir elan tapılmadı</p>
          <button class="btn btn-primary" onclick="router.navigate('post-listing')">İlk elanı yerləşdir</button>
        </div>
      `;
    }
  },
  createCardHtml(l) {
    const mainImg = (l.images && l.images.length > 0) ? l.images[0] : 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&auto=format&fit=crop&q=60';
    const isFav = storage.isFavorite(l.id);
    const isSold = l.status === 'SOLD';
    return `
      <div class="listing-card ${isSold ? 'is-sold' : ''}" onclick="router.navigate('listing-detail', ${l.id})">
        <button class="fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); listingsController.toggleFavorite(${l.id}, this)" aria-label="Favoritə əlavə et">${isFav ? '❤️' : '🤍'}</button>
        ${isSold ? '<span class="sold-badge">SATILDI</span>' : ''}
        <img class="listing-card-img" src="${mainImg}" alt="${l.title}" loading="lazy">
        <div class="listing-card-content">
          <div class="listing-card-price">${l.price} AZN</div>
          <div class="listing-card-title">${l.title}</div>
          <div class="listing-card-meta">
            <span>${l.time}</span>
          </div>
        </div>
      </div>
    `;
  },
  toggleFavorite(id, btnEl) {
    const nowFav = storage.toggleFavorite(id);
    btnEl.classList.toggle('active', nowFav);
    btnEl.innerText = nowFav ? '❤️' : '🤍';
    if (router.currentView === 'favorites') favoritesController.init();
  },
  async loadDetail(id) {
    const container = document.getElementById('listing-detail-view');
    container.innerHTML = `<div class="state-container"><p>Yüklənir...</p></div>`;
    
    const res = await listingsService.getListingById(id);
    if (res.success) {
      const l = res.data;
      const images = l.images || [];
      const currentEmail = storage.getUserEmail();
      const isOwner = !!currentEmail && l.owner === currentEmail;
      const cleanPhone = (l.phone || '').replace(/[^\d+]/g, '');
      
      let galleryHtml = '';
      if (images.length > 0) {
        galleryHtml = `
          <div class="gallery-container">
            <img id="detail-main-view" class="main-detail-img" src="${images[0]}" alt="${l.title}">
            <div class="thumbnail-scroll">
              ${images.map((img, idx) => `
                <img class="thumb-img ${idx === 0 ? 'active' : ''}" src="${img}" onclick="listingsController.switchDetailImage(this, '${img}')" alt="">
              `).join('')}
            </div>
          </div>
        `;
      } else {
        galleryHtml = `<img class="main-detail-img" src="https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&auto=format&fit=crop&q=60" alt="">`;
      }

      container.innerHTML = `
        <div class="detail-container">
          <div class="detail-gallery">
            ${galleryHtml}
            <h1 style="font-size: 1.5rem; font-weight: 700; margin-top: var(--sp-md);">${l.title}</h1>
            <p style="margin-top: var(--sp-md); white-space: pre-line;">${l.description}</p>
          </div>
          <div class="detail-info">
            <div class="detail-price">${l.price} AZN</div>
            <div style="font-size: 0.9rem; color: var(--text-muted);">
              <p>Kateqoriya: <strong>${this.categories.find(c => c.id === l.category)?.label || l.category}</strong></p>
              <p>Tarix: ${l.time}</p>
            </div>
            <hr style="border:0; border-top:1px solid var(--border-color)">
            <div>
              <p style="font-weight:600; font-size:0.875rem; color:var(--text-muted)">ELAN SAHİBİ</p>
              <p style="font-size:1.1rem; font-weight:700; margin-bottom:var(--sp-sm);">${l.owner}</p>
              <a href="tel:${cleanPhone}" class="btn btn-primary" style="width:100%; margin-bottom:var(--sp-sm);">📞 Zəng Et (${l.phone})</a>
              <a href="https://wa.me/${cleanPhone.replace('+', '')}" target="_blank" rel="noopener" class="btn btn-secondary" style="width:100%;">💬 WhatsApp</a>
            </div>
            ${isOwner ? `
            <div style="margin-top:var(--sp-md); display:flex; flex-direction:column; gap:var(--sp-sm);">
              <button class="btn btn-secondary" style="width:100%;" onclick="router.navigate('post-listing', ${l.id})">✏️ Redaktə Et</button>
              ${l.status !== 'SOLD' ? `<button class="btn btn-secondary" style="width:100%;" onclick="listingsController.markSold(${l.id})">✅ Satıldı olaraq işarələ</button>` : `<p style="text-align:center; font-weight:700; color:var(--danger);">Bu elan satılıb</p>`}
              <button class="btn btn-primary" style="width:100%; background-color:var(--danger);" onclick="listingsController.deleteListing(${l.id})">🗑️ Elanı Sil</button>
            </div>` : ''}
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="state-container">
          <p class="state-title">Elan tapılmadı.</p>
          <button class="btn btn-primary" onclick="router.navigate('listings')">Geri qayıt</button>
        </div>
      `;
    }
  },
  switchDetailImage(thumb, src) {
    document.getElementById('detail-main-view').src = src;
    document.querySelectorAll('.thumb-img').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
  },
  async deleteListing(id) {
    if (!confirm('Bu elanı silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.')) return;

    const res = await listingsService.deleteListing(id);
    if (res.success) {
      ui.showToast('Elan silindi.', 'success');
      router.navigate('listings');
    } else {
      ui.showToast(res.message || 'Elan silinə bilmədi.', 'danger');
    }
  },
  async markSold(id) {
    if (!confirm('Bu elanı satılmış olaraq işarələmək istəyirsiniz? Elan artıq ümumi siyahıda görünməyəcək.')) return;
    const res = await listingsService.updateListing(id, { status: 'SOLD' });
    if (res.success) {
      ui.showToast('Elan satılmış olaraq işarələndi.', 'success');
      this.loadDetail(id);
    } else {
      ui.showToast(res.message || 'Əməliyyat uğursuz oldu.', 'danger');
    }
  }
};

const profileController = {
  init() {
    const userEmail = storage.getUserEmail();
    if (userEmail) {
      document.getElementById('profile-email').innerText = userEmail;
      document.getElementById('profile-avatar').innerText = userEmail.substring(0, 2).toUpperCase();
      this.loadUserListings(userEmail);
    }
  },
  async loadUserListings(email) {
    const grid = document.getElementById('user-listings-grid');
    ui.renderSkeletonGrid(grid);
    
    const res = await listingsService.getListings({ status: 'ALL' });
    const userItems = res.data.filter(item => item.owner === email);
    
    if (userItems.length > 0) {
      grid.innerHTML = userItems.map(l => `
        <div style="position:relative;">
          ${listingsController.createCardHtml(l)}
          <button class="btn btn-secondary" style="position:absolute; top:8px; right:8px; padding:4px 8px; background-color:var(--danger); color:#fff;" onclick="event.stopPropagation(); profileController.deleteOwn(${l.id})" aria-label="Elanı sil">🗑️</button>
        </div>
      `).join('');
    } else {
      grid.innerHTML = `
        <div class="state-container" style="grid-column: 1/-1;">
          <p class="state-title">Hələ heç bir elan yerləşdirməmisiniz.</p>
          <button class="btn btn-primary" onclick="router.navigate('post-listing')">İlk elanını yerləşdir</button>
        </div>
      `;
    }
  },
  async deleteOwn(id) {
    if (!confirm('Bu elanı silmək istədiyinizə əminsiniz?')) return;
    const res = await listingsService.deleteListing(id);
    if (res.success) {
      ui.showToast('Elan silindi.', 'success');
      this.loadUserListings(storage.getUserEmail());
    } else {
      ui.showToast(res.message || 'Elan silinə bilmədi.', 'danger');
    }
  }
};

const favoritesController = {
  async init() {
    const grid = document.getElementById('favorites-grid');
    ui.renderSkeletonGrid(grid);

    const favIds = storage.getFavorites();
    if (favIds.length === 0) {
      grid.innerHTML = `
        <div class="state-container" style="grid-column: 1/-1;">
          <p class="state-title">Hələ heç bir elanı favoritə əlavə etməmisiniz.</p>
          <button class="btn btn-primary" onclick="router.navigate('listings')">Elanlara bax</button>
        </div>
      `;
      return;
    }

    const res = await listingsService.getListings({ status: 'ALL' });
    if (res.success) {
      const favItems = res.data.filter(item => favIds.includes(item.id));
      grid.innerHTML = favItems.length > 0
        ? favItems.map(l => listingsController.createCardHtml(l)).join('')
        : `
          <div class="state-container" style="grid-column: 1/-1;">
            <p class="state-title">Favorit elanlar tapılmadı.</p>
          </div>
        `;
    } else {
      grid.innerHTML = `<div class="state-container" style="grid-column: 1/-1;"><p class="state-title">Yüklənə bilmədi.</p></div>`;
    }
  }
};

const postController = {
  selectedImagesBase64: [],
  editingId: null,
  init() {
    const form = document.getElementById('post-form');
    if(form) form.onsubmit = this.handleSubmit.bind(this);
    
    const imageInput = document.getElementById('post-images');
    if(imageInput) imageInput.onchange = this.handleImageSelection.bind(this);
  },
  async enter(id) {
    const form = document.getElementById('post-form');
    if (form) form.querySelectorAll('.form-error').forEach(err => err.style.display = 'none');

    if (id) {
      this.editingId = id;
      document.getElementById('post-listing-title').innerText = 'Elanı Redaktə Et';
      document.getElementById('post-submit-btn').innerText = 'Yenilə';

      const res = await listingsService.getListingById(id);
      if (!res.success) {
        ui.showToast('Elan tapılmadı.', 'danger');
        router.navigate('listings');
        return;
      }
      const l = res.data;
      document.getElementById('post-title').value = l.title || '';
      document.getElementById('post-category').value = l.category || '';
      document.getElementById('post-price').value = l.price || '';
      document.getElementById('post-description').value = l.description || '';
      document.getElementById('post-phone').value = l.phone || '';
      this.selectedImagesBase64 = [...(l.images || [])];
      this.renderPreviews();
    } else {
      this.editingId = null;
      document.getElementById('post-listing-title').innerText = 'Yeni Elan Yerləşdir';
      document.getElementById('post-submit-btn').innerText = 'Dərc et';
      if (form) form.reset();
      this.selectedImagesBase64 = [];
      this.renderPreviews();
    }
  },
  renderPreviews() {
    const previewContainer = document.getElementById('image-preview-container');
    if (this.selectedImagesBase64.length > 0) {
      previewContainer.style.display = 'flex';
      previewContainer.innerHTML = this.selectedImagesBase64.map((src, idx) => `
        <div class="preview-img-wrap">
          <img src="${src}" class="preview-img">
          <button type="button" class="preview-img-remove" onclick="postController.removeImage(${idx})" aria-label="Şəkli sil">×</button>
        </div>
      `).join('');
    } else {
      previewContainer.style.display = 'none';
      previewContainer.innerHTML = '';
    }
  },
  removeImage(idx) {
    this.selectedImagesBase64.splice(idx, 1);
    this.renderPreviews();
  },
  async handleImageSelection(e) {
    const files = Array.from(e.target.files);
    const errorEl = document.getElementById('post-images-error');
    errorEl.style.display = 'none';

    if (this.selectedImagesBase64.length + files.length > 20) {
      errorEl.innerText = "Maksimum 20 şəkil seçə bilərsiniz.";
      errorEl.style.display = 'block';
      e.target.value = '';
      return;
    }

    for (const file of files) {
      const base64 = await this.fileToBase64(file);
      this.selectedImagesBase64.push(base64);
    }
    e.target.value = '';
    this.renderPreviews();
  },
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  },
  async handleSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('post-title').value.trim();
    const category = document.getElementById('post-category').value;
    const price = parseFloat(document.getElementById('post-price').value);
    const description = document.getElementById('post-description').value.trim();
    const phone = document.getElementById('post-phone').value.trim();
    const errorImg = document.getElementById('post-images-error');

    let valid = true;
    document.querySelectorAll('#post-form .form-error').forEach(err => err.style.display = 'none');

    if (title.length < 5) {
      document.getElementById('post-title').nextElementSibling.style.display = 'block';
      valid = false;
    }
    if (!category) {
      document.getElementById('post-category').nextElementSibling.style.display = 'block';
      valid = false;
    }
    if (!price || price <= 0) {
      document.getElementById('post-price').nextElementSibling.style.display = 'block';
      valid = false;
    }
    
    if (this.selectedImagesBase64.length < 3) {
      errorImg.innerText = "Zehmet Olmasa En az 3 şekil atın";
      errorImg.style.display = 'block';
      valid = false;
    } else if (this.selectedImagesBase64.length > 20) {
      errorImg.innerText = "Maksimum 20 şəkil seçə bilərsiniz.";
      errorImg.style.display = 'block';
      valid = false;
    }

    if (description.length < 20) {
      document.getElementById('post-description').nextElementSibling.style.display = 'block';
      valid = false;
    }
    const azPhoneRegex = /^(\+?994|0)(10|50|51|55|60|70|77|99)\d{7}$/;
    if (!azPhoneRegex.test(phone.replace(/[\s()-]/g, ''))) {
      document.getElementById('post-phone').nextElementSibling.style.display = 'block';
      valid = false;
    }

    if (!valid) return;

    const payload = {
      title, 
      category, 
      price, 
      description, 
      phone, 
      images: this.selectedImagesBase64 
    };

    const res = this.editingId
      ? await listingsService.updateListing(this.editingId, payload)
      : await listingsService.createListing(payload);

    if (res.success) {
      ui.showToast(this.editingId ? 'Elan yeniləndi!' : 'Elanınız uğurla yerləşdirildi!', 'success');
      const wasEditing = this.editingId;
      document.getElementById('post-form').reset();
      this.selectedImagesBase64 = [];
      this.renderPreviews();
      this.editingId = null;
      router.navigate(wasEditing ? 'listing-detail' : 'listings', wasEditing ? res.data.id : null);
    } else {
      ui.showToast(res.message || (this.editingId ? 'Elan yenilənə bilmədi.' : 'Elan yerləşdirilə bilmədi.'), 'danger');
    }
  }
};

window.addEventListener('DOMContentLoaded', () => {
  ui.initTheme();
  authController.init();
  postController.init();
  
  if (storage.getToken()) {
    router.navigate('listings');
  } else {
    router.navigate('login');
  }
});
