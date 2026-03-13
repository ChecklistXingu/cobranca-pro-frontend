import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function brl(v: number): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtDate(s?: string | null): string {
  if (!s) return "—";
  // Extrai os componentes da data diretamente da string ISO (YYYY-MM-DD...)
  // para evitar deslocamento de fuso horário (ex: UTC-3 exibiria -1 dia).
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  return new Date(s).toLocaleDateString("pt-BR");
}

export function simpleId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}
