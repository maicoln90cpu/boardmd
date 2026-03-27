import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { error } from './response.ts';

/**
 * Authenticate the request using getClaims() and return userId.
 * Returns { userId, supabase } or throws a Response.
 */
export async function getAuthenticatedUser(req: Request): Promise<{ userId: string; supabase: ReturnType<typeof createClient> }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw error('Não autorizado', 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace('Bearer ', '');
  const { data, error: claimsError } = await supabase.auth.getClaims(token);

  if (claimsError || !data?.claims) {
    throw error('Usuário não autenticado', 401);
  }

  const userId = data.claims.sub as string;
  return { userId, supabase };
}

/**
 * Create a Supabase admin client with service role key.
 */
export function createAdminClient(): ReturnType<typeof createClient> {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

/**
 * Try to get authenticated user without throwing — returns null if not authenticated.
 * Useful for functions that work with or without auth (e.g. custom prompts).
 */
export async function tryGetAuthenticatedUser(req: Request): Promise<{ userId: string; supabase: ReturnType<typeof createClient> } | null> {
  try {
    return await getAuthenticatedUser(req);
  } catch {
    return null;
  }
}
