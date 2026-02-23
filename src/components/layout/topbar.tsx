"use client";

import Link from "next/link";
import { useState } from "react";

interface TopbarProps {
  onToggleSidebar: () => void;
  onNovoTitulo?: () => void;
}

export default function Topbar({ onToggleSidebar, onNovoTitulo }: TopbarProps) {
  const [search, setSearch] = useState("");

  return (
    <header style={{ background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100, flexShrink: 0 }}>
      <button onClick={onToggleSidebar} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", display: "flex", padding: 6, borderRadius: 6 }}>
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "6px 14px", maxWidth: 340, flex: 1 }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "#94A3B8" }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente, NF, título..." style={{ border: "none", background: "none", outline: "none", fontSize: 13, color: "#334155", width: "100%" }} />
      </div>

      <div style={{ flex: 1 }} />

      {onNovoTitulo ? (
        <button
          type="button"
          onClick={onNovoTitulo}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "#1E40AF", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 4v16m8-8H4"/></svg>
          Novo Título
        </button>
      ) : (
        <Link href="/titulos" style={{ display: "flex", alignItems: "center", gap: 6, background: "#1E40AF", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 4v16m8-8H4"/></svg>
          Novo Título
        </Link>
      )}

      <Link href="/importacoes" style={{ display: "flex", alignItems: "center", gap: 6, background: "#F1F5F9", color: "#334155", border: "1px solid #E2E8F0", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
        Importar
      </Link>
    </header>
  );
}
