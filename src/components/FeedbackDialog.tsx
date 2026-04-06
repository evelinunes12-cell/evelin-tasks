import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquarePlus, Send, Lightbulb, Bug, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const feedbackTypes = [
  { value: "suggestion", label: "Sugestão de melhoria", icon: Lightbulb },
  { value: "bug", label: "Reportar problema", icon: Bug },
  { value: "help", label: "Pedido de ajuda", icon: HelpCircle },
  { value: "other", label: "Outro", icon: MessageSquarePlus },
];

const FeedbackDialog = ({ children }: { children?: React.ReactNode }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("suggestion");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!user || !message.trim()) return;

    const trimmed = message.trim();
    if (trimmed.length < 10) {
      toast.error("A mensagem deve ter pelo menos 10 caracteres.");
      return;
    }
    if (trimmed.length > 2000) {
      toast.error("A mensagem deve ter no máximo 2000 caracteres.");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from("feedback" as any).insert({
        user_id: user.id,
        type,
        message: trimmed,
      } as any);

      if (error) throw error;

      toast.success("Feedback enviado com sucesso! Obrigado pela contribuição 💙");
      setMessage("");
      setType("suggestion");
      setOpen(false);
    } catch {
      toast.error("Erro ao enviar feedback. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquarePlus className="w-4 h-4" />
            Enviar Feedback
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-primary" />
            Enviar Feedback
          </DialogTitle>
          <DialogDescription>
            Sua opinião é muito importante para nós. Conte o que podemos melhorar!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="feedback-type">Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="feedback-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {feedbackTypes.map((ft) => (
                  <SelectItem key={ft.value} value={ft.value}>
                    <div className="flex items-center gap-2">
                      <ft.icon className="w-4 h-4" />
                      {ft.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-message">Mensagem</Label>
            <Textarea
              id="feedback-message"
              placeholder="Descreva sua sugestão, problema ou dúvida..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={2000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/2000
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={sending || message.trim().length < 10}
            className="w-full gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? "Enviando..." : "Enviar Feedback"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
