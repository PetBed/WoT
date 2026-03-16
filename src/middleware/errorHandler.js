/**
 * Central error handler — always returns JSON with a consistent shape:
 *   { error: string, details?: any }
 */
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl} →`, err.message || err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: 'Validation failed', details });
  }

  // Mongoose duplicate key (e.g. motifId unique constraint)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ error: `Duplicate value for ${field}` });
  }

  // Mongoose cast error (bad ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid id format for field: ${err.path}` });
  }

  // Generic
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
}

/**
 * Thin wrapper so route handlers can be async without try/catch boilerplate.
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * 404 handler — mount after all routes.
 */
function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, asyncHandler, notFound };