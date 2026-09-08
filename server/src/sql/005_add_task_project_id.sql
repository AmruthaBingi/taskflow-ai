ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_project_created_idx
ON tasks (project_id, created_at DESC);