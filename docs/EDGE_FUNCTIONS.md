# Edge Functions - TaskFlow

Documentação das 18 Edge Functions do projeto.

## 📚 Documentação Relacionada

- [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) - Fluxos de dados
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Estrutura técnica

---

## Módulo Compartilhado (`_shared/`)

| Arquivo | Descrição |
|---------|-----------|
| `auth.ts` | Valida JWT e extrai user_id |
| `cors.ts` | Headers CORS padronizados |
| `logger.ts` | Logger para edge functions |
| `response.ts` | Helpers para respostas HTTP padronizadas |
| `validate.ts` | Validação de payloads |

---

## Funções

### 1. `ai-subtasks`
**Propósito**: Sugere subtarefas para uma tarefa usando IA  
**Método**: POST  
**Auth**: JWT obrigatório  
**Payload**: `{ taskTitle: string, taskDescription?: string }`  
**Resposta**: `{ subtasks: { title: string, priority: string }[] }`  
**Modelo IA**: google/gemini-2.5-flash

### 2. `cleanup-old-logs`
**Propósito**: Remove logs antigos (push_logs, activity_log, audit_logs)  
**Método**: POST  
**Auth**: JWT obrigatório  
**Payload**: `{ days_to_keep?: number }` (padrão: 30)  
**Resposta**: `{ deleted_count: number }`

### 3. `daily-assistant`
**Propósito**: Gera resumo diário personalizado com IA  
**Método**: POST  
**Auth**: JWT obrigatório  
**Payload**: `{ date?: string }`  
**Resposta**: `{ summary: string, suggestions: string[] }`  
**Modelo IA**: google/gemini-2.5-flash

### 4. `delete-account`
**Propósito**: Exclui conta e todos os dados do usuário  
**Método**: POST  
**Auth**: JWT obrigatório  
**Payload**: nenhum  
**Resposta**: `{ success: boolean }`  
**⚠️ Ação irreversível**

### 5. `format-note`
**Propósito**: Melhora formatação de nota com IA  
**Método**: POST  
**Auth**: JWT obrigatório  
**Payload**: `{ content: string, action: string }` (action: "improve", "summarize", "expand", etc.)  
**Resposta**: `{ formatted_content: string }`  
**Modelo IA**: google/gemini-2.5-flash  
**Limite**: ~8000 tokens

### 6. `generate-tool-description`
**Propósito**: Gera descrição para uma ferramenta com IA  
**Método**: POST  
**Auth**: JWT obrigatório  
**Payload**: `{ toolName: string, siteUrl?: string }`  
**Resposta**: `{ description: string }`  
**Modelo IA**: google/gemini-2.5-flash

### 7. `health-check`
**Propósito**: Verifica saúde dos módulos do sistema  
**Método**: GET  
**Auth**: JWT obrigatório  
**Resposta**: `{ status: "ok", modules: { db, auth, storage, realtime } }`

### 8. `parse-course-modules`
**Propósito**: Parseia texto de módulos de curso em checklist estruturado  
**Método**: POST  
**Auth**: JWT obrigatório  
**Payload**: `{ text: string }`  
**Resposta**: `{ modules: { name: string, episodes: { title: string }[] }[] }`  
**Modelo IA**: google/gemini-2.5-flash

### 9. `productivity-insights`
**Propósito**: Gera insights de produtividade com IA  
**Método**: POST  
**Auth**: JWT obrigatório  
**Payload**: `{ stats: object }`  
**Resposta**: `{ insights: string }`  
**Modelo IA**: google/gemini-2.5-flash

### 10. `reset-daily-stats`
**Propósito**: Reseta contadores diários (tasks_completed_today)  
**Método**: POST  
**Auth**: JWT obrigatório  
**Payload**: nenhum  
**Resposta**: `{ success: boolean }`

### 11. `reset-recurring-tasks`
**Propósito**: Recria tarefas recorrentes baseado em regras  
**Método**: POST  
**Auth**: JWT obrigatório  
**Payload**: nenhum  
**Resposta**: `{ created_count: number }`

### 12. `send-onesignal`
**Propósito**: Envia notificação push via OneSignal  
**Método**: POST  
**Auth**: JWT obrigatório  
**Payload**: `{ title: string, body: string, data?: object }`  
**Resposta**: `{ success: boolean, notification_id?: string }`

### 13. `send-whatsapp`
**Propósito**: Envia mensagem via WhatsApp (Evolution API)  
**Método**: POST  
**Auth**: JWT obrigatório  
**Payload**: `{ phone: string, message: string }`  
**Resposta**: `{ success: boolean }`

### 14. `suggest-tools`
**Propósito**: Sugere ferramentas baseado no perfil do usuário  
**Método**: POST  
**Auth**: JWT obrigatório  
**Payload**: `{ existingTools: string[] }`  
**Resposta**: `{ suggestions: { name: string, description: string, url: string }[] }`  
**Modelo IA**: google/gemini-2.5-flash

### 15. `suggest-tool-alternatives`
**Propósito**: Sugere alternativas para uma ferramenta  
**Método**: POST  
**Auth**: JWT obrigatório  
**Payload**: `{ toolName: string }`  
**Resposta**: `{ alternatives: { name: string, description: string }[] }`  
**Modelo IA**: google/gemini-2.5-flash

### 16. `whatsapp-daily-summary`
**Propósito**: Envia resumo diário de tarefas via WhatsApp  
**Método**: POST  
**Auth**: JWT obrigatório  
**Payload**: nenhum  
**Resposta**: `{ success: boolean }`

### 17. `whatsapp-due-alert`
**Propósito**: Envia alerta de tarefas com vencimento próximo via WhatsApp  
**Método**: POST  
**Auth**: JWT obrigatório  
**Payload**: nenhum  
**Resposta**: `{ success: boolean, alerts_sent: number }`

### 18. `whatsapp-instance`
**Propósito**: Gerencia instância WhatsApp (criar, conectar, status)  
**Método**: POST  
**Auth**: JWT obrigatório  
**Payload**: `{ action: "create" | "connect" | "status" | "disconnect" }`  
**Resposta**: `{ status: string, qrcode?: string }`

---

## Chamando Edge Functions no Frontend

```typescript
import { supabase } from "@/integrations/supabase/client";

const { data, error } = await supabase.functions.invoke("ai-subtasks", {
  body: { taskTitle: "Implementar feature X" }
});
```

---

*Última atualização: 28 de Março de 2026*
