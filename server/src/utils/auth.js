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

function parseDurationToMs(duration) {
  const match = duration.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) return 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return value * multipliers[unit];
}

function cookieOptions() {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: parseDurationToMs(process.env.JWT_EXPIRES_IN || '1d'),
  };
}

function setAuthCookie(response, token) {
  response.cookie(authCookieName, token, cookieOptions());
}

function clearAuthCookie(response) {
  response.clearCookie(authCookieName, cookieOptions());
}

function getTokenLifetimeMs() {
  return parseDurationToMs(process.env.JWT_EXPIRES_IN || '1d');
}

module.exports = {
  authCookieName,
  clearAuthCookie,
  createToken,
  getTokenLifetimeMs,
  getJwtSecret,
  setAuthCookie,
};