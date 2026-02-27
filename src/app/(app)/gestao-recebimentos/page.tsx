"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { brl, simpleId } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import type { Titulo } from "@/types";

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; color: string; dot: string }> = {
    ABERTO: { label: "Aberto", bg: "#DBEAFE", color: "#1D4ED8", dot: "#3B82F6" },
    VENCIDO: { label: "Vencido", bg: "#FEE2E2", color: "#B91C1C", dot: "#EF4444" },
    RECEBIDO: { label: "Recebido", bg: "#D1FAE5", color: "#065F46", dot: "#10B981" },
    NEGOCIADO: { label: "Negociado", bg: "#EDE9FE", color: "#5B21B6", dot: "#8B5CF6" },
    CANCELADO: { label: "Cancelado", bg: "#F3F4F6", color: "#374151", dot: "#9CA3AF" },
  };
  const c = cfg[status] ?? cfg.ABERTO;
  return (
    <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, display: "inline-block" }} />
      {c.label}
    </span>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", border: "1px solid #E2E8F0", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#334155", outline: "none", background: "#fff", boxSizing: "border-box" };

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 5, display: "block" }}>{label}</label>
      {children}
    </div>
  );
}

function BaixarModal({ open, titulo, onClose, onConfirm }: {
  open: boolean;
  titulo: Titulo | null;
  onClose: () => void;
  onConfirm: (data: { valorRecebido: string; data: string; forma: string; observacao: string; parcial: boolean }) => void;
}) {
  const [form, setForm] = useState({ valorRecebido: "", data: new Date().toISOString().split("T")[0], forma: "PIX", observacao: "", parcial: false });
  if (!open || !titulo) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.valorRecebido) return;
    onConfirm(form);
    setForm({ valorRecebido: "", data: new Date().toISOString().split("T")[0], forma: "PIX", observacao: "", parcial: false });
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "#fff", borderRadius: 16, boxShadow: "0 25px 50px rgba(0,0,0,0.18)", width: 480, maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto", padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#0F172A" }}>Lançar Recebimento</div>
          <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "#64748B" }}>✕</button>
        </div>
        <div style={{ marginBottom: 14, background: "#F8FAFC", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
          <div style={{ fontWeight: 600, color: "#0F172A" }}>{titulo.numeroNF}</div>
          <div style={{ color: "#64748B" }}>Total: <strong style={{ color: "#0F172A" }}>{brl(titulo.total)}</strong></div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <FormField label="Valor Recebido (R$)">
            <input type="number" step="0.01" placeholder={String(titulo.total)} value={form.valorRecebido} onChange={e => setForm(p => ({ ...p, valorRecebido: e.target.value }))} required style={inputStyle} />
          </FormField>
          <FormField label="Data do Recebimento">
            <input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} required style={inputStyle} />
          </FormField>
          <FormField label="Forma de Pagamento">
            <select value={form.forma} onChange={e => setForm(p => ({ ...p, forma: e.target.value }))} style={inputStyle}>
              {["PIX", "DINHEIRO", "BOLETO", "TRANSFERENCIA", "OUTRO"].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </FormField>
          <FormField label="Observação (opcional)">
            <input type="text" value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} style={inputStyle} placeholder="Ex: comprovante enviado" />
          </FormField>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
            <input type="checkbox" checked={form.parcial} onChange={e => setForm(p => ({ ...p, parcial: e.target.checked }))} />
            Recebimento parcial (manter como VENCIDO)
          </label>
          <button type="submit" style={{ background: "#1E40AF", color: "#fff", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Confirmar Recebimento
          </button>
        </form>
      </div>
    </div>
  );
}

export default function GestaoRecebimentosPage() {
  const { getCliente, recebimentos, setRecebimentos, addToast } = useStore();
  const [tab, setTab] = useState<"PENDENTES" | "RECEBIDOS">("PENDENTES");
  const [baixarTitulo, setBaixarTitulo] = useState<Titulo | null>(null);
  const [titulosAtlas, setTitulosAtlas] = useState<Titulo[]>([]);
  const [loading, setLoading] = useState(false);
  const now = new Date();
  const [dataFiltro, setDataFiltro] = useState(() => now.toISOString().split("T")[0]);

  useEffect(() => {
    buscarTitulosAtlas();
  }, [dataFiltro]);

  const buscarTitulosAtlas = async () => {
    setLoading(true);
    try {
      const [titulosRes, disparosRes] = await Promise.all([
        apiFetch(`/api/titulos`),
        apiFetch(`/api/disparos?inicio=${dataFiltro}&fim=${dataFiltro}`),
      ]);
      if (!titulosRes.ok) throw new Error("Erro ao buscar títulos");
      if (!disparosRes.ok) throw new Error("Erro ao buscar disparos");

      const data: Titulo[] = await titulosRes.json();
      const disparos: Array<{ tituloId?: string; status?: string }> = await disparosRes.json();
      const titulosComDisparoNaData = new Set(
        disparos
          .filter(d => d.status === "ENVIADO" && d.tituloId)
          .map(d => String(d.tituloId))
      );

      // Prioriza disparos do período selecionado; fallback para ultimoDisparo legado
      const comDisparo = data.filter(t =>
        titulosComDisparoNaData.size > 0
          ? titulosComDisparoNaData.has(String(t.id))
          : Boolean(t.ultimoDisparo)
      );
      setTitulosAtlas(comDisparo);
    } catch (error) {
      console.error("Erro ao buscar títulos:", error);
      addToast("Erro ao carregar títulos do banco de dados", "error");
      setTitulosAtlas([]);
    } finally {
      setLoading(false);
    }
  };

  const pendentes = titulosAtlas.filter(t => t.status !== "RECEBIDO" && t.status !== "CANCELADO");
  const recebidosList = titulosAtlas.filter(t => t.status === "RECEBIDO");
  const showing = tab === "PENDENTES" ? pendentes : recebidosList;

  const handleBaixar = async (data: { valorRecebido: string; data: string; forma: string; observacao: string; parcial: boolean }) => {
    if (!baixarTitulo) return;
    const novoStatus = (!data.parcial && parseFloat(data.valorRecebido) >= baixarTitulo.total) ? "RECEBIDO" as const : baixarTitulo.status;
    
    try {
      // Atualizar no MongoDB via API
      const res = await apiFetch(`/api/titulos/${baixarTitulo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      
      if (!res.ok) throw new Error("Erro ao atualizar título");
      
      // Atualizar localmente
      setTitulosAtlas(prev => prev.map(t => t.id === baixarTitulo.id ? { ...t, status: novoStatus } : t));
      setRecebimentos(prev => [...prev, {
        id: simpleId("r"),
        tituloId: baixarTitulo.id,
        data: data.data,
        valorRecebido: parseFloat(data.valorRecebido),
        forma: data.forma as "PIX",
        observacao: data.observacao,
      }]);
      addToast(novoStatus === "RECEBIDO" ? "Título baixado como RECEBIDO! ✅" : "Recebimento parcial lançado.");
      setBaixarTitulo(null);
    } catch (error) {
      console.error("Erro ao baixar título:", error);
      addToast("Erro ao processar recebimento", "error");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0 }}>Gestão de Recebimentos</h1>
            <p style={{ color: "#64748B", fontSize: 13, marginTop: 2 }}>Títulos com disparo Z-API do MongoDB Atlas</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
              Data do Disparo:
              <input 
                type="date" 
                value={dataFiltro} 
                onChange={e => setDataFiltro(e.target.value)} 
                style={{ marginLeft: 8, border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontSize: 13 }} 
              />
            </label>
            <button 
              onClick={buscarTitulosAtlas} 
              disabled={loading}
              style={{ 
                background: loading ? "#94A3B8" : "#3B82F6", 
                color: "#fff", 
                border: "none", 
                borderRadius: 8, 
                padding: "8px 16px", 
                fontSize: 13, 
                fontWeight: 600, 
                cursor: loading ? "not-allowed" : "pointer" 
              }}>
              {loading ? "Carregando..." : "🔄 Atualizar"}
            </button>
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Pendentes de Baixa</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#B91C1C" }}>{pendentes.length}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{brl(pendentes.reduce((a, t) => a + t.total, 0))}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Recebidos</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#10B981" }}>{recebidosList.length}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{brl(recebidosList.reduce((a, t) => a + t.total, 0))}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Recebimentos lançados</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#1D4ED8" }}>{recebimentos.length}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{brl(recebimentos.reduce((a, r) => a + r.valorRecebido, 0))}</div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "#F1F5F9", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {(["PENDENTES", "RECEBIDOS"] as const).map(s => (
          <button key={s} onClick={() => setTab(s)} style={{ background: tab === s ? "#fff" : "transparent", border: "none", borderRadius: 8, padding: "7px 18px", fontSize: 13, fontWeight: 600, color: tab === s ? "#0F172A" : "#64748B", cursor: "pointer", boxShadow: tab === s ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
            {s === "PENDENTES" ? "Pendentes de Baixa" : "Recebidos"}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                {["Cliente", "Nº NF", "Valor Principal", "Juros", "Total", "Atraso", "Status", "Ação"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {showing.map((t, idx) => {
                const c = getCliente(t.clienteId);
                return (
                  <tr key={t.id} style={{ borderBottom: "1px solid #F1F5F9", background: idx % 2 === 0 ? "#fff" : "#FAFBFC" }}>
                    <td style={{ padding: "11px 14px", fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap" }}>{c.nome}</td>
                    <td style={{ padding: "11px 14px", fontFamily: "monospace", color: "#1D4ED8", fontSize: 12 }}>{t.numeroNF}</td>
                    <td style={{ padding: "11px 14px" }}>{brl(t.valorPrincipal)}</td>
                    <td style={{ padding: "11px 14px", color: t.juros > 0 ? "#B91C1C" : "#94A3B8" }}>{brl(t.juros)}</td>
                    <td style={{ padding: "11px 14px", fontWeight: 700 }}>{brl(t.total)}</td>
                    <td style={{ padding: "11px 14px" }}>{t.diasAtraso > 0 ? <span style={{ color: "#B91C1C", fontWeight: 600 }}>{t.diasAtraso}d</span> : "—"}</td>
                    <td style={{ padding: "11px 14px" }}><StatusBadge status={t.status} /></td>
                    <td style={{ padding: "11px 14px" }}>
                      {tab === "PENDENTES" && (
                        <button onClick={() => setBaixarTitulo(t)} style={{ background: "#EDE9FE", color: "#5B21B6", border: "none", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Lançar Recebimento
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {showing.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>Nenhum título nesta categoria</div>}
      </div>

      <BaixarModal open={!!baixarTitulo} titulo={baixarTitulo} onClose={() => setBaixarTitulo(null)} onConfirm={handleBaixar} />
    </div>
  );
}
