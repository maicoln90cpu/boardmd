import { Node, mergeAttributes } from '@tiptap/core';

export interface PriorityBadgeOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    priorityBadge: {
      /**
       * Insere um badge de prioridade
       */
      insertPriorityBadge: (priority: 'high' | 'medium' | 'low') => ReturnType;
    };
  }
}

const PRIORITY_CONFIG = {
  high: {
    emoji: '🔴',
    label: 'Alta',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-300',
    borderClass: 'border-red-300 dark:border-red-700',
  },
  medium: {
    emoji: '🟡',
    label: 'Média',
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    textClass: 'text-yellow-700 dark:text-yellow-300',
    borderClass: 'border-yellow-300 dark:border-yellow-700',
  },
  low: {
    emoji: '🟢',
    label: 'Baixa',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-300',
    borderClass: 'border-green-300 dark:border-green-700',
  },
};

export const PriorityBadgeExtension = Node.create<PriorityBadgeOptions>({
  name: 'priorityBadge',
  
  group: 'inline',
  
  inline: true,
  
  atom: true,
  
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  
  addAttributes() {
    return {
      priority: {
        default: 'medium',
        parseHTML: element => element.getAttribute('data-priority') || 'medium',
        renderHTML: attributes => {
          return { 'data-priority': attributes.priority };
        },
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'span[data-type="priority-badge"]',
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    const priority = HTMLAttributes['data-priority'] as 'high' | 'medium' | 'low';
    const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
    
    return ['span', mergeAttributes(
      { 
        'data-type': 'priority-badge',
        'class': `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.bgClass} ${config.textClass} ${config.borderClass}`,
      },
      this.options.HTMLAttributes,
      HTMLAttributes
    ), `${config.emoji} ${config.label}`];
  },
  
  addCommands() {
    return {
      insertPriorityBadge: (priority) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { priority },
        });
      },
    };
  },
});

export { PRIORITY_CONFIG };
