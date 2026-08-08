// ============================================================
// 1. DATA & API LAYER
// ============================================================
const API_BASE_URL = '/api/auth'; // Frontend backend ilə eyni serverdən (eyni origin) servis olunur

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

const listingsService = {
  _listings: [],
  async getListings(filters = {}) {
    await new Promise(r => setTimeout(r, 300));
    let list = [...this._listings];
    if (filters.category) list = list.filter(item => item.category === filters.category);
    if (filters.search) list = list.filter(item => item.title.toLowerCase().includes(filters.search.toLowerCase()));
    return { success: true, data: list };
  },
  async getListingById(id) {
    await new Promise(r => setTimeout(r, 200));
    const item = this._listings.find(l => l.id === parseInt(id));
    return item ? { success: true, data: item } : { success: false, message: 'Elan tapılmadı.' };
  },
  async createListing(data) {
    await new Promise(r => setTimeout(r, 400));
    const newId = this._listings.length + 1;
    const newItem = { 
      id: newId, 
      ...data, 
      time: 'İndi', 
      owner: storage.getUserEmail() || 'istifadeci@gmail.com'
    };
    this._listings.unshift(newItem);
    return { success: true, data: newItem };
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
  setTheme: (theme) => localStorage.setItem('theme', theme)
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
    return `
      <div class="listing-card" onclick="router.navigate('listing-detail', ${l.id})">
        <img class="listing-card-img" src="${mainImg}" alt="${l.title}" loading="lazy">
        <div class="listing-card-content">
          <div class="listing-card-price">${l.price} AZN</div>
          <div class="listing-card-title">${l.title}</div>
          <div class="listing-card-meta">
            <span>${l.location}</span>
            <span>${l.time}</span>
          </div>
        </div>
      </div>
    `;
  },
  async loadDetail(id) {
    const container = document.getElementById('listing-detail-view');
    container.innerHTML = `<div class="state-container"><p>Yüklənir...</p></div>`;
    
    const res = await listingsService.getListingById(id);
    if (res.success) {
      const l = res.data;
      const images = l.images || [];
      
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
              <p>Məkan: ${l.location}</p>
              <p>Tarix: ${l.time}</p>
            </div>
            <hr style="border:0; border-top:1px solid var(--border-color)">
            <div>
              <p style="font-weight:600; font-size:0.875rem; color:var(--text-muted)">ELAN SAHİBİ</p>
              <p style="font-size:1.1rem; font-weight:700; margin-bottom:var(--sp-sm);">${l.owner}</p>
              <a href="mailto:${l.owner}" class="btn btn-primary" style="width:100%;">E-poçt Göndər</a>
            </div>
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
    
    const res = await listingsService.getListings();
    const userItems = res.data.filter(item => item.owner === email);
    
    if (userItems.length > 0) {
      grid.innerHTML = userItems.map(l => listingsController.createCardHtml(l)).join('');
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
  init() {
    const form = document.getElementById('post-form');
    if(form) form.onsubmit = this.handleSubmit.bind(this);
    
    const imageInput = document.getElementById('post-images');
    if(imageInput) imageInput.onchange = this.handleImageSelection.bind(this);
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
    const location = document.getElementById('post-location').value.trim();
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
    if (!location) {
      document.getElementById('post-location').nextElementSibling.style.display = 'block';
      valid = false;
    }

    if (!valid) return;

    const res = await listingsService.createListing({ 
      title, 
      category, 
      price, 
      description, 
      location, 
      images: this.selectedImagesBase64 
    });

    if (res.success) {
      ui.showToast('Elanınız uğurla yerləşdirildi!', 'success');
      document.getElementById('post-form').reset();
      const previewContainer = document.getElementById('image-preview-container');
      previewContainer.innerHTML = '';
      previewContainer.style.display = 'none';
      this.selectedImagesBase64 = [];
      router.navigate('listings');
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
