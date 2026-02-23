const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

console.log("[API] NEXT_PUBLIC_API_URL:", process.env.NEXT_PUBLIC_API_URL);
console.log("[API] BASE_URL:", BASE_URL);

function ensureBaseUrl() {
  if (!BASE_URL) {
    console.error("[API] NEXT_PUBLIC_API_URL não configurada!");
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
  console.log(`[API] ${init?.method || 'GET'} ${url}`);
  
  try {
    const res = await fetch(url, init);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[API] Error ${res.status} on ${init?.method || 'GET'} ${url}:`, errorText);
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    
    console.log(`[API] Success ${res.status} on ${init?.method || 'GET'} ${url}`);
    return res;
  } catch (error) {
    console.error(`[API] Network error on ${init?.method || 'GET'} ${url}:`, error);
    throw error;
  }
}
