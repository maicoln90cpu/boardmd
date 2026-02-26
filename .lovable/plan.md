

# Plano: Indicador Visual de Notificação + Correções Push + Calendário D&D

## Diagnóstico dos Dados (push_logs últimas 24h)

Os logs revelam:

1. **"Treino apareceu depois aleatória"**: A tarefa "Treino" disparou como `due_urgent` (menos de 1h), que é processado SEPARADAMENTE do resumo de atrasadas (`due_overdue_summary`). O resumo só cobre tarefas já atrasadas — "Treino" não era atrasada, era urgente. Resultado: 1 push de resumo + 1 push de "Treino" = correto, mas confuso para o usuário.

2. **"Fechei e abri, apareceu de novo"**: O `notifiedRef` é um Set **em memória** que reseta ao fechar o app. Ao reabrir, o toast e browser notification disparam de novo (o push é bloqueado pelo backend — logs mostram 6x `dedup_skipped` para Treino). **Solução**: usar `sessionStorage` no lugar de Set em memória.

3. **"Algumas tarefas com app fechado aparecem, outras não"**: Limitação do iOS PWA — Service Workers são suspensos quando o app é fechado. Somente pushes enviados enquanto o app está aberto são entregues de forma confiável. Isso não muda com implementação — é restrição do sistema operacional.

---

## Alterações

### 1. Indicador visual de notificação customizada no card
**Arquivo**: `src/components/task-card/TaskCardBadges.tsx`

Adicionar prop `hasCustomNotification` e renderizar um ícone de sino (🔔 `Bell`) ao lado dos outros badges quando a tarefa tem `notification_settings.reminders` configurados.

**Arquivo**: `src/components/TaskCard.tsx`

Passar a nova prop `hasCustomNotification={!!task.notification_settings?.reminders?.length}`.

### 2. Persistir dedup de toasts em `sessionStorage` (corrige "fechei e abri, apareceu de novo")
**Arquivo**: `src/hooks/useDueDateAlerts.ts`

Trocar `notifiedRef = new Set()` por um Set inicializado a partir de `sessionStorage`. Ao adicionar um item, salvar também no `sessionStorage`. Isso garante que toasts não repetem dentro da mesma sessão do navegador (mesmo após reload), mas resetam quando o usuário fecha a aba completamente.

### 3. Incluir `due_urgent` e `due_warning` no resumo quando há muitas atrasadas
**Arquivo**: `src/hooks/useDueDateAlerts.ts`

Quando o resumo é disparado (>= 5 atrasadas), suprimir também alertas individuais de `due_urgent` e `due_warning` para as tarefas que fazem parte do backlog (ou seja, tarefas cujo prazo está dentro das próximas 2h E já existem muitas atrasadas). Isso evita o "resumo + tarefa aleatória depois".

### 4. Calendário: melhorar feedback visual do drag-and-drop
**Arquivo**: `src/components/ui/fullscreen-calendar.tsx`

O drag-and-drop já funciona no calendário. Melhorias sutis:
- Adicionar indicação de "soltar aqui" mais visível (texto sutil "Mover para dia X")
- Animação de transição suave ao soltar
- Cursor grab/grabbing mais claro no handle

---

## Análise de Impacto

| Item | Risco (0-10) | Complexidade (0-10) |
|---|---:|---:|
| Indicador visual de notificação no card | 1 | 2 |
| SessionStorage para dedup de toasts | 2 | 3 |
| Suprimir alertas individuais junto com resumo | 2 | 3 |
| Melhorar D&D visual no calendário | 1 | 3 |
| **Total** | **6** | **11 — Abaixo do limite 28** |

### Vantagens
- Card mostra claramente quais tarefas têm notificações customizadas
- "Fechei e abri" não repete toasts na mesma sessão
- Resumo agrupa TUDO (overdue + urgent), evitando pushes "soltos"
- Calendário com drag-and-drop mais intuitivo

### Desvantagens
- Nenhuma significativa

## Sobre o ponto 5 (tarefas com app fechado)
Essa é uma **limitação do iOS** para PWAs: o Service Worker é suspenso quando o app sai do primeiro plano. Pushes só chegam de forma confiável com o app aberto. Para notificações background no iOS, seria necessário um app nativo (Capacitor). As melhorias feitas (dedup backend, resumo) garantem que quando o app ABRIR, o comportamento seja correto e previsível.

## Checklist de Testes Manuais
- [ ] Criar tarefa com lembrete individual → verificar ícone de sino no card
- [ ] Abrir app com muitas atrasadas → receber APENAS 1 push de resumo (sem "Treino" avulso)
- [ ] Fechar e reabrir o app → NÃO deve mostrar toasts repetidos na mesma sessão
- [ ] No calendário, arrastar tarefa de um dia para outro → verificar feedback visual suave
- [ ] Verificar que tarefas em colunas excluídas continuam sem notificação

