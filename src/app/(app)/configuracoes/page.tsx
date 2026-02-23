"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

const inputStyle: React.CSSProperties = { width: "100%", border: "1px solid #E2E8F0", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#334155", outline: "none", background: "#fff", boxSizing: "border-box" };

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 5, display: "block" }}>{label}</label>
      {children}
    </div>
  );
}

export default function ConfiguracoesPage() {
  const { addToast } = useStore();
  const [form, setForm] = useState({ token: "", instancia: "", empresa: "Agro Peças Ltda", webhook: "" });

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0 }}>Configurações</h1>
        <p style={{ color: "#64748B", fontSize: 13, marginTop: 2 }}>Integração Z-API e dados da empresa.</p>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: "24px 28px", marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 16 }}>🔌 Integração Z-API (WhatsApp)</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <FormField label="Instance ID">
            <input value={form.instancia} onChange={e => setForm(p => ({ ...p, instancia: e.target.value }))} placeholder="Ex: 3ABCDEF123456" style={inputStyle} />
          </FormField>
          <FormField label="Token de acesso">
            <input type="password" value={form.token} onChange={e => setForm(p => ({ ...p, token: e.target.value }))} placeholder="Seu token Z-API" style={inputStyle} />
          </FormField>
          <FormField label="Webhook URL (opcional)">
            <input value={form.webhook} onChange={e => setForm(p => ({ ...p, webhook: e.target.value }))} placeholder="https://sua-api.com/webhook" style={inputStyle} />
          </FormField>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: "24px 28px", marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 16 }}>🏢 Dados da Empresa</div>
        <FormField label="Nome da empresa">
          <input value={form.empresa} onChange={e => setForm(p => ({ ...p, empresa: e.target.value }))} style={inputStyle} />
        </FormField>
      </div>

      <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12, padding: "14px 18px", marginBottom: 24, fontSize: 13, color: "#92400E" }}>
        <strong>ℹ️ Próximos passos:</strong> Backend Node.js + MongoDB Atlas + Render para persistência dos dados. A Z-API será integrada via POST /send-message com o token e instância configurados acima.
      </div>

      <button onClick={() => addToast("Configurações salvas!")} style={{ background: "#1E40AF", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
        Salvar Configurações
      </button>
    </div>
  );
}
