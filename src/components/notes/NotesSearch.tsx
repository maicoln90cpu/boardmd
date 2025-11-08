import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface NotesSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: 'updated' | 'alphabetical' | 'created';
  onSortChange: (value: 'updated' | 'alphabetical' | 'created') => void;
}

export function NotesSearch({ searchTerm, onSearchChange, sortBy, onSortChange }: NotesSearchProps) {
  return (
    <div className="space-y-3 p-4 border-b bg-card">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar notas..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="updated">Modificadas recentemente</SelectItem>
          <SelectItem value="created">Criadas recentemente</SelectItem>
          <SelectItem value="alphabetical">Ordem alfabética</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
