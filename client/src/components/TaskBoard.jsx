import { useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'

const initialForm = { title: '', description: '', priority: 'medium', status: 'todo', dueDate: '' }

function TaskBoard({ projectId, title = 'Your tasks' }) {
  const [tasks, setTasks] = useState([])
  const [form, setForm] = useState(initialForm)
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', due: '', sort: 'newest' })
  const [editingTask, setEditingTask] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const { search, status, priority, due, sort } = filters

  useEffect(() => {
    async function loadTasks() {
      setIsLoading(true)
      const params = new URLSearchParams({ search, status, priority, due, sort, ...(projectId ? { projectId } : {}) })
      for (const [key, value] of [...params]) if (!value) params.delete(key)
      try {
        const data = await apiRequest(`/tasks?${params}`)
        setTasks(data.tasks)
        setError('')
      } catch (loadError) { setError(loadError.message) } finally { setIsLoading(false) }
    }

    loadTasks()
  }, [projectId, search, status, priority, due, sort])

  async function submitTask(event) {
    event.preventDefault()
    if (!form.title.trim()) return
    try {
      const data = await apiRequest('/tasks', { method: 'POST', body: JSON.stringify({ ...form, dueDate: form.dueDate || null, ...(projectId ? { projectId } : {}) }) })
      setTasks((current) => [data.task, ...current])
      setForm(initialForm)
      setError('')
    } catch (submitError) { setError(submitError.message) }
  }

  async function updateTask(taskId, changes) {
    try {
      const data = await apiRequest(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(changes) })
      setTasks((current) => current.map((task) => task.id === taskId ? data.task : task))
      setEditingTask(null)
    } catch (updateError) { setError(updateError.message) }
  }

  async function removeTask(taskId) {
    try { await apiRequest(`/tasks/${taskId}`, { method: 'DELETE' }); setTasks((current) => current.filter((task) => task.id !== taskId)) } catch (deleteError) { setError(deleteError.message) }
  }

  return <section className="task-section">
    <div className="section-heading"><div><p className="eyebrow">Workspace</p><h2>{title}</h2></div><span className="task-count">{tasks.length} shown</span></div>
    <form className="task-form task-form-expanded" onSubmit={submitTask}>
      <input aria-label="New task title" placeholder="What needs your attention?" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength="200" />
      <select aria-label="Task priority" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select>
      <input aria-label="Task due date" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
      <button className="primary-button" type="submit">Add task</button>
    </form>
    <div className="task-filters"><input aria-label="Search tasks" placeholder="Search tasks" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /><select aria-label="Filter status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All status</option><option value="todo">To do</option><option value="in-progress">In progress</option><option value="done">Done</option></select><select aria-label="Filter priority" value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}><option value="">All priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select><select aria-label="Filter due date" value={filters.due} onChange={(event) => setFilters({ ...filters, due: event.target.value })}><option value="">Any due date</option><option value="today">Today</option><option value="upcoming">Upcoming</option><option value="overdue">Overdue</option><option value="none">No due date</option></select><select aria-label="Sort tasks" value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="due">Due date</option><option value="priority">Priority</option></select></div>
    {error && <p className="form-error">{error}</p>}
    {isLoading ? <p className="empty-state">Loading tasks...</p> : tasks.length === 0 ? <p className="empty-state">No tasks match these filters.</p> : <div className="task-list">{tasks.map((task) => <article className={task.status === 'done' ? 'task-item completed' : 'task-item'} key={task.id}>{editingTask === task.id ? <TaskEditor task={task} onSave={(changes) => updateTask(task.id, changes)} onCancel={() => setEditingTask(null)} /> : <><button className="task-check" aria-label={task.status === 'done' ? `Reopen ${task.title}` : `Complete ${task.title}`} onClick={() => updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })} type="button">{task.status === 'done' ? '✓' : ''}</button><div className="task-copy"><strong>{task.title}</strong><p>{task.priority} priority{task.dueDate ? ` · due ${task.dueDate}` : ''} · {task.status}</p>{task.description && <p>{task.description}</p>}</div><button className="delete-button" onClick={() => setEditingTask(task.id)} type="button">Edit</button><button className="delete-button" onClick={() => removeTask(task.id)} type="button">Delete</button></>}</article>)}</div>}
  </section>
}

function TaskEditor({ task, onSave, onCancel }) {
  const [form, setForm] = useState({ title: task.title, description: task.description, priority: task.priority, status: task.status, dueDate: task.dueDate || '' })
  return <div className="task-editor"><input aria-label="Edit task title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /><textarea aria-label="Edit task description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /><div><select aria-label="Edit task status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="todo">To do</option><option value="in-progress">In progress</option><option value="done">Done</option></select><select aria-label="Edit task priority" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select><input aria-label="Edit task due date" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></div><button className="primary-button" onClick={() => onSave({ ...form, dueDate: form.dueDate || null })} type="button">Save</button><button className="delete-button" onClick={onCancel} type="button">Cancel</button></div>
}

export default TaskBoard