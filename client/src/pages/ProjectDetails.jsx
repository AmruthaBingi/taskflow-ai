import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import TaskBoard from '../components/TaskBoard'
import { apiRequest } from '../lib/api'

function ProjectDetails() {
  const { projectId } = useParams()
  const [project, setProject] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { apiRequest(`/projects/${projectId}`).then((data) => setProject(data.project)).catch((loadError) => setError(loadError.message)) }, [projectId])
  if (error) return <section className="page-content"><p className="form-error">{error}</p><Link className="project-link" to="/projects">Back to projects</Link></section>
  if (!project) return <div className="page-state">Loading project...</div>
  return <section className="page-content"><Link className="back-link" to="/projects">← All projects</Link><p className="eyebrow">Project</p><h1>{project.name}</h1><p className="dashboard-lede">{project.description || 'Keep the work for this project together.'}</p><TaskBoard projectId={project.id} title="Project tasks" /></section>
}

export default ProjectDetails