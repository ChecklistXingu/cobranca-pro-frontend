import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Cliente } from "@/lib/models";

// GET /api/clientes
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const query = search
      ? { nome: { $regex: search, $options: "i" } }
      : {};

    const clientes = await Cliente.find(query).sort({ nome: 1 }).lean();
    return NextResponse.json(clientes);
  } catch (err) {
    return NextResponse.json({ error: "Erro ao buscar clientes" }, { status: 500 });
  }
}

// POST /api/clientes
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.nome) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    const cliente = await Cliente.create(body);
    return NextResponse.json(cliente, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Erro ao criar cliente" }, { status: 500 });
  }
}
