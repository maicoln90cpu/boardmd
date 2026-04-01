import { Layers, FileText, BarChart3, Calendar, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SECONDARY_MENU_ITEMS, isMenuItemActive } from "@/hooks/ui/useMenuItems";
import { hapticSelection } from "@/lib/haptic";
import { cn } from "@/lib/utils";

const TABS = [
  { icon: Layers, label: "Projetos", path: "/" },
  { icon: FileText, label: "Notas", path: "/notes" },
  { icon: BarChart3, label: "Dashboard", path: "/dashboard" },
  { icon: Calendar, label: "Calendário", path: "/calendar" },
] as const;

export function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleNavigate = (path: string) => {
    hapticSelection();
    navigate(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {TABS.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => handleNavigate(path)}
              aria-label={`Navegar para ${label}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors min-h-[48px]",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}

        {/* More button */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="Mais opções de navegação"
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors text-muted-foreground min-h-[48px]"
              )}
              onClick={() => hapticSelection()}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
            <SheetHeader>
              <SheetTitle>Mais opções</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 py-4">
              {SECONDARY_MENU_ITEMS.map((item) => {
                const active = isMenuItemActive(item, location.pathname);
                return (
                  <Button
                    key={item.path}
                    variant={active ? "secondary" : "ghost"}
                    className="flex flex-col items-center gap-1.5 h-auto py-3"
                    onClick={() => {
                      hapticSelection();
                      navigate(item.path);
                      setMoreOpen(false);
                    }}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
