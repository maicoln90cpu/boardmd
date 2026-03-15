import { memo, useState, useMemo } from "react";
import { Task } from "@/hooks/tasks/useTasks";
import { Column } from "@/hooks/data/useColumns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpDown,
  Star,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBulkSelection } from "@/hooks/useBulkSelection";

interface TaskTableViewProps {
  tasks: Task[];
  columns: Column[];
  onEditTask: (task: Task) => void;
  onDeleteClick: (id: string) => void;
  toggleFavorite: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  originalCategoriesMap: Record<string, string>;
}

type SortField = "title" | "priority" | "due_date" | "column_id" | "created_at";
type SortDirection = "asc" | "desc";

const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
const priorityConfig: Record<string, { label: string; class: string }> = {
  high: { label: "Alta", class: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Média", class: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  low: { label: "Baixa", class: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
};

export const TaskTableView = memo(function TaskTableView({
  tasks,
  columns,
  onEditTask,
  onDeleteClick,
  toggleFavorite,
  updateTask,
  originalCategoriesMap,
}: TaskTableViewProps) {
  const { isSelectionMode, isSelected, toggleSelection } = useBulkSelection();
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const columnMap = useMemo(() => {
    const map: Record<string, string> = {};
    columns.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [columns]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "priority":
          cmp = (priorityOrder[a.priority || "medium"] || 0) - (priorityOrder[b.priority || "medium"] || 0);
          break;
        case "due_date":
          if (!a.due_date && !b.due_date) cmp = 0;
          else if (!a.due_date) cmp = 1;
          else if (!b.due_date) cmp = -1;
          else cmp = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case "column_id":
          cmp = (columnMap[a.column_id] || "").localeCompare(columnMap[b.column_id] || "");
          break;
        case "created_at":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [tasks, sortField, sortDir, columnMap]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const startEdit = (id: string, field: string, value: string) => {
    setEditingCell({ id, field });
    setEditValue(value);
  };

  const commitEdit = async () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    if (field === "title" && editValue.trim()) {
      await updateTask(id, { title: editValue.trim() });
    }
    setEditingCell(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date() && !tasks.find(t => t.due_date === dateStr)?.is_completed;
  };

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {isSelectionMode && <TableHead className="w-10" />}
            <TableHead className="w-10" />
            <TableHead>
              <button onClick={() => handleSort("title")} className="flex items-center font-medium">
                Título <SortIcon field="title" />
              </button>
            </TableHead>
            <TableHead className="w-24">
              <button onClick={() => handleSort("priority")} className="flex items-center font-medium">
                Prioridade <SortIcon field="priority" />
              </button>
            </TableHead>
            <TableHead className="w-28">
              <button onClick={() => handleSort("due_date")} className="flex items-center font-medium">
                Prazo <SortIcon field="due_date" />
              </button>
            </TableHead>
            <TableHead className="w-32">
              <button onClick={() => handleSort("column_id")} className="flex items-center font-medium">
                Coluna <SortIcon field="column_id" />
              </button>
            </TableHead>
            <TableHead className="w-32">Categoria</TableHead>
            <TableHead className="w-40">Tags</TableHead>
            <TableHead className="w-20 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.map(task => (
            <TableRow
              key={task.id}
              className={cn(
                "cursor-pointer group",
                task.is_completed && "opacity-50",
                isSelected(task.id) && "bg-primary/5"
              )}
            >
              {isSelectionMode && (
                <TableCell>
                  <Checkbox
                    checked={isSelected(task.id)}
                    onCheckedChange={() => toggleSelection(task.id)}
                  />
                </TableCell>
              )}
              <TableCell>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(task.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Star className={cn("h-4 w-4", task.is_favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
                </button>
              </TableCell>
              <TableCell onClick={() => onEditTask(task)}>
                {editingCell?.id === task.id && editingCell.field === "title" ? (
                  <Input
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={e => e.key === "Enter" && commitEdit()}
                    autoFocus
                    className="h-7 text-sm"
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className={cn("text-sm", task.is_completed && "line-through")}
                    onDoubleClick={(e) => { e.stopPropagation(); startEdit(task.id, "title", task.title); }}
                  >
                    {task.title}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Select
                  value={task.priority || "medium"}
                  onValueChange={v => updateTask(task.id, { priority: v })}
                >
                  <SelectTrigger className="h-7 text-xs border-0 bg-transparent p-0 w-auto">
                    <Badge variant="outline" className={cn("text-xs", priorityConfig[task.priority || "medium"]?.class)}>
                      {priorityConfig[task.priority || "medium"]?.label}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">🔴 Alta</SelectItem>
                    <SelectItem value="medium">🟡 Média</SelectItem>
                    <SelectItem value="low">🟢 Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <span className={cn("text-sm", isOverdue(task.due_date) && "text-destructive font-medium")}>
                  {formatDate(task.due_date)}
                </span>
              </TableCell>
              <TableCell>
                <Select
                  value={task.column_id}
                  onValueChange={v => updateTask(task.id, { column_id: v })}
                >
                  <SelectTrigger className="h-7 text-xs border-0 bg-transparent p-0 w-auto">
                    <span className="text-xs">{columnMap[task.column_id] || "—"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map(col => (
                      <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground">
                  {originalCategoriesMap[task.category_id] || "—"}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {task.tags?.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {tag}
                    </Badge>
                  ))}
                  {(task.tags?.length || 0) > 3 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      +{(task.tags?.length || 0) - 3}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditTask(task)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDeleteClick(task.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {sortedTasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                Nenhuma tarefa encontrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
});
