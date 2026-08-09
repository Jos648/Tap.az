const rateLimit = require('express-rate-limit');

/**
 * Bütün limiter-lər IP əsaslıdır. `standardHeaders: true` ilə client-ə
 * RateLimit-* header-ləri göndərilir, `legacyHeaders: false` ilə köhnə
 * X-RateLimit-* header-ləri deaktiv edilir.
 *
 * Qeyd: tək instansda işləyən server üçün in-memory store kifayətdir.
 * Server bir neçə instansda (məs. Railway-də horizontal scale) işləyəcəksə,
 * `rate-limit-redis` kimi paylaşılan store istifadə olunmalıdır, əks halda
 * hər instans öz limitini ayrıca sayır.
 */

// POST /api/auth/login — brute-force şifrə hücumlarına qarşı
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dəqiqə
  max: 10, // 15 dəqiqədə eyni IP-dən maksimum 10 cəhd
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çox sayda uğursuz giriş cəhdi. Zəhmət olmasa 15 dəqiqə sonra yenidən cəhd edin.' },
  // Uğurlu girişlər limiti sıfırlamır — brute-force ardıcıl uğursuz cəhdlərlə
  // baş verdiyi üçün skipSuccessfulRequests istifadə OLUNMUR (default: bütün cəhdlər sayılır).
});

// POST /api/auth/register — kütləvi hesab yaratma / e-poçt bombalamanın qarşısını alır
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çox sayda qeydiyyat cəhdi. Zəhmət olmasa 1 saat sonra yenidən cəhd edin.' },
});

// POST /api/auth/verify-otp — OTP kod brute-force-una qarşı (6 rəqəm = 1 milyon kombinasiya,
// limitsiz cəhdlə asanlıqla sınana bilər)
const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 dəqiqə
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çox sayda uğursuz kod cəhdi. Zəhmət olmasa bir az sonra yenidən cəhd edin.' },
});

// POST /api/auth/resend-otp — əlavə qat qorunma (özündə artıq DB-based cooldown var,
// amma bu, cooldown yoxlaması özü ilə bağlı DB sorğularının da spam edilməsinin qarşısını alır)
const otpResendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 dəqiqə
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çox sayda kod tələbi. Zəhmət olmasa bir az sonra yenidən cəhd edin.' },
});

module.exports = { loginLimiter, registerLimiter, otpVerifyLimiter, otpResendLimiter };
