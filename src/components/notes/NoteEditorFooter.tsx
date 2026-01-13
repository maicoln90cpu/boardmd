import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface NoteEditorFooterProps {
  wordCount: number;
  charCount: number;
  onSave: () => void;
  onCancel: () => void;
}

export function NoteEditorFooter({
  wordCount,
  charCount,
  onSave,
  onCancel,
}: NoteEditorFooterProps) {
  return (
    <>
      {/* Word/Character counter */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-2 border-t bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="font-medium">{wordCount.toLocaleString()}</span>
          {wordCount === 1 ? "palavra" : "palavras"}
        </span>
        <span className="w-px h-3 bg-border" />
        <span className="flex items-center gap-1.5">
          <span className="font-medium">{charCount.toLocaleString()}</span>
          {charCount === 1 ? "caractere" : "caracteres"}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex-shrink-0 p-4 sm:p-6 border-t gap-2 bg-card/95 backdrop-blur shadow-lg flex flex-row">
        <Button onClick={onSave} className="flex-1 min-h-[48px]">
          <Check className="w-4 h-4 mr-2" />
          Salvar
          <kbd className="hidden sm:inline-flex ml-2 px-1.5 py-0.5 text-xs bg-muted rounded">
            {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+↵
          </kbd>
        </Button>
        <Button onClick={onCancel} variant="outline" className="flex-1 min-h-[48px]">
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
      </div>
    </>
  );
}
