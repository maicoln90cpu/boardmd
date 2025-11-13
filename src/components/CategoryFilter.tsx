import { Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface CategoryFilterProps {
  categories: Array<{ id: string; name: string }>;
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  compact?: boolean;
  tasks?: Array<{ category_id: string }>;
}

export function CategoryFilter({
  categories,
  selectedCategories,
  onCategoryChange,
  compact = false,
  tasks = [],
}: CategoryFilterProps) {
  const handleToggle = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onCategoryChange(selectedCategories.filter((id) => id !== categoryId));
    } else {
      onCategoryChange([...selectedCategories, categoryId]);
    }
  };

  const handleToggleAll = () => {
    if (selectedCategories.length === categories.length) {
      onCategoryChange([]);
    } else {
      onCategoryChange(categories.map((c) => c.id));
    }
  };

  const allSelected = selectedCategories.length === categories.length;
  const selectedCount = selectedCategories.length;

  const getTaskCount = (categoryId: string) => {
    return tasks.filter(t => t.category_id === categoryId).length;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`${compact ? "min-h-[40px] w-[180px]" : "min-h-[48px] w-full"} justify-start gap-2`}
        >
          <Folder className="h-4 w-4" />
          <span className="flex-1 text-left truncate">
            {selectedCount === 0
              ? "Todas as categorias"
              : selectedCount === categories.length
              ? "Todas as categorias"
              : `${selectedCount} categoria${selectedCount > 1 ? "s" : ""}`}
          </span>
          {selectedCount > 0 && selectedCount < categories.length && (
            <Badge variant="secondary" className="ml-auto">
              {selectedCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={allSelected}
              onCheckedChange={handleToggleAll}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium cursor-pointer flex-1"
            >
              {allSelected ? "Desmarcar todas" : "Selecionar todas"}
            </label>
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-2 space-y-1">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                onClick={() => handleToggle(category.id)}
              >
                <Checkbox
                  id={category.id}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={() => handleToggle(category.id)}
                />
                <label
                  htmlFor={category.id}
                  className="text-sm cursor-pointer flex-1 flex items-center justify-between"
                >
                  <span>{category.name}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {getTaskCount(category.id)}
                  </Badge>
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
