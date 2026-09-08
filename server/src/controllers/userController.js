const bcrypt = require('bcrypt');
const { getSql } = require('../config/db');
const { safeUser } = require('./authController');

async function getCurrentUser(request, response) {
  const users = await getSql()`
    SELECT id, name, email, created_at
    FROM users
    WHERE id = ${request.user.id}
  `;

  if (users.length === 0) {
    return response.status(404).json({ message: 'User not found' });
  }

  return response.json({ user: safeUser(users[0]) });
}

async function updateCurrentUser(request, response) {
  const { name, email } = request.body;
  if (name === undefined && email === undefined) return response.status(400).json({ message: 'Provide a name or email change' });
  if (name !== undefined && (!name.trim() || name.trim().length < 2 || name.trim().length > 100)) return response.status(400).json({ message: 'Name must be between 2 and 100 characters' });
  if (email !== undefined && !/^\S+@\S+\.\S+$/.test(email.trim())) return response.status(400).json({ message: 'Enter a valid email address' });

  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail) {
    const matches = await getSql()`SELECT id FROM users WHERE LOWER(email) = ${normalizedEmail} AND id <> ${request.user.id}`;
    if (matches.length > 0) return response.status(409).json({ message: 'That email is already in use' });
  }

  const fields = [];
  const values = [request.user.id];
  const addField = (column, value) => { values.push(value); fields.push(`${column} = $${values.length}`); };
  if (name !== undefined) addField('name', name.trim());
  if (normalizedEmail) addField('email', normalizedEmail);
  fields.push('updated_at = NOW()');
  const users = await getSql().query(`UPDATE users SET ${fields.join(', ')} WHERE id = $1 RETURNING id, name, email, created_at`, values);
  return response.json({ user: safeUser(users[0]) });
}

async function changePassword(request, response) {
  const { currentPassword, newPassword } = request.body;
  if (!currentPassword || !newPassword) return response.status(400).json({ message: 'Current and new passwords are required' });
  if (newPassword.length < 8) return response.status(400).json({ message: 'New password must be at least 8 characters' });
  const users = await getSql()`SELECT password_hash FROM users WHERE id = ${request.user.id}`;
  if (users.length === 0 || !(await bcrypt.compare(currentPassword, users[0].password_hash))) return response.status(401).json({ message: 'Current password is incorrect' });
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await getSql()`UPDATE users SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${request.user.id}`;
  return response.json({ message: 'Password updated successfully' });
}

module.exports = { changePassword, getCurrentUser, updateCurrentUser };