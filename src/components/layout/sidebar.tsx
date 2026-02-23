"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
  { href: "/titulos", label: "Cobrança", icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> },
  { href: "/gestao-recebimentos", label: "Gestão de Recebimentos", icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
  { href: "/historico", label: "Histórico", icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M12 8v4l3 3"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
  { href: "/importacoes", label: "Importações", icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg> },
  // { href: "/disparos", label: "Disparos (Z-API)", icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg> },
  // { href: "/configuracoes", label: "Configurações", icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
];

export default function Sidebar({ open }: { open: boolean }) {
  const pathname = usePathname();

  return (
    <aside style={{ width: open ? 240 : 0, minHeight: "100vh", background: "#0F172A", transition: "width 0.25s", overflow: "hidden", flexShrink: 0, display: "flex", flexDirection: "column" }}>
      {/* LOGO */}
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
          <Image
            src="/força agricola.png"
            alt="Logo Força Agrícola"
            width={68}
            height={68}
            priority
            style={{ borderRadius: "50%", border: "2px solid rgba(226,232,240,0.4)", objectFit: "cover", background: "#fff" }}
          />
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 16, lineHeight: 1.3 }}>Cobrança Pro</div>
          </div>
        </div>
      </div>

      {/* NAV */}
      <nav style={{ padding: "12px 10px", flex: 1 }}>
        {nav.map(n => {
          const active = pathname?.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", borderRadius: 8, marginBottom: 2, transition: "all 0.15s", background: active ? "rgba(59,130,246,0.18)" : "transparent", color: active ? "#60A5FA" : "#94A3B8", fontWeight: active ? 600 : 400, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" }}>
              <span style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}>{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* USER */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#10B981,#047857)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>FA</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#E2E8F0", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Força Agrícola</div>
            <div style={{ color: "#475569", fontSize: 10, whiteSpace: "nowrap" }}>forcaagricola.sistemas@gmail.com</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
