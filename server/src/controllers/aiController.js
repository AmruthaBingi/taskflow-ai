const { getSql } = require('../config/db');
const { breakDownGoal, generateInsights, improveTask, suggestPriority } = require('../services/aiService');

const maxInputLength = 2000;

function requireText(value, label) {
  const text = value?.trim();
  if (!text) return `${label} is required`;
  if (text.length > maxInputLength) return `${label} is too long`;
  return null;
}

async function taskBreakdown(request, response) {
  const { goal, projectId } = request.body;
  const validationError = requireText(goal, 'Goal');
  if (validationError) return response.status(400).json({ message: validationError });
  let projectName = '';
  let projectDescription = '';
  if (projectId) {
    const projects = await getSql()`SELECT name, description FROM projects WHERE id = ${projectId} AND user_id = ${request.user.id}`;
    if (projects.length === 0) return response.status(404).json({ message: 'Project not found' });
    projectName = projects[0].name;
    projectDescription = projects[0].description;
  }
  return response.json(await breakDownGoal(goal.trim(), { name: projectName, description: projectDescription }));
}

async function improveTaskController(request, response) {
  const titleError = requireText(request.body.title, 'Task title');
  if (titleError) return response.status(400).json({ message: titleError });
  const description = request.body.description?.trim() || '';
  if (description.length > maxInputLength) return response.status(400).json({ message: 'Task description is too long' });
  return response.json(await improveTask({ title: request.body.title.trim(), description, priority: request.body.priority || 'medium' }));
}

async function prioritySuggestion(request, response) {
  const titleError = requireText(request.body.title, 'Task title');
  if (titleError) return response.status(400).json({ message: titleError });
  const tasks = await getSql()`SELECT title, status, priority, due_date FROM tasks WHERE user_id = ${request.user.id} AND status <> 'done' ORDER BY due_date ASC NULLS LAST, created_at DESC LIMIT 12`;
  let project = { name: '', description: '' };
  if (request.body.projectId) {
    const projects = await getSql()`SELECT name, description FROM projects WHERE id = ${request.body.projectId} AND user_id = ${request.user.id}`;
    if (projects.length === 0) return response.status(404).json({ message: 'Project not found' });
    project = projects[0];
  }
  return response.json(await suggestPriority({ title: request.body.title.trim(), description: request.body.description?.trim() || '', priority: request.body.priority || 'medium', project, dueDate: request.body.dueDate || null, nearbyTasks: tasks }));
}

async function insights(request, response) {
  const [stats] = await getSql()`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'done')::int AS completed, COUNT(*) FILTER (WHERE status <> 'done')::int AS pending, COUNT(*) FILTER (WHERE status <> 'done' AND priority = 'high')::int AS high_priority_pending, COUNT(*) FILTER (WHERE status <> 'done' AND due_date < CURRENT_DATE)::int AS overdue FROM tasks WHERE user_id = ${request.user.id}`;
  const projects = await getSql()`SELECT p.name, p.archived, COUNT(t.id)::int AS task_count, COUNT(t.id) FILTER (WHERE t.status = 'done')::int AS completed_task_count FROM projects p LEFT JOIN tasks t ON t.project_id = p.id WHERE p.user_id = ${request.user.id} GROUP BY p.id ORDER BY p.created_at DESC LIMIT 20`;
  return response.json(await generateInsights({ stats, projects }));
}

module.exports = { insights, prioritySuggestion, improveTask: improveTaskController, taskBreakdown };