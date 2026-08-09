const rateLimit = require('express-rate-limit');

const jsonRateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Çox sayda cəhd edildi. Zəhmət olmasa bir az sonra yenidən cəhd edin.',
  });
};

// Login: parolla 6 rəqəmli OTP kimi məhdud fəza olmadığından daha yumşaq,
// amma yenə də brute-force-un qarşısını alacaq qədər sərt.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dəqiqə
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
  keyGenerator: (req) => `${req.ip}:${(req.body?.email || '').toLowerCase()}`,
});

// OTP təsdiqi: 6 rəqəmli kod cəmi 1.000.000 kombinasiyadır — rate limit olmadan
// brute-force ilə tapıla bilər. Bura ən sərt limit qoyulur.
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
  keyGenerator: (req) => `${req.ip}:${(req.body?.email || '').toLowerCase()}`,
});

// Qeydiyyat / OTP yenidən göndərmə: email-bombing-in qarşısını alır
// (server qatında da cooldown var, bu əlavə IP-səviyyəli qorumadır).
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

// Elan yaratma: spam elanların qarşısını alır.
const itemCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

// Rəy göndərmə: rəy spam-ının qarşısını alır.
const reviewCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

// İctimai oxuma (elan siyahısı/detalı, satıcı rəyləri): normal istifadəçi
// üçün kifayət qədər yüksək, amma bulk scraping bot-larını (məs. bütün
// elanları/nömrələri tez-tez yığmaq) yavaşlatmaq üçün limit qoyulur.
const publicReadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 dəqiqə
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

module.exports = {
  loginLimiter,
  otpVerifyLimiter,
  otpRequestLimiter,
  itemCreateLimiter,
  reviewCreateLimiter,
  publicReadLimiter,
};
