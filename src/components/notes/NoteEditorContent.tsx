import { EditorContent, Editor } from "@tiptap/react";
import { RichTextToolbar } from "./RichTextToolbar";
import { Task } from "@/hooks/tasks/useTasks";

interface NoteEditorContentProps {
  editor: Editor | null;
  tasks: Task[];
  onInsertTaskBlock: (task: Task) => void;
  onCreateTask: (taskData: { title: string; description?: string; priority: string }) => Promise<Task | null>;
}

export function NoteEditorContent({
  editor,
  tasks,
  onInsertTaskBlock,
  onCreateTask,
}: NoteEditorContentProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <RichTextToolbar 
        editor={editor} 
        tasks={tasks}
        onInsertTaskBlock={onInsertTaskBlock}
        onCreateTask={onCreateTask}
      />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <EditorContent 
          editor={editor} 
          className="prose prose-sm max-w-none focus:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:outline-none" 
        />
      </div>
    </div>
  );
}
