import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  COLUMN_COLORS, 
  getColumnTopBarClass, 
  getColumnBackgroundClass, 
  getColumnColorClass 
} from "@/lib/columnStyles";

// Re-exportar funções do utilitário centralizado para manter compatibilidade
export { getColumnTopBarClass, getColumnBackgroundClass, getColumnColorClass };

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
