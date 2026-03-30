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

export interface CustomerSearchItem {
  id: number;
  name: string;
  code?: string;
  country?: string;
  city?: string;
  // contactPerson?: string; // companies表中没有这个字段
}

interface CustomerSearchComboboxProps {
  customers: CustomerSearchItem[];
  value?: number;
  onSelect: (customerId: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CustomerSearchCombobox({
  customers,
  value,
  onSelect,
  placeholder = "搜索客户...",
  disabled = false,
}: CustomerSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedCustomer = customers.find((c) => c.id === value);

  // 过滤客户
  const filteredCustomers = customers.filter((customer) => {
    const query = searchQuery.toLowerCase();
    return (
      matchesPinyin(customer.name, query) ||
      (customer.code ? matchesPinyin(customer.code, query) : false) ||
      (customer.country ? matchesPinyin(customer.country, query) : false)
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
          {selectedCustomer ? (
            <span className="truncate">{selectedCustomer.name}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="搜索客户名称、编号或联系人..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="border-0 focus:ring-0"
            />
          </div>
          <CommandList>
            <CommandEmpty>未找到客户</CommandEmpty>
            <CommandGroup>
              {filteredCustomers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id.toString()}
                  onSelect={() => {
                    onSelect(customer.id);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{customer.name}</div>
                    {(customer.code || customer.country) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                        {customer.code && <span>{customer.code}</span>}
                        {customer.country && (
                          <>
                            {customer.code && <span>•</span>}
                            <span>{customer.country}</span>
                          </>
                        )}
                        {/* customer.contactPerson 已移除 */}
                      </div>
                    )}
                  </div>
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0 ml-2",
                      value === customer.id ? "opacity-100" : "opacity-0"
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
