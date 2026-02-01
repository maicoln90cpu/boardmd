import { Key, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SecureApiKeyField } from "./SecureApiKeyField";
import type { ApiKey } from "@/hooks/useApiKeys";

interface ApiKeyCardProps {
  apiKey: ApiKey;
  onEdit: (apiKey: ApiKey) => void;
  onDelete: (apiKey: ApiKey) => void;
}

export function ApiKeyCard({ apiKey, onEdit, onDelete }: ApiKeyCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Key className="h-5 w-5 text-amber-500" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-medium">{apiKey.source}</h3>
              <p className="text-sm text-muted-foreground">{apiKey.name}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(apiKey)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(apiKey)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <SecureApiKeyField value={apiKey.key_value} readOnly />
        </div>
      </div>
    </Card>
  );
}
