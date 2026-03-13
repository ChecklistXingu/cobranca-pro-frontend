"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import type { Cliente, Titulo, Recebimento, Disparo, Template } from "@/types";
import { mockTemplates } from "@/lib/mock/data";
import { apiFetch } from "@/lib/api";
import { readCache, writeCache, clearCache } from "@/lib/cache";

interface Toast { id: number; message: string; type: "success" | "error" | "info"; }

interface Store {
  clientes: Cliente[];
  setClientes: (next: Cliente[] | ((prev: Cliente[]) => Cliente[])) => void;
  titulos: Titulo[];
  setTitulos: (next: Titulo[] | ((prev: Titulo[]) => Titulo[])) => void;
  titulosLembretes: Titulo[];
  titulosCobranca: Titulo[];
  recebimentos: Recebimento[];
  setRecebimentos: (next: Recebimento[] | ((prev: Recebimento[]) => Recebimento[])) => void;
  disparos: Disparo[];
  setDisparos: (next: Disparo[] | ((prev: Disparo[]) => Disparo[])) => void;
  templates: Template[];
  setTemplates: (next: Template[] | ((prev: Template[]) => Template[])) => void;
  loading: boolean;
  lastImportIds: string[];
  setLastImportIds: (ids: string[]) => void;
  refetchTitulos: () => Promise<void>;
  refetchDisparos: () => Promise<void>;
  lancarRecebimento: (payload: {
    tituloId: string; valorRecebido: number; forma: string; data: string; observacao?: string; parcial?: boolean;
  }) => Promise<boolean>;
  dispararMensagem: (tituloId: string, template: string) => Promise<boolean>;
  importarCarteira: (clientes: Cliente[], titulos: Titulo[]) => Promise<boolean>;
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"]) => void;
  getCliente: (id: string) => Cliente;
}

const StoreCtx = createContext<Store | null>(null);

const CACHE_KEYS = {
  TITULOS: "titulos",
  CLIENTES: "clientes",
  RECEBIMENTOS: "recebimentos",
  DISPAROS: "disparos",
} as const;

const STORAGE_LAST_IMPORT_IDS = "cobranca-pro:last-import-ids";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientesState] = useState<Cliente[]>([]);
  const [titulos, setTitulosState] = useState<Titulo[]>([]);
  const [recebimentos, setRecebimentosState] = useState<Recebimento[]>([]);
  const [disparos, setDisparosState] = useState<Disparo[]>([]);
  const [templates, setTemplatesState] = useState<Template[]>(mockTemplates);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastImportIds, setLastImportIdsState] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(STORAGE_LAST_IMPORT_IDS);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const applySetter = useCallback(<T,>(
    setter: React.Dispatch<React.SetStateAction<T>>,
    next: T | ((prev: T) => T)
  ) => setter(prev => (typeof next === "function" ? (next as (prev: T) => T)(prev) : next)), []);

  const setClientes = useCallback((next: Cliente[] | ((prev: Cliente[]) => Cliente[])) => applySetter(setClientesState, next), [applySetter]);
  const setTitulos = useCallback((next: Titulo[] | ((prev: Titulo[]) => Titulo[])) => applySetter(setTitulosState, next), [applySetter]);
  const setRecebimentos = useCallback((next: Recebimento[] | ((prev: Recebimento[]) => Recebimento[])) => applySetter(setRecebimentosState, next), [applySetter]);
  const setDisparos = useCallback((next: Disparo[] | ((prev: Disparo[]) => Disparo[])) => applySetter(setDisparosState, next), [applySetter]);
  const setTemplates = useCallback((next: Template[] | ((prev: Template[]) => Template[])) => applySetter(setTemplatesState, next), [applySetter]);

  const setLastImportIds = useCallback((ids: string[]) => {
    setLastImportIdsState(ids);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_LAST_IMPORT_IDS, JSON.stringify(ids));
    }
  }, []);

  const addToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  const titulosLembretes = useMemo(
    () => {
      const base = lastImportIds.length > 0
        ? titulos.filter(t => lastImportIds.includes((t as any).id))
        : titulos;
      return base.filter(t => {
        const tAny = t as any;
        const tipo: string | null | undefined = tAny.tipoImportacao ?? tAny.tipo_importacao;
        if (tipo != null) return tipo === "LEMBRETE";
        const venc = tAny.vencimento;
        if (!venc) return false;
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        const vencDate = new Date(venc); vencDate.setHours(0, 0, 0, 0);
        return vencDate >= hoje;
      });
    },
    [titulos, lastImportIds]
  );

  const titulosCobranca = useMemo(
    () => {
      const base = lastImportIds.length > 0
        ? titulos.filter(t => lastImportIds.includes((t as any).id))
        : titulos;
      return base.filter(t => {
        const tAny = t as any;
        const tipo: string | null | undefined = tAny.tipoImportacao ?? tAny.tipo_importacao;
        if (tipo != null) return tipo === "TITULO";
        const venc = tAny.vencimento;
        if (!venc) return true;
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        const vencDate = new Date(venc); vencDate.setHours(0, 0, 0, 0);
        return vencDate < hoje;
      });
    },
    [titulos, lastImportIds]
  );

  const getCliente = useCallback((id: string) => clientes.find(c => c.id === id) ?? { id, nome: "—", telefone: "—" }, [clientes]);

  useEffect(() => {
    let active = true;

    const sources = [
      {
        name: "títulos",
        key: CACHE_KEYS.TITULOS,
        setter: (data: Titulo[]) => active && setTitulosState(data),
        request: () => apiFetch("/api/titulos"),
      },
      {
        name: "clientes",
        key: CACHE_KEYS.CLIENTES,
        setter: (data: Cliente[]) => active && setClientesState(data),
        request: () => apiFetch("/api/clientes"),
      },
      {
        name: "recebimentos",
        key: CACHE_KEYS.RECEBIMENTOS,
        setter: (data: Recebimento[]) => active && setRecebimentosState(data),
        request: () => apiFetch("/api/recebimentos"),
      },
      {
        name: "disparos",
        key: CACHE_KEYS.DISPAROS,
        setter: (data: Disparo[]) => active && setDisparosState(data),
        request: () => apiFetch("/api/disparos"),
      },
    ];

    // Carrega cache imediatamente
    sources.forEach(src => {
      const cachedData = readCache(src.key);
      if (cachedData) src.setter(cachedData as any);
    });

    (async () => {
      try {
        const responses = await Promise.allSettled(sources.map(src => src.request()));
        const failures: string[] = [];

        for (let i = 0; i < responses.length; i++) {
          const result = responses[i];
          const source = sources[i];

          if (result.status === "fulfilled") {
            try {
              const data = await result.value.json();
              source.setter(data);
              writeCache(source.key, data);
            } catch (error) {
              console.error(`[Store] Falha ao processar ${source.name}:`, error);
              failures.push(source.name);
            }
          } else {
            console.error(`[Store] Falha ao buscar ${source.name}:`, result.reason);
            failures.push(source.name);
          }
        }

        if (failures.length) {
          addToast(`Erro ao carregar ${failures.join(", ")}. Verifique o backend.`, "error");
        }
      } catch (error) {
        console.error("[Store] Erro inesperado ao carregar dados", error);
        addToast("Erro ao conectar com o servidor. Usando dados locais.", "error");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [addToast]);

  const refetchTitulos = async () => {
    const data = await apiFetch("/api/titulos");
    const json = await data.json();
    setTitulosState(json);
    writeCache(CACHE_KEYS.TITULOS, json);
  };

  const refetchDisparos = async () => {
    const data = await apiFetch("/api/disparos");
    const json = await data.json();
    setDisparosState(json);
    writeCache(CACHE_KEYS.DISPAROS, json);
  };

  const lancarRecebimento = async (payload: {
    tituloId: string; valorRecebido: number; forma: string; data: string; observacao?: string; parcial?: boolean;
  }): Promise<boolean> => {
    try {
      const res = await apiFetch("/api/recebimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Erro ao lançar recebimento", "error");
        return false;
      }
      await refetchTitulos();
      addToast("Recebimento lançado com sucesso! ✅");
      return true;
    } catch {
      addToast("Erro de conexão ao lançar recebimento", "error");
      return false;
    }
  };

  const dispararMensagem = async (tituloId: string, template: string): Promise<boolean> => {
    try {
      const res = await apiFetch("/api/disparos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tituloId, template }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        addToast(`Falha no disparo: ${data.error || "Erro desconhecido"}`, "error");
        await refetchDisparos();
        return false;
      }
      addToast("Mensagem enviada via WhatsApp! 📱");
      await refetchDisparos();
      return true;
    } catch {
      addToast("Erro de conexão ao disparar mensagem", "error");
      return false;
    }
  };

  const importarCarteira = async (clientesPayload: Cliente[], titulosPayload: Titulo[]): Promise<boolean> => {
    try {
      const res = await apiFetch("/api/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientes: clientesPayload,
          titulos: titulosPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Erro ao importar carteira", "error");
        return false;
      }

      clearCache(CACHE_KEYS.TITULOS);
      clearCache(CACHE_KEYS.CLIENTES);
      setTitulosState(data.titulos || []);
      setClientesState(data.clientes || []);
      writeCache(CACHE_KEYS.TITULOS, data.titulos || []);
      writeCache(CACHE_KEYS.CLIENTES, data.clientes || []);

      if (data.titulos_ids?.length) {
        setLastImportIds(data.titulos_ids);
      }

      addToast(`Importados: ${data.clientesSalvos} clientes, ${data.titulosSalvos} títulos (${data.duplicados} duplicados ignorados) ✅`);
      return true;
    } catch {
      addToast("Erro de conexão na importação", "error");
      return false;
    }
  };

  return (
    <StoreCtx.Provider value={{
      clientes, setClientes,
      titulos, setTitulos,
      titulosCobranca,
      titulosLembretes,
      recebimentos, setRecebimentos,
      disparos, setDisparos,
      templates, setTemplates,
      loading,
      lastImportIds,
      setLastImportIds,
      refetchTitulos,
      refetchDisparos,
      lancarRecebimento,
      dispararMensagem,
      importarCarteira,
      toasts, addToast, getCliente,
    }}>
      {children}
      {/* TOAST */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl min-w-[260px]"
            style={{ background: t.type === "success" ? "#10B981" : t.type === "error" ? "#EF4444" : "#1E293B" }}>
            {t.type === "success" && <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M5 13l4 4L19 7"/></svg>}
            {t.message}
          </div>
        ))}
      </div>
    </StoreCtx.Provider>
  );
}

export function useStore(): Store {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}
