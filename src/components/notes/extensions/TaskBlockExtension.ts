import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { TaskBlockComponent } from './TaskBlockComponent';

export interface TaskBlockOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    taskBlock: {
      /**
       * Insere um bloco de tarefa
       */
      insertTaskBlock: (attrs: { 
        taskId: string; 
        title: string; 
        isCompleted: boolean;
        priority?: string;
        dueDate?: string;
      }) => ReturnType;
    };
  }
}

export const TaskBlockExtension = Node.create<TaskBlockOptions>({
  name: 'taskBlock',
  
  group: 'block',
  
  atom: true,
  
  draggable: true,
  
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  
  addAttributes() {
    return {
      taskId: {
        default: null,
        parseHTML: element => element.getAttribute('data-task-id'),
        renderHTML: attributes => {
          if (!attributes.taskId) return {};
          return { 'data-task-id': attributes.taskId };
        },
      },
      title: {
        default: '',
        parseHTML: element => element.getAttribute('data-title'),
        renderHTML: attributes => {
          return { 'data-title': attributes.title };
        },
      },
      isCompleted: {
        default: false,
        parseHTML: element => element.getAttribute('data-completed') === 'true',
        renderHTML: attributes => {
          return { 'data-completed': attributes.isCompleted ? 'true' : 'false' };
        },
      },
      priority: {
        default: 'medium',
        parseHTML: element => element.getAttribute('data-priority') || 'medium',
        renderHTML: attributes => {
          return { 'data-priority': attributes.priority };
        },
      },
      dueDate: {
        default: null,
        parseHTML: element => element.getAttribute('data-due-date'),
        renderHTML: attributes => {
          if (!attributes.dueDate) return {};
          return { 'data-due-date': attributes.dueDate };
        },
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'div[data-type="task-block"]',
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      { 'data-type': 'task-block' },
      this.options.HTMLAttributes,
      HTMLAttributes
    )];
  },
  
  addCommands() {
    return {
      insertTaskBlock: (attrs) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs,
        });
      },
    };
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(TaskBlockComponent);
  },
});
