import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TagComboboxProps {
  value: number[];
  onChange: (value: number[]) => void;
}

export default function TagCombobox({ value, onChange }: TagComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const utils = trpc.useUtils();
  
  // Fetch all tags
  const { data: allTags = [] } = trpc.tags.getAll.useQuery();
  
  // Search tags
  const { data: searchResults = [] } = trpc.tags.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 0 }
  );
  
  // Create tag mutation
  const createTag = trpc.tags.create.useMutation({
    onSuccess: (newTag) => {
      utils.tags.getAll.invalidate();
      utils.tags.search.invalidate();
      onChange([...value, newTag!.id]);
      setSearchQuery("");
      toast.success(`标签 "${newTag!.name}" 已创建`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  // Get selected tags
  const selectedTags = allTags.filter((tag) => value.includes(tag.id));
  
  // Get available tags (not selected)
  const availableTags = searchQuery.length > 0
    ? searchResults.filter((tag) => !value.includes(tag.id))
    : allTags.filter((tag) => !value.includes(tag.id));
  
  // Check if search query matches any existing tag
  const exactMatch = availableTags.find(
    (tag) => tag.name.toLowerCase() === searchQuery.toLowerCase()
  );
  
  const handleSelect = (tagId: number) => {
    onChange([...value, tagId]);
    setSearchQuery("");
  };
  
  const handleRemove = (tagId: number) => {
    onChange(value.filter((id) => id !== tagId));
  };
  
  const handleCreate = () => {
    if (searchQuery.trim()) {
      createTag.mutate({ name: searchQuery.trim() });
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
            搜索或添加标签
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="p-2">
            <Input
              placeholder="搜索标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-2"
            />
            <div className="max-h-60 overflow-y-auto">
              {availableTags.length > 0 ? (
                <div className="space-y-1">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleSelect(tag.id)}
                      className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm flex items-center gap-2"
                    >
                      <TagIcon className="h-3 w-3" />
                      {tag.name}
                    </button>
                  ))}
                </div>
              ) : searchQuery.length > 0 && !exactMatch ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground px-2">未找到匹配的标签</p>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleCreate}
                    disabled={createTag.isPending}
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
      
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge key={tag.id} variant="outline" className="gap-1">
              <TagIcon className="h-3 w-3" />
              {tag.name}
              <button
                onClick={() => handleRemove(tag.id)}
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
