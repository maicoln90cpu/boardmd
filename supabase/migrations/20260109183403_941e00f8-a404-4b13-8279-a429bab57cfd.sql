-- Drop existing triggers first
DROP TRIGGER IF EXISTS trigger_sync_note_task_link ON notes;
DROP TRIGGER IF EXISTS trigger_sync_task_note_link ON tasks;

-- Recreate sync_note_task_link function with recursion prevention
CREATE OR REPLACE FUNCTION public.sync_note_task_link()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_recursion_flag text;
BEGIN
  -- Check if we're already in a sync operation to prevent infinite recursion
  v_recursion_flag := current_setting('app.syncing_note_task', true);
  IF v_recursion_flag = 'true' THEN
    RETURN NEW;
  END IF;
  
  -- Set flag to prevent recursion
  PERFORM set_config('app.syncing_note_task', 'true', true);
  
  -- Se linked_task_id foi removido (era algo e virou NULL)
  IF OLD.linked_task_id IS NOT NULL AND NEW.linked_task_id IS NULL THEN
    UPDATE tasks
    SET linked_note_id = NULL
    WHERE id = OLD.linked_task_id AND linked_note_id = NEW.id;
  
  -- Se linked_task_id foi adicionado ou alterado
  ELSIF NEW.linked_task_id IS NOT NULL THEN
    -- Limpar a tarefa anterior se existia
    IF OLD.linked_task_id IS NOT NULL AND OLD.linked_task_id != NEW.linked_task_id THEN
      UPDATE tasks
      SET linked_note_id = NULL
      WHERE id = OLD.linked_task_id AND linked_note_id = NEW.id;
    END IF;
    
    -- Atualizar a nova tarefa
    UPDATE tasks
    SET linked_note_id = NEW.id
    WHERE id = NEW.linked_task_id AND (linked_note_id IS NULL OR linked_note_id != NEW.id);
  END IF;
  
  -- Reset flag
  PERFORM set_config('app.syncing_note_task', 'false', true);
  
  RETURN NEW;
END;
$function$;

-- Recreate sync_task_note_link function with recursion prevention
CREATE OR REPLACE FUNCTION public.sync_task_note_link()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_recursion_flag text;
BEGIN
  -- Check if we're already in a sync operation to prevent infinite recursion
  v_recursion_flag := current_setting('app.syncing_note_task', true);
  IF v_recursion_flag = 'true' THEN
    RETURN NEW;
  END IF;
  
  -- Set flag to prevent recursion
  PERFORM set_config('app.syncing_note_task', 'true', true);
  
  -- Se linked_note_id foi removido (era algo e virou NULL)
  IF OLD.linked_note_id IS NOT NULL AND NEW.linked_note_id IS NULL THEN
    UPDATE notes
    SET linked_task_id = NULL
    WHERE id = OLD.linked_note_id AND linked_task_id = NEW.id;
  
  -- Se linked_note_id foi adicionado ou alterado
  ELSIF NEW.linked_note_id IS NOT NULL THEN
    -- Limpar a nota anterior se existia
    IF OLD.linked_note_id IS NOT NULL AND OLD.linked_note_id != NEW.linked_note_id THEN
      UPDATE notes
      SET linked_task_id = NULL
      WHERE id = OLD.linked_note_id AND linked_task_id = NEW.id;
    END IF;
    
    -- Atualizar a nova nota
    UPDATE notes
    SET linked_task_id = NEW.id
    WHERE id = NEW.linked_note_id AND (linked_task_id IS NULL OR linked_task_id != NEW.id);
  END IF;
  
  -- Reset flag
  PERFORM set_config('app.syncing_note_task', 'false', true);
  
  RETURN NEW;
END;
$function$;

-- Recreate triggers
CREATE TRIGGER trigger_sync_note_task_link
  AFTER UPDATE OF linked_task_id ON notes
  FOR EACH ROW
  EXECUTE FUNCTION sync_note_task_link();

CREATE TRIGGER trigger_sync_task_note_link
  AFTER UPDATE OF linked_note_id ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_note_link();