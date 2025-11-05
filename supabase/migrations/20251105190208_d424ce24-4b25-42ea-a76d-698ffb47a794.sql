-- Criar perfis para usuários existentes que não têm perfil
INSERT INTO public.profiles (id, name, phone, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
  au.raw_user_meta_data->>'phone' as phone,
  au.created_at,
  now() as updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;