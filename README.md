# TaskFlow - Sistema de Gestão de Tarefas e Produtividade

## Visão Geral

TaskFlow é uma aplicação web completa de gestão de tarefas e produtividade, construída com tecnologias modernas. O sistema oferece múltiplas visualizações (Kanban, Calendário), notas, timer Pomodoro, e recursos avançados de organização.

## Stack Tecnológica

### Frontend
- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework de estilos utilitários
- **shadcn/ui** - Componentes UI acessíveis
- **Framer Motion** - Animações
- **React Router DOM v7** - Roteamento
- **TanStack Query** - Gerenciamento de estado servidor
- **Recharts** - Gráficos e visualizações

### Backend (Lovable Cloud)
- **Supabase** - Backend as a Service
  - PostgreSQL - Banco de dados
  - Row Level Security (RLS) - Segurança
  - Edge Functions - Lógica serverless
  - Realtime - Atualizações em tempo real
  - Auth - Autenticação

### Bibliotecas Principais
- **@dnd-kit** - Drag and drop
- **@tiptap** - Editor de texto rico
- **date-fns** - Manipulação de datas
- **html2canvas** - Exportação visual
- **jspdf** - Geração de PDFs
- **zod** - Validação de schemas
- **lucide-react** - Ícones

## Arquitetura do Projeto

```
src/
├── components/           # Componentes React
│   ├── ui/              # Componentes base (shadcn)
│   ├── kanban/          # Componentes do Kanban
│   ├── notes/           # Componentes de Notas
│   ├── dashboard/       # Componentes do Dashboard
│   └── templates/       # Sistema de templates
├── contexts/            # Contextos React
│   ├── AuthContext      # Autenticação
│   ├── ThemeContext     # Tema dark/light
│   └── SwipeContext     # Gestos mobile
├── hooks/               # Custom hooks
│   ├── useTasks         # CRUD de tarefas
│   ├── useColumns       # Gestão de colunas
│   ├── useNotes         # CRUD de notas
│   ├── usePomodoro      # Timer Pomodoro
│   └── ...              # +25 hooks especializados
├── pages/               # Páginas da aplicação
│   ├── Index            # Kanban principal
│   ├── Dashboard        # Estatísticas
│   ├── Calendar         # Visualização calendário
│   ├── Notes            # Sistema de notas
│   ├── Pomodoro         # Timer Pomodoro
│   └── Settings         # Configurações
├── lib/                 # Utilitários
├── utils/               # Funções auxiliares
└── integrations/        # Integrações externas

supabase/
├── functions/           # Edge Functions
│   ├── daily-assistant  # Assistente IA diário
│   ├── format-note      # Formatação de notas
│   ├── productivity-insights  # Insights de produtividade
│   ├── reset-daily-stats     # Reset estatísticas
│   ├── reset-recurring-tasks # Reset tarefas recorrentes
│   └── send-push        # Notificações push
└── migrations/          # Migrações do banco
```

## Setup do Ambiente de Desenvolvimento

### Pré-requisitos
- Node.js 18+ 
- npm ou bun

### Instalação

```bash
# 1. Clonar o repositório
git clone <YOUR_GIT_URL>

# 2. Navegar para o diretório
cd <YOUR_PROJECT_NAME>

# 3. Instalar dependências
npm install

# 4. Iniciar servidor de desenvolvimento
npm run dev
```

### Variáveis de Ambiente
O projeto usa Lovable Cloud, que configura automaticamente:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Scripts Disponíveis

```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção
npm run preview  # Preview do build
npm run lint     # Linting do código
```

## Deploy

O deploy é feito automaticamente através do Lovable:
1. Acesse o projeto no Lovable
2. Vá em **Share → Publish**

### Domínio Customizado
1. Navegue até **Project → Settings → Domains**
2. Clique em **Connect Domain**
3. Siga as instruções de configuração DNS

## Banco de Dados

### Tabelas Principais
- `tasks` - Tarefas do Kanban
- `columns` - Colunas do Kanban
- `categories` - Categorias/Projetos
- `notes` - Notas e documentos
- `notebooks` - Cadernos de notas
- `pomodoro_sessions` - Sessões Pomodoro
- `user_stats` - Estatísticas do usuário
- `profiles` - Perfis de usuário
- `tags` - Tags para organização
- `activity_log` - Log de atividades
- `push_subscriptions` - Notificações push
- `push_logs` - Logs de notificações

### Segurança
Todas as tabelas possuem Row Level Security (RLS) habilitado, garantindo que usuários só acessem seus próprios dados.

## Features Principais

- ✅ Kanban Board com drag & drop
- ✅ Calendário com visualização mensal
- ✅ Sistema de notas com editor rico
- ✅ Timer Pomodoro com templates
- ✅ Dashboard de produtividade
- ✅ Notificações push (PWA)
- ✅ Modo offline
- ✅ Tema dark/light
- ✅ Tarefas recorrentes
- ✅ Subtarefas
- ✅ Tags e prioridades
- ✅ Exportação PNG/PDF
- ✅ Favoritos
- ✅ Gamificação (pontos, níveis, streaks)

## Contribuição

1. Faça fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto é privado e pertence ao seu criador.

---

**URL do Projeto**: https://lovable.dev/projects/8a077664-399d-43d4-a22e-eb2292c24030
