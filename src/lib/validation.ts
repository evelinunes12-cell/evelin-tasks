import { z } from 'zod';

/**
 * Validation schemas for user inputs across the application.
 * These provide both client-side and server-side protection.
 */

// Common field validations
const trimmedString = z.string().trim();
const nonEmptyString = (maxLength: number, fieldName: string) =>
  trimmedString
    .min(1, { message: `${fieldName} é obrigatório` })
    .max(maxLength, { message: `${fieldName} deve ter no máximo ${maxLength} caracteres` });

// Safe URL protocols to prevent XSS attacks via javascript: or data: URLs
const SAFE_URL_PROTOCOLS = ['http:', 'https:'];

const optionalUrl = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val || val === '') return true;
      try {
        const url = new URL(val);
        return SAFE_URL_PROTOCOLS.includes(url.protocol);
      } catch {
        return false;
      }
    },
    { message: 'URL deve começar com http:// ou https://' }
  )
  .optional()
  .or(z.literal(''));

const email = z.string().trim().email({ message: 'E-mail inválido' }).max(255, { message: 'E-mail muito longo' });

// Profile schema
export const profileSchema = z.object({
  full_name: nonEmptyString(100, 'Nome completo'),
});

// Task form schema
export const taskFormSchema = z.object({
  subject_name: nonEmptyString(255, 'Disciplina'),
  description: trimmedString.max(5000, { message: 'Descrição deve ter no máximo 5000 caracteres' }).optional(),
  google_docs_link: optionalUrl,
  canva_link: optionalUrl,
  group_members: trimmedString.max(1000, { message: 'Membros do grupo deve ter no máximo 1000 caracteres' }).optional(),
  status: nonEmptyString(100, 'Status'),
});

// Environment form schema
export const environmentFormSchema = z.object({
  environment_name: nonEmptyString(255, 'Nome do ambiente'),
  description: trimmedString.max(1000, { message: 'Descrição deve ter no máximo 1000 caracteres' }).optional(),
});

// Environment member schema
export const memberSchema = z.object({
  email: email,
  permissions: z.array(z.enum(['view', 'create', 'edit', 'delete'])).min(1, { message: 'Selecione ao menos uma permissão' }),
});

// Subject/Status schema (for environment subjects and statuses)
export const subjectStatusSchema = z.object({
  name: nonEmptyString(100, 'Nome'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: 'Cor inválida' }).optional(),
});

// Checklist item schema
export const checklistItemSchema = z.object({
  id: z.string(),
  text: nonEmptyString(500, 'Item'),
  completed: z.boolean(),
});

// Checklist array schema (validates full array before DB insertion)
export const checklistSchema = z.array(checklistItemSchema);

// Planner note schema
export const plannerNoteSchema = z.object({
  title: trimmedString.max(255, { message: 'Título deve ter no máximo 255 caracteres' }),
  content: trimmedString.max(10000, { message: 'Conteúdo deve ter no máximo 10000 caracteres' }),
});

// Link attachment schema
export const linkSchema = z.object({
  name: nonEmptyString(255, 'Nome do link'),
  url: z.string().trim().url({ message: 'URL inválida' }).refine(
    (val) => {
      try {
        const url = new URL(val);
        return SAFE_URL_PROTOCOLS.includes(url.protocol);
      } catch {
        return false;
      }
    },
    { message: 'Link deve ser HTTP ou HTTPS' }
  ),
});

// Task step schema
export const taskStepSchema = z.object({
  title: nonEmptyString(255, 'Título'),
  description: trimmedString.max(2000, { message: 'Descrição deve ter no máximo 2000 caracteres' }).optional(),
  status: nonEmptyString(100, 'Status'),
  google_docs_link: optionalUrl,
  canva_link: optionalUrl,
});

// Study schedule schema
export const studyScheduleSchema = z.object({
  title: nonEmptyString(255, 'Título'),
  type: z.enum(['fixed', 'variable'], { message: 'Tipo deve ser fixo ou variável' }),
  day_of_week: z.number().int().min(0).max(6, { message: 'Dia da semana inválido' }),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, { message: 'Horário de início inválido' }),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, { message: 'Horário de fim inválido' }),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: 'Cor inválida' }).optional().or(z.literal('')).or(z.null()),
}).refine((data) => data.start_time < data.end_time, {
  message: 'O horário de fim deve ser após o início',
  path: ['end_time'],
});

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
  .refine((val) => /[A-Z]/.test(val), { message: 'A senha deve conter letras maiúsculas' })
  .refine((val) => /[a-z]/.test(val), { message: 'A senha deve conter letras minúsculas' })
  .refine((val) => /\d/.test(val), { message: 'A senha deve conter números' })
  .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), { message: 'A senha deve conter caracteres especiais' });

// Type exports for use in components
export type ProfileFormData = z.infer<typeof profileSchema>;
export type TaskFormData = z.infer<typeof taskFormSchema>;
export type EnvironmentFormData = z.infer<typeof environmentFormSchema>;
export type MemberFormData = z.infer<typeof memberSchema>;
export type LinkFormData = z.infer<typeof linkSchema>;
export type TaskStepFormData = z.infer<typeof taskStepSchema>;
export type StudyScheduleFormData = z.infer<typeof studyScheduleSchema>;

// Validation helper function
export const validateInput = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.errors.map(e => e.message) };
};
