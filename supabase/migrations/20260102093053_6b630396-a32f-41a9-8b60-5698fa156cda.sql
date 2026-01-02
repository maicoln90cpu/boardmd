-- Criar schema dedicado para extensões
CREATE SCHEMA IF NOT EXISTS extensions;

-- Mover extensões existentes do public para extensions
-- Nota: No Supabase, as extensões são gerenciadas pelo sistema
-- O que podemos fazer é garantir que novas extensões sejam criadas no schema correto
-- e revogar permissões desnecessárias no schema public

-- Revogar permissões de CREATE no schema public para roles não-admin
REVOKE CREATE ON SCHEMA public FROM anon;
REVOKE CREATE ON SCHEMA public FROM authenticated;

-- Garantir que apenas o owner pode criar objetos no schema public
-- (service_role mantém acesso total)

-- Adicionar comentário documentando a política de segurança
COMMENT ON SCHEMA extensions IS 'Schema dedicado para extensões PostgreSQL - isolado do schema public por segurança';
COMMENT ON SCHEMA public IS 'Schema público com permissões restritas - CREATE revogado de anon e authenticated';