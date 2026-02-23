"use client";

import { useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { brl } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { parseCsvText, buildCarteiraFromRows } from "@/lib/csv";
import type { Carteira } from "@/types";

export default function ImportacoesPage() {
  const { setClientes, setTitulos, clientes, addToast } = useStore();
  const [dragging, setDragging] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const [carteira, setCarteira] = useState<Carteira | null>(null);
  const [rawCount, setRawCount] = useState(0);
  const [importando, setImportando] = useState(false);
  const [limpando, setLimpando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File | null) => {
    if (!file) return;
    if (!file.name.endsWith(".csv")) { addToast("Por favor, envie um arquivo .csv", "error"); return; }
    setFilename(file.name);
    const text = await file.text();
    const rows = parseCsvText(text);
    setRawCount(rows.length);
    setCarteira(buildCarteiraFromRows(rows));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0] ?? null);
  };

  const confirmar = async () => {
    if (!carteira || importando) return;
    setImportando(true);
    
    try {
      // Enviar para MongoDB Atlas via API
      const res = await apiFetch("/api/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientes: carteira.clientes,
          titulos: carteira.titulos,
        }),
      });

      const result = await res.json();

      // Atualizar estado local com dados do backend
      setClientes(p => [...p, ...carteira.clientes]);
      setTitulos(p => [...p, ...carteira.titulos]);
      
      addToast(`✅ Importados para o Atlas: ${carteira.clientes.length} clientes, ${carteira.titulos.length} títulos`);
      setCarteira(null);
      setFilename(null);
      setRawCount(0);
    } catch (error) {
      console.error("Erro ao importar:", error);
      const msg = error instanceof Error ? error.message : "Erro ao importar para o banco";
      addToast(msg, "error");
      console.error("Detalhes do erro:", error);
    } finally {
      setImportando(false);
    }
  };

  const limparDia = async () => {
    const hoje = new Date().toISOString().split("T")[0];
    const confirma = confirm(`Tem certeza que deseja EXCLUIR todos os títulos importados hoje (${hoje}) do MongoDB Atlas?\n\nEsta ação não pode ser desfeita!`);
    if (!confirma) return;

    setLimpando(true);
    try {
      const res = await apiFetch(`/api/importar?data=${hoje}`, {
        method: "DELETE",
      });

      const result = await res.json();
      addToast(`🗑️ ${result.deletedTitulos} títulos e ${result.deletedClientes} clientes excluídos do Atlas`);
      
      // Limpar também do localStorage
      setTitulos(() => []);
      setClientes(() => []);
    } catch (error) {
      console.error("Erro ao limpar:", error);
      const msg = error instanceof Error ? error.message : "Erro ao limpar dados";
      addToast(msg, "error");
      console.error("Detalhes do erro:", error);
    } finally {
      setLimpando(false);
    }
  };

  const resumo = useMemo(() => {
    if (!carteira) return null;
    return {
      clientes: carteira.clientes.length,
      titulos: carteira.titulos.length,
      total: carteira.titulos.reduce((a, t) => a + t.total, 0),
      vencido: carteira.titulos.filter(t => t.status === "VENCIDO").reduce((a, t) => a + t.total, 0),
    };
  }, [carteira]);

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0 }}>Importações</h1>
          <p style={{ color: "#64748B", fontSize: 13, marginTop: 2 }}>Importe CSV com clientes e títulos em lote.</p>
        </div>
        <button 
          onClick={limparDia}
          disabled={limpando}
          style={{ 
            background: limpando ? "#FCA5A5" : "#EF4444", 
            color: "#fff", 
            border: "none", 
            borderRadius: 10, 
            padding: "10px 20px", 
            fontWeight: 700, 
            fontSize: 13, 
            cursor: limpando ? "not-allowed" : "pointer",
            whiteSpace: "nowrap"
          }}>
          {limpando ? "Limpando..." : "🗑️ Limpar Dia (Atlas)"}
        </button>
      </div>

      {/* DROPZONE */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{ border: `2px dashed ${dragging ? "#3B82F6" : "#CBD5E1"}`, borderRadius: 16, padding: "48px 24px", textAlign: "center", cursor: "pointer", background: dragging ? "#EFF6FF" : "#F8FAFC", transition: "all 0.2s", marginBottom: 20 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>{dragging ? "📂" : "📁"}</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#334155", marginBottom: 6 }}>
          {filename ? filename : "Arraste o CSV aqui ou clique para selecionar"}
        </div>
        <div style={{ fontSize: 13, color: "#94A3B8" }}>
          Colunas: nome, telefone, numero_nf, numero_titulo, valor_principal, juros, total, dias_atraso
        </div>
        <input ref={fileRef} type="file" accept=".csv" onChange={e => processFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
      </div>

      {/* FORMAT HINT */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#334155", marginBottom: 8 }}>📋 Formato esperado do CSV</div>
        <pre style={{ fontSize: 11, color: "#475569", fontFamily: "monospace", background: "#F8FAFC", borderRadius: 8, padding: "10px 14px", margin: 0, overflowX: "auto" }}>{`nome;telefone;numero_nf;numero_titulo;valor_principal;juros;total;dias_atraso
Fazenda São João;+5565999990001;NF-12401;DUP-001;15000;750;15750;12
Fazenda São João;+5565999990001;NF-12402;DUP-002;8200;0;8200;0
Agro Horizonte;+5565988880002;NF-12403;DUP-003;22000;1100;23100;30`}</pre>
      </div>

      {/* PREVIEW */}
      {carteira && resumo && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Linhas lidas", value: rawCount, color: "#334155" },
              { label: "Clientes", value: resumo.clientes, color: "#1D4ED8" },
              { label: "Títulos", value: resumo.titulos, color: "#6D28D9" },
              { label: "Total carteira", value: brl(resumo.total), color: "#065F46" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 16 }}>Prévia — Clientes e Títulos</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {carteira.clientes.slice(0, 8).map(c => {
                const tits = carteira.titulos.filter(t => t.clienteId === c.id);
                const soma = tits.reduce((a, t) => a + t.total, 0);
                return (
                  <div key={c.id} style={{ border: "1px solid #F1F5F9", borderRadius: 10, padding: "12px 16px", background: "#FAFBFC" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>{c.nome}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8" }}>{c.telefone || "Sem telefone"}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: "#1D4ED8" }}>{brl(soma)}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                      {tits.map(t => (
                        <div key={t.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{t.numeroNF}{t.numeroTitulo ? ` • ${t.numeroTitulo}` : ""}</div>
                          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                            Prin: {brl(t.valorPrincipal)} • Juros: {brl(t.juros)} • Total: {brl(t.total)}
                          </div>
                          <span style={{ display: "inline-block", marginTop: 4, fontSize: 11, fontWeight: 600, padding: "1px 8px", borderRadius: 20, background: t.status === "VENCIDO" ? "#FEE2E2" : "#D1FAE5", color: t.status === "VENCIDO" ? "#B91C1C" : "#065F46" }}>
                            {t.status === "VENCIDO" ? `Vencido ${t.diasAtraso}d` : "Aberto"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {carteira.clientes.length > 8 && <div style={{ fontSize: 12, color: "#94A3B8" }}>+ {carteira.clientes.length - 8} cliente(s) a mais...</div>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button 
              onClick={confirmar} 
              disabled={importando}
              style={{ 
                background: importando ? "#93C5FD" : "#1E40AF", 
                color: "#fff", 
                border: "none", 
                borderRadius: 10, 
                padding: "12px 28px", 
                fontWeight: 700, 
                fontSize: 14, 
                cursor: importando ? "not-allowed" : "pointer" 
              }}>
              {importando ? "Importando..." : "✅ Confirmar Importação (Atlas)"}
            </button>
            <button 
              onClick={() => { setCarteira(null); setFilename(null); setRawCount(0); }} 
              disabled={importando}
              style={{ 
                background: "#F1F5F9", 
                color: "#334155", 
                border: "1px solid #E2E8F0", 
                borderRadius: 10, 
                padding: "12px 20px", 
                fontWeight: 600, 
                fontSize: 14, 
                cursor: importando ? "not-allowed" : "pointer" 
              }}>
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
