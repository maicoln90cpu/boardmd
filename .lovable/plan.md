

# Plano: Melhorar Templates WhatsApp

## Resumo das Alteracoes

5 melhorias nos templates WhatsApp: novo resumo diario (08h), relatorio de % concluidas (23h), alerta pre-vencimento com ate 2 horarios configuraveis, edge functions/triggers para automacao, e filtro de colunas por template.

---

## 1. Alteracoes no Banco de Dados

### Tabela `whatsapp_templates` - novas colunas

```sql
ALTER TABLE whatsapp_templates
  ADD COLUMN send_time_2 time DEFAULT NULL,        -- segundo horario de envio (due_date)
  ADD COLUMN due_date_hours_before integer DEFAULT 24, -- horas antes do vencimento
  ADD COLUMN excluded_column_ids uuid[] DEFAULT '{}'; -- colunas excluidas do envio
```

- `send_time_2`: segundo horario opcional (apenas para `due_date`)
- `due_date_hours_before`: quantas horas antes do vencimento enviar (configuravel)
- `excluded_column_ids`: array de UUIDs das colunas que o usuario NAO quer receber naquele template

---

## 2. Novos Templates Padrao

### Template "Resumo Diario" (ja existe, ajustar horario padrao para 08:00)

Manter o existente com `send_time = 08:00`. Melhorar a mensagem para listar tarefas pendentes por coluna.

### Novo Template: "Relatorio Diario" (`daily_report`)

```text
template_type: "daily_report"
label: "Relatorio Diario"
send_time: "23:00"
message_template:
  📊 *Relatorio do Dia*

  ✅ Concluidas: {{completedToday}}/{{totalTasks}} ({{completionPercent}}%)
  📋 Pendentes: {{pendingTasks}}
  {{overdueText}}

  {{progressBar}}

  Ate amanha! 🌙
variables: [completedToday, totalTasks, completionPercent, pendingTasks, overdueText, progressBar]
```

### Template "Tarefa Vencendo" (ja existe, adicionar segundo horario)

Adicionar campos `send_time_2` e `due_date_hours_before` no card do template.

---

## 3. Edge Functions

### 3a. Refatorar `whatsapp-daily-summary` para suportar ambos os templates

A edge function atual so processa `daily_reminder`. Sera refatorada para processar TAMBEM `daily_report`:

- Buscar templates com `template_type IN ('daily_reminder', 'daily_report')` e `is_enabled = true`
- Para cada template, verificar hora atual vs `send_time`
- Para `daily_report`: calcular tarefas concluidas hoje, total, percentual
- Ambos respeitam `excluded_column_ids` -- filtrar tarefas cujo `column_id` NAO esta na lista de exclusao

### 3b. Nova Edge Function: `whatsapp-due-alert`

Edge function agendada (cron a cada 30 min) que:
1. Busca todos os templates `due_date` habilitados
2. Para cada usuario, busca tarefas com `due_date` dentro do intervalo `due_date_hours_before`
3. Respeita `excluded_column_ids`
4. Verifica `send_time` e `send_time_2` -- so envia se hora atual bater com um dos dois
5. Verifica se ja foi enviado (via `whatsapp_logs`) para evitar duplicatas
6. Envia via Evolution API e registra no log

### 3c. Cron Jobs (pg_cron)

```sql
-- Resumo diario + relatorio: a cada hora
-- (ja existe, manter)

-- Alerta de vencimento: a cada 30 minutos
SELECT cron.schedule(
  'whatsapp-due-alert',
  '*/30 * * * *',
  $$ SELECT net.http_post(...) $$
);
```

---

## 4. UI - Card de Template Melhorado

Cada card de template tera:

### Campos comuns:
- Switch ativar/desativar
- Textarea do template
- Horario de envio principal (`send_time`)
- **Novo: Seletor de colunas excluidas** (multi-select com checkboxes das colunas do usuario)

### Campos especificos do template `due_date`:
- **Segundo horario de envio** (`send_time_2`) - campo time opcional
- **Horas antes do vencimento** (`due_date_hours_before`) - input numerico

### Seletor de colunas:
- Buscar colunas do usuario via `columns` table
- Exibir como lista de checkboxes dentro de um Popover/Collapsible
- Colunas marcadas = EXCLUIDAS do envio
- Texto resumo: "Enviando para todas as colunas" ou "Excluindo: Recorrente, Concluido"

---

## 5. Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| Migracao SQL | Criar | `send_time_2`, `due_date_hours_before`, `excluded_column_ids` |
| `WhatsAppTemplates.tsx` | Modificar | Novos campos, seletor de colunas, template `daily_report` |
| `whatsapp-daily-summary/index.ts` | Modificar | Suportar `daily_report` + filtro de colunas |
| `whatsapp-due-alert/index.ts` | Criar | Edge function para alertas de vencimento |
| `supabase/config.toml` | Modificar | Registrar nova function |
| `whatsappNotifier.ts` | Modificar | Respeitar `excluded_column_ids` |
| Cron SQL | Executar | Agendar `whatsapp-due-alert` a cada 30 min |

---

## 6. Analise de Impacto

| Item | Risco | Complexidade |
|------|-------|-------------|
| Novas colunas no banco | Baixo (2/10) | Apenas ADD COLUMN com defaults |
| Refatorar daily-summary | Medio (4/10) | Adicionar logica para daily_report |
| Nova edge function due-alert | Medio (5/10) | Logica de janelas de tempo |
| UI multi-select colunas | Baixo (3/10) | Componente com checkboxes |
| Cron job adicional | Baixo (2/10) | SQL simples |

**Pontuacao Total: 16/25** - Medio. Dentro do limite seguro.

---

## 7. Checklist de Testes Manuais

- [ ] Verificar que o template "Relatorio Diario" aparece na lista com horario 23:00
- [ ] Verificar que o template "Tarefa Vencendo" mostra campo de segundo horario e horas antes
- [ ] Selecionar colunas para excluir em um template e salvar -- recarregar e confirmar que persiste
- [ ] Enviar teste do "Resumo Diario" e verificar que tarefas das colunas excluidas nao aparecem
- [ ] Enviar teste do "Relatorio Diario" e verificar que mostra percentual correto
- [ ] Enviar teste do "Tarefa Vencendo" e verificar formatacao
- [ ] Verificar no Historico que os logs aparecem com template_type correto

