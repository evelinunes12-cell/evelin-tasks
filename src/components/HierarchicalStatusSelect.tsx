import { Check, ChevronsUpDown } from "lucide-react";
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

export interface HierarchicalStatus {
  id: string;
  name: string;
  color: string | null;
  parent_id: string | null;
  children?: HierarchicalStatus[];
}

interface HierarchicalStatusSelectProps {
  value: string;
  onChange: (value: string) => void;
  statuses: HierarchicalStatus[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowCreate?: boolean;
  environmentId?: string | null;
}

export default function HierarchicalStatusSelect({
  value,
  onChange,
  statuses,
  open,
  onOpenChange,
  allowCreate = false,
  environmentId,
}: HierarchicalStatusSelectProps) {
  // Build hierarchy from flat list if needed
  const hierarchical = buildHierarchy(statuses);

  // Find the currently selected status (could be parent or child)
  const allFlat = flattenStatuses(hierarchical);
  const selectedStatus = allFlat.find((s) => s.name === value);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? (
            <div className="flex items-center gap-2">
              {selectedStatus?.color && (
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: selectedStatus.color }}
                />
              )}
              <span className="truncate">{value}</span>
            </div>
          ) : (
            "Selecione um status"
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Pesquisar status..." />
          <CommandList>
            <CommandEmpty>
              <div className="text-sm p-2">
                {value ? (
                  environmentId ? (
                    <span className="text-muted-foreground">
                      Status não encontrado. Peça ao proprietário do ambiente para adicionar.
                    </span>
                  ) : allowCreate ? (
                    <button
                      type="button"
                      onClick={() => {
                        onChange(value);
                        onOpenChange(false);
                      }}
                      className="w-full text-left hover:bg-accent rounded p-2"
                    >
                      Criar "{value}"
                    </button>
                  ) : (
                    <span className="text-muted-foreground">
                      Nenhum status encontrado.
                    </span>
                  )
                ) : (
                  "Digite o nome do status"
                )}
              </div>
            </CommandEmpty>

            {hierarchical.map((parent) => (
              <CommandGroup
                key={parent.id}
                heading={
                  <div className="flex items-center gap-2">
                    {parent.color && (
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: parent.color }}
                      />
                    )}
                    <span>{parent.name}</span>
                  </div>
                }
              >
                {/* If parent has no children, show itself as selectable */}
                {(!parent.children || parent.children.length === 0) && (
                  <CommandItem
                    value={parent.name}
                    onSelect={(val) => {
                      onChange(val);
                      onOpenChange(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === parent.name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {parent.color && (
                      <div
                        className="w-3 h-3 rounded-full mr-2 shrink-0"
                        style={{ backgroundColor: parent.color }}
                      />
                    )}
                    {parent.name}
                  </CommandItem>
                )}

                {/* Show children as selectable items */}
                {parent.children?.map((child) => (
                  <CommandItem
                    key={child.id}
                    value={child.name}
                    onSelect={(val) => {
                      onChange(val);
                      onOpenChange(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === child.name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {child.color && (
                      <div
                        className="w-3 h-3 rounded-full mr-2 shrink-0"
                        style={{ backgroundColor: child.color }}
                      />
                    )}
                    {child.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function buildHierarchy(statuses: HierarchicalStatus[]): HierarchicalStatus[] {
  // If statuses already have children populated, use as-is
  const hasChildren = statuses.some((s) => s.children && s.children.length > 0);
  if (hasChildren) return statuses.filter((s) => !s.parent_id);

  // Build hierarchy from flat list
  const parents = statuses.filter((s) => !s.parent_id);
  const children = statuses.filter((s) => s.parent_id);

  return parents.map((parent) => ({
    ...parent,
    children: children.filter((child) => child.parent_id === parent.id),
  }));
}

function flattenStatuses(statuses: HierarchicalStatus[]): HierarchicalStatus[] {
  const result: HierarchicalStatus[] = [];
  for (const parent of statuses) {
    result.push(parent);
    if (parent.children) {
      result.push(...parent.children);
    }
  }
  return result;
}
