/**
 * Gera um ID simples baseado em timestamp + random
 */
export function simpleId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Formata valor para moeda brasileira
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Formata data para formato brasileiro
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
}

/**
 * Calcula dias de atraso
 */
export function calcularDiasAtraso(vencimento: string | Date): number {
  const vencDate = typeof vencimento === "string" ? new Date(vencimento) : vencimento;
  const hoje = new Date();
  const diff = hoje.getTime() - vencDate.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Normaliza telefone para E.164 sem +
 */
export function normalizarTelefone(telefone: string): string {
  const cleaned = telefone.replace(/\D/g, "");
  if (cleaned.startsWith("55")) {
    return cleaned;
  }
  if (cleaned.length === 11) {
    return `55${cleaned}`;
  }
  return cleaned;
}

/**
 * Valida se é um telefone válido
 */
export function isValidTelefone(telefone: string): boolean {
  const normalized = normalizarTelefone(telefone);
  return normalized.length >= 10 && normalized.length <= 15;
}
