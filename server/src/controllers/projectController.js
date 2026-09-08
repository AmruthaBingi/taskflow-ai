const { getSql } = require('../config/db');

const colors = new Set(['teal', 'blue', 'gold', 'coral', 'violet']);

function serializeProject(project) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    color: project.color,
    archived: project.archived,
    taskCount: Number(project.task_count || 0),
    completedTaskCount: Number(project.completed_task_count || 0),
    completionPercentage: project.task_count ? Math.round((Number(project.completed_task_count || 0) / Number(project.task_count)) * 100) : 0,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  };
}

function validateProject(name, color) {
  if (!name?.trim()) return 'Project name is required';
  if (name.trim().length > 120) return 'Project name must be 120 characters or fewer';
  if (color !== undefined && !colors.has(color)) return 'Invalid project color';
  return null;
}

const projectSelect = `
  SELECT p.id, p.name, p.description, p.color, p.archived, p.created_at, p.updated_at,
    COUNT(t.id)::int AS task_count,
    COUNT(t.id) FILTER (WHERE t.status = 'done')::int AS completed_task_count
  FROM projects p
  LEFT JOIN tasks t ON t.project_id = p.id
`;

async function listProjects(request, response) {
  const includeArchived = request.query.includeArchived === 'true';
  const projects = await getSql().query(`${projectSelect}
    WHERE p.user_id = $1 ${includeArchived ? '' : 'AND p.archived = FALSE'}
    GROUP BY p.id ORDER BY p.created_at DESC
  `, [request.user.id]);
  return response.json({ projects: projects.map(serializeProject) });
}

async function getProject(request, response) {
  const projects = await getSql().query(`${projectSelect}
    WHERE p.id = $1 AND p.user_id = $2
    GROUP BY p.id
  `, [request.params.id, request.user.id]);
  if (projects.length === 0) return response.status(404).json({ message: 'Project not found' });
  return response.json({ project: serializeProject(projects[0]) });
}

async function createProject(request, response) {
  const { name, description = '', color = 'teal' } = request.body;
  const validationError = validateProject(name, color);
  if (validationError) return response.status(400).json({ message: validationError });
  const projects = await getSql()`
    INSERT INTO projects (user_id, name, description, color)
    VALUES (${request.user.id}, ${name.trim()}, ${description.trim()}, ${color})
    RETURNING id, name, description, color, archived, created_at, updated_at
  `;
  return response.status(201).json({ project: serializeProject(projects[0]) });
}

async function updateProject(request, response) {
  const { name, description, color, archived } = request.body;
  const validationError = name !== undefined ? validateProject(name, color) : validateProject('valid', color);
  if (validationError) return response.status(400).json({ message: validationError });
  const fields = [];
  const values = [request.params.id, request.user.id];
  const addField = (column, value) => { values.push(value); fields.push(`${column} = $${values.length}`); };
  if (name !== undefined) addField('name', name.trim());
  if (description !== undefined) addField('description', description.trim());
  if (color !== undefined) addField('color', color);
  if (archived !== undefined) {
    if (typeof archived !== 'boolean') return response.status(400).json({ message: 'Archived must be a boolean' });
    addField('archived', archived);
  }
  if (fields.length === 0) return response.status(400).json({ message: 'Provide a project change' });
  fields.push('updated_at = NOW()');
  const projects = await getSql().query(`
    UPDATE projects SET ${fields.join(', ')}
    WHERE id = $1 AND user_id = $2
    RETURNING id, name, description, color, archived, created_at, updated_at
  `, values);
  if (projects.length === 0) return response.status(404).json({ message: 'Project not found' });
  return response.json({ project: serializeProject(projects[0]) });
}

async function archiveProject(request, response) {
  const projects = await getSql()`
    UPDATE projects SET archived = TRUE, updated_at = NOW()
    WHERE id = ${request.params.id} AND user_id = ${request.user.id}
    RETURNING id
  `;
  if (projects.length === 0) return response.status(404).json({ message: 'Project not found' });
  return response.status(204).send();
}

module.exports = { archiveProject, createProject, getProject, listProjects, updateProject };