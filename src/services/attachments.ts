import { supabase } from "@/integrations/supabase/client";

export interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  is_link: boolean;
  task_id?: string;
  task_step_id?: string;
  created_at: string | null;
}

export interface LinkData {
  name: string;
  url: string;
}

// Task Attachments
export const fetchTaskAttachments = async (taskId: string) => {
  const { data, error } = await supabase
    .from("task_attachments")
    .select("*")
    .eq("task_id", taskId);
  
  if (error) throw error;
  return data as Attachment[];
};

export const uploadTaskFile = async (
  taskId: string,
  userId: string,
  file: File
) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${userId}/${taskId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("task-attachments")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { error: dbError } = await supabase
    .from("task_attachments")
    .insert({
      task_id: taskId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      is_link: false,
    });

  if (dbError) throw dbError;
};

export const saveTaskLink = async (
  taskId: string,
  link: LinkData
) => {
  const { error } = await supabase
    .from("task_attachments")
    .insert({
      task_id: taskId,
      file_name: link.name,
      file_path: link.url,
      file_size: null,
      file_type: null,
      is_link: true,
    });

  if (error) throw error;
};

export const deleteAttachment = async (
  attachment: Attachment,
  isStepAttachment = false
) => {
  const tableName = isStepAttachment ? "task_step_attachments" : "task_attachments";
  
  const { error: dbError } = await supabase
    .from(tableName)
    .delete()
    .eq("id", attachment.id);

  if (dbError) throw dbError;

  // Delete from storage if it's a file
  if (!attachment.is_link) {
    const { error: storageError } = await supabase.storage
      .from("task-attachments")
      .remove([attachment.file_path]);

    if (storageError) throw storageError;
  }
};

export const downloadAttachment = async (attachment: Attachment) => {
  if (attachment.is_link) {
    window.open(attachment.file_path, "_blank");
    return null;
  }

  const { data, error } = await supabase.storage
    .from("task-attachments")
    .download(attachment.file_path);

  if (error) throw error;
  return data;
};

// Task Step Attachments
export const fetchStepAttachments = async (stepId: string) => {
  const { data, error } = await supabase
    .from("task_step_attachments")
    .select("*")
    .eq("task_step_id", stepId);
  
  if (error) throw error;
  return data as Attachment[];
};

export const uploadStepFile = async (
  stepId: string,
  taskId: string,
  userId: string,
  file: File
) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${userId}/${taskId}/steps/${stepId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("task-attachments")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { error: dbError } = await supabase
    .from("task_step_attachments")
    .insert({
      task_step_id: stepId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      is_link: false,
    });

  if (dbError) throw dbError;
};

export const saveStepLink = async (
  stepId: string,
  link: LinkData
) => {
  const { error } = await supabase
    .from("task_step_attachments")
    .insert({
      task_step_id: stepId,
      file_name: link.name,
      file_path: link.url,
      file_size: null,
      file_type: null,
      is_link: true,
    });

  if (error) throw error;
};
