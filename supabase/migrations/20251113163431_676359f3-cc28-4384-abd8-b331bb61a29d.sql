-- Corrigir trigger para não exigir OLD.mirror_task_id
DROP TRIGGER IF EXISTS trigger_sync_mirrored_tasks ON tasks;

CREATE OR REPLACE FUNCTION sync_mirrored_tasks()
RETURNS TRIGGER AS $$
BEGIN
  -- Se tem mirror_task_id, atualizar a tarefa espelhada
  IF NEW.mirror_task_id IS NOT NULL THEN
    UPDATE tasks
    SET
      title = NEW.title,
      description = NEW.description,
      priority = NEW.priority,
      recurrence_rule = NEW.recurrence_rule,
      subtasks = NEW.subtasks,
      tags = NEW.tags,
      updated_at = NEW.updated_at
    WHERE id = NEW.mirror_task_id
    AND id != NEW.id; -- Evita loop infinito
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recriar trigger
CREATE TRIGGER trigger_sync_mirrored_tasks
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION sync_mirrored_tasks();