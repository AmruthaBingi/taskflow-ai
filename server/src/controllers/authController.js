const bcrypt = require('bcrypt');
const { getSql } = require('../config/db');
const { clearAuthCookie, createToken, setAuthCookie } = require('../utils/auth');

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.created_at,
  };
}

function validateCredentials(name, email, password, requireName = false) {
  if ((requireName && (!name || name.trim().length < 2)) || !email || !password) {
    return 'Name, email, and password are required';
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return 'Enter a valid email address';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }

  return null;
}

async function register(request, response) {
  const { name, email, password } = request.body;
  const validationError = validateCredentials(name, email, password, true);

  if (validationError) {
    return response.status(400).json({ message: validationError });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const sql = getSql();
  const existingUsers = await sql`SELECT id FROM users WHERE LOWER(email) = ${normalizedEmail}`;

  if (existingUsers.length > 0) {
    return response.status(409).json({ message: 'An account with that email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const users = await sql`
    INSERT INTO users (name, email, password_hash)
    VALUES (${name.trim()}, ${normalizedEmail}, ${passwordHash})
    RETURNING id, name, email, created_at
  `;
  const user = users[0];

  setAuthCookie(response, createToken(user.id));
  return response.status(201).json({ user: safeUser(user) });
}

async function login(request, response) {
  const { email, password } = request.body;
  const validationError = validateCredentials('', email, password);

  if (validationError) {
    return response.status(400).json({ message: validationError });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const sql = getSql();
  const users = await sql`SELECT * FROM users WHERE LOWER(email) = ${normalizedEmail}`;
  const user = users[0];
  const passwordMatches = user && await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    return response.status(401).json({ message: 'Invalid email or password' });
  }

  setAuthCookie(response, createToken(user.id));
  return response.json({ user: safeUser(user) });
}

function logout(request, response) {
  clearAuthCookie(response);
  return response.json({ message: 'Logged out successfully' });
}

module.exports = { login, logout, register, safeUser };