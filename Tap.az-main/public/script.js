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
  },

  async forgotPassword(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return await response.json();
    } catch (error) {
      return { success: false, message: 'Server bağlantı xətası.' };
    }
  },

  async resetPassword(email, code, newPassword) {
    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword })
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

// Yerli formatdan (0501234567) beynəlxalq WhatsApp formatına (994501234567) çevirir
function toWhatsAppNumber(phone) {
  if (!phone) return '';
  let digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('0')) digits = '994' + digits.slice(1);
  if (!digits.startsWith('994')) digits = '994' + digits;
  return digits;
}

function renderStars(rating) {
  const rounded = Math.round(rating || 0);
  return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
}

// XSS qorunması: istifadəçi-yaratdığı bütün mətnlər (başlıq, təsvir, telefon,
// istifadəçi adı, rəy şərhi və s.) innerHTML-ə yazılmazdan əvvəl escape olunmalıdır —
// əks halda başqa istifadəçinin elanına/rəyinə <script> və ya onerror= kimi
// zərərli kod yerləşdirməsi mümkün olardı (stored XSS).
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const listingsService = {
  async getListings(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.category) params.set('category', filters.category);
      if (filters.search) params.set('search', filters.search);
      const token = storage.getToken();
      const response = await fetch(`${ITEMS_API_URL}?${params.toString()}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const result = await response.json();
      if (!result.success) return { success: false, message: result.message || 'Elanlar yüklənə bilmədi.' };
      return { success: true, data: result.data.map(mapItemFromApi) };
    } catch (error) {
      return { success: false, message: 'Server bağlantı xətası.' };
    }
  },
  async getListingById(id) {
    try {
      const token = storage.getToken();
      const response = await fetch(`${ITEMS_API_URL}/${id}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
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
      if (!result.success) {
        return { success: false, message: result.message || 'Elan silinə bilmədi.' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, message: 'Server bağlantı xətası.' };
    }
  }
};

const REVIEWS_API_URL = '/api/reviews';

const reviewsService = {
  async getSellerReviews(sellerId) {
    try {
      const response = await fetch(`${REVIEWS_API_URL}/${sellerId}`);
      const result = await response.json();
      if (!result.success) return { success: false, message: result.message || 'Rəylər yüklənə bilmədi.' };
      return { success: true, data: result.data, averageRating: result.averageRating, reviewCount: result.reviewCount };
    } catch (error) {
      return { success: false, message: 'Server bağlantı xətası.' };
    }
  },
  async submitReview(sellerId, rating, comment) {
    try {
      const token = storage.getToken();
      const response = await fetch(`${REVIEWS_API_URL}/${sellerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ rating, comment })
      });
      const result = await response.json();
      if (!result.success) return { success: false, message: result.message || 'Rəy göndərilə bilmədi.' };
      return { success: true, data: result.data };
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
  getUserId: () => {
    const v = localStorage.getItem('user_id');
    return v ? Number(v) : null;
  },
  setUserId: (id) => localStorage.setItem('user_id', String(id)),
  getUsername: () => localStorage.getItem('username'),
  setUsername: (name) => localStorage.setItem('username', name),
  clear: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
  },
  getTheme: () => localStorage.getItem('theme') || 'light',
  setTheme: (theme) => localStorage.setItem('theme', theme)
};

const validators = {
  email: (str) => /^[^\s@]+@gmail\.com$/.test(str.toLowerCase()),
  password: (str) => str.length >= 6,
  username: (str) => str.trim().length >= 3,
  otp: (str) => /^\d{6}$/.test(str),
  phone: (str) => /^(\+?994|0)(10|50|51|55|60|70|77|99)\d{7}$/.test(str.replace(/[\s-]/g, ''))
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
    document.getElementById('forgot-password-form').onsubmit = this.handleForgotPassword.bind(this);
    document.getElementById('reset-password-form').onsubmit = this.handleResetPassword.bind(this);
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
      if (res.user) {
        storage.setUserId(res.user.id);
        storage.setUsername(res.user.username);
      }
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
  },

  async handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();

    if (!validators.email(email)) {
      document.getElementById('forgot-email-error').style.display = 'block';
      return;
    } else {
      document.getElementById('forgot-email-error').style.display = 'none';
    }

    const res = await authService.forgotPassword(email);
    if (res.success) {
      this.pendingEmail = email;
      ui.showToast('Əgər bu ünvanla hesab mövcuddursa, kod göndərildi.', 'info');
      router.navigate('reset-password');
    } else {
      ui.showToast(res.message || 'Xəta baş verdi.', 'danger');
    }
  },

  async handleResetPassword(e) {
    e.preventDefault();
    const code = document.getElementById('reset-code').value.trim();
    const newPassword = document.getElementById('reset-new-password').value;

    let valid = true;
    if (!validators.otp(code)) {
      document.getElementById('reset-code-error').style.display = 'block';
      valid = false;
    } else {
      document.getElementById('reset-code-error').style.display = 'none';
    }

    if (!validators.password(newPassword)) {
      document.getElementById('reset-new-password-error').style.display = 'block';
      valid = false;
    } else {
      document.getElementById('reset-new-password-error').style.display = 'none';
    }

    if (!valid) return;

    if (!this.pendingEmail) {
      ui.showToast('Zəhmət olmasa əvvəlcə e-poçt ünvanınızı daxil edin.', 'danger');
      router.navigate('forgot-password');
      return;
    }

    const res = await authService.resetPassword(this.pendingEmail, code, newPassword);
    if (res.success) {
      ui.showToast('Şifrəniz uğurla yeniləndi! İndi daxil ola bilərsiniz.', 'success');
      router.navigate('login');
    } else {
      ui.showToast(res.message || 'Xəta baş verdi.', 'danger');
    }
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
  statusMeta: {
    ACTIVE: { label: 'Aktiv', cls: 'status-active' },
    INACTIVE: { label: 'Deaktiv', cls: 'status-inactive' },
    SOLD: { label: 'Satılıb', cls: 'status-sold' },
    DRAFT: { label: 'Qaralama', cls: 'status-draft' }
  },
  createCardHtml(l, isOwner = false) {
    const mainImg = (l.images && l.images.length > 0) ? l.images[0] : 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&auto=format&fit=crop&q=60';
    const status = this.statusMeta[l.status] || this.statusMeta.ACTIVE;
    const deleteBtn = isOwner
      ? `<button class="listing-card-delete" title="Elanı sil" aria-label="Elanı sil" onclick="event.stopPropagation(); listingsController.deleteListing(${l.id})">✕</button>`
      : '';
    const verifiedTag = l.ownerVerified ? `<span class="verified-badge-sm" title="Yoxlanılmış istifadəçi">✓</span>` : '';
    const safeTitle = escapeHtml(l.title);
    return `
      <div class="listing-card" onclick="router.navigate('listing-detail', ${l.id})">
        <span class="status-badge listing-card-badge ${status.cls}">${status.label}</span>
        ${deleteBtn}
        <img class="listing-card-img" src="${mainImg}" alt="${safeTitle}" loading="lazy">
        <div class="listing-card-content">
          <div class="listing-card-price">${l.price} AZN</div>
          <div class="listing-card-title">${verifiedTag} ${safeTitle}</div>
          <div class="listing-card-meta">
            <span>👁 ${l.viewCount ?? 0}</span>
            <span>${escapeHtml(l.time)}</span>
          </div>
        </div>
      </div>
    `;
  },
  async deleteListing(id) {
    if (!confirm('Bu elanı silmək istədiyinizə əminsiniz?')) return;
    const res = await listingsService.deleteListing(id);
    if (res.success) {
      ui.showToast('Elan silindi.', 'success');
      if (router.currentView === 'profile') {
        profileController.loadUserListings(storage.getUserId());
      } else {
        this.loadListings(document.getElementById('search-input')?.value || '');
      }
    } else {
      ui.showToast(res.message || 'Elan silinə bilmədi.', 'danger');
    }
  },
  async loadDetail(id) {
    const container = document.getElementById('listing-detail-view');
    container.innerHTML = `<div class="state-container"><p>Yüklənir...</p></div>`;
    
    const res = await listingsService.getListingById(id);
    if (res.success) {
      const l = res.data;
      const images = l.images || [];
      
      const videos = l.videos || [];
      let galleryHtml = '';
      if (images.length > 0) {
        galleryHtml = `
          <div class="gallery-container">
            <img id="detail-main-view" class="main-detail-img" src="${images[0]}" alt="${l.title}" onclick="listingsController.openLightbox(this.src)">
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

      const videosHtml = videos.length > 0
        ? `<div class="video-preview-container" style="margin-top: var(--sp-md);">
            ${videos.map(v => `<video class="preview-video" src="${v}" controls style="width: 200px; height: 130px;"></video>`).join('')}
          </div>`
        : '';

      const status = this.statusMeta[l.status] || this.statusMeta.ACTIVE;
      const currentUserId = storage.getUserId();
      const isOwner = currentUserId !== null && l.ownerId === currentUserId;
      const deleteBtnHtml = isOwner
        ? `<button class="btn btn-primary" style="width:100%; background-color: var(--danger); margin-top: var(--sp-sm);" onclick="listingsController.deleteFromDetail(${l.id})">Elanı Sil</button>`
        : '';
      const verifiedBadge = l.ownerVerified
        ? `<span class="verified-badge" title="Yoxlanılmış istifadəçi">✓ Yoxlanılmış</span>`
        : '';
      const waNumber = toWhatsAppNumber(l.phone);
      const safeTitle = escapeHtml(l.title);
      const safeDescription = escapeHtml(l.description);
      const safePhone = escapeHtml(l.phone);
      const safeOwnerName = escapeHtml(l.ownerUsername || 'İstifadəçi');
      const waText = encodeURIComponent(`Salam, "${l.title}" elanınızla maraqlanıram.`);
      const isLoggedIn = !!storage.getToken();
      const phoneActionsHtml = l.phoneMasked
        ? `<p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:var(--sp-sm);">Tam nömrəni görmək üçün daxil olun.</p>
           <button class="btn btn-primary" style="width:100%;" onclick="router.navigate('login')">🔒 Daxil ol və göstər</button>`
        : `<a href="tel:${encodeURIComponent(l.phone || '')}" class="btn btn-primary" style="width:100%;">📞 Zəng Et</a>
           <a href="https://wa.me/${waNumber}?text=${waText}" target="_blank" rel="noopener" class="btn btn-whatsapp" style="width:100%; margin-top: var(--sp-sm);">WhatsApp ilə yaz</a>`;
      this.currentDetailItem = l;

      container.innerHTML = `
        <div class="detail-container">
          <div class="detail-gallery">
            ${galleryHtml}
            ${videosHtml}
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-top: var(--sp-md); gap: var(--sp-sm);">
              <h1 style="font-size: 1.5rem; font-weight: 700;">${safeTitle}</h1>
              <button class="btn btn-secondary" style="flex-shrink:0;" onclick="listingsController.shareListing()" aria-label="Paylaş">📤 Paylaş</button>
            </div>
            <p style="font-size:0.8rem; color:var(--text-muted);">👁 ${l.viewCount ?? 0} baxış</p>
            <p style="margin-top: var(--sp-md); white-space: pre-line;">${safeDescription}</p>
          </div>
          <div class="detail-info">
            <span class="status-badge ${status.cls}" style="width: fit-content;">${status.label}</span>
            <div class="detail-price">${l.price} AZN</div>
            <div style="font-size: 0.9rem; color: var(--text-muted);">
              <p>Kateqoriya: <strong>${escapeHtml(this.categories.find(c => c.id === l.category)?.label || l.category)}</strong></p>
              <p>Tarix: ${escapeHtml(l.time)}</p>
            </div>
            <hr style="border:0; border-top:1px solid var(--border-color)">
            <div>
              <p style="font-weight:600; font-size:0.875rem; color:var(--text-muted)">ELAN SAHİBİ</p>
              <p style="font-size:1.1rem; font-weight:700; margin-bottom:var(--sp-sm); display:flex; align-items:center; gap:6px;">${safeOwnerName} ${verifiedBadge}</p>
              <div id="seller-rating-summary" style="margin-bottom:var(--sp-sm); font-size:0.85rem; color:var(--text-muted);">Rəylər yüklənir...</div>
              <p style="font-weight:600; font-size:0.875rem; color:var(--text-muted)">TELEFON</p>
              <p style="font-size:1.1rem; font-weight:700; margin-bottom:var(--sp-sm);">${safePhone || '-'}</p>
              ${phoneActionsHtml}
              ${deleteBtnHtml}
            </div>
          </div>
        </div>
        <div class="reviews-section" id="reviews-section" data-seller-id="${l.ownerId}">
          <h2 style="font-size:1.2rem; font-weight:700; margin-bottom:var(--sp-md);">Satıcı Rəyləri</h2>
          <div id="reviews-list">Yüklənir...</div>
          ${!isOwner ? `
          <div class="review-form">
            <p style="font-weight:600; margin-bottom:var(--sp-xs);">Rəy yaz</p>
            <div class="star-input" id="review-star-input">
              ${[1,2,3,4,5].map(n => `<span class="star-choice" data-value="${n}" onclick="listingsController.setReviewRating(${n})">☆</span>`).join('')}
            </div>
            <textarea id="review-comment" class="form-control" rows="2" placeholder="Rəyiniz (istəyə bağlı)" style="margin-top:var(--sp-sm);"></textarea>
            <button class="btn btn-primary" style="margin-top:var(--sp-sm);" onclick="listingsController.submitReview(${l.ownerId})">Göndər</button>
          </div>` : ''}
        </div>
      `;
      this.selectedReviewRating = 0;
      this.loadSellerReviews(l.ownerId);
    } else {
      container.innerHTML = `
        <div class="state-container">
          <p class="state-title">Elan tapılmadı.</p>
          <button class="btn btn-primary" onclick="router.navigate('listings')">Geri qayıt</button>
        </div>
      `;
    }
  },
  shareListing() {
    const item = this.currentDetailItem;
    if (!item) return;
    const url = `${window.location.origin}${window.location.pathname}#listing-${item.id}`;
    if (navigator.share) {
      navigator.share({ title: item.title, text: `Bax: ${item.title}`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        ui.showToast('Link kopyalandı!', 'success');
      }).catch(() => {
        ui.showToast(url, 'info');
      });
    }
  },
  selectedReviewRating: 0,
  setReviewRating(n) {
    this.selectedReviewRating = n;
    document.querySelectorAll('#review-star-input .star-choice').forEach((el, idx) => {
      el.textContent = idx < n ? '★' : '☆';
    });
  },
  async loadSellerReviews(sellerId) {
    const listEl = document.getElementById('reviews-list');
    const summaryEl = document.getElementById('seller-rating-summary');
    const res = await reviewsService.getSellerReviews(sellerId);
    if (!res.success) {
      if (listEl) listEl.innerHTML = '<p style="color:var(--text-muted);">Rəylər yüklənə bilmədi.</p>';
      if (summaryEl) summaryEl.innerHTML = '';
      return;
    }
    if (summaryEl) {
      summaryEl.innerHTML = res.reviewCount > 0
        ? `<span style="color:#f5a623;">${renderStars(res.averageRating)}</span> ${res.averageRating} (${res.reviewCount} rəy)`
        : 'Hələ rəy yoxdur';
    }
    if (listEl) {
      listEl.innerHTML = res.data.length > 0
        ? res.data.map(r => `
            <div class="review-item">
              <div style="display:flex; justify-content:space-between;">
                <strong>${escapeHtml(r.reviewerUsername)}</strong>
                <span style="color:#f5a623;">${renderStars(r.rating)}</span>
              </div>
              ${r.comment ? `<p style="margin-top:4px; font-size:0.9rem;">${escapeHtml(r.comment)}</p>` : ''}
            </div>
          `).join('')
        : '<p style="color:var(--text-muted);">Hələ rəy yoxdur. İlk rəyi siz yazın!</p>';
    }
  },
  async submitReview(sellerId) {
    if (!storage.getToken()) {
      ui.showToast('Rəy yazmaq üçün daxil olun.', 'danger');
      return;
    }
    if (!this.selectedReviewRating) {
      ui.showToast('Zəhmət olmasa xal seçin.', 'danger');
      return;
    }
    const comment = document.getElementById('review-comment').value.trim();
    const res = await reviewsService.submitReview(sellerId, this.selectedReviewRating, comment);
    if (res.success) {
      ui.showToast('Rəyiniz əlavə olundu!', 'success');
      document.getElementById('review-comment').value = '';
      this.selectedReviewRating = 0;
      document.querySelectorAll('#review-star-input .star-choice').forEach(el => el.textContent = '☆');
      this.loadSellerReviews(sellerId);
    } else {
      ui.showToast(res.message || 'Rəy göndərilə bilmədi.', 'danger');
    }
  },
  async deleteFromDetail(id) {
    if (!confirm('Bu elanı silmək istədiyinizə əminsiniz?')) return;
    const res = await listingsService.deleteListing(id);
    if (res.success) {
      ui.showToast('Elan silindi.', 'success');
      router.navigate('listings');
    } else {
      ui.showToast(res.message || 'Elan silinə bilmədi.', 'danger');
    }
  },
  openLightbox(src) {
    document.getElementById('lightbox-img').src = src;
    document.getElementById('image-lightbox').classList.add('active');
  },
  closeLightbox(e) {
    if (e) e.stopPropagation();
    document.getElementById('image-lightbox').classList.remove('active');
    document.getElementById('lightbox-img').src = '';
  },
  switchDetailImage(thumb, src) {
    document.getElementById('detail-main-view').src = src;
    document.querySelectorAll('.thumb-img').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
  }
};

const profileController = {
  init() {
    const userEmail = storage.getUserEmail();
    const userId = storage.getUserId();
    if (userEmail) {
      document.getElementById('profile-email').innerText = userEmail;
      document.getElementById('profile-avatar').innerText = userEmail.substring(0, 2).toUpperCase();
      this.loadUserListings(userId);
    }
  },
  async loadUserListings(userId) {
    const grid = document.getElementById('user-listings-grid');
    ui.renderSkeletonGrid(grid);
    
    const res = await listingsService.getListings();
    const userItems = (res.data || []).filter(item => item.ownerId === userId);
    
    if (userItems.length > 0) {
      grid.innerHTML = userItems.map(l => listingsController.createCardHtml(l, true)).join('');
    } else {
      grid.innerHTML = `
        <div class="state-container" style="grid-column: 1/-1;">
          <p class="state-title">Hələ heç bir elan yerləşdirməmisiniz.</p>
          <button class="btn btn-primary" onclick="router.navigate('post-listing')">İlk elanını yerləşdir</button>
        </div>
      `;
    }
  }
};

const postController = {
  selectedImagesBase64: [],
  selectedVideosBase64: [],
  MAX_VIDEOS: 3,
  init() {
    const form = document.getElementById('post-form');
    if(form) form.onsubmit = this.handleSubmit.bind(this);
    
    const imageInput = document.getElementById('post-images');
    if(imageInput) imageInput.onchange = this.handleImageSelection.bind(this);

    const videoInput = document.getElementById('post-videos');
    if(videoInput) videoInput.onchange = this.handleVideoSelection.bind(this);
  },
  async handleImageSelection(e) {
    const files = Array.from(e.target.files);
    const previewContainer = document.getElementById('image-preview-container');
    const errorEl = document.getElementById('post-images-error');
    
    this.selectedImagesBase64 = [];
    previewContainer.innerHTML = '';
    errorEl.style.display = 'none';

    if (files.length > 20) {
      errorEl.innerText = "Maksimum 20 şəkil seçə bilərsiniz.";
      errorEl.style.display = 'block';
      previewContainer.style.display = 'none';
      e.target.value = ''; 
      return;
    }

    if (files.length > 0) {
      previewContainer.style.display = 'flex';
    } else {
      previewContainer.style.display = 'none';
    }

    for (const file of files) {
      const base64 = await this.fileToBase64(file);
      this.selectedImagesBase64.push(base64);
      
      const img = document.createElement('img');
      img.src = base64;
      img.className = 'preview-img';
      previewContainer.appendChild(img);
    }
  },
  async handleVideoSelection(e) {
    const files = Array.from(e.target.files);
    const previewContainer = document.getElementById('video-preview-container');
    const errorEl = document.getElementById('post-videos-error');

    this.selectedVideosBase64 = [];
    previewContainer.innerHTML = '';
    errorEl.style.display = 'none';

    if (files.length > this.MAX_VIDEOS) {
      errorEl.innerText = `Maksimum ${this.MAX_VIDEOS} video seçə bilərsiniz.`;
      errorEl.style.display = 'block';
      previewContainer.style.display = 'none';
      e.target.value = '';
      return;
    }

    previewContainer.style.display = files.length > 0 ? 'flex' : 'none';

    for (const file of files) {
      const base64 = await this.fileToBase64(file);
      this.selectedVideosBase64.push(base64);

      const video = document.createElement('video');
      video.src = base64;
      video.className = 'preview-video';
      video.controls = true;
      previewContainer.appendChild(video);
    }
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
    if (!validators.phone(phone)) {
      document.getElementById('post-phone').nextElementSibling.style.display = 'block';
      valid = false;
    }

    if (!valid) return;

    const res = await listingsService.createListing({ 
      title, 
      category, 
      price, 
      description, 
      phone, 
      images: this.selectedImagesBase64,
      videos: this.selectedVideosBase64
    });

    if (res.success) {
      ui.showToast('Elanınız uğurla yerləşdirildi!', 'success');
      document.getElementById('post-form').reset();
      const previewContainer = document.getElementById('image-preview-container');
      previewContainer.innerHTML = '';
      previewContainer.style.display = 'none';
      this.selectedImagesBase64 = [];
      const videoPreviewContainer = document.getElementById('video-preview-container');
      videoPreviewContainer.innerHTML = '';
      videoPreviewContainer.style.display = 'none';
      this.selectedVideosBase64 = [];
      router.navigate('listings');
    } else {
      ui.showToast(res.message || 'Elan yerləşdirilə bilmədi.', 'danger');
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
