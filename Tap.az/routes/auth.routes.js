const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const {
  validate,
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
} = require('../utils/validators');

// POST /api/auth/register  -> Qeydiyyat, OTP göndərilir
router.post('/register', validate(registerSchema), authController.register);

// POST /api/auth/login  -> Giriş, JWT token qaytarır
router.post('/login', validate(loginSchema), authController.login);

// POST /api/auth/verify-otp  -> OTP kodunun təsdiqlənməsi
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);

// POST /api/auth/resend-otp  -> Yeni OTP kodunun göndərilməsi (cooldown ilə)
router.post('/resend-otp', validate(resendOtpSchema), authController.resendOtp);

// GET /api/auth/me  -> Cari istifadəçinin məlumatları (qorunan endpoint)
router.get('/me', requireAuth, authController.me);

module.exports = router;
