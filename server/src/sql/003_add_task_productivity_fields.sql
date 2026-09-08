ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS priority VARCHAR(10) NOT NULL DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'todo',
ADD COLUMN IF NOT EXISTS due_date DATE;

UPDATE tasks
SET status = 'done'
WHERE completed = TRUE AND status = 'todo';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_priority_check') THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_status_check') THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('todo', 'in-progress', 'done'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS tasks_user_status_idx
ON tasks (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS tasks_user_due_date_idx
ON tasks (user_id, due_date);