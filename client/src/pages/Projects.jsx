import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../lib/api'

function Projects() {
  const [projects, setProjects] = useState([])
  const [form, setForm] = useState({ name: '', description: '', color: 'teal' })
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    async function loadProjects() {
      try { const data = await apiRequest('/projects'); setProjects(data.projects) } catch (loadError) { setError(loadError.message) }
    }

    loadProjects()
  }, [])

  async function createProject(event) {
    event.preventDefault()
    try { const data = await apiRequest('/projects', { method: 'POST', body: JSON.stringify(form) }); setProjects((current) => [data.project, ...current]); setForm({ name: '', description: '', color: 'teal' }); setError('') } catch (createError) { setError(createError.message) }
  }

  async function archiveProject(projectId) {
    try { await apiRequest(`/projects/${projectId}`, { method: 'DELETE' }); setProjects((current) => current.filter((project) => project.id !== projectId)) } catch (archiveError) { setError(archiveError.message) }
  }

  async function updateProject(project) {
    try {
      const data = await apiRequest(`/projects/${project.id}`, { method: 'PATCH', body: JSON.stringify(project) })
      setProjects((current) => current.map((item) => item.id === project.id ? data.project : item))
      setEditingId(null)
    } catch (updateError) { setError(updateError.message) }
  }

  const visibleProjects = projects.filter((project) => `${project.name} ${project.description}`.toLowerCase().includes(search.toLowerCase()))

  return <section className="page-content"><p className="eyebrow">Organize the work</p><h1>Projects with purpose.</h1><p className="dashboard-lede">Group related tasks into clear spaces without losing the flexibility of your personal task list.</p><form className="project-form" onSubmit={createProject}><input aria-label="Project name" placeholder="Project name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /><input aria-label="Project description" placeholder="Short description (optional)" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /><select aria-label="Project color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })}><option value="teal">Teal</option><option value="blue">Blue</option><option value="gold">Gold</option><option value="coral">Coral</option><option value="violet">Violet</option></select><button className="primary-button" type="submit">Create project</button></form><input className="project-search" aria-label="Search projects" placeholder="Search projects" value={search} onChange={(event) => setSearch(event.target.value)} />{error && <p className="form-error">{error}</p>}<div className="project-grid">{visibleProjects.length === 0 ? <p className="empty-state">{projects.length ? 'No projects match your search.' : 'No projects yet. Create your first project above.'}</p> : visibleProjects.map((project) => <ProjectCard key={project.id} project={project} isEditing={editingId === project.id} onEdit={() => setEditingId(project.id)} onSave={updateProject} onArchive={() => archiveProject(project.id)} />)}</div></section>
}

function ProjectCard({ project, isEditing, onEdit, onSave, onArchive }) {
  const [form, setForm] = useState(project)
  if (isEditing) return <article className={`project-card ${project.color}`}><input aria-label="Edit project name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><textarea aria-label="Edit project description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /><select aria-label="Edit project color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })}><option value="teal">Teal</option><option value="blue">Blue</option><option value="gold">Gold</option><option value="coral">Coral</option><option value="violet">Violet</option></select><div><button className="primary-button" onClick={() => onSave(form)} type="button">Save</button><button className="delete-button" onClick={onEdit} type="button">Cancel</button></div></article>
  return <article className={`project-card ${project.color}`}><span className="card-kicker">{project.taskCount} tasks · {project.completedTaskCount} done · {project.completionPercentage}%</span><h2>{project.name}</h2><p>{project.description || 'No description yet.'}</p><div className="project-progress"><span style={{ width: `${project.completionPercentage}%` }} /></div><div><Link className="project-link" to={`/projects/${project.id}`}>Open project</Link><button className="delete-button" onClick={onEdit} type="button">Edit</button><button className="delete-button" onClick={onArchive} type="button">Archive</button></div></article>
}

export default Projects