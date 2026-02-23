import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Titulo as TituloModel, Cliente as ClienteModel } from "@/lib/models";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const dataDisparo = searchParams.get("dataDisparo");

    let query: any = {};

    // Filtrar por data de disparo se fornecida
    if (dataDisparo) {
      const startDate = new Date(dataDisparo);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dataDisparo);
      endDate.setHours(23, 59, 59, 999);

      query.ultimoDisparo = {
        $gte: startDate.toISOString(),
        $lte: endDate.toISOString(),
      };
    }

    const titulos = await TituloModel.find(query).lean();
    return NextResponse.json(titulos);
  } catch (error) {
    console.error("GET /api/titulos error:", error);
    return NextResponse.json({ error: "Erro ao buscar títulos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { clientes, titulos } = body;

    if (!clientes || !titulos) {
      return NextResponse.json({ error: "Clientes e títulos são obrigatórios" }, { status: 400 });
    }

    // Salvar clientes (upsert para evitar duplicatas)
    const clientesPromises = clientes.map((cliente: any) =>
      ClienteModel.findOneAndUpdate(
        { id: cliente.id },
        cliente,
        { upsert: true, new: true }
      )
    );
    await Promise.all(clientesPromises);

    // Salvar títulos (upsert para evitar duplicatas)
    const titulosPromises = titulos.map((titulo: any) =>
      TituloModel.findOneAndUpdate(
        { id: titulo.id },
        titulo,
        { upsert: true, new: true }
      )
    );
    await Promise.all(titulosPromises);

    return NextResponse.json({ 
      ok: true, 
      message: `${clientes.length} clientes e ${titulos.length} títulos salvos` 
    });
  } catch (error) {
    console.error("POST /api/titulos error:", error);
    return NextResponse.json({ error: "Erro ao salvar títulos" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "ID e status são obrigatórios" }, { status: 400 });
    }

    const tituloAtualizado = await TituloModel.findOneAndUpdate(
      { id },
      { status },
      { new: true }
    );

    if (!tituloAtualizado) {
      return NextResponse.json({ error: "Título não encontrado" }, { status: 404 });
    }

    return NextResponse.json(tituloAtualizado);
  } catch (error) {
    console.error("PATCH /api/titulos error:", error);
    return NextResponse.json({ error: "Erro ao atualizar título" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const data = searchParams.get("data");

    if (!data) {
      return NextResponse.json({ error: "Data é obrigatória" }, { status: 400 });
    }

    // Deletar todos os títulos criados na data especificada
    const startDate = new Date(data);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(data);
    endDate.setHours(23, 59, 59, 999);

    const result = await TituloModel.deleteMany({
      createdAt: {
        $gte: startDate.toISOString(),
        $lte: endDate.toISOString(),
      },
    });

    // Também deletar clientes órfãos (sem títulos)
    const titulosRestantes = await TituloModel.find().distinct("clienteId");
    await ClienteModel.deleteMany({
      id: { $nin: titulosRestantes },
    });

    return NextResponse.json({ 
      ok: true, 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error("DELETE /api/titulos error:", error);
    return NextResponse.json({ error: "Erro ao deletar títulos" }, { status: 500 });
  }
}
