"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";
import NovoTituloModal from "@/components/modals/NovoTituloModal";
import { StoreProvider } from "@/lib/store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [novoTituloOpen, setNovoTituloOpen] = useState(false);

  return (
    <StoreProvider>
      <div className="flex min-h-screen bg-slate-50" style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
        <Sidebar open={sidebarOpen} />
        <div className="flex flex-1 flex-col min-w-0">
          <Topbar onToggleSidebar={() => setSidebarOpen(p => !p)} onNovoTitulo={() => setNovoTituloOpen(true)} />
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
      <NovoTituloModal open={novoTituloOpen} onClose={() => setNovoTituloOpen(false)} />
    </StoreProvider>
  );
}
