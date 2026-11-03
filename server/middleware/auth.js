const jwt = require('jsonwebtoken');

function authMiddleware(request, response, next) {
  const authorization = request.headers.authorization;
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;

  if (!token) {
    return response.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    request.user = {
      id: decoded.id,
      email: decoded.email,
      is_admin: Boolean(decoded.is_admin),
    };

    return next();
  } catch {
    return response.status(401).json({
      error: 'Invalid or expired token',
    });
  }
}

function requireAdmin(request, response, next) {
  if (!request.user?.is_admin) {
    return response.status(403).json({ error: 'Admin access required' });
  }

  return next();
}

module.exports = { authMiddleware, requireAdmin };
