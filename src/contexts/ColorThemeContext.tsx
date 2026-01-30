import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type ColorPalette = "default" | "ocean" | "forest" | "sunset" | "lavender" | "custom";

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
  custom: {
    primary: "217 91% 60%",
    "primary-foreground": "0 0% 100%",
    accent: "217 91% 95%",
    "accent-foreground": "217 91% 35%",
    ring: "217 91% 70%",
  },
};

export const paletteNames: Record<ColorPalette, string> = {
  default: "Padrão",
  ocean: "Oceano",
  forest: "Floresta",
  sunset: "Pôr do Sol",
  lavender: "Lavanda",
  custom: "Personalizado",
};

export const paletteColors: Record<ColorPalette, string> = {
  default: "#363333",
  ocean: "#0ea5e9",
  forest: "#22c55e",
  sunset: "#f97316",
  lavender: "#a855f7",
  custom: "#3b82f6",
};

const isValidPalette = (value: unknown): value is ColorPalette => {
  return typeof value === 'string' && ['default', 'ocean', 'forest', 'sunset', 'lavender', 'custom'].includes(value);
};

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  // Estado local para paleta (sempre começa do localStorage para evitar flash)
  const [colorPalette, setColorPaletteState] = useState<ColorPalette>(() => {
    const stored = localStorage.getItem("color-palette");
    return isValidPalette(stored) ? stored : "default";
  });
  const [user, setUser] = useState<User | null>(null);

  // Carregar user de forma independente
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Carregar paleta do banco quando usuário está logado
  useEffect(() => {
    if (!user) return;

    const loadFromDb = async () => {
      try {
        const { data } = await supabase
          .from("user_settings")
          .select("settings")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data?.settings) {
          const dbPalette = (data.settings as any).colorPalette;
          if (isValidPalette(dbPalette)) {
            setColorPaletteState(dbPalette);
            localStorage.setItem("color-palette", dbPalette);
          }
        }
      } catch (error) {
        // Silently fail, use localStorage fallback
      }
    };

    loadFromDb();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('color_settings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new?.settings) {
            const dbPalette = (payload.new.settings as any).colorPalette;
            if (isValidPalette(dbPalette)) {
              setColorPaletteState(dbPalette);
              localStorage.setItem("color-palette", dbPalette);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Aplicar variáveis CSS
  useEffect(() => {
    const root = window.document.documentElement;
    const palette = palettes[colorPalette];

    Object.entries(palette).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });

    localStorage.setItem("color-palette", colorPalette);
  }, [colorPalette]);

  // Setter que atualiza no banco quando logado
  const setColorPalette = useCallback(async (newPalette: ColorPalette) => {
    setColorPaletteState(newPalette);
    localStorage.setItem("color-palette", newPalette);
    
    if (user) {
      try {
        const { data } = await supabase
          .from("user_settings")
          .select("settings")
          .eq("user_id", user.id)
          .maybeSingle();

        const currentSettings = (data?.settings || {}) as Record<string, any>;
        const mergedSettings = { ...currentSettings, colorPalette: newPalette };

        await supabase
          .from("user_settings")
          .upsert(
            { user_id: user.id, settings: mergedSettings },
            { onConflict: 'user_id' }
          );
      } catch (error) {
        // Silently fail, localStorage is already updated
      }
    }
  }, [user]);

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