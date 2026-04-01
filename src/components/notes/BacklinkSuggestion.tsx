import { Editor } from "@tiptap/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Note } from "@/hooks/useNotes";

interface BacklinkSuggestionProps {
  editor: Editor | null;
  notes: Note[];
  currentNoteId: string;
}

export function BacklinkSuggestion({ editor, notes, currentNoteId }: BacklinkSuggestionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredNotes = notes
    .filter((n) => n.id !== currentNoteId)
    .filter((n) => !query || n.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  const handleSelect = useCallback(
    (note: Note) => {
      if (!editor) return;

      // Find and delete the [[ trigger text
      const { state } = editor;
      const { from } = state.selection;
      const text = state.doc.textBetween(Math.max(0, from - 100), from);
      const bracketIndex = text.lastIndexOf("[[");

      if (bracketIndex !== -1) {
        const deleteFrom = from - (text.length - bracketIndex);
        editor
          .chain()
          .focus()
          .deleteRange({ from: deleteFrom, to: from })
          .insertBacklink({ noteId: note.id, noteTitle: note.title })
          .run();
      }

      setIsOpen(false);
      setQuery("");
    },
    [editor]
  );

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const { state } = editor;
      const { from } = state.selection;
      const text = state.doc.textBetween(Math.max(0, from - 100), from);
      const bracketIndex = text.lastIndexOf("[[");

      if (bracketIndex !== -1 && !text.substring(bracketIndex).includes("]]")) {
        const searchText = text.substring(bracketIndex + 2);
        setQuery(searchText);
        setIsOpen(true);
        setSelectedIndex(0);

        // Get cursor position for dropdown
        const coords = editor.view.coordsAtPos(from);
        const editorRect = editor.view.dom.getBoundingClientRect();
        setPosition({
          top: coords.bottom - editorRect.top + 4,
          left: coords.left - editorRect.left,
        });
      } else {
        setIsOpen(false);
      }
    };

    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
    };
  }, [editor]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || !editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredNotes.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filteredNotes[selectedIndex]) {
        e.preventDefault();
        handleSelect(filteredNotes[selectedIndex]);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredNotes, handleSelect, editor]);

  if (!isOpen || filteredNotes.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-64 max-h-48 overflow-y-auto bg-popover border rounded-lg shadow-lg py-1"
      style={{ top: position.top, left: position.left }}
    >
      {filteredNotes.map((note, index) => (
        <button
          key={note.id}
          onClick={() => handleSelect(note)}
          className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
            index === selectedIndex
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50"
          }`}
        >
          <span className="text-base">📝</span>
          <span className="truncate">{note.title}</span>
        </button>
      ))}
    </div>
  );
}
