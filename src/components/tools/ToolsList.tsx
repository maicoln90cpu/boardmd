import { ToolCard } from "./ToolCard";
import { Wrench, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ToolFunction {
  id: string;
  name: string;
  color: string;
}

interface Tool {
  id: string;
  name: string;
  site_url: string | null;
  description: string | null;
  icon: string | null;
  is_favorite: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  functions?: ToolFunction[];
}

interface ToolsListProps {
  tools: Tool[];
  isLoading?: boolean;
  onEdit: (tool: Tool) => void;
  onDelete: (tool: Tool) => void;
  onToggleFavorite: (toolId: string) => void;
  onAdd?: () => void;
}

export function ToolsList({ tools, isLoading, onEdit, onDelete, onToggleFavorite, onAdd }: ToolsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div 
            key={i}
            className="h-20 rounded-lg bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center p-8 text-center"
      >
        <div className="relative mb-6">
          <div className="p-6 rounded-full bg-primary/10">
            <Wrench className="h-12 w-12 text-primary" />
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="absolute -top-1 -right-1"
          >
            <Sparkles className="h-5 w-5 text-yellow-500" />
          </motion.div>
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhuma ferramenta encontrada</h3>
        <p className="text-sm text-muted-foreground max-w-xs mb-6">
          Adicione suas ferramentas digitais para organizá-las em um só lugar.
        </p>
        {onAdd && (
          <Button onClick={onAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar ferramenta
          </Button>
        )}
      </motion.div>
    );
  }

  // Separate favorites and regular tools
  const favoriteTools = tools.filter(t => t.is_favorite);
  const regularTools = tools.filter(t => !t.is_favorite);

  return (
    <div className="space-y-6">
      {/* Favorites Section */}
      {favoriteTools.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            ⭐ Favoritos ({favoriteTools.length})
          </h2>
          <div className="space-y-2">
            {favoriteTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Tools Section */}
      {regularTools.length > 0 && (
        <div className="space-y-3">
          {favoriteTools.length > 0 && (
            <h2 className="text-sm font-medium text-muted-foreground">
              Todas as ferramentas ({regularTools.length})
            </h2>
          )}
          <div className="space-y-2">
            {regularTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
