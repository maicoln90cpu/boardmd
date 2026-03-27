
Objetivo: corrigir a quebra imediata de `/notes` e preparar uma execução segura para a auditoria de responsividade/UI sem aplicar mudanças ainda.

1. Corrigir a quebra de `/notes`
- Remover o uso de `useBlocker` em `src/pages/Notes.tsx`, porque o app usa `BrowserRouter` + `Routes` em `src/App.tsx`, não um data router.
- Substituir o bloqueio por uma estratégia compatível:
  - interceptar troca de nota localmente
  - interceptar cliques de navegação da própria UI de Notes/Sidebar quando houver alterações não salvas
  - manter `beforeunload` no editor para refresh/fechar aba
- Garantir que o `UnsavedChangesDialog` continue funcionando sem depender do router blocker.

2. Ajustar o fluxo de “alterações não salvas”
- Em `Notes.tsx`, centralizar uma ação pendente genérica:
  - trocar nota
  - navegar para outra rota
  - fechar editor em mobile
- Em `NoteEditor.tsx` e `useNoteEditorState.ts`, manter apenas detecção de dirty state + save manual.
- Revisar o evento `save-current-note` para garantir que “Salvar e sair” salve antes de executar a ação pendente.

3. Responsividade e UI/UX — pontos críticos identificados
- `src/pages/Notes.tsx`
  - colunas desktop com `w-64` e `w-72` fixos sem estratégia clara de compressão; precisa `min-w-0` e possível ajuste para widths responsivos
  - botões pequenos (`h-7 w-7`, `h-8 w-8`) na sidebar e troca de visualização
- `src/components/notes/NotebooksList.tsx`
  - ações com `h-5 w-5` e `h-7 w-7`, ruins para touch
  - cabeçalho compacto demais em mobile/tablet
- `src/components/notes/VirtualizedNotebooksList.tsx`
  - repete os mesmos problemas de targets pequenos
- `src/components/notes/RichTextToolbar.tsx`
  - usa `overflow-x-auto`; isso conflita com a regra do projeto de evitar scroll horizontal
  - vários botões pequenos e alta densidade visual
- `src/components/notes/NoteEditorHeader.tsx`
  - linha superior pode estourar em telas intermediárias; precisa quebrar em blocos/linhas
- `src/components/notes/MobileNotesLayout.tsx`
  - mistura comportamentos antigos de save/volta que precisam ser alinhados com o novo fluxo sem autosave

4. Abordagem recomendada para a próxima implementação
- Fase A: estabilização
  - corrigir `/notes`
  - validar fluxo de unsaved changes em desktop/mobile
- Fase B: responsividade estrutural de Notes
  - aumentar touch targets para mínimo 44px no mobile
  - remover dependência de scroll horizontal na toolbar
  - aplicar `min-w-0`, `overflow-hidden`, `truncate/line-clamp` onde faltar
  - reorganizar header/editor para tablet
- Fase C: estados de interface
  - padronizar empty states usando `EmptyState`
  - melhorar loading/error states com mensagens mais claras e feedback visual
  - revisar `aria-label`, `title`, foco e contraste nos controles principais

5. O que muda na prática
- Antes:
  - `/notes` quebra por incompatibilidade de roteador
  - vários controles são pequenos demais
  - há risco de overflow e inconsistência entre mobile/tablet/desktop
- Depois:
  - `/notes` volta a abrir normalmente
  - proteção de saída continua funcionando sem quebrar a rota
  - base pronta para endurecer responsividade e UX de Notes

6. Vantagens
- Corrige o erro crítico sem exigir refactor do roteamento global
- Mantém a proteção contra perda de conteúdo
- Reduz risco de regressão ao atacar primeiro a causa real da quebra

7. Desvantagens
- Sem `useBlocker`, o bloqueio de navegação interna precisa ser controlado manualmente nas ações da UI
- Se houver navegações disparadas fora dos pontos interceptados pela interface, será preciso ampliar a cobertura depois

8. Viabilidade e impacto
- Banco de dados: não
- Código-fonte: sim
- Política de negócio: não
- Risco estimado: médio
- Complexidade técnica: 6/10

9. Pontuação de risco
- Correção da quebra em `/notes`: 7/10
- Ajuste do fluxo de saída sem `useBlocker`: 6/10
- Preparação para responsividade de Notes: 5/10
- Total: 18/30
- Limite seguro proposto: 20/30
- Status: dentro do limite seguro

10. Checklist manual de validação
- Abrir `/notes` e confirmar que a página carrega sem tela de erro
- Editar uma nota e clicar em outra nota: dialog deve aparecer
- Editar uma nota e tentar sair pela navegação da interface: dialog deve aparecer
- Editar uma nota e recarregar/fechar a aba: prompt nativo deve aparecer
- Salvar a nota e navegar novamente: não deve aparecer dialog
- Testar em mobile, tablet e desktop se a tela abre corretamente sem overflow evidente inicial

11. Próximas fases
- Fase A: corrigir `/notes` e estabilizar unsaved changes
- Fase B: auditoria executiva de responsividade da área de Notas
- Fase C: padronização global de touch targets, empty/loading/error states e acessibilidade nas páginas principais
