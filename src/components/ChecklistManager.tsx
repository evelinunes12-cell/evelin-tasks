import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { X, Plus, GripVertical, ChevronLeft, ChevronRight, Settings, ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface ChecklistManagerProps {
  items: ChecklistItem[];
  onItemsChange: (items: ChecklistItem[]) => void;
  label?: string;
  showProgress?: boolean;
  defaultItemsPerPage?: number;
}

interface SortableItemProps {
  item: ChecklistItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
}

const SortableItem = ({ item, onToggle, onRemove, onEdit }: SortableItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmedText = editText.trim();
    if (trimmedText && trimmedText !== item.text) {
      onEdit(item.id, trimmedText);
    } else {
      setEditText(item.text);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setEditText(item.text);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg group"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      
      <Checkbox
        checked={item.completed}
        onCheckedChange={() => onToggle(item.id)}
      />
      
      {isEditing ? (
        <Input
          ref={inputRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 h-7 text-sm"
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={`flex-1 text-sm cursor-pointer hover:bg-background/50 px-1 py-0.5 rounded transition-colors ${
            item.completed ? "line-through text-muted-foreground" : ""
          }`}
        >
          {item.text}
        </span>
      )}
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onRemove(item.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

const ITEMS_PER_PAGE_OPTIONS = [5, 8, 10, 15, 20, 50];

type SortMode = "custom" | "pending_first" | "completed_first" | "alphabetical_asc" | "alphabetical_desc";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "custom", label: "Ordem manual" },
  { value: "pending_first", label: "Não concluídos primeiro" },
  { value: "completed_first", label: "Concluídos primeiro" },
  { value: "alphabetical_asc", label: "A → Z" },
  { value: "alphabetical_desc", label: "Z → A" },
];

const sortItems = (items: ChecklistItem[], mode: SortMode): ChecklistItem[] => {
  if (mode === "custom") return items;
  const sorted = [...items];
  switch (mode) {
    case "pending_first":
      return sorted.sort((a, b) => Number(a.completed) - Number(b.completed));
    case "completed_first":
      return sorted.sort((a, b) => Number(b.completed) - Number(a.completed));
    case "alphabetical_asc":
      return sorted.sort((a, b) => a.text.localeCompare(b.text, "pt-BR"));
    case "alphabetical_desc":
      return sorted.sort((a, b) => b.text.localeCompare(a.text, "pt-BR"));
    default:
      return sorted;
  }
};

const ChecklistManager = ({ 
  items, 
  onItemsChange, 
  label = "Checklist",
  showProgress = true,
  defaultItemsPerPage = 8
}: ChecklistManagerProps) => {
  const [newItemText, setNewItemText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);
  const [sortMode, setSortMode] = useState<SortMode>("custom");

  const sortedItems = sortItems(items, sortMode);
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const paginatedItems = sortedItems.length > itemsPerPage
    ? sortedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : sortedItems;

  // Reset to last page if current page exceeds total after deletion
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const completedCount = items.filter((item) => item.completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  const addItem = () => {
    if (newItemText.trim()) {
      const newItem: ChecklistItem = {
        id: crypto.randomUUID(),
        text: newItemText.trim(),
        completed: false,
      };
      onItemsChange([...items, newItem]);
      setNewItemText("");
    }
  };

  const toggleItem = (id: string) => {
    onItemsChange(
      items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const removeItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const editItem = (id: string, newText: string) => {
    onItemsChange(
      items.map((item) =>
        item.id === id ? { ...item, text: newText } : item
      )
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      onItemsChange(arrayMove(items, oldIndex, newIndex));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {showProgress && items.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedCount}/{items.length} ({Math.round(progress)}%)
          </span>
        )}
      </div>
      
      {showProgress && items.length > 0 && (
        <Progress value={progress} className="h-2" />
      )}
      
      <div className="flex gap-2">
        <Input
          placeholder="Adicionar item ao checklist..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={addItem}
          disabled={!newItemText.trim()}
          size="sm"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {items.length > 1 && (
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <Select value={sortMode} onValueChange={(v) => { setSortMode(v as SortMode); setCurrentPage(1); }}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {items.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext items={paginatedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="mt-3 space-y-2">
              {paginatedItems.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onToggle={toggleItem}
                  onRemove={removeItem}
                  onEdit={editItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {currentPage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
            <Settings className="w-3 h-3 text-muted-foreground" />
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                const newItemsPerPage = parseInt(value, 10);
                setItemsPerPage(newItemsPerPage);
                // Reset to page 1 when changing items per page
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-7 w-[70px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option.toString()} className="text-xs">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistManager;
