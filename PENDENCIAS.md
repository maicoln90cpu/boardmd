# Pendências e Changelog - TaskFlow

## 📚 Documentação Relacionada

- [README.md](./README.md) - Setup e visão geral
- [PRD.md](./PRD.md) - Requisitos do produto
- [ROADMAP.md](./ROADMAP.md) - Planejamento futuro
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Estrutura técnica

---

## 📋 Features Implementadas Recentemente

### Versão 1.1 (Janeiro 2025)

#### Testes Automatizados ✅ NOVO
- ✅ Configuração do Vitest + Testing Library
- ✅ Testes unitários para hooks (useTasks, useCategories, useColumns, useSettings, useNotes, usePomodoro, useRateLimiter)
- ✅ Testes de componentes (Auth, TaskCard, TaskModal, KanbanBoard)
- ✅ Testes de utilitários (dateUtils, taskFilters, validations)
- ✅ Testes de contexto (AuthContext)
- ✅ Configuração do Playwright para E2E
- ✅ Testes E2E (auth, tasks, kanban, notes, pomodoro)
- ✅ Workflow CI/CD (.github/workflows/test.yml)

#### Mobile UX ✅ NOVO
- ✅ Sheet de projetos no mobile (filtro de categorias)
- ✅ Indicador visual de projeto selecionado
- ✅ Contagem de tarefas por categoria no Sheet

### Versão 1.0 (Dezembro 2024)

#### Kanban Board
- ✅ Sistema de colunas customizáveis com cores
- ✅ Drag & drop com @dnd-kit
- ✅ Múltiplas categorias/projetos
- ✅ Kanban Diário separado de Projetos
- ✅ Filtros por prioridade, tags e categoria
- ✅ Presets de filtros salvos
- ✅ Ações em lote (bulk actions)
- ✅ Ordenação por tempo, nome ou prioridade
- ✅ Modo simplificado
- ✅ Densidade ajustável (comfortable/compact/ultra-compact)
- ✅ Favoritos com painel dedicado
- ✅ Tarefas recorrentes com regras flexíveis
- ✅ Subtarefas com checklist
- ✅ Espelhamento de tarefas entre projetos
- ✅ Histórico de alterações por tarefa
- ✅ Exportação visual (PNG/PDF)
- ✅ Importação/exportação JSON
- ✅ Mobile: view em grid ou lista
- ✅ Mobile: swipe para ações rápidas

#### Calendário
- ✅ Visualização mensal fullscreen
- ✅ Drag & drop de tarefas entre dias
- ✅ Cores por coluna/status
- ✅ Indicador visual de tarefas atrasadas
- ✅ Tarefas concluídas aparecem verdes
- ✅ Navegação por mês

#### Notas
- ✅ Editor de texto rico (TipTap)
- ✅ Cadernos para organização
- ✅ Tags em notas
- ✅ Cores personalizadas
- ✅ Fixar notas importantes
- ✅ Busca em notas
- ✅ Lixeira com restauração
- ✅ Formatação com IA

#### Pomodoro
- ✅ Timer configurável
- ✅ Templates de sessão
- ✅ Pausas curtas e longas
- ✅ Vinculação com tarefas
- ✅ Histórico de sessões
- ✅ Estatísticas de foco

#### Dashboard
- ✅ Estatísticas de produtividade
- ✅ Gráficos de progresso semanal
- ✅ Insights com IA
- ✅ Gamificação (pontos, níveis, streaks)
- ✅ Monitor de notificações push

#### Sistema
- ✅ Autenticação completa
- ✅ PWA com modo offline
- ✅ Notificações push
- ✅ Tema dark/light
- ✅ Configurações sincronizadas
- ✅ Atalhos de teclado (Ctrl+K, Ctrl+N)
- ✅ Indicador de status online
- ✅ Recuperação de senha via email
- ✅ Toggle de visibilidade de senha
- ✅ Confirmação de senha no registro
- ✅ Health Check de módulos (edge function)
- ✅ Monitor de saúde do sistema no dashboard
- ✅ Empty states personalizados com ilustrações
- ✅ CTAs contextuais em listas vazias

---

## 🔄 Pendências de Desenvolvimento

### Alta Prioridade

#### 1. ~~Testes Automatizados~~ ✅ CONCLUÍDO
- [x] Configurar vitest e testing-library
- [x] Testes unitários para hooks críticos
- [x] Testes de componentes
- [x] Testes E2E com Playwright
- [x] Workflow CI/CD

#### 2. ~~Filtros Mobile~~ ✅ CONCLUÍDO
- [x] Sheet de projetos no mobile
- [x] Indicador de projeto selecionado
- [x] Contagem de tarefas por categoria

#### 3. Busca Global Aprimorada
- [ ] Busca em notas a partir da busca global
- [ ] Filtros avançados na busca
- [ ] Histórico de buscas recentes

#### 4. Anexos em Tarefas
- [ ] Upload de imagens
- [ ] Upload de documentos
- [ ] Preview inline

### Média Prioridade

#### 5. Integrações
- [ ] Sincronização com Google Calendar
- [ ] Exportação para outros formatos (CSV, Excel)
- [ ] Webhooks para automações

#### 6. Onboarding
- [ ] Tour guiado para novos usuários
- [ ] Tooltips contextuais

### Baixa Prioridade

#### 7. Refinamentos de UI/UX
- [ ] Animações de transição mais suaves
- [ ] Loading states mais elegantes
- [ ] Mais atalhos de teclado

#### 8. Colaboração (Futuro)
- [ ] Compartilhamento de projetos
- [ ] Comentários em tarefas
- [ ] Atribuição de tarefas

---

## 🔒 Segurança - Pendências para Implementação Futura

> ⚠️ Estes itens serão implementados apenas quando solicitados explicitamente.

### 2.1 Leaked Password Protection
- [ ] Habilitar via configuração do backend (Lovable Cloud)
- **Prioridade**: Alta
- **Estimativa**: 30 minutos

### 2.3 Autenticação de Dois Fatores (2FA)
- [ ] Integrar TOTP via Supabase Auth
- [ ] Criar UI de configuração em Settings
- [ ] Adicionar verificação no login
- **Arquivos a modificar**:
  - `src/pages/Settings.tsx` - adicionar seção 2FA
  - `src/components/Auth.tsx` - verificar 2FA no login
- **Prioridade**: Média
- **Estimativa**: 2-3 horas

---

## 💡 Sugestões de Melhoria

### UX/UI
| Sugestão | Prioridade | Complexidade |
|----------|------------|--------------|
| Legenda de cores das colunas no calendário | Média | Baixa |
| Editar cores das colunas nas configurações | Alta | Média |
| Tour guiado para novos usuários | Baixa | Alta |
| Temas customizáveis além de dark/light | Baixa | Média |

### Performance
| Sugestão | Prioridade | Complexidade |
|----------|------------|--------------|
| Virtualização de listas longas | Média | Alta |
| Cache mais agressivo de dados | Média | Média |
| Lazy loading de componentes | Baixa | Baixa |

### Funcionalidades
| Sugestão | Prioridade | Complexidade |
|----------|------------|--------------|
| Anexos em tarefas | Alta | Alta |
| Timer inline no card da tarefa | Média | Média |
| Dependências entre tarefas | Baixa | Alta |
| Estimativa de tempo por tarefa | Média | Baixa |

---

## 📝 Changelog

### [2025-01-08]
- ✨ Adicionado: Sheet de projetos no mobile para filtrar categorias
- ✨ Adicionado: Testes unitários para hooks (useSettings, useColumns, useNotes, usePomodoro)
- ✨ Adicionado: Testes de componentes (TaskModal, KanbanBoard)
- ✨ Adicionado: Testes E2E com Playwright (auth, tasks, kanban, notes, pomodoro)
- ✨ Adicionado: Workflow CI/CD para testes automatizados
- 📚 Atualizado: Documentação técnica completa

### [2024-12-19]
- 🔧 Corrigido: Cores de tarefas no calendário (concluídas aparecem verdes)
- 🔧 Corrigido: Lógica de overdue não afeta mais tarefas concluídas

### [2024-12-18]
- ✨ Adicionado: Visualização de tarefas no calendário com cores por coluna
- ✨ Adicionado: Drag & drop no calendário
- 🔧 Corrigido: Sincronização de tarefas espelhadas

### [2024-12-17]
- ✨ Adicionado: Sistema de gamificação completo
- ✨ Adicionado: Monitor de notificações push no dashboard
- ✨ Adicionado: Insights de produtividade com IA

### [2024-12-16]
- ✨ Adicionado: Notificações push para PWA
- ✨ Adicionado: Edge function para envio de push
- 🔧 Corrigido: Modo offline melhorado

### [2024-12-15]
- ✨ Adicionado: Templates de projeto
- ✨ Adicionado: Presets de filtros
- ✨ Adicionado: Ações em lote

### [2024-12-14]
- ✨ Adicionado: Timer Pomodoro com templates
- ✨ Adicionado: Vinculação Pomodoro-Tarefa
- ✨ Adicionado: Histórico de sessões

### [2024-12-13]
- ✨ Adicionado: Sistema de notas com TipTap
- ✨ Adicionado: Cadernos e tags
- ✨ Adicionado: Lixeira para notas

### [2024-12-12]
- ✨ Adicionado: Tarefas recorrentes
- ✨ Adicionado: Subtarefas com checklist
- ✨ Adicionado: Espelhamento de tarefas

### [2024-12-11]
- ✨ Adicionado: Dashboard de estatísticas
- ✨ Adicionado: Gráficos com Recharts
- ✨ Adicionado: Sistema de pontos e níveis

### [2024-12-10]
- ✨ Adicionado: Exportação PNG/PDF
- ✨ Adicionado: Favoritos
- 🔧 Corrigido: Performance do drag & drop

### [2024-12-09]
- ✨ Adicionado: Múltiplas categorias/projetos
- ✨ Adicionado: Filtros avançados
- ✨ Adicionado: Kanban Diário separado

### [2024-12-08]
- 🚀 Lançamento inicial
- ✨ Kanban básico com drag & drop
- ✨ Autenticação
- ✨ Tema dark/light

---

## 🐛 Bugs Conhecidos

| Bug | Status | Prioridade |
|-----|--------|------------|
| - | - | - |

*Nenhum bug conhecido no momento*

---

## 📊 Métricas de Código

- **Componentes**: ~85
- **Hooks customizados**: 32
- **Páginas**: 10
- **Edge Functions**: 7
- **Tabelas no banco**: 16
- **Arquivos de teste**: 15
- **Testes E2E**: 5 specs

---

*Última atualização: Janeiro 2025*
