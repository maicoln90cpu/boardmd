
# Plano: 4 Melhorias - Templates, Categoria, Sync e Indices

## 1. Templates de Notificacao - Consolidacao de Redundancias

### Analise dos templates atuais (categoria "reminder"):

| ID | Nome | Quando dispara | Mensagem |
|---|---|---|---|
| `due_overdue` | Tarefa Atrasada | Ja passou do prazo | "ja passou do prazo" |
| `due_urgent` | Prazo Urgente | <= 1 hora antes | "vence em {{timeRemaining}}" |
| `due_warning` | Prazo Proximo | <= X horas (configuravel) | "vence em {{timeRemaining}}" |
| `due_early` | Prazo se Aproximando | <= 2x horas configuradas | "vence em {{timeRemaining}}" |

**Veredicto:** NAO sao redundantes. Cada um dispara em um momento diferente (overdue, 1h, Xh, 2Xh). Porem `due_urgent`, `due_warning` e `due_early` tem mensagens IDENTICAS, o que confunde o usuario. A solucao e diferenciar melhor as mensagens de cada um.

### Alteracoes propostas em `src/lib/defaultNotificationTemplates.ts`:

| Template | Antes | Depois |
|---|---|---|
| `due_overdue` | "ja passou do prazo" | Manter (unico, claro) |
| `due_urgent` | "vence em {{timeRemaining}}" | "vence em menos de 1 hora! Acao imediata necessaria." |
| `due_warning` | "vence em {{timeRemaining}}" | "vence em {{timeRemaining}}. Organize-se para concluir." |
| `due_early` | "vence em {{timeRemaining}}" | "vence em {{timeRemaining}}. Planeje com antecedencia." |

Isso torna cada template visualmente e semanticamente distinto sem eliminar nenhum (todos sao usados pelo `useDueDateAlerts.ts` em niveis diferentes).

---

## 2. Validacao de Categoria no TaskModal

### Estado atual:
- O `TaskModal` ja tem validacao visual (label vermelha, borda vermelha) e bloqueia no `handleSave` com toast de erro
- A query confirmou: **zero tarefas orfas** no banco (sem category_id nulo ou invalido)
- O botao "Salvar" nao esta desabilitado visualmente quando categoria esta vazia

### Alteracao proposta em `src/components/TaskModal.tsx`:
- Adicionar `disabled={!title.trim() || !selectedCategory}` no botao "Salvar"
- Isso impede o clique e da feedback visual imediato (botao fica cinza/opaco)

---

## 3. Sincronizacao entre App/PWA/Navegadores

### Analise do sistema atual:
- **IndexedDB (`indexedDB.ts`):** Cache local + fila de operacoes pendentes - OK
- **SyncManager (`syncManager.ts`):** Sync periodico (30s) + listener de `online` - OK
- **OfflineSync (`offlineSync.ts`):** Fila em localStorage como fallback - OK
- **BackgroundSync (`backgroundSync.ts`):** Usa Background Sync API quando disponivel - OK
- **Realtime:** Supabase channels para atualizacoes em tempo real - ja implementado nos hooks

### Diagnostico:
O sistema de sincronizacao esta **funcionalmente correto**. A arquitetura cobre:
- Offline -> Online (fila + retry automatico)
- Multi-aba (Supabase Realtime via WebSocket)
- PWA (Service Worker + Background Sync API)

**Nenhuma alteracao necessaria neste item.** O sistema ja esta robusto.

---

## 4. Indices de Performance no Banco de Dados

### Indices existentes vs necessarios:

**Tasks:** Ja bem indexada (user_id, column_id, category_id, due_date, is_completed, is_favorite, linked_note_id, updated_at + compostos).

**Tabelas sem indices adequados:**

| Tabela | Indice faltante | Justificativa |
|---|---|---|
| `goals` | `user_id` | Toda query filtra por user_id (RLS + codigo) |
| `goals` | `(user_id, is_completed)` | Dashboard filtra metas ativas |
| `pomodoro_sessions` | `user_id` | Toda query filtra por user_id |
| `pomodoro_sessions` | `(user_id, started_at DESC)` | Listagem ordenada por data |
| `task_history` | `user_id` | RLS e queries filtram por user_id |
| `whatsapp_logs` | `user_id` | Listagem de logs por usuario |
| `whatsapp_logs` | `(user_id, sent_at DESC)` | Ordenacao cronologica |
| `activity_log` | `(user_id, created_at DESC)` | Listagem de atividades recentes |
| `tasks` | `(user_id, due_date)` composto | Alertas de prazo filtram por user + due_date |
| `tasks` | `(user_id, position)` composto | Ordenacao no kanban |
| `tags` | `user_id` | Listagem de tags do usuario |
| `tools` | `user_id` | Listagem de ferramentas |

---

## Resumo de Arquivos a Modificar

| Arquivo | Alteracao |
|---|---|
| `src/lib/defaultNotificationTemplates.ts` | Diferenciar mensagens dos 3 templates de prazo |
| `src/components/TaskModal.tsx` | Adicionar `disabled` no botao Salvar quando categoria vazia |
| Migration SQL | Criar ~12 indices para tabelas sem cobertura adequada |

## Analise de Impacto

| Item | Risco | Complexidade |
|---|---|---|
| Diferenciar mensagens dos templates | Baixo | 1/10 |
| Desabilitar botao Salvar | Baixo | 1/10 |
| Sync (nenhuma alteracao) | N/A | 0/10 |
| Criar indices no banco | Baixo | 2/10 |
| **Total** | **Baixo** | **4/30 - Bem abaixo do limite seguro** |

### Vantagens
- Templates ficam semanticamente distintos, eliminando confusao
- Botao Salvar desabilitado da feedback visual imediato
- Indices aceleram queries em tabelas que crescem com o uso

### Desvantagens
- Indices ocupam espaco em disco (minimo, desprezivel)
- Usuarios que personalizaram templates manualmente nao serao afetados (templates sao salvos em settings)

## Checklist de Testes Manuais

### Templates:
- [ ] Abrir `/notifications` > Templates
- [ ] Verificar que "Prazo Urgente", "Prazo Proximo" e "Prazo se Aproximando" tem mensagens DIFERENTES entre si
- [ ] Clicar em cada um e confirmar que o corpo da mensagem e unico

### Categoria obrigatoria:
- [ ] Abrir modal "Nova Tarefa"
- [ ] Nao selecionar categoria
- [ ] Verificar que o botao "Salvar" esta DESABILITADO (cinza/opaco)
- [ ] Selecionar uma categoria
- [ ] Verificar que o botao "Salvar" fica HABILITADO
- [ ] Preencher titulo e salvar normalmente

### Performance:
- [ ] Verificar que o app carrega normalmente apos criacao dos indices
- [ ] Navegar pelo kanban, notas e dashboard sem lentidao
