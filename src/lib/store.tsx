"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Cliente, Titulo, Recebimento, Disparo, Template } from "@/types";
import { mockTemplates } from "@/lib/mock/data";
import { simpleId } from "@/lib/utils";

interface Toast { id: number; message: string; type: "success" | "error" | "info"; }

interface Store {
  // Data
  clientes: Cliente[];
  titulos: Titulo[];
  recebimentos: Recebimento[];
  disparos: Disparo[];
  templates: Template[];
  loading: boolean;

  // Setters locais (usados pós-importação CSV)
  setClientes: (fn: (prev: Cliente[]) => Cliente[]) => void;
  setTitulos: (fn: (prev: Titulo[]) => Titulo[]) => void;
  setRecebimentos: (fn: (prev: Recebimento[]) => Recebimento[]) => void;
  setDisparos: (fn: (prev: Disparo[]) => Disparo[]) => void;
  setTemplates: (fn: (prev: Template[]) => Template[]) => void;

  // API actions
  refetchTitulos: () => Promise<void>;
  refetchDisparos: () => Promise<void>;
  lancarRecebimento: (payload: {
    tituloId: string; valorRecebido: number; forma: string; data: string; observacao?: string; parcial?: boolean;
  }) => Promise<boolean>;
  dispararMensagem: (tituloId: string, template: string) => Promise<boolean>;
  importarCarteira: (clientes: Cliente[], titulos: Titulo[]) => Promise<boolean>;

  // Helpers
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"]) => void;
  getCliente: (id: string) => Cliente;
}

const StoreCtx = createContext<Store | null>(null);

// Normaliza _id do MongoDB → id
function normalize(obj: any): any {
  if (Array.isArray(obj)) return obj.map(normalize);
  if (obj && typeof obj === "object") {
    const out: any = { ...obj };
    if (out._id) { out.id = String(out._id); }
    // popular clienteId
    if (out.clienteId && typeof out.clienteId === "object") {
      out.cliente = normalize(out.clienteId);
      out.clienteId = String(out.clienteId._id ?? out.clienteId);
    }
    return out;
  }
  return obj;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientesState] = useState<Cliente[]>([]);
  const [titulos, setTitulosState] = useState<Titulo[]>([]);
  const [recebimentos, setRecebimentosState] = useState<Recebimento[]>([]);
  const [disparos, setDisparosState] = useState<Disparo[]>([]);
  const [templates, setTemplatesState] = useState<Template[]>(mockTemplates);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: Toast["type"] = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };

  // Fetch inicial
  useEffect(() => {
    Promise.all([
      fetch("/api/titulos").then(r => r.json()),
      fetch("/api/clientes").then(r => r.json()),
      fetch("/api/recebimentos").then(r => r.json()),
      fetch("/api/disparos").then(r => r.json()),
    ]).then(([tits, clis, recs, disps]) => {
      setTitulosState(normalize(tits));
      setClientesState(normalize(clis));
      setRecebimentosState(normalize(recs));
      setDisparosState(normalize(disps));
    }).catch(() => {
      addToast("Erro ao conectar com o servidor. Usando dados locais.", "error");
    }).finally(() => setLoading(false));
  }, []);

  const refetchTitulos = async () => {
    const data = await fetch("/api/titulos").then(r => r.json());
    setTitulosState(normalize(data));
  };

  const refetchDisparos = async () => {
    const data = await fetch("/api/disparos").then(r => r.json());
    setDisparosState(normalize(data));
  };

  const lancarRecebimento = async (payload: {
    tituloId: string; valorRecebido: number; forma: string; data: string; observacao?: string; parcial?: boolean;
  }): Promise<boolean> => {
    try {
      const res = await fetch("/api/recebimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        addToast(err.error || "Erro ao lançar recebimento", "error");
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
      const res = await fetch("/api/disparos", {
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
      const res = await fetch("/api/importar", {
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
      const clis = await fetch("/api/clientes").then(r => r.json());
      setClientesState(normalize(clis));
      addToast(`Importados: ${data.clientesSalvos} clientes, ${data.titulosSalvos} títulos (${data.duplicados} duplicados ignorados) ✅`);
      return true;
    } catch {
      addToast("Erro de conexão na importação", "error");
      return false;
    }
  };

  const getCliente = (id: string) =>
    clientes.find(c => c.id === id || (c as any)._id === id) ?? { id, nome: "—", telefone: "—" };

  return (
    <StoreCtx.Provider value={{
      clientes, setClientes: fn => setClientesState(fn),
      titulos, setTitulos: fn => setTitulosState(fn),
      recebimentos, setRecebimentos: fn => setRecebimentosState(fn),
      disparos, setDisparos: fn => setDisparosState(fn),
      templates, setTemplates: fn => setTemplatesState(fn),
      loading,
      refetchTitulos, refetchDisparos,
      lancarRecebimento, dispararMensagem, importarCarteira,
      toasts, addToast, getCliente,
    }}>
      {children}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: t.type === "success" ? "#10B981" : t.type === "error" ? "#EF4444" : "#1E293B", color: "#fff", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 500, boxShadow: "0 8px 20px rgba(0,0,0,0.15)", minWidth: 260 }}>
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
