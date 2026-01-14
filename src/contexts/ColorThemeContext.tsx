import { createContext, useContext, useEffect, useState } from "react";

export type ColorPalette = "default" | "ocean" | "forest" | "sunset" | "lavender";

interface ColorThemeContextType {
  colorPalette: ColorPalette;
  setColorPalette: (palette: ColorPalette) => void;
}

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(undefined);

// Paletas de cores (HSL values)
const palettes: Record<ColorPalette, Record<string, string>> = {
  default: {
    primary: "266 4% 20.8%",
    "primary-foreground": "248 0.3% 98.4%",
    accent: "248 0.7% 96.8%",
    "accent-foreground": "266 4% 20.8%",
    ring: "257 4% 70.4%",
  },
  ocean: {
    primary: "199 89% 48%",
    "primary-foreground": "0 0% 100%",
    accent: "199 89% 95%",
    "accent-foreground": "199 89% 30%",
    ring: "199 89% 60%",
  },
  forest: {
    primary: "142 76% 36%",
    "primary-foreground": "0 0% 100%",
    accent: "142 76% 95%",
    "accent-foreground": "142 76% 25%",
    ring: "142 76% 50%",
  },
  sunset: {
    primary: "24 95% 53%",
    "primary-foreground": "0 0% 100%",
    accent: "24 95% 95%",
    "accent-foreground": "24 95% 35%",
    ring: "24 95% 65%",
  },
  lavender: {
    primary: "270 67% 58%",
    "primary-foreground": "0 0% 100%",
    accent: "270 67% 95%",
    "accent-foreground": "270 67% 35%",
    ring: "270 67% 70%",
  },
};

export const paletteNames: Record<ColorPalette, string> = {
  default: "Padrão",
  ocean: "Oceano",
  forest: "Floresta",
  sunset: "Pôr do Sol",
  lavender: "Lavanda",
};

export const paletteColors: Record<ColorPalette, string> = {
  default: "#363333",
  ocean: "#0ea5e9",
  forest: "#22c55e",
  sunset: "#f97316",
  lavender: "#a855f7",
};

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorPalette, setColorPalette] = useState<ColorPalette>(() => {
    const stored = localStorage.getItem("color-palette") as ColorPalette;
    return stored || "default";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const palette = palettes[colorPalette];

    // Aplicar variáveis CSS
    Object.entries(palette).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });

    localStorage.setItem("color-palette", colorPalette);
  }, [colorPalette]);

  return (
    <ColorThemeContext.Provider value={{ colorPalette, setColorPalette }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme() {
  const context = useContext(ColorThemeContext);
  if (!context) {
    throw new Error("useColorTheme must be used within ColorThemeProvider");
  }
  return context;
}
