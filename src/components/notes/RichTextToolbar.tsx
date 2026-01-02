import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Palette,
  RemoveFormatting,
  Sparkles,
  CheckSquare,
  SortAsc,
  Table,
  TableProperties,
  Image as ImageIcon,
  Code2,
  Quote,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Badge,
  ListTodo,
  Target,
  LayoutList,
  Type,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Task } from "@/hooks/useTasks";
import { TaskSelectorModal } from "./TaskSelectorModal";
import { useRateLimiter, RATE_LIMIT_CONFIGS } from "@/hooks/useRateLimiter";

interface RichTextToolbarProps {
  editor: Editor | null;
  tasks?: Task[];
  onInsertTaskBlock?: (task: Task) => void;
  onCreateTask?: (taskData: { title: string; description?: string; priority: string }) => Promise<Task | null>;
}

const TEXT_COLORS = [
  { name: "Preto", value: "#000000" },
  { name: "Amarelo", value: "#FCD34D" },
  { name: "Azul", value: "#3B82F6" },
  { name: "Verde", value: "#10B981" },
  { name: "Vermelho", value: "#EF4444" },
];

const HIGHLIGHT_COLORS = [
  { name: "Amarelo", value: "#FEF08A" },
  { name: "Azul", value: "#BFDBFE" },
  { name: "Verde", value: "#BBF7D0" },
  { name: "Rosa", value: "#FBCFE8" },
  { name: "Laranja", value: "#FED7AA" },
];

const FONT_SIZES = [
  { name: "Pequena", value: "12px" },
  { name: "Normal", value: "14px" },
  { name: "Média", value: "16px" },
  { name: "Grande", value: "18px" },
  { name: "Extra Grande", value: "20px" },
  { name: "Muito Grande", value: "26px" },
];

export function RichTextToolbar({ editor, tasks = [], onInsertTaskBlock, onCreateTask }: RichTextToolbarProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isFormattingWithAI, setIsFormattingWithAI] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  
  // Rate limiter para endpoint de IA
  const { checkLimit: checkAILimit } = useRateLimiter(RATE_LIMIT_CONFIGS.ai);

  if (!editor) return null;

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl("");
      setShowLinkInput(false);
    }
  };

  const removeLink = () => {
    editor.chain().focus().unsetLink().run();
  };

  const addImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl("");
      setShowImageInput(false);
    }
  };

  const addImageFromFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          editor.chain().focus().setImage({ src: dataUrl }).run();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const formatWithAI = async (action: string) => {
    // Verificar rate limit antes de fazer requisição
    if (!checkAILimit()) return;
    
    if (!editor) return;

    const content = editor.getHTML();
    if (!content || content === "<p></p>") {
      toast.error("Adicione algum conteúdo antes de formatar");
      return;
    }

    setIsFormattingWithAI(true);

    try {
      const { data, error } = await supabase.functions.invoke("format-note", {
        body: { content, action },
      });

      if (error) {
        if (error.message?.includes("429")) {
          toast.error("Muitas requisições. Aguarde um momento.");
        } else if (error.message?.includes("402")) {
          toast.error("Créditos insuficientes. Adicione em Settings → Workspace → Usage.");
        } else {
          toast.error("Erro ao formatar nota");
        }
        console.error("Format error:", error);
        return;
      }

      if (data?.formattedContent) {
        editor.commands.setContent(data.formattedContent);
        toast.success("Nota formatada com sucesso!");
      }
    } catch (error) {
      console.error("Format error:", error);
      toast.error("Erro ao formatar nota");
    } finally {
      setIsFormattingWithAI(false);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="border-b p-2 flex flex-wrap gap-1 bg-card sticky top-0 z-10 overflow-x-auto">
        {/* Formatação básica */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive("bold") ? "bg-accent" : ""}
            >
              <Bold className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Negrito <kbd className="ml-1 text-xs bg-muted px-1 rounded">Ctrl+B</kbd></p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive("italic") ? "bg-accent" : ""}
            >
              <Italic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Itálico <kbd className="ml-1 text-xs bg-muted px-1 rounded">Ctrl+I</kbd></p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={editor.isActive("underline") ? "bg-accent" : ""}
            >
              <Underline className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Sublinhado <kbd className="ml-1 text-xs bg-muted px-1 rounded">Ctrl+U</kbd></p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-1" />

      {/* Tamanho da fonte */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" title="Tamanho da fonte">
            <Type className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40 bg-popover z-50">
          {FONT_SIZES.map((size) => (
            <DropdownMenuItem
              key={size.value}
              onClick={() => editor.chain().focus().setFontSize(size.value).run()}
              className="flex items-center justify-between"
            >
              <span style={{ fontSize: size.value }}>{size.name}</span>
              <span className="text-xs text-muted-foreground">{size.value}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => editor.chain().focus().unsetFontSize().run()}>
            Resetar tamanho
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Link */}
      <Popover open={showLinkInput} onOpenChange={setShowLinkInput}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={editor.isActive("link") ? "bg-accent" : ""}
            title="Adicionar link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="flex flex-col gap-2">
            <Input
              placeholder="https://exemplo.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addLink();
                if (e.key === "Escape") setShowLinkInput(false);
              }}
            />
            <div className="flex gap-2">
              <Button onClick={addLink} size="sm" className="flex-1">
                Adicionar
              </Button>
              {editor.isActive("link") && (
                <Button onClick={removeLink} variant="destructive" size="sm">
                  Remover
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Cor do texto */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" title="Cor do texto">
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48">
          <div className="grid grid-cols-5 gap-2">
            {TEXT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => editor.chain().focus().setColor(color.value).run()}
                className="w-8 h-8 rounded border-2 border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Marca-texto */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" title="Marca-texto">
            <Highlighter className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48">
          <div className="grid grid-cols-5 gap-2">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => editor.chain().focus().toggleHighlight({ color: color.value }).run()}
                className="w-8 h-8 rounded border-2 border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().unsetHighlight().run()}
            className="w-full mt-2"
          >
            Remover marca-texto
          </Button>
        </PopoverContent>
      </Popover>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Listas */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive("bulletList") ? "bg-accent" : ""}
        title="Lista com marcadores"
      >
        <List className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive("orderedList") ? "bg-accent" : ""}
        title="Lista numerada"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        className={editor.isActive("taskList") ? "bg-accent" : ""}
        title="Lista com checkboxes"
      >
        <CheckSquare className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Ordenação alfabética */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (!editor) return;

          const { from, to } = editor.state.selection;
          if (from === to) {
            toast.error("Selecione o texto que deseja ordenar");
            return;
          }

          const text = editor.state.doc.textBetween(from, to, "\n");
          const lines = text.split("\n").filter((line) => line.trim());

          if (lines.length < 2) {
            toast.error("Selecione pelo menos 2 linhas");
            return;
          }

          const sorted = lines.sort((a, b) =>
            a.trim().localeCompare(b.trim(), "pt-BR", {
              sensitivity: "base",
              ignorePunctuation: true,
            }),
          );

          const sortedText = sorted.join("\n");

          editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, sortedText).run();

          toast.success(`${lines.length} linhas ordenadas alfabeticamente`);
        }}
        title="Ordenar seleção alfabeticamente (A-Z)"
      >
        <SortAsc className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Alinhamento */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        className={editor.isActive({ textAlign: "left" }) ? "bg-accent" : ""}
        title="Alinhar à esquerda"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        className={editor.isActive({ textAlign: "center" }) ? "bg-accent" : ""}
        title="Centralizar"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        className={editor.isActive({ textAlign: "right" }) ? "bg-accent" : ""}
        title="Alinhar à direita"
      >
        <AlignRight className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Limpar formatação */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        title="Limpar formatação"
      >
        <RemoveFormatting className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Tabela */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" title="Inserir tabela">
            <Table className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
          <DropdownMenuItem
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            <TableProperties className="mr-2 h-4 w-4" />
            Inserir tabela 3x3
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            disabled={!editor.can().addColumnBefore()}
          >
            Adicionar coluna antes
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            disabled={!editor.can().addColumnAfter()}
          >
            Adicionar coluna depois
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().deleteColumn().run()}
            disabled={!editor.can().deleteColumn()}
          >
            Excluir coluna
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().addRowBefore().run()}
            disabled={!editor.can().addRowBefore()}
          >
            Adicionar linha antes
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().addRowAfter().run()}
            disabled={!editor.can().addRowAfter()}
          >
            Adicionar linha depois
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().deleteRow().run()}
            disabled={!editor.can().deleteRow()}
          >
            Excluir linha
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().deleteTable().run()}
            disabled={!editor.can().deleteTable()}
            className="text-destructive"
          >
            Excluir tabela
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Imagem */}
      <Popover open={showImageInput} onOpenChange={setShowImageInput}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" title="Inserir imagem">
            <ImageIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 bg-popover z-50">
          <div className="flex flex-col gap-2">
            <Input
              placeholder="URL da imagem"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addImage();
                if (e.key === "Escape") setShowImageInput(false);
              }}
            />
            <div className="flex gap-2">
              <Button onClick={addImage} size="sm" className="flex-1">
                Adicionar URL
              </Button>
              <Button onClick={addImageFromFile} variant="outline" size="sm" className="flex-1">
                Upload
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Bloco de código */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={editor.isActive("codeBlock") ? "bg-accent" : ""}
        title="Bloco de código"
      >
        <Code2 className="h-4 w-4" />
      </Button>

      {/* Blockquote */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={editor.isActive("blockquote") ? "bg-accent" : ""}
        title="Citação/Blockquote"
      >
        <Quote className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Callouts */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" title="Inserir callout/alerta">
            <Info className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => {
              editor
                .chain()
                .focus()
                .insertContent('<div class="callout callout-info"><p>💡 Informação importante aqui</p></div><p></p>')
                .run();
            }}
          >
            <Info className="mr-2 h-4 w-4 text-blue-500" />
            Callout Info
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              editor
                .chain()
                .focus()
                .insertContent('<div class="callout callout-warning"><p>⚠️ Atenção para este ponto</p></div><p></p>')
                .run();
            }}
          >
            <AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" />
            Callout Aviso
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              editor
                .chain()
                .focus()
                .insertContent('<div class="callout callout-success"><p>✅ Sucesso ou ponto positivo</p></div><p></p>')
                .run();
            }}
          >
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            Callout Sucesso
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              editor
                .chain()
                .focus()
                .insertContent('<div class="callout callout-error"><p>❌ Erro ou ponto crítico</p></div><p></p>')
                .run();
            }}
          >
            <XCircle className="mr-2 h-4 w-4 text-red-500" />
            Callout Erro
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Badges de prioridade */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" title="Inserir badge de prioridade">
            <Badge className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => {
              editor.chain().focus().insertContent('<span class="priority-badge priority-high">🔴 Alta</span> ').run();
            }}
          >
            <span className="mr-2 w-3 h-3 rounded-full bg-red-500"></span>
            Prioridade Alta
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              editor
                .chain()
                .focus()
                .insertContent('<span class="priority-badge priority-medium">🟡 Média</span> ')
                .run();
            }}
          >
            <span className="mr-2 w-3 h-3 rounded-full bg-yellow-500"></span>
            Prioridade Média
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              editor.chain().focus().insertContent('<span class="priority-badge priority-low">🟢 Baixa</span> ').run();
            }}
          >
            <span className="mr-2 w-3 h-3 rounded-full bg-green-500"></span>
            Prioridade Baixa
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              editor
                .chain()
                .focus()
                .insertContent(
                  '<div class="metric-card"><span class="metric-value">0</span><span class="metric-label">Descrição da métrica</span></div><p></p>',
                )
                .run();
            }}
          >
            <TableProperties className="mr-2 h-4 w-4" />
            Card de Métrica
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Inserir Tarefa do Kanban */}
      {onInsertTaskBlock && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowTaskSelector(true)}
          title="Inserir tarefa do Kanban"
          className="text-primary hover:text-primary"
        >
          <ClipboardList className="h-4 w-4" />
        </Button>
      )}

      <div className="w-px h-6 bg-border mx-1" />

      {/* AI Formatting */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" title="Formatar com IA" disabled={isFormattingWithAI}>
            <Sparkles className={`h-4 w-4 ${isFormattingWithAI ? "animate-pulse" : ""}`} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
          <DropdownMenuItem onClick={() => formatWithAI("improve")}>
            <Sparkles className="mr-2 h-4 w-4" />
            Melhorar legibilidade
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatWithAI("grammar")}>
            <Sparkles className="mr-2 h-4 w-4" />
            Corrigir gramática
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatWithAI("summarize")}>
            <Sparkles className="mr-2 h-4 w-4" />
            Resumir
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatWithAI("expand")}>
            <Sparkles className="mr-2 h-4 w-4" />
            Expandir
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatWithAI("professional")}>
            <Sparkles className="mr-2 h-4 w-4" />
            Tornar profissional
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => formatWithAI("toList")}>
            <LayoutList className="mr-2 h-4 w-4" />
            Transformar em lista
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatWithAI("toTable")}>
            <Table className="mr-2 h-4 w-4" />
            Transformar em tabela
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatWithAI("extractActions")}>
            <ListTodo className="mr-2 h-4 w-4" />
            Extrair ações/tarefas
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatWithAI("keyPoints")}>
            <Target className="mr-2 h-4 w-4" />
            Extrair pontos-chave
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => formatWithAI("structure")}>
            <Type className="mr-2 h-4 w-4" />
            Melhorar formatação
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal de seleção de tarefa */}
      <TaskSelectorModal
        open={showTaskSelector}
        onOpenChange={setShowTaskSelector}
        tasks={tasks}
        onSelectTask={(task) => {
          if (onInsertTaskBlock) {
            onInsertTaskBlock(task);
          }
        }}
        onCreateTask={onCreateTask}
      />
      </div>
    </TooltipProvider>
  );
}
