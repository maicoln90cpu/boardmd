import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSettings } from "@/hooks/data/useSettings";
import { useAuth } from "@/contexts/AuthContext";

type Theme = "light" | "dark" | "auto";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { settings, updateSettings, isLoading } = useSettings();
  
  // Estado local para tema (fallback para localStorage quando não logado)
  const [localTheme, setLocalTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme") as Theme;
    return stored || "auto";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Tema atual: usa settings se logado, senão localStorage
  const theme: Theme = user && !isLoading ? (settings.theme || "auto") : localTheme;

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
    
    // Também salvar no localStorage como fallback
    localStorage.setItem("theme", theme);
  }, [resolvedTheme, theme]);

  // Setter que atualiza no banco quando logado
  const setTheme = useCallback((newTheme: Theme) => {
    if (user) {
      // Salvar no banco via settings
      updateSettings({ theme: newTheme });
    } else {
      // Salvar apenas localmente
      setLocalTheme(newTheme);
      localStorage.setItem("theme", newTheme);
    }
  }, [user, updateSettings]);

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