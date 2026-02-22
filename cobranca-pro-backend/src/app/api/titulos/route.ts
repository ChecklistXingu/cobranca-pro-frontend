import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Titulo } from "@/lib/models";

// GET /api/titulos
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const clienteId = searchParams.get("clienteId");
    const search = searchParams.get("search");

    const query: Record<string, unknown> = {};
    if (status && status !== "TODOS") query.status = status;
    if (clienteId) query.clienteId = clienteId;

    let titulos = await Titulo.find(query)
      .populate("clienteId", "nome telefone documento")
      .sort({ createdAt: -1 })
      .lean();

    // Filtro por busca (nome do cliente ou NF)
    if (search) {
      titulos = titulos.filter((t: any) =>
        t.numeroNF?.includes(search) ||
        t.numeroTitulo?.includes(search) ||
        (t.clienteId as any)?.nome?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return NextResponse.json(titulos);
  } catch (err) {
    return NextResponse.json({ error: "Erro ao buscar títulos" }, { status: 500 });
  }
}

// POST /api/titulos
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const required = ["clienteId", "numeroNF", "valorPrincipal", "total"];
    for (const field of required) {
      if (body[field] === undefined || body[field] === "") {
        return NextResponse.json({ error: `Campo obrigatório: ${field}` }, { status: 400 });
      }
    }

    const chaveMatch = body.chaveMatch || `${body.numeroNF}__${Number(body.valorPrincipal).toFixed(2)}`;
    const titulo = await Titulo.create({ ...body, chaveMatch });
    return NextResponse.json(titulo, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Erro ao criar título" }, { status: 500 });
  }
}
