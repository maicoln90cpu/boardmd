import { useState, useEffect } from "react";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/animated-sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  depth: number;
  children?: Category[];
}

interface CategoryTreeProps {
  categories: Category[];
  onCategorySelect: (categoryId: string) => void;
  selectedCategoryId?: string | null;
}

interface CategoryItemProps {
  category: Category;
  onSelect: (categoryId: string) => void;
  selectedId?: string | null;
  level?: number;
}

function CategoryItem({ category, onSelect, selectedId, level = 0 }: CategoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { open: sidebarOpen } = useSidebar();
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = selectedId === category.id;

  // Auto-expand if a child is selected
  useEffect(() => {
    if (hasChildren && category.children?.some(child => 
      child.id === selectedId || 
      child.children?.some(grandchild => grandchild.id === selectedId)
    )) {
      setIsExpanded(true);
    }
  }, [selectedId, hasChildren, category.children]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleSelect = () => {
    onSelect(category.id);
  };

  return (
    <div>
      <motion.div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer group relative overflow-hidden",
          "hover:bg-accent/50"
        )}
        style={{ paddingLeft: sidebarOpen ? `${8 + level * 12}px` : '8px' }}
        onClick={handleSelect}
        whileTap={{ scale: 0.98 }}
        initial={false}
      >
        {/* Animated background for selection */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              className="absolute inset-0 bg-primary/15 border border-primary/20 rounded-md"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        {/* Active indicator bar with smooth animation */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4/5 bg-primary rounded-r-full"
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>
        
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="p-0.5 hover:bg-accent rounded transition-colors relative z-10"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className={cn(
                "h-3.5 w-3.5 transition-colors duration-200",
                isSelected ? "text-primary" : "text-muted-foreground"
              )} />
            </motion.div>
          </button>
        ) : (
          <div className="w-4 relative z-10" /> // Spacer for alignment
        )}

        {/* Folder icon with color transition */}
        <motion.div 
          className="relative z-10"
          animate={{ scale: isSelected ? 1.05 : 1 }}
          transition={{ duration: 0.2 }}
        >
          {hasChildren && isExpanded ? (
            <FolderOpen className={cn(
              "h-4 w-4 flex-shrink-0 transition-colors duration-200",
              isSelected ? "text-primary" : "text-primary/70"
            )} />
          ) : (
            <Folder className={cn(
              "h-4 w-4 flex-shrink-0 transition-colors duration-200",
              isSelected ? "text-primary" : "text-muted-foreground"
            )} />
          )}
        </motion.div>

        {/* Category name with smooth font weight transition */}
        {sidebarOpen && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1,
              fontWeight: isSelected ? 500 : 400
            }}
            transition={{ duration: 0.2 }}
            className={cn(
              "text-sm truncate flex-1 relative z-10 transition-colors duration-200",
              isSelected && "text-primary"
            )}
          >
            {category.name}
          </motion.span>
        )}

        {/* Children count badge with animation */}
        {sidebarOpen && hasChildren && (
          <motion.span 
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full relative z-10 transition-colors duration-200",
              isSelected 
                ? "bg-primary/20 text-primary" 
                : "text-muted-foreground bg-muted"
            )}
            initial={false}
            animate={{ 
              opacity: isSelected ? 1 : 0,
              scale: isSelected ? 1 : 0.9
            }}
            whileHover={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
          >
            {category.children?.length}
          </motion.span>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {category.children?.map((child) => (
              <CategoryItem
                key={child.id}
                category={child}
                onSelect={onSelect}
                selectedId={selectedId}
                level={level + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CategoryTree({ categories, onCategorySelect, selectedCategoryId }: CategoryTreeProps) {
  const { open: sidebarOpen } = useSidebar();

  // Build tree structure from flat categories
  const buildTree = (items: Category[]): Category[] => {
    const map = new Map<string, Category>();
    const roots: Category[] = [];

    // First pass: create map of all items with empty children arrays
    items.forEach(item => {
      map.set(item.id, { ...item, children: [] });
    });

    // Second pass: build tree structure
    items.forEach(item => {
      const node = map.get(item.id)!;
      if (item.parent_id && map.has(item.parent_id)) {
        map.get(item.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const tree = buildTree(categories);

  // Quando sidebar está colapsada, não mostrar a árvore de categorias
  if (!sidebarOpen || categories.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-0.5 mt-2">
        {sidebarOpen && (
          <div className="flex items-center justify-between px-2 mb-1">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] uppercase font-semibold text-muted-foreground"
            >
              Projetos
            </motion.span>
            
            {/* Tooltip showing Esc shortcut when a project is selected */}
            <AnimatePresence>
              {selectedCategoryId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground cursor-help"
                    >
                      Esc
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    <p>Pressione <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd> para limpar filtro</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </AnimatePresence>
          </div>
        )}
        {tree.map((category) => (
          <CategoryItem
            key={category.id}
            category={category}
            onSelect={onCategorySelect}
            selectedId={selectedCategoryId}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}
