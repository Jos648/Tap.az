const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { sendOtpEmail, sendPasswordResetEmail } = require('../config/mailer');
const { signToken } = require('../utils/jwt');
const { generateOtpCode, getOtpExpiry, getOtpResendAvailableAt } = require('../utils/otp');

const SALT_ROUNDS = 10;

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser && existingUser.isVerified) {
      return res.status(409).json({ success: false, message: 'Bu Gmail ünvanı ilə artıq hesab mövcuddur.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const otpCode = generateOtpCode();
    const otpExpiresAt = getOtpExpiry();
    const otpResendAt = getOtpResendAvailableAt();

    if (existingUser && !existingUser.isVerified) {
      // İstifadəçi mövcuddur amma təsdiqlənməyib -> məlumatları yeniləyib yeni OTP göndər
      await prisma.user.update({
        where: { email },
        data: { username, password: hashedPassword, otpCode, otpExpiresAt, otpResendAt },
      });
    } else {
      await prisma.user.create({
        data: { username, email, password: hashedPassword, otpCode, otpExpiresAt, otpResendAt },
      });
    }

    try {
      await sendOtpEmail(email, otpCode);
    } catch (mailErr) {
      console.error('[auth.register] OTP e-poçtu göndərilə bilmədi:', mailErr.message);
      return res.status(502).json({ success: false, message: 'OTP e-poçtu göndərilə bilmədi. Zəhmət olmasa yenidən cəhd edin.' });
    }

    return res.status(201).json({ success: true, message: 'Təsdiq kodu Gmail ünvanınıza göndərildi.' });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'E-poçt və ya şifrə yanlışdır.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: 'Hesabınız təsdiqlənməyib. Zəhmət olmasa OTP kodu ilə təsdiqləyin.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'E-poçt və ya şifrə yanlışdır.' });
    }

    const token = signToken({ id: user.id, email: user.email, username: user.username });

    return res.json({
      success: true,
      message: 'Uğurla daxil oldunuz.',
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/verify-otp
async function verifyOtp(req, res, next) {
  try {
    const { email, code } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'İstifadəçi tapılmadı.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Hesab artıq təsdiqlənib.' });
    }

    if (!user.otpCode || !user.otpExpiresAt) {
      return res.status(400).json({ success: false, message: 'Aktiv təsdiq kodu tapılmadı. Yeni kod tələb edin.' });
    }

    if (new Date() > new Date(user.otpExpiresAt)) {
      return res.status(400).json({ success: false, message: 'Kodun vaxtı bitib. Yeni kod tələb edin.' });
    }

    if (user.otpCode !== code) {
      return res.status(400).json({ success: false, message: 'Kod yanlışdır.' });
    }

    await prisma.user.update({
      where: { email },
      data: { isVerified: true, otpCode: null, otpExpiresAt: null, otpResendAt: null },
    });

    return res.json({ success: true, message: 'Hesabınız uğurla aktivləşdirildi.' });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/resend-otp
async function resendOtp(req, res, next) {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'İstifadəçi tapılmadı.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Hesab artıq təsdiqlənib.' });
    }

    if (user.otpResendAt && new Date() < new Date(user.otpResendAt)) {
      const secondsLeft = Math.ceil((new Date(user.otpResendAt) - new Date()) / 1000);
      return res.status(429).json({ success: false, message: `Yeni kod üçün ${secondsLeft} saniyə gözləyin.` });
    }

    const otpCode = generateOtpCode();
    const otpExpiresAt = getOtpExpiry();
    const otpResendAt = getOtpResendAvailableAt();

    await prisma.user.update({
      where: { email },
      data: { otpCode, otpExpiresAt, otpResendAt },
    });

    try {
      await sendOtpEmail(email, otpCode);
    } catch (mailErr) {
      console.error('[auth.resendOtp] OTP e-poçtu göndərilə bilmədi:', mailErr.message);
      return res.status(502).json({ success: false, message: 'OTP e-poçtu göndərilə bilmədi. Zəhmət olmasa yenidən cəhd edin.' });
    }

    return res.json({ success: true, message: 'Yeni kod göndərildi.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me (qorunan endpoint, token yoxlaması üçün nümunə)
async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, isVerified: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'İstifadəçi tapılmadı.' });
    }

    return res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    // İstifadəçi mövcud olmasa da, cavab eynidir — email enumeration-un qarşısı alınır.
    const genericResponse = { success: true, message: 'Əgər bu ünvanla hesab mövcuddursa, təsdiq kodu göndərildi.' };

    if (!user || !user.isVerified) {
      return res.json(genericResponse);
    }

    if (user.resetOtpResendAt && new Date() < new Date(user.resetOtpResendAt)) {
      return res.json(genericResponse);
    }

    const resetOtpCode = generateOtpCode();
    const resetOtpExpiresAt = getOtpExpiry();
    const resetOtpResendAt = getOtpResendAvailableAt();

    await prisma.user.update({
      where: { email },
      data: { resetOtpCode, resetOtpExpiresAt, resetOtpResendAt },
    });

    try {
      await sendPasswordResetEmail(email, resetOtpCode);
    } catch (mailErr) {
      console.error('[auth.forgotPassword] E-poçt göndərilə bilmədi:', mailErr.message);
      return res.status(502).json({ success: false, message: 'E-poçt göndərilə bilmədi. Zəhmət olmasa yenidən cəhd edin.' });
    }

    return res.json(genericResponse);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res, next) {
  try {
    const { email, code, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'İstifadəçi tapılmadı.' });
    }

    if (!user.resetOtpCode || !user.resetOtpExpiresAt) {
      return res.status(400).json({ success: false, message: 'Aktiv təsdiq kodu tapılmadı. Yenidən tələb edin.' });
    }

    if (new Date() > new Date(user.resetOtpExpiresAt)) {
      return res.status(400).json({ success: false, message: 'Kodun vaxtı bitib. Yenidən tələb edin.' });
    }

    if (user.resetOtpCode !== code) {
      return res.status(400).json({ success: false, message: 'Kod yanlışdır.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword, resetOtpCode: null, resetOtpExpiresAt: null, resetOtpResendAt: null },
    });

    return res.json({ success: true, message: 'Şifrəniz uğurla yeniləndi. Zəhmət olmasa yeni şifrə ilə daxil olun.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, verifyOtp, resendOtp, me, forgotPassword, resetPassword };
