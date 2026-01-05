# Testes Automatizados

Este diretório contém os testes automatizados do projeto.

## Stack de Testes

- **Vitest**: Framework de testes rápido e compatível com Vite
- **React Testing Library**: Testes de componentes React
- **@testing-library/jest-dom**: Matchers adicionais para DOM

## Estrutura

```
src/__tests__/
├── setup.ts                    # Configuração global dos testes
├── README.md                   # Esta documentação
├── lib/                        # Testes de funções utilitárias
│   ├── dateUtils.test.ts       # Testes de formatação de datas
│   └── taskFilters.test.ts     # Testes de filtros de tarefas
├── contexts/                   # Testes de contexts React
│   └── AuthContext.test.tsx    # Testes de autenticação
└── components/                 # Testes de componentes (futuro)
```

## Scripts

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Gerar relatório de cobertura
npm run test:coverage
```

## Padrões de Testes

### Nomenclatura
- Arquivos: `*.test.ts` ou `*.test.tsx`
- Describe: Nome da função/componente
- It: "deve [ação esperada]"

### Estrutura de Teste
```typescript
describe('NomeDaFunção', () => {
  beforeEach(() => {
    // Setup antes de cada teste
  });

  it('deve fazer algo específico', () => {
    // Arrange
    const input = 'valor';
    
    // Act
    const result = funcao(input);
    
    // Assert
    expect(result).toBe('esperado');
  });
});
```

## Cobertura

Meta de cobertura mínima:
- **Funções utilitárias**: 90%+
- **Hooks**: 80%+
- **Componentes críticos**: 70%+

## Próximos Passos

- [ ] Adicionar testes para hooks (`useTasks`, `useSettings`)
- [ ] Adicionar testes de componentes (`TaskCard`, `TaskModal`)
- [ ] Configurar testes E2E com Playwright
- [ ] Integrar testes no pipeline CI/CD
