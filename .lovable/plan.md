

# Plano: Ajustar Templates WhatsApp (Motivacional, Resumo, Relatorio, Due Date)

## 1. Bom Dia Motivacional - Frases Aleatorias (sem tarefas)

### Problema Atual
O template `daily_motivation` mostra tarefas pendentes e prioridade. O usuario quer apenas frases motivacionais.

### Solucao
- Criar um array de ~30 frases motivacionais + ~30 citacoes biblicas hardcoded na Edge Function `whatsapp-daily-summary`
- A cada execucao, selecionar 1 frase motivacional aleatoria + 1 citacao biblica aleatoria
- Formato da mensagem:

```
"A frase motivacional aqui." - Autor

"Citacao biblica aqui."
Referencia Biblica

Tenha um otimo dia!
```

- Remover as variaveis `{{pendingTasks}}`, `{{topPriority}}`, `{{streak}}` do template `daily_motivation`
- Novo template padrao sem nenhuma referencia a tarefas
- Novas variaveis: `{{motivationalQuote}}`, `{{bibleQuote}}`
- Na Edge Function, substituir as variaveis automaticamente com frases aleatorias

### Alteracoes
- **`whatsapp-daily-summary/index.ts`**: Adicionar arrays de frases e logica de selecao aleatoria no bloco `daily_motivation`
- **`WhatsAppTemplates.tsx`**: Atualizar template padrao e variaveis disponiveis

---

## 2. Tarefa Vencendo - Verificar 2 Alertas

### Analise Atual
A Edge Function `whatsapp-due-alert` ja suporta 2 alertas (`due_date_hours_before` e `due_date_hours_before_2`). A logica usa uma janela de 30 minutos apos o horario calculado (`due_date - X horas`). O cron roda a cada 30 minutos.

### Verificacao
- O codigo ja esta correto: calcula `alertTime = dueDate - hours * 3600000` e verifica se `now` esta dentro da janela de 30min
- A deduplicacao usa `template_type = due_date_alert_1` e `due_date_alert_2` separadamente
- **Nenhuma alteracao necessaria** - a logica ja respeita os 2 horarios salvos

---

## 3. Resumo Diario - Listar Todas as Tarefas por Nome

### Problema Atual
O template `daily_reminder` mostra apenas `{{pendingTasks}}` (numero) e `{{overdueText}}` (numero de atrasadas).

### Solucao
- Na Edge Function, buscar todas as tarefas pendentes com `title`, `due_date` (nao apenas count)
- Buscar separadamente tarefas atrasadas com `title`, `due_date`
- Formatar em bullet points, ordenadas da mais antiga para a mais nova
- Novas variaveis: `{{tasksList}}` (tarefas do dia) e `{{overdueList}}` (atrasadas)

Formato:
```
Resumo do Dia

Tarefas pendentes (5):
- Tarefa A | Vence: 11/02 14:00
- Tarefa B | Vence: 12/02 09:00
- Tarefa C | Sem prazo
...

Tarefas atrasadas (2):
- Tarefa X | Atrasada desde: 09/02 18:00
- Tarefa Y | Atrasada desde: 10/02 10:00
```

### Alteracoes
- **`whatsapp-daily-summary/index.ts`**: No bloco `daily_reminder`, buscar tarefas completas (title, due_date) em vez de apenas count. Formatar listas em bullet points ordenadas por due_date ASC
- **`WhatsAppTemplates.tsx`**: Atualizar template padrao e variaveis

---

## 4. Relatorio Diario - Tarefas Pendentes em Bullet Points por Prioridade

### Problema Atual
O template `daily_report` mostra apenas `{{pendingTasks}}` como numero.

### Solucao
- Na Edge Function, buscar tarefas pendentes com `title`, `priority`, `due_date`
- Ordenar por prioridade (high > medium > low)
- Formatar em bullet points com indicador de prioridade

Formato:
```
Relatorio do Dia

Concluidas: 8/12 (67%)
[barra de progresso]

Pendentes (4):
🔴 Tarefa urgente | Vence: 12/02
🟡 Tarefa media | Vence: 13/02
🟢 Tarefa baixa | Sem prazo
...

Atrasadas (1):
- Tarefa X | Desde: 09/02
```

### Alteracoes
- **`whatsapp-daily-summary/index.ts`**: No bloco `daily_report`, buscar tarefas com detalhes e formatar lista
- **`WhatsAppTemplates.tsx`**: Atualizar template padrao e variaveis

---

## 5. Arquivos a Modificar

| Arquivo | Descricao |
|---------|-----------|
| `supabase/functions/whatsapp-daily-summary/index.ts` | Logica de frases aleatorias, listas de tarefas detalhadas |
| `src/components/whatsapp/WhatsAppTemplates.tsx` | Templates padrao atualizados |

---

## 6. Analise de Impacto

| Item | Risco | Complexidade |
|------|-------|-------------|
| Frases motivacionais aleatorias | Baixo (1/10) | Array estatico + Math.random |
| Lista de tarefas no resumo diario | Baixo (3/10) | Query com detalhes + formatacao |
| Lista de tarefas no relatorio | Baixo (3/10) | Query com detalhes + formatacao |
| Verificar due_date 2 alertas | Nenhum (0/10) | Ja funciona corretamente |

**Pontuacao Total: 7/25** - Risco muito baixo.

---

## 7. Checklist de Testes Manuais

- [ ] Enviar teste do Bom Dia Motivacional e verificar que mostra frase + citacao biblica (sem tarefas)
- [ ] Enviar teste novamente e verificar que a frase e DIFERENTE (aleatoria)
- [ ] Enviar teste do Resumo Diario e verificar que lista todas as tarefas por nome com data
- [ ] Verificar que tarefas atrasadas aparecem separadas no resumo
- [ ] Enviar teste do Relatorio Diario e verificar bullet points por prioridade
- [ ] Verificar que o template Tarefa Vencendo dispara nos 2 horarios configurados
- [ ] Verificar formatacao das mensagens no WhatsApp (quebras de linha, emojis)

