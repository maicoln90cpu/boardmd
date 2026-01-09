-- Trigger para sincronizar linked_note_id quando linked_task_id é alterado nas notas
CREATE OR REPLACE FUNCTION public.sync_note_task_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
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
    WHERE id = NEW.linked_task_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para sincronizar linked_task_id quando linked_note_id é alterado nas tarefas
CREATE OR REPLACE FUNCTION public.sync_task_note_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
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
    WHERE id = NEW.linked_note_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Função para verificar e corrigir inconsistências de integridade
CREATE OR REPLACE FUNCTION public.fix_note_task_integrity()
RETURNS TABLE(fixed_notes integer, fixed_tasks integer, issues_found text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fixed_notes integer := 0;
  v_fixed_tasks integer := 0;
  v_temp_count integer := 0;
  v_issues text[] := ARRAY[]::text[];
BEGIN
  -- Corrigir tarefas com linked_note_id inconsistente
  WITH broken_notes AS (
    SELECT n.id as note_id, n.linked_task_id
    FROM notes n
    LEFT JOIN tasks t ON n.linked_task_id = t.id
    WHERE n.linked_task_id IS NOT NULL
    AND (t.linked_note_id IS NULL OR t.linked_note_id != n.id)
  )
  UPDATE tasks t
  SET linked_note_id = bn.note_id
  FROM broken_notes bn
  WHERE t.id = bn.linked_task_id;
  
  GET DIAGNOSTICS v_temp_count = ROW_COUNT;
  v_fixed_tasks := v_fixed_tasks + v_temp_count;
  
  IF v_temp_count > 0 THEN
    v_issues := array_append(v_issues, format('Corrigidas %s tarefas', v_temp_count));
  END IF;
  
  -- Corrigir notas com linked_task_id inconsistente
  WITH broken_tasks AS (
    SELECT t.id as task_id, t.linked_note_id
    FROM tasks t
    LEFT JOIN notes n ON t.linked_note_id = n.id
    WHERE t.linked_note_id IS NOT NULL
    AND (n.linked_task_id IS NULL OR n.linked_task_id != t.id)
  )
  UPDATE notes n
  SET linked_task_id = bt.task_id
  FROM broken_tasks bt
  WHERE n.id = bt.linked_note_id;
  
  GET DIAGNOSTICS v_temp_count = ROW_COUNT;
  v_fixed_notes := v_fixed_notes + v_temp_count;
  
  IF v_temp_count > 0 THEN
    v_issues := array_append(v_issues, format('Corrigidas %s notas', v_temp_count));
  END IF;
  
  -- Limpar referências órfãs em notas
  UPDATE notes SET linked_task_id = NULL 
  WHERE linked_task_id IS NOT NULL 
  AND linked_task_id NOT IN (SELECT id FROM tasks);
  
  GET DIAGNOSTICS v_temp_count = ROW_COUNT;
  v_fixed_notes := v_fixed_notes + v_temp_count;
  
  -- Limpar referências órfãs em tarefas
  UPDATE tasks SET linked_note_id = NULL 
  WHERE linked_note_id IS NOT NULL 
  AND linked_note_id NOT IN (SELECT id FROM notes);
  
  GET DIAGNOSTICS v_temp_count = ROW_COUNT;
  v_fixed_tasks := v_fixed_tasks + v_temp_count;
  
  IF array_length(v_issues, 1) IS NULL THEN
    v_issues := ARRAY['Nenhuma inconsistência encontrada'];
  END IF;
  
  RETURN QUERY SELECT v_fixed_notes, v_fixed_tasks, v_issues;
END;
$$;

-- Criar triggers nas tabelas
DROP TRIGGER IF EXISTS trigger_sync_note_task_link ON notes;
CREATE TRIGGER trigger_sync_note_task_link
  AFTER UPDATE OF linked_task_id ON notes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_note_task_link();

DROP TRIGGER IF EXISTS trigger_sync_task_note_link ON tasks;
CREATE TRIGGER trigger_sync_task_note_link
  AFTER UPDATE OF linked_note_id ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_task_note_link();