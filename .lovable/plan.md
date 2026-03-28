

# Plano: Correção do Bug Crítico no Editor de Notas + Atualização da Documentação

---

## PARTE 1: Bug Crítico — Editor pisca e apaga texto

### Causa raiz identificada

O fluxo destrutivo é:

```text
1. Usuário está editando uma nota
2. Realtime dispara para QUALQUER mudança em notes (inclusive da própria sessão)
3. fetchNotes() roda e retorna todas as notas com content: null (otimização de listagem)
4. O state notes[] é substituído — a nota selecionada fica com content: null
5. O useEffect de syncWithNote dispara porque note.content mudou
6. syncWithNote chama editor.commands.setContent("") — APAGA TUDO
```

**Arquivo:** `src/hooks/useNotes.ts` — `fetchNotes()` linhas 41-63 retorna `content: null` para todas as notas.  
**Arquivo:** `src/components/notes/hooks/useNoteEditorState.ts` — `syncWithNote` linhas 103-113 aplica `setContent(note.content || "")` sem verificar se o content é null (veio de list fetch).

### Correções

#### 1. `src/hooks/useNotes.ts` — Preservar content ao fazer merge
Em `fetchNotes()`, ao atualizar o state, preservar o `content` que já existe no cache local:

```typescript
// ANTES (linha 53):
const notesWithoutContent: Note[] = (data || []).map(d => ({ ...d, content: null }));
setNotes(notesWithoutContent);

// DEPOIS:
const notesWithoutContent: Note[] = (data || []).map(d => ({ ...d, content: null }));
setNotes(prev => {
  const contentMap = new Map(prev.filter(n => n.content !== null).map(n => [n.id, n.content]));
  return notesWithoutContent.map(n => ({
    ...n,
    content: contentMap.get(n.id) ?? null
  }));
});
```

#### 2. `src/components/notes/hooks/useNoteEditorState.ts` — Ignorar sync quando content é null
Em `syncWithNote`, não sobrescrever o editor se o content vem como `null` (= fetch de lista, sem conteúdo real):

```typescript
// ANTES (linhas 108-109):
if (editor && note.content !== editor.getHTML()) {
  editor.commands.setContent(note.content || "");
}

// DEPOIS:
if (editor && note.content !== null && note.content !== editor.getHTML()) {
  editor.commands.setContent(note.content);
}
```

### Análise de impacto
- **Risco:** 3/10 — mudanças cirúrgicas, não afetam outras áreas
- **Complexidade:** 3/10
- **Total: 6/30** — dentro do limite seguro

---

## PARTE 2: Reorganização e Atualização da Documentação

### Arquivos .md existentes no projeto

| Arquivo | Linhas | Status | Ação |
|---------|--------|--------|------|
| `README.md` | 280 | Desatualizado (v1.2, Jan 2026) | Atualizar e mover para `docs/` |
| `PRD.md` | 370 | Desatualizado (v1.2) | Atualizar e mover |
| `ROADMAP.md` | 246 | Desatualizado | Atualizar e mover |
| `PENDENCIAS.md` | 323 | Desatualizado (changelog parado Jan 2026) | Atualizar e mover |
| `ARCHITECTURE.md` | 726 | Desatualizado (contagens, listagens) | Atualizar e mover |
| `onedoc.md` | 768 | Atual (Fev 2026) | Renomear → `docs/onesignal.md` |
| `pwapush.md` | 1832 | Atual (Fev 2026) | Renomear → `docs/pwa-push.md` |
| `src/__tests__/README.md` | 77 | Desatualizado | Atualizar in-place |
| `.lovable/plan.md` | 96 | Interno Lovable | Não mover |

### Novos arquivos a criar

| Arquivo | Descrição |
|---------|-----------|
| `docs/SYSTEM_DESIGN.md` | Arquitetura de dados, fluxos, APIs, Edge Functions, Realtime |
| `docs/EDGE_FUNCTIONS.md` | Documentação de cada uma das 19 Edge Functions com endpoints, payloads, respostas |
| `docs/COMPONENTES.md` | Guia dos componentes principais (não Storybook, mas referência textual com props e uso) |

### Conteúdo a atualizar em cada documento

**README.md**: versão → 1.3, data → Março 2026, stack atualizada (19 edge functions, ~120 componentes, 50+ hooks), links internos apontando para `docs/`, novos scripts

**PRD.md**: features implementadas desde Jan 2026 (Eisenhower, Custos, Cursos, Hábitos, Ferramentas/API Keys, WhatsApp, Retrospectiva, Weekly Reviews, Goals, Achievements), backlog atualizado

**ROADMAP.md**: Q1 2026 → marcar entregas feitas, Q2-Q4 mantido, data de atualização → Março 2026

**PENDENCIAS.md**: changelog com entradas de Fev-Mar 2026 (fases A-D de auditoria, fix de estado de tarefas, padronização de código), bugs conhecidos atualizados

**ARCHITECTURE.md**: contagens atualizadas (~120 componentes, 50+ hooks, 20 páginas, 19 edge functions), novos diretórios (costs/, courses/, tools/, whatsapp/), novos contextos (ColorTheme, SavingTasks)

### Links cruzados

Todos os documentos terão uma seção "Documentação Relacionada" no topo com links relativos atualizados para a nova estrutura `docs/`.

O `README.md` raiz será mantido como cópia simplificada (setup + link para docs/) para quem clona o repositório.

### Knowledge prompt

Após implementação, enviarei um prompt completo e atualizado para inserir no knowledge do projeto.

### Análise de impacto
- **Risco:** 1/10 — apenas arquivos de documentação
- **Complexidade:** 4/10 — volume de texto a atualizar
- **Total: 5/30** — dentro do limite seguro

---

## Resumo de execução

1. **Corrigir o bug do editor** (2 arquivos, ~10 linhas alteradas)
2. **Criar pasta `docs/`** e mover/renomear os .md
3. **Atualizar conteúdo** de cada documento com dados atuais
4. **Criar novos documentos** (SYSTEM_DESIGN, EDGE_FUNCTIONS, COMPONENTES)
5. **Atualizar `src/__tests__/README.md`** in-place
6. **Enviar knowledge prompt** atualizado no chat

### Checklist manual pós-implementação
- [ ] Abrir `/notes`, editar uma nota e esperar 30+ segundos — texto NÃO deve desaparecer
- [ ] Editar uma nota, navegar pela sidebar, voltar — conteúdo preservado
- [ ] Verificar que `docs/` contém todos os .md reorganizados
- [ ] Confirmar que links cruzados entre documentos funcionam
- [ ] Validar que `README.md` raiz aponta para `docs/`

### Vantagens
- Corrige perda de dados crítica no editor
- Documentação centralizada e atualizada
- Referência técnica para desenvolvedores (System Design)

### Desvantagens
- Volume grande de texto para revisar/validar
- Documentação precisa de manutenção contínua

