/**
 * Basic input validation middleware
 */
export function validateJson(req, res, next) {
  // Skip GET and DELETE requests
  if (req.method === 'GET' || req.method === 'DELETE') return next();

  // Check Content-Type for POST, PUT, PATCH
  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('application/json')) {
    return res.status(415).json({ error: 'Content-Type must be application/json' });
  }

  next();
}

/**
 * Sanitize string inputs to prevent XSS
 */
export function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        // Remove potential XSS patterns
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '');
      }
    }
  }
  next();
}
