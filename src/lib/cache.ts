const CACHE_PREFIX = "cobranca-pro:cache:";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutos

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readCache<T>(key: string, maxAgeMs: number = DEFAULT_TTL_MS): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > maxAgeMs) {
      window.localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return parsed.data;
  } catch (error) {
    console.warn(`[Cache] Falha ao ler chave ${key}`, error);
    return null;
  }
}

export function writeCache<T>(key: string, data: T) {
  if (!isBrowser()) return;
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    window.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (error) {
    console.warn(`[Cache] Falha ao gravar chave ${key}`, error);
  }
}

export function clearCache(key: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(CACHE_PREFIX + key);
  } catch (error) {
    console.warn(`[Cache] Falha ao remover chave ${key}`, error);
  }
}
