const { verifyToken } = require('../utils/jwt');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: 'Giriş tələb olunur.' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Yanlış və ya vaxtı bitmiş token.' });
  }
}

/**
 * requireAuth-dan fərqli olaraq token olmadan da keçməyə icazə verir —
 * yalnız token VARSA və düzgündürsə `req.user`-i doldurur. Elan
 * siyahısı/detalı kimi ictimai endpoint-lərdə istifadə olunur ki, giriş
 * etmiş istifadəçilərə tam data (məs. telefon nömrəsi), anonim ziyarətçilərə
 * isə maskalanmış data göstərilə bilsin.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme === 'Bearer' && token) {
    try {
      req.user = verifyToken(token);
    } catch (err) {
      // Token yanlış/vaxtı bitib — bloklamırıq, sadəcə anonim kimi davam edir.
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
