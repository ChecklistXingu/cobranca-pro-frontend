"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { brl, fmtDate } from "@/lib/utils";

interface HistoricoDisparo {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteTelefone: string;
  tituloId: string;
  numeroNF: string;
  totalTitulo: number | null;
  status: string;
  template: string;
  resposta: string;
  data: string;
}

const formatInputDate = (date: Date) => date.toISOString().split("T")[0];
const prettyDate = (value?: string) => {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    ENVIADO: { bg: "#DCFCE7", color: "#15803D", label: "Enviado" },
    FALHOU: { bg: "#FEE2E2", color: "#B91C1C", label: "Falhou" },
    PENDENTE: { bg: "#FEF9C3", color: "#92400E", label: "Pendente" },
  };
  const cfg = map[status] ?? map.PENDENTE;
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
};

export default function HistoricoPage() {
  const { addToast } = useStore();
  const now = new Date();
  const [dataInicio, setDataInicio] = useState(() => formatInputDate(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [dataFim, setDataFim] = useState(() => formatInputDate(now));
  const [carregando, setCarregando] = useState(false);
  const [historico, setHistorico] = useState<HistoricoDisparo[]>([]);

  const carregarHistorico = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (dataInicio) params.set("inicio", dataInicio);
      if (dataFim) params.set("fim", dataFim);
      const res = await fetch(`/api/disparos?${params.toString()}`);
      if (!res.ok) throw new Error("Não foi possível carregar o histórico de disparos");
      const payload: HistoricoDisparo[] = await res.json();
      setHistorico(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado ao listar histórico";
      addToast(message, "error");
    } finally {
      setCarregando(false);
    }
  }, [dataInicio, dataFim, addToast]);

  useEffect(() => {
    void carregarHistorico();
  }, [carregarHistorico]);

  const stats = useMemo(() => {
    const total = historico.length;
    const enviados = historico.filter(h => h.status === "ENVIADO").length;
    const falhas = historico.filter(h => h.status === "FALHOU").length;
    const pendentes = historico.filter(h => h.status === "PENDENTE").length;
    const somatorio = historico.reduce((acc, item) => acc + (item.totalTitulo ?? 0), 0);
    return { total, enviados, falhas, pendentes, somatorio };
  }, [historico]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0 }}>Histórico</h1>
        <p style={{ color: "#64748B", fontSize: 13, marginTop: 2 }}>Consulte os disparos realizados em qualquer período direto do Atlas.</p>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #E2E8F0", marginBottom: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Selecionar período</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <label style={{ display: "flex", flexDirection: "column", fontSize: 11, fontWeight: 600, color: "#475569" }}>
              Início
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontSize: 13, minWidth: 160 }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", fontSize: 11, fontWeight: 600, color: "#475569" }}>
              Fim
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontSize: 13, minWidth: 160 }} />
            </label>
            <button
              onClick={carregarHistorico}
              disabled={carregando}
              style={{
                border: "none",
                borderRadius: 10,
                padding: "10px 18px",
                background: carregando ? "#CBD5F5" : "#2563EB",
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                cursor: carregando ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {carregando ? "Buscando..." : "Aplicar filtro"}
            </button>
            <div style={{ marginLeft: "auto", fontSize: 12, color: "#94A3B8" }}>
              Exibindo {historico.length} disparos entre {prettyDate(dataInicio)} e {prettyDate(dataFim)}.
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, letterSpacing: 0.5 }}>Total de disparos</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A" }}>{stats.total}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, letterSpacing: 0.5 }}>Enviados</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#15803D" }}>{stats.enviados}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, letterSpacing: 0.5 }}>Pendentes</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#B45309" }}>{stats.pendentes}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, letterSpacing: 0.5 }}>Falhas</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#DC2626" }}>{stats.falhas}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, letterSpacing: 0.5 }}>Somatório dos títulos</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A" }}>{brl(stats.somatorio)}</div>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                {["Data", "Cliente", "Telefone", "NF", "Template", "Valor", "Status", "Resposta"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historico.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #F1F5F9", background: idx % 2 === 0 ? "#fff" : "#FAFBFC" }}>
                  <td style={{ padding: "11px 14px", color: "#0F172A", fontWeight: 600 }}>{fmtDate(item.data)}</td>
                  <td style={{ padding: "11px 14px" }}>{item.clienteNome}</td>
                  <td style={{ padding: "11px 14px", color: "#64748B" }}>{item.clienteTelefone || "—"}</td>
                  <td style={{ padding: "11px 14px", fontFamily: "monospace", color: "#1D4ED8" }}>{item.numeroNF || "—"}</td>
                  <td style={{ padding: "11px 14px", color: "#475569" }}>{item.template}</td>
                  <td style={{ padding: "11px 14px", fontWeight: 600 }}>{item.totalTitulo ? brl(item.totalTitulo) : "—"}</td>
                  <td style={{ padding: "11px 14px" }}><StatusBadge status={item.status} /></td>
                  <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 11, color: item.status === "FALHOU" ? "#B91C1C" : "#0F172A" }}>{item.resposta || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {historico.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>
            Nenhum disparo encontrado para o período selecionado.
          </div>
        )}
      </div>
    </div>
  );
}
