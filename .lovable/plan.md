

# Plano: Substituir "boardmd" e "board.infoprolab" por "taskflow"

## Arquivos a modificar

| Arquivo | Alteracao |
|---------|-----------|
| `index.html` (linha 40) | `board.infoprolab.com.br` -> `taskflow.infoprolab.com.br` |
| `src/lib/push/oneSignalProvider.ts` (linhas 13, 226) | Dominio permitido e diagnostico: `board.infoprolab.com.br` -> `taskflow.infoprolab.com.br` |
| `src/hooks/useOneSignal.ts` (linhas 28-29) | Mensagem de erro e verificacao: `board.infoprolab.com.br` -> `taskflow.infoprolab.com.br` |
| `src/lib/sync/indexedDB.ts` (linha 1) | `boardmd_offline` -> `taskflow_offline` |
| `src/components/whatsapp/WhatsAppTemplates.tsx` (linhas 62, 120) | "Acesse o BoardMD" -> "Acesse o TaskFlow" |
| `supabase/functions/whatsapp-instance/index.ts` (linha 63) | `boardmd-${user.id}` -> `taskflow-${user.id}` |
| `onedoc.md` (linha 615) | Referencia de diagnostico: `board.infoprolab.com.br` -> `taskflow.infoprolab.com.br` |

## Analise de Impacto

| Item | Risco | Complexidade |
|------|-------|-------------|
| OneSignal: trocar dominio em 3 arquivos | Baixo | 1/10 |
| IndexedDB: renomear banco local | Medio | 3/10 |
| WhatsApp templates: texto | Baixo | 1/10 |
| WhatsApp instance: nome da instancia | Medio | 3/10 |
| Documentacao (onedoc.md) | Baixo | 1/10 |
| **Total** | **Baixo-Medio** | **9/50 - Abaixo do limite seguro** |

### Nota sobre IndexedDB

Renomear `boardmd_offline` para `taskflow_offline` significa que o banco local antigo ficara orfao. Usuarios existentes perderao dados offline em cache (nao dados do servidor). Risco real e baixo pois os dados sao sincronizados com o backend.

### Nota sobre WhatsApp Instance

Alterar o prefixo de `boardmd-` para `taskflow-` afeta o nome da instancia na Evolution API. Instancias existentes continuarao com o nome antigo; novas instancias usarao o novo prefixo. Nao ha impacto funcional pois o ID do usuario garante unicidade.

## Checklist de Testes Manuais

- [ ] Abrir o app em `taskflow.infoprolab.com.br` e verificar que OneSignal inicializa
- [ ] Verificar diagnosticos OneSignal: dominio deve mostrar `taskflow.infoprolab.com.br`
- [ ] Abrir `/notifications` e verificar que nao ha referencias a "BoardMD"
- [ ] Verificar templates de WhatsApp: textos devem mencionar "TaskFlow"
- [ ] Verificar que dados offline continuam funcionando (sincronizacao com backend)
