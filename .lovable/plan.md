

# Plano de Auditoria e Correção - Configurações, Filtros e Persistência

---

## Diagnóstico Completo

### 1. Configurações Perdendo Valores (Bug de Persistência)

**Causa Raiz Identificada**: Race condition no mecanismo de batching do `useSettings.ts`.

O `flushPendingChanges` (linha 248) captura `settings` do estado via closure. Quando `scheduleBatchSave` cria um `setTimeout`, ele referencia a versão do `flushPendingChanges` daquele momento. Se o estado de `settings` mudar antes do timer disparar, o save usa dados ANTIGOS, sobrescrevendo configurações mais recentes.

```text
Fluxo do Bug:
1. Usuario muda tema -> settings = {theme: "dark"} -> timer agendado (500ms)
2. Usuario muda densidade -> settings = {density: "compact"} -> novo timer
3. Timer 1 dispara com settings ANTIGO (sem density) -> salva no banco SEM density
4. Timer 2 dispara -> mas banco ja foi sobrescrito
```

**Solucao**: Usar `useRef` para armazenar settings atual, garantindo que `flushPendingChanges` sempre leia o valor mais recente:

```typescript
const settingsRef = useRef<AppSettings>(settings);
settingsRef.current = settings; // Sempre atualizado

const flushPendingChanges = useCallback(async () => {
  const currentSettings = settingsRef.current; // Sempre fresco
  // ... merge e save
}, [user]); // Remove 'settings' das dependencias
```

Alem disso, a subscription Realtime (linha 421) faz `pendingChangesRef.current = {}` ao receber update, descartando mudancas locais pendentes. Isso precisa ser corrigido para mergear em vez de descartar.

**Risco**: 4/10 | **Complexidade**: 5/10

---

### 2. Defaults Desalinhados com Configurações do Usuário

Os defaults no codigo NAO correspondem aos valores que o usuario usa (confirmados no banco e nos prints):

| Setting | Default Atual | Valor Correto (print/banco) |
|---------|--------------|---------------------------|
| `notifications.dueDateHours` | 24 | **4** |
| `productivity.dailyReviewEnabled` | true | **false** |
| `mobile.projectsGridColumns` | 2 | **1** |

Isso significa que se o banco falhar ao carregar, o usuario ve valores errados. Os defaults devem refletir a configuracao desejada.

**Arquivo**: `src/hooks/data/useSettings.ts` (linhas 103, 134, 148)

**Risco**: 1/10 | **Complexidade**: 1/10

---

### 3. Filtros do Calendário - Análise

**Descoberta Importante**: Os filtros do calendario estao **funcionando corretamente**. Verifiquei no banco:

- "Arrumar Alexia" tem prioridade **medium** (nao high)
- "Missao 99Pay" tem prioridade **medium** (nao high)
- "TP - Dnox" tem prioridade **medium**

A confusao visual ocorre porque o **estilo do card usa a COR DA COLUNA** (ex: vermelha para "Urgente") como prioridade visual, fazendo parecer que sao tarefas de alta prioridade quando na verdade sao medias em colunas vermelhas.

O filtro funciona no campo `priority` do banco, nao na cor visual. Ao selecionar "Media", TODAS as tarefas mostradas sao realmente de prioridade media - o que pode ser confuso quando a coluna tem cor vermelha.

**Acao**: Nenhuma correcao necessaria nos filtros. Adicionar tooltip ou legenda explicativa no calendario para diferenciar "cor de prioridade" de "cor de coluna".

---

### 4. Filtros do Calendário NÃO Persistidos

Os filtros do calendario (`priorityFilter`, `tagFilter`, `dueDateFilter`, `selectedCategories`) sao estado local (`useState`) e se perdem ao navegar para outra pagina ou trocar de dispositivo.

**Solucao**: Persistir filtros do calendario no `settings.calendarFilters` (novo campo no AppSettings):

```typescript
// Em AppSettings
calendarFilters?: {
  priority: string[];
  tag: string[];
  dueDate: string[];
  categories: string[];
  columns: string[];
  search: string;
};
```

**Arquivo Principal**: `src/pages/Calendar.tsx` - substituir `useState` por valores do `useSettings`

**Risco**: 2/10 | **Complexidade**: 4/10

---

### 5. Tarefas Órfãs

**Resultado da auditoria**: Zero tarefas com `category_id = NULL` no banco. A validacao no `TaskModal.tsx` (linha 143) ja impede criacao de tarefas sem categoria. Nenhuma acao necessaria.

---

### 6. Categoria "Diário" Fantasma

A categoria "Diario" ja foi removida na sessao anterior (migracao SQL deletou a categoria e moveu/removeu as 37 tarefas). Confirmado que restam apenas 4 categorias: Casa (11), MDAccula (34), Pessoal (43), Projetos (35).

---

## Arquivos a Modificar

| # | Arquivo | Alteracao | Complexidade |
|---|---------|-----------|--------------|
| 1 | `src/hooks/data/useSettings.ts` | Fix stale closure com settingsRef + defaults | 5/10 |
| 2 | `src/pages/Calendar.tsx` | Persistir filtros via useSettings | 4/10 |
| 3 | `src/types/index.ts` | Adicionar tipo `calendarFilters` se necessario | 1/10 |

**Pontuacao Total de Risco: 7/25** - Baixo risco.

---

## Detalhamento Técnico

### Fix do useSettings.ts

```typescript
// 1. Adicionar ref para settings
const settingsRef = useRef<AppSettings>(defaultSettings);

// 2. Manter ref sincronizada (apos setSettings)
useEffect(() => {
  settingsRef.current = settings;
}, [settings]);

// 3. flushPendingChanges usa ref em vez de state
const flushPendingChanges = useCallback(async () => {
  if (!user || Object.keys(pendingChangesRef.current).length === 0) return;
  const currentSettings = settingsRef.current; // SEMPRE FRESCO
  // ... resto igual mas usando currentSettings
}, [user, deepMergePartial]); // SEM 'settings' nas deps

// 4. Realtime: nao descartar pending changes
.on('postgres_changes', ..., (payload) => {
  // NAO fazer: pendingChangesRef.current = {};
  // Apenas atualizar se nao houver mudancas pendentes
  if (Object.keys(pendingChangesRef.current).length === 0) {
    setSettings(deepMergeSettings(loadedSettings));
  }
})
```

### Persistência de Filtros do Calendário

```typescript
// Calendar.tsx - usar settings em vez de useState
const { settings, updateSettings, saveSettings } = useSettings();
const calendarFilters = settings.calendarFilters || defaultCalendarFilters;

// Setters que salvam automaticamente
const setPriorityFilter = (val: string[]) => {
  updateSettings({ calendarFilters: { ...calendarFilters, priority: val } });
};
```

### Defaults Corrigidos

```typescript
notifications: {
  dueDateHours: 4,     // Era 24
  // ... resto igual
},
productivity: {
  dailyReviewEnabled: false,  // Era true
  // ... resto igual
},
mobile: {
  projectsGridColumns: 1,    // Era 2
  // ... resto igual
},
```

---

## Checklist de Testes Manuais

### Persistência de Settings:
- [ ] Alterar tema para "Escuro" em /config
- [ ] Navegar para outra pagina e voltar - verificar que tema permanece escuro
- [ ] Recarregar a pagina (F5) - verificar que tema permanece escuro
- [ ] Alterar densidade rapidamente 3x seguidas - verificar que a ultima opcao e salva

### Filtros do Calendario:
- [ ] Selecionar filtro "Media" no calendario - verificar que tarefas aparecem corretamente
- [ ] Navegar para outra pagina e voltar ao calendario - filtro deve estar mantido
- [ ] Limpar filtros e verificar que tudo volta ao normal

### Defaults:
- [ ] Verificar que "Alertar com antecedencia" mostra 4 horas (nao 24)
- [ ] Verificar que "Revisao Diaria" esta desativada por padrao
- [ ] Verificar que "Colunas no Grid Mobile" mostra 1 coluna

