
# Plano de Implementação - Toggle Recorrentes + Atualização PWA

## 1. Toggle de Comportamento de Tarefas Recorrentes

### Descrição do Problema
Atualmente, quando uma tarefa recorrente é marcada como concluída, ela fica visível (riscada) até o cron job de reset no fim do dia ou até o usuário clicar em "Resetar Recorrentes". O usuário deseja ter a opção de escolher se a tarefa já recalcula a próxima data imediatamente ou mantém o comportamento atual.

### Solução Proposta
Adicionar um toggle nas configurações Kanban:
- **Opção A (Reset Imediato):** Ao marcar como concluída, a tarefa é automaticamente "resetada" com a próxima data calculada (como se o cron tivesse rodado)
- **Opção B (Aguardar Reset - padrão atual):** Tarefa fica riscada até o cron de 23:59h ou clique manual

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/data/useSettings.ts` | Adicionar campo `immediateRecurrentReset: boolean` em `kanban` |
| `src/pages/Config.tsx` | Adicionar toggle na aba Kanban |
| `src/components/TaskCard.tsx` | Verificar configuração e aplicar reset imediato se habilitado |
| `src/lib/recurrenceUtils.ts` | Expor função já existente para cálculo de próxima data |

### Fluxo de Uso

```text
CONFIGURAÇÃO (Config > Kanban):
┌─────────────────────────────────────────────────────────┐
│ Comportamento ao Concluir Recorrentes                    │
│                                                          │
│ ○ Aguardar reset (fica riscada até fim do dia)          │
│ ● Reset imediato (recalcula próxima data na hora)       │
└─────────────────────────────────────────────────────────┘

AO MARCAR COMO CONCLUÍDA:
- Se "Aguardar reset": mantém comportamento atual (riscado)
- Se "Reset imediato": calcula próxima data, atualiza due_date, 
  define is_completed = false (tarefa "reaparece" desmarcada)
```

### Alteração no AppSettings

```typescript
kanban: {
  // ... campos existentes
  immediateRecurrentReset: boolean; // NOVO - default: false
}
```

### Alteração no TaskCard.tsx

```typescript
const handleToggleCompleted = async (checked: boolean) => {
  const isRecurrent = !!task.recurrence_rule;
  
  // Se é recorrente E está marcando como concluída E reset imediato habilitado
  if (checked && isRecurrent && settings.kanban.immediateRecurrentReset) {
    // Calcular próxima data
    const nextDueDate = calculateNextRecurrenceDate(task.due_date, task.recurrence_rule);
    
    // Atualizar tarefa com nova data e is_completed = false
    await supabase.from("tasks").update({
      is_completed: false,
      due_date: nextDueDate
    }).eq("id", task.id);
    
    // Trigger confetti e toast de sucesso
    triggerConfetti();
    toast({ title: "Tarefa resetada", description: `Próxima: ${formatDate(nextDueDate)}` });
    return;
  }
  
  // Comportamento padrão para não-recorrentes ou aguardar reset
  // ...
};
```

---

## 2. Botão de Atualização PWA + Explicação iOS

### Limitações do iOS PWA (Importante)
O iOS possui uma limitação fundamental:
- **Service Workers são suspensos quando o PWA está fechado**
- Isso significa que atualizações automáticas em background **não funcionam** no iOS
- A única forma de atualizar é **abrir o app** e ele verificar se há nova versão

### Solução Proposta
1. Adicionar botão nas configurações para "Verificar Atualizações" manualmente
2. Mostrar informação sobre a versão atual e última verificação
3. Explicar ao usuário que ao abrir o app, ele já verifica automaticamente

### Arquivos a Modificar/Criar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Config.tsx` | Adicionar seção "Aplicativo (PWA)" na aba Avançado |
| `src/lib/pwa/pwaUpdater.ts` | Adicionar métodos `forceUpdate()` e `getLastUpdateCheck()` |
| `src/hooks/usePWAUpdate.ts` | CRIAR - Hook para gerenciar estado de atualização |

### Interface na Aba Avançado

```text
┌────────────────────────────────────────────────────────┐
│ 📱 Aplicativo (PWA)                                     │
│──────────────────────────────────────────────────────────│
│ Versão instalada: 1.0.0                                  │
│ Última verificação: há 5 minutos                        │
│                                                          │
│ [🔄 Verificar Atualizações]  [📥 Reinstalar App]        │
│                                                          │
│ ⓘ No iOS, atualizações são verificadas ao abrir o app.  │
│   Se houver problemas, use "Reinstalar App" para baixar │
│   a versão mais recente.                                │
└────────────────────────────────────────────────────────┘
```

### Hook usePWAUpdate.ts

```typescript
export function usePWAUpdate() {
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
        setLastCheck(new Date());
        // Verificar se há worker waiting
        if (registration.waiting) {
          setUpdateAvailable(true);
        }
      }
    } finally {
      setIsChecking(false);
    }
  };

  const applyUpdate = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  };

  const forceReinstall = () => {
    // Limpar cache e recarregar
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    localStorage.setItem('pwa_force_update', Date.now().toString());
    window.location.reload();
  };

  return {
    isChecking,
    updateAvailable,
    lastCheck,
    checkForUpdates,
    applyUpdate,
    forceReinstall
  };
}
```

### Alteração no Config.tsx (Aba Avançado)

```tsx
// Adicionar após "Modo Simplificado"
<Separator />

<div className="space-y-4">
  <div className="flex items-center gap-2">
    <Label>📱 Aplicativo (PWA)</Label>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Info className="h-4 w-4 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>No iOS, atualizações são verificadas ao abrir o app. 
             Use "Reinstalar App" se houver problemas.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
  
  {lastCheck && (
    <p className="text-sm text-muted-foreground">
      Última verificação: {formatRelative(lastCheck)}
    </p>
  )}
  
  <div className="flex gap-2 flex-wrap">
    <Button 
      variant="outline" 
      onClick={checkForUpdates}
      disabled={isChecking}
    >
      {isChecking ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      Verificar Atualizações
    </Button>
    
    <Button 
      variant="outline" 
      onClick={forceReinstall}
    >
      <Download className="h-4 w-4 mr-2" />
      Reinstalar App
    </Button>
  </div>
  
  {updateAvailable && (
    <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
      <Sparkles className="h-5 w-5 text-primary" />
      <span className="text-sm">Nova versão disponível!</span>
      <Button size="sm" onClick={applyUpdate}>
        Atualizar Agora
      </Button>
    </div>
  )}
</div>
```

---

## Resumo de Impacto

### Arquivos a Criar (1)
- `src/hooks/usePWAUpdate.ts`

### Arquivos a Modificar (4)
- `src/hooks/data/useSettings.ts` - Adicionar `immediateRecurrentReset`
- `src/pages/Config.tsx` - Adicionar 2 novos blocos de configuração
- `src/components/TaskCard.tsx` - Lógica de reset imediato
- `src/lib/pwa/pwaUpdater.ts` - Métodos auxiliares

### Análise de Risco

| Item | Risco | Complexidade |
|------|-------|--------------|
| Toggle recorrentes | Baixo | 4/10 |
| Hook PWA | Baixo | 3/10 |
| UI Config | Baixo | 2/10 |

### Nota Importante sobre iOS
O comportamento de atualização automática é uma **limitação do iOS**, não um bug do sistema. A Apple suspende Service Workers quando apps estão em background. A melhor solução é:
1. Verificar atualizações ao abrir o app (já implementado)
2. Oferecer botão manual para verificar/forçar
3. Informar o usuário sobre essa limitação

Se o usuário precisar de atualizações em tempo real no iOS, a única alternativa seria migrar para um **app nativo via Capacitor**, que tem acesso total ao sistema de push e background updates do iOS.
