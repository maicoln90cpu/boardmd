import { useState } from "react";
import { Loader2, Sparkles, Plus, ExternalLink } from "lucide-react";
import * as Icons from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useToolFunctions } from "@/hooks/useToolFunctions";
import { useTools } from "@/hooks/useTools";

interface ToolSuggestion {
  name: string;
  site_url: string;
  description: string;
  icon: string;
  functions: string[];
}

interface ToolSuggestionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTool: (tool: {
    name: string;
    site_url: string | null;
    description: string | null;
    icon: string | null;
    function_ids: string[];
  }) => Promise<boolean>;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  wrench: Icons.Wrench,
  zap: Icons.Zap,
  palette: Icons.Palette,
  video: Icons.Video,
  music: Icons.Music,
  code: Icons.Code,
  "file-text": Icons.FileText,
  image: Icons.Image,
  globe: Icons.Globe,
  brain: Icons.Brain,
  bot: Icons.Bot,
  sparkles: Icons.Sparkles,
  cog: Icons.Cog,
  terminal: Icons.Terminal,
  database: Icons.Database,
};

export function ToolSuggestionsModal({
  open,
  onOpenChange,
  onAddTool,
}: ToolSuggestionsModalProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ToolSuggestion[]>([]);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const { functions } = useToolFunctions();
  const { tools } = useTools();

  const generateSuggestions = async () => {
    if (functions.length === 0) {
      toast.error("Cadastre pelo menos uma função primeiro");
      return;
    }

    setLoading(true);
    setSuggestions([]);

    try {
      const { data, error } = await supabase.functions.invoke("suggest-tools", {
        body: {
          functions: functions.map((f) => ({ name: f.name })),
          existingTools: tools.map((t) => ({ name: t.name })),
        },
      });

      if (error) {
        console.error("Error generating suggestions:", error);
        toast.error("Erro ao gerar sugestões");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        toast.success(`${data.suggestions.length} sugestões geradas!`);
      } else {
        toast.info("Nenhuma sugestão encontrada");
      }
    } catch (error) {
      console.error("Error generating suggestions:", error);
      toast.error("Erro ao gerar sugestões");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuggestion = async (suggestion: ToolSuggestion, index: number) => {
    setAddingIndex(index);

    try {
      // Find function IDs that match the suggestion's functions
      const matchingFunctionIds = functions
        .filter((f) =>
          suggestion.functions.some(
            (sf) => sf.toLowerCase() === f.name.toLowerCase()
          )
        )
        .map((f) => f.id);

      const success = await onAddTool({
        name: suggestion.name,
        site_url: suggestion.site_url || null,
        description: suggestion.description || null,
        icon: suggestion.icon || "wrench",
        function_ids: matchingFunctionIds,
      });

      if (success) {
        // Remove from suggestions list
        setSuggestions((prev) => prev.filter((_, i) => i !== index));
        toast.success(`${suggestion.name} adicionada!`);
      }
    } finally {
      setAddingIndex(null);
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName.toLowerCase()] || Icons.Wrench;
    return <IconComponent className="h-5 w-5" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sugestões de Ferramentas
          </DialogTitle>
          <DialogDescription>
            A IA irá sugerir ferramentas com base nas funções que você cadastrou.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {suggestions.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">
                {functions.length === 0
                  ? "Cadastre funções primeiro para receber sugestões personalizadas."
                  : "Clique no botão abaixo para gerar sugestões baseadas nas suas funções."}
              </p>
              <Button
                onClick={generateSuggestions}
                disabled={loading || functions.length === 0}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {loading ? "Gerando..." : "Gerar Sugestões"}
              </Button>
            </div>
          )}

          {suggestions.length > 0 && (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {suggestions.length} sugestão(ões) encontrada(s)
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateSuggestions}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Regenerar
                </Button>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 space-y-3 bg-card"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-md bg-primary/10 text-primary">
                            {getIcon(suggestion.icon)}
                          </div>
                          <div>
                            <h4 className="font-medium">{suggestion.name}</h4>
                            {suggestion.site_url && (
                              <a
                                href={suggestion.site_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                              >
                                {new URL(suggestion.site_url).hostname}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddSuggestion(suggestion, index)}
                          disabled={addingIndex !== null}
                        >
                          {addingIndex === index ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {suggestion.description}
                      </p>

                      {suggestion.functions.length > 0 && (
                        <div className="flex flex-wrap gap-1 items-center">
                          {(() => {
                            // Match suggestion functions with user's registered functions
                            const matchedFunctions = suggestion.functions
                              .map((fname) =>
                                functions.find(
                                  (f) => f.name.toLowerCase() === fname.toLowerCase()
                                )
                              )
                              .filter(Boolean) as { id: string; name: string; color: string | null }[];
                            
                            const displayFunctions = matchedFunctions.slice(0, 3);
                            const remaining = matchedFunctions.length - 3;

                            return (
                              <>
                                {displayFunctions.map((func, i) => (
                                  <Badge
                                    key={i}
                                    variant="secondary"
                                    className="text-xs text-white"
                                    style={{ backgroundColor: func.color || '#3B82F6' }}
                                  >
                                    {func.name}
                                  </Badge>
                                ))}
                                {remaining > 0 && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge variant="outline" className="text-xs cursor-help">
                                          +{remaining}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{matchedFunctions.slice(3).map((f) => f.name).join(", ")}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {/* Show unmatched functions with default styling */}
                                {suggestion.functions
                                  .filter(
                                    (fname) =>
                                      !functions.some(
                                        (f) => f.name.toLowerCase() === fname.toLowerCase()
                                      )
                                  )
                                  .slice(0, 2)
                                  .map((fname, i) => (
                                    <Badge key={`unmatched-${i}`} variant="secondary" className="text-xs">
                                      {fname}
                                    </Badge>
                                  ))}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
