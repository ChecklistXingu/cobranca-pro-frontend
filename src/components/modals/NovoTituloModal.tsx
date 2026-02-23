"use client";

import { useCallback, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Cliente, Template } from "@/types";

interface NovoTituloModalProps {
  open: boolean;
  onClose: () => void;
}

const todayInput = () => new Date().toISOString().split("T")[0];
const vazio = {
  clienteId: "",
  novoCliente: false,
  nomeCliente: "",
  telefoneCliente: "",
  numeroNF: "",
  numeroTitulo: "",
  valorPrincipal: "",
  juros: "0",
  vencimento: todayInput(),
  dataCobranca: todayInput(),
  disparar: true,
};

export default function NovoTituloModal({ open, onClose }: NovoTituloModalProps) {
  const { clientes, setClientes, setTitulos, setDisparos, addToast, templates } = useStore();
  const [form, setForm] = useState(vazio);
  const [salvando, setSalvando] = useState(false);

  const templatePadrao = useMemo(() => templates.find((t: Template) => t.nome === "Vencido")?.nome ?? templates[0]?.nome ?? "Vencido", [templates]);

  const reset = () => {
    setForm(vazio);
    setSalvando(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const atualizarListas = useCallback(async () => {
    const [clientesRes, titulosRes, disparosRes] = await Promise.all([
      fetch("/api/clientes"),
      fetch("/api/titulos"),
      fetch("/api/disparos"),
    ]);

    if (clientesRes.ok) {
      const data = await clientesRes.json();
      setClientes(() => data);
    }
    if (titulosRes.ok) {
      const data = await titulosRes.json();
      setTitulos(() => data);
    }
    if (disparosRes.ok) {
      const data = await disparosRes.json();
      setDisparos(() => data);
    }
  }, [setClientes, setTitulos, setDisparos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvando) return;

    try {
      setSalvando(true);
      let clienteId = form.clienteId;

      if (form.novoCliente) {
        if (!form.nomeCliente.trim()) {
          addToast("Informe o nome do cliente", "error");
          setSalvando(false);
          return;
        }
        const resCliente = await fetch("/api/clientes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: form.nomeCliente.trim(), telefone: form.telefoneCliente.trim() || undefined }),
        });
        if (!resCliente.ok) {
          const err = await resCliente.json().catch(() => ({}));
          throw new Error(err?.error ?? "Erro ao criar cliente");
        }
        const novoCliente: Cliente = await resCliente.json();
        clienteId = String((novoCliente as any)._id ?? novoCliente.id);
        setClientes(prev => [novoCliente, ...prev.filter(c => c.id !== clienteId)]);
      }

      if (!clienteId) {
        addToast("Selecione um cliente", "error");
        setSalvando(false);
        return;
      }

      const valorPrincipal = Number(form.valorPrincipal) || 0;
      const juros = Number(form.juros) || 0;
      const total = valorPrincipal + juros;
      if (!valorPrincipal || !form.numeroNF.trim()) {
        addToast("Preencha NF e valor", "error");
        setSalvando(false);
        return;
      }

      const payload = {
        clienteId,
        numeroNF: form.numeroNF.trim(),
        numeroTitulo: form.numeroTitulo.trim() || undefined,
        valorPrincipal,
        juros,
        total,
        diasAtraso: (() => {
          if (!form.vencimento) return 0;
          const hoje = new Date();
          const venc = new Date(form.vencimento);
          const diff = Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
          return diff > 0 ? diff : 0;
        })(),
        vencimento: form.vencimento ? new Date(form.vencimento).toISOString() : undefined,
        dataCobranca: form.dataCobranca ? new Date(form.dataCobranca).toISOString() : undefined,
        status: "ABERTO",
      };

      const resTitulo = await fetch("/api/titulos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resTitulo.ok) {
        const err = await resTitulo.json().catch(() => ({}));
        throw new Error(err?.error ?? "Erro ao criar título");
      }

      const tituloCriado = await resTitulo.json();
      const tituloId = String(tituloCriado._id ?? tituloCriado.id ?? "");

      if (form.disparar && tituloId) {
        const resDisparo = await fetch("/api/disparos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tituloId, template: templatePadrao }),
        });
        const dataDisparo = await resDisparo.json().catch(() => ({}));
        if (!resDisparo.ok || dataDisparo?.ok === false) {
          addToast(dataDisparo?.error || "Falha ao disparar via Z-API", "error");
        } else {
          addToast("Mensagem enviada via Z-API!", "success");
        }
      }

      await atualizarListas();
      addToast("Título criado com sucesso!");
      close();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao salvar título";
      addToast(message, "error");
    } finally {
      setSalvando(false);
    }
  };

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }} onClick={close} />
      <div style={{ position: "relative", background: "#fff", borderRadius: 18, boxShadow: "0 20px 60px rgba(15,23,42,0.3)", width: 520, maxWidth: "95vw", maxHeight: "95vh", overflowY: "auto", padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A" }}>Novo título manual</div>
            <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>Crie o título, dispare a mensagem e acompanhe no dashboard.</p>
          </div>
          <button onClick={close} style={{ border: "none", background: "#F1F5F9", borderRadius: 999, width: 34, height: 34, cursor: "pointer" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Cliente</label>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setForm(p => ({ ...p, novoCliente: false }))} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #CBD5F5", background: !form.novoCliente ? "#1E3A8A" : "transparent", color: !form.novoCliente ? "#fff" : "#1E3A8A", fontWeight: 600, cursor: "pointer" }}>
                Selecionar existente
              </button>
              <button type="button" onClick={() => setForm(p => ({ ...p, novoCliente: true }))} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #CBD5F5", background: form.novoCliente ? "#1E3A8A" : "transparent", color: form.novoCliente ? "#fff" : "#1E3A8A", fontWeight: 600, cursor: "pointer" }}>
                Cadastrar novo
              </button>
            </div>
            {!form.novoCliente ? (
              <select value={form.clienteId} onChange={e => setForm(p => ({ ...p, clienteId: e.target.value }))} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", fontSize: 14 }}>
                <option value="">Selecione um cliente...</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                ))}
              </select>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input placeholder="Nome do cliente" value={form.nomeCliente} onChange={e => setForm(p => ({ ...p, nomeCliente: e.target.value }))} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", fontSize: 14 }} />
                <input placeholder="Telefone (com DDD)" value={form.telefoneCliente} onChange={e => setForm(p => ({ ...p, telefoneCliente: e.target.value }))} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", fontSize: 14 }} />
              </div>
            )}
          </div>

          <div style={{ background: "#F8FAFC", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>Dados do título</div>
            <input placeholder="NF / Identificador" value={form.numeroNF} onChange={e => setForm(p => ({ ...p, numeroNF: e.target.value }))} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", fontSize: 14 }} />
            <input placeholder="Número do título (opcional)" value={form.numeroTitulo} onChange={e => setForm(p => ({ ...p, numeroTitulo: e.target.value }))} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", fontSize: 14 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 10 }}>
              <input type="number" step="0.01" min="0" placeholder="Valor principal" value={form.valorPrincipal} onChange={e => setForm(p => ({ ...p, valorPrincipal: e.target.value }))} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", fontSize: 14 }} />
              <input type="number" step="0.01" min="0" placeholder="Juros" value={form.juros} onChange={e => setForm(p => ({ ...p, juros: e.target.value }))} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", fontSize: 14 }} />
              <input type="date" value={form.vencimento} onChange={e => setForm(p => ({ ...p, vencimento: e.target.value }))} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", fontSize: 14 }} />
              <input type="date" value={form.dataCobranca} onChange={e => setForm(p => ({ ...p, dataCobranca: e.target.value }))} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", fontSize: 14 }} />
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155" }}>
            <input type="checkbox" checked={form.disparar} onChange={e => setForm(p => ({ ...p, disparar: e.target.checked }))} />
            Disparar mensagem padrão via Z-API após criar
          </label>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={close} style={{ border: "none", background: "#F1F5F9", color: "#475569", borderRadius: 10, padding: "10px 18px", fontWeight: 600, cursor: "pointer" }}>
              Cancelar
            </button>
            <button type="submit" disabled={salvando} style={{ border: "none", background: salvando ? "#93C5FD" : "#2563EB", color: "#fff", borderRadius: 10, padding: "10px 24px", fontWeight: 700, cursor: salvando ? "not-allowed" : "pointer" }}>
              {salvando ? "Salvando..." : form.disparar ? "Salvar e disparar" : "Salvar título"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
