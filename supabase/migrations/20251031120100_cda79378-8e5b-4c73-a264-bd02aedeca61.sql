-- Add is_link column to task_attachments table
ALTER TABLE task_attachments ADD COLUMN is_link BOOLEAN DEFAULT FALSE;

-- Update existing records to be false
UPDATE task_attachments SET is_link = FALSE WHERE is_link IS NULL;