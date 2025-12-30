import { useState, useEffect } from "react";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/animated-sidebar";

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
          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors group",
          "hover:bg-accent/50",
          isSelected && "bg-primary/10 text-primary font-medium"
        )}
        style={{ paddingLeft: sidebarOpen ? `${8 + level * 12}px` : '8px' }}
        onClick={handleSelect}
        whileTap={{ scale: 0.98 }}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="p-0.5 hover:bg-accent rounded transition-colors"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </motion.div>
          </button>
        ) : (
          <div className="w-4" /> // Spacer for alignment
        )}

        {/* Folder icon */}
        {hasChildren && isExpanded ? (
          <FolderOpen className="h-4 w-4 text-primary/70 flex-shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}

        {/* Category name */}
        {sidebarOpen && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm truncate flex-1"
          >
            {category.name}
          </motion.span>
        )}

        {/* Children count badge */}
        {sidebarOpen && hasChildren && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            {category.children?.length}
          </span>
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
    <div className="flex flex-col gap-0.5 mt-2">
      {sidebarOpen && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] uppercase font-semibold text-muted-foreground px-2 mb-1"
        >
          Projetos
        </motion.span>
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
  );
}
