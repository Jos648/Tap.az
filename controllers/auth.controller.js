const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { sendOtpEmail } = require('../config/mailer');
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
      return res.status(401).json({ success: false, message: 'Bu Gmail ünvanı ilə istifadəçi tapılmadı.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: 'Hesabınız təsdiqlənməyib. Zəhmət olmasa OTP kodu ilə təsdiqləyin.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Şifrə yanlışdır.' });
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

module.exports = { register, login, verifyOtp, resendOtp, me };
