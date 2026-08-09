const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const {
  loginLimiter,
  registerLimiter,
  otpVerifyLimiter,
  otpResendLimiter,
} = require('../middleware/rateLimit.middleware');
const {
  validate,
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
} = require('../utils/validators');

// POST /api/auth/register  -> Qeydiyyat, OTP göndərilir
router.post('/register', registerLimiter, validate(registerSchema), authController.register);

// POST /api/auth/login  -> Giriş, JWT token qaytarır
router.post('/login', loginLimiter, validate(loginSchema), authController.login);

// POST /api/auth/verify-otp  -> OTP kodunun təsdiqlənməsi
router.post('/verify-otp', otpVerifyLimiter, validate(verifyOtpSchema), authController.verifyOtp);

// POST /api/auth/resend-otp  -> Yeni OTP kodunun göndərilməsi (cooldown ilə)
router.post('/resend-otp', otpResendLimiter, validate(resendOtpSchema), authController.resendOtp);

// GET /api/auth/me  -> Cari istifadəçinin məlumatları (qorunan endpoint)
router.get('/me', requireAuth, authController.me);

module.exports = router;
