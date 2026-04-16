const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const API_SECRET_KEY = process.env.NEXT_PUBLIC_API_SECRET_KEY ?? "";

function ensureBaseUrl() {
  if (!BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_URL não configurada");
  }
}

export function apiUrl(path: string): string {
  ensureBaseUrl();

  if (path.startsWith("http")) {
    return path;
  }

  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiFetch(input: string, init?: RequestInit) {
  const url = apiUrl(input);

  // Injeta x-api-key em todas as requisições ao backend
  const headers = new Headers(init?.headers);
  if (API_SECRET_KEY) {
    headers.set("x-api-key", API_SECRET_KEY);
  }

  try {
    const res = await fetch(url, { ...init, headers });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }

    return res;
  } catch (error) {
    throw error;
  }
}
