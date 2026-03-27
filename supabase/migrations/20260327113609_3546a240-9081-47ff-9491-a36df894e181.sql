
-- tasks FKs
ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_column FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_tasks_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_tasks_mirror FOREIGN KEY (mirror_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_tasks_linked_note FOREIGN KEY (linked_note_id) REFERENCES notes(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_tasks_linked_course FOREIGN KEY (linked_course_id) REFERENCES courses(id) ON DELETE SET NULL;

-- notes FKs
ALTER TABLE notes
  ADD CONSTRAINT fk_notes_notebook FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_notes_linked_task FOREIGN KEY (linked_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_notes_linked_course FOREIGN KEY (linked_course_id) REFERENCES courses(id) ON DELETE SET NULL;

-- categories FK (self-reference)
ALTER TABLE categories
  ADD CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE;

-- cost_items FK
ALTER TABLE cost_items
  ADD CONSTRAINT fk_cost_items_theme FOREIGN KEY (theme_id) REFERENCES cost_themes(id) ON DELETE CASCADE;

-- habit_checkins FK
ALTER TABLE habit_checkins
  ADD CONSTRAINT fk_habit_checkins_habit FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE;

-- courses FK
ALTER TABLE courses
  ADD CONSTRAINT fk_courses_linked_task FOREIGN KEY (linked_task_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- task_completion_logs FK
ALTER TABLE task_completion_logs
  ADD CONSTRAINT fk_completion_logs_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

-- pomodoro_sessions FK
ALTER TABLE pomodoro_sessions
  ADD CONSTRAINT fk_pomodoro_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- shared_notes FK
ALTER TABLE shared_notes
  ADD CONSTRAINT fk_shared_notes_note FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE;

-- tool_function_assignments FKs
ALTER TABLE tool_function_assignments
  ADD CONSTRAINT fk_tfa_tool FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_tfa_function FOREIGN KEY (function_id) REFERENCES tool_functions(id) ON DELETE CASCADE;
