export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  emoji: string;
  category: 'task' | 'reminder' | 'system' | 'achievement';
  enabled?: boolean;
  description?: string;
}

export const defaultNotificationTemplates: NotificationTemplate[] = [
  // Task notifications
  {
    id: 'task_created',
    name: 'Nova Tarefa',
    title: '✨ Nova Tarefa Criada',
    body: 'Tarefa "{{taskTitle}}" foi adicionada ao {{columnName}}',
    emoji: '✨',
    category: 'task',
    description: 'Disparado ao criar uma nova tarefa no kanban.',
  },
  {
    id: 'task_completed',
    name: 'Tarefa Concluída',
    title: '🎉 Tarefa Concluída!',
    body: 'Parabéns! Você completou "{{taskTitle}}"',
    emoji: '🎉',
    category: 'task',
    description: 'Disparado ao marcar uma tarefa como concluída.',
  },
  {
    id: 'task_assigned',
    name: 'Tarefa Atribuída',
    title: '📋 Tarefa Atribuída',
    body: 'Nova tarefa "{{taskTitle}}" foi atribuída a você',
    emoji: '📋',
    category: 'task',
    description: 'Disparado quando uma tarefa é atribuída a você.',
  },
  
  // Reminder notifications
  {
    id: 'due_overdue',
    name: 'Tarefa Atrasada',
    title: '⏰ Tarefa Atrasada!',
    body: '"{{taskTitle}}" já passou do prazo',
    emoji: '⏰',
    category: 'reminder',
    description: 'Disparado quando o prazo da tarefa já expirou. Aparece como alerta urgente.',
  },
  {
    id: 'due_urgent',
    name: 'Prazo Urgente',
    title: '🔥 Prazo Urgente!',
    body: '"{{taskTitle}}" vence em menos de 1 hora! Ação imediata necessária.',
    emoji: '🔥',
    category: 'reminder',
    description: 'Disparado quando faltam menos de 1 hora para o vencimento. Alerta de ação imediata.',
  },
  {
    id: 'due_warning',
    name: 'Prazo Próximo',
    title: '⚠️ Prazo Próximo',
    body: '"{{taskTitle}}" vence em {{timeRemaining}}. Organize-se para concluir.',
    emoji: '⚠️',
    category: 'reminder',
    description: 'Disparado quando faltam X horas para o vencimento (configurável em Preferências). Alerta moderado.',
  },
  {
    id: 'due_early',
    name: 'Prazo se Aproximando',
    title: '📅 Prazo se Aproximando',
    body: '"{{taskTitle}}" vence em {{timeRemaining}}. Planeje com antecedência.',
    emoji: '📅',
    category: 'reminder',
    description: 'Disparado quando faltam o dobro das horas configuradas. Alerta preventivo de planejamento.',
  },
  
  // System notifications
  {
    id: 'system_update',
    name: 'Atualização Disponível',
    title: '🔄 Atualização Disponível',
    body: 'Uma nova versão do app está disponível. Clique para atualizar.',
    emoji: '🔄',
    category: 'system',
    description: 'Disparado quando uma nova versão do app está disponível.',
  },
  {
    id: 'system_backup',
    name: 'Backup Completo',
    title: '💾 Backup Completo',
    body: 'Seus dados foram salvos com sucesso.',
    emoji: '💾',
    category: 'system',
    description: 'Disparado após backup automático dos dados.',
  },
  {
    id: 'system_sync',
    name: 'Sincronização',
    title: '🔄 Sincronizando',
    body: 'Suas tarefas foram sincronizadas em todos os dispositivos.',
    emoji: '🔄',
    category: 'system',
    description: 'Disparado após sincronização entre dispositivos.',
  },
  
  // Achievement notifications
  {
    id: 'achievement_streak',
    name: 'Sequência Ativa',
    title: '🔥 Sequência de {{streakDays}} dias!',
    body: 'Continue assim! Você está em uma sequência incrível.',
    emoji: '🔥',
    category: 'achievement',
    description: 'Disparado ao manter uma sequência de dias consecutivos completando tarefas.',
  },
  {
    id: 'achievement_milestone',
    name: 'Marco Alcançado',
    title: '🏆 Marco Alcançado!',
    body: 'Você completou {{totalTasks}} tarefas! Parabéns!',
    emoji: '🏆',
    category: 'achievement',
    description: 'Disparado ao atingir um marco de tarefas completadas (ex: 50, 100).',
  },
  {
    id: 'achievement_level',
    name: 'Novo Nível',
    title: '⬆️ Novo Nível!',
    body: 'Você alcançou o nível {{level}}! Continue evoluindo.',
    emoji: '⬆️',
    category: 'achievement',
    description: 'Disparado ao subir de nível no sistema de gamificação.',
  },

  // Summary notification for overdue tasks
  {
    id: 'due_overdue_summary',
    name: 'Resumo de Atrasadas',
    title: '⏰ {{count}} Tarefas Atrasadas',
    body: 'Você tem {{count}} tarefas atrasadas. As mais urgentes: {{topTasks}}. Abra o app para revisar.',
    emoji: '⏰',
    category: 'reminder',
    description: 'Disparado ao abrir o app quando há 5+ tarefas atrasadas. Envia um resumo único em vez de alertas individuais.',
  },
];

// Template variable replacer
export function formatNotificationTemplate(
  template: NotificationTemplate,
  variables: Record<string, string>
): { title: string; body: string } {
  let title = template.title;
  let body = template.body;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    title = title.replace(regex, value);
    body = body.replace(regex, value);
  });

  return { title, body };
}

// Get template by ID
export function getTemplateById(
  templates: NotificationTemplate[],
  id: string
): NotificationTemplate | undefined {
  return templates.find((t) => t.id === id);
}
