const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const {
  loginLimiter,
  otpVerifyLimiter,
  otpRequestLimiter,
} = require('../middleware/rateLimit.middleware');
const {
  validate,
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../utils/validators');

// POST /api/auth/register  -> Qeydiyyat, OTP göndərilir
router.post('/register', otpRequestLimiter, validate(registerSchema), authController.register);

// POST /api/auth/login  -> Giriş, JWT token qaytarır
router.post('/login', loginLimiter, validate(loginSchema), authController.login);

// POST /api/auth/verify-otp  -> OTP kodunun təsdiqlənməsi
router.post('/verify-otp', otpVerifyLimiter, validate(verifyOtpSchema), authController.verifyOtp);

// POST /api/auth/resend-otp  -> Yeni OTP kodunun göndərilməsi (cooldown ilə)
router.post('/resend-otp', otpRequestLimiter, validate(resendOtpSchema), authController.resendOtp);

// GET /api/auth/me  -> Cari istifadəçinin məlumatları (qorunan endpoint)
router.get('/me', requireAuth, authController.me);

// POST /api/auth/forgot-password  -> Şifrə bərpası üçün OTP göndərilir
router.post('/forgot-password', otpRequestLimiter, validate(forgotPasswordSchema), authController.forgotPassword);

// POST /api/auth/reset-password  -> OTP təsdiqi ilə yeni şifrə təyin edilir
router.post('/reset-password', otpVerifyLimiter, validate(resetPasswordSchema), authController.resetPassword);

module.exports = router;
