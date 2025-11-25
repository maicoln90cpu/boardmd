export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  emoji: string;
  category: 'task' | 'reminder' | 'system' | 'achievement';
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
  },
  {
    id: 'task_completed',
    name: 'Tarefa Concluída',
    title: '🎉 Tarefa Concluída!',
    body: 'Parabéns! Você completou "{{taskTitle}}"',
    emoji: '🎉',
    category: 'task',
  },
  {
    id: 'task_assigned',
    name: 'Tarefa Atribuída',
    title: '📋 Tarefa Atribuída',
    body: 'Nova tarefa "{{taskTitle}}" foi atribuída a você',
    emoji: '📋',
    category: 'task',
  },
  
  // Reminder notifications
  {
    id: 'due_overdue',
    name: 'Tarefa Atrasada',
    title: '⏰ Tarefa Atrasada!',
    body: '"{{taskTitle}}" já passou do prazo',
    emoji: '⏰',
    category: 'reminder',
  },
  {
    id: 'due_urgent',
    name: 'Prazo Urgente',
    title: '🔥 Prazo Urgente!',
    body: '"{{taskTitle}}" vence em {{timeRemaining}}',
    emoji: '🔥',
    category: 'reminder',
  },
  {
    id: 'due_warning',
    name: 'Prazo Próximo',
    title: '⚠️ Prazo Próximo',
    body: '"{{taskTitle}}" vence em {{timeRemaining}}',
    emoji: '⚠️',
    category: 'reminder',
  },
  {
    id: 'due_early',
    name: 'Prazo se Aproximando',
    title: '📅 Prazo se Aproximando',
    body: '"{{taskTitle}}" vence em {{timeRemaining}}',
    emoji: '📅',
    category: 'reminder',
  },
  
  // System notifications
  {
    id: 'system_update',
    name: 'Atualização Disponível',
    title: '🔄 Atualização Disponível',
    body: 'Uma nova versão do app está disponível. Clique para atualizar.',
    emoji: '🔄',
    category: 'system',
  },
  {
    id: 'system_backup',
    name: 'Backup Completo',
    title: '💾 Backup Completo',
    body: 'Seus dados foram salvos com sucesso.',
    emoji: '💾',
    category: 'system',
  },
  {
    id: 'system_sync',
    name: 'Sincronização',
    title: '🔄 Sincronizando',
    body: 'Suas tarefas foram sincronizadas em todos os dispositivos.',
    emoji: '🔄',
    category: 'system',
  },
  
  // Achievement notifications
  {
    id: 'achievement_streak',
    name: 'Sequência Ativa',
    title: '🔥 Sequência de {{streakDays}} dias!',
    body: 'Continue assim! Você está em uma sequência incrível.',
    emoji: '🔥',
    category: 'achievement',
  },
  {
    id: 'achievement_milestone',
    name: 'Marco Alcançado',
    title: '🏆 Marco Alcançado!',
    body: 'Você completou {{totalTasks}} tarefas! Parabéns!',
    emoji: '🏆',
    category: 'achievement',
  },
  {
    id: 'achievement_level',
    name: 'Novo Nível',
    title: '⬆️ Novo Nível!',
    body: 'Você alcançou o nível {{level}}! Continue evoluindo.',
    emoji: '⬆️',
    category: 'achievement',
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
