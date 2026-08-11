const ApiError = require('../utils/apiError');

/**
 * `req[source]`-u Zod sxemi əsasında yoxlayan Express middleware qaytarır.
 * Uğurlu olduqda parse edilmiş (coerce/default tətbiq olunmuş) dəyər
 * req[source]-u əvəz edir ki, sonrakı kod formaya/tipə etibar edə bilsin.
 *
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} source
 */
function validate(schema, source = 'body') {
  return function validateMiddleware(req, res, next) {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(ApiError.badRequest('Validasiya uğursuz oldu.', errors));
    }

    req[source] = result.data;
    next();
  };
}

module.exports = validate;
