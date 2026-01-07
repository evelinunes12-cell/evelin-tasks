import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { checklistItemSchema } from "@/lib/validation";

export interface Task {
  id: string;
  subject_name: string;
  description: string | null;
  due_date: string;
  is_group_work: boolean;
  group_members: string | null;
  google_docs_link: string | null;
  canva_link: string | null;
  status: string;
  user_id: string;
  environment_id: string | null;
  created_at: string;
  updated_at: string;
  checklist: ChecklistItem[];
}

export interface ChecklistItem {
  text: string;
  completed: boolean;
}

export interface TaskStep {
  id?: string;
  title: string;
  description: string;
  dueDate?: Date;
  status: string;
  googleDocsLink?: string;
  canvaLink?: string;
  files: File[];
  links: { name: string; url: string }[];
  checklist: ChecklistItem[];
  isExpanded?: boolean;
}

export interface TaskFormData {
  subjectName: string;
  description: string;
  dueDate: Date | undefined;
  isGroupWork: boolean;
  groupMembers: string;
  googleDocsLink: string;
  canvaLink: string;
  status: string;
  checklist: ChecklistItem[];
  environmentId: string | null;
}

// Validation schema for checklist array
const checklistArraySchema = z.array(checklistItemSchema);

// Validate checklist data before database operations
const validateChecklist = (checklist: ChecklistItem[]): ChecklistItem[] => {
  const validation = checklistArraySchema.safeParse(checklist);
  if (!validation.success) {
    throw new Error('Formato de checklist inválido');
  }
  // Cast to ChecklistItem[] since we know validation succeeded
  return validation.data as ChecklistItem[];
};

// Date helpers
export const parseDueDate = (dateStr: string): Date => {
  const parts = dateStr.split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
};

export const formatDateForDB = (date: Date): string => {
  const adjusted = new Date(date);
  adjusted.setMinutes(adjusted.getMinutes() - adjusted.getTimezoneOffset());
  return adjusted.toISOString().split("T")[0];
};

// Task CRUD operations
export const fetchTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("due_date", { ascending: true });
  
  if (error) throw error;
  return (data || []).map(task => ({
    ...task,
    checklist: (task.checklist as unknown as ChecklistItem[]) || [],
  })) as Task[];
};

export const fetchTaskById = async (id: string): Promise<Task> => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();
  
  if (error) throw error;
  return {
    ...data,
    checklist: (data.checklist as unknown as ChecklistItem[]) || [],
  } as Task;
};

export const createTask = async (
  formData: TaskFormData,
  userId: string
) => {
  // Validate checklist data
  const validatedChecklist = validateChecklist(formData.checklist);

  const taskData = {
    subject_name: formData.subjectName,
    description: formData.description || null,
    due_date: formData.dueDate ? formatDateForDB(formData.dueDate) : null,
    is_group_work: formData.isGroupWork,
    group_members: formData.isGroupWork ? formData.groupMembers : null,
    google_docs_link: formData.googleDocsLink || null,
    canva_link: formData.canvaLink || null,
    status: formData.status,
    user_id: userId,
    checklist: validatedChecklist as unknown as any,
    environment_id: formData.environmentId,
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert(taskData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateTask = async (
  id: string,
  formData: TaskFormData
) => {
  // Validate checklist data
  const validatedChecklist = validateChecklist(formData.checklist);

  const taskData = {
    subject_name: formData.subjectName,
    description: formData.description || null,
    due_date: formData.dueDate ? formatDateForDB(formData.dueDate) : null,
    is_group_work: formData.isGroupWork,
    group_members: formData.isGroupWork ? formData.groupMembers : null,
    google_docs_link: formData.googleDocsLink || null,
    canva_link: formData.canvaLink || null,
    status: formData.status,
    checklist: validatedChecklist as unknown as any,
    environment_id: formData.environmentId,
  };

  const { error } = await supabase
    .from("tasks")
    .update(taskData)
    .eq("id", id);
  
  if (error) throw error;
};

export const deleteTask = async (id: string) => {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
};

export const updateTaskChecklist = async (
  taskId: string,
  checklist: ChecklistItem[]
) => {
  // Validate checklist data before update
  const validatedChecklist = validateChecklist(checklist);

  const { error } = await supabase
    .from("tasks")
    .update({ checklist: validatedChecklist as unknown as any })
    .eq("id", taskId);
  
  if (error) throw error;
};

// Task status helpers
export const isTaskOverdue = (task: Task): boolean => {
  if (!task.due_date) return false;
  const dueDate = parseDueDate(task.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isCompleted = task.status.toLowerCase().includes("conclu");
  return dueDate < today && !isCompleted;
};

export const isTaskDueToday = (task: Task): boolean => {
  if (!task.due_date) return false;
  const dueDate = parseDueDate(task.due_date);
  const today = new Date();
  return (
    dueDate.getDate() === today.getDate() &&
    dueDate.getMonth() === today.getMonth() &&
    dueDate.getFullYear() === today.getFullYear()
  );
};

export const isTaskDueTomorrow = (task: Task): boolean => {
  if (!task.due_date) return false;
  const dueDate = parseDueDate(task.due_date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    dueDate.getDate() === tomorrow.getDate() &&
    dueDate.getMonth() === tomorrow.getMonth() &&
    dueDate.getFullYear() === tomorrow.getFullYear()
  );
};
