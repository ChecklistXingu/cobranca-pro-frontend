import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Disparo, Titulo, Cliente } from "@/lib/models";
import { enviarMensagem, aplicarTemplate } from "@/lib/zapi";

// Templates padrão (podem ser personalizados no futuro via banco)
const TEMPLATES: Record<string, string> = {
  "1º Aviso": "Olá {cliente}! Identificamos que o título {numeroNF} está prestes a vencer. Valor total: {total}. Entre em contato para evitar juros. 🙏",
  "Vencido": "Olá {cliente}. Seu título {numeroNF} está vencido há {diasAtraso} dias. Valor total: {total}. Por favor, regularize o quanto antes! ⚠️",
  "2º Aviso": "{cliente}, ainda não identificamos o pagamento do título {numeroNF}. Valor: {total}. Entre em contato urgente. 📞",
  "Pós-vencimento": "Aviso final: {cliente}, o título {numeroNF} está em atraso há {diasAtraso} dias. Total: {total}. Regularize para evitar protesto. ❌",
};

// GET /api/disparos  ← Lista todos os disparos
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const query = status ? { status } : {};
    const disparos = await Disparo.find(query)
      .populate("clienteId", "nome telefone")
      .populate("tituloId", "numeroNF total diasAtraso")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(disparos);
  } catch (err) {
    return NextResponse.json({ error: "Erro ao buscar disparos" }, { status: 500 });
  }
}

// POST /api/disparos  ← Envia disparo via Z-API
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { tituloId, template: templateNome } = body;

    if (!tituloId || !templateNome) {
      return NextResponse.json(
        { error: "tituloId e template são obrigatórios" },
        { status: 400 }
      );
    }

    // Busca título e cliente
    const titulo = await Titulo.findById(tituloId).lean() as any;
    if (!titulo) {
      return NextResponse.json({ error: "Título não encontrado" }, { status: 404 });
    }

    const cliente = await Cliente.findById(titulo.clienteId).lean() as any;
    if (!cliente) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    if (!cliente.telefone) {
      return NextResponse.json({ error: "Cliente sem telefone cadastrado" }, { status: 400 });
    }

    // Monta mensagem
    const templateTexto = TEMPLATES[templateNome] || TEMPLATES["Vencido"];
    const mensagem = aplicarTemplate(templateTexto, {
      cliente: cliente.nome,
      numeroNF: titulo.numeroNF,
      total: Number(titulo.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      diasAtraso: titulo.diasAtraso,
    });

    // Cria registro PENDENTE no banco
    const disparo = await Disparo.create({
      clienteId: cliente._id,
      tituloId: titulo._id,
      status: "PENDENTE",
      template: templateNome,
      mensagemEnviada: mensagem,
    });

    // Envia via Z-API
    const resultado = await enviarMensagem(cliente.telefone, mensagem);

    // Atualiza status do disparo com resultado
    const novoStatus = resultado.success ? "ENVIADO" : "FALHOU";
    await Disparo.findByIdAndUpdate(disparo._id, {
      status: novoStatus,
      resposta: resultado.success
        ? `zaapId: ${resultado.zaapId}`
        : resultado.error,
    });

    // Atualiza data do último disparo no título
    if (resultado.success) {
      await Titulo.findByIdAndUpdate(tituloId, { ultimoDisparo: new Date() });
    }

    return NextResponse.json({
      ok: resultado.success,
      status: novoStatus,
      disparo: disparo._id,
      zaapId: resultado.zaapId,
      error: resultado.error,
    }, { status: resultado.success ? 200 : 422 });

  } catch (err) {
    return NextResponse.json({ error: "Erro interno ao disparar mensagem" }, { status: 500 });
  }
}
