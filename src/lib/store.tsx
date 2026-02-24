"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import type { Cliente, Titulo, Recebimento, Disparo, Template } from "@/types";
import { mockTemplates } from "@/lib/mock/data";
import { simpleId } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

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
  telaLimpaAtiva: boolean;
  marcarTelaLimpa: () => void;
  limparTelaLimpa: () => void;
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
const STORAGE_CLIENTES = "cobranca-pro:clientes";
const STORAGE_TITULOS = "cobranca-pro:titulos";
const STORAGE_TELA_LIMPA = "cobranca-pro:tela-limpa";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientesState] = useState<Cliente[]>([]);
  const [titulos, setTitulosState] = useState<Titulo[]>([]);
  const [recebimentos, setRecebimentosState] = useState<Recebimento[]>([]);
  const [disparos, setDisparosState] = useState<Disparo[]>([]);
  const [templates, setTemplatesState] = useState<Template[]>(mockTemplates);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [telaLimpaAtiva, setTelaLimpaAtiva] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_TELA_LIMPA) === "true";
  });
  const [telaLimpaReady, setTelaLimpaReady] = useState<boolean>(() => typeof window === "undefined");

  const applySetter = useCallback(<T,>(
    setter: React.Dispatch<React.SetStateAction<T>>,
    next: T | ((prev: T) => T)
  ) => setter(prev => (typeof next === "function" ? (next as (prev: T) => T)(prev) : next)), []);

  const setClientes = useCallback((next: Cliente[] | ((prev: Cliente[]) => Cliente[])) => applySetter(setClientesState, next), [applySetter]);
  const setTitulos = useCallback((next: Titulo[] | ((prev: Titulo[]) => Titulo[])) => applySetter(setTitulosState, next), [applySetter]);
  const setRecebimentos = useCallback((next: Recebimento[] | ((prev: Recebimento[]) => Recebimento[])) => applySetter(setRecebimentosState, next), [applySetter]);
  const setDisparos = useCallback((next: Disparo[] | ((prev: Disparo[]) => Disparo[])) => applySetter(setDisparosState, next), [applySetter]);
  const setTemplates = useCallback((next: Template[] | ((prev: Template[]) => Template[])) => applySetter(setTemplatesState, next), [applySetter]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setTelaLimpaAtiva(window.localStorage.getItem(STORAGE_TELA_LIMPA) === "true");
    setTelaLimpaReady(true);
  }, []);

  const marcarTelaLimpa = useCallback(() => {
    setTelaLimpaAtiva(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_TELA_LIMPA, "true");
    }
  }, []);

  const limparTelaLimpa = useCallback(() => {
    setTelaLimpaAtiva(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_TELA_LIMPA);
    }
  }, []);

  const addToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  const titulosLembretes = useMemo(
    () => titulos.filter(t => t.tipoImportacao === "LEMBRETE"),
    [titulos]
  );

  const titulosCobranca = useMemo(
    () => titulos.filter(t => !t.tipoImportacao || t.tipoImportacao === "TITULO"),
    [titulos]
  );

  const getCliente = useCallback((id: string) => clientes.find(c => c.id === id) ?? { id, nome: "—", telefone: "—" }, [clientes]);

  useEffect(() => {
    if (!telaLimpaReady) return;
    let active = true;

    (async () => {
      try {
        const endpoints = [
          {
            name: "títulos",
            apply: (data: Titulo[]) => {
              if (!telaLimpaAtiva && active) setTitulosState(data);
            },
            request: apiFetch("/api/titulos"),
          },
          {
            name: "clientes",
            apply: (data: Cliente[]) => {
              if (!telaLimpaAtiva && active) setClientesState(data);
            },
            request: apiFetch("/api/clientes"),
          },
          { name: "recebimentos", apply: (data: Recebimento[]) => active && setRecebimentosState(data), request: apiFetch("/api/recebimentos") },
          { name: "disparos", apply: (data: Disparo[]) => active && setDisparosState(data), request: apiFetch("/api/disparos") },
        ];

        const responses = await Promise.allSettled(endpoints.map(e => e.request));
        const failures: string[] = [];

        for (let i = 0; i < responses.length; i++) {
          const result = responses[i];
          const { name, apply } = endpoints[i];
          if (result.status === "fulfilled") {
            try {
              const data = await result.value.json();
              apply(data);
            } catch (error) {
              console.error(`[Store] Falha ao processar ${name}:`, error);
              failures.push(name);
            }
          } else {
            console.error(`[Store] Falha ao buscar ${name}:`, result.reason);
            failures.push(name);
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
  }, [telaLimpaAtiva, telaLimpaReady]);

  const refetchTitulos = async () => {
    if (telaLimpaAtiva) return;
    const data = await apiFetch("/api/titulos");
    setTitulosState(await data.json());
  };

  const refetchDisparos = async () => {
    const data = await apiFetch("/api/disparos");
    setDisparosState(await data.json());
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
        body: JSON.stringify({ clientes: clientesPayload, titulos: titulosPayload }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Erro na importação", "error");
        return false;
      }
      await Promise.all([refetchTitulos()]);
      const clis = await apiFetch("/api/clientes");
      setClientesState(await clis.json());
      addToast(`Importados: ${data.clientesSalvos} clientes, ${data.titulosSalvos} títulos (${data.duplicados} duplicados ignorados) ✅`);
      return true;
    } catch {
      addToast("Erro de conexão na importação", "error");
      return false;
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedClientes = window.localStorage.getItem(STORAGE_CLIENTES);
      const savedTitulos = window.localStorage.getItem(STORAGE_TITULOS);
      if (savedClientes) setClientesState(JSON.parse(savedClientes));
      if (savedTitulos) setTitulosState(JSON.parse(savedTitulos));
    } catch (error) {
      console.warn("Falha ao carregar dados locais", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!clientes.length) {
      window.localStorage.removeItem(STORAGE_CLIENTES);
      return;
    }
    window.localStorage.setItem(STORAGE_CLIENTES, JSON.stringify(clientes));
  }, [clientes]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!titulos.length) {
      window.localStorage.removeItem(STORAGE_TITULOS);
      return;
    }
    window.localStorage.setItem(STORAGE_TITULOS, JSON.stringify(titulos));
  }, [titulos]);

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
      telaLimpaAtiva,
      marcarTelaLimpa,
      limparTelaLimpa,
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
