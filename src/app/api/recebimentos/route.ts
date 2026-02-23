import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Recebimento, Titulo } from "@/lib/models";

// GET /api/recebimentos
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const tituloId = searchParams.get("tituloId");

    const query = tituloId ? { tituloId } : {};
    const recebimentos = await Recebimento.find(query)
      .populate({ path: "tituloId", populate: { path: "clienteId", select: "nome telefone" } })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(recebimentos);
  } catch (err) {
    return NextResponse.json({ error: "Erro ao buscar recebimentos" }, { status: 500 });
  }
}

// POST /api/recebimentos  ← Lançar baixa de um título
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const { tituloId, valorRecebido, forma, data, observacao, parcial } = body;

    if (!tituloId || !valorRecebido || !forma || !data) {
      return NextResponse.json({ error: "Campos obrigatórios: tituloId, valorRecebido, forma, data" }, { status: 400 });
    }

    // Busca o título
    const titulo = await Titulo.findById(tituloId);
    if (!titulo) {
      return NextResponse.json({ error: "Título não encontrado" }, { status: 404 });
    }

    // Cria o recebimento
    const recebimento = await Recebimento.create({
      tituloId,
      data: new Date(data),
      valorRecebido: Number(valorRecebido),
      forma,
      observacao: observacao || "",
    });

    // Atualiza status do título
    if (!parcial && Number(valorRecebido) >= titulo.total) {
      await Titulo.findByIdAndUpdate(tituloId, { status: "RECEBIDO" });
    }

    return NextResponse.json(recebimento, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Erro ao lançar recebimento" }, { status: 500 });
  }
}
