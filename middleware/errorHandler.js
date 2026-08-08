function notFoundHandler(req, res, next) {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Endpoint tapılmadı.' });
  }
  next();
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[error]', err);

  // Prisma unikal məhdudiyyət xətası (məs. email artıq mövcuddur)
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Bu e-poçt artıq qeydiyyatdan keçib.' });
  }

  const status = err.status || 500;
  const message = err.message || 'Serverdə daxili xəta baş verdi.';
  res.status(status).json({ success: false, message });
}

module.exports = { notFoundHandler, errorHandler };
