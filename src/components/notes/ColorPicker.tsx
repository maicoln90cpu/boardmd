import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const COLORS = [
  { name: "Padrão", value: null, bg: "bg-background", border: "border-border" },
  { name: "Vermelho", value: "#fee", bg: "bg-red-50", border: "border-red-200" },
  { name: "Laranja", value: "#fed", bg: "bg-orange-50", border: "border-orange-200" },
  { name: "Amarelo", value: "#ffc", bg: "bg-yellow-50", border: "border-yellow-200" },
  { name: "Verde", value: "#efe", bg: "bg-green-50", border: "border-green-200" },
  { name: "Azul", value: "#eef", bg: "bg-blue-50", border: "border-blue-200" },
  { name: "Roxo", value: "#fef", bg: "bg-purple-50", border: "border-purple-200" },
];

interface ColorPickerProps {
  currentColor: string | null;
  onColorChange: (color: string | null) => void;
}

export function ColorPicker({ currentColor, onColorChange }: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-10 w-10">
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-2">
          <p className="text-sm font-medium">Cor da nota</p>
          <div className="grid grid-cols-4 gap-2">
            {COLORS.map((color) => (
              <button
                key={color.value || 'default'}
                onClick={() => onColorChange(color.value)}
                className={`h-10 rounded-md border-2 transition-all ${
                  currentColor === color.value 
                    ? 'ring-2 ring-primary ring-offset-2' 
                    : 'hover:scale-105'
                } ${color.bg} ${color.border}`}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
