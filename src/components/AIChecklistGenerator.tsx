import { useState } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ChecklistItem } from "@/services/tasks";

interface AIChecklistGeneratorProps {
  title: string;
  description: string;
  onGenerate: (items: ChecklistItem[]) => void;
  /** If true, replaces existing items instead of appending */
  hasExistingItems?: boolean;
  /** Called before generating to clear existing items (for regenerate) */
  onClear?: () => void;
  /** Max regenerations allowed (default 3) */
  maxRegenerations?: number;
}

const AIChecklistGenerator = ({
  title,
  description,
  onGenerate,
  hasExistingItems = false,
  onClear,
  maxRegenerations = 3,
}: AIChecklistGeneratorProps) => {
  const [loading, setLoading] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const trimmedDesc = description.trim();
  const isEnabled = trimmedDesc.length >= 40;
  const canRegenerate = generationCount < maxRegenerations;

  const callAI = async () => {
    const { data, error } = await supabase.functions.invoke("generate-subtasks", {
      body: { title: title.trim(), description: trimmedDesc },
    });

    if (error) {
      console.error("Edge function error:", error);
      toast.error("Erro ao gerar checklist com IA. Tente novamente.");
      return null;
    }

    if (data?.error) {
      toast.error(data.error);
      return null;
    }

    const steps = data?.steps as string[] | undefined;
    if (!steps || steps.length === 0) {
      toast.error("Nenhuma subtarefa retornada pela IA.");
      return null;
    }

    return steps.map((text) => ({
      id: crypto.randomUUID(),
      text,
      completed: false,
    }));
  };

  const handleGenerate = async () => {
    if (!isEnabled || !canRegenerate) return;
    setLoading(true);
    try {
      const items = await callAI();
      if (items) {
        onGenerate(items);
        setGenerationCount((c) => c + 1);
        toast.success("✅ Checklist gerado com sucesso! Você pode editar ou remover passos se precisar.");
      }
    } catch (err) {
      console.error("AI checklist error:", err);
      toast.error("Erro inesperado ao gerar checklist.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!isEnabled || !canRegenerate) return;
    setLoading(true);
    try {
      const items = await callAI();
      if (items) {
        onClear?.();
        onGenerate(items);
        setGenerationCount((c) => c + 1);
        const remaining = maxRegenerations - generationCount - 1;
        toast.success(`✅ Checklist regenerado! ${remaining > 0 ? `Você ainda pode regenerar ${remaining}x.` : "Você atingiu o limite de regenerações."}`);
      }
    } catch (err) {
      console.error("AI checklist error:", err);
      toast.error("Erro inesperado ao regenerar checklist.");
    } finally {
      setLoading(false);
    }
  };

  const remainingLabel = `${maxRegenerations - generationCount}/${maxRegenerations}`;

  // First generation button
  if (!hasExistingItems || generationCount === 0) {
    const button = (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!isEnabled || loading || !canRegenerate}
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
  }

  // After first generation: show regenerate button
  const regenButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!isEnabled || loading || !canRegenerate}
      onClick={handleRegenerate}
      className="gap-2 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/5 hover:border-amber-500/60 transition-all"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Regenerando...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          Regenerar ({remainingLabel})
        </>
      )}
    </Button>
  );

  if (!canRegenerate) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{regenButton}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px] text-center">
          Limite de regenerações atingido para esta tarefa.
        </TooltipContent>
      </Tooltip>
    );
  }

  return regenButton;
};

export default AIChecklistGenerator;
