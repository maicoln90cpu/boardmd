import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
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
import { SecureApiKeyField } from "./SecureApiKeyField";
import type { ApiKey } from "@/hooks/useApiKeys";

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey?: ApiKey | null;
  onSave: (data: { source: string; name: string; key_value: string }) => Promise<boolean>;
}

export function ApiKeyModal({ open, onOpenChange, apiKey, onSave }: ApiKeyModalProps) {
  const [source, setSource] = useState("");
  const [name, setName] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!apiKey;

  useEffect(() => {
    if (open) {
      if (apiKey) {
        setSource(apiKey.source);
        setName(apiKey.name);
        setKeyValue(apiKey.key_value);
      } else {
        setSource("");
        setName("");
        setKeyValue("");
      }
      setErrors({});
    }
  }, [open, apiKey]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!source.trim()) {
      newErrors.source = "Fonte é obrigatória";
    }
    if (!name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }
    if (!keyValue.trim()) {
      newErrors.keyValue = "API Key é obrigatória";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);
    try {
      const success = await onSave({
        source: source.trim(),
        name: name.trim(),
        key_value: keyValue.trim(),
      });

      if (success) {
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar API Key" : "Nova API Key"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Atualize as informações da sua API Key."
                : "Adicione uma nova API Key para gerenciar."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Source */}
            <div className="space-y-2">
              <Label htmlFor="source">
                Fonte <span className="text-destructive">*</span>
              </Label>
              <Input
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Ex: OpenAI, Google Cloud, Stripe..."
                className={errors.source ? "border-destructive" : ""}
              />
              {errors.source && (
                <p className="text-xs text-destructive">{errors.source}</p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nome da Key <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Produção, Desenvolvimento, GPT-4..."
                className={errors.name ? "border-destructive" : ""}
              />
              <p className="text-xs text-muted-foreground">
                Identifique esta chave para diferenciar de outras da mesma fonte.
              </p>
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label>
                API Key <span className="text-destructive">*</span>
              </Label>
              <SecureApiKeyField
                value={keyValue}
                onChange={setKeyValue}
                placeholder="sk-xxxx... ou sua chave de API"
              />
              <p className="text-xs text-muted-foreground">
                Sua chave é armazenada de forma segura.
              </p>
              {errors.keyValue && (
                <p className="text-xs text-destructive">{errors.keyValue}</p>
              )}
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
              {isEditing ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
