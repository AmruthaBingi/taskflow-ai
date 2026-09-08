const { getSql } = require('../config/db');

const priorities = new Set(['low', 'medium', 'high']);
const statuses = new Set(['todo', 'in-progress', 'done']);

function serializeTask(task) {
  const dueDate = task.due_date instanceof Date
    ? `${task.due_date.getFullYear()}-${String(task.due_date.getMonth() + 1).padStart(2, '0')}-${String(task.due_date.getDate()).padStart(2, '0')}`
    : task.due_date;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    dueDate,
    completed: task.completed,
    projectId: task.project_id,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  };
}

function validateTaskFields({ priority, status, dueDate }) {
  if (priority !== undefined && !priorities.has(priority)) return 'Priority must be low, medium, or high';
  if (status !== undefined && !statuses.has(status)) return 'Status must be todo, in-progress, or done';
  if (dueDate !== undefined && dueDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return 'Due date must use YYYY-MM-DD format';
  return null;
}

async function verifyProject(projectId, userId, allowNull = true) {
  if (projectId === null && allowNull) return true;
  if (!projectId) return false;
  const projects = await getSql()`
    SELECT id FROM projects
    WHERE id = ${projectId} AND user_id = ${userId} AND archived = FALSE
  `;
  return projects.length > 0;
}

async function listTasks(request, response) {
  const { projectId, priority, status, due, search, sort = 'newest' } = request.query;
  const conditions = ['user_id = $1'];
  const values = [request.user.id];
  let parameterIndex = 2;

  if (projectId === 'unassigned') conditions.push('project_id IS NULL');
  else if (projectId) { conditions.push(`project_id = $${parameterIndex}`); values.push(projectId); parameterIndex += 1; }
  if (priorities.has(priority)) { conditions.push(`priority = $${parameterIndex}`); values.push(priority); parameterIndex += 1; }
  if (statuses.has(status)) { conditions.push(`status = $${parameterIndex}`); values.push(status); parameterIndex += 1; }
  if (search?.trim()) { conditions.push(`(title ILIKE $${parameterIndex} OR description ILIKE $${parameterIndex})`); values.push(`%${search.trim()}%`); parameterIndex += 1; }
  if (due === 'today') conditions.push('due_date = CURRENT_DATE');
  if (due === 'upcoming') conditions.push('due_date > CURRENT_DATE');
  if (due === 'overdue') conditions.push("due_date < CURRENT_DATE AND status <> 'done'");
  if (due === 'none') conditions.push('due_date IS NULL');

  const orderBy = sort === 'oldest'
    ? 'created_at ASC'
    : sort === 'due' ? 'due_date ASC NULLS LAST, created_at DESC'
      : sort === 'priority' ? "CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC"
        : 'created_at DESC';
  const tasks = await getSql().query(`
    SELECT id, title, description, priority, status, due_date, completed, project_id, created_at, updated_at
    FROM tasks WHERE ${conditions.join(' AND ')} ORDER BY ${orderBy}
  `, values);
  return response.json({ tasks: tasks.map(serializeTask) });
}

async function getTaskStats(request, response) {
  const stats = await getSql()`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'done')::int AS completed,
      COUNT(*) FILTER (WHERE status <> 'done')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'in-progress')::int AS in_progress,
      COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status <> 'done')::int AS overdue
    FROM tasks WHERE user_id = ${request.user.id}
  `;
  const result = stats[0];
  return response.json({ total: result.total, completed: result.completed, pending: result.pending, inProgress: result.in_progress, overdue: result.overdue, completionPercentage: result.total ? Math.round((result.completed / result.total) * 100) : 0 });
}

async function createTask(request, response) {
  const { title: rawTitle, description: rawDescription, priority = 'medium', status = 'todo', dueDate = null, projectId = null } = request.body;
  const title = rawTitle?.trim();
  const description = rawDescription?.trim() || '';
  const validationError = validateTaskFields({ priority, status, dueDate });
  if (!title) return response.status(400).json({ message: 'Task title is required' });
  if (title.length > 200) return response.status(400).json({ message: 'Task title must be 200 characters or fewer' });
  if (validationError) return response.status(400).json({ message: validationError });
  if (!(await verifyProject(projectId, request.user.id))) return response.status(404).json({ message: 'Project not found' });

  const tasks = await getSql()`
    INSERT INTO tasks (user_id, project_id, title, description, priority, status, due_date, completed)
    VALUES (${request.user.id}, ${projectId}, ${title}, ${description}, ${priority}, ${status}, ${dueDate}, ${status === 'done'})
    RETURNING id, title, description, priority, status, due_date, completed, project_id, created_at, updated_at
  `;
  return response.status(201).json({ task: serializeTask(tasks[0]) });
}

async function updateTask(request, response) {
  const { id } = request.params;
  const { title: rawTitle, description: rawDescription, priority, status: rawStatus, dueDate, projectId, completed } = request.body;
  const status = rawStatus ?? (typeof completed === 'boolean' ? (completed ? 'done' : 'todo') : undefined);
  const title = rawTitle?.trim();
  const validationError = validateTaskFields({ priority, status, dueDate });
  if (validationError) return response.status(400).json({ message: validationError });
  if (title !== undefined && (!title || title.length > 200)) return response.status(400).json({ message: 'Task title must be between 1 and 200 characters' });
  if (projectId !== undefined && !(await verifyProject(projectId, request.user.id))) return response.status(404).json({ message: 'Project not found' });

  const fields = [];
  const values = [id, request.user.id];
  const addField = (column, value) => { values.push(value); fields.push(`${column} = $${values.length}`); };
  if (title !== undefined) addField('title', title);
  if (rawDescription !== undefined) addField('description', rawDescription.trim());
  if (priority !== undefined) addField('priority', priority);
  if (status !== undefined) { addField('status', status); addField('completed', status === 'done'); }
  if (dueDate !== undefined) addField('due_date', dueDate);
  if (projectId !== undefined) addField('project_id', projectId);
  if (fields.length === 0) return response.status(400).json({ message: 'Provide a task change' });
  fields.push('updated_at = NOW()');

  const tasks = await getSql().query(`
    UPDATE tasks SET ${fields.join(', ')}
    WHERE id = $1 AND user_id = $2
    RETURNING id, title, description, priority, status, due_date, completed, project_id, created_at, updated_at
  `, values);
  if (tasks.length === 0) return response.status(404).json({ message: 'Task not found' });
  return response.json({ task: serializeTask(tasks[0]) });
}

async function deleteTask(request, response) {
  const deleted = await getSql()`DELETE FROM tasks WHERE id = ${request.params.id} AND user_id = ${request.user.id} RETURNING id`;
  if (deleted.length === 0) return response.status(404).json({ message: 'Task not found' });
  return response.status(204).send();
}

module.exports = { createTask, deleteTask, getTaskStats, listTasks, updateTask };
