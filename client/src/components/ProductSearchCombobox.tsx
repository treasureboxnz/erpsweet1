import { useState } from "react";
import { matchesPinyin } from "@/lib/pinyin";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface ProductSearchItem {
  id: number;
  sku: string;
  name: string;
  category?: string;
  status?: string;
  price?: string;
  currency?: string;
  image?: string;
  cbm?: number;
  grossWeight?: number;
  netWeight?: number;
  variantCode?: string;
}

interface ProductSearchComboboxProps {
  products: ProductSearchItem[];
  value?: number;
  onSelect: (productId: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ProductSearchCombobox({
  products,
  value,
  onSelect,
  placeholder = "搜索产品...",
  disabled = false,
}: ProductSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedProduct = products.find((p) => p.id === value);

  // 过滤产品
  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    return (
      matchesPinyin(product.sku || "", query) ||
      matchesPinyin(product.name || "", query) ||
      matchesPinyin(product.category || "", query)
    );
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedProduct ? (
            <div className="flex items-center gap-2 overflow-hidden">
              {selectedProduct.image && (
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="h-6 w-6 rounded object-cover"
                />
              )}
              <span className="truncate">
                ({selectedProduct.sku}) {selectedProduct.name}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="搜索产品名称、SKU或分类..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="border-0 focus:ring-0"
            />
          </div>
          <CommandList>
            <CommandEmpty>未找到产品</CommandEmpty>
            <CommandGroup>
              {filteredProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.id.toString()}
                  onSelect={() => {
                    onSelect(product.id);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                  className="flex items-center gap-3 py-3"
                >
                  {/* 缩略图 */}
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-12 w-12 rounded border object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      无图
                    </div>
                  )}

                  {/* 产品信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{product.name}</span>
                      {product.status && (
                        <Badge
                          variant={
                            product.status === "active" ? "default" : "secondary"
                          }
                          className="shrink-0"
                        >
                          {product.status === "active" ? "在售" : "停售"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>SKU: {product.sku}</span>
                      {product.category && (
                        <>
                          <span>•</span>
                          <span>{product.category}</span>
                        </>
                      )}
                    </div>
                    {/* 第二行：价格和物流信息 */}
                    <div className="flex items-center gap-3 text-sm mt-1">
                      {product.price && (
                        <span className="font-medium text-foreground">
                          {product.currency} {product.price}
                        </span>
                      )}
                      {product.cbm !== undefined && Number(product.cbm) > 0 && (
                        <>
                          {product.price && <span className="text-muted-foreground">•</span>}
                          <span className="text-muted-foreground">
                            CBM: {Number(product.cbm).toFixed(2)}m³
                          </span>
                        </>
                      )}
                      {product.grossWeight !== undefined && Number(product.grossWeight) > 0 && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">
                            毛重: {Number(product.grossWeight).toFixed(2)}kg
                          </span>
                        </>
                      )}
                      {product.netWeight !== undefined && Number(product.netWeight) > 0 && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">
                            净重: {Number(product.netWeight).toFixed(2)}kg
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 选中标记 */}
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value === product.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
