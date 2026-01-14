import { useState, useEffect, useMemo } from "react";
import { Calendar, Layers, FileText, BarChart3, Bell, Settings, LogOut, Timer, MoreHorizontal, ChevronDown, ChevronRight, Folder, LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar as AnimatedSidebar, SidebarBody, SidebarLink, SidebarDivider, useSidebar } from "@/components/ui/animated-sidebar";
import { useSettings } from "@/hooks/data/useSettings";
import { useCategories } from "@/hooks/data/useCategories";
import { CategoryTree } from "@/components/sidebar/CategoryTree";
import { useTaskCounts } from "@/hooks/data/useTaskCounts";

interface SidebarProps {
  onExport: () => void;
  onImport: () => void;
  onThemeToggle: () => void;
  onViewChange: (mode: "daily" | "all") => void;
  viewMode: "daily" | "all";
  onCategorySelect?: (categoryId: string | null) => void;
  selectedCategoryId?: string | null;
}

// ============================================================================
// MENU ITEMS - Constante única usada por desktop e mobile
// ============================================================================
interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  mode?: "daily" | "all";
}

const PRIMARY_MENU_ITEMS: MenuItem[] = [
  { icon: Calendar, label: "Diário", path: "/", mode: "daily" },
  { icon: Layers, label: "Projetos", path: "/", mode: "all" },
  { icon: FileText, label: "Anotações", path: "/notes" },
  { icon: BarChart3, label: "Dashboard", path: "/dashboard" },
];

const SECONDARY_MENU_ITEMS: MenuItem[] = [
  { icon: Timer, label: "Pomodoro", path: "/pomodoro" },
  { icon: Calendar, label: "Calendário", path: "/calendar" },
  { icon: Bell, label: "Notificações", path: "/notifications" },
  { icon: Settings, label: "Setup", path: "/config" },
];

// Helper para verificar se item está ativo
const isMenuItemActive = (
  item: MenuItem,
  pathname: string,
  viewMode: "daily" | "all"
): boolean => {
  if (item.path === "/" && item.mode) {
    return pathname === "/" && viewMode === item.mode;
  }
  return pathname === item.path;
};

// ============================================================================
// COMPONENTS
// ============================================================================

// Logo component without pin button
const Logo = () => {
  const { open } = useSidebar();
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex-shrink-0 flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-sm">KB</span>
      </div>
      <motion.span
        animate={{
          display: open ? "inline-block" : "none",
          opacity: open ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
        className="font-semibold text-foreground whitespace-pre"
      >
        Kanban Board
      </motion.span>
    </div>
  );
};

// Desktop sidebar content
const SidebarContent = ({
  viewMode,
  onViewChange,
  onCategorySelect,
  selectedCategoryId,
}: {
  viewMode: "daily" | "all";
  onViewChange: (mode: "daily" | "all") => void;
  onCategorySelect?: (categoryId: string | null) => void;
  selectedCategoryId?: string | null;
}) => {
  const { categories } = useCategories();
  const { open: sidebarOpen } = useSidebar();
  const [showCategories, setShowCategories] = useState(true);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    if (confirm("Deseja realmente sair?")) {
      await signOut();
    }
  };

  const handleNavigation = (path: string, mode?: "daily" | "all") => {
    navigate(path);
    if (mode) {
      setTimeout(() => onViewChange(mode), 50);
    }
  };

  // Gerar links de sidebar a partir da constante unificada
  const primaryLinks = useMemo(
    () =>
      PRIMARY_MENU_ITEMS.map((item) => ({
        label: item.label,
        href: item.path,
        icon: <item.icon className="h-5 w-5" />,
        onClick: () => {
          if (item.mode === "all") {
            onCategorySelect?.(null);
          }
          handleNavigation(item.path, item.mode);
        },
        active: isMenuItemActive(item, location.pathname, viewMode),
      })),
    [location.pathname, viewMode, onCategorySelect]
  );

  const secondaryLinks = useMemo(
    () =>
      SECONDARY_MENU_ITEMS.map((item) => ({
        label: item.label,
        href: item.path,
        icon: <item.icon className="h-5 w-5" />,
        onClick: () => navigate(item.path),
        active: location.pathname === item.path,
      })),
    [location.pathname, navigate]
  );

  const handleCategorySelect = (categoryId: string) => {
    onCategorySelect?.(categoryId);
    navigate("/");
    setTimeout(() => onViewChange("all"), 50);
  };

  // Filter categories for projects (depth 0 or all)
  const projectCategories = categories.filter((c) => c.name !== "Diário");

  return (
    <>
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Logo />
        <div className="mt-6 flex flex-col gap-1">
          {primaryLinks.map((link) => (
            <SidebarLink key={link.label} link={link} active={link.active} />
          ))}
        </div>

        {/* Hierarchical Categories Section */}
        {projectCategories.length > 0 && (
          <>
            <SidebarDivider />
            <div className="flex flex-col">
              {sidebarOpen && (
                <button
                  onClick={() => setShowCategories(!showCategories)}
                  className="flex items-center gap-2 px-2 py-1.5 text-[10px] uppercase font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <motion.div
                    animate={{ rotate: showCategories ? 0 : -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </motion.div>
                  Projetos
                </button>
              )}
              <AnimatePresence>
                {showCategories && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CategoryTree
                      categories={projectCategories}
                      onCategorySelect={handleCategorySelect}
                      selectedCategoryId={selectedCategoryId}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        <SidebarDivider />
        <div className="flex flex-col gap-1">
          {secondaryLinks.map((link) => (
            <SidebarLink key={link.label} link={link} active={link.active} />
          ))}
        </div>
      </div>
      <div className="mt-auto">
        <SidebarDivider />
        <SidebarLink
          link={{
            label: "Sair",
            href: "#",
            icon: <LogOut className="h-5 w-5" />,
            onClick: handleLogout,
          }}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        />
      </div>
    </>
  );
};

export function Sidebar({
  onExport,
  onImport,
  onThemeToggle,
  onViewChange,
  viewMode,
  onCategorySelect,
  selectedCategoryId,
}: SidebarProps) {
  const { settings, isLoading } = useSettings();
  const isPinned = settings.interface.sidebarPinned;
  const isExpandedWhenPinned = settings.interface.sidebarExpandedWhenPinned;

  // Iniciar expandido por padrão para evitar flash visual
  const [open, setOpen] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [projectsMenuOpen, setProjectsMenuOpen] = useState(false);
  const { categories } = useCategories();
  const { counts: taskCountByCategory, totalCount: totalTaskCount } = useTaskCounts();
  const navigate = useNavigate();
  const location = useLocation();

  // Filter categories for projects (exclude "Diário")
  const projectCategories = categories.filter((c) => c.name !== "Diário");

  // Aplicar configuração do usuário SOMENTE após carregar
  useEffect(() => {
    if (!isLoading && !hasInitialized) {
      if (isPinned) {
        setOpen(isExpandedWhenPinned);
      } else {
        setOpen(false);
      }
      setHasInitialized(true);
    }
  }, [isLoading, isPinned, isExpandedWhenPinned, hasInitialized]);

  // Reagir a mudanças nas configurações após inicialização
  useEffect(() => {
    if (hasInitialized && isPinned) {
      setOpen(isExpandedWhenPinned);
    }
  }, [isPinned, isExpandedWhenPinned, hasInitialized]);

  const handleNavigation = (path: string, mode?: "daily" | "all") => {
    navigate(path);
    if (mode) {
      setTimeout(() => onViewChange(mode), 50);
    }
  };

  // Memoizar items de menu para mobile (usando constantes unificadas)
  const mobileMenuItems = useMemo(() => {
    return {
      primary: PRIMARY_MENU_ITEMS.map((item) => ({
        ...item,
        active: isMenuItemActive(item, location.pathname, viewMode),
        onClick: () => {
          if (item.mode === "all") {
            onCategorySelect?.(null);
          }
          handleNavigation(item.path, item.mode);
        },
      })),
      secondary: SECONDARY_MENU_ITEMS.map((item) => ({
        ...item,
        active: location.pathname === item.path,
        onClick: () => navigate(item.path),
      })),
    };
  }, [location.pathname, viewMode, onCategorySelect, navigate]);

  // Skeleton da sidebar enquanto carrega
  if (isLoading) {
    return (
      <>
        {/* Desktop Sidebar Skeleton */}
        <div className="hidden md:flex flex-col h-screen w-[60px] bg-card border-r border-border p-3 gap-4">
          <div className="flex items-center gap-2 py-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <div className="flex flex-col gap-2 mt-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-8 rounded-md" />
            ))}
          </div>
          <div className="h-px bg-border my-2" />
          <div className="flex flex-col gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-8 rounded-md" />
            ))}
          </div>
          <div className="mt-auto">
            <div className="h-px bg-border mb-2" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>

        {/* Mobile bottom navigation skeleton */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-safe">
          <div className="grid grid-cols-5 gap-0.5 p-2 px-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1 min-h-[60px] py-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-3 w-10 rounded" />
              </div>
            ))}
          </div>
        </nav>
      </>
    );
  }

  return (
    <>
      {/* Desktop Sidebar with hover animation */}
      <AnimatedSidebar open={open} setOpen={setOpen} animate={true} isPinned={isPinned}>
        <SidebarBody className="justify-between gap-6">
          <SidebarContent
            viewMode={viewMode}
            onViewChange={onViewChange}
            onCategorySelect={onCategorySelect}
            selectedCategoryId={selectedCategoryId}
          />
        </SidebarBody>
      </AnimatedSidebar>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-safe">
        <div className="grid grid-cols-5 gap-0.5 p-2 px-0">
          {/* Diário */}
          <Button
            variant={mobileMenuItems.primary[0].active ? "secondary" : "ghost"}
            className="flex-col gap-1 min-h-[60px] min-w-[44px] h-auto py-2 px-1 text-[10px]"
            onClick={mobileMenuItems.primary[0].onClick}
          >
            <Calendar className="h-5 w-5 shrink-0" />
            <span className="truncate w-full text-center leading-tight">Diário</span>
          </Button>

          {/* Projetos - Sheet com lista de categorias */}
          <Sheet open={projectsMenuOpen} onOpenChange={setProjectsMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant={mobileMenuItems.primary[1].active ? "secondary" : "ghost"}
                className="flex-col gap-1 min-h-[60px] min-w-[44px] h-auto py-2 px-1 text-[10px] relative"
              >
                <Layers className="h-5 w-5 shrink-0" />
                <span className="truncate w-full text-center leading-tight">Projetos</span>
                {selectedCategoryId && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[80vh]">
              <SheetHeader>
                <SheetTitle>Projetos</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 mt-4 max-h-[60vh] overflow-y-auto">
                {/* Todos os Projetos */}
                <Button
                  variant={!selectedCategoryId && viewMode === "all" ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3 min-h-[48px] text-base"
                  onClick={() => {
                    onCategorySelect?.(null);
                    handleNavigation("/", "all");
                    setProjectsMenuOpen(false);
                  }}
                >
                  <Layers className="h-5 w-5 shrink-0" />
                  <span className="flex-1 text-left">Todos os Projetos</span>
                  <Badge variant="secondary" className="ml-auto">
                    {totalTaskCount}
                  </Badge>
                </Button>

                {/* Lista de categorias */}
                {projectCategories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategoryId === category.id ? "secondary" : "ghost"}
                    className="w-full justify-start gap-3 min-h-[48px] text-base"
                    style={{ paddingLeft: `${(category.depth || 0) * 16 + 16}px` }}
                    onClick={() => {
                      onCategorySelect?.(category.id);
                      handleNavigation("/", "all");
                      setProjectsMenuOpen(false);
                    }}
                  >
                    {category.depth > 0 ? (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    ) : (
                      <Folder className="h-5 w-5 shrink-0" />
                    )}
                    <span className="flex-1 text-left truncate">{category.name}</span>
                    <Badge variant="secondary" className="ml-auto shrink-0">
                      {taskCountByCategory[category.id] || 0}
                    </Badge>
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          {/* Anotações */}
          <Button
            variant={mobileMenuItems.primary[2].active ? "secondary" : "ghost"}
            className="flex-col gap-1 min-h-[60px] min-w-[44px] h-auto py-2 px-1 text-[10px]"
            onClick={mobileMenuItems.primary[2].onClick}
          >
            <FileText className="h-5 w-5 shrink-0" />
            <span className="truncate w-full text-center leading-tight">Anotações</span>
          </Button>

          {/* Dashboard */}
          <Button
            variant={mobileMenuItems.primary[3].active ? "secondary" : "ghost"}
            className="flex-col gap-1 min-h-[60px] min-w-[44px] h-auto py-2 px-1 text-[10px]"
            onClick={mobileMenuItems.primary[3].onClick}
          >
            <BarChart3 className="h-5 w-5 shrink-0" />
            <span className="truncate w-full text-center leading-tight">Dashboard</span>
          </Button>

          {/* Mais opções */}
          <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant={mobileMenuItems.secondary.some((item) => item.active) ? "secondary" : "ghost"}
                className="flex-col gap-1 min-h-[60px] min-w-[44px] h-auto py-2 px-1 text-[10px]"
              >
                <MoreHorizontal className="h-5 w-5 shrink-0" />
                <span className="truncate w-full text-center leading-tight">Mais</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[80vh]">
              <SheetHeader>
                <SheetTitle>Mais opções</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-6">
                {mobileMenuItems.secondary.map((item) => (
                  <Button
                    key={item.label}
                    variant={item.active ? "secondary" : "ghost"}
                    className="w-full justify-start gap-3 min-h-[48px] text-base"
                    onClick={() => {
                      item.onClick();
                      setMoreMenuOpen(false);
                    }}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
