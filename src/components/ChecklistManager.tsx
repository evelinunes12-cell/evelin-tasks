import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus } from "lucide-react";

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface ChecklistManagerProps {
  items: ChecklistItem[];
  onItemsChange: (items: ChecklistItem[]) => void;
  label?: string;
}

const ChecklistManager = ({ items, onItemsChange, label = "Checklist" }: ChecklistManagerProps) => {
  const [newItemText, setNewItemText] = useState("");

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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          placeholder="Adicionar item ao checklist..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyPress={handleKeyPress}
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
      {items.length > 0 && (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg"
            >
              <Checkbox
                checked={item.completed}
                onCheckedChange={() => toggleItem(item.id)}
              />
              <span
                className={`flex-1 text-sm ${
                  item.completed ? "line-through text-muted-foreground" : ""
                }`}
              >
                {item.text}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(item.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChecklistManager;
