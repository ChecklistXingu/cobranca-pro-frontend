"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";
import { brl, fmtDate } from "@/lib/utils";
import type { Cliente, TipoCliente } from "@/types";

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

// ─── Modal container ─────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children, width = 560 }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", background: "#fff", borderRadius: 16, width, maxWidth: "94vw", maxHeight: "90vh", overflow: "auto", padding: 28, boxShadow: "0 25px 50px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: "#0F172A", fontWeight: 700, fontSize: 17, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", color: "#64748B", fontSize: 20, cursor: "pointer", borderRadius: 8, padding: "4px 8px", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Badges ──────────────────────────────────────────────────────────────────

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
    ABERTO:    { label: "Aberto",    bg: "#DBEAFE", color: "#1D4ED8" },
    VENCIDO:   { label: "Vencido",   bg: "#FEE2E2", color: "#B91C1C" },
    RECEBIDO:  { label: "Recebido",  bg: "#D1FAE5", color: "#065F46" },
    NEGOCIADO: { label: "Negociado", bg: "#EDE9FE", color: "#5B21B6" },
    CANCELADO: { label: "Cancelado", bg: "#F3F4F6", color: "#374151" },
  };
  const c = cfg[status] ?? cfg.ABERTO;
  return <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{c.label}</span>;
}

function DisparoStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    ENVIADO:  { bg: "#D1FAE5", color: "#065F46" },
    FALHOU:   { bg: "#FEE2E2", color: "#B91C1C" },
    PENDENTE: { bg: "#FEF3C7", color: "#92400E" },
  };
  const c = cfg[status] ?? cfg.PENDENTE;
  return <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{status}</span>;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color = "#1D4ED8" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #E2E8F0", flex: 1, minWidth: 140 }}>
      <div style={{ color, fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{value}</div>
      <div style={{ color: "#64748B", fontSize: 11, marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ─── Form inputs ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8,
  color: "#334155", fontSize: 13, padding: "9px 12px", outline: "none", boxSizing: "border-box",
};

function FormLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ color: "#475569", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>{children}</label>;
}

function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} />;
}

function FormSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
      {children}
    </select>
  );
}

function FormTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} rows={3} style={{ ...inputStyle, resize: "vertical", ...props.style }} />;
}

// ─── Form de cliente ──────────────────────────────────────────────────────────

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

        <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 14, marginBottom: 12 }}>
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

        <div style={{ marginBottom: 16 }}>
          <FormLabel>Observações</FormLabel>
          <FormTextarea value={form.observacoes} onChange={set("observacoes")} placeholder="Notas internas sobre o cliente..." />
        </div>

        {erro && <p style={{ color: "#EF4444", fontSize: 12, marginBottom: 12 }}>{erro}</p>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "9px 18px", background: "#F1F5F9", color: "#334155", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
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

// ─── Perfil do cliente ────────────────────────────────────────────────────────

type PerfilData = Cliente & {
  stats?: {
    titulosAbertos: number;
    titulosRecebidos: number;
    totalTitulos: number;
    totalEmAberto: number;
    totalRecebido: number;
    totalDisparos: number;
  };
  titulos?: Array<{ id: string; numeroNF: string; total: number; status: string; vencimento?: string }>;
  recebimentos?: Array<{ id: string; tituloId: string; data: string; valorRecebido: number; forma: string; observacao?: string }>;
  disparos?: Array<{ id: string; tipo?: string; template: string; status: string; createdAt: string }>;
};

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? "#0F172A" : "#94A3B8" }}>{value || "Não informado"}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: "18px 20px", marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function PerfilCliente({ clienteId, onBack, onEdit }: {
  clienteId: string; onBack: () => void; onEdit: (c: Cliente) => void;
}) {
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmInativar, setConfirmInativar] = useState(false);
  const { addToast, setClientes } = useStore();

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
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
      <span style={{ color: "#64748B", fontSize: 14 }}>Carregando perfil...</span>
    </div>;
  }

  if (!perfil) {
    return <div style={{ textAlign: "center", padding: 40 }}>
      <p style={{ color: "#EF4444" }}>Não foi possível carregar o perfil.</p>
      <button onClick={onBack} style={{ marginTop: 12, padding: "8px 18px", background: "#F1F5F9", color: "#334155", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Voltar</button>
    </div>;
  }

  const ativo = perfil.ativo !== false;

  return (
    <div>
      {/* Voltar */}
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#64748B", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 20, padding: 0 }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Voltar para lista
      </button>

      {/* Cabeçalho */}
      <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", marginBottom: 14, border: "1px solid #E2E8F0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#3B82F6,#1D4ED8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
            {perfil.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <h2 style={{ color: "#0F172A", fontWeight: 800, fontSize: 20, margin: 0 }}>{perfil.nome}</h2>
              <StatusBadge ativo={ativo} />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {perfil.tipo_cliente && <span style={{ color: "#3B82F6", fontSize: 12, fontWeight: 600 }}>{tipoLabel(perfil.tipo_cliente)}</span>}
              {perfil.telefone && <span style={{ color: "#64748B", fontSize: 12 }}>📞 {perfil.telefone}</span>}
              {perfil.email && <span style={{ color: "#64748B", fontSize: 12 }}>✉ {perfil.email}</span>}
              {perfil.documento && <span style={{ color: "#64748B", fontSize: 12 }}>Doc: {perfil.documento}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => onEdit(perfil)} style={{ padding: "8px 16px", background: "#F1F5F9", color: "#334155", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 14 }}>
        <KpiCard label="Títulos em aberto" value={String(perfil.stats?.titulosAbertos ?? 0)} color="#1D4ED8" />
        <KpiCard label="Total em aberto" value={brl(perfil.stats?.totalEmAberto ?? 0)} color="#B91C1C" />
        <KpiCard label="Total recebido" value={brl(perfil.stats?.totalRecebido ?? 0)} color="#065F46" />
        <KpiCard label="Disparos enviados" value={String(perfil.stats?.totalDisparos ?? 0)} color="#5B21B6" />
      </div>

      {/* Dados cadastrais — sempre visível */}
      <SectionCard title="Dados Cadastrais">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
          <InfoItem label="Telefone / WhatsApp" value={perfil.telefone} />
          <InfoItem label="CPF / CNPJ" value={perfil.documento} />
          <InfoItem label="E-mail" value={perfil.email} />
          <InfoItem label="Tipo de cliente" value={tipoLabel(perfil.tipo_cliente)} />
          <InfoItem label="CEP" value={perfil.cep} />
          <InfoItem label="Logradouro" value={perfil.logradouro} />
          <InfoItem label="Número" value={perfil.numero} />
          <InfoItem label="Bairro" value={perfil.bairro} />
          <InfoItem label="Cidade" value={perfil.cidade} />
          <InfoItem label="Estado" value={perfil.estado} />
        </div>
        {perfil.observacoes && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #F1F5F9" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Observações</div>
            <div style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap" }}>{perfil.observacoes}</div>
          </div>
        )}
      </SectionCard>

      {/* Títulos vinculados */}
      <SectionCard title={`Títulos vinculados (${perfil.titulos?.length ?? 0})`}>
        {(perfil.titulos?.length ?? 0) === 0 ? (
          <p style={{ color: "#94A3B8", fontSize: 13, margin: 0 }}>Nenhum título vinculado.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                  {["NF", "Valor", "Status", "Vencimento"].map(h => (
                    <th key={h} style={{ color: "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", padding: "6px 10px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perfil.titulos!.map((t, i) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid #F1F5F9", background: i % 2 === 0 ? "#fff" : "#FAFBFC" }}>
                    <td style={{ color: "#1D4ED8", fontFamily: "monospace", fontSize: 12, padding: "8px 10px", fontWeight: 600 }}>{t.numeroNF}</td>
                    <td style={{ color: "#0F172A", fontSize: 13, fontWeight: 600, padding: "8px 10px" }}>{brl(t.total)}</td>
                    <td style={{ padding: "8px 10px" }}><TituloStatusBadge status={t.status} /></td>
                    <td style={{ color: "#64748B", fontSize: 12, padding: "8px 10px" }}>{t.vencimento ? fmtDate(t.vencimento) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Recebimentos */}
      {(perfil.recebimentos?.length ?? 0) > 0 && (
        <SectionCard title={`Histórico de recebimentos (${perfil.recebimentos!.length})`}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                  {["Data", "Valor", "Forma", "Observação"].map(h => (
                    <th key={h} style={{ color: "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", padding: "6px 10px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perfil.recebimentos!.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #F1F5F9", background: i % 2 === 0 ? "#fff" : "#FAFBFC" }}>
                    <td style={{ color: "#334155", fontSize: 13, padding: "8px 10px" }}>{fmtDate(r.data)}</td>
                    <td style={{ color: "#065F46", fontSize: 13, fontWeight: 700, padding: "8px 10px" }}>{brl(r.valorRecebido)}</td>
                    <td style={{ color: "#334155", fontSize: 12, padding: "8px 10px" }}>{r.forma}</td>
                    <td style={{ color: "#64748B", fontSize: 12, padding: "8px 10px" }}>{r.observacao || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Disparos */}
      {(perfil.disparos?.length ?? 0) > 0 && (
        <SectionCard title={`Disparos (${perfil.disparos!.length})`}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                  {["Data", "Template", "Status"].map(h => (
                    <th key={h} style={{ color: "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", padding: "6px 10px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perfil.disparos!.map((d, i) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid #F1F5F9", background: i % 2 === 0 ? "#fff" : "#FAFBFC" }}>
                    <td style={{ color: "#64748B", fontSize: 12, padding: "8px 10px" }}>{fmtDate(d.createdAt)}</td>
                    <td style={{ color: "#334155", fontSize: 13, padding: "8px 10px" }}>{d.template}</td>
                    <td style={{ padding: "8px 10px" }}><DisparoStatusBadge status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Confirmação inativar */}
      <Modal open={confirmInativar} onClose={() => setConfirmInativar(false)} title="Inativar cliente" width={420}>
        <p style={{ color: "#334155", fontSize: 14, marginBottom: 20 }}>
          Tem certeza que deseja inativar <strong>{perfil.nome}</strong>? Ele não aparecerá mais na lista, mas seus dados serão mantidos.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setConfirmInativar(false)} style={{ padding: "9px 18px", background: "#F1F5F9", color: "#334155", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
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

// ─── Página principal ─────────────────────────────────────────────────────────

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

  useEffect(() => { loadClientes(); }, [loadClientes]);

  const clientesFiltrados = useMemo(() => {
    let lista = Array.isArray(clientes) ? clientes : [];
    if (!mostrarInativos) lista = lista.filter(c => c.ativo !== false);
    if (filtroTipo !== "TODOS") lista = lista.filter(c => c.tipo_cliente === filtroTipo);
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

  if (view === "perfil" && clienteIdSelecionado) {
    return (
      <div>
        <PerfilCliente
          key={clienteIdSelecionado}
          clienteId={clienteIdSelecionado}
          onBack={() => { setView("lista"); setClienteIdSelecionado(null); loadClientes(); }}
          onEdit={(c) => { setEditando(c); setModalOpen(true); }}
        />
        <ClienteFormModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditando(null); }}
          inicial={editando}
          onSave={handleSalvar}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ color: "#0F172A", fontWeight: 800, fontSize: 22, margin: 0 }}>Clientes</h1>
          <p style={{ color: "#64748B", fontSize: 13, margin: "4px 0 0" }}>
            {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? "s" : ""} encontrado{clientesFiltrados.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => { setEditando(null); setModalOpen(true); }} style={{ padding: "10px 20px", background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
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
          style={{ flex: 1, minWidth: 200, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, color: "#334155", fontSize: 13, padding: "9px 12px", outline: "none" }}
        />
        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value as TipoCliente | "TODOS")}
          style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, color: "#334155", fontSize: 13, padding: "9px 12px", outline: "none" }}>
          <option value="TODOS">Todos os tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", color: "#64748B", fontSize: 13, whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={mostrarInativos} onChange={e => setMostrarInativos(e.target.checked)} style={{ cursor: "pointer" }} />
          Mostrar inativos
        </label>
      </div>

      {/* Tabela */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              {["Nome", "Tipo", "Cidade / UF", "Telefone", "Status"].map(h => (
                <th key={h} style={{ color: "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "12px 16px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>Carregando...</td></tr>
            ) : clientesFiltrados.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>
                {search || filtroTipo !== "TODOS" ? "Nenhum cliente encontrado para esse filtro." : "Nenhum cliente cadastrado."}
              </td></tr>
            ) : clientesFiltrados.map((c, idx) => (
              <tr
                key={c.id}
                style={{ borderBottom: "1px solid #F1F5F9", cursor: "pointer", background: idx % 2 === 0 ? "#fff" : "#FAFBFC", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#EFF6FF")}
                onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#FAFBFC")}
                onClick={() => { setClienteIdSelecionado(c.id); setView("perfil"); }}
              >
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#3B82F6,#1D4ED8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                      {c.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ color: "#0F172A", fontSize: 13, fontWeight: 600 }}>{c.nome}</div>
                      {c.documento && <div style={{ color: "#94A3B8", fontSize: 11 }}>{c.documento}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 16px", color: "#64748B", fontSize: 12 }}>{tipoLabel(c.tipo_cliente)}</td>
                <td style={{ padding: "12px 16px", color: "#64748B", fontSize: 12 }}>{[c.cidade, c.estado].filter(Boolean).join(" - ") || "—"}</td>
                <td style={{ padding: "12px 16px", color: "#64748B", fontSize: 12 }}>{c.telefone || "—"}</td>
                <td style={{ padding: "12px 16px" }}><StatusBadge ativo={c.ativo} /></td>
              </tr>
            ))}
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
