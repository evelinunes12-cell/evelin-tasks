-- Convert any stored public URLs into storage paths (everything after /chat-attachments/)
UPDATE public.environment_messages
SET attachment_url = substring(attachment_url FROM '/chat-attachments/(.*)$')
WHERE attachment_url LIKE '%/chat-attachments/%';

UPDATE public.study_group_messages
SET attachment_url = substring(attachment_url FROM '/chat-attachments/(.*)$')
WHERE attachment_url LIKE '%/chat-attachments/%';
