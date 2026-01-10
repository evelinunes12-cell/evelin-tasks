import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ExternalLink, Download, FileText, LinkIcon as LinkIconLucide, CheckSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskStep {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  google_docs_link: string | null;
  canva_link: string | null;
  order_index: number;
}

interface StepAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  is_link: boolean;
}

interface TaskStepDisplayProps {
  steps: TaskStep[];
  stepAttachments: Record<string, StepAttachment[]>;
  onDownloadAttachment: (attachment: StepAttachment) => void;
}

const TaskStepDisplay = ({ steps, stepAttachments, onDownloadAttachment }: TaskStepDisplayProps) => {
  if (steps.length === 0) return null;

  // Função auxiliar para corrigir a visualização da data (compensa fuso horário)
  const formatDate = (dateString: string) => {
    if (!dateString) return null;
    
    // Cria o objeto data a partir da string salva
    const date = new Date(dateString);
    
    // Pega a diferença de fuso horário do usuário em milissegundos
    const timeZoneOffset = date.getTimezoneOffset() * 60000;
    
    // Adiciona essa diferença para "anular" a conversão do navegador
    const adjustedDate = new Date(date.getTime() + timeZoneOffset);

    return format(adjustedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const completedSteps = steps.filter(step => step.status.toLowerCase().includes("conclu")).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5" />
          Etapas do Trabalho ({completedSteps}/{steps.length} concluídas)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => {
            const attachments = stepAttachments[step.id] || [];
            
            return (
              <Card key={step.id} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold">
                        Etapa {index + 1}: {step.title}
                      </h3>
                    </div>
                    <Badge variant="secondary">
                      {step.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {step.description && (
                    <div>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {step.description}
                      </p>
                    </div>
                  )}

                  {step.due_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        Data de entrega: {formatDate(step.due_date)}
                      </span>
                    </div>
                  )}

                  {(step.google_docs_link || step.canva_link) && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Links:</p>
                      {step.google_docs_link && (
                        <div className="flex items-center gap-2">
                          <LinkIconLucide className="w-4 h-4 text-muted-foreground" />
                          <a
                            href={step.google_docs_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            Trabalho Escrito
                          </a>
                        </div>
                      )}
                      {step.canva_link && (
                        <div className="flex items-center gap-2">
                          <LinkIconLucide className="w-4 h-4 text-muted-foreground" />
                          <a
                            href={step.canva_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            Apresentação
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Anexos ({attachments.length}):</p>
                      <div className="space-y-1">
                        {attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between p-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {attachment.is_link && <LinkIconLucide className="w-3 h-3 text-muted-foreground" />}
                                <p className="text-sm truncate">{attachment.file_name}</p>
                              </div>
                              {attachment.file_size && !attachment.is_link && (
                                <p className="text-xs text-muted-foreground">
                                  {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDownloadAttachment(attachment)}
                            >
                              {attachment.is_link ? (
                                <ExternalLink className="w-3 h-3" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskStepDisplay;
