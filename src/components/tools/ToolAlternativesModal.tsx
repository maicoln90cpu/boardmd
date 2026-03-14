import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ToolAlternative {
  name: string;
  site_url: string;
  description: string;
  is_free: boolean;
}

interface ToolAlternativesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolName: string;
}

export function ToolAlternativesModal({ open, onOpenChange, toolName }: ToolAlternativesModalProps) {
  const [alternatives, setAlternatives] = useState<ToolAlternative[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchAlternatives = async () => {
    if (hasLoaded) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-tool-alternatives", {
        body: { toolName },
      });

      if (error) throw error;
      setAlternatives(data?.alternatives || []);
      setHasLoaded(true);
    } catch (err) {
      toast.error("Erro ao buscar alternativas");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on open
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !hasLoaded) {
      fetchAlternatives();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Alternativas para {toolName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Buscando alternativas com IA...</span>
          </div>
        ) : alternatives.length === 0 && hasLoaded ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma alternativa encontrada.
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {alternatives.map((alt, idx) => (
              <Card key={idx} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{alt.name}</h4>
                        {alt.is_free && (
                          <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30">
                            Gratuito
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alt.description}
                      </p>
                    </div>
                    {alt.site_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                        asChild
                      >
                        <a href={alt.site_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
