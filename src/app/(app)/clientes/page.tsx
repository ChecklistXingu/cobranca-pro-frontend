"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";
import { brl, fmtDate } from "@/lib/utils";
import type { Cliente, TipoCliente } from "@/types";

// ─── helpers ────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<TipoCliente, string> = {
  PRODUTOR_RURAL: "Produtor Rural",
  REVENDEDOR: "Revendedor",
  DISTRIBUIDOR: "Distribuidor",
  OUTROS: "Outros",
};

const TIPOS: TipoCliente[] = ["PRODUTOR_RURAL", "REVENDEDOR", "DISTRIBUIDOR", "OUTROS"];

function tipoLabel(t?: TipoCliente | string) {
  return t ? (TIPO_LABELS[t as TipoCliente] ?? t) : "Outros";
}

// ─── sub-components ──────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children, width = 560 }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} />
      <div style={{ position: "relative", background: "#1E293B", borderRadius: 12, width, maxWidth: "94vw", maxHeight: "90vh", overflow: "auto", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: "#F1F5F9", fontWeight: 700, fontSize: 17, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748B", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 4 }}>
      <span style={{ color: "#64748B", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}: </span>
      <span style={{ color: "#CBD5E1", fontSize: 13 }}>{value}</span>
    </div>
  );
}

function KpiCard({ label, value, color = "#3B82F6" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: "#1E293B", borderRadius: 10, padding: "16px 20px", border: "1px solid rgba(255,255,255,0.06)", flex: 1, minWidth: 140 }}>
      <div style={{ color, fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{value}</div>
      <div style={{ color: "#64748B", fontSize: 11, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function StatusBadge({ ativo }: { ativo?: boolean }) {
  const ok = ativo !== false;
  return (
    <span style={{ background: ok ? "#D1FAE5" : "#FEE2E2", color: ok ? "#065F46" : "#B91C1C", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: ok ? "#10B981" : "#EF4444", display: "inline-block" }} />
      {ok ? "Ativo" : "Inativo"}
    </span>
  );
}

function TituloStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; color: string }> = {
    ABERTO: { label: "Aberto", bg: "#DBEAFE", color: "#1D4ED8" },
    VENCIDO: { label: "Vencido", bg: "#FEE2E2", color: "#B91C1C" },
    RECEBIDO: { label: "Recebido", bg: "#D1FAE5", color: "#065F46" },
    NEGOCIADO: { label: "Negociado", bg: "#EDE9FE", color: "#5B21B6" },
    CANCELADO: { label: "Cancelado", bg: "#F3F4F6", color: "#374151" },
  };
  const c = cfg[status] ?? cfg.ABERTO;
  return (
    <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      {c.label}
    </span>
  );
}

// ─── Form de cliente (criar / editar) ─────────────────────────────────────

function FormLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ color: "#94A3B8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>{children}</label>;
}

function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ width: "100%", background: "#0F172A", border: "1px solid #334155", borderRadius: 7, color: "#E2E8F0", fontSize: 13, padding: "8px 10px", outline: "none", boxSizing: "border-box", ...props.style }}
    />
  );
}

function FormSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", background: "#0F172A", border: "1px solid #334155", borderRadius: 7, color: "#E2E8F0", fontSize: 13, padding: "8px 10px", outline: "none", boxSizing: "border-box" }}>
      {children}
    </select>
  );
}

function FormTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      rows={3}
      style={{ width: "100%", background: "#0F172A", border: "1px solid #334155", borderRadius: 7, color: "#E2E8F0", fontSize: 13, padding: "8px 10px", outline: "none", boxSizing: "border-box", resize: "vertical", ...props.style }}
    />
  );
}

type ClienteForm = {
  nome: string; telefone: string; documento: string; email: string;
  tipo_cliente: TipoCliente; cep: string; logradouro: string; numero: string;
  complemento: string; bairro: string; cidade: string; estado: string; observacoes: string;
};

const FORM_VAZIO: ClienteForm = {
  nome: "", telefone: "", documento: "", email: "", tipo_cliente: "OUTROS",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "", observacoes: "",
};

function ClienteFormModal({ open, onClose, inicial, onSave }: {
  open: boolean; onClose: () => void; inicial?: Cliente | null; onSave: (data: ClienteForm) => Promise<void>;
}) {
  const [form, setForm] = useState<ClienteForm>(FORM_VAZIO);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (open) {
      setErro("");
      setForm(inicial ? {
        nome: inicial.nome || "",
        telefone: inicial.telefone || "",
        documento: inicial.documento || "",
        email: inicial.email || "",
        tipo_cliente: (inicial.tipo_cliente as TipoCliente) || "OUTROS",
        cep: inicial.cep || "",
        logradouro: inicial.logradouro || "",
        numero: inicial.numero || "",
        complemento: inicial.complemento || "",
        bairro: inicial.bairro || "",
        cidade: inicial.cidade || "",
        estado: inicial.estado || "",
        observacoes: inicial.observacoes || "",
      } : FORM_VAZIO);
    }
  }, [open, inicial]);

  const set = (field: keyof ClienteForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { setErro("Nome é obrigatório"); return; }
    setSaving(true);
    setErro("");
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={inicial ? "Editar Cliente" : "Novo Cliente"} width={620}>
      <form onSubmit={handleSubmit}>
        {/* Dados principais */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <FormLabel>Nome *</FormLabel>
            <FormInput value={form.nome} onChange={set("nome")} placeholder="Nome completo ou razão social" />
          </div>
          <div>
            <FormLabel>Telefone / WhatsApp</FormLabel>
            <FormInput value={form.telefone} onChange={set("telefone")} placeholder="5565999990001" />
          </div>
          <div>
            <FormLabel>CPF / CNPJ</FormLabel>
            <FormInput value={form.documento} onChange={set("documento")} placeholder="000.000.000-00" />
          </div>
          <div>
            <FormLabel>E-mail</FormLabel>
            <FormInput type="email" value={form.email} onChange={set("email")} placeholder="email@empresa.com" />
          </div>
          <div>
            <FormLabel>Tipo de cliente</FormLabel>
            <FormSelect value={form.tipo_cliente} onChange={v => setForm(f => ({ ...f, tipo_cliente: v as TipoCliente }))}>
              {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
            </FormSelect>
          </div>
        </div>

        {/* Endereço */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 14, marginBottom: 12 }}>
          <p style={{ color: "#64748B", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 10px" }}>Endereço</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <FormLabel>CEP</FormLabel>
              <FormInput value={form.cep} onChange={set("cep")} placeholder="00000-000" maxLength={9} />
            </div>
            <div>
              <FormLabel>Bairro</FormLabel>
              <FormInput value={form.bairro} onChange={set("bairro")} placeholder="Bairro" />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <FormLabel>Logradouro</FormLabel>
              <FormInput value={form.logradouro} onChange={set("logradouro")} placeholder="Rua, Avenida..." />
            </div>
            <div>
              <FormLabel>Número</FormLabel>
              <FormInput value={form.numero} onChange={set("numero")} placeholder="Nº" />
            </div>
            <div>
              <FormLabel>Complemento</FormLabel>
              <FormInput value={form.complemento} onChange={set("complemento")} placeholder="Sala, Apto..." />
            </div>
            <div>
              <FormLabel>Cidade</FormLabel>
              <FormInput value={form.cidade} onChange={set("cidade")} placeholder="Cidade" />
            </div>
            <div>
              <FormLabel>Estado (UF)</FormLabel>
              <FormInput value={form.estado} onChange={set("estado")} placeholder="MT" maxLength={2} />
            </div>
          </div>
        </div>

        {/* Observações */}
        <div style={{ marginBottom: 16 }}>
          <FormLabel>Observações</FormLabel>
          <FormTextarea value={form.observacoes} onChange={set("observacoes")} placeholder="Notas internas sobre o cliente..." />
        </div>

        {erro && <p style={{ color: "#EF4444", fontSize: 12, marginBottom: 12 }}>{erro}</p>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "9px 18px", background: "#334155", color: "#E2E8F0", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} style={{ padding: "9px 22px", background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Salvando..." : (inicial ? "Salvar" : "Criar cliente")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Perfil do cliente ────────────────────────────────────────────────────

type PerfilData = Cliente & {
  stats?: {
    titulosAbertos: number;
    titulosRecebidos: number;
    totalTitulos: number;
    totalEmAberto: number;
    totalRecebido: number;
    totalDisparos: number;
  };
  titulos?: Array<{ id: string; numeroNF: string; total: number; status: string; vencimento?: string; createdAt?: string }>;
  recebimentos?: Array<{ id: string; tituloId: string; data: string; valorRecebido: number; forma: string; observacao?: string }>;
  disparos?: Array<{ id: string; tipo?: string; template: string; status: string; resposta?: string; createdAt: string }>;
};

function DisparoStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    ENVIADO: { bg: "#D1FAE5", color: "#065F46" },
    FALHOU: { bg: "#FEE2E2", color: "#B91C1C" },
    PENDENTE: { bg: "#FEF3C7", color: "#92400E" },
  };
  const c = cfg[status] ?? cfg.PENDENTE;
  return <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{status}</span>;
}

function PerfilCliente({ clienteId, onBack, onEdit }: {
  clienteId: string; onBack: () => void; onEdit: (c: Cliente) => void;
}) {
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmInativar, setConfirmInativar] = useState(false);
  const { addToast, setClientes, clientes } = useStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/clientes/${clienteId}`);
      const data = await res.json();
      setPerfil(data);
    } catch {
      addToast("Erro ao carregar perfil do cliente");
    } finally {
      setLoading(false);
    }
  }, [clienteId, addToast]);

  useEffect(() => { load(); }, [load]);

  async function handleInativar() {
    try {
      await apiFetch(`/api/clientes/${clienteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: false }),
      });
      setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, ativo: false } : c));
      addToast("Cliente inativado");
      setConfirmInativar(false);
      onBack();
    } catch {
      addToast("Erro ao inativar cliente");
    }
  }

  async function handleReativar() {
    try {
      await apiFetch(`/api/clientes/${clienteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: true }),
      });
      setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, ativo: true } : c));
      addToast("Cliente reativado");
      await load();
    } catch {
      addToast("Erro ao reativar cliente");
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
        <span style={{ color: "#64748B", fontSize: 14 }}>Carregando perfil...</span>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <p style={{ color: "#EF4444" }}>Não foi possível carregar o perfil.</p>
        <button onClick={onBack} style={{ marginTop: 12, padding: "8px 18px", background: "#334155", color: "#E2E8F0", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Voltar</button>
      </div>
    );
  }

  const ativo = perfil.ativo !== false;
  const endereco = [perfil.logradouro, perfil.numero, perfil.complemento, perfil.bairro].filter(Boolean).join(", ");
  const cidadeUf = [perfil.cidade, perfil.estado].filter(Boolean).join(" - ");

  return (
    <div>
      {/* Botão voltar */}
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#64748B", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 20, padding: 0 }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Voltar para lista
      </button>

      {/* Cabeçalho */}
      <div style={{ background: "#1E293B", borderRadius: 12, padding: "20px 24px", marginBottom: 16, border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#3B82F6,#1D4ED8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
            {perfil.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ color: "#F1F5F9", fontWeight: 800, fontSize: 20, margin: 0 }}>{perfil.nome}</h2>
              <StatusBadge ativo={ativo} />
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
              {perfil.tipo_cliente && <span style={{ color: "#60A5FA", fontSize: 12, fontWeight: 600 }}>{tipoLabel(perfil.tipo_cliente)}</span>}
              {perfil.telefone && <span style={{ color: "#94A3B8", fontSize: 12 }}>📞 {perfil.telefone}</span>}
              {perfil.email && <span style={{ color: "#94A3B8", fontSize: 12 }}>✉ {perfil.email}</span>}
              {perfil.documento && <span style={{ color: "#94A3B8", fontSize: 12 }}>Doc: {perfil.documento}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => onEdit(perfil)} style={{ padding: "8px 16px", background: "#334155", color: "#E2E8F0", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            Editar
          </button>
          {ativo ? (
            <button onClick={() => setConfirmInativar(true)} style={{ padding: "8px 16px", background: "#FEE2E2", color: "#B91C1C", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              Inativar
            </button>
          ) : (
            <button onClick={handleReativar} style={{ padding: "8px 16px", background: "#D1FAE5", color: "#065F46", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              Reativar
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <KpiCard label="Títulos em aberto" value={String(perfil.stats?.titulosAbertos ?? 0)} color="#3B82F6" />
        <KpiCard label="Total em aberto" value={brl(perfil.stats?.totalEmAberto ?? 0)} color="#EF4444" />
        <KpiCard label="Total recebido" value={brl(perfil.stats?.totalRecebido ?? 0)} color="#10B981" />
        <KpiCard label="Disparos enviados" value={String(perfil.stats?.totalDisparos ?? 0)} color="#8B5CF6" />
      </div>

      {/* Endereço */}
      {(endereco || cidadeUf || perfil.cep) && (
        <div style={{ background: "#1E293B", borderRadius: 10, padding: "16px 20px", marginBottom: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ color: "#64748B", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 8px" }}>Endereço</p>
          {endereco && <p style={{ color: "#CBD5E1", fontSize: 13, margin: "0 0 2px" }}>{endereco}</p>}
          {cidadeUf && <p style={{ color: "#CBD5E1", fontSize: 13, margin: "0 0 2px" }}>{cidadeUf}{perfil.cep ? ` — CEP ${perfil.cep}` : ""}</p>}
        </div>
      )}

      {/* Observações */}
      {perfil.observacoes && (
        <div style={{ background: "#1E293B", borderRadius: 10, padding: "16px 20px", marginBottom: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ color: "#64748B", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 8px" }}>Observações</p>
          <p style={{ color: "#CBD5E1", fontSize: 13, margin: 0, whiteSpace: "pre-wrap" }}>{perfil.observacoes}</p>
        </div>
      )}

      {/* Títulos vinculados */}
      <div style={{ background: "#1E293B", borderRadius: 10, padding: "16px 20px", marginBottom: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ color: "#64748B", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 12px" }}>
          Títulos vinculados ({perfil.titulos?.length ?? 0})
        </p>
        {(perfil.titulos?.length ?? 0) === 0 ? (
          <p style={{ color: "#475569", fontSize: 13 }}>Nenhum título vinculado.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["NF", "Valor", "Status", "Vencimento"].map(h => (
                  <th key={h} style={{ color: "#64748B", fontSize: 11, fontWeight: 600, textTransform: "uppercase", padding: "4px 8px", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perfil.titulos!.map(t => (
                <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ color: "#CBD5E1", fontSize: 13, padding: "7px 8px" }}>{t.numeroNF}</td>
                  <td style={{ color: "#CBD5E1", fontSize: 13, padding: "7px 8px" }}>{brl(t.total)}</td>
                  <td style={{ padding: "7px 8px" }}><TituloStatusBadge status={t.status} /></td>
                  <td style={{ color: "#94A3B8", fontSize: 12, padding: "7px 8px" }}>{t.vencimento ? fmtDate(t.vencimento) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recebimentos */}
      {(perfil.recebimentos?.length ?? 0) > 0 && (
        <div style={{ background: "#1E293B", borderRadius: 10, padding: "16px 20px", marginBottom: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ color: "#64748B", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 12px" }}>
            Histórico de recebimentos ({perfil.recebimentos!.length})
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Data", "Valor", "Forma"].map(h => (
                  <th key={h} style={{ color: "#64748B", fontSize: 11, fontWeight: 600, textTransform: "uppercase", padding: "4px 8px", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perfil.recebimentos!.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ color: "#CBD5E1", fontSize: 13, padding: "7px 8px" }}>{fmtDate(r.data)}</td>
                  <td style={{ color: "#10B981", fontSize: 13, fontWeight: 600, padding: "7px 8px" }}>{brl(r.valorRecebido)}</td>
                  <td style={{ color: "#94A3B8", fontSize: 12, padding: "7px 8px" }}>{r.forma}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Disparos */}
      {(perfil.disparos?.length ?? 0) > 0 && (
        <div style={{ background: "#1E293B", borderRadius: 10, padding: "16px 20px", marginBottom: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ color: "#64748B", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 12px" }}>
            Disparos ({perfil.disparos!.length})
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Data", "Template", "Status"].map(h => (
                  <th key={h} style={{ color: "#64748B", fontSize: 11, fontWeight: 600, textTransform: "uppercase", padding: "4px 8px", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perfil.disparos!.map(d => (
                <tr key={d.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ color: "#94A3B8", fontSize: 12, padding: "7px 8px" }}>{fmtDate(d.createdAt)}</td>
                  <td style={{ color: "#CBD5E1", fontSize: 12, padding: "7px 8px" }}>{d.template}</td>
                  <td style={{ padding: "7px 8px" }}><DisparoStatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmação inativar */}
      <Modal open={confirmInativar} onClose={() => setConfirmInativar(false)} title="Inativar cliente" width={420}>
        <p style={{ color: "#CBD5E1", fontSize: 14, marginBottom: 20 }}>
          Tem certeza que deseja inativar <strong>{perfil.nome}</strong>? Ele não aparecerá mais na lista, mas seus dados serão mantidos.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setConfirmInativar(false)} style={{ padding: "9px 18px", background: "#334155", color: "#E2E8F0", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            Cancelar
          </button>
          <button onClick={handleInativar} style={{ padding: "9px 18px", background: "#EF4444", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
            Inativar
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function ClientesPage() {
  const { clientes, setClientes, addToast } = useStore();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoCliente | "TODOS">("TODOS");
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [view, setView] = useState<"lista" | "perfil">("lista");
  const [clienteIdSelecionado, setClienteIdSelecionado] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);

  // Carregar clientes (incluindo inativos se necessário)
  const loadClientes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (mostrarInativos) params.set("ativo", "todos");
      const res = await apiFetch(`/api/clientes?${params}`);
      const data = await res.json();
      setClientes(Array.isArray(data) ? data : []);
    } catch {
      addToast("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }, [mostrarInativos, setClientes, addToast]);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  // Filtro client-side
  const clientesFiltrados = useMemo(() => {
    let lista = Array.isArray(clientes) ? clientes : [];
    if (!mostrarInativos) {
      lista = lista.filter(c => c.ativo !== false);
    }
    if (filtroTipo !== "TODOS") {
      lista = lista.filter(c => c.tipo_cliente === filtroTipo);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      lista = lista.filter(c =>
        c.nome.toLowerCase().includes(q) ||
        (c.documento || "").toLowerCase().includes(q) ||
        (c.cidade || "").toLowerCase().includes(q) ||
        (c.telefone || "").includes(q)
      );
    }
    return lista;
  }, [clientes, mostrarInativos, filtroTipo, search]);

  async function handleSalvar(form: ClienteForm) {
    if (editando) {
      const patchRes = await apiFetch(`/api/clientes/${editando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await patchRes.json();
      setClientes(prev => prev.map(c => c.id === editando.id ? { ...c, ...data } : c));
      addToast("Cliente atualizado");
      // Se estiver no perfil, recarregar
      if (view === "perfil") {
        setClienteIdSelecionado(editando.id); // force re-mount trick
      }
    } else {
      const postRes = await apiFetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await postRes.json();
      setClientes(prev => [data, ...prev]);
      addToast("Cliente criado com sucesso");
    }
    setEditando(null);
  }

  function abrirNovo() {
    setEditando(null);
    setModalOpen(true);
  }

  function abrirEditar(c: Cliente) {
    setEditando(c);
    setModalOpen(true);
  }

  function abrirPerfil(id: string) {
    setClienteIdSelecionado(id);
    setView("perfil");
  }

  function voltarLista() {
    setView("lista");
    setClienteIdSelecionado(null);
    loadClientes();
  }

  // ─── Perfil ─────────────────────────────────────────────────────────────
  if (view === "perfil" && clienteIdSelecionado) {
    return (
      <div style={{ padding: "24px 28px", maxWidth: 900, margin: "0 auto" }}>
        <PerfilCliente
          key={clienteIdSelecionado}
          clienteId={clienteIdSelecionado}
          onBack={voltarLista}
          onEdit={(c) => abrirEditar(c)}
        />
        <ClienteFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          inicial={editando}
          onSave={handleSalvar}
        />
      </div>
    );
  }

  // ─── Lista ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ color: "#0F172A", fontWeight: 800, fontSize: 22, margin: 0 }}>Clientes</h1>
          <p style={{ color: "#64748B", fontSize: 13, margin: "4px 0 0" }}>
            {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? "s" : ""} encontrado{clientesFiltrados.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={abrirNovo} style={{ padding: "10px 20px", background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
          Novo Cliente
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, CPF/CNPJ, cidade..."
          style={{ flex: 1, minWidth: 200, background: "#1E293B", border: "1px solid #334155", borderRadius: 8, color: "#E2E8F0", fontSize: 13, padding: "9px 12px", outline: "none" }}
        />
        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value as TipoCliente | "TODOS")}
          style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 8, color: "#E2E8F0", fontSize: 13, padding: "9px 12px", outline: "none" }}>
          <option value="TODOS">Todos os tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", color: "#94A3B8", fontSize: 13, whiteSpace: "nowrap" }}>
          <input
            type="checkbox"
            checked={mostrarInativos}
            onChange={e => setMostrarInativos(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          Mostrar inativos
        </label>
      </div>

      {/* Tabela */}
      <div style={{ background: "#1E293B", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {["Nome", "Tipo", "Cidade / UF", "Telefone", "Status"].map(h => (
                <th key={h} style={{ color: "#64748B", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "12px 16px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "#64748B" }}>Carregando...</td>
              </tr>
            ) : clientesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "#64748B" }}>
                  {search || filtroTipo !== "TODOS" ? "Nenhum cliente encontrado para esse filtro." : "Nenhum cliente cadastrado."}
                </td>
              </tr>
            ) : (
              clientesFiltrados.map(c => (
                <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.06)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  onClick={() => abrirPerfil(c.id)}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#3B82F6,#1D4ED8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                        {c.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ color: "#E2E8F0", fontSize: 13, fontWeight: 600 }}>{c.nome}</div>
                        {c.documento && <div style={{ color: "#64748B", fontSize: 11 }}>{c.documento}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#94A3B8", fontSize: 12 }}>{tipoLabel(c.tipo_cliente)}</td>
                  <td style={{ padding: "12px 16px", color: "#94A3B8", fontSize: 12 }}>
                    {[c.cidade, c.estado].filter(Boolean).join(" - ") || "—"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#94A3B8", fontSize: 12 }}>{c.telefone || "—"}</td>
                  <td style={{ padding: "12px 16px" }}><StatusBadge ativo={c.ativo} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ClienteFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null); }}
        inicial={editando}
        onSave={handleSalvar}
      />
    </div>
  );
}
