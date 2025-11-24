-- Criar trigger para sincronização bidirecional de tarefas espelhadas
-- Este trigger executa após qualquer UPDATE em tasks e sincroniza automaticamente
-- os dados entre tarefa original e espelho (funciona em ambas direções)

CREATE TRIGGER sync_mirrored_tasks_trigger
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_mirrored_tasks();

-- Comentário explicativo
COMMENT ON TRIGGER sync_mirrored_tasks_trigger ON public.tasks IS 
  'Sincroniza automaticamente dados entre tarefas espelhadas (bidirecional). 
   Quando uma tarefa com mirror_task_id é atualizada, seus dados são copiados 
   para a tarefa espelhada, mantendo ambas sincronizadas.';