import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Filter, X, LayoutGrid, Columns } from "lucide-react";

interface Environment {
  id: string;
  environment_name: string;
}

interface DashboardFiltersProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  subjectFilter: string;
  setSubjectFilter: (v: string) => void;
  environmentFilter: string;
  setEnvironmentFilter: (v: string) => void;
  groupWorkFilter: boolean | null;
  setGroupWorkFilter: (v: boolean | null) => void;
  overdueFilter: boolean;
  setOverdueFilter: (v: boolean) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  viewMode: string;
  setViewMode: (v: "list" | "board") => void;
  activeFiltersCount: number;
  clearAllFilters: () => void;
  availableSubjects: string[];
  availableStatuses: string[];
  environments: Environment[];
  overdueCount: number;
}

export function DashboardFilters({
  searchQuery, setSearchQuery,
  statusFilter, setStatusFilter,
  subjectFilter, setSubjectFilter,
  environmentFilter, setEnvironmentFilter,
  groupWorkFilter, setGroupWorkFilter,
  overdueFilter, setOverdueFilter,
  sortBy, setSortBy,
  viewMode, setViewMode,
  activeFiltersCount, clearAllFilters,
  availableSubjects, availableStatuses,
  environments, overdueCount,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Pesquisar por disciplina ou descrição..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 bg-popover" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filtros Avançados</h4>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-auto p-1 text-xs">
                    <X className="w-3 h-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Disciplina</Label>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {availableSubjects.map(subject => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {availableStatuses.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Ambiente</Label>
                <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="personal">Pessoal</SelectItem>
                    {environments.map(env => (
                      <SelectItem key={env.id} value={env.id}>{env.environment_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Tipo de Trabalho</Label>
                <Select
                  value={groupWorkFilter === null ? "all" : groupWorkFilter ? "group" : "individual"}
                  onValueChange={(val) => setGroupWorkFilter(val === "all" ? null : val === "group")}
                >
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="group">Em Grupo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overdue"
                  checked={overdueFilter}
                  onCheckedChange={(checked) => setOverdueFilter(checked === true)}
                />
                <Label htmlFor="overdue" className="text-sm cursor-pointer flex items-center gap-2">
                  Apenas atrasadas
                  {overdueCount > 0 && (
                    <Badge variant="destructive" className="text-xs">{overdueCount}</Badge>
                  )}
                </Label>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex border rounded-md">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")} className="rounded-r-none">
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Visualização em grade</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={viewMode === "board" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("board")} className="rounded-l-none">
                  <Columns className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Visualização Kanban</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="due_date">Próximos do prazo</SelectItem>
            <SelectItem value="recent">Mais recentes</SelectItem>
            <SelectItem value="overdue_first">Atrasados primeiro</SelectItem>
            <SelectItem value="subject">Nome da Disciplina</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {statusFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusFilter}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setStatusFilter("all")} />
            </Badge>
          )}
          {subjectFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Disciplina: {subjectFilter}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setSubjectFilter("all")} />
            </Badge>
          )}
          {environmentFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Ambiente: {environmentFilter === "personal" ? "Pessoal" : environments.find(e => e.id === environmentFilter)?.environment_name}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setEnvironmentFilter("all")} />
            </Badge>
          )}
          {groupWorkFilter !== null && (
            <Badge variant="secondary" className="gap-1">
              {groupWorkFilter ? "Em Grupo" : "Individual"}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setGroupWorkFilter(null)} />
            </Badge>
          )}
          {overdueFilter && (
            <Badge variant="destructive" className="gap-1">
              Atrasadas
              <X className="w-3 h-3 cursor-pointer" onClick={() => setOverdueFilter(false)} />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
