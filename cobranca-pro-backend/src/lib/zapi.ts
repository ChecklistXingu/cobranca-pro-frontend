/**
 * Z-API — Integração WhatsApp
 * Docs: https://developer.z-api.io/
 */

const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE_ID!;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN!;
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN!; // Security Token (opcional mas recomendado)
const ZAPI_BASE = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}`;

export interface ZApiSendResult {
  success: boolean;
  zaapId?: string;
  messageId?: string;
  error?: string;
  raw?: unknown;
}

/**
 * Envia mensagem de texto via WhatsApp
 * @param telefone - Número com DDI: "5565999990001" (sem + e sem espaços)
 * @param mensagem - Texto da mensagem
 */
export async function enviarMensagem(
  telefone: string,
  mensagem: string
): Promise<ZApiSendResult> {
  // Normaliza telefone: remove +, espaços, parênteses e traços
  const phone = telefone.replace(/[\s\+\-\(\)]/g, "");

  try {
    const res = await fetch(`${ZAPI_BASE}/send-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Client-Token é o Security Token do painel Z-API (recomendado)
        ...(ZAPI_CLIENT_TOKEN ? { "client-token": ZAPI_CLIENT_TOKEN } : {}),
      },
      body: JSON.stringify({
        phone,
        message: mensagem,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data?.error || data?.message || `HTTP ${res.status}`,
        raw: data,
      };
    }

    return {
      success: true,
      zaapId: data?.zaapId,
      messageId: data?.messageId,
      raw: data,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Aplica variáveis ao template de mensagem
 */
export function aplicarTemplate(
  template: string,
  vars: {
    cliente: string;
    numeroNF: string;
    total: string;
    diasAtraso: number | string;
    vencimento?: string;
  }
): string {
  return template
    .replace(/\{cliente\}/g, vars.cliente)
    .replace(/\{numeroNF\}/g, vars.numeroNF)
    .replace(/\{total\}/g, vars.total)
    .replace(/\{diasAtraso\}/g, String(vars.diasAtraso))
    .replace(/\{vencimento\}/g, vars.vencimento ?? "—");
}
