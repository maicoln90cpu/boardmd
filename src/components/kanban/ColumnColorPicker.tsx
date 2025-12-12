import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Cores vibrantes para a barra superior das colunas (estilo KanbanFlow)
const COLUMN_COLORS = [
  { name: "Padrão", value: null, preview: "bg-muted", bar: "bg-muted" },
  { name: "Azul", value: "blue", preview: "bg-blue-500", bar: "bg-blue-500" },
  { name: "Verde", value: "green", preview: "bg-emerald-500", bar: "bg-emerald-500" },
  { name: "Amarelo", value: "yellow", preview: "bg-amber-400", bar: "bg-amber-400" },
  { name: "Laranja", value: "orange", preview: "bg-orange-500", bar: "bg-orange-500" },
  { name: "Vermelho", value: "red", preview: "bg-red-500", bar: "bg-red-500" },
  { name: "Roxo", value: "purple", preview: "bg-violet-500", bar: "bg-violet-500" },
  { name: "Rosa", value: "pink", preview: "bg-pink-500", bar: "bg-pink-500" },
  { name: "Ciano", value: "cyan", preview: "bg-cyan-500", bar: "bg-cyan-500" },
];

interface ColumnColorPickerProps {
  currentColor: string | null;
  onColorChange: (color: string | null) => void;
}

export function ColumnColorPicker({ currentColor, onColorChange }: ColumnColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56">
        <div className="space-y-2">
          <p className="text-sm font-medium">Cor da coluna</p>
          <div className="grid grid-cols-3 gap-2">
            {COLUMN_COLORS.map((color) => (
              <button
                key={color.value || 'default'}
                onClick={() => onColorChange(color.value)}
                className={`h-8 rounded-md border transition-all flex items-center justify-center gap-1.5 ${
                  currentColor === color.value 
                    ? 'ring-2 ring-primary ring-offset-2' 
                    : 'hover:scale-105'
                }`}
                title={color.name}
              >
                <div className={`w-4 h-4 rounded-full ${color.preview}`} />
                <span className="text-xs">{color.name}</span>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Retorna a classe CSS para a BARRA COLORIDA no topo da coluna (4px)
export function getColumnTopBarClass(color: string | null): string {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-emerald-500",
    yellow: "bg-amber-400",
    orange: "bg-orange-500",
    red: "bg-red-500",
    purple: "bg-violet-500",
    pink: "bg-pink-500",
    cyan: "bg-cyan-500",
  };
  
  return color ? colorMap[color] || "bg-muted" : "bg-muted";
}

// Retorna a classe CSS para o FUNDO SUAVE da coluna (matching top bar color)
export function getColumnBackgroundClass(color: string | null): string {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-950/20",
    green: "bg-emerald-50 dark:bg-emerald-950/20",
    yellow: "bg-amber-50 dark:bg-amber-950/20",
    orange: "bg-orange-50 dark:bg-orange-950/20",
    red: "bg-red-50 dark:bg-red-950/20",
    purple: "bg-violet-50 dark:bg-violet-950/20",
    pink: "bg-pink-50 dark:bg-pink-950/20",
    cyan: "bg-cyan-50 dark:bg-cyan-950/20",
  };
  
  return color ? colorMap[color] || "bg-card" : "bg-card";
}

// DEPRECATED: Mantido para compatibilidade - agora usamos getColumnTopBarClass
export function getColumnColorClass(color: string | null): string {
  // Retorna classe neutra pois o fundo da coluna agora é sempre neutro
  return "bg-card";
}
