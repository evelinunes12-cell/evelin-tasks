import { supabase } from "@/integrations/supabase/client";

export interface StudyCycle {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  blocks?: StudyCycleBlock[];
}

export interface StudyCycleBlock {
  id: string;
  cycle_id: string;
  subject_id: string;
  allocated_minutes: number;
  order_index: number;
  subject?: { name: string; color: string | null };
}

export interface NewBlock {
  subject_id: string;
  allocated_minutes: number;
}

export const fetchStudyCycles = async (): Promise<StudyCycle[]> => {
  const { data, error } = await supabase
    .from("study_cycles")
    .select("*, study_cycle_blocks(*, subjects(name, color))")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((cycle) => ({
    ...cycle,
    blocks: (cycle.study_cycle_blocks || [])
      .map((b: any) => ({
        id: b.id,
        cycle_id: b.cycle_id,
        subject_id: b.subject_id,
        allocated_minutes: b.allocated_minutes,
        order_index: b.order_index,
        subject: b.subjects,
      }))
      .sort((a: StudyCycleBlock, b: StudyCycleBlock) => a.order_index - b.order_index),
  }));
};

export const createStudyCycle = async (
  userId: string,
  name: string,
  blocks: NewBlock[]
): Promise<StudyCycle> => {
  const { data: cycle, error: cycleError } = await supabase
    .from("study_cycles")
    .insert({ user_id: userId, name })
    .select()
    .single();

  if (cycleError) throw cycleError;

  if (blocks.length > 0) {
    const blockRows = blocks.map((b, i) => ({
      cycle_id: cycle.id,
      subject_id: b.subject_id,
      allocated_minutes: b.allocated_minutes,
      order_index: i,
    }));

    const { error: blocksError } = await supabase
      .from("study_cycle_blocks")
      .insert(blockRows);

    if (blocksError) throw blocksError;
  }

  return cycle as StudyCycle;
};

export const updateStudyCycle = async (
  cycleId: string,
  updates: { name?: string; is_active?: boolean }
) => {
  const { error } = await supabase
    .from("study_cycles")
    .update(updates)
    .eq("id", cycleId);

  if (error) throw error;
};

export const deleteStudyCycle = async (cycleId: string) => {
  const { error } = await supabase
    .from("study_cycles")
    .delete()
    .eq("id", cycleId);

  if (error) throw error;
};

export const toggleCycleActive = async (cycleId: string, isActive: boolean) => {
  const { error } = await supabase
    .from("study_cycles")
    .update({ is_active: isActive })
    .eq("id", cycleId);

  if (error) throw error;
};
