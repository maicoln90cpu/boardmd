# Testes Automatizados - TaskFlow

## Stack de Testes

- **Vitest**: Framework de testes compatível com Vite
- **React Testing Library**: Testes de componentes
- **@testing-library/jest-dom**: Matchers DOM
- **Playwright**: Testes E2E

## Estrutura

```
src/__tests__/
├── setup.ts                    # Configuração global
├── components/                 # Testes de componentes (4)
│   ├── Auth.test.tsx
│   ├── TaskCard.test.tsx
│   ├── TaskModal.test.tsx
│   ├── KanbanBoard.test.tsx
│   └── VirtualizedNotebooksList.test.tsx
├── hooks/                      # Testes de hooks (8)
│   ├── useTasks.test.ts
│   ├── useCategories.test.ts
│   ├── useColumns.test.ts
│   ├── useSettings.test.ts
│   ├── useNotes.test.ts
│   ├── usePomodoro.test.ts
│   ├── useRateLimiter.test.ts
│   └── useMenuItems.test.tsx
├── lib/                        # Testes de utilitários (4)
│   ├── dateUtils.test.ts
│   ├── taskFilters.test.ts
│   ├── validations.test.ts
│   └── columnStyles.test.ts
└── contexts/                   # Testes de contextos (1)
    └── AuthContext.test.tsx

e2e/                            # Testes E2E (5 specs)
├── auth.spec.ts
├── tasks.spec.ts
├── kanban.spec.ts
├── notes.spec.ts
└── pomodoro.spec.ts
```

## Scripts

```bash
npm run test          # Watch mode
npm run test:run      # Single run
npm run test:coverage # Com cobertura
npm run test:e2e      # E2E headless
npm run test:e2e:ui   # E2E com UI
```

## Padrões

- Arquivos: `*.test.ts` ou `*.test.tsx`
- Describe: nome da função/componente
- It: "deve [ação esperada]"
- Estrutura AAA: Arrange → Act → Assert
- Mock do Supabase no setup.ts

## CI/CD

Workflow `.github/workflows/test.yml`:
1. `unit-tests`: Vitest
2. `e2e-tests`: Playwright (após unit-tests)

Triggers: push/PR para `main` e `develop`.
