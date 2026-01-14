import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Calendar, 
  Layers, 
  FileText, 
  BarChart3, 
  Bell, 
  Settings, 
  Timer,
  LucideIcon 
} from "lucide-react";

// ============================================================================
// MENU ITEMS - Fonte única de verdade para navegação
// ============================================================================
export interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  mode?: "daily" | "all";
}

export const PRIMARY_MENU_ITEMS: MenuItem[] = [
  { icon: Calendar, label: "Diário", path: "/", mode: "daily" },
  { icon: Layers, label: "Projetos", path: "/", mode: "all" },
  { icon: FileText, label: "Anotações", path: "/notes" },
  { icon: BarChart3, label: "Dashboard", path: "/dashboard" },
];

export const SECONDARY_MENU_ITEMS: MenuItem[] = [
  { icon: Timer, label: "Pomodoro", path: "/pomodoro" },
  { icon: Calendar, label: "Calendário", path: "/calendar" },
  { icon: Bell, label: "Notificações", path: "/notifications" },
  { icon: Settings, label: "Setup", path: "/config" },
];

// Helper para verificar se item está ativo
export const isMenuItemActive = (
  item: MenuItem,
  pathname: string,
  viewMode: "daily" | "all"
): boolean => {
  if (item.path === "/" && item.mode) {
    return pathname === "/" && viewMode === item.mode;
  }
  return pathname === item.path;
};

interface UseMenuItemsOptions {
  viewMode: "daily" | "all";
  onViewChange: (mode: "daily" | "all") => void;
  onCategorySelect?: (categoryId: string | null) => void;
}

export interface ProcessedMenuItem extends MenuItem {
  active: boolean;
  onClick: () => void;
}

export interface SidebarLinkItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  onClick: () => void;
  active: boolean;
}

export function useMenuItems({ 
  viewMode, 
  onViewChange, 
  onCategorySelect 
}: UseMenuItemsOptions) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string, mode?: "daily" | "all") => {
    navigate(path);
    if (mode) {
      setTimeout(() => onViewChange(mode), 50);
    }
  };

  // Primary menu items processados
  const primaryItems = useMemo(
    (): ProcessedMenuItem[] =>
      PRIMARY_MENU_ITEMS.map((item) => ({
        ...item,
        active: isMenuItemActive(item, location.pathname, viewMode),
        onClick: () => {
          if (item.mode === "all") {
            onCategorySelect?.(null);
          }
          handleNavigation(item.path, item.mode);
        },
      })),
    [location.pathname, viewMode, onCategorySelect]
  );

  // Secondary menu items processados
  const secondaryItems = useMemo(
    (): ProcessedMenuItem[] =>
      SECONDARY_MENU_ITEMS.map((item) => ({
        ...item,
        active: location.pathname === item.path,
        onClick: () => navigate(item.path),
      })),
    [location.pathname, navigate]
  );

  // Links formatados para SidebarLink
  const primaryLinks = useMemo(
    (): SidebarLinkItem[] =>
      primaryItems.map((item) => ({
        label: item.label,
        href: item.path,
        icon: React.createElement(item.icon, { className: "h-5 w-5" }),
        onClick: item.onClick,
        active: item.active,
      })),
    [primaryItems]
  );

  const secondaryLinks = useMemo(
    (): SidebarLinkItem[] =>
      secondaryItems.map((item) => ({
        label: item.label,
        href: item.path,
        icon: React.createElement(item.icon, { className: "h-5 w-5" }),
        onClick: item.onClick,
        active: item.active,
      })),
    [secondaryItems]
  );

  return {
    // Items processados
    primaryItems,
    secondaryItems,
    
    // Links formatados para SidebarLink
    primaryLinks,
    secondaryLinks,
    
    // Helper
    handleNavigation,
  };
}
