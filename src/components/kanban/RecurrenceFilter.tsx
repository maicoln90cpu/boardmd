import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Repeat, CircleDot, List } from "lucide-react";

export type RecurrenceFilterValue = "all" | "recurring" | "non-recurring";

interface RecurrenceFilterProps {
  value: RecurrenceFilterValue;
  onChange: (value: RecurrenceFilterValue) => void;
  className?: string;
}

export function RecurrenceFilter({ value, onChange, className }: RecurrenceFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as RecurrenceFilterValue)}>
      <SelectTrigger className={className || "w-full md:w-[160px] h-10"}>
        <SelectValue placeholder="Recorrência" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span>Todas</span>
          </div>
        </SelectItem>
        <SelectItem value="recurring">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-primary" />
            <span>Recorrentes</span>
          </div>
        </SelectItem>
        <SelectItem value="non-recurring">
          <div className="flex items-center gap-2">
            <CircleDot className="h-4 w-4 text-muted-foreground" />
            <span>Únicas</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
