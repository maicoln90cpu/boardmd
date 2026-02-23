
# Plano: 6 Correções - Calendário, Notificações, Cores e Colunas

## 1. Performance da página /notifications (Preferências e Templates)

### Diagnóstico:
A página já usa lazy loading (`React.lazy`), skeleton loaders, e guards de `isLoading`. O gargalo principal é o hook `useSettings` que faz fetch do banco e o `useColumns` (usado em Preferências para listar colunas excluídas). Ambos são chamados independentemente por cada aba.

### Solução:
- Aplicar `React.lazy` nos componentes individuais das abas (`NotificationPreferences`, `NotificationTemplatesEditor`, `NotificationHistory`) para que cada aba só carregue quando clicada
- O `TabsContent` com `forceMount` não será usado - apenas lazy import dos componentes pesados

### Arquivos:
- `src/pages/NotificationsDashboard.tsx`: Lazy-load das abas Preferências, Templates e Histórico

### Risco: Baixo | Complexidade: 2/10

---

## 2. Criação de tarefa pelo calendário - NÃO respeita dados do modal (BUG CRÍTICO)

### Causa raiz:
O `handleCreateTask` em `Calendar.tsx` (linha 353) ignora TODOS os campos que o `TaskModal` envia, exceto `title`, `description`, `due_date` e `priority`. Especificamente:

**Na criação (linhas 383-392):**
- `category_id` é SEMPRE `categories[0]?.id` (primeira categoria), ignorando o que o usuário selecionou no modal
- `column_id` é SEMPRE `columns[0]?.id` (primeira coluna), ignorando seleção
- `tags`, `subtasks`, `recurrence_rule`, `track_metrics`, `track_comments`, `linked_course_id`, `notification_settings` são todos IGNORADOS

**Na edição (linhas 356-364):**
- Só atualiza `title`, `description`, `due_date`, `priority`
- Ignora: `tags`, `category_id`, `column_id`, `subtasks`, `recurrence_rule`, `track_metrics`, `metric_type`, `track_comments`, `linked_course_id`, `notification_settings`

### Solução:
Reescrever `handleCreateTask` para usar TODOS os campos do `taskData` recebido do `TaskModal`.

### Arquivos:
- `src/pages/Calendar.tsx`: Reescrever `handleCreateTask` completo

### Risco: Baixo | Complexidade: 3/10

---

## 3. Edição de tarefas pelo calendário (BUG)

### Causa raiz:
Mesmo bug do item 2. O bloco de edição (linhas 356-364) só passa 4 campos ao `supabase.update()`. Todos os outros campos editados no modal são descartados silenciosamente.

### Solução:
Incluída na correção do item 2 - o update passará todos os campos do `taskData`.

---

## 4. Cores de prioridade não funcionam (BUG)

### Causa raiz:
O `TaskCard` recebe `priorityColors` como prop mas **nunca aplica essas cores no render**. O prop existe na interface, é passado pelo `KanbanBoard`, é comparado no `React.memo`, mas o JSX do card usa apenas classes Tailwind hardcoded (`border-destructive`, `border-orange-500`, etc). A cor customizada do Config nunca chega ao visual.

### Solução:
No `TaskCard`, usar `settings.customization?.priorityColors` (já lido via `useSettings`) para aplicar estilos inline no card em vez das classes hardcoded. A lógica será:
1. Se há cor customizada definida, usar `style={{ borderColor: priorityColors.high.background }}` etc.
2. Se não, manter as classes Tailwind padrão como fallback

### Arquivos:
- `src/components/TaskCard.tsx`: Aplicar priorityColors no render do Card

### Risco: Baixo | Complexidade: 3/10

---

## 5. Permitir alterar cores das colunas pelo Gerenciador de Colunas

### Diagnóstico:
O `ColumnColorPicker` já existe e funciona no header de cada coluna do Kanban. Mas o `ColumnManager` (modal "Gerenciar Colunas") NÃO tem opção de cor.

### Solução:
Adicionar o `ColumnColorPicker` no `SortableColumnItem` dentro do `ColumnManager`, ao lado dos botões de renomear e deletar.

### Arquivos:
- `src/components/kanban/ColumnManager.tsx`: Adicionar ColumnColorPicker + prop `onColorChange`

### Props necessárias:
O `ColumnManager` precisa receber `onColorChange` como prop (já existe `updateColumnColor` no `useColumns`).

### Risco: Baixo | Complexidade: 2/10

---

## 6. Explicação das cores no calendário (SEM alteração de código)

Cada tarefa no calendário pode ter até 3 fontes de cor, com a seguinte hierarquia de prioridade:

### Hierarquia de cores (1 = maior prioridade):

1. **Cor da coluna** (borda esquerda colorida + fundo suave): Se a coluna da tarefa tem cor definida (ex: azul, verde, vermelho), o card usa essa cor. Isso identifica o STATUS da tarefa (ex: "A Fazer" = azul, "Em Progresso" = verde).

2. **Atrasada** (borda vermelha + fundo vermelho suave): Se a tarefa NÃO está em coluna "Concluído" E o prazo já passou, aparece em vermelho com borda vermelha. Se a coluna TEM cor, a cor da coluna prevalece MAS aparece um anel vermelho fino ao redor.

3. **Prioridade** (bolinha indicadora): Se não há cor de coluna nem atraso, a cor do fundo vem da prioridade:
   - Vermelho = Alta prioridade
   - Amarelo/Âmbar = Média prioridade  
   - Verde = Baixa prioridade
   - Cinza = Sem prioridade definida

### Bolinha indicadora (dot):
- Cada tarefa tem uma bolinha pequena à esquerda do título
- A cor da bolinha segue a mesma hierarquia: cor da coluna > cor de atraso > cor de prioridade

### No mobile:
- Os dots coloridos abaixo de cada dia seguem a mesma lógica
- Máximo 3 dots visíveis + contagem "+N" se houver mais

### Resumo visual:
- Card com borda esquerda colorida = cor da COLUNA (status)
- Card vermelho = tarefa ATRASADA (sem cor de coluna)
- Card com fundo suave verde/amarelo/vermelho = PRIORIDADE (sem cor de coluna, sem atraso)

---

## Resumo de Arquivos a Modificar

| Arquivo | Alteração |
|---|---|
| `src/pages/NotificationsDashboard.tsx` | Lazy-load dos componentes de cada aba |
| `src/pages/Calendar.tsx` | Reescrever handleCreateTask para passar todos os campos |
| `src/components/TaskCard.tsx` | Aplicar priorityColors customizadas no render |
| `src/components/kanban/ColumnManager.tsx` | Adicionar ColumnColorPicker + prop onColorChange |
| `src/components/KanbanBoard.tsx` | Passar updateColumnColor ao ColumnManager (se necessário) |

## Análise de Impacto

| Item | Risco | Complexidade |
|---|---|---|
| Lazy-load abas notificações | Baixo | 2/10 |
| Corrigir criação de tarefas no calendário | Baixo | 3/10 |
| Corrigir edição de tarefas no calendário | Baixo | 3/10 |
| Aplicar priorityColors no TaskCard | Médio | 3/10 |
| ColumnColorPicker no ColumnManager | Baixo | 2/10 |
| Explicação cores (sem código) | N/A | 0/10 |
| **Total** | **Baixo-Médio** | **13/60 - Abaixo do limite seguro** |

### Vantagens
- Tarefas criadas/editadas pelo calendário finalmente respeitarão todos os campos do modal
- Cores de prioridade customizadas serão aplicadas visualmente nos cards
- Cores de colunas editáveis diretamente no gerenciador
- Página de notificações mais rápida

### Desvantagens
- A aplicação de priorityColors via inline style em vez de Tailwind pode causar diferença sutil na transição de hover

## Checklist de Testes Manuais

### Criação pelo calendário:
- [ ] Abrir /calendar e clicar no "+" de um dia
- [ ] No modal, preencher TODOS os campos (título, descrição, prioridade, data, tags, categoria, coluna, subtasks)
- [ ] Salvar e verificar que a tarefa aparece com a categoria e coluna CORRETAS no Kanban
- [ ] Verificar que tags, subtasks e recorrência foram salvos

### Edição pelo calendário:
- [ ] Clicar duas vezes em uma tarefa no calendário
- [ ] Alterar categoria, coluna, tags e prioridade
- [ ] Salvar e verificar que TODAS as mudanças persistiram

### Cores de prioridade:
- [ ] Ir em /config > Aparência > Cores de Prioridade
- [ ] Alterar a cor de Alta Prioridade para uma cor diferente (ex: roxo)
- [ ] Voltar ao Kanban e verificar que cards de alta prioridade usam a nova cor

### Cores de colunas:
- [ ] Abrir o Gerenciador de Colunas (ícone de engrenagem no Kanban)
- [ ] Verificar que cada coluna tem um ícone de paleta para alterar a cor
- [ ] Alterar a cor de uma coluna e verificar que muda no Kanban e no Calendário

### Performance notificações:
- [ ] Abrir /notifications e medir tempo de carregamento da aba Templates
- [ ] Trocar entre abas e verificar que cada uma carrega independentemente
