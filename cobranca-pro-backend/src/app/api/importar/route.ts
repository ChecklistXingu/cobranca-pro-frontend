import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Cliente, Titulo } from "@/lib/models";

// POST /api/importar  ← Recebe carteira parseada do frontend e salva no MongoDB
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { clientes: clientesPayload, titulos: titulosPayload } = await req.json();

    if (!Array.isArray(clientesPayload) || !Array.isArray(titulosPayload)) {
      return NextResponse.json({ error: "Payload inválido: esperado { clientes[], titulos[] }" }, { status: 400 });
    }

    const clienteIdMap = new Map<string, string>(); // frontendId → mongoId

    // Salva clientes (upsert por nome + telefone para evitar duplicatas)
    const clientesSalvos = [];
    for (const c of clientesPayload) {
      const existing = await Cliente.findOne({
        nome: c.nome,
        telefone: c.telefone || { $exists: false },
      });

      if (existing) {
        clienteIdMap.set(c.id, String(existing._id));
        clientesSalvos.push(existing);
      } else {
        const novo = await Cliente.create({ nome: c.nome, telefone: c.telefone });
        clienteIdMap.set(c.id, String(novo._id));
        clientesSalvos.push(novo);
      }
    }

    // Salva títulos (evita duplicata por chaveMatch)
    const titulosSalvos = [];
    let duplicados = 0;
    for (const t of titulosPayload) {
      const mongoClienteId = clienteIdMap.get(t.clienteId);
      if (!mongoClienteId) continue;

      const existing = await Titulo.findOne({ chaveMatch: t.chaveMatch });
      if (existing) {
        duplicados++;
        continue;
      }

      const novo = await Titulo.create({
        clienteId: mongoClienteId,
        numeroNF: t.numeroNF,
        numeroTitulo: t.numeroTitulo,
        valorPrincipal: t.valorPrincipal,
        juros: t.juros,
        total: t.total,
        diasAtraso: t.diasAtraso,
        status: t.status,
        chaveMatch: t.chaveMatch,
      });
      titulosSalvos.push(novo);
    }

    return NextResponse.json({
      ok: true,
      clientesSalvos: clientesSalvos.length,
      titulosSalvos: titulosSalvos.length,
      duplicados,
    }, { status: 201 });

  } catch (err) {
    console.error("[/api/importar]", err);
    return NextResponse.json({ error: "Erro ao importar dados" }, { status: 500 });
  }
}
