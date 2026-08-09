const ApiError = require('../utils/apiError');

function notFoundHandler(req, res, next) {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Endpoint tapılmadı.' });
  }
  next();
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[error]', err);

  // ApiError (item.controller / item.service tərəfindən atılan strukturlaşdırılmış xətalar)
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
  }

  // Prisma: axtarılan qeyd tapılmadı (məs. update/delete zamanı)
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Elan tapılmadı.' });
  }

  // Prisma unikal məhdudiyyət xətası (məs. email artıq mövcuddur)
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Bu qeyd artıq mövcuddur.' });
  }

  const status = err.status || 500;

  // Production-da gözlənilməz (500) xətaların daxili mesajı client-ə göndərilmir —
  // DB bağlantı sətri, fayl yolları, stack detalları kimi məlumatlar sıza bilər.
  // Development-də debug asanlığı üçün əsl mesaj saxlanılır.
  const isProd = process.env.NODE_ENV === 'production';
  const message = status === 500 && isProd
    ? 'Serverdə daxili xəta baş verdi.'
    : (err.message || 'Serverdə daxili xəta baş verdi.');

  res.status(status).json({ success: false, message });
}

module.exports = { notFoundHandler, errorHandler };
