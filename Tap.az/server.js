const path = require('path');
const fs = require('fs');

// ==== ENV YÜKLƏMƏ ====
// Runtime YALNIZ ".env" faylından oxumalıdır. ".env.example" yalnız template-dir
// və heç vaxt runtime konfiqurasiyası kimi istifadə edilməməlidir.
const ENV_PATH = path.resolve(__dirname, '.env');

if (!fs.existsSync(ENV_PATH)) {
  console.error('[env] ERROR: .env file was not found.');
  console.error(`[env] Gözlənilən yol: ${ENV_PATH}`);
  console.error('[env] ".env.example" faylını ".env" adı ilə kopyalayıb real dəyərləri doldurun.');
  process.exit(1);
}

require('dotenv').config({ path: ENV_PATH });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth.routes');
const itemRoutes = require('./routes/item.routes');
const reviewRoutes = require('./routes/review.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// ==== ENV VALIDATION ====
// Required: bunlar olmadan server işə düşməməlidir.
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET'];
// Optional: yoxdursa warning verilir, server yenə də başlayır.
const OPTIONAL_ENV_VARS = ['EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM', 'DIRECT_URL', 'SHADOW_DATABASE_URL', 'SENTRY_DSN'];

const missingRequired = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingRequired.length > 0) {
  missingRequired.forEach((key) => {
    console.error(`[env] ERROR: ${key} is not configured in .env`);
  });
  console.error('[env] Server dayandırılır — vacib mühit dəyişənləri çatışmır.');
  process.exit(1);
}

const missingOptional = OPTIONAL_ENV_VARS.filter((key) => !process.env[key]);
if (missingOptional.length > 0) {
  console.warn(`[env] WARNING: aşağıdakı optional dəyişənlər təyin olunmayıb: ${missingOptional.join(', ')}`);
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[env] OTP email funksiyası deaktivdir (EMAIL_USER / EMAIL_PASS yoxdur).');
  }
}

// Diqqət: secret dəyərlərin özü heç vaxt console-a yazılmır, yalnız "configured" statusu.
REQUIRED_ENV_VARS.forEach((key) => console.log(`[env] ${key}: configured`));

const app = express();
const PORT = process.env.PORT || 5000;

// Frontend ilə eyni serverdən statik fayl servis edildiyi üçün CSP elə tənzimlənir ki,
// inline onclick handler-ləri və inline style atributları işləsin, amma xarici mənbələrdən
// skript/iframe yüklənməsi və s. yenə də bloklansın (XSS-ə qarşı dərinləşdirilmiş müdafiə).
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      mediaSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
}));

// CORS_ORIGINS .env-də veriləcək (vergüllə ayrılmış). Yoxdursa, development üçün fallback istifadə olunur
// ki, mövcud frontend işləməyi dayandırmasın.
const DEFAULT_CORS_ORIGINS = ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000', `http://localhost:${PORT}`];
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : DEFAULT_CORS_ORIGINS;

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

app.use(express.json({ limit: '50mb' })); // elanlarda 3-20 base64 şəkil göndərilə bildiyi üçün limit artırılıb

// ==== API ROUTES ====
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/reviews', reviewRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server sağlamdır.', timestamp: new Date().toISOString() });
});

// ==== STATIC FRONTEND ====
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'tapal.html'));
});

// Naməlum /api/* endpointləri üçün 404
app.use(notFoundHandler);

// SPA fallback: qalan bütün GET tələbləri üçün tapal.html qaytar
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'tapal.html'));
});

// Mərkəzləşdirilmiş xəta idarəetməsi (həmişə ən sonda olmalıdır)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Server ${PORT} portunda aktivdir: http://localhost:${PORT}`);
});
