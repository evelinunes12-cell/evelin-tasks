import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, X, ChevronDown, ChevronUp, Upload, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface TaskStep {
  id?: string;
  title: string;
  description: string;
  dueDate?: Date;
  status: string;
  googleDocsLink: string;
  canvaLink: string;
  files: File[];
  links: { name: string; url: string }[];
  isExpanded?: boolean;
}

interface TaskStepFormProps {
  steps: TaskStep[];
  onStepsChange: (steps: TaskStep[]) => void;
}

const TaskStepForm = ({ steps, onStepsChange }: TaskStepFormProps) => {
  const addStep = () => {
    const newStep: TaskStep = {
      title: "",
      description: "",
      status: "not_started",
      googleDocsLink: "",
      canvaLink: "",
      files: [],
      links: [],
      isExpanded: true,
    };
    onStepsChange([...steps, newStep]);
  };

  const updateStep = (index: number, field: keyof TaskStep, value: any) => {
    const updatedSteps = steps.map((step, i) =>
      i === index ? { ...step, [field]: value } : step
    );
    onStepsChange(updatedSteps);
  };

  const removeStep = (index: number) => {
    onStepsChange(steps.filter((_, i) => i !== index));
  };

  const toggleExpanded = (index: number) => {
    const updatedSteps = steps.map((step, i) =>
      i === index ? { ...step, isExpanded: !step.isExpanded } : step
    );
    onStepsChange(updatedSteps);
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    const updatedSteps = [...steps];
    [updatedSteps[index], updatedSteps[newIndex]] = [updatedSteps[newIndex], updatedSteps[index]];
    onStepsChange(updatedSteps);
  };

  const handleFileChange = (index: number, files: FileList | null) => {
    if (files) {
      updateStep(index, "files", Array.from(files));
    }
  };

  const removeFile = (stepIndex: number, fileIndex: number) => {
    const step = steps[stepIndex];
    const updatedFiles = step.files.filter((_, i) => i !== fileIndex);
    updateStep(stepIndex, "files", updatedFiles);
  };

  const addLink = (stepIndex: number, name: string, url: string) => {
    const step = steps[stepIndex];
    updateStep(stepIndex, "links", [...step.links, { name, url }]);
  };

  const removeLink = (stepIndex: number, linkIndex: number) => {
    const step = steps[stepIndex];
    const updatedLinks = step.links.filter((_, i) => i !== linkIndex);
    updateStep(stepIndex, "links", updatedLinks);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Etapas do Trabalho</Label>
        <Button type="button" onClick={addStep} variant="outline" size="sm">
          ➕ Adicionar Etapa
        </Button>
      </div>

      {steps.map((step, index) => (
        <Collapsible
          key={index}
          open={step.isExpanded}
          onOpenChange={() => toggleExpanded(index)}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent">
                    <CardTitle className="text-base flex items-center gap-2">
                      {step.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      Etapa {index + 1}: {step.title || "Nova etapa"}
                    </CardTitle>
                  </Button>
                </CollapsibleTrigger>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveStep(index, "up")}
                    disabled={index === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveStep(index, "down")}
                    disabled={index === steps.length - 1}
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`step-title-${index}`}>Título da Etapa *</Label>
                  <Input
                    id={`step-title-${index}`}
                    value={step.title}
                    onChange={(e) => updateStep(index, "title", e.target.value)}
                    placeholder="Ex: Introdução, Revisão bibliográfica..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`step-description-${index}`}>Descrição</Label>
                  <Textarea
                    id={`step-description-${index}`}
                    value={step.description}
                    onChange={(e) => updateStep(index, "description", e.target.value)}
                    placeholder="Descreva os detalhes desta etapa..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data de Entrega Parcial</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !step.dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {step.dueDate ? format(step.dueDate, "PPP", { locale: ptBR }) : "Selecione uma data (opcional)"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={step.dueDate}
                        onSelect={(date) => updateStep(index, "dueDate", date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`step-status-${index}`}>Status</Label>
                  <Select value={step.status} onValueChange={(value) => updateStep(index, "status", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Não Iniciada</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`step-docs-${index}`}>Link do Trabalho Escrito</Label>
                  <Input
                    id={`step-docs-${index}`}
                    type="url"
                    value={step.googleDocsLink}
                    onChange={(e) => updateStep(index, "googleDocsLink", e.target.value)}
                    placeholder="https://docs.google.com/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`step-canva-${index}`}>Link da Apresentação</Label>
                  <Input
                    id={`step-canva-${index}`}
                    type="url"
                    value={step.canvaLink}
                    onChange={(e) => updateStep(index, "canvaLink", e.target.value)}
                    placeholder="https://www.canva.com/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`step-files-${index}`}>Anexar Arquivos</Label>
                  <Input
                    id={`step-files-${index}`}
                    type="file"
                    multiple
                    onChange={(e) => handleFileChange(index, e.target.files)}
                    className="cursor-pointer"
                  />
                  {step.files.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {step.files.map((file, fileIndex) => (
                        <div
                          key={fileIndex}
                          className="flex items-center justify-between p-2 bg-secondary rounded-lg"
                        >
                          <span className="text-sm truncate">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index, fileIndex)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <StepLinkManager
                  stepIndex={index}
                  links={step.links}
                  onAddLink={addLink}
                  onRemoveLink={removeLink}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
};

interface StepLinkManagerProps {
  stepIndex: number;
  links: { name: string; url: string }[];
  onAddLink: (stepIndex: number, name: string, url: string) => void;
  onRemoveLink: (stepIndex: number, linkIndex: number) => void;
}

const StepLinkManager = ({ stepIndex, links, onAddLink, onRemoveLink }: StepLinkManagerProps) => {
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  const handleAddLink = () => {
    if (newLinkName && newLinkUrl) {
      onAddLink(stepIndex, newLinkName, newLinkUrl);
      setNewLinkName("");
      setNewLinkUrl("");
    }
  };

  return (
    <div className="space-y-2">
      <Label>Anexar Links</Label>
      <div className="space-y-2">
        <Input
          placeholder="Nome do link"
          value={newLinkName}
          onChange={(e) => setNewLinkName(e.target.value)}
        />
        <div className="flex gap-2">
          <Input
            placeholder="URL do link"
            type="url"
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
          />
          <Button
            type="button"
            onClick={handleAddLink}
            disabled={!newLinkName || !newLinkUrl}
          >
            Adicionar
          </Button>
        </div>
      </div>
      {links.length > 0 && (
        <div className="mt-2 space-y-2">
          {links.map((link, linkIndex) => (
            <div
              key={linkIndex}
              className="flex items-center justify-between p-2 bg-secondary rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{link.name}</p>
                <p className="text-xs text-muted-foreground truncate">{link.url}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveLink(stepIndex, linkIndex)}
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

export default TaskStepForm;
