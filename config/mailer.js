const nodemailer = require('nodemailer');

const {
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
} = process.env;

const mailerEnabled = Boolean(EMAIL_USER && EMAIL_PASS);

if (!mailerEnabled) {
  console.warn('[mailer] WARNING: EMAIL_USER və ya EMAIL_PASS .env faylında təyin olunmayıb. OTP e-poçt funksiyası deaktivdir.');
}

// Gmail SMTP vasitəsilə OTP e-poçtlarının göndərilməsi üçün transporter
// EMAIL_PASS Gmail "App Password" olmalıdır (adi Gmail şifrəsi işləməyəcək)
// Bütün SMTP parametrləri .env-dən oxunur; dəyər verilməzsə Gmail üçün ağlabatan default istifadə olunur.
const transporter = mailerEnabled
  ? nodemailer.createTransport({
      host: SMTP_HOST || 'smtp.gmail.com',
      port: SMTP_PORT ? parseInt(SMTP_PORT, 10) : 465,
      secure: SMTP_SECURE !== undefined ? SMTP_SECURE === 'true' : true,
      family: 4, // IPv4-ə məcbur et - Railway-də IPv6 üzərindən Gmail-ə bağlantı timeout verir
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
      connectionTimeout: 10000,
    })
  : null;

async function sendOtpEmail(toEmail, otpCode) {
  if (!mailerEnabled) {
    throw new Error('OTP email funksiyası deaktivdir: EMAIL_USER / EMAIL_PASS .env-də təyin olunmayıb.');
  }

  const mailOptions = {
    from: EMAIL_FROM || `"TapAl" <${EMAIL_USER}>`,
    to: toEmail,
    subject: 'TapAl - Təsdiq Kodunuz',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #111;">TapAl Hesab Təsdiqi</h2>
        <p>Salam,</p>
        <p>Qeydiyyatınızı tamamlamaq üçün aşağıdakı təsdiq kodundan istifadə edin:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; margin: 24px 0; color: #111;">
          ${otpCode}
        </div>
        <p style="color: #666; font-size: 14px;">Bu kod 5 dəqiqə ərzində etibarlıdır. Əgər bu tələbi siz göndərməmisinizsə, bu e-poçtu nəzərə almayın.</p>
        <p style="color: #666; font-size: 14px;">TapAl komandası</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { transporter, sendOtpEmail };
