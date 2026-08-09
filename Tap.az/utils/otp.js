const crypto = require('crypto');

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);
const OTP_RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '30', 10);

// Math.random() PRNG-i proqnozlaşdırıla bilər və OTP kimi təhlükəsizlik
// baxımından həssas dəyərlər üçün uyğun deyil. crypto.randomInt() Node-un
// kriptoqrafik təhlükəsiz mənbəyindən istifadə edir.
function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000)); // 100000-999999 (daxil)
}

function getOtpExpiry() {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

function getOtpResendAvailableAt() {
  return new Date(Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000);
}

module.exports = {
  generateOtpCode,
  getOtpExpiry,
  getOtpResendAvailableAt,
  OTP_EXPIRY_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
};
