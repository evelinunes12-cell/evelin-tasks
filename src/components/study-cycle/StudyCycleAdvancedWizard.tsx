import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronRight, ChevronLeft, Sparkles, Check, ChevronsUpDown, GripVertical, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Progress } from "@/components/ui/progress";
import { Subject, createSubject } from "@/services/subjects";
import { NewBlock } from "@/services/studyCycles";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type MasteryLevel = "beginner" | "intermediate" | "advanced";

interface SubjectConfig {
  id: string;
  subject_id: string;
  weight: number;
  mastery: MasteryLevel;
}

interface GeneratedBlock {
  subject_id: string;
  subject_name: string;
  subject_color: string | null;
  allocated_minutes: number;
  block_count: number;
}

interface EditableBlock {
  id: string;
  subject_id: string;
  subject_name: string;
  subject_color: string | null;
  allocated_minutes: number;
}

interface StudyCycleAdvancedWizardProps {
  subjects: Subject[];
  onSave: (name: string, blocks: NewBlock[]) => Promise<void>;
  onCancel: () => void;
  userId?: string;
  onSubjectsChanged?: () => void;
}

const generateId = () => Math.random().toString(36).slice(2, 9);

const MASTERY_LABELS: Record<MasteryLevel, string> = {
  beginner: "Iniciante",
  intermediate: "Intermédio",
  advanced: "Avançado",
};

const MASTERY_BLOCK_MINUTES: Record<MasteryLevel, number> = {
  beginner: 90,
  intermediate: 60,
  advanced: 45,
};

// --- Subject Combobox (reused) ---
const SubjectCombobox = ({ subjects, value, usedIds, onChange, userId, onCreated }: {
  subjects: Subject[]; value: string; usedIds: string[];
  onChange: (id: string) => void; userId?: string; onCreated?: (s: Subject) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const selected = subjects.find((s) => s.id === value);
  const filtered = subjects.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  const exactMatch = subjects.some((s) => s.name.toLowerCase() === search.trim().toLowerCase());
  const canCreate = search.trim().length > 0 && !exactMatch && userId;

  const handleCreate = async () => {
    if (!userId || !search.trim()) return;
    setCreating(true);
    try {
      const ns = await createSubject(search.trim(), userId);
      onCreated?.(ns);
      onChange(ns.id);
      setSearch(""); setOpen(false);
      toast.success(`Disciplina "${ns.name}" criada!`);
    } catch { toast.error("Erro ao criar disciplina."); } finally { setCreating(false); }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              {selected.color && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />}
              {selected.name}
            </span>
          ) : <span className="text-muted-foreground">Selecione a matéria</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Pesquisar ou criar..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>
              <div className="p-2 text-sm">
                {canCreate ? (
                  <button type="button" disabled={creating} onClick={handleCreate} className="w-full text-left hover:bg-accent rounded p-2 flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />{creating ? "Criando..." : `Criar "${search.trim()}"`}
                  </button>
                ) : "Nenhuma disciplina encontrada"}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((s) => {
                const used = usedIds.includes(s.id) && s.id !== value;
                return (
                  <CommandItem key={s.id} value={s.name} disabled={used} onSelect={() => { onChange(s.id); setSearch(""); setOpen(false); }} className={used ? "opacity-50" : ""}>
                    <Check className={cn("mr-2 h-4 w-4", value === s.id ? "opacity-100" : "opacity-0")} />
                    <span className="flex items-center gap-2">
                      {s.color && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />}
                      {s.name}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {canCreate && filtered.length > 0 && (
              <CommandGroup>
                <CommandItem onSelect={handleCreate} disabled={creating}>
                  <Plus className="mr-2 h-4 w-4 text-primary" />{creating ? "Criando..." : `Criar "${search.trim()}"`}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// --- Engine ---
function generateCycleBlocks(
  totalHours: number,
  configs: SubjectConfig[],
  subjects: Subject[]
): GeneratedBlock[] {
  const totalMinutes = totalHours * 60;
  const totalWeight = configs.reduce((s, c) => s + c.weight, 0);
  if (totalWeight === 0) return [];

  const results: GeneratedBlock[] = [];

  for (const config of configs) {
    const proportion = config.weight / totalWeight;
    const subjectMinutes = Math.round(totalMinutes * proportion);
    const blockSize = MASTERY_BLOCK_MINUTES[config.mastery];
    const blockCount = Math.max(1, Math.round(subjectMinutes / blockSize));
    const adjustedBlockMinutes = Math.round(subjectMinutes / blockCount);
    const subject = subjects.find((s) => s.id === config.subject_id);

    results.push({
      subject_id: config.subject_id,
      subject_name: subject?.name || "Disciplina",
      subject_color: subject?.color || null,
      allocated_minutes: adjustedBlockMinutes,
      block_count: blockCount,
    });
  }

  return results;
}

// --- Wizard ---
const StudyCycleAdvancedWizard = ({ subjects: initialSubjects, onSave, onCancel, userId, onSubjectsChanged }: StudyCycleAdvancedWizardProps) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [totalHours, setTotalHours] = useState(10);
  const [configs, setConfigs] = useState<SubjectConfig[]>([{ id: generateId(), subject_id: "", weight: 3, mastery: "intermediate" }]);
  const [generatedBlocks, setGeneratedBlocks] = useState<GeneratedBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [localSubjects, setLocalSubjects] = useState<Subject[]>(initialSubjects);

  useEffect(() => { setLocalSubjects(initialSubjects); }, [initialSubjects]);

  const handleSubjectCreated = (ns: Subject) => {
    setLocalSubjects((prev) => [...prev, ns].sort((a, b) => a.name.localeCompare(b.name)));
    onSubjectsChanged?.();
  };

  const addConfig = () => setConfigs((prev) => [...prev, { id: generateId(), subject_id: "", weight: 3, mastery: "intermediate" }]);
  const removeConfig = (id: string) => setConfigs((prev) => prev.filter((c) => c.id !== id));
  const updateConfig = (id: string, field: keyof SubjectConfig, value: string | number) => setConfigs((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));

  const usedIds = configs.map((c) => c.subject_id).filter(Boolean);
  const validConfigs = configs.filter((c) => c.subject_id);

  const handleGenerate = () => {
    if (validConfigs.length === 0) { toast.error("Adicione pelo menos uma disciplina."); return; }
    if (totalHours < 1) { toast.error("Defina pelo menos 1 hora de carga horária."); return; }
    const blocks = generateCycleBlocks(totalHours, validConfigs, localSubjects);
    setGeneratedBlocks(blocks);
    setStep(3);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Dê um nome ao seu ciclo."); return; }
    setSaving(true);
    try {
      const finalBlocks: NewBlock[] = [];
      for (const gb of generatedBlocks) {
        for (let i = 0; i < gb.block_count; i++) {
          finalBlocks.push({ subject_id: gb.subject_id, allocated_minutes: gb.allocated_minutes });
        }
      }
      await onSave(name.trim(), finalBlocks);
    } catch {
      toast.error("Erro ao salvar o ciclo.");
    } finally {
      setSaving(false);
    }
  };

  const totalGeneratedMinutes = generatedBlocks.reduce((s, b) => s + b.allocated_minutes * b.block_count, 0);
  const genHours = Math.floor(totalGeneratedMinutes / 60);
  const genMins = totalGeneratedMinutes % 60;

  const stepVariants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Passo {step} de 3</span>
          <span>{step === 1 ? "Carga Horária" : step === 2 ? "Disciplinas" : "Revisão"}</span>
        </div>
        <Progress value={(step / 3) * 100} className="h-1.5" />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="adv-name">Nome do Ciclo</Label>
              <Input id="adv-name" placeholder="Ex: Ciclo Intensivo, Plano Mensal..." value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total-hours">Carga Horária Total (horas)</Label>
              <p className="text-xs text-muted-foreground">Quantas horas no total queres dedicar a este ciclo?</p>
              <Input id="total-hours" type="number" min={1} max={200} value={totalHours} onChange={(e) => setTotalHours(Math.max(1, parseInt(e.target.value) || 1))} className="w-32" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onCancel}>Cancelar</Button>
              <Button onClick={() => { if (!name.trim()) { toast.error("Dê um nome ao ciclo."); return; } setStep(2); }}>
                Próximo <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }} className="space-y-4">
            <div>
              <Label>Configuração das Disciplinas</Label>
              <p className="text-xs text-muted-foreground mt-1">Adicione disciplinas, defina o peso (1-5) e o nível de domínio.</p>
            </div>

            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
              {configs.map((config, i) => (
                <div key={config.id} className="rounded-lg border bg-card p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium w-5 shrink-0">{i + 1}.</span>
                    <SubjectCombobox subjects={localSubjects} value={config.subject_id} usedIds={usedIds} onChange={(v) => updateConfig(config.id, "subject_id", v)} userId={userId} onCreated={handleSubjectCreated} />
                    <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeConfig(config.id)} disabled={configs.length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Peso (1-5)</Label>
                      <Select value={String(config.weight)} onValueChange={(v) => updateConfig(config.id, "weight", parseInt(v))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((w) => <SelectItem key={w} value={String(w)}>{w} — {w <= 2 ? "Baixo" : w === 3 ? "Médio" : "Alto"}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Nível de Domínio</Label>
                      <Select value={config.mastery} onValueChange={(v) => updateConfig(config.id, "mastery", v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(MASTERY_LABELS) as MasteryLevel[]).map((m) => <SelectItem key={m} value={m}>{MASTERY_LABELS[m]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={addConfig} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Adicionar Disciplina
            </Button>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
              </Button>
              <Button onClick={handleGenerate}>
                <Sparkles className="mr-1 h-4 w-4" /> Gerar Ciclo Automático
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }} className="space-y-4">
            <div>
              <Label>Revisão do Ciclo Gerado</Label>
              <p className="text-xs text-muted-foreground mt-1">O Zenit distribuiu as tuas {totalHours}h com base nos pesos e níveis de domínio.</p>
            </div>

            <div className="space-y-2">
              {generatedBlocks.map((gb) => (
                <div key={gb.subject_id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  {gb.subject_color && <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: gb.subject_color }} />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{gb.subject_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {gb.block_count} bloco{gb.block_count > 1 ? "s" : ""} de {gb.allocated_minutes} min
                    </p>
                  </div>
                  <span className="text-xs font-medium text-primary shrink-0">
                    {Math.round(gb.allocated_minutes * gb.block_count)} min
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-sm text-center">
              <span className="font-semibold text-primary">{generatedBlocks.length} disciplina(s)</span>
              {" · "}
              <span className="text-muted-foreground">
                Tempo total: {genHours > 0 ? `${genHours}h ` : ""}{genMins > 0 ? `${genMins}min` : genHours > 0 ? "" : "0min"}
              </span>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Ajustar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Guardar Ciclo"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudyCycleAdvancedWizard;
