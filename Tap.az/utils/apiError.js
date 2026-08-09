/**
 * Statuskodu (və istəyə görə field-səviyyəli validasiya xətalarını) daşıyan
 * xüsusi Error sinfi. Controller/service qatında atılır və mərkəzləşdirilmiş
 * errorHandler middleware-i tərəfindən tutulur.
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errors) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Giriş tələb olunur.') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Bu əməliyyat üçün icazəniz yoxdur.') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Tapılmadı.') {
    return new ApiError(404, message);
  }

  static internal(message = 'Serverdə daxili xəta baş verdi.') {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
