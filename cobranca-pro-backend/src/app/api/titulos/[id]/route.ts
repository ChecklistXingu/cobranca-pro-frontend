import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Titulo } from "@/lib/models";

// PATCH /api/titulos/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const body = await req.json();

    const titulo = await Titulo.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true }
    ).populate("clienteId", "nome telefone");

    if (!titulo) {
      return NextResponse.json({ error: "Título não encontrado" }, { status: 404 });
    }

    return NextResponse.json(titulo);
  } catch (err) {
    return NextResponse.json({ error: "Erro ao atualizar título" }, { status: 500 });
  }
}

// DELETE /api/titulos/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    await Titulo.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Erro ao deletar título" }, { status: 500 });
  }
}
