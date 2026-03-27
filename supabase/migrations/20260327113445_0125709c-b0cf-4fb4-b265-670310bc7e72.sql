
-- Constraint 1: tasks.priority só aceita low/medium/high ou NULL
ALTER TABLE tasks ADD CONSTRAINT chk_task_priority
  CHECK (priority IS NULL OR priority IN ('low', 'medium', 'high'));

-- Constraint 2: courses.priority só aceita low/medium/high ou NULL
ALTER TABLE courses ADD CONSTRAINT chk_course_priority
  CHECK (priority IS NULL OR priority IN ('low', 'medium', 'high'));

-- Constraint 3: courses.status só aceita valores válidos ou NULL
ALTER TABLE courses ADD CONSTRAINT chk_course_status
  CHECK (status IS NULL OR status IN ('not_started', 'in_progress', 'completed', 'paused'));

-- Constraint 4: courses.total_episodes >= 1 quando definido
ALTER TABLE courses ADD CONSTRAINT chk_episodes_positive
  CHECK (total_episodes IS NULL OR total_episodes >= 1);

-- Constraint 5: courses.total_modules >= 1 quando definido
ALTER TABLE courses ADD CONSTRAINT chk_modules_positive
  CHECK (total_modules IS NULL OR total_modules >= 1);
