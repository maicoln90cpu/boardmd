import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Heart, Pencil, Trash2, Wrench, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Map of common icon names to components
const iconMap: Record<string, LucideIcon> = {
  wrench: Wrench,
};

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

interface ToolCardProps {
  tool: Tool;
  onEdit: (tool: Tool) => void;
  onDelete: (tool: Tool) => void;
  onToggleFavorite: (toolId: string) => void;
}

export function ToolCard({ tool, onEdit, onDelete, onToggleFavorite }: ToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get icon component from map, fallback to Wrench
  const IconComponent = tool.icon && iconMap[tool.icon.toLowerCase()] 
    ? iconMap[tool.icon.toLowerCase()] 
    : Wrench;

  return (
    <Card className={cn(
      "transition-all duration-200",
      isExpanded && "ring-1 ring-primary/20"
    )}>
      {/* Compact Row */}
      <div 
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <IconComponent className="h-5 w-5 text-primary" />
        </div>

        {/* Name and Site */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{tool.name}</h3>
            {tool.is_favorite && (
              <Heart className="h-4 w-4 text-red-500 fill-red-500 flex-shrink-0" />
            )}
          </div>
          {tool.site_url && (
            <a 
              href={tool.site_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-primary truncate flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
              <span className="truncate">{new URL(tool.site_url).hostname}</span>
            </a>
          )}
        </div>

        {/* Functions/Tags */}
        <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
          {tool.functions?.slice(0, 3).map((func) => (
            <Badge
              key={func.id}
              variant="secondary"
              className="text-xs"
              style={{ 
                backgroundColor: `${func.color}20`,
                color: func.color,
                borderColor: func.color
              }}
            >
              {func.name}
            </Badge>
          ))}
          {tool.functions && tool.functions.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{tool.functions.length - 3}
            </Badge>
          )}
        </div>

        {/* Expand Button */}
        <Button variant="ghost" size="icon" className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <CardContent className="pt-0 pb-4 px-4 border-t">
          <div className="pt-4 space-y-4">
            {/* Description */}
            {tool.description && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Descrição</h4>
                <p className="text-sm">{tool.description}</p>
              </div>
            )}

            {/* Functions (mobile) */}
            {tool.functions && tool.functions.length > 0 && (
              <div className="sm:hidden">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Funções</h4>
                <div className="flex flex-wrap gap-1">
                  {tool.functions.map((func) => (
                    <Badge
                      key={func.id}
                      variant="secondary"
                      className="text-xs"
                      style={{ 
                        backgroundColor: `${func.color}20`,
                        color: func.color,
                        borderColor: func.color
                      }}
                    >
                      {func.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(tool.id);
                }}
              >
                <Heart className={cn(
                  "h-4 w-4 mr-2",
                  tool.is_favorite && "text-red-500 fill-red-500"
                )} />
                {tool.is_favorite ? "Remover Favorito" : "Favoritar"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(tool);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(tool);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
