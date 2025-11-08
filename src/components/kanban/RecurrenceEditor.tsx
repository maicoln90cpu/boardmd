import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
}

interface RecurrenceEditorProps {
  recurrence: RecurrenceRule | null;
  onChange: (recurrence: RecurrenceRule | null) => void;
}

export function RecurrenceEditor({ recurrence, onChange }: RecurrenceEditorProps) {
  const isEnabled = recurrence !== null;

  const toggleRecurrence = (enabled: boolean) => {
    if (enabled) {
      onChange({ frequency: 'daily', interval: 1 });
    } else {
      onChange(null);
    }
  };

  const updateFrequency = (frequency: 'daily' | 'weekly' | 'monthly') => {
    if (recurrence) {
      onChange({ ...recurrence, frequency });
    }
  };

  const updateInterval = (interval: number) => {
    if (recurrence && interval > 0) {
      onChange({ ...recurrence, interval });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="recurrence-switch">Tarefa recorrente</Label>
        <Switch
          id="recurrence-switch"
          checked={isEnabled}
          onCheckedChange={toggleRecurrence}
        />
      </div>

      {isEnabled && recurrence && (
        <div className="grid grid-cols-2 gap-3 pl-2 border-l-2 border-primary/20">
          <div>
            <Label className="text-xs">Frequência</Label>
            <Select value={recurrence.frequency} onValueChange={updateFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diária</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Intervalo</Label>
            <Input
              type="number"
              min="1"
              value={recurrence.interval}
              onChange={(e) => updateInterval(parseInt(e.target.value) || 1)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
