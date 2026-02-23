"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { fmtDate, simpleId } from "@/lib/utils";

function DisparoStatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    ENVIADO: ["#D1FAE5", "#065F46"],
    FALHOU: ["#FEE2E2", "#B91C1C"],
    PENDENTE: ["#FEF9C3", "#92400E"],
  };
  const [bg, color] = map[status] ?? map.PENDENTE;
  return <span style={{ background: bg, color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{status}</span>;
}

export default function DisparosPage() {
  const { disparos, setDisparos, titulos, templates, setTemplates, getCliente, addToast } = useStore();
  const [tab, setTab] = useState<"logs" | "templates">("logs");
  const [editingTpl, setEditingTpl] = useState<string | null>(null);

  const simularEnvio = () => {
    const titulo = titulos.find(t => t.status === "VENCIDO");
    if (!titulo) { addToast("Nenhum título vencido para disparar", "error"); return; }
    setDisparos(prev => [{
      id: simpleId("d"),
      clienteId: titulo.clienteId,
      tituloId: titulo.id,
      status: Math.random() > 0.1 ? "ENVIADO" : "FALHOU",
      data: new Date().toISOString().split("T")[0],
      template: "Vencido",
      resposta: "200 OK",
    }, ...prev]);
    addToast("Disparo simulado via Z-API!");
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0 }}>Disparos WhatsApp</h1>
          <p style={{ color: "#64748B", fontSize: 13, marginTop: 2 }}>Templates e logs de envio via Z-API</p>
        </div>
        <button onClick={simularEnvio} style={{ background: "#16A34A", color: "#fff", border: "none", borderRadius: 9, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.997 2C6.48 2 2 6.48 2 12c0 1.782.471 3.454 1.285 4.9L2 22l5.233-1.27A9.938 9.938 0 0012 22c5.52 0 10-4.48 10-10S17.517 2 11.997 2z"/></svg>
          Simular Disparo
        </button>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "#F1F5F9", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {(["logs", "templates"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "#fff" : "transparent", border: "none", borderRadius: 8, padding: "7px 20px", fontSize: 13, fontWeight: 600, color: tab === t ? "#0F172A" : "#64748B", cursor: "pointer", boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
            {t === "logs" ? "📋 Logs de Envio" : "📝 Templates"}
          </button>
        ))}
      </div>

      {tab === "logs" && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  {["Cliente", "Telefone", "NF", "Template", "Status", "Data", "Resposta API"].map(h => (
                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {disparos.map((d, idx) => {
                  const c = getCliente(d.clienteId);
                  const t = titulos.find(t => t.id === d.tituloId);
                  return (
                    <tr key={d.id} style={{ borderBottom: "1px solid #F1F5F9", background: idx % 2 === 0 ? "#fff" : "#FAFBFC" }}>
                      <td style={{ padding: "11px 14px", fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap" }}>{c.nome}</td>
                      <td style={{ padding: "11px 14px", color: "#64748B", whiteSpace: "nowrap" }}>{c.telefone}</td>
                      <td style={{ padding: "11px 14px", fontFamily: "monospace", color: "#1D4ED8", fontSize: 12 }}>{t?.numeroNF ?? "—"}</td>
                      <td style={{ padding: "11px 14px", color: "#334155" }}>{d.template}</td>
                      <td style={{ padding: "11px 14px" }}><DisparoStatusBadge status={d.status} /></td>
                      <td style={{ padding: "11px 14px", color: "#64748B", whiteSpace: "nowrap" }}>{fmtDate(d.data)}</td>
                      <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 11, color: d.status === "FALHOU" ? "#B91C1C" : "#10B981" }}>{d.resposta}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {disparos.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>Nenhum disparo registrado</div>}
        </div>
      )}

      {tab === "templates" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {templates.map(tpl => (
            <div key={tpl.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: "18px 20px" }}>
              {editingTpl === tpl.id ? (
                <div>
                  <div style={{ fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>{tpl.nome}</div>
                  <textarea
                    defaultValue={tpl.mensagem}
                    onChange={e => setTemplates(prev => prev.map(t => t.id === tpl.id ? { ...t, mensagem: e.target.value } : t))}
                    style={{ width: "100%", border: "1px solid #E2E8F0", borderRadius: 8, padding: 12, fontSize: 13, minHeight: 90, resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                  />
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 6 }}>Variáveis: {"{cliente}"} {"{numeroNF}"} {"{total}"} {"{diasAtraso}"}</div>
                  <button onClick={() => { setEditingTpl(null); addToast("Template salvo!"); }} style={{ marginTop: 10, background: "#1E40AF", color: "#fff", border: "none", borderRadius: 7, padding: "7px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    Salvar
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>{tpl.nome}</div>
                    <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, background: "#F8FAFC", borderRadius: 8, padding: "8px 12px" }}>{tpl.mensagem}</div>
                  </div>
                  <button onClick={() => setEditingTpl(tpl.id)} style={{ background: "#F1F5F9", color: "#334155", border: "none", borderRadius: 7, padding: "7px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                    ✏️ Editar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
