# PRD - Product Requirements Document

## TaskFlow - Sistema de Gestão de Tarefas e Produtividade

**Versão**: 1.2  
**Data**: Janeiro 2026  
**Status**: Em Produção

---

## 📚 Documentação Relacionada

- [README.md](./README.md) - Setup e visão geral
- [ROADMAP.md](./ROADMAP.md) - Planejamento futuro
- [PENDENCIAS.md](./PENDENCIAS.md) - Changelog e pendências
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Estrutura técnica

---

## 1. Visão do Produto

### 1.1 Problema

Profissionais e estudantes enfrentam dificuldades em:
- Organizar tarefas de múltiplos projetos
- Manter foco e produtividade
- Acompanhar progresso e hábitos
- Ter uma visão consolidada de todas as responsabilidades

Soluções existentes são fragmentadas, exigindo múltiplas ferramentas (uma para tarefas, outra para notas, outra para timer, etc.).

### 1.2 Solução

TaskFlow é uma plataforma unificada que combina:
- **Kanban Board** para gestão visual de tarefas
- **Sistema de Notas** para documentação rica
- **Timer Pomodoro** para foco
- **Dashboard** para insights de produtividade
- **Calendário** para visão temporal

Tudo em uma única aplicação, sincronizada em tempo real, com suporte offline.

### 1.3 Proposta de Valor

> "Organize, foque e conquiste - tudo em um só lugar."

---

## 2. Personas de Usuário

### 2.1 João - O Freelancer

**Perfil**
- 28 anos, designer freelancer
- Trabalha com 5-10 clientes simultaneamente
- Precisa gerenciar prazos e entregas

**Dores**
- Perde prazos por desorganização
- Dificuldade em priorizar entre projetos
- Não sabe quanto tempo gasta em cada cliente

**Necessidades**
- Visualização clara de todos os projetos
- Alertas de prazo
- Tracking de tempo

### 2.2 Maria - A Estudante

**Perfil**
- 22 anos, estudante de medicina
- Precisa estudar múltiplas matérias
- Usa técnica Pomodoro

**Dores**
- Dificuldade em manter consistência
- Muitas ferramentas fragmentadas
- Não consegue ver progresso

**Necessidades**
- Timer Pomodoro integrado
- Sistema de notas para estudo
- Gamificação para motivação

### 2.3 Carlos - O Gerente

**Perfil**
- 35 anos, gerente de projetos
- Coordena equipe de 8 pessoas
- Precisa de visibilidade de status

**Dores**
- Dificuldade em acompanhar múltiplos projetos
- Relatórios manuais consomem tempo
- Falta de métricas de produtividade

**Necessidades**
- Dashboard com métricas
- Múltiplos quadros Kanban
- Exportação de relatórios

---

## 3. Requisitos Funcionais

### 3.1 Autenticação (RF-001)

| ID | Requisito | Prioridade | Status |
|----|-----------|------------|--------|
| RF-001.1 | Login com email/senha | Alta | ✅ Implementado |
| RF-001.2 | Cadastro de novos usuários | Alta | ✅ Implementado |
| RF-001.3 | Recuperação de senha | Alta | ✅ Implementado |
| RF-001.4 | Logout | Alta | ✅ Implementado |
| RF-001.5 | Perfil do usuário | Média | ✅ Implementado |

### 3.2 Kanban Board (RF-002)

| ID | Requisito | Prioridade | Status |
|----|-----------|------------|--------|
| RF-002.1 | Visualização em colunas | Alta | ✅ Implementado |
| RF-002.2 | Drag & drop de tarefas | Alta | ✅ Implementado |
| RF-002.3 | Criar/editar/excluir tarefas | Alta | ✅ Implementado |
| RF-002.4 | Múltiplas categorias | Alta | ✅ Implementado |
| RF-002.5 | Filtros (prioridade, tags) | Alta | ✅ Implementado |
| RF-002.6 | Colunas customizáveis | Alta | ✅ Implementado |
| RF-002.7 | Cores por coluna | Média | ✅ Implementado |
| RF-002.8 | Subtarefas | Média | ✅ Implementado |
| RF-002.9 | Tarefas recorrentes | Média | ✅ Implementado |
| RF-002.10 | Favoritos | Média | ✅ Implementado |
| RF-002.11 | Ações em lote | Média | ✅ Implementado |
| RF-002.12 | Presets de filtros | Baixa | ✅ Implementado |
| RF-002.13 | Filtros mobile (Sheet) | Média | ✅ Implementado |
| RF-002.14 | Auto-fill categoria no modal | Média | ✅ Implementado |

### 3.3 Calendário (RF-003)

| ID | Requisito | Prioridade | Status |
|----|-----------|------------|--------|
| RF-003.1 | Visualização mensal | Alta | ✅ Implementado |
| RF-003.2 | Tarefas no calendário | Alta | ✅ Implementado |
| RF-003.3 | Drag & drop entre dias | Alta | ✅ Implementado |
| RF-003.4 | Cores por status | Média | ✅ Implementado |
| RF-003.5 | Indicador de overdue | Média | ✅ Implementado |
| RF-003.6 | Navegação por mês | Média | ✅ Implementado |

### 3.4 Notas (RF-004)

| ID | Requisito | Prioridade | Status |
|----|-----------|------------|--------|
| RF-004.1 | Editor de texto rico (TipTap) | Alta | ✅ Implementado |
| RF-004.2 | Criar/editar/excluir notas | Alta | ✅ Implementado |
| RF-004.3 | Cadernos (notebooks) | Alta | ✅ Implementado |
| RF-004.4 | Busca em notas | Alta | ✅ Implementado |
| RF-004.5 | Tags em cadernos | Média | ✅ Implementado |
| RF-004.6 | Cores personalizadas | Média | ✅ Implementado |
| RF-004.7 | Fixar notas | Média | ✅ Implementado |
| RF-004.8 | Lixeira | Média | ✅ Implementado |
| RF-004.9 | Formatação com IA | Baixa | ✅ Implementado |
| RF-004.10 | Visualização em grid | Média | ✅ Implementado |
| RF-004.11 | Preview em hover | Média | ✅ Implementado |
| RF-004.12 | Contador palavras/caracteres | Baixa | ✅ Implementado |
| RF-004.13 | Vinculação com tarefas | Média | ✅ Implementado |
| RF-004.14 | Auto-save | Alta | ✅ Implementado |

### 3.5 Pomodoro (RF-005)

| ID | Requisito | Prioridade | Status |
|----|-----------|------------|--------|
| RF-005.1 | Timer configurável | Alta | ✅ Implementado |
| RF-005.2 | Pausas curtas/longas | Alta | ✅ Implementado |
| RF-005.3 | Templates de sessão | Média | ✅ Implementado |
| RF-005.4 | Vincular com tarefa | Média | ✅ Implementado |
| RF-005.5 | Histórico de sessões | Média | ✅ Implementado |
| RF-005.6 | Estatísticas de foco | Média | ✅ Implementado |

### 3.6 Dashboard (RF-006)

| ID | Requisito | Prioridade | Status |
|----|-----------|------------|--------|
| RF-006.1 | Estatísticas de tarefas | Alta | ✅ Implementado |
| RF-006.2 | Gráficos de progresso | Alta | ✅ Implementado |
| RF-006.3 | Insights com IA | Média | ✅ Implementado |
| RF-006.4 | Gamificação | Média | ✅ Implementado |
| RF-006.5 | Monitor de push | Baixa | ✅ Implementado |
| RF-006.6 | Monitor de saúde | Baixa | ✅ Implementado |

### 3.7 Sistema (RF-007)

| ID | Requisito | Prioridade | Status |
|----|-----------|------------|--------|
| RF-007.1 | Tema dark/light | Alta | ✅ Implementado |
| RF-007.2 | PWA (instalável) | Alta | ✅ Implementado |
| RF-007.3 | Modo offline | Alta | ✅ Implementado |
| RF-007.4 | Notificações push | Alta | ✅ Implementado |
| RF-007.5 | Atalhos de teclado | Média | ✅ Implementado |
| RF-007.6 | Exportação JSON | Média | ✅ Implementado |
| RF-007.7 | Exportação PNG/PDF | Média | ✅ Implementado |
| RF-007.8 | Configurações sincronizadas | Média | ✅ Implementado |

### 3.8 Testes (RF-008)

| ID | Requisito | Prioridade | Status |
|----|-----------|------------|--------|
| RF-008.1 | Testes unitários (hooks) | Alta | ✅ Implementado |
| RF-008.2 | Testes de componentes | Alta | ✅ Implementado |
| RF-008.3 | Testes E2E | Alta | ✅ Implementado |
| RF-008.4 | CI/CD workflow | Média | ✅ Implementado |

---

## 4. Requisitos Não-Funcionais

### 4.1 Performance

| ID | Requisito | Meta |
|----|-----------|------|
| RNF-001 | Tempo de carregamento inicial | < 3s |
| RNF-002 | Tempo de resposta de interações | < 100ms |
| RNF-003 | Lighthouse Performance Score | > 80 |

### 4.2 Segurança

| ID | Requisito | Status |
|----|-----------|--------|
| RNF-004 | Autenticação via Supabase Auth | ✅ |
| RNF-005 | Row Level Security em todas as tabelas | ✅ |
| RNF-006 | HTTPS obrigatório | ✅ |
| RNF-007 | Sanitização de inputs | ✅ |

### 4.3 Usabilidade

| ID | Requisito | Status |
|----|-----------|--------|
| RNF-008 | Responsivo (mobile/desktop) | ✅ |
| RNF-009 | Acessibilidade WCAG 2.1 AA | Parcial |
| RNF-010 | Suporte a touch/gestos | ✅ |

### 4.4 Disponibilidade

| ID | Requisito | Meta |
|----|-----------|------|
| RNF-011 | Uptime | > 99.5% |
| RNF-012 | Modo offline funcional | ✅ |

### 4.5 Qualidade de Código

| ID | Requisito | Status |
|----|-----------|--------|
| RNF-013 | Testes unitários para hooks críticos | ✅ |
| RNF-014 | Testes de componentes | ✅ |
| RNF-015 | Testes E2E para fluxos principais | ✅ |
| RNF-016 | CI/CD automatizado | ✅ |

---

## 5. Backlog de Funcionalidades

### 5.1 Em Desenvolvimento

| Feature | Descrição | Sprint |
|---------|-----------|--------|
| - | - | - |

### 5.2 Próximas Sprints

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| Anexos em Tarefas | Upload de imagens e arquivos | Alta |
| Busca Global v2 | Busca em notas + histórico | Alta |
| Ícones para Cadernos | Ícones personalizados | Média |
| Destaque na Busca | Highlight de termos | Média |

### 5.3 Backlog Futuro

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| Google Calendar Sync | Sincronização bidirecional | Alta |
| Webhooks | Automações externas | Alta |
| Workspaces | Colaboração em equipe | Alta |
| AI Task Breakdown | IA quebra tarefas | Média |
| App Mobile Nativo | iOS/Android | Média |
| Desktop App | Electron | Baixa |

---

## 6. Critérios de Aceitação

### 6.1 Definição de Pronto (DoD)

Uma feature é considerada pronta quando:

1. ✅ Código implementado e funcionando
2. ✅ Testes automatizados passando
3. ✅ Funciona em mobile e desktop
4. ✅ Funciona em tema dark e light
5. ✅ Sem erros no console
6. ✅ Performance aceitável
7. ✅ RLS configurado (se aplicável)

### 6.2 Critérios por Feature

#### Kanban - Criar Tarefa
- [x] Usuário pode abrir modal de criação
- [x] Campos: título, descrição, prioridade, tags, data
- [x] Validação de campos obrigatórios
- [x] Tarefa aparece na coluna correta
- [x] Toast de confirmação exibido
- [x] Funciona offline (sync posterior)
- [x] Categoria é auto-preenchida quando selecionada

#### Notas - Criar Nota
- [x] Usuário pode criar nova nota
- [x] Editor de texto rico funcional
- [x] Salvamento automático
- [x] Pode associar a caderno
- [x] Pode adicionar cor
- [x] Contador de palavras atualiza em tempo real

---

## 7. Métricas de Sucesso

### 7.1 KPIs de Produto

| Métrica | Meta Q1 2026 |
|---------|--------------|
| Usuários ativos mensais | 1000 |
| Tarefas criadas/dia | 2000 |
| Sessões Pomodoro/dia | 500 |
| Notas criadas/dia | 300 |
| NPS | > 50 |

### 7.2 KPIs Técnicos

| Métrica | Meta | Status |
|---------|------|--------|
| Lighthouse Score | > 90 | Em progresso |
| Core Web Vitals | Pass | Em progresso |
| Error Rate | < 0.1% | ✅ |
| Uptime | > 99.5% | ✅ |
| Cobertura de Testes | > 70% | Em progresso |

---

## 8. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Performance degradada | Média | Alto | Virtualização, cache |
| Perda de dados | Baixa | Crítico | RLS, backups, offline sync |
| Baixa adoção | Média | Alto | UX polido, onboarding |
| Complexidade crescente | Alta | Médio | Refatoração contínua, testes |

---

## 9. Glossário

| Termo | Definição |
|-------|-----------|
| Kanban | Metodologia visual de gestão |
| Pomodoro | Técnica de foco com intervalos |
| RLS | Row Level Security - segurança por linha |
| PWA | Progressive Web App |
| Edge Function | Função serverless |
| E2E | End-to-End (teste de ponta a ponta) |
| TipTap | Editor de texto rico baseado em ProseMirror |

---

*Última atualização: 08 de Janeiro de 2026*
