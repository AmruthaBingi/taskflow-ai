import { useEffect, useState } from 'react'
import TaskBoard from '../components/TaskBoard'
import StatsGrid from '../components/StatsGrid'
import { apiRequest } from '../lib/api'

function Dashboard() {
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, inProgress: 0, overdue: 0, completionPercentage: 0 })
  const [statsError, setStatsError] = useState('')
  const [isStatsLoading, setIsStatsLoading] = useState(true)

  useEffect(() => {
    apiRequest('/tasks/stats')
      .then(setStats)
      .catch((error) => setStatsError(error.message))
      .finally(() => setIsStatsLoading(false))
  }, [])

  return <section className="page-content"><p className="eyebrow">Your workspace</p><h1>Make progress visible.</h1><p className="dashboard-lede">A quiet place to collect what matters, then move it forward one clear step at a time.</p>{statsError && <p className="form-error">Could not load dashboard analytics: {statsError}</p>}{isStatsLoading ? <p className="empty-state">Calculating your workspace summary...</p> : <><StatsGrid stats={stats} /><div className="progress-row"><span>Completion progress</span><strong>{stats.completionPercentage}%</strong><div className="progress-track"><span style={{ width: `${stats.completionPercentage}%` }} /></div></div></>}<TaskBoard title="Today’s tasks" /></section>
}

export default Dashboard
