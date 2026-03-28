# System Design Document - TaskFlow

Documento técnico para desenvolvedores detalhando fluxos de dados, algoritmos, APIs e interfaces.

## 📚 Documentação Relacionada

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Estrutura técnica
- [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) - Edge Functions
- [COMPONENTES.md](./COMPONENTES.md) - Referência de componentes
- [pwa-push.md](./pwa-push.md) - Blueprint PWA e Push
- [onesignal.md](./onesignal.md) - Integração OneSignal

---

## 1. Arquitetura Geral

```
┌─────────────────────────────────────────────────┐
│                  FRONTEND (React)                │
│  Pages → Components → Hooks → Supabase Client   │
└─────────────┬───────────────────────┬────────────┘
              │ REST/Realtime         │ Edge Functions
              ▼                       ▼
┌─────────────────────────────────────────────────┐
│              LOVABLE CLOUD (Supabase)            │
│  PostgreSQL │ Auth │ Storage │ Realtime │ Edge   │
└─────────────────────────────────────────────────┘
              │
              ▼ (via Edge Functions)
┌─────────────────────────────────────────────────┐
│            SERVIÇOS EXTERNOS                     │
│  Lovable AI │ OneSignal │ Evolution API (WhatsApp)│
└─────────────────────────────────────────────────┘
```

---

## 2. Fluxo de Autenticação

```
Landing → Auth Component
  ├── signUp(email, password) → Supabase Auth
  │   └── Email de verificação → Confirma → Login
  ├── signIn(email, password) → Supabase Auth
  │   └── Session JWT → AuthContext (user, session)
  └── resetPassword → ForgotPassword → Email → ResetPassword
  
AuthContext provê:
  - user: User | null
  - session: Session | null
  - loading: boolean
  
ProtectedRoute verifica session antes de renderizar páginas autenticadas.
```

---

## 3. Fluxo de Dados: Kanban

### Leitura
```
Index.tsx
  └── useIndexData() → useTasks() + useCategories() + useColumns() + useTags()
      └── useTasks():
          1. fetchTasks() via Supabase SELECT com filtro user_id
          2. Realtime subscription em "tasks" (INSERT/UPDATE/DELETE)
          3. Merge manual: preservar recurrence_rule, track_metrics, metric_type
          4. Estado local: tasks[], loading, error
```

### Escrita (Drag & Drop)
```
KanbanDesktopView → @dnd-kit DndContext
  └── onDragEnd:
      1. Atualização otimista do estado local
      2. UPDATE task SET column_id, position
      3. batch_update_positions() para reordenar
      4. Se erro: revert otimista + fetchTasks()
```

### Criação de Tarefa
```
TaskModal (onSave)
  1. Validar campos obrigatórios
  2. INSERT em tasks
  3. Se recurrence_rule: salvar JSON de recorrência
  4. Se subtasks: salvar JSON de subtarefas
  5. Atualização otimista do estado
  6. Registrar em activity_log
```

---

## 4. Fluxo de Dados: Notas

### Arquitetura do Editor
```
Notes.tsx
  └── NoteEditor (orquestrador)
      ├── NoteEditorHeader (título, cor, links)
      ├── NoteEditorContent (TipTap editor)
      │   └── Extensões: StarterKit, TaskBlock, Backlink, HeadingWithId,
      │       PriorityBadge, Table, Image, Link, CodeBlockLowlight
      └── NoteEditorFooter (palavras, ações, save)
      
useNoteEditorState: Estado local (title, content, color, linkedTaskId)
useNoteTaskSync: Sincronização bidirecional task ↔ nota via Realtime
```

### Fluxo de Salvamento
```
1. Usuário edita → hasUnsavedChanges.current = true
2. Ctrl+Enter ou botão Salvar → handleSave()
3. onUpdate(noteId, updates) → Supabase UPDATE
4. Atualização otimista no estado
5. Guard de navegação: UnsavedChangesDialog se mudar de nota com changes
```

### Carregamento On-Demand de Content
```
1. fetchNotes() → SELECT sem content (performance)
2. Ao selecionar nota → fetchNoteContent(noteId)
3. Content cacheado no estado local
4. Realtime: preserva content já cacheado via contentMap
```

---

## 5. Fluxo de Dados: Realtime

### Estratégia de Merge
```
Problema: Realtime envia payloads parciais → campos faltantes viram null
Solução: Merge manual campo a campo

// useTasks.ts — evento UPDATE
setTasks(prev => prev.map(t => 
  t.id === updated.id ? {
    ...t,
    ...updated,
    // Preservar campos que podem vir como null no payload parcial
    recurrence_rule: updated.recurrence_rule ?? t.recurrence_rule,
    track_metrics: updated.track_metrics ?? t.track_metrics,
    metric_type: updated.metric_type ?? t.metric_type,
  } : t
));

// useNotes.ts — fetchNotes
setNotes(prev => {
  const contentMap = new Map(prev.filter(n => n.content !== null).map(n => [n.id, n.content]));
  return newNotes.map(n => ({ ...n, content: contentMap.get(n.id) ?? null }));
});
```

---

## 6. Sistema de IA

### Modelos Utilizados (via Lovable AI — sem API key)
```
Edge Function → fetch("https://api.lovable.dev/v1/ai", {
  headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
  body: { model: "google/gemini-2.5-flash", messages: [...] }
})
```

### Funções com IA
| Edge Function | Modelo | Uso |
|---------------|--------|-----|
| ai-subtasks | gemini-2.5-flash | Sugerir subtarefas |
| format-note | gemini-2.5-flash | Melhorar formatação de nota |
| productivity-insights | gemini-2.5-flash | Insights de produtividade |
| daily-assistant | gemini-2.5-flash | Resumo diário |
| suggest-tools | gemini-2.5-flash | Sugerir ferramentas |
| suggest-tool-alternatives | gemini-2.5-flash | Alternativas de ferramentas |
| generate-tool-description | gemini-2.5-flash | Descrição de ferramenta |
| parse-course-modules | gemini-2.5-flash | Parsear módulos de curso |

---

## 7. Sistema Push / PWA

### Provedores
```
1. OneSignal (externo) — configurável via Settings
2. Service Worker nativo — sw-push.js com VAPID keys
```

### Fluxo iOS
```
1. Solicitar permissão de notificação
2. Buffer de 2 segundos (iOS requirement)
3. Login/registro
4. Push subscription
5. Fallback: external_id primeiro, depois tags
```

Detalhes completos em [pwa-push.md](./pwa-push.md) e [onesignal.md](./onesignal.md).

---

## 8. Offline e Sincronização

```
useOnlineStatus → detecta online/offline

Quando OFFLINE:
  1. Operação enfileirada em offlineSync.queueOperation()
  2. Dados salvos em IndexedDB (lib/sync/indexedDB.ts)
  3. Toast informando "salvo offline"

Quando ONLINE (reconexão):
  1. syncManager detecta reconexão
  2. Processa fila de operações pendentes
  3. Resolve conflitos (last-write-wins)
  4. Atualiza estado local
```

---

## 9. Padrões de Segurança

| Camada | Mecanismo |
|--------|-----------|
| Autenticação | Supabase Auth (JWT) |
| Autorização | RLS em todas as tabelas |
| Edge Functions | Validação de JWT + user_id |
| API Keys | Armazenadas criptografadas no banco |
| Input | Validação com Zod |
| XSS | Sanitização via TipTap |
| CSRF | Tokens automáticos do Supabase |

---

## 10. Tabelas com Realtime Habilitado

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.columns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
```

---

*Última atualização: 28 de Março de 2026*
