
Plano: auditoria corretiva do /calendar com foco em travamento visual após mudança de rota

Diagnóstico da auditoria
- As correções anteriores já estão no código:
  - `Calendar.tsx` já usa `overflow-auto`
  - `DraggableTask` já não usa `touch-none`
  - o calendário mensal/semanal já usa `DndContext id="calendar-dnd"`
- Mesmo assim, o bug pode persistir porque o problema mais provável não é só “toque bloqueado”, mas sim ciclo de vida da rota + cleanup incompleto do calendário.
- Há um ponto importante: o `fullscreen-calendar.tsx` ainda mantém lógica de drag espalhada por mais de um ramo visual, e o calendário continua sendo um componente muito “stateful”, com overlays, drag, filtros e lista mobile no mesmo subtree.
- O sintoma “URL muda mas a tela continua no calendário” indica fortemente uma destas causas:
  1. o componente de calendário não está desmontando corretamente ao trocar de rota
  2. algum subtree do calendário continua visualmente montado por falta de remount/cleanup
  3. o DnD / listeners globais continuam vivos após a navegação e impedem repaint/atualização visual

Teste interno
- Tentei validar no browser tool, mas a sessão abriu em `/auth`, então não foi possível reproduzir autenticado por esse canal.
- A evidência prática veio da leitura do código + session replay do preview do usuário, então a próxima correção precisa ser estrutural, não incremental.

Implementação proposta
1. Forçar desmontagem real ao sair do calendário
- Em `App.tsx`, usar `useLocation()` dentro do conteúdo roteado e keyear o container das rotas por `location.pathname` ou `location.key`.
- Objetivo: garantir unmount/mount completo ao trocar de rota, evitando que o subtree do calendário sobreviva visualmente.

2. Unificar o DnD do calendário de verdade
- Em `src/components/ui/fullscreen-calendar.tsx`, mover toda a árvore visual do calendário para dentro de um único `DndContext` estável no topo do componente.
- Eliminar qualquer ramo separado com contexto próprio e centralizar `DragOverlay`, `handleDragStart` e `handleDragEnd`.
- Adicionar cleanup explícito no unmount:
  - reset de `activeTask`
  - reset de expansões mobile
  - reset de seleção temporária se necessário

3. Blindar o calendário contra persistência de estado após navegação
- Em `src/pages/Calendar.tsx`, usar `useLocation()` e limpar estados transitórios quando a rota deixar `/calendar`:
  - `selectedDate`
  - `isTaskModalOpen`
  - `editingTask`
  - `newTaskDate`
- Se necessário, keyear o próprio `FullScreenCalendar` por pathname para forçar reinicialização total.

4. Separar overlays/diálogos do estado visual principal
- Revisar os `Dialog` e listas expansíveis do calendário para garantir que nada continue montado fora do fluxo após navegação.
- Prioridade:
  - dialog do dia selecionado
  - `TaskModal`
  - `DragOverlay`
  - lista mobile expandida

5. Instrumentação temporária para confirmar desmontagem
- Adicionar logs temporários de mount/unmount em:
  - `Calendar.tsx`
  - `FullScreenCalendar.tsx`
  - `RouterContent` / shell das rotas
- Isso serve para provar se a navegação está trocando rota sem desmontar a tela anterior.

6. Validação cruzada em outras rotas pesadas
- Depois de corrigir o calendário, repetir o mesmo padrão de auditoria em páginas com estrutura semelhante:
  - `Notes.tsx`
  - `Index.tsx` / Kanban
- Não para mudar tudo agora, mas para evitar repetir o mesmo problema em módulos com DnD e layout complexo.

Arquivos a revisar/alterar
- `src/App.tsx`
- `src/pages/Calendar.tsx`
- `src/components/ui/fullscreen-calendar.tsx`

Resultado esperado
- Entrar em `/calendar`
- Clicar em qualquer outra rota
- URL muda e a tela efetivamente troca no mesmo instante
- sem ficar “presa” no calendário
- funcionando em desktop e mobile

Checklist de validação
- Abrir `/calendar` e navegar para `/`, `/notes`, `/pomodoro`, `/config`
- Repetir ida e volta: `/calendar` → outra rota → `/calendar`
- Testar no mobile com menu hambúrguer
- Testar com visualização mês, semana e dia
- Testar com dialog de dia aberto e também com modal de tarefa aberto
- Testar após arrastar tarefa no calendário e depois navegar

Observação de abordagem
- Como o bug já resistiu a 4 tentativas, eu não seguiria mais com ajustes cosméticos.
- A correção agora deve ser feita como “hard fix” de ciclo de vida: remount forçado da rota + cleanup explícito do calendário + DnD único e previsível.
