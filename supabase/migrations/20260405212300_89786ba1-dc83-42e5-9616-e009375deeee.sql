
INSERT INTO public.notifications (user_id, title, message, link)
SELECT p.id,
  '🔒 Atualização de Segurança',
  'Realizamos melhorias de segurança na plataforma. Por favor, revise e aceite os Termos de Uso nas Configurações para continuar usando o Zenit.',
  '/settings'
FROM public.profiles p
WHERE p.is_active = true;
