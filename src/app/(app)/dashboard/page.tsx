"use client";

import { useMemo, useState, useEffect } from "react";
import type { Titulo, Cliente, Disparo } from "@/types";
import { useStore } from "@/lib/store";
import { brl, fmtDate } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const formatInputDate = (date: Date) => date.toISOString().split("T")[0];

const parseLocalDate = (value: string | null) => {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
};

export default function DashboardPage() {
  const { addToast } = useStore();
  const now = new Date();
  const [dataInicio, setDataInicio] = useState(() => formatInputDate(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [dataFim, setDataFim] = useState(() => formatInputDate(now));
  const [carregando, setCarregando] = useState(true);
  const [titulosData, setTitulosData] = useState<Titulo[]>([]);
  const [clientesData, setClientesData] = useState<Cliente[]>([]);
  const [disparosData, setDisparosData] = useState<Disparo[]>([]);

  // Carregar dados do Atlas ao montar o componente (mesma lógica da página Títulos)
  useEffect(() => {
    const carregarDados = async () => {
      try {
        setCarregando(true);
        
        // Buscar títulos
        const resTitulos = await apiFetch("/api/titulos");
        if (resTitulos.ok) {
          const titulosData = await resTitulos.json();
          setTitulosData(titulosData);
        }

        // Buscar clientes
        const resClientes = await apiFetch("/api/clientes");
        if (resClientes.ok) {
          const clientesData = await resClientes.json();
          setClientesData(clientesData);
        }

        // Buscar disparos
        const resDisparos = await apiFetch("/api/disparos");
        if (resDisparos.ok) {
          const disparosData = await resDisparos.json();
          setDisparosData(disparosData);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        addToast("Erro ao carregar dados do servidor", "error");
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, [addToast]);

  const getClienteNome = useMemo(() => {
    const mapa = new Map<string, string>();
    clientesData.forEach(c => mapa.set(c.id, c.nome));
    return mapa;
  }, [clientesData]);

  const titulosFiltrados = useMemo(() => {
    if (!dataInicio && !dataFim) return titulosData;
    const fonte = titulosData;
    if (!fonte.length) return [] as Titulo[];
    const filtrados = fonte.filter(t => {
      if (!t.createdAt) return true;
      const tituloDate = new Date(t.createdAt);

      const inicio = parseLocalDate(dataInicio);
      if (inicio) inicio.setHours(0, 0, 0, 0);

      const fim = parseLocalDate(dataFim);
      if (fim) fim.setHours(23, 59, 59, 999);

      if (inicio && tituloDate < inicio) return false;
      if (fim && tituloDate > fim) return false;
      return true;
    });
    return filtrados;
  }, [titulosData, dataInicio, dataFim]);

  const stats = useMemo(() => {
    const somaStatus = (status: Titulo["status"]) =>
      titulosFiltrados.reduce((acc, titulo) =>
        titulo.status === status ? acc + Number(titulo.total || 0) : acc
      , 0);

    const emAberto = somaStatus("ABERTO");
    const vencidos = somaStatus("VENCIDO");
    const recebido = somaStatus("RECEBIDO");
    const negociado = somaStatus("NEGOCIADO");
    const total = titulosFiltrados.reduce((acc, titulo) => acc + Number(titulo.total || 0), 0);
    const taxa = total > 0 ? ((recebido / total) * 100).toFixed(1) : "0.0";
    const disparosEnviados = disparosData.filter(d => d.status === "ENVIADO").length;

    const donutData = [
      { name: "Aberto", value: emAberto, color: "#3B82F6" },
      { name: "Vencido", value: vencidos, color: "#EF4444" },
      { name: "Recebido", value: recebido, color: "#10B981" },
      { name: "Negociado", value: negociado, color: "#8B5CF6" },
    ];

    const topAtraso = [...titulosFiltrados]
      .filter(t => t.diasAtraso > 0)
      .sort((a, b) => Number(b.total || 0) - Number(a.total || 0))
      .slice(0, 5);

    const inicio = parseLocalDate(dataInicio);
    const fim = parseLocalDate(dataFim);
    const serieTemporal: { dia: string; recebido: number; aberto: number }[] = [];
    if (inicio && fim) {
      for (let dt = new Date(inicio); dt <= fim; dt.setDate(dt.getDate() + 1)) {
        const key = fmtDate(dt.toISOString());
        const dailyRecebido = titulosFiltrados
          .filter(t => t.status === "RECEBIDO" && t.createdAt?.startsWith(dt.toISOString().split("T")[0]))
          .reduce((acc, titulo) => acc + Number(titulo.total || 0), 0);
        const dailyAberto = titulosFiltrados
          .filter(t => ["ABERTO", "VENCIDO"].includes(t.status) && t.createdAt?.startsWith(dt.toISOString().split("T")[0]))
          .reduce((acc, titulo) => acc + Number(titulo.total || 0), 0);
        serieTemporal.push({ dia: key, recebido: dailyRecebido, aberto: dailyAberto });
      }
    }

    const lineData = serieTemporal.length ? serieTemporal : [{ dia: "-", recebido: 0, aberto: 0 }];

    const rangeValue = (min: number, max: number) =>
      titulosFiltrados.reduce((acc, titulo) =>
        titulo.diasAtraso > min && titulo.diasAtraso <= max ? acc + Number(titulo.total || 0) : acc
      , 0);

    const barData = [
      { faixa: "0–7d", valor: rangeValue(0, 7), fill: "#F59E0B" },
      { faixa: "8–15d", valor: rangeValue(7, 15), fill: "#F97316" },
      { faixa: "16–30d", valor: rangeValue(15, 30), fill: "#EF4444" },
      { faixa: "30+d", valor: titulosFiltrados.reduce((acc, titulo) => titulo.diasAtraso > 30 ? acc + Number(titulo.total || 0) : acc, 0), fill: "#991B1B" },
    ];

    return { emAberto, vencidos, recebido, taxa, disparosEnviados, donutData, topAtraso, lineData, barData };
  }, [titulosFiltrados, disparosData, dataInicio, dataFim]);

  const kpis = [
    { label: "Em Aberto", value: brl(stats.emAberto), color: "#1D4ED8", bg: "#EFF6FF", icon: "📋" },
    { label: "Total Vencido", value: brl(stats.vencidos), color: "#B91C1C", bg: "#FEF2F2", icon: "⚠️" },
    { label: "Recebido no mês", value: brl(stats.recebido), color: "#065F46", bg: "#ECFDF5", icon: "✅" },
    { label: "Taxa Recuperação", value: `${stats.taxa}%`, color: "#6D28D9", bg: "#F5F3FF", icon: "📈" },
    { label: "Títulos totais", value: titulosData.length, color: "#0369A1", bg: "#F0F9FF", icon: "🗂" },
    { label: "Disparos enviados", value: stats.disparosEnviados, color: "#92400E", bg: "#FFFBEB", icon: "💬" },
  ];

  return (
    <div style={{ maxWidth: 1300 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0 }}>Dashboard</h1>
        <p style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>Visão geral da carteira de cobrança — Fevereiro 2026</p>
      </div>

      {/* FILTROS DE DATA */}
      <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #E2E8F0", marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Filtrar período:</div>
          <label style={{ display: "flex", flexDirection: "column", fontSize: 11, fontWeight: 600, color: "#475569" }}>
            Início
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontSize: 13, minWidth: 160 }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", fontSize: 11, fontWeight: 600, color: "#475569" }}>
            Fim
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontSize: 13, minWidth: 160 }} />
          </label>
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#94A3B8" }}>
            {titulosFiltrados.length} títulos no período
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14, marginBottom: 24 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #F1F5F9" }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>{k.icon}</div>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* CHARTS ROW 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #F1F5F9" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 16 }}>Evolução da Carteira (Fev/2026)</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#94A3B8" }} />
              <YAxis tickFormatter={v => `${(Number(v)/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#94A3B8" }} />
              <Tooltip formatter={(v) => brl(Number(v))} />
              <Legend />
              <Line type="monotone" dataKey="recebido" stroke="#10B981" strokeWidth={2.5} dot={false} name="Recebido" />
              <Line type="monotone" dataKey="aberto" stroke="#3B82F6" strokeWidth={2.5} dot={false} name="Em aberto" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #F1F5F9" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 16 }}>Status dos Títulos</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stats.donutData} innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                {stats.donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v) => brl(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {stats.donutData.map(d => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, display: "inline-block" }} />
                <span style={{ color: "#64748B" }}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CHARTS ROW 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #F1F5F9" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 16 }}>Atrasos por Faixa (R$)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.barData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="faixa" tick={{ fontSize: 11, fill: "#94A3B8" }} />
              <YAxis tickFormatter={v => `${(Number(v)/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#94A3B8" }} />
              <Tooltip formatter={(v) => brl(Number(v))} />
              <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                {stats.barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #F1F5F9" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 14 }}>Top Atrasos</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.topAtraso.map((t, i) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: "#F8FAFC" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: i < 2 ? "#FEE2E2" : "#FEF3C7", color: i < 2 ? "#B91C1C" : "#92400E", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {getClienteNome.get(t.clienteId) ?? "—"}
                </div>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>{t.diasAtraso}d em atraso</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#B91C1C", whiteSpace: "nowrap" }}>{brl(t.total)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
