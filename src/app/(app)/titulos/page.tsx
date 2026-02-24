"use client";

import { useMemo, useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { brl, fmtDate } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { buildMensagemCobranca } from "@/lib/templates";
import type { Titulo } from "@/types";

type GrupoCliente = {
  clienteId: string;
  clienteNome: string;
  clienteTelefone?: string | null;
  titulos: Titulo[];
  totalPrincipal: number;
  totalJuros: number;
  totalGeral: number;
  ultimoDisparo: string | null;
  maiorAtraso: number;
};

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; color: string; dot: string }> = {
    ABERTO: { label: "Aberto", bg: "#DBEAFE", color: "#1D4ED8", dot: "#3B82F6" },
    VENCIDO: { label: "Vencido", bg: "#FEE2E2", color: "#B91C1C", dot: "#EF4444" },
    RECEBIDO: { label: "Recebido", bg: "#D1FAE5", color: "#065F46", dot: "#10B981" },
    NEGOCIADO: { label: "Negociado", bg: "#EDE9FE", color: "#5B21B6", dot: "#8B5CF6" },
    CANCELADO: { label: "Cancelado", bg: "#F3F4F6", color: "#374151", dot: "#9CA3AF" },
  };
  const c = cfg[status] ?? cfg.ABERTO;
  return (
    <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, display: "inline-block" }} />
      {c.label}
    </span>
  );
}

function Modal({ open, onClose, title, children, width = 520 }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "#fff", borderRadius: 16, boxShadow: "0 25px 50px rgba(0,0,0,0.18)", width, maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto", padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#0F172A" }}>{title}</div>
          <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "#64748B", display: "flex" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", border: "1px solid #E2E8F0", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#334155", outline: "none", background: "#fff", boxSizing: "border-box" };

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 5, display: "block" }}>{label}</label>
      {children}
    </div>
  );
}

function BaixarModal({ open, titulo, onClose, onConfirm }: { open: boolean; titulo: Titulo | null; onClose: () => void; onConfirm: (data: { valorRecebido: string; data: string; forma: string; observacao: string; parcial: boolean }) => void }) {
  const [form, setForm] = useState({ valorRecebido: "", data: new Date().toISOString().split("T")[0], forma: "PIX", observacao: "", parcial: false });
  if (!open || !titulo) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.valorRecebido) return;
    onConfirm(form);
    setForm({ valorRecebido: "", data: new Date().toISOString().split("T")[0], forma: "PIX", observacao: "", parcial: false });
  };

  return (
    <Modal open={open} onClose={onClose} title="Lançar Recebimento" width={480}>
      <div style={{ marginBottom: 14, background: "#F8FAFC", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
        <div style={{ fontWeight: 600, color: "#0F172A" }}>{titulo.numeroNF}</div>
        <div style={{ color: "#64748B" }}>Total: <strong style={{ color: "#0F172A" }}>{brl(titulo.total)}</strong></div>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <FormField label="Valor Recebido (R$)">
          <input type="number" step="0.01" placeholder={String(titulo.total)} value={form.valorRecebido} onChange={e => setForm(p => ({ ...p, valorRecebido: e.target.value }))} required style={inputStyle} />
        </FormField>
        <FormField label="Data do Recebimento">
          <input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} required style={inputStyle} />
        </FormField>
        <FormField label="Forma de Pagamento">
          <select value={form.forma} onChange={e => setForm(p => ({ ...p, forma: e.target.value }))} style={inputStyle}>
            {["PIX", "DINHEIRO", "BOLETO", "TRANSFERENCIA", "OUTRO"].map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </FormField>
        <FormField label="Observação (opcional)">
          <input type="text" value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} style={inputStyle} placeholder="Ex: comprovante enviado" />
        </FormField>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
          <input type="checkbox" checked={form.parcial} onChange={e => setForm(p => ({ ...p, parcial: e.target.checked }))} />
          Recebimento parcial (manter como VENCIDO)
        </label>
        <button type="submit" style={{ background: "#1E40AF", color: "#fff", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          Confirmar Recebimento
        </button>
      </form>
    </Modal>
  );
}

const STATUS_OPTIONS = ["ABERTO", "VENCIDO", "RECEBIDO", "NEGOCIADO", "CANCELADO"] as const;

export default function TitulosPage() {
  const { titulos, titulosLembretes, titulosCobranca, setTitulos, setClientes, getCliente, addToast, templates } = useStore();
  const [aba, setAba] = useState<"TITULOS" | "LEMBRETES" | "FATURADOS">("TITULOS");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [filterFaixa, setFilterFaixa] = useState("TODAS");
  const [grupoDetalhe, setGrupoDetalhe] = useState<GrupoCliente | null>(null);
  const [disparoCliente, setDisparoCliente] = useState<GrupoCliente | null>(null);
  const [baixarTitulo, setBaixarTitulo] = useState<Titulo | null>(null);
  const [disparandoLote, setDisparandoLote] = useState(false);
  const [enviandoIndividual, setEnviandoIndividual] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [limpandoTela, setLimpandoTela] = useState(false);
  const [editingTitulo, setEditingTitulo] = useState<Titulo | null>(null);
  const [editForm, setEditForm] = useState({
    numeroNF: "",
    numeroTitulo: "",
    valorPrincipal: "",
    juros: "",
    vencimento: "",
    status: "ABERTO",
  });
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null);
  const [editClienteForm, setEditClienteForm] = useState({
    nome: "",
    telefone: "",
  });
  const [anexos, setAnexos] = useState<File[]>([]);
  const hojeInput = () => new Date().toISOString().split("T")[0];
  const [fatForm, setFatForm] = useState({
    nome: "",
    dataFaturamento: hojeInput(),
    dataVencimento: hojeInput(),
    valor: "",
    telefone: "",
    agendarEmDias: 0,
  });
  const [fatSalvando, setFatSalvando] = useState(false);
  const [fatAnexos, setFatAnexos] = useState<File[]>([]);

  const templateVencido = templates.find(t => t.nome === "Vencido")?.nome ?? templates[0]?.nome ?? "Vencido";
  const templateLembrete = templates.find(t => t.nome === "1º Aviso")?.nome ?? templateVencido;
  const templatePadrao = aba === "LEMBRETES" ? templateLembrete : templateVencido;

  // Carregar dados do Atlas ao montar o componente
  useEffect(() => {
    const carregarDados = async () => {
      try {
        setCarregando(true);
        
        // Buscar títulos
        const resTitulos = await apiFetch("/api/titulos");
        if (resTitulos.ok) {
          const titulosData = await resTitulos.json();
          setTitulos(titulosData);
        }

        // Buscar clientes
        const resClientes = await apiFetch("/api/clientes");
        if (resClientes.ok) {
          const clientesData = await resClientes.json();
          setClientes(clientesData);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        addToast("Erro ao carregar dados do servidor", "error");
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, [setTitulos, setClientes, addToast]);

  // Use the appropriate titles list based on the selected tab
  const currentTitulos = aba === "LEMBRETES" ? titulosLembretes : titulosCobranca;

  const filteredTitulos = useMemo(() => currentTitulos.filter(t => {
    const c = getCliente(t.clienteId);
    const matchSearch = !search || c.nome.toLowerCase().includes(search.toLowerCase()) || t.numeroNF.includes(search) || (t.numeroTitulo ?? "").includes(search);
    const matchStatus = filterStatus === "TODOS" || t.status === filterStatus;
    const matchFaixa = filterFaixa === "TODAS" || (
      filterFaixa === "0-7" ? t.diasAtraso > 0 && t.diasAtraso <= 7 :
      filterFaixa === "8-15" ? t.diasAtraso >= 8 && t.diasAtraso <= 15 :
      filterFaixa === "16-30" ? t.diasAtraso >= 16 && t.diasAtraso <= 30 :
      filterFaixa === "30+" ? t.diasAtraso > 30 : true
    );
    return matchSearch && matchStatus && matchFaixa;
  }), [currentTitulos, search, filterStatus, filterFaixa, getCliente]);

  const gruposPorCliente = useMemo<GrupoCliente[]>(() => {
    const agrupado = new Map<string, Titulo[]>();
    filteredTitulos.forEach(titulo => {
      const atuais = agrupado.get(titulo.clienteId) ?? [];
      agrupado.set(titulo.clienteId, [...atuais, titulo]);
    });

    return Array.from(agrupado.entries()).map(([clienteId, lista]) => {
      const cliente = getCliente(clienteId);
      const ordenados = [...lista].sort((a, b) => {
        if (a.vencimento && b.vencimento) {
          return new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime();
        }
        return a.numeroNF.localeCompare(b.numeroNF);
      });

      const totalPrincipal = ordenados.reduce((sum, t) => sum + t.valorPrincipal, 0);
      const totalJuros = ordenados.reduce((sum, t) => sum + t.juros, 0);
      const totalGeral = ordenados.reduce((sum, t) => sum + t.total, 0);
      const ultimoDisparo = ordenados.reduce<string | null>((latest, t) => {
        if (!t.ultimoDisparo) return latest;
        if (!latest) return t.ultimoDisparo;
        return new Date(t.ultimoDisparo) > new Date(latest) ? t.ultimoDisparo : latest;
      }, null);
      const maiorAtraso = ordenados.reduce((max, t) => Math.max(max, t.diasAtraso ?? 0), 0);

      return {
        clienteId,
        clienteNome: cliente.nome,
        clienteTelefone: cliente.telefone,
        titulos: ordenados,
        totalPrincipal,
        totalJuros,
        totalGeral,
        ultimoDisparo,
        maiorAtraso,
      };
    });
  }, [filteredTitulos, getCliente]);

  const vencidosParaDisparo = useMemo(() => {
    const grupos = gruposPorCliente.filter(grupo => 
      grupo.titulos.some(t => t.status === "VENCIDO" || t.status === "ABERTO")
    );
    return grupos;
  }, [gruposPorCliente]);

  const handleBaixar = (data: { valorRecebido: string; parcial: boolean }) => {
    if (!baixarTitulo) return;
    const novoStatus = (!data.parcial && parseFloat(data.valorRecebido) >= baixarTitulo.total) ? "RECEBIDO" as const : baixarTitulo.status;
    setTitulos(prev => prev.map(t => t.id === baixarTitulo.id ? { ...t, status: novoStatus } : t));
    addToast(novoStatus === "RECEBIDO" ? "Título baixado como RECEBIDO! ✅" : "Recebimento parcial lançado.");
    setBaixarTitulo(null);
  };

  const sincronizarTitulos = async () => {
    try {
      const res = await apiFetch("/api/titulos");
      if (!res.ok) throw new Error("Não foi possível atualizar os títulos");
      const titulosApi: Titulo[] = await res.json();
      setTitulos(() => titulosApi);
    } catch (error) {
      console.error("sync titulos", error);
      addToast(error instanceof Error ? error.message : "Erro ao sincronizar títulos", "error");
    }
  };

  const sincronizarClientes = async () => {
    try {
      const res = await apiFetch("/api/clientes");
      if (!res.ok) throw new Error("Não foi possível atualizar os clientes");
      const clientesApi = await res.json();
      setClientes(() => clientesApi);
    } catch (error) {
      console.error("sync clientes", error);
      addToast(error instanceof Error ? error.message : "Erro ao sincronizar clientes", "error");
    }
  };

  const iniciarEdicao = (titulo: Titulo) => {
    const vencimentoInput =
      titulo.vencimento ? new Date(titulo.vencimento).toISOString().split("T")[0] : "";
    setEditingTitulo(titulo);
    setEditForm({
      numeroNF: titulo.numeroNF,
      numeroTitulo: titulo.numeroTitulo ?? "",
      valorPrincipal: String(titulo.valorPrincipal ?? 0),
      juros: String(titulo.juros ?? 0),
      vencimento: vencimentoInput,
      status: titulo.status,
    });
    if (grupoDetalhe) {
      setEditingClienteId(grupoDetalhe.clienteId);
      setEditClienteForm({
        nome: grupoDetalhe.clienteNome,
        telefone: grupoDetalhe.clienteTelefone ?? "",
      });
    }
  };

  const cancelarEdicao = () => {
    setEditingTitulo(null);
    setEditForm({
      numeroNF: "",
      numeroTitulo: "",
      valorPrincipal: "",
      juros: "",
      vencimento: "",
      status: "ABERTO",
    });
    setEditingClienteId(null);
    setEditClienteForm({
      nome: "",
      telefone: "",
    });
  };

  const salvarEdicaoTitulo = async () => {
    if (!editingTitulo) return;

    try {
      setSalvandoEdicao(true);

      const valorPrincipal = Number(editForm.valorPrincipal) || 0;
      const juros = Number(editForm.juros) || 0;
      const total = valorPrincipal + juros;

      if (!editForm.numeroNF.trim() || !valorPrincipal) {
        addToast("Preencha NF e valor", "error");
        setSalvandoEdicao(false);
        return;
      }

      const diasAtraso = (() => {
        if (!editForm.vencimento) return 0;
        const hoje = new Date();
        const venc = new Date(editForm.vencimento);
        const diff = Math.floor(
          (hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24)
        );
        return diff > 0 ? diff : 0;
      })();

      const payloadTitulo = {
        numeroNF: editForm.numeroNF.trim(),
        numeroTitulo: editForm.numeroTitulo.trim() || undefined,
        valorPrincipal,
        juros,
        total,
        diasAtraso,
        vencimento: editForm.vencimento
          ? new Date(editForm.vencimento).toISOString()
          : undefined,
        status: editForm.status,
      };

      // Atualizar cliente (cabeçalho) se estivermos com um cliente em edição
      if (editingClienteId && editClienteForm.nome.trim()) {
        const payloadCliente = {
          nome: editClienteForm.nome.trim(),
          telefone: editClienteForm.telefone.trim() || undefined,
        };
        const resCliente = await apiFetch(`/api/clientes/${editingClienteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadCliente),
        });
        const dataCliente = await resCliente.json().catch(() => ({}));
        if (!resCliente.ok) {
          throw new Error((dataCliente as any)?.error ?? "Erro ao atualizar cliente");
        }
      }

      const resTitulo = await apiFetch(`/api/titulos/${editingTitulo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadTitulo),
      });

      const dataTitulo = await resTitulo.json().catch(() => ({}));
      if (!resTitulo.ok) {
        throw new Error((dataTitulo as any)?.error ?? "Erro ao atualizar título");
      }

      await Promise.all([sincronizarTitulos(), sincronizarClientes()]);
      addToast("Título atualizado com sucesso!");
      cancelarEdicao();
      setGrupoDetalhe(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao salvar alterações";
      addToast(message, "error");
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const dispararIndividual = async () => {
    if (!disparoCliente || enviandoIndividual) return;
    const tituloBase = disparoCliente.titulos[0];
    if (!tituloBase) {
      addToast("Cliente sem títulos disponíveis", "error");
      return;
    }

    setEnviandoIndividual(true);
    try {
      const anexosPayload =
        anexos.length > 0
          ? await Promise.all(
              anexos.slice(0, 5).map(async (file) => {
                const base64 = await fileToBase64(file);
                const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
                return {
                  document: base64,
                  fileName: file.name,
                  extension: ext,
                };
              })
            )
          : [];

      const res = await apiFetch("/api/disparos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tituloId: tituloBase.id,
          template: templatePadrao,
          anexos: anexosPayload,
        }),
      });
      const data = await res.json();

      if (!res.ok || data?.ok === false) {
        addToast(data?.error || "Falha ao enviar via Z-API", "error");
      } else {
        addToast("Mensagem enviada via Z-API! ✅");
        await sincronizarTitulos();
        fecharDisparoModal();
      }
    } catch (error) {
      console.error("erro disparo individual", error);
      addToast("Erro ao enviar mensagem", "error");
    } finally {
      setEnviandoIndividual(false);
    }
  };

  const dispararLote = async () => {
    if (disparandoLote || vencidosParaDisparo.length === 0) {
      addToast("Nenhum título vencido selecionado.", "error");
      return;
    }

    const templateSelecionado =
      templates.find(t => t.nome === "Vencido")?.nome ?? templates[0]?.nome ?? "Vencido";

    setDisparandoLote(true);
    let sucesso = 0;
    let falhas = 0;

    for (const grupo of vencidosParaDisparo) {
      const tituloBase = grupo.titulos[0];
      if (!tituloBase) continue;
      try {
        const res = await apiFetch("/api/disparos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tituloId: tituloBase.id, template: templateSelecionado }),
        });
        const data = await res.json();
        if (!res.ok || data?.ok === false) {
          falhas++;
        } else {
          sucesso++;
        }
      } catch (error) {
        console.error("erro lote", error);
        falhas++;
      }
    }

    addToast(`Lote: ${sucesso} enviados, ${falhas} falhas${falhas ? " ⚠️" : " ✅"}`);
    await sincronizarTitulos();
    setDisparandoLote(false);
  };

  const limparTela = async () => {
    if (!titulos.length) {
      addToast("Não há dados para limpar.", "info");
      return;
    }

    const datasImportacao = Array.from(new Set(
      titulos
        .map(t => (t.dataReferenciaImportacao ?? t.createdAt ?? "").split("T")[0])
        .filter(Boolean)
    ));

    if (!datasImportacao.length) {
      addToast("Não foi possível identificar a data de importação para limpeza.", "error");
      return;
    }

    const mensagemDatas = datasImportacao
      .map(data => fmtDate(data))
      .join(" / ");
    const confirma = confirm(
      `Tem certeza que deseja remover definitivamente os dados importados em ${mensagemDatas}?\n\nEssa ação excluirá os títulos e clientes correspondentes no Atlas e não poderá ser desfeita.`
    );
    if (!confirma) return;

    setLimpandoTela(true);
    try {
      let totalTitulos = 0;
      let totalClientes = 0;

      for (const dataISO of datasImportacao) {
        const res = await apiFetch(`/api/importar?data=${dataISO}`, { method: "DELETE" });
        const resultado = await res.json();
        totalTitulos += resultado.deletedTitulos ?? 0;
        totalClientes += resultado.deletedClientes ?? 0;
      }

      setTitulos(() => []);
      setClientes(() => []);
      await Promise.all([sincronizarTitulos(), sincronizarClientes()]);
      addToast(`🗑️ Removidos ${totalTitulos} títulos e ${totalClientes} cliente(s) do Atlas.`);
    } catch (error) {
      console.error("Erro ao limpar dados do Atlas:", error);
      addToast("Erro ao limpar dados do servidor", "error");
    } finally {
      setLimpandoTela(false);
    }
  };

  const fecharDisparoModal = () => {
    setDisparoCliente(null);
    setAnexos([]);
  };

  const handleArquivosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f =>
      f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (!files.length) {
      setAnexos([]);
      return;
    }
    if (files.length > 5) {
      addToast("Você pode anexar no máximo 5 PDFs.", "error");
    }
    setAnexos(files.slice(0, 5));
  };

  const fileToBase64 = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          resolve(result);
        } else {
          reject(new Error("Erro ao ler arquivo"));
        }
      };
      reader.onerror = () => reject(reader.error || new Error("Erro ao ler arquivo"));
      reader.readAsDataURL(file);
    });
  };

  const handleFatArquivosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f =>
      f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (!files.length) {
      setFatAnexos([]);
      return;
    }
    if (files.length > 5) {
      addToast("Você pode anexar no máximo 5 PDFs.", "error");
    }
    setFatAnexos(files.slice(0, 5));
  };

  const enviarFaturamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fatSalvando) return;

    try {
      setFatSalvando(true);
      const valorNumber = Number(fatForm.valor.toString().replace(",", ".")) || 0;
      if (!fatForm.nome.trim() || !valorNumber || !fatForm.telefone.trim()) {
        addToast("Preencha nome, valor e telefone.", "error");
        setFatSalvando(false);
        return;
      }

      const anexosPayload =
        fatAnexos.length > 0
          ? await Promise.all(
              fatAnexos.slice(0, 5).map(async (file) => {
                const base64 = await fileToBase64(file);
                const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
                return {
                  document: base64,
                  fileName: file.name,
                  extension: ext,
                };
              })
            )
          : [];

      const res = await apiFetch("/api/faturamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: fatForm.nome.trim(),
          telefone: fatForm.telefone.trim(),
          dataFaturamento: fatForm.dataFaturamento,
          dataVencimento: fatForm.dataVencimento,
          valor: valorNumber,
          agendarEmDias: Number(fatForm.agendarEmDias) || 0,
          anexos: anexosPayload,
        }),
      });
      const data = await res.json();

      if (!res.ok || data?.ok === false) {
        addToast(data?.error || "Falha ao enviar faturamento via Z-API", "error");
      } else {
        addToast("Faturamento registrado e mensagem enviada via Z-API! ✅");
        setFatForm({
          nome: "",
          dataFaturamento: hojeInput(),
          dataVencimento: hojeInput(),
          valor: "",
          telefone: "",
          agendarEmDias: fatForm.agendarEmDias,
        });
        setFatAnexos([]);
      }
    } catch (error) {
      console.error("erro faturamento", error);
      addToast("Erro ao enviar faturamento", "error");
    } finally {
      setFatSalvando(false);
    }
  };

  const tituloPagina =
    aba === "LEMBRETES"
      ? "Lembretes de vencimento"
      : aba === "FATURADOS"
      ? "Faturados do dia"
      : "Títulos em cobrança";

  return (
    <div>
      {/* ABAS INTERNAS */}
      <div style={{ display: "flex", gap: 0, marginBottom: 18, background: "#F1F5F9", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {[
          { id: "TITULOS" as const, label: "Títulos" },
          { id: "LEMBRETES" as const, label: "Lembretes" },
          { id: "FATURADOS" as const, label: "Faturados do dia" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setAba(tab.id)}
            style={{
              background: aba === tab.id ? "#fff" : "transparent",
              border: "none",
              borderRadius: 8,
              padding: "7px 20px",
              fontSize: 13,
              fontWeight: 600,
              color: aba === tab.id ? "#0F172A" : "#64748B",
              cursor: "pointer",
              boxShadow: aba === tab.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {aba === "FATURADOS" ? (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 10 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0 }}>{tituloPagina}</h1>
              <p style={{ color: "#64748B", fontSize: 13, marginTop: 2 }}>Envie mensagem de faturamento com nota fiscal e boleto em anexo.</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)", gap: 24, alignItems: "flex-start" }}>
            {/* FORMULÁRIO */}
            <form onSubmit={enviarFaturamento} style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0F172A" }}>Dados do faturamento</h2>
              <FormField label="Nome do cliente">
                <input
                  value={fatForm.nome}
                  onChange={e => setFatForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: João da Silva"
                  style={inputStyle}
                />
              </FormField>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                <FormField label="Data do faturamento">
                  <input
                    type="date"
                    value={fatForm.dataFaturamento}
                    onChange={e => setFatForm(p => ({ ...p, dataFaturamento: e.target.value }))}
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Data de vencimento">
                  <input
                    type="date"
                    value={fatForm.dataVencimento}
                    onChange={e => setFatForm(p => ({ ...p, dataVencimento: e.target.value }))}
                    style={inputStyle}
                  />
                </FormField>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                <FormField label="Valor (R$)">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={fatForm.valor}
                    onChange={e => setFatForm(p => ({ ...p, valor: e.target.value }))}
                    placeholder="Ex: 15000"
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Telefone (WhatsApp)">
                  <input
                    value={fatForm.telefone}
                    onChange={e => setFatForm(p => ({ ...p, telefone: e.target.value }))}
                    placeholder="Ex: 5566999999999"
                    style={inputStyle}
                  />
                </FormField>
              </div>
              <FormField label="Enviar lembrete automático em (dias)">
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={fatForm.agendarEmDias}
                  onChange={e => setFatForm(p => ({ ...p, agendarEmDias: Number(e.target.value) }))}
                  style={inputStyle}
                />
              </FormField>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px dashed #93C5FD",
                    background: "#EFF6FF",
                    color: "#1D4ED8",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <span>📎 Anexar PDFs (nota e boleto)</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    onChange={handleFatArquivosChange}
                    style={{ display: "none" }}
                  />
                </label>
                {fatAnexos.length > 0 && (
                  <div style={{ fontSize: 11, color: "#64748B", textAlign: "right" }}>
                    {fatAnexos.length} PDF(s) selecionado(s)
                  </div>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => {
                    setFatForm({
                      nome: "",
                      dataFaturamento: hojeInput(),
                      dataVencimento: hojeInput(),
                      valor: "",
                      telefone: "",
                      agendarEmDias: fatForm.agendarEmDias,
                    });
                    setFatAnexos([]);
                  }}
                  style={{
                    border: "none",
                    background: "#F1F5F9",
                    color: "#475569",
                    borderRadius: 10,
                    padding: "9px 18px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Limpar
                </button>
                <button
                  type="submit"
                  disabled={fatSalvando}
                  style={{
                    border: "none",
                    background: fatSalvando ? "#93C5FD" : "#2563EB",
                    color: "#fff",
                    borderRadius: 10,
                    padding: "9px 22px",
                    fontWeight: 700,
                    cursor: fatSalvando ? "not-allowed" : "pointer",
                  }}
                >
                  {fatSalvando ? "Enviando..." : "Enviar agora"}
                </button>
              </div>
            </form>

            {/* PRÉVIA */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0F172A" }}>Prévia da mensagem</h2>
              <div
                style={{
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  borderRadius: 10,
                  padding: 14,
                  fontSize: 13,
                  color: "#166534",
                  minHeight: 160,
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    fontFamily: "inherit",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
{`Olá, aqui é da empresa Força Agrícola :)

Obrigado pela sua compra!

Informamos que o pagamento vence em ${fatForm.dataVencimento || "___"}, no valor de R$ ${fatForm.valor || "___"}.
Segue em anexo a nota fiscal e o boleto.

Ficamos à disposição em caso de dúvidas.

Atenciosamente,
Equipe Financeira`}
                </pre>
              </div>
              <div style={{ fontSize: 12, color: "#64748B" }}>
                Lembrete automático:{" "}
                {fatForm.agendarEmDias && fatForm.agendarEmDias > 0
                  ? `em ${fatForm.agendarEmDias} dia(s) após ${fatForm.dataFaturamento || "___"}, às 09:00 (horário de Brasília)`
                  : "desativado"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0 }}>{tituloPagina}</h1>
              <p style={{ color: "#64748B", fontSize: 13, marginTop: 2 }}>{filteredTitulos.length} títulos em {gruposPorCliente.length} clientes</p>
            </div>
            <button
              onClick={dispararLote}
              disabled={disparandoLote || vencidosParaDisparo.length === 0}
              style={{
                background: disparandoLote ? "#a855f7" : vencidosParaDisparo.length === 0 ? "#cbd5f5" : "#7C3AED",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "10px 22px",
                fontWeight: 700,
                fontSize: 13,
                cursor: disparandoLote || vencidosParaDisparo.length === 0 ? "not-allowed" : "pointer",
                boxShadow: "0 10px 20px rgba(124,58,237,0.2)",
                transition: "background 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {disparandoLote ? "Disparando..." : `📱 Disparar Lote (${vencidosParaDisparo.length})`}
            </button>
          </div>

      {/* FILTERS */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: "6px 12px", flex: 1, minWidth: 200, maxWidth: 300 }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "#94A3B8" }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente, NF..." style={{ border: "none", outline: "none", fontSize: 13, background: "none", width: "100%", color: "#334155" }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#334155", background: "#fff", outline: "none" }}>
          <option value="TODOS">Todos os status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterFaixa} onChange={e => setFilterFaixa(e.target.value)} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#334155", background: "#fff", outline: "none" }}>
          <option value="TODAS">Todas as faixas</option>
          <option value="0-7">0–7 dias</option>
          <option value="8-15">8–15 dias</option>
          <option value="16-30">16–30 dias</option>
          <option value="30+">30+ dias</option>
        </select>
        <button
          onClick={limparTela}
          disabled={limpandoTela}
          style={{
            border: "1px solid #FCA5A5",
            borderRadius: 10,
            background: limpandoTela ? "#FECACA" : "#FFF1F2",
            color: limpandoTela ? "#f87171" : "#B91C1C",
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 600,
            cursor: limpandoTela ? "not-allowed" : "pointer",
            opacity: limpandoTela ? 0.7 : 1,
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {limpandoTela ? (
            <>
              <span className="animate-pulse">⏳</span>
              Limpando...
            </>
          ) : (
            <>
              🧹 Limpar tela
            </>
          )}
        </button>
      </div>

      {/* TABLE */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                {["Cliente", "Telefone", "Títulos", "Valor Principal", "Juros", "Total", "Atraso", "Status", "Último Disparo", "Ações"].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: "11px 14px",
                      textAlign: "left",
                      fontWeight: 700,
                      color: "#475569",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gruposPorCliente.map((grupo, idx) => {
                const statusPrioridade = ["VENCIDO", "NEGOCIADO", "ABERTO", "RECEBIDO", "CANCELADO"];
                const statusPrincipal = statusPrioridade.find(status => grupo.titulos.some(t => t.status === status)) ?? grupo.titulos[0]?.status ?? "ABERTO";
                return (
                  <tr key={grupo.clienteId} style={{ borderBottom: "1px solid #F1F5F9", background: idx % 2 === 0 ? "#fff" : "#FAFBFC" }}>
                    <td style={{ padding: "11px 14px", fontWeight: 700, color: "#0F172A", minWidth: 160 }}>{grupo.clienteNome}</td>
                    <td style={{ padding: "11px 14px", color: "#64748B", whiteSpace: "nowrap" }}>{grupo.clienteTelefone ?? "—"}</td>
                    <td style={{ padding: "11px 14px", color: "#334155" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {grupo.titulos.map((titulo, index) => (
                          <div key={titulo.id} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 12 }}>
                            <span style={{ fontWeight: 600, color: "#1D4ED8", fontFamily: "monospace" }}>{index + 1}) {titulo.numeroNF}</span>
                            <span>Venc.: {fmtDate(titulo.vencimento)}</span>
                            <span>Valor: {brl(titulo.valorPrincipal)}</span>
                            <span>Juros: {brl(titulo.juros)}</span>
                            <span>Total: {brl(titulo.total)}</span>
                            <span>Atraso: {titulo.diasAtraso > 0 ? `${titulo.diasAtraso}d` : "—"}</span>
                            {titulo.status !== "RECEBIDO" && (
                              <button onClick={() => setBaixarTitulo(titulo)} style={{ border: "none", background: "#F5F3FF", color: "#5B21B6", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                                Baixar
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", fontWeight: 600 }}>{brl(grupo.totalPrincipal)}</td>
                    <td style={{ padding: "11px 14px", color: grupo.totalJuros > 0 ? "#B91C1C" : "#94A3B8" }}>{brl(grupo.totalJuros)}</td>
                    <td style={{ padding: "11px 14px", fontWeight: 700 }}>{brl(grupo.totalGeral)}</td>
                    <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                      {grupo.maiorAtraso > 0 ? (
                        <span style={{ color: grupo.maiorAtraso > 30 ? "#B91C1C" : grupo.maiorAtraso > 15 ? "#EA580C" : "#D97706", fontWeight: 600 }}>
                          {grupo.maiorAtraso}d
                        </span>
                      ) : (
                        <span style={{ color: "#10B981" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "11px 14px" }}><StatusBadge status={statusPrincipal} /></td>
                    <td style={{ padding: "11px 14px", color: "#94A3B8", fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(grupo.ultimoDisparo ?? undefined)}</td>
                    <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setGrupoDetalhe(grupo)} style={{ background: "#EFF6FF", color: "#1D4ED8", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Ver</button>
                        <button onClick={() => setDisparoCliente(grupo)} style={{ background: "#ECFDF5", color: "#065F46", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Disparar</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {gruposPorCliente.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>Nenhum cliente encontrado</div>}
      </div>

        </>
      )}

      {/* DETAIL MODAL */}
      <Modal open={!!grupoDetalhe} onClose={() => setGrupoDetalhe(null)} title={grupoDetalhe ? `Detalhes - ${grupoDetalhe.clienteNome}` : ""} width={560}>
        {grupoDetalhe && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#F8FAFC", borderRadius: 10, padding: 12, fontSize: 13, color: "#475569" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 4 }}>
                {editingTitulo ? (
                  <input
                    value={editClienteForm.nome}
                    onChange={e => setEditClienteForm(p => ({ ...p, nome: e.target.value }))}
                    style={{ ...inputStyle, maxWidth: 260, fontWeight: 700, color: "#0F172A" }}
                  />
                ) : (
                  <div style={{ fontWeight: 700, color: "#0F172A" }}>{grupoDetalhe.clienteNome}</div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div>
                  <span>Telefone: </span>
                  {editingTitulo ? (
                    <input
                      value={editClienteForm.telefone}
                      onChange={e => setEditClienteForm(p => ({ ...p, telefone: e.target.value }))}
                      placeholder="Telefone com DDD"
                      style={{ ...inputStyle, maxWidth: 220, display: "inline-block" }}
                    />
                  ) : (
                    <span>{grupoDetalhe.clienteTelefone ?? "—"}</span>
                  )}
                </div>
                <div>
                  Total aberto: <strong>{brl(grupoDetalhe.totalGeral)}</strong> ({grupoDetalhe.titulos.length} títulos)
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {grupoDetalhe.titulos.map(titulo => {
                const isEditing = editingTitulo?.id === titulo.id;
                const valorEdit = Number(editForm.valorPrincipal || 0);
                const jurosEdit = Number(editForm.juros || 0);
                const totalEdit = valorEdit + jurosEdit;
                const diasAtrasoEdit = (() => {
                  if (!isEditing || !editForm.vencimento) return titulo.diasAtraso;
                  const hoje = new Date();
                  const venc = new Date(editForm.vencimento);
                  const diff = Math.floor(
                    (hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return diff > 0 ? diff : 0;
                })();

                return (
                  <div
                    key={titulo.id}
                    style={{
                      border: "1px solid #E2E8F0",
                      borderRadius: 12,
                      padding: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {isEditing ? (
                        <input
                          value={editForm.numeroNF}
                          onChange={e =>
                            setEditForm(p => ({ ...p, numeroNF: e.target.value }))
                          }
                          style={{
                            ...inputStyle,
                            maxWidth: 220,
                            fontWeight: 600,
                            color: "#1D4ED8",
                          }}
                        />
                      ) : (
                        <div style={{ fontWeight: 700, color: "#1D4ED8" }}>
                          {titulo.numeroNF}
                        </div>
                      )}
                      {isEditing ? (
                        <select
                          value={editForm.status}
                          onChange={e =>
                            setEditForm(p => ({ ...p, status: e.target.value }))
                          }
                          style={{
                            ...inputStyle,
                            maxWidth: 160,
                            fontSize: 12,
                            padding: "6px 10px",
                          }}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <StatusBadge status={titulo.status} />
                      )}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
                        gap: 6,
                        fontSize: 13,
                        color: "#475569",
                      }}
                    >
                      {isEditing ? (
                        <>
                          <span>
                            Vencimento:{" "}
                            <input
                              type="date"
                              value={editForm.vencimento}
                              onChange={e =>
                                setEditForm(p => ({
                                  ...p,
                                  vencimento: e.target.value,
                                }))
                              }
                              style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }}
                            />
                          </span>
                          <span>
                            Valor:{" "}
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.valorPrincipal}
                              onChange={e =>
                                setEditForm(p => ({
                                  ...p,
                                  valorPrincipal: e.target.value,
                                }))
                              }
                              style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }}
                            />
                          </span>
                          <span>
                            Juros:{" "}
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.juros}
                              onChange={e =>
                                setEditForm(p => ({ ...p, juros: e.target.value }))
                              }
                              style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }}
                            />
                          </span>
                          <span>
                            Total:{" "}
                            <strong>{brl(totalEdit || titulo.total)}</strong>
                          </span>
                          <span>
                            Atraso:{" "}
                            <strong>
                              {diasAtrasoEdit && diasAtrasoEdit > 0
                                ? `${diasAtrasoEdit} dias`
                                : "Em dia"}
                            </strong>
                          </span>
                        </>
                      ) : (
                        <>
                          <span>
                            Vencimento: <strong>{fmtDate(titulo.vencimento)}</strong>
                          </span>
                          <span>
                            Valor: <strong>{brl(titulo.valorPrincipal)}</strong>
                          </span>
                          <span>
                            Juros: <strong>{brl(titulo.juros)}</strong>
                          </span>
                          <span>
                            Total: <strong>{brl(titulo.total)}</strong>
                          </span>
                          <span>
                            Atraso:{" "}
                            <strong>
                              {titulo.diasAtraso > 0
                                ? `${titulo.diasAtraso} dias`
                                : "Em dia"}
                            </strong>
                          </span>
                        </>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 8,
                        marginTop: 6,
                      }}
                    >
                      {isEditing ? (
                        <>
                          <button
                            onClick={cancelarEdicao}
                            style={{
                              background: "#F1F5F9",
                              color: "#475569",
                              border: "none",
                              borderRadius: 8,
                              padding: "6px 14px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={salvarEdicaoTitulo}
                            disabled={salvandoEdicao}
                            style={{
                              background: salvandoEdicao ? "#93C5FD" : "#2563EB",
                              color: "#fff",
                              border: "none",
                              borderRadius: 8,
                              padding: "6px 14px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: salvandoEdicao ? "not-allowed" : "pointer",
                            }}
                          >
                            {salvandoEdicao ? "Salvando..." : "Salvar"}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setBaixarTitulo(titulo)}
                            style={{
                              background: "#F5F3FF",
                              color: "#5B21B6",
                              border: "none",
                              borderRadius: 8,
                              padding: "6px 14px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Baixar
                          </button>
                          <button
                            onClick={() => iniciarEdicao(titulo)}
                            style={{
                              background: "#EEF2FF",
                              color: "#4C1D95",
                              border: "none",
                              borderRadius: 8,
                              padding: "6px 14px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Editar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* DISPARO MODAL */}
      <Modal open={!!disparoCliente} onClose={fecharDisparoModal} title={disparoCliente ? `Simular Disparo - ${disparoCliente.clienteNome}` : "Simular Disparo WhatsApp"} width={520}>
        {disparoCliente && (() => {
          const mensagemPreview = buildMensagemCobranca(
            disparoCliente.titulos.map(t => ({
              numeroNF: t.numeroNF,
              numeroTitulo: t.numeroTitulo,
              vencimento: t.vencimento,
              valorPrincipal: t.valorPrincipal,
              juros: t.juros,
              total: t.total,
              diasAtraso: t.diasAtraso,
            })),
            disparoCliente.clienteNome,
            templatePadrao
          );
          const telefone = disparoCliente.clienteTelefone ?? "—";
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  borderRadius: 10,
                  padding: 14,
                  fontSize: 13,
                  color: "#166534",
                }}
              >
                <pre style={{ margin: 0, fontFamily: "inherit", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{mensagemPreview}</pre>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px dashed #93C5FD",
                    background: "#EFF6FF",
                    color: "#1D4ED8",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <span>📎 Anexar PDFs (até 5)</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    onChange={handleArquivosChange}
                    style={{ display: "none" }}
                  />
                </label>
                {anexos.length > 0 && (
                  <div style={{ fontSize: 11, color: "#64748B", textAlign: "right" }}>
                    {anexos.length} PDF(s) selecionado(s)
                  </div>
                )}
              </div>
              <div style={{ fontSize: 12, color: "#64748B" }}>Será enviado para: <strong>{telefone}</strong></div>
              <div style={{ fontSize: 12, color: "#64748B" }}>Títulos incluídos: {disparoCliente.titulos.length}</div>
              <button 
                onClick={dispararIndividual} 
                disabled={enviandoIndividual}
                style={{ 
                  background: enviandoIndividual ? "#10b981" : "#16A34A", 
                  color: "#fff", 
                  border: "none", 
                  borderRadius: 8, 
                  padding: "10px 0", 
                  fontWeight: 700, 
                  fontSize: 14, 
                  cursor: enviandoIndividual ? "not-allowed" : "pointer" 
                }}>
                {enviandoIndividual ? "Enviando..." : "Enviar via Z-API"}
              </button>
            </div>
          );
        })()}
      </Modal>

      <BaixarModal open={!!baixarTitulo} titulo={baixarTitulo} onClose={() => setBaixarTitulo(null)} onConfirm={handleBaixar as Parameters<typeof BaixarModal>[0]["onConfirm"]} />
    </div>
  );
}
