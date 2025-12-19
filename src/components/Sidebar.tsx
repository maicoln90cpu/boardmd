import { useState, useEffect } from "react";
import { Calendar, Layers, FileText, BarChart3, Bell, Settings, LogOut, Timer, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sidebar as AnimatedSidebar,
  SidebarBody,
  SidebarLink,
  SidebarDivider,
  useSidebar,
  SidebarPinButton,
} from "@/components/ui/animated-sidebar";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface SidebarProps {
  onExport: () => void;
  onImport: () => void;
  onThemeToggle: () => void;
  onViewChange: (mode: "daily" | "all") => void;
  viewMode: "daily" | "all";
}

// Logo component without pin button
const Logo = () => {
  const { open, isPinned } = useSidebar();
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex-shrink-0 flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-sm">KB</span>
      </div>
      <motion.span
        animate={{
          display: open || isPinned ? "inline-block" : "none",
          opacity: open || isPinned ? 1 : 0,
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
  onViewChange 
}: { 
  viewMode: "daily" | "all";
  onViewChange: (mode: "daily" | "all") => void;
}) => {
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

  const primaryLinks = [
    {
      label: "Diário",
      href: "/",
      icon: <Calendar className="h-5 w-5" />,
      onClick: () => handleNavigation("/", "daily"),
      active: viewMode === "daily" && location.pathname === "/",
    },
    {
      label: "Projetos",
      href: "/",
      icon: <Layers className="h-5 w-5" />,
      onClick: () => handleNavigation("/", "all"),
      active: viewMode === "all" && location.pathname === "/",
    },
    {
      label: "Anotações",
      href: "/notes",
      icon: <FileText className="h-5 w-5" />,
      onClick: () => navigate("/notes"),
      active: location.pathname === "/notes",
    },
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <BarChart3 className="h-5 w-5" />,
      onClick: () => navigate("/dashboard"),
      active: location.pathname === "/dashboard",
    },
  ];

  const secondaryLinks = [
    {
      label: "Pomodoro",
      href: "/pomodoro",
      icon: <Timer className="h-5 w-5" />,
      onClick: () => navigate("/pomodoro"),
      active: location.pathname === "/pomodoro",
    },
    {
      label: "Calendário",
      href: "/calendar",
      icon: <Calendar className="h-5 w-5" />,
      onClick: () => navigate("/calendar"),
      active: location.pathname === "/calendar",
    },
    {
      label: "Notificações",
      href: "/notifications",
      icon: <Bell className="h-5 w-5" />,
      onClick: () => navigate("/notifications"),
      active: location.pathname === "/notifications",
    },
    {
      label: "Setup",
      href: "/config",
      icon: <Settings className="h-5 w-5" />,
      onClick: () => navigate("/config"),
      active: location.pathname === "/config",
    },
  ];

  return (
    <>
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Logo />
        <div className="mt-6 flex flex-col gap-1">
          {primaryLinks.map((link) => (
            <SidebarLink key={link.label} link={link} active={link.active} />
          ))}
        </div>
        <SidebarDivider />
        <div className="flex flex-col gap-1">
          {secondaryLinks.map((link) => (
            <SidebarLink key={link.label} link={link} active={link.active} />
          ))}
          {/* Pin button after Setup */}
          <div className="mt-1">
            <SidebarPinButton />
          </div>
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
}: SidebarProps) {
  const [open, setOpen] = useState(false);
  const [isPinned, setIsPinned] = useLocalStorage("sidebar-pinned", false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Keep sidebar open when pinned
  useEffect(() => {
    if (isPinned) {
      setOpen(true);
    }
  }, [isPinned]);

  const handleNavigation = (path: string, mode?: "daily" | "all") => {
    navigate(path);
    if (mode) {
      setTimeout(() => onViewChange(mode), 50);
    }
  };

  const primaryMenuItems = [
    {
      icon: Calendar,
      label: "Diário",
      active: viewMode === "daily" && location.pathname === "/",
      onClick: () => handleNavigation("/", "daily"),
    },
    {
      icon: Layers,
      label: "Projetos",
      active: viewMode === "all" && location.pathname === "/",
      onClick: () => handleNavigation("/", "all"),
    },
    {
      icon: FileText,
      label: "Anotações",
      active: location.pathname === "/notes",
      onClick: () => navigate("/notes"),
    },
    {
      icon: BarChart3,
      label: "Dashboard",
      active: location.pathname === "/dashboard",
      onClick: () => navigate("/dashboard"),
    },
  ];

  const secondaryMenuItems = [
    {
      icon: Timer,
      label: "Pomodoro",
      active: location.pathname === "/pomodoro",
      onClick: () => navigate("/pomodoro"),
    },
    {
      icon: Calendar,
      label: "Calendário",
      active: location.pathname === "/calendar",
      onClick: () => navigate("/calendar"),
    },
    {
      icon: Bell,
      label: "Notificações",
      active: location.pathname === "/notifications",
      onClick: () => navigate("/notifications"),
    },
    {
      icon: Settings,
      label: "Setup",
      active: location.pathname === "/config",
      onClick: () => navigate("/config"),
    },
  ];

  return (
    <>
      {/* Desktop Sidebar with hover animation */}
      <AnimatedSidebar open={open} setOpen={setOpen} animate={true} isPinned={isPinned} setIsPinned={setIsPinned}>
        <SidebarBody className="justify-between gap-6">
          <SidebarContent viewMode={viewMode} onViewChange={onViewChange} />
        </SidebarBody>
      </AnimatedSidebar>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-safe">
        <div className="grid grid-cols-5 gap-0.5 p-2">
          {primaryMenuItems.map((item) => (
            <Button
              key={item.label}
              variant={item.active ? "secondary" : "ghost"}
              className="flex-col gap-1 min-h-[60px] min-w-[44px] h-auto py-2 px-1 text-[10px]"
              onClick={item.onClick}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="truncate w-full text-center leading-tight">
                {item.label}
              </span>
            </Button>
          ))}

          <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant={
                  secondaryMenuItems.some((item) => item.active)
                    ? "secondary"
                    : "ghost"
                }
                className="flex-col gap-1 min-h-[60px] min-w-[44px] h-auto py-2 px-1 text-[10px]"
              >
                <MoreHorizontal className="h-5 w-5 shrink-0" />
                <span className="truncate w-full text-center leading-tight">
                  Mais
                </span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[80vh]">
              <SheetHeader>
                <SheetTitle>Mais opções</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-6">
                {secondaryMenuItems.map((item) => (
                  <Button
                    key={item.label}
                    variant={item.active ? "secondary" : "ghost"}
                    onClick={() => {
                      item.onClick();
                      setMoreMenuOpen(false);
                    }}
                    className="justify-start gap-3 min-h-[48px] text-base"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
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
