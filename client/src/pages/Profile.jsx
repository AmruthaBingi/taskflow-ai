import { useState } from 'react'
import { useAuth } from '../context/authContext'
import { apiRequest } from '../lib/api'

function Profile() {
  const { user, updateUser } = useAuth()
  const [details, setDetails] = useState({ name: user.name, email: user.email })
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function updateDetails(event) {
    event.preventDefault()
    try {
      const data = await apiRequest('/users/me', { method: 'PATCH', body: JSON.stringify(details) })
      updateUser(data.user)
      setDetails({ name: data.user.name, email: data.user.email })
      setMessage('Profile updated successfully')
      setError('')
    } catch (updateError) { setError(updateError.message); setMessage('') }
  }

  async function updatePassword(event) {
    event.preventDefault()
    try {
      await apiRequest('/users/me/password', { method: 'POST', body: JSON.stringify(passwords) })
      setPasswords({ currentPassword: '', newPassword: '' })
      setMessage('Password updated successfully')
      setError('')
    } catch (passwordError) { setError(passwordError.message); setMessage('') }
  }

  return <section className="page-content"><p className="eyebrow">Your account</p><h1>Profile.</h1>{message && <p className="success-message">{message}</p>}{error && <p className="form-error">{error}</p>}<div className="profile-grid"><form className="profile-card profile-form" onSubmit={updateDetails}><span className="brand-mark">{user.name.slice(0, 2).toUpperCase()}</span><h2>Personal details</h2><label>Name<input value={details.name} onChange={(event) => setDetails({ ...details, name: event.target.value })} required /></label><label>Email<input type="email" value={details.email} onChange={(event) => setDetails({ ...details, email: event.target.value })} required /></label><button className="primary-button" type="submit">Save profile</button><p className="profile-meta">Member since {new Date(user.createdAt).toLocaleDateString()}</p></form><form className="profile-card profile-form" onSubmit={updatePassword}><span className="card-kicker">Security</span><h2>Change password</h2><label>Current password<input type="password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} required /></label><label>New password<input type="password" minLength="8" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} required /></label><button className="primary-button" type="submit">Update password</button></form></div></section>
}

export default Profile
