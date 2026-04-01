import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  LogOut,
  ChevronDown,
  ChevronRight,
  Folder,
  Menu } from
"lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import taskflowIcon from "@/assets/taskflow-icon.png";
import taskflowLogo from "@/assets/taskflow-logo.png";
import { CategoryTree } from "@/components/sidebar/CategoryTree";
import {
  Sidebar as AnimatedSidebar,
  SidebarBody,
  SidebarLink,
  SidebarDivider,
  useSidebar } from
"@/components/ui/animated-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories } from "@/hooks/data/useCategories";
import { useSettings } from "@/hooks/data/useSettings";
import { useTaskCounts } from "@/hooks/data/useTaskCounts";
import { useMenuItems } from "@/hooks/ui/useMenuItems";

interface SidebarProps {
  onExport: () => void;
  onImport: () => void;
  onThemeToggle: () => void;
  onCategorySelect?: (categoryId: string | null) => void;
  selectedCategoryId?: string | null;
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Logo component without pin button
const Logo = () => {
  const { open } = useSidebar();
  return (
    <div className="flex items-center gap-2 py-2">
      <motion.div
        animate={{
          display: open ? "inline-block" : "none",
          opacity: open ? 1 : 0
        }}
        transition={{ duration: 0.2 }}
        className="whitespace-pre">

        <img
          alt="TaskFlow"
          className="h-10 object-contain border-0"
          src="/lovable-uploads/5b8c2541-276c-4613-9bd7-2a0ad7efa01b.png" />

      </motion.div>
    </div>);

};

// Desktop sidebar content
const SidebarContent = ({
  onCategorySelect,
  selectedCategoryId



}: {onCategorySelect?: (categoryId: string | null) => void;selectedCategoryId?: string | null;}) => {
  const { categories } = useCategories();
  const { open: sidebarOpen } = useSidebar();
  const [showCategories, setShowCategories] = useState(true);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  // Usar hook centralizado para itens de menu
  const { primaryLinks, secondaryLinks, handleNavigation } = useMenuItems({
    onCategorySelect
  });

  const handleLogout = async () => {
    if (confirm("Deseja realmente sair?")) {
      await signOut();
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    onCategorySelect?.(categoryId);
    navigate(`/?project=${categoryId}`);
  };

  // Filter categories for projects (depth 0 or all)
  const projectCategories = categories.filter((c) => c.name !== "Diário");

  return (
    <>
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Logo />
        <div className="mt-6 flex flex-col gap-1">
          {primaryLinks.map((link) =>
          <SidebarLink key={link.label} link={link} active={link.active} />
          )}
        </div>

        {/* Hierarchical Categories Section */}
        {projectCategories.length > 0 &&
        <>
            <SidebarDivider />
            <div className="flex flex-col">
              {sidebarOpen &&
            <button
              onClick={() => setShowCategories(!showCategories)}
              className="flex items-center gap-2 px-2 py-1.5 text-[10px] uppercase font-semibold text-muted-foreground hover:text-foreground transition-colors">

                  <motion.div animate={{ rotate: showCategories ? 0 : -90 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-3 w-3" />
                  </motion.div>
                  Projetos
                </button>
            }
              <AnimatePresence>
                {showCategories &&
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}>

                    <CategoryTree
                  categories={projectCategories}
                  onCategorySelect={handleCategorySelect}
                  selectedCategoryId={selectedCategoryId} />

                  </motion.div>
              }
              </AnimatePresence>
            </div>
          </>
        }

        <SidebarDivider />
        <div className="flex flex-col gap-1">
          {secondaryLinks.map((link) =>
          <SidebarLink key={link.label} link={link} active={link.active} />
          )}
        </div>
      </div>
      <div className="mt-auto">
        <SidebarDivider />
        <SidebarLink
          link={{
            label: "Sair",
            href: "#",
            icon: <LogOut className="h-5 w-5" />,
            onClick: handleLogout
          }}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive" />

      </div>
    </>);

};

export function Sidebar({ onExport, onImport, onThemeToggle, onCategorySelect, selectedCategoryId }: SidebarProps) {
  const { settings, isLoading } = useSettings();
  const isPinned = settings.interface.sidebarPinned;
  const isExpandedWhenPinned = settings.interface.sidebarExpandedWhenPinned;

  // Start with expanded state to prevent flash (optimistic render)
  // Use default settings initially, update when loaded
  const [open, setOpen] = useState(true);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [projectsMenuOpen, setProjectsMenuOpen] = useState(true);
  const { categories } = useCategories();
  const { counts: taskCountByCategory, totalCount: totalTaskCount } = useTaskCounts();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Filter categories for projects (exclude "Diário")
  const projectCategories = categories.filter((c) => c.name !== "Diário");

  // Apply user configuration after loading
  useEffect(() => {
    if (!isLoading) {
      if (isPinned) {
        setOpen(isExpandedWhenPinned);
      } else {
        setOpen(false);
      }
    }
  }, [isLoading, isPinned, isExpandedWhenPinned]);

  // Usar hook centralizado para itens de menu mobile
  const { primaryItems, secondaryItems, handleNavigation } = useMenuItems({
    onCategorySelect
  });

  // Check if current route is home
  const isHomeActive = location.pathname === "/";

  // Render immediately without waiting for settings to load
  // The sidebar will adjust its state once settings are available
  return (
    <>
      {/* Desktop Sidebar with hover animation */}
      <AnimatedSidebar open={open} setOpen={setOpen} animate={true} isPinned={isPinned}>
        <SidebarBody className="justify-between gap-6">
          <SidebarContent onCategorySelect={onCategorySelect} selectedCategoryId={selectedCategoryId} />
        </SidebarBody>
      </AnimatedSidebar>

      {/* Mobile hamburger header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border h-14 flex items-center px-3 gap-3">
        <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <SheetHeader className="p-4 pb-2">
              <SheetTitle className="flex items-center gap-2">
                <img
                  alt="TaskFlow"
                  className="h-8 object-contain"
                  src="/lovable-uploads/5b8c2541-276c-4613-9bd7-2a0ad7efa01b.png"
                />
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {/* Projetos section */}
              <div className="mb-1">
                <button
                  onClick={() => setProjectsMenuOpen(!projectsMenuOpen)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${projectsMenuOpen ? "" : "-rotate-90"}`} />
                  <Layers className="h-4 w-4" />
                  Projetos
                </button>
                {projectsMenuOpen && (
                  <div className="ml-2 space-y-0.5">
                    <Button
                      variant={!selectedCategoryId && isHomeActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-2 h-9 text-sm"
                      onClick={() => {
                        onCategorySelect?.(null);
                        handleNavigation("/");
                        setMoreMenuOpen(false);
                      }}
                    >
                      <Layers className="h-4 w-4" />
                      <span className="flex-1 text-left">Todos</span>
                      <Badge variant="secondary" className="text-xs">{totalTaskCount}</Badge>
                    </Button>
                    {projectCategories.map((category) => (
                      <Button
                        key={category.id}
                        variant={selectedCategoryId === category.id ? "secondary" : "ghost"}
                        className="w-full justify-start gap-2 h-9 text-sm"
                        style={{ paddingLeft: `${(category.depth || 0) * 12 + 12}px` }}
                        onClick={() => {
                          onCategorySelect?.(category.id);
                          handleNavigation(`/?project=${category.id}`);
                          setMoreMenuOpen(false);
                        }}
                      >
                        {category.depth > 0 ? <ChevronRight className="h-3.5 w-3.5" /> : <Folder className="h-4 w-4" />}
                        <span className="flex-1 text-left truncate">{category.name}</span>
                        <Badge variant="secondary" className="text-xs">{taskCountByCategory[category.id] || 0}</Badge>
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-px bg-border my-2" />

              {/* Primary items */}
              {primaryItems.slice(1).map((item) => (
                <Button
                  key={item.label}
                  variant={item.active ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3 h-10 text-sm"
                  onClick={() => { item.onClick(); setMoreMenuOpen(false); }}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ))}

              <div className="h-px bg-border my-2" />

              {/* Secondary items */}
              {secondaryItems.map((item) => (
                <Button
                  key={item.label}
                  variant={item.active ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3 h-10 text-sm"
                  onClick={() => { item.onClick(); setMoreMenuOpen(false); }}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ))}

              <div className="h-px bg-border my-2" />

              {/* Logout */}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-10 text-sm text-destructive hover:bg-destructive/10"
                onClick={async () => {
                  if (confirm("Deseja realmente sair?")) {
                    await signOut();
                  }
                }}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <img
          alt="TaskFlow"
          className="h-7 object-contain"
          src="/lovable-uploads/5b8c2541-276c-4613-9bd7-2a0ad7efa01b.png"
        />
      </header>
    </>);

}