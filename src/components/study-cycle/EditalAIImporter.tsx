import { useState, useRef } from "react";
import { Wand2, Upload, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface AIExtractedSubject {
  name: string;
  weight: number;
}

interface EditalAIImporterProps {
  onImport: (subjects: AIExtractedSubject[]) => void;
}

const EditalAIImporter = ({ onImport }: EditalAIImporterProps) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      toast.error("Arquivo muito grande. Máximo 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setText(content || "");
      toast.success("Arquivo carregado!");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleAnalyze = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 20) {
      toast.error("Cole um texto mais longo do edital.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-edital", {
        body: { text: trimmed },
      });

      if (error) {
        console.error("Edge function error:", error);
        toast.error("Erro ao analisar o edital. Tente novamente.");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const subjects = data?.subjects as AIExtractedSubject[] | undefined;
      if (!subjects || subjects.length === 0) {
        toast.error("Nenhuma disciplina encontrada no texto.");
        return;
      }

      toast.success(`${subjects.length} disciplina(s) extraída(s) com sucesso!`);
      onImport(subjects);
      setOpen(false);
      setText("");
    } catch (err) {
      console.error("Parse error:", err);
      toast.error("Erro inesperado ao processar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
      >
        <Wand2 className="h-4 w-4" />
        Preencher via Edital (IA)
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Importador Inteligente de Editais
            </DialogTitle>
            <DialogDescription>
              Cole o texto do edital contendo as disciplinas e os pesos. A nossa IA fará o trabalho duro por você.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Cole aqui o texto do edital, quadro de disciplinas, ou conteúdo programático..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[200px] resize-y"
              disabled={loading}
            />

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.text"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="gap-1.5 text-muted-foreground"
              >
                <Upload className="h-4 w-4" />
                Carregar .txt
              </Button>

              <span className="text-xs text-muted-foreground flex-1 text-right">
                {text.length > 0 ? `${text.length.toLocaleString()} caracteres` : ""}
              </span>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={loading || text.trim().length < 20}
              className="w-full gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando com IA...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analisar Edital com IA
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditalAIImporter;
