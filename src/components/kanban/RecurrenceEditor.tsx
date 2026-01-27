import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { WEEKDAY_NAMES } from "@/lib/recurrenceUtils";

interface RecurrenceRule {
  frequency?: 'daily' | 'weekly' | 'monthly';
  interval?: number;
  weekday?: number; // 0-6 (Domingo a Sábado) - mantido para compatibilidade
  weekdays?: number[]; // NOVO: array de dias [1, 4] = Segunda e Quinta
}

interface RecurrenceEditorProps {
  recurrence: RecurrenceRule | null;
  onChange: (recurrence: RecurrenceRule | null) => void;
}

type RecurrenceMode = 'frequency' | 'weekday';

export function RecurrenceEditor({ recurrence, onChange }: RecurrenceEditorProps) {
  const isEnabled = recurrence !== null;
  
  // Determinar modo atual baseado na regra existente
  const getCurrentMode = (): RecurrenceMode => {
    if (!recurrence) return 'frequency';
    if (recurrence.weekday !== undefined || recurrence.weekdays !== undefined) return 'weekday';
    return 'frequency';
  };
  
  const mode = getCurrentMode();

  // Obter dias selecionados (suporta ambos formatos: weekday único ou weekdays array)
  const getSelectedDays = (): number[] => {
    if (!recurrence) return [];
    if (recurrence.weekdays && recurrence.weekdays.length > 0) {
      return recurrence.weekdays;
    }
    if (recurrence.weekday !== undefined) {
      return [recurrence.weekday];
    }
    return [];
  };

  const selectedDays = getSelectedDays();

  const toggleRecurrence = (enabled: boolean) => {
    if (enabled) {
      onChange({ frequency: 'daily', interval: 1 });
    } else {
      onChange(null);
    }
  };

  const setMode = (newMode: RecurrenceMode) => {
    if (newMode === 'frequency') {
      onChange({ frequency: 'daily', interval: 1 });
    } else {
      // Padrão: Segunda-feira (1)
      onChange({ weekdays: [1] });
    }
  };

  const updateFrequency = (frequency: 'daily' | 'weekly' | 'monthly') => {
    if (recurrence) {
      onChange({ frequency, interval: recurrence.interval || 1 });
    }
  };

  const updateInterval = (interval: number) => {
    if (recurrence && interval > 0) {
      onChange({ ...recurrence, interval, weekday: undefined, weekdays: undefined });
    }
  };

  const toggleWeekday = (dayIndex: number, checked: boolean) => {
    let newDays: number[];
    
    if (checked) {
      newDays = [...selectedDays, dayIndex].sort((a, b) => a - b);
    } else {
      newDays = selectedDays.filter(d => d !== dayIndex);
    }
    
    // Garantir pelo menos um dia selecionado
    if (newDays.length === 0) {
      return;
    }
    
    onChange({ weekdays: newDays });
  };

  // Formatar descrição dos dias selecionados
  const formatSelectedDays = (): string => {
    if (selectedDays.length === 0) return "";
    if (selectedDays.length === 1) {
      return `Toda ${WEEKDAY_NAMES[selectedDays[0]]}`;
    }
    if (selectedDays.length === 7) {
      return "Todos os dias";
    }
    const dayNames = selectedDays.map(d => WEEKDAY_NAMES[d].replace("-feira", ""));
    return `Toda ${dayNames.join(", ")}`;
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
        <div className="space-y-4 pl-2 border-l-2 border-primary/20">
          {/* Seleção do modo de recorrência */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Modo de recorrência</Label>
            <RadioGroup 
              value={mode} 
              onValueChange={(value) => setMode(value as RecurrenceMode)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="frequency" id="mode-frequency" />
                <Label htmlFor="mode-frequency" className="text-sm cursor-pointer">
                  Por frequência
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekday" id="mode-weekday" />
                <Label htmlFor="mode-weekday" className="text-sm cursor-pointer">
                  Por dia da semana
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Campos para modo FREQUÊNCIA */}
          {mode === 'frequency' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Frequência</Label>
                <Select 
                  value={recurrence.frequency || 'daily'} 
                  onValueChange={(v) => updateFrequency(v as 'daily' | 'weekly' | 'monthly')}
                >
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
                  value={recurrence.interval || 1}
                  onChange={(e) => updateInterval(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
          )}

          {/* Campo para modo DIA DA SEMANA - MULTI-SELECT */}
          {mode === 'weekday' && (
            <div>
              <Label className="text-xs mb-2 block">Repetir nos dias:</Label>
              <div className="grid grid-cols-2 gap-2">
                {WEEKDAY_NAMES.map((name, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      id={`weekday-${index}`}
                      checked={selectedDays.includes(index)}
                      onCheckedChange={(checked) => toggleWeekday(index, !!checked)}
                    />
                    <Label 
                      htmlFor={`weekday-${index}`} 
                      className="text-sm cursor-pointer"
                    >
                      {name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Descrição do comportamento */}
          <p className="text-xs text-muted-foreground">
            {mode === 'frequency' ? (
              <>
                A cada {recurrence.interval || 1}{' '}
                {recurrence.frequency === 'daily' && (recurrence.interval === 1 ? 'dia' : 'dias')}
                {recurrence.frequency === 'weekly' && (recurrence.interval === 1 ? 'semana' : 'semanas')}
                {recurrence.frequency === 'monthly' && (recurrence.interval === 1 ? 'mês' : 'meses')}
              </>
            ) : (
              <>{formatSelectedDays()}</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
