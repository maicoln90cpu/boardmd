import { corsHeaders } from './cors.ts';

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

/**
 * Return a success JSON response with standardized format.
 */
export function success(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify({ success: true, data, timestamp: new Date().toISOString() }),
    { status, headers: jsonHeaders }
  );
}

/**
 * Return a raw JSON response (for backwards-compatible endpoints that
 * return domain-specific shapes instead of the { success, data } envelope).
 */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

/**
 * Return an error JSON response with standardized format.
 */
export function error(message: string, status = 500, details?: unknown): Response {
  return new Response(
    JSON.stringify({ success: false, error: message, details: details ?? undefined, timestamp: new Date().toISOString() }),
    { status, headers: jsonHeaders }
  );
}

/**
 * Handle common AI gateway error codes (429, 402) with user-friendly messages.
 */
export function handleAIError(res: globalThis.Response): Response | null {
  if (res.status === 429) {
    return error('Rate limit excedido. Aguarde um momento e tente novamente.', 429);
  }
  if (res.status === 402) {
    return error('Créditos insuficientes. Adicione créditos em Settings → Workspace → Usage.', 402);
  }
  return null;
}
