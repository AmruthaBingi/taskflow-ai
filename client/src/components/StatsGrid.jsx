function StatsGrid({ stats }) {
  const items = [
    ['Total tasks', stats.total, 'neutral'],
    ['Completed', stats.completed, 'green'],
    ['Pending', stats.pending, 'gold'],
    ['In progress', stats.inProgress, 'blue'],
    ['Overdue', stats.overdue, 'coral'],
  ]

  return <div className="stats-grid">{items.map(([label, value, tone]) => <article className={`stat-card ${tone}`} key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
}

export default StatsGrid