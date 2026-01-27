import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { METRIC_TYPES } from "@/hooks/useTaskCompletionLogs";
import { CheckCircle2 } from "lucide-react";

interface TaskCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  trackMetrics: boolean;
  metricType: string | null;
  trackComments: boolean;
  onConfirm: (metricValue: number | null, comment: string | null) => void;
  onCancel: () => void;
}

export const TaskCompletionModal: React.FC<TaskCompletionModalProps> = ({
  open,
  onOpenChange,
  taskTitle,
  trackMetrics,
  metricType,
  trackComments,
  onConfirm,
  onCancel,
}) => {
  const [metricValue, setMetricValue] = useState<string>("");
  const [comment, setComment] = useState<string>("");

  const metricInfo = METRIC_TYPES.find((m) => m.id === metricType) || METRIC_TYPES[0];

  const handleConfirm = () => {
    const numValue = metricValue ? parseFloat(metricValue) : null;
    const finalComment = comment.trim() || null;
    onConfirm(numValue, finalComment);
    // Reset fields
    setMetricValue("");
    setComment("");
  };

  const handleCancel = () => {
    onCancel();
    setMetricValue("");
    setComment("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Tarefa Concluída! 🎉
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            <strong>{taskTitle}</strong>
          </p>

          {trackMetrics && metricType && (
            <div className="space-y-2">
              <Label htmlFor="metric-value" className="flex items-center gap-2">
                <span>{metricInfo.icon}</span>
                {metricInfo.name}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="metric-value"
                  type="number"
                  step="any"
                  placeholder={`Ex: 45`}
                  value={metricValue}
                  onChange={(e) => setMetricValue(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <span className="text-sm text-muted-foreground w-12">
                  {metricInfo.unit}
                </span>
              </div>
            </div>
          )}

          {trackComments && (
            <div className="space-y-2">
              <Label htmlFor="completion-comment">
                Comentário (opcional)
              </Label>
              <Textarea
                id="completion-comment"
                placeholder="Ex: Treino de pernas hoje, foquei em agachamento..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Pular
          </Button>
          <Button onClick={handleConfirm}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
