import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useColorTheme, ColorPalette, paletteNames } from "@/contexts/ColorThemeContext";
import { cn } from "@/lib/utils";
import { Check, Palette, Pipette, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Convert HEX to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let r = 0, g = 0, b = 0;
  
  // Remove #
  hex = hex.replace("#", "");
  
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16) / 255;
    g = parseInt(hex[1] + hex[1], 16) / 255;
    b = parseInt(hex[2] + hex[2], 16) / 255;
  } else {
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Convert HSL to HEX
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Predefined palettes
const presetPalettes: { name: string; color: string }[] = [
  { name: "Padrão", color: "#363333" },
  { name: "Oceano", color: "#0ea5e9" },
  { name: "Floresta", color: "#22c55e" },
  { name: "Pôr do Sol", color: "#f97316" },
  { name: "Lavanda", color: "#a855f7" },
  { name: "Rosa", color: "#ec4899" },
  { name: "Azul Royal", color: "#3b82f6" },
  { name: "Esmeralda", color: "#10b981" },
  { name: "Vermelho", color: "#ef4444" },
  { name: "Âmbar", color: "#f59e0b" },
  { name: "Índigo", color: "#6366f1" },
  { name: "Turquesa", color: "#14b8a6" },
];

export function CustomColorPicker() {
  const { colorPalette, setColorPalette } = useColorTheme();
  const { user } = useAuth();
  const [customColor, setCustomColor] = useState("#3b82f6");
  const [isCustom, setIsCustom] = useState(false);

  // Load custom color from settings
  useEffect(() => {
    if (!user) return;

    const loadCustomColor = async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("settings")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.settings) {
        const settings = data.settings as Record<string, unknown>;
        if (settings.customPrimaryColor) {
          setCustomColor(settings.customPrimaryColor as string);
          if (colorPalette === "custom") {
            setIsCustom(true);
          }
        }
      }
    };

    loadCustomColor();
  }, [user, colorPalette]);

  const applyCustomColor = useCallback(async (hex: string) => {
    const hsl = hexToHsl(hex);
    const root = window.document.documentElement;

    // Apply HSL values
    const hslString = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
    root.style.setProperty("--primary", hslString);
    root.style.setProperty("--primary-foreground", "0 0% 100%");
    root.style.setProperty("--accent", `${hsl.h} ${hsl.s}% 95%`);
    root.style.setProperty("--accent-foreground", `${hsl.h} ${hsl.s}% 30%`);
    root.style.setProperty("--ring", `${hsl.h} ${hsl.s}% ${Math.min(hsl.l + 15, 70)}%`);

    // Save to localStorage
    localStorage.setItem("custom-primary-color", hex);

    // Save to database
    if (user) {
      try {
        const { data } = await supabase
          .from("user_settings")
          .select("settings")
          .eq("user_id", user.id)
          .maybeSingle();

        const currentSettings = (data?.settings || {}) as Record<string, unknown>;
        const mergedSettings = { 
          ...currentSettings, 
          customPrimaryColor: hex,
          colorPalette: "custom",
        };

        await supabase
          .from("user_settings")
          .upsert(
            { user_id: user.id, settings: mergedSettings },
            { onConflict: "user_id" }
          );
      } catch (error) {
        console.error("Error saving custom color:", error);
      }
    }

    setIsCustom(true);
    toast.success("Cor personalizada aplicada!");
  }, [user]);

  const handlePresetClick = (color: string, name: string) => {
    setCustomColor(color);
    
    // Check if it matches a standard palette
    const standardPalette = Object.entries(paletteNames).find(
      ([_, pName]) => pName === name
    );
    
    if (standardPalette) {
      setIsCustom(false);
      setColorPalette(standardPalette[0] as ColorPalette);
    } else {
      applyCustomColor(color);
    }
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColor(e.target.value);
  };

  const handleApplyCustom = () => {
    applyCustomColor(customColor);
  };

  const handleReset = () => {
    setIsCustom(false);
    setColorPalette("default");
    localStorage.removeItem("custom-primary-color");
    toast.info("Cores restauradas para o padrão");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Tema de Cores
        </CardTitle>
        <CardDescription>
          Escolha uma paleta predefinida ou crie sua própria cor
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preset Colors Grid */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Paletas Predefinidas</Label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {presetPalettes.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetClick(preset.color, preset.name)}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all hover:scale-105",
                  customColor === preset.color && isCustom
                    ? "border-primary ring-2 ring-primary/20"
                    : !isCustom && paletteNames[colorPalette] === preset.name
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-muted hover:border-primary/50"
                )}
              >
                <div
                  className="h-8 w-8 rounded-full shadow-md transition-transform"
                  style={{ backgroundColor: preset.color }}
                />
                <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                  {preset.name}
                </span>
                {((!isCustom && paletteNames[colorPalette] === preset.name) || 
                  (isCustom && customColor === preset.color)) && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Color Picker */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Cor Personalizada</Label>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
              <div
                className="h-10 w-10 rounded-lg border-2 border-muted shadow-md cursor-pointer"
                style={{ backgroundColor: customColor }}
              />
            </div>
            <Input
              value={customColor}
              onChange={handleCustomColorChange}
              placeholder="#3b82f6"
              className="font-mono uppercase"
              maxLength={7}
            />
            <Button onClick={handleApplyCustom} size="sm">
              <Pipette className="h-4 w-4 mr-2" />
              Aplicar
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm text-muted-foreground mb-3">Prévia:</p>
          <div className="flex items-center gap-3 flex-wrap">
            <Button size="sm">Botão Primário</Button>
            <Button size="sm" variant="outline">Botão Secundário</Button>
            <span className="text-sm text-primary font-medium">Link de exemplo</span>
          </div>
        </div>

        {/* Reset Button */}
        <Button variant="outline" onClick={handleReset} className="w-full">
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar Cores Padrão
        </Button>
      </CardContent>
    </Card>
  );
}
