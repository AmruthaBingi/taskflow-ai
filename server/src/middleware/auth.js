const jwt = require('jsonwebtoken');
const { authCookieName, createToken, getJwtSecret, getTokenLifetimeMs, setAuthCookie } = require('../utils/auth');

function requireAuth(request, response, next) {
  const token = request.cookies?.[authCookieName];

  if (!token) {
    console.warn(`[AUTH] 401: missing token for ${request.method} ${request.originalUrl}`);
    return response.status(401).json({ message: 'Authentication required' });
  }

  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch (error) {
    const reason = error.name === 'TokenExpiredError' ? 'expired token' : 'invalid signature';
    console.warn(`[AUTH] 401: ${reason} for ${request.method} ${request.originalUrl}`);
    return response.status(401).json({ message: 'Invalid or expired session' });
  }

  request.user = { id: payload.sub };

  const issuedAt = payload.iat ? payload.iat * 1000 : Date.now();
  const lifetimeMs = getTokenLifetimeMs();
  if (lifetimeMs > 0 && Date.now() - issuedAt > lifetimeMs / 2) {
    setAuthCookie(response, createToken(payload.sub));
  }

  return next();
}

module.exports = requireAuth;
