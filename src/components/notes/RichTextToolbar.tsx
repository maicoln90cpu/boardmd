import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  Palette,
  Highlighter,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const PRESET_COLORS = [
  { name: "Preto", value: "#000000" },
  { name: "Vermelho", value: "#EF4444" },
  { name: "Azul", value: "#3B82F6" },
  { name: "Verde", value: "#10B981" },
  { name: "Amarelo", value: "#F59E0B" },
  { name: "Branco", value: "#FFFFFF" },
];

interface RichTextToolbarProps {
  editor: Editor | null;
}

export function RichTextToolbar({ editor }: RichTextToolbarProps) {
  const [linkUrl, setLinkUrl] = useState("");

  if (!editor) return null;

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl("");
    }
  };

  return (
    <div className="border-b bg-card p-2 flex flex-wrap items-center gap-1 sticky top-0 z-10">
      {/* Estilos de texto */}
      <Button
        variant={editor.isActive("bold") ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Negrito"
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        variant={editor.isActive("italic") ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Itálico"
      >
        <Italic className="h-4 w-4" />
      </Button>

      <Button
        variant={editor.isActive("underline") ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Sublinhado"
      >
        <Underline className="h-4 w-4" />
      </Button>

      <Button
        variant={editor.isActive("strike") ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Tachado"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Cabeçalhos */}
      <Button
        variant={editor.isActive("heading", { level: 1 }) ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Título 1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>

      <Button
        variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Título 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>

      <Button
        variant={editor.isActive("heading", { level: 3 }) ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Título 3"
      >
        <Heading3 className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Cor do texto */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" title="Cor do texto">
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56">
          <div className="space-y-2">
            <label className="text-sm font-medium">Cor do texto</label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_COLORS.map((color) => (
                <Button
                  key={color.value}
                  variant="outline"
                  size="sm"
                  className="h-10"
                  style={{ backgroundColor: color.value, color: color.value === "#FFFFFF" ? "#000" : "#fff" }}
                  onClick={() => editor.chain().focus().setColor(color.value).run()}
                  title={color.name}
                >
                  {color.name}
                </Button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Cor de destaque */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" title="Cor de destaque">
            <Highlighter className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56">
          <div className="space-y-2">
            <label className="text-sm font-medium">Cor de destaque</label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_COLORS.map((color) => (
                <Button
                  key={color.value}
                  variant="outline"
                  size="sm"
                  className="h-10"
                  style={{ backgroundColor: color.value, color: color.value === "#FFFFFF" ? "#000" : "#fff" }}
                  onClick={() => editor.chain().focus().setHighlight({ color: color.value }).run()}
                  title={color.name}
                >
                  {color.name}
                </Button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-6" />

      {/* Listas */}
      <Button
        variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Lista não ordenada"
      >
        <List className="h-4 w-4" />
      </Button>

      <Button
        variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Lista ordenada"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Alinhamento */}
      <Button
        variant={editor.isActive({ textAlign: "left" }) ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        title="Alinhar à esquerda"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>

      <Button
        variant={editor.isActive({ textAlign: "center" }) ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        title="Centralizar"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>

      <Button
        variant={editor.isActive({ textAlign: "right" }) ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        title="Alinhar à direita"
      >
        <AlignRight className="h-4 w-4" />
      </Button>

      <Button
        variant={editor.isActive({ textAlign: "justify" }) ? "secondary" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        title="Justificar"
      >
        <AlignJustify className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Link */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={editor.isActive("link") ? "secondary" : "ghost"}
            size="sm"
            title="Adicionar link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-2">
            <label className="text-sm font-medium">URL do link</label>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://exemplo.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addLink()}
              />
              <Button size="sm" onClick={addLink}>
                Adicionar
              </Button>
            </div>
            {editor.isActive("link") && (
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => editor.chain().focus().unsetLink().run()}
              >
                Remover link
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
