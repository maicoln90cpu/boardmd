import { useState, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FunctionSelector } from "./FunctionSelector";
import { IconSelector } from "./IconSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Tool {
  id: string;
  name: string;
  site_url: string | null;
  description: string | null;
  icon: string | null;
  is_favorite: boolean | null;
  monthly_cost?: number | null;
  function_ids?: string[];
}

interface ToolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool?: Tool | null;
  onSave: (data: {
    name: string;
    site_url?: string | null;
    description?: string | null;
    icon?: string | null;
    monthly_cost?: number | null;
    function_ids?: string[];
  }) => Promise<boolean>;
}

export function ToolModal({ open, onOpenChange, tool, onSave }: ToolModalProps) {
  const [name, setName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("wrench");
  const [monthlyCost, setMonthlyCost] = useState("");
  const [functionIds, setFunctionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!tool;

  // Reset form when modal opens/closes or tool changes
  useEffect(() => {
    if (open) {
      if (tool) {
        setName(tool.name);
        setSiteUrl(tool.site_url || "");
        setDescription(tool.description || "");
        setIcon(tool.icon || "wrench");
        setMonthlyCost(tool.monthly_cost?.toString() || "");
        setFunctionIds(tool.function_ids || []);
      } else {
        setName("");
        setSiteUrl("");
        setDescription("");
        setIcon("wrench");
        setMonthlyCost("");
        setFunctionIds([]);
      }
      setErrors({});
    }
  }, [open, tool]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Nome é obrigatório";
    } else if (name.trim().length > 100) {
      newErrors.name = "Nome deve ter no máximo 100 caracteres";
    }

    if (siteUrl.trim()) {
      try {
        new URL(siteUrl.trim());
      } catch {
        newErrors.siteUrl = "URL inválida";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);
    try {
      const parsedCost = monthlyCost.trim() ? parseFloat(monthlyCost.replace(",", ".")) : null;
      const success = await onSave({
        name: name.trim(),
        site_url: siteUrl.trim() || null,
        description: description.trim() || null,
        icon,
        monthly_cost: parsedCost && !isNaN(parsedCost) ? parsedCost : null,
        function_ids: functionIds,
      });

      if (success) {
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome da ferramenta primeiro");
      return;
    }

    setGeneratingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-tool-description", {
        body: { name: name.trim(), siteUrl: siteUrl.trim() || null },
      });

      if (error) {
        console.error("Error generating description:", error);
        toast.error("Erro ao gerar descrição");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.description) {
        setDescription(data.description);
        toast.success("Descrição gerada com sucesso!");
      }
    } catch (error) {
      console.error("Error generating description:", error);
      toast.error("Erro ao gerar descrição");
    } finally {
      setGeneratingDescription(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Ferramenta" : "Nova Ferramenta"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Atualize as informações da sua ferramenta."
                : "Adicione uma nova ferramenta digital ao seu catálogo."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Icon */}
            <div className="space-y-2">
              <Label>Ícone</Label>
              <IconSelector value={icon} onChange={setIcon} />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: OpenAI, CapCut, VidIQ..."
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Site URL */}
            <div className="space-y-2">
              <Label htmlFor="siteUrl">Site</Label>
              <Input
                id="siteUrl"
                type="url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://exemplo.com"
                className={errors.siteUrl ? "border-destructive" : ""}
              />
              {errors.siteUrl && (
                <p className="text-xs text-destructive">{errors.siteUrl}</p>
              )}
            </div>

            {/* Monthly Cost */}
            <div className="space-y-2">
              <Label htmlFor="monthlyCost">Custo Mensal (R$)</Label>
              <Input
                id="monthlyCost"
                type="text"
                inputMode="decimal"
                value={monthlyCost}
                onChange={(e) => {
                  // Allow only numbers, comma and dot
                  const value = e.target.value.replace(/[^0-9.,]/g, "");
                  setMonthlyCost(value);
                }}
                placeholder="0,00"
              />
              <p className="text-xs text-muted-foreground">
                Informe o custo mensal para acompanhar seus gastos.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Descrição</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={generatingDescription || !name.trim()}
                  className="text-xs h-7 px-2 gap-1"
                >
                  {generatingDescription ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  Gerar com IA
                </Button>
              </div>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Para que serve esta ferramenta..."
                rows={3}
              />
            </div>

            {/* Functions/Tags */}
            <div className="space-y-2">
              <Label>Funções</Label>
              <FunctionSelector
                selectedFunctionIds={functionIds}
                onFunctionsChange={setFunctionIds}
              />
              <p className="text-xs text-muted-foreground">
                Categorize sua ferramenta por funções para facilitar a busca.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Salvar Alterações" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
