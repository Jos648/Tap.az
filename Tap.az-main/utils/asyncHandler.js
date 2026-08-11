/**
 * Async Express route handler-i elə bükür ki, rədd olunmuş promise / atılan
 * xəta avtomatik next()-ə ötürülsün — hər controller-də try/catch yazmağa
 * ehtiyac qalmır.
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
