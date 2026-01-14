import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useColorTheme, ColorPalette, paletteNames, paletteColors } from "@/contexts/ColorThemeContext";
import { cn } from "@/lib/utils";
import { Check, Palette } from "lucide-react";

export function ColorPaletteSelector() {
  const { colorPalette, setColorPalette } = useColorTheme();

  const palettes: ColorPalette[] = ["default", "ocean", "forest", "sunset", "lavender"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Tema de Cores
        </CardTitle>
        <CardDescription>
          Escolha uma paleta de cores para personalizar a aparência do app
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {palettes.map((palette) => (
            <button
              key={palette}
              onClick={() => setColorPalette(palette)}
              className={cn(
                "relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                colorPalette === palette
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/50"
              )}
            >
              {/* Color circle */}
              <div
                className="h-10 w-10 rounded-full shadow-md"
                style={{ backgroundColor: paletteColors[palette] }}
              />
              
              {/* Name */}
              <span className="text-sm font-medium">{paletteNames[palette]}</span>

              {/* Check mark */}
              {colorPalette === palette && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm text-muted-foreground mb-3">Prévia:</p>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">
              Botão Primário
            </button>
            <button className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium border">
              Botão Secundário
            </button>
            <span className="text-sm text-primary font-medium">Link de exemplo</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
