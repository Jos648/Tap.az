const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);
const OTP_RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '30', 10);

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
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
