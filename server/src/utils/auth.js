const jwt = require('jsonwebtoken');

const authCookieName = 'taskflow_token';

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return process.env.JWT_SECRET;
}

function createToken(userId) {
  return jwt.sign({}, getJwtSecret(), {
    subject: userId,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
}

function cookieOptions() {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
  };
}

function setAuthCookie(response, token) {
  response.cookie(authCookieName, token, cookieOptions());
}

function clearAuthCookie(response) {
  response.clearCookie(authCookieName, cookieOptions());
}

module.exports = {
  authCookieName,
  clearAuthCookie,
  createToken,
  getJwtSecret,
  setAuthCookie,
};