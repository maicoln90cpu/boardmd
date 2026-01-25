import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type Theme = "light" | "dark" | "auto";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Estado local para tema (sempre começa do localStorage para evitar flash)
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme") as Theme;
    return stored || "auto";
  });
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [user, setUser] = useState<User | null>(null);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Carregar user e settings do banco de forma independente
  useEffect(() => {
    // Obter usuário atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Escutar mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setIsDbLoaded(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Carregar tema do banco quando usuário está logado
  useEffect(() => {
    if (!user) {
      setIsDbLoaded(false);
      return;
    }

    const loadFromDb = async () => {
      try {
        const { data } = await supabase
          .from("user_settings")
          .select("settings")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data?.settings) {
          const dbTheme = (data.settings as any).theme as Theme;
          if (dbTheme && ['light', 'dark', 'auto'].includes(dbTheme)) {
            setThemeState(dbTheme);
            localStorage.setItem("theme", dbTheme);
          }
        }
      } catch (error) {
        // Silently fail, use localStorage fallback
      } finally {
        setIsDbLoaded(true);
      }
    };

    loadFromDb();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('theme_settings_changes')
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
            const dbTheme = (payload.new.settings as any).theme as Theme;
            if (dbTheme && ['light', 'dark', 'auto'].includes(dbTheme)) {
              setThemeState(dbTheme);
              localStorage.setItem("theme", dbTheme);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Atualizar resolvedTheme baseado no tema atual
  useEffect(() => {
    if (theme === "auto") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      setResolvedTheme(mediaQuery.matches ? "dark" : "light");
      
      const handler = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? "dark" : "light");
      };
      
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      setResolvedTheme(theme);
    }
  }, [theme]);

  // Aplicar classe no documento
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
    localStorage.setItem("theme", theme);
  }, [resolvedTheme, theme]);

  // Setter que atualiza no banco quando logado
  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    
    if (user) {
      try {
        // Buscar settings atuais e fazer merge
        const { data } = await supabase
          .from("user_settings")
          .select("settings")
          .eq("user_id", user.id)
          .maybeSingle();

        const currentSettings = (data?.settings || {}) as Record<string, any>;
        const mergedSettings = { ...currentSettings, theme: newTheme };

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

  const toggleTheme = useCallback(() => {
    const themes: Theme[] = ["light", "dark", "auto"];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}