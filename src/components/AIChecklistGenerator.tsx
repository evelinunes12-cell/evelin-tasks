import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ChecklistItem } from "@/services/tasks";

interface AIChecklistGeneratorProps {
  title: string;
  description: string;
  onGenerate: (items: ChecklistItem[]) => void;
}

const AIChecklistGenerator = ({ title, description, onGenerate }: AIChecklistGeneratorProps) => {
  const [loading, setLoading] = useState(false);
  const trimmedDesc = description.trim();
  const isEnabled = trimmedDesc.length >= 40;

  const handleGenerate = async () => {
    if (!isEnabled) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-subtasks", {
        body: { title: title.trim(), description: trimmedDesc },
      });

      if (error) {
        console.error("Edge function error:", error);
        toast.error("Erro ao gerar checklist com IA. Tente novamente.");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const steps = data?.steps as string[] | undefined;
      if (!steps || steps.length === 0) {
        toast.error("Nenhuma subtarefa retornada pela IA.");
        return;
      }

      const newItems: ChecklistItem[] = steps.map((text) => ({
        id: crypto.randomUUID(),
        text,
        completed: false,
      }));

      onGenerate(newItems);
      toast.success("✅ Checklist gerado com sucesso! Você pode editar ou remover passos se precisar.");
    } catch (err) {
      console.error("AI checklist error:", err);
      toast.error("Erro inesperado ao gerar checklist.");
    } finally {
      setLoading(false);
    }
  };

  const button = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!isEnabled || loading}
      onClick={handleGenerate}
      className="gap-2 border-primary/40 text-primary hover:bg-primary/5 hover:border-primary/60 transition-all"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Pensando...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Gerar Passos com IA
        </>
      )}
    </Button>
  );

  if (!isEnabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px] text-center">
          Descreva a tarefa com mais detalhes (mín. 40 caracteres) para a IA sugerir os passos.
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
};

export default AIChecklistGenerator;
