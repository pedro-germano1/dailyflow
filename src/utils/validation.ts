/** Objeto "comum" (não é null, nem lista). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Texto sem espaços nas pontas. Qualquer coisa que NÃO seja texto vira '' (e cai na validação de "obrigatório"). */
export function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
