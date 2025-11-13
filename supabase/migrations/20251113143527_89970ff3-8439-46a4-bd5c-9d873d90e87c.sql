-- Adicionar Template Pessoal com coluna de tarefas recorrentes
INSERT INTO project_templates (name, description, icon, config, is_public) 
VALUES (
  'Template Pessoal',
  'Gestão pessoal com coluna para tarefas recorrentes que não resetam',
  '👤',
  '{
    "categories": [{"name": "Pessoal"}],
    "columns": [
      {"name": "Recorrente", "position": 0, "color": "#8B5CF6"},
      {"name": "A Fazer", "position": 1, "color": "#3B82F6"},
      {"name": "Em Progresso", "position": 2, "color": "#F59E0B"},
      {"name": "Concluído", "position": 3, "color": "#10B981"}
    ],
    "tasks": []
  }',
  true
);