import React, { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/ui/useToast";
import { cn } from "@/lib/utils";

interface SecureApiKeyFieldProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

export const SecureApiKeyField: React.FC<SecureApiKeyFieldProps> = ({
  value,
  onChange,
  readOnly = false,
  placeholder = "sk-xxxx...",
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({
        title: "API Key copiada",
        description: "A chave foi copiada para a área de transferência.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar a chave.",
        variant: "destructive",
      });
    }
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  // Mask the API key for display
  const getMaskedValue = (key: string): string => {
    if (!key) return "";
    if (key.length <= 8) return "••••••••";
    return `${key.slice(0, 4)}${"•".repeat(Math.min(key.length - 8, 20))}${key.slice(-4)}`;
  };

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <div className="relative flex-1">
        <Input
          type={isVisible ? "text" : "password"}
          value={readOnly ? (isVisible ? value : getMaskedValue(value)) : value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          className={cn(
            "pr-20 font-mono text-sm",
            readOnly && "bg-muted/50"
          )}
          autoComplete="off"
          data-lpignore="true"
          data-form-type="other"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={toggleVisibility}
                title={isVisible ? "Ocultar" : "Mostrar"}
              >
                {isVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
                title="Copiar"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
