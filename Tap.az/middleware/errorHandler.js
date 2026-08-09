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
  const message = err.message || 'Serverdə daxili xəta baş verdi.';
  res.status(status).json({ success: false, message });
}

module.exports = { notFoundHandler, errorHandler };
