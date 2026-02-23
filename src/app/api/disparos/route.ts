import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Disparo, Titulo, Cliente } from "@/lib/models";
import { enviarMensagem } from "@/lib/zapi";
import type { Titulo as TituloType } from "@/types";
import { buildMensagemCobranca } from "@/lib/templates";

const TEMPLATES = ["1º Aviso", "Vencido", "2º Aviso", "Pós-vencimento"];

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const inicio = searchParams.get("inicio");
    const fim = searchParams.get("fim");

    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    if (inicio || fim) {
      const createdAt: Record<string, Date> = {};
      if (inicio) {
        createdAt.$gte = new Date(`${inicio}T00:00:00.000Z`);
      }
      if (fim) {
        createdAt.$lte = new Date(`${fim}T23:59:59.999Z`);
      }
      query.createdAt = createdAt;
    }

    const disparos = await Disparo.find(query)
      .populate("clienteId", "nome telefone")
      .populate("tituloId", "numeroNF total diasAtraso")
      .sort({ createdAt: -1 })
      .lean();

    const payload = disparos.map(item => {
      const cliente = item.clienteId as any;
      const titulo = item.tituloId as any;
      const clienteId = cliente?._id ? String(cliente._id) : String(item.clienteId ?? "");
      const tituloId = titulo?._id ? String(titulo._id) : String(item.tituloId ?? "");

      return {
        id: String(item._id ?? item.id ?? item._id?.toString?.() ?? ""),
        clienteId,
        clienteNome: cliente?.nome ?? "—",
        clienteTelefone: cliente?.telefone ?? "",
        tituloId,
        numeroNF: titulo?.numeroNF ?? "",
        totalTitulo: titulo?.total ?? null,
        status: item.status ?? "PENDENTE",
        template: item.template ?? "",
        resposta: item.resposta ?? item.mensagemEnviada ?? "",
        data: (item.createdAt ?? item.updatedAt ?? new Date()).toISOString(),
      };
    });

    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json({ error: "Erro ao buscar disparos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { tituloId, template: templateNome } = body;

    if (!tituloId || !templateNome) {
      return NextResponse.json({ error: "tituloId e template são obrigatórios" }, { status: 400 });
    }

    const tituloBase = await Titulo.findOne({ id: tituloId }).lean();
    if (!tituloBase) {
      return NextResponse.json({ error: "Título não encontrado" }, { status: 404 });
    }

    const cliente = await Cliente.findOne({ id: tituloBase.clienteId }).lean();
    if (!cliente) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    if (!cliente.telefone) {
      return NextResponse.json({ error: "Cliente sem telefone cadastrado" }, { status: 400 });
    }

    const titulosDoCliente = await Titulo.find({ clienteId: cliente.id, status: { $in: ["ABERTO", "VENCIDO", "NEGOCIADO"] } })
      .sort({ vencimento: 1 })
      .lean();

    const titulosParaMensagem = titulosDoCliente.length ? titulosDoCliente : [tituloBase];

    const payloadTitulos: Array<Pick<TituloType, "numeroNF" | "numeroTitulo" | "vencimento" | "valorPrincipal" | "juros" | "total" | "diasAtraso">> = titulosParaMensagem.map(t => ({
      numeroNF: t.numeroNF,
      numeroTitulo: t.numeroTitulo,
      vencimento: t.vencimento,
      valorPrincipal: t.valorPrincipal,
      juros: t.juros,
      total: t.total,
      diasAtraso: t.diasAtraso,
    }));

    const mensagem = buildMensagemCobranca(payloadTitulos, cliente.nome, templateNome);

    const disparoId = `disp_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    const disparo = await Disparo.create({
      id: disparoId,
      clienteId: cliente.id,
      tituloId: tituloBase.id,
      status: "PENDENTE",
      data: new Date().toISOString(),
      template: templateNome,
      resposta: "",
    });

    const resultado = await enviarMensagem(cliente.telefone, mensagem);

    const novoStatus = resultado.success ? "ENVIADO" : "FALHOU";
    await Disparo.findOneAndUpdate(
      { id: disparoId },
      {
        status: novoStatus,
        resposta: resultado.success ? `zaapId: ${resultado.zaapId}` : resultado.error,
      }
    );

    if (resultado.success) {
      const tituloIds = titulosParaMensagem.map(t => t.id);
      await Titulo.updateMany(
        { id: { $in: tituloIds } },
        { ultimoDisparo: new Date().toISOString() }
      );
    }

    return NextResponse.json({
      ok: resultado.success,
      status: novoStatus,
      disparo: disparoId,
      zaapId: resultado.zaapId,
      error: resultado.error,
    }, { status: resultado.success ? 200 : 422 });
  } catch (err) {
    return NextResponse.json({ error: "Erro interno ao disparar mensagem" }, { status: 500 });
  }
}
