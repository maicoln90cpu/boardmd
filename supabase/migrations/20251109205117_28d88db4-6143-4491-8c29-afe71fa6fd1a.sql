-- Tabela para estatísticas e gamificação do usuário
CREATE TABLE public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_points INT NOT NULL DEFAULT 0,
  tasks_completed_today INT NOT NULL DEFAULT 0,
  tasks_completed_week INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_stats
CREATE POLICY "Users can view own stats" 
ON public.user_stats 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" 
ON public.user_stats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" 
ON public.user_stats 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_stats_updated_at
BEFORE UPDATE ON public.user_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela para templates de projetos
CREATE TABLE public.project_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '📋',
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  config JSONB NOT NULL,
  usage_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para project_templates
CREATE POLICY "Anyone can view public templates" 
ON public.project_templates 
FOR SELECT 
USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can insert own templates" 
ON public.project_templates 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own templates" 
ON public.project_templates 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own templates" 
ON public.project_templates 
FOR DELETE 
USING (auth.uid() = created_by);

-- Inserir templates padrão
INSERT INTO public.project_templates (name, description, icon, is_public, config) VALUES
('Gerenciamento de Projeto', 'Template completo para gerenciar projetos com sprints e entregas', '📋', true, 
'{"categories":[{"name":"Sprint Atual","color":"blue"}],"columns":[{"name":"Backlog","position":0},{"name":"Em Progresso","position":1},{"name":"Em Revisão","position":2},{"name":"Concluído","position":3}],"tasks":[{"title":"Definir escopo do projeto","description":"Documentar objetivos e entregáveis","priority":"high","column":"Backlog"},{"title":"Criar cronograma","description":"Planejar sprints e marcos","priority":"high","column":"Backlog"},{"title":"Reunião de kickoff","description":"Alinhar equipe sobre expectativas","priority":"medium","column":"Backlog"}]}'::jsonb),

('Lançamento de Produto', 'Organize todas as etapas do lançamento do seu produto', '🚀', true,
'{"categories":[{"name":"Produto","color":"purple"}],"columns":[{"name":"Planejamento","position":0},{"name":"Desenvolvimento","position":1},{"name":"Marketing","position":2},{"name":"Lançado","position":3}],"tasks":[{"title":"Pesquisa de mercado","description":"Entender necessidades do público","priority":"high","column":"Planejamento"},{"title":"Definir MVP","description":"Listar funcionalidades essenciais","priority":"high","column":"Planejamento"},{"title":"Design de interface","description":"Criar protótipos e wireframes","priority":"medium","column":"Planejamento"},{"title":"Planejar campanha","description":"Estratégia de marketing e canais","priority":"medium","column":"Marketing"}]}'::jsonb),

('Planejamento de Estudos', 'Organize sua rotina de estudos e acompanhe seu progresso', '📚', true,
'{"categories":[{"name":"Estudos","color":"green"}],"columns":[{"name":"Para Estudar","position":0},{"name":"Estudando","position":1},{"name":"Revisar","position":2},{"name":"Dominado","position":3}],"tasks":[{"title":"Matemática - Álgebra","description":"Capítulos 1 a 3","priority":"high","column":"Para Estudar"},{"title":"História - Revolução Industrial","description":"Ler material e fazer resumo","priority":"medium","column":"Para Estudar"},{"title":"Inglês - Tempos verbais","description":"Praticar exercícios","priority":"medium","column":"Para Estudar"}]}'::jsonb),

('Tarefas Domésticas', 'Gerencie a rotina da casa e mantenha tudo organizado', '🏠', true,
'{"categories":[{"name":"Casa","color":"orange"}],"columns":[{"name":"A Fazer","position":0},{"name":"Fazendo","position":1},{"name":"Feito","position":2}],"tasks":[{"title":"Limpeza geral","description":"Sala, quartos e banheiros","priority":"high","column":"A Fazer"},{"title":"Fazer compras","description":"Lista de supermercado","priority":"medium","column":"A Fazer"},{"title":"Organizar armário","description":"Separar roupas para doação","priority":"low","column":"A Fazer"}]}'::jsonb),

('Processo de Contratação', 'Organize o processo seletivo e acompanhe candidatos', '💼', true,
'{"categories":[{"name":"RH","color":"red"}],"columns":[{"name":"Triagem","position":0},{"name":"Entrevista","position":1},{"name":"Teste Técnico","position":2},{"name":"Contratado","position":3}],"tasks":[{"title":"Divulgar vaga","description":"Publicar em plataformas de emprego","priority":"high","column":"Triagem"},{"title":"Analisar currículos","description":"Filtrar candidatos qualificados","priority":"high","column":"Triagem"},{"title":"Agendar entrevistas","description":"Contatar candidatos selecionados","priority":"medium","column":"Triagem"}]}'::jsonb);