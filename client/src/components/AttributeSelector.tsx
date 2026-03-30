import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { matchesPinyin } from "@/lib/pinyin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AttributeSelectorProps {
  /**
   * 属性分类（如"产品管理"）
   */
  category: string;
  
  /**
   * 属性子分类（如"批次管理"）
   */
  subcategory?: string;
  
  /**
   * 字段名称（如"变更说明"）
   */
  fieldName: string;
  
  /**
   * 当前选中的值（字符串数组）
   */
  value: string[];
  
  /**
   * 值变化回调
   */
  onChange: (value: string[]) => void;
  
  /**
   * 是否支持多选
   */
  multiple?: boolean;
  
  /**
   * 占位符文本
   */
  placeholder?: string;
}

export default function AttributeSelector({
  category,
  subcategory,
  fieldName,
  value,
  onChange,
  multiple = true,
  placeholder = "选择或创建属性",
}: AttributeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 查询属性列表
  const { data: attributes, refetch } = trpc.attributes.getAll.useQuery({
    category,
    subcategory,
    fieldName,
  });

  // 创建属性
  const createMutation = trpc.attributes.create.useMutation({
    onSuccess: (newAttribute) => {
      toast.success("属性创建成功");
      refetch();
      
      // 自动选中新创建的属性
      if (multiple) {
        onChange([...value, newAttribute.name]);
      } else {
        onChange([newAttribute.name]);
      }
      
      setSearchQuery("");
      setIsCreating(false);
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // 过滤属性列表
  const filteredAttributes = attributes?.filter((attr) =>
    matchesPinyin(attr.name, searchQuery)
  ) || [];

  // 是否显示"创建新属性"按钮
  const showCreateButton =
    searchQuery.trim() &&
    !filteredAttributes.some(
      (attr) => attr.name.toLowerCase() === searchQuery.toLowerCase()
    );

  const handleToggle = (attrName: string) => {
    if (multiple) {
      if (value.includes(attrName)) {
        onChange(value.filter((v) => v !== attrName));
      } else {
        onChange([...value, attrName]);
      }
    } else {
      onChange([attrName]);
      setOpen(false);
    }
  };

  const handleRemove = (attrName: string) => {
    onChange(value.filter((v) => v !== attrName));
  };

  const handleCreate = () => {
    if (!searchQuery.trim()) return;

    setIsCreating(true);
    createMutation.mutate({
      name: searchQuery.trim(),
      category,
      subcategory,
      fieldName,
    });
  };

  // 当打开时聚焦搜索框
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  return (
    <div className="space-y-1.5">
      {/* 已选中的属性标签 */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((attrName) => (
            <Badge
              key={attrName}
              variant="secondary"
              className="pl-2.5 pr-1 py-1"
            >
              {attrName}
              <Button
                size="icon"
                variant="ghost"
                className="h-4 w-4 ml-1 hover:bg-transparent"
                onClick={() => handleRemove(attrName)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* 选择器 */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal h-8 text-sm"
          >
            <Search className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0" align="start">
          {/* 搜索框 */}
          <div className="p-3 border-b">
            <Input
              ref={inputRef}
              placeholder="搜索或输入新属性..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>

          {/* 属性列表 */}
          <ScrollArea className="h-[300px]">
            <div className="p-2">
              {/* 创建新属性按钮 */}
              {showCreateButton && (
                <Button
                  variant="ghost"
                  className="w-full justify-start mb-2 text-primary"
                  onClick={handleCreate}
                  disabled={isCreating}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isCreating
                    ? "创建中..."
                    : `添加新属性 "${searchQuery}"`}
                </Button>
              )}

              {/* 现有属性列表 */}
              {filteredAttributes.length === 0 && !showCreateButton && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {searchQuery ? "未找到匹配的属性" : "暂无属性"}
                </div>
              )}

              {filteredAttributes.map((attr) => (
                <div
                  key={attr.id}
                  className="flex items-center space-x-2 rounded-md px-3 py-2 hover:bg-accent cursor-pointer"
                  onClick={() => handleToggle(attr.name)}
                >
                  {multiple && (
                    <Checkbox
                      checked={value.includes(attr.name)}
                      onCheckedChange={() => handleToggle(attr.name)}
                    />
                  )}
                  <span className="flex-1">{attr.name}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
