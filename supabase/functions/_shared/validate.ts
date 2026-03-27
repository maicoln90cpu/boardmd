import { error } from './response.ts';

/**
 * Validate that required fields exist in the request body.
 * Throws an error Response if any are missing.
 */
export function requireFields(body: Record<string, unknown>, fields: string[]): void {
  const missing = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length > 0) {
    throw error(`Campos obrigatórios ausentes: ${missing.join(', ')}`, 400);
  }
}

/**
 * Validate that a value is a non-empty string with max length.
 */
export function validateString(value: unknown, fieldName: string, maxLength = 10000): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw error(`${fieldName} deve ser um texto não vazio`, 400);
  }
  if (value.length > maxLength) {
    throw error(`${fieldName} excede o tamanho máximo de ${maxLength} caracteres`, 400);
  }
  return value.trim();
}

/**
 * Validate that a value is a non-empty array.
 */
export function validateArray(value: unknown, fieldName: string): unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw error(`${fieldName} deve ser um array não vazio`, 400);
  }
  return value;
}

/**
 * Safely parse JSON body from request, throwing a friendly error on failure.
 */
export async function parseBody<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return await req.json() as T;
  } catch {
    throw error('Corpo da requisição inválido (JSON esperado)', 400);
  }
}
