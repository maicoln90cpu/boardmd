

# Plano: Desconexao Completa + Reenvio de Mensagens

## Resumo

Duas melhorias: (1) ao desconectar, deletar a instancia na Evolution API e limpar dados locais para permitir novo dispositivo; (2) adicionar reenvio automatico e manual de mensagens com erro.

---

## 1. Desconexao Completa (Deletar Instancia)

### Problema Atual
O action `disconnect` apenas faz `logout` da instancia. A instancia continua existindo na Evolution API, e ao clicar em "Conectar" ela reconecta automaticamente no mesmo dispositivo sem pedir QR Code.

### Solucao

**Edge Function `whatsapp-instance`** - Modificar action `disconnect`:

```text
Atual:
  1. POST logout/{instanceName}
  2. Update is_connected = false

Novo:
  1. POST logout/{instanceName}        (deslogar sessao)
  2. DELETE instance/delete/{instanceName}  (deletar instancia)
  3. Update whatsapp_config: is_connected = false, instance_id = null
```

Isso garante que a instancia e completamente removida da Evolution API. Ao clicar em "Conectar" novamente, uma nova instancia sera criada com novo QR Code.

**UI `WhatsAppConnection.tsx`** - Melhorar feedback:

- Adicionar dialog de confirmacao antes de desconectar ("Tem certeza? A instancia sera removida e voce precisara escanear o QR Code novamente")
- Mostrar loading state durante desconexao
- Exibir estado mais detalhado: "Conectado", "Desconectado", "Conectando...", "Desconectando..."
- Apos desconectar com sucesso, limpar o estado visual completamente

---

## 2. Reenvio de Mensagens com Erro

### 2a. Botao Reenviar Manual (UI)

**`WhatsAppLogs.tsx`** - Adicionar botao "Reenviar" ao lado de mensagens com status `failed`:

- Chamar `send-whatsapp` com os mesmos dados (message, phone_number, template_type)
- Atualizar o status do log original ou criar novo log
- Exibir feedback de sucesso/erro

Requer: adicionar RLS policy de UPDATE na tabela `whatsapp_logs` (atualmente nao permite update).

### 2b. Reenvio Automatico (Edge Function)

**Nova logica no `whatsapp-daily-summary`** ou **nova Edge Function `retry-whatsapp`**:

- Verificar mensagens com `status = 'failed'` nas ultimas 24h
- Tentar reenviar automaticamente (maximo 3 tentativas)
- Precisa de coluna `retry_count` na tabela `whatsapp_logs`

### Migracao SQL necessaria:

```sql
-- Permitir update nos logs (para reenvio)
CREATE POLICY "Users can update own whatsapp logs"
  ON whatsapp_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- Coluna de contagem de tentativas
ALTER TABLE whatsapp_logs ADD COLUMN retry_count integer DEFAULT 0;
```

---

## 3. Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `whatsapp-instance/index.ts` | Modificar | Action `disconnect` deleta instancia |
| `WhatsAppConnection.tsx` | Modificar | Dialog de confirmacao, feedback melhorado |
| `WhatsAppLogs.tsx` | Modificar | Botao reenviar manual |
| `send-whatsapp/index.ts` | Modificar | Suportar reenvio (atualizar log existente) |
| Migracao SQL | Criar | RLS update + retry_count |

---

## 4. Analise de Impacto

| Item | Risco | Complexidade |
|------|-------|-------------|
| Deletar instancia no disconnect | Baixo (2/10) | Apenas adicionar chamada DELETE |
| Dialog de confirmacao | Baixo (1/10) | UI simples |
| Botao reenviar manual | Baixo (2/10) | Chamar edge function existente |
| RLS policy update | Baixo (1/10) | SQL simples |
| Retry automatico | Medio (4/10) | Logica de tentativas |

**Pontuacao Total: 10/25** - Baixo risco.

---

## 5. Checklist de Testes Manuais

- [ ] Clicar em Desconectar e confirmar que aparece dialog de confirmacao
- [ ] Confirmar desconexao e verificar que o status muda para "Desconectado"
- [ ] Clicar em Conectar e verificar que um NOVO QR Code aparece (nao reconecta automatico)
- [ ] Escanear o QR Code com novo celular e verificar conexao
- [ ] Na aba Historico, verificar que mensagens com erro mostram botao "Reenviar"
- [ ] Clicar em Reenviar e verificar que a mensagem e reenviada
- [ ] Verificar que mensagens enviadas com sucesso NAO mostram botao Reenviar

