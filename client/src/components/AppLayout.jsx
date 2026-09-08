import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/authContext'

function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-lockup"><span className="brand-mark small">TF</span><span>TaskFlow AI</span></div>
        <nav className="app-nav" aria-label="Application navigation">
          <NavLink to="/dashboard">Overview</NavLink>
          <NavLink to="/tasks">Tasks</NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/profile">Profile</NavLink>
          <NavLink to="/ai">AI Assistant</NavLink>
        </nav>
        <div className="sidebar-footer"><span>{user.name}</span><button className="text-button" onClick={handleLogout}>Log out</button></div>
      </aside>
      <main className="app-main"><Outlet /></main>
    </div>
  )
}

export default AppLayout