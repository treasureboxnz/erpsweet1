import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CategoryComboboxProps {
  value: number[];
  onChange: (value: number[]) => void;
}

export default function CategoryCombobox({ value, onChange }: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const utils = trpc.useUtils();
  
  // Fetch all categories
  const { data: allCategories = [] } = trpc.categories.getAll.useQuery();
  
  // Search categories
  const { data: searchResults = [] } = trpc.categories.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 0 }
  );
  
  // Create category mutation
  const createCategory = trpc.categories.create.useMutation({
    onSuccess: (newCategory) => {
      utils.categories.getAll.invalidate();
      utils.categories.search.invalidate();
      onChange([...value, newCategory!.id]);
      setSearchQuery("");
      toast.success(`分类 "${newCategory!.name}" 已创建`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  // Get selected categories
  const selectedCategories = allCategories.filter((cat) => value.includes(cat.id));
  
  // Get available categories (not selected)
  const availableCategories = searchQuery.length > 0
    ? searchResults.filter((cat) => !value.includes(cat.id))
    : allCategories.filter((cat) => !value.includes(cat.id));
  
  // Check if search query matches any existing category
  const exactMatch = availableCategories.find(
    (cat) => cat.name.toLowerCase() === searchQuery.toLowerCase()
  );
  
  const handleSelect = (categoryId: number) => {
    onChange([...value, categoryId]);
    setSearchQuery("");
  };
  
  const handleRemove = (categoryId: number) => {
    onChange(value.filter((id) => id !== categoryId));
  };
  
  const handleCreate = () => {
    if (searchQuery.trim()) {
      createCategory.mutate({ name: searchQuery.trim() });
    }
  };
  
  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-start text-left font-normal"
          >
            <Plus className="mr-2 h-4 w-4" />
            搜索或创建分类
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="p-2">
            <Input
              placeholder="搜索分类..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-2"
            />
            <div className="max-h-60 overflow-y-auto">
              {availableCategories.length > 0 ? (
                <div className="space-y-1">
                  {availableCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleSelect(category.id)}
                      className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm"
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              ) : searchQuery.length > 0 && !exactMatch ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground px-2">未找到匹配的分类</p>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleCreate}
                    disabled={createCategory.isPending}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    创建 "{searchQuery}"
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground px-2">请输入搜索关键词</p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCategories.map((category) => (
            <Badge key={category.id} variant="secondary" className="gap-1">
              {category.name}
              <button
                onClick={() => handleRemove(category.id)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
