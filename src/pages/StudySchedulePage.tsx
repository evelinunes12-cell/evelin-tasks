import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, CalendarDays, Clock } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScheduleBlockDialog } from "@/components/ScheduleBlockDialog";
import {
  fetchStudySchedules,
  createMultipleStudySchedules,
  updateStudySchedule,
  deleteStudySchedule,
  type StudySchedule,
} from "@/services/studySchedules";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DAYS = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Segunda", short: "Seg" },
  { value: 2, label: "Terça", short: "Ter" },
  { value: 3, label: "Quarta", short: "Qua" },
  { value: 4, label: "Quinta", short: "Qui" },
  { value: 5, label: "Sexta", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
];

const formatTime = (t: string) => t.slice(0, 5);

function StudyScheduleContent() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<StudySchedule | null>(null);
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().getDay();
    return today;
  });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["study-schedules", user?.id],
    queryFn: () => fetchStudySchedules(user!.id),
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; type: "fixed" | "variable"; days: number[]; start_time: string; end_time: string; color: string }) => {
      const records = data.days.map((day) => ({
        user_id: user!.id,
        day_of_week: day,
        start_time: data.start_time,
        end_time: data.end_time,
        title: data.title,
        type: data.type,
        color: data.color,
      }));
      return createMultipleStudySchedules(records);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-schedules"] });
      setDialogOpen(false);
      toast.success("Horário(s) criado(s) com sucesso!");
    },
    onError: () => toast.error("Erro ao criar horário."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; title: string; type: "fixed" | "variable"; day_of_week: number; start_time: string; end_time: string; color: string }) =>
      updateStudySchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-schedules"] });
      setDialogOpen(false);
      setEditingBlock(null);
      toast.success("Horário atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar horário."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStudySchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-schedules"] });
      toast.success("Horário removido.");
    },
    onError: () => toast.error("Erro ao remover horário."),
  });

  const byDay = (day: number) =>
    schedules
      .filter((s) => s.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const openEdit = (block: StudySchedule) => {
    setEditingBlock(block);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingBlock(null);
    setDialogOpen(true);
  };

  const renderBlock = (block: StudySchedule) => {
    const isFixed = block.type === "fixed";
    return (
      <div
        key={block.id}
        className={`group relative rounded-lg p-3 transition-all ${
          isFixed
            ? "border-2 border-transparent"
            : "border-2 border-dashed"
        }`}
        style={{
          backgroundColor: isFixed ? `${block.color || "#3B82F6"}20` : `${block.color || "#3B82F6"}08`,
          borderColor: block.color || "#3B82F6",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-foreground break-words leading-snug">{block.title}</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{formatTime(block.start_time)} - {formatTime(block.end_time)}</span>
            </div>
            <span
              className="inline-block mt-1.5 text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${block.color || "#3B82F6"}30`,
                color: block.color || "#3B82F6",
              }}
            >
              {isFixed ? "Fixo" : "Variável"}
            </span>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(block)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover horário?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O horário "{block.title}" será removido permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMutation.mutate(block.id)}>
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    );
  };

  const renderDayColumn = (day: typeof DAYS[0]) => {
    const blocks = byDay(day.value);
    return (
      <div key={day.value} className="flex flex-col">
        <div className="text-center font-semibold text-sm py-2 bg-muted rounded-t-lg border-b border-border">
          {day.label}
        </div>
        <div className="flex-1 space-y-2 p-2 bg-card rounded-b-lg border border-t-0 border-border min-h-[120px]">
          {blocks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum horário</p>
          ) : (
            blocks.map(renderBlock)
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Minha Grade Horária</h1>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Horário
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : isMobile ? (
          <div>
            <Tabs value={String(selectedDay)} onValueChange={(v) => setSelectedDay(Number(v))}>
              <TabsList className="w-full flex overflow-x-auto">
                {DAYS.map((day) => (
                  <TabsTrigger key={day.value} value={String(day.value)} className="flex-1 text-xs px-1">
                    {day.short}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="mt-4 space-y-2">
              {byDay(selectedDay).length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhum horário para {DAYS[selectedDay]?.label}.
                  </CardContent>
                </Card>
              ) : (
                byDay(selectedDay).map(renderBlock)
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {DAYS.map(renderDayColumn)}
          </div>
        )}
      </div>

      <ScheduleBlockDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditingBlock(null);
        }}
        editingBlock={editingBlock}
        onSave={(data) => createMutation.mutate(data)}
        onUpdate={(id, data) => updateMutation.mutate({ id, ...data })}
      />
    </div>
  );
}

export default function StudySchedulePage() {
  return (
    <ProtectedRoute>
      <StudyScheduleContent />
    </ProtectedRoute>
  );
}
