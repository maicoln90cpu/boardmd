import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    backlink: {
      insertBacklink: (attrs: { noteId: string; noteTitle: string }) => ReturnType;
    };
  }
}

export const BacklinkExtension = Node.create({
  name: "backlink",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      noteId: { default: null },
      noteTitle: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="backlink"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "backlink",
        class:
          "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium text-sm cursor-pointer hover:bg-primary/20 transition-colors",
        style: "text-decoration: none;",
      }),
      `📝 ${HTMLAttributes.noteTitle || "Nota"}`,
    ];
  },

  addCommands() {
    return {
      insertBacklink:
        (attrs) =>
        ({ chain }) => {
          return chain().insertContent({
            type: this.name,
            attrs,
          }).run();
        },
    };
  },
});
