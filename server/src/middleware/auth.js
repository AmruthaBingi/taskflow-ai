const jwt = require('jsonwebtoken');
const { authCookieName, getJwtSecret } = require('../utils/auth');

function requireAuth(request, response, next) {
  const token = request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${authCookieName}=`))
    ?.slice(authCookieName.length + 1);

  if (!token) {
    return response.status(401).json({ message: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    request.user = { id: payload.sub };
    return next();
  } catch {
    return response.status(401).json({ message: 'Invalid or expired session' });
  }
}

module.exports = requireAuth;