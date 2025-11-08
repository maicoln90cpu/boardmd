import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const COLUMN_COLORS = [
  { name: "Padrão", value: null, bg: "bg-muted/50" },
  { name: "Vermelho", value: "red", bg: "bg-red-100 dark:bg-red-950" },
  { name: "Laranja", value: "orange", bg: "bg-orange-100 dark:bg-orange-950" },
  { name: "Amarelo", value: "yellow", bg: "bg-yellow-100 dark:bg-yellow-950" },
  { name: "Verde", value: "green", bg: "bg-green-100 dark:bg-green-950" },
  { name: "Azul", value: "blue", bg: "bg-blue-100 dark:bg-blue-950" },
  { name: "Roxo", value: "purple", bg: "bg-purple-100 dark:bg-purple-950" },
  { name: "Rosa", value: "pink", bg: "bg-pink-100 dark:bg-pink-950" },
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
          <div className="grid grid-cols-4 gap-2">
            {COLUMN_COLORS.map((color) => (
              <button
                key={color.value || 'default'}
                onClick={() => onColorChange(color.value)}
                className={`h-10 rounded-md border-2 transition-all ${
                  currentColor === color.value 
                    ? 'ring-2 ring-primary ring-offset-2' 
                    : 'hover:scale-105'
                } ${color.bg}`}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function getColumnColorClass(color: string | null): string {
  const colorMap: Record<string, string> = {
    red: "bg-red-100 dark:bg-red-950",
    orange: "bg-orange-100 dark:bg-orange-950",
    yellow: "bg-yellow-100 dark:bg-yellow-950",
    green: "bg-green-100 dark:bg-green-950",
    blue: "bg-blue-100 dark:bg-blue-950",
    purple: "bg-purple-100 dark:bg-purple-950",
    pink: "bg-pink-100 dark:bg-pink-950",
  };
  
  return color ? colorMap[color] || "bg-muted/50" : "bg-muted/50";
}
