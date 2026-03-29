

# Correção: Coluna "Recorrente" condensada no Kanban

## Diagnóstico

O `KanbanBoard` carrega `columnSizes` das settings salvas no banco. Se os tamanhos salvos estão desproporcionais (ex: `[5, 30, 30, 35]`) ou têm quantidade diferente das colunas visíveis, a primeira coluna fica comprimida. Não há validação de:
1. **Quantidade de itens** — se o array de sizes tem tamanho diferente do número de colunas, os valores ficam desalinhados
2. **Tamanho mínimo razoável** — nenhuma verificação impede sizes muito pequenos

O `ResizablePanel` recebe `defaultSize` que só aplica na montagem inicial, e o `minSize={15}` existe mas o valor salvo pode ser menor.

## Solução

### Arquivo: `src/components/KanbanBoard.tsx` (linhas 104-117)

Adicionar validação ao inicializar `localColumnSizes`:
- Se `columnSizesFromSettings` tem tamanho diferente de `columns.length` → ignorar e usar distribuição igual
- Se qualquer valor for menor que `minSize` (15%) → redistribuir igualmente

```typescript
// ANTES:
const columnSizesFromSettings = settings.kanban.columnSizes?.[categoryId];
const [localColumnSizes, setLocalColumnSizes] = useState<number[]>(
  columnSizesFromSettings || columns.map(() => 100 / columns.length)
);

useEffect(() => {
  if (columnSizesFromSettings) {
    setLocalColumnSizes(columnSizesFromSettings);
  }
}, [columnSizesFromSettings]);

// DEPOIS:
const columnSizesFromSettings = settings.kanban.columnSizes?.[categoryId];
const getValidSizes = (saved: number[] | undefined, colCount: number): number[] => {
  const equal = Array(colCount).fill(100 / colCount);
  if (!saved || saved.length !== colCount) return equal;
  if (saved.some(s => s < 10)) return equal; // qualquer coluna < 10% → reset
  return saved;
};

const [localColumnSizes, setLocalColumnSizes] = useState<number[]>(
  getValidSizes(columnSizesFromSettings, columns.length)
);

useEffect(() => {
  setLocalColumnSizes(getValidSizes(columnSizesFromSettings, columns.length));
}, [columnSizesFromSettings, columns.length]);
```

## Impacto
- **Risco:** 2/10 — validação simples, não altera funcionalidade existente
- **Complexidade:** 2/10

## Checklist manual
- [ ] Abrir a página principal com "Todos os Projetos" — todas as colunas devem ter largura proporcional
- [ ] Redimensionar colunas manualmente e recarregar — tamanhos devem ser mantidos se válidos
- [ ] Adicionar/remover uma coluna visível — sizes devem resetar para distribuição igual

