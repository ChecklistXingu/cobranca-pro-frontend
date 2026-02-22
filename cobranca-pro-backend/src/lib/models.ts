import mongoose, { Schema, model, models } from "mongoose";

// ─── CLIENTE ────────────────────────────────────────────────────────────────
const ClienteSchema = new Schema({
  nome: { type: String, required: true },
  telefone: { type: String },
  documento: { type: String },
}, { timestamps: true });

export const Cliente = models.Cliente || model("Cliente", ClienteSchema);

// ─── TITULO ─────────────────────────────────────────────────────────────────
const TituloSchema = new Schema({
  clienteId: { type: Schema.Types.ObjectId, ref: "Cliente", required: true },
  numeroNF: { type: String, required: true },
  numeroTitulo: { type: String },
  valorPrincipal: { type: Number, required: true },
  juros: { type: Number, default: 0 },
  total: { type: Number, required: true },
  diasAtraso: { type: Number, default: 0 },
  vencimento: { type: Date },
  status: {
    type: String,
    enum: ["ABERTO", "VENCIDO", "RECEBIDO", "NEGOCIADO", "CANCELADO"],
    default: "ABERTO",
  },
  chaveMatch: { type: String, required: true },
  ultimoDisparo: { type: Date },
}, { timestamps: true });

export const Titulo = models.Titulo || model("Titulo", TituloSchema);

// ─── RECEBIMENTO ─────────────────────────────────────────────────────────────
const RecebimentoSchema = new Schema({
  tituloId: { type: Schema.Types.ObjectId, ref: "Titulo", required: true },
  data: { type: Date, required: true },
  valorRecebido: { type: Number, required: true },
  forma: {
    type: String,
    enum: ["PIX", "DINHEIRO", "BOLETO", "TRANSFERENCIA", "OUTRO"],
    required: true,
  },
  observacao: { type: String },
}, { timestamps: true });

export const Recebimento = models.Recebimento || model("Recebimento", RecebimentoSchema);

// ─── DISPARO ─────────────────────────────────────────────────────────────────
const DisparoSchema = new Schema({
  clienteId: { type: Schema.Types.ObjectId, ref: "Cliente", required: true },
  tituloId: { type: Schema.Types.ObjectId, ref: "Titulo", required: true },
  status: {
    type: String,
    enum: ["ENVIADO", "FALHOU", "PENDENTE"],
    default: "PENDENTE",
  },
  template: { type: String, required: true },
  mensagemEnviada: { type: String },
  resposta: { type: String },
}, { timestamps: true });

export const Disparo = models.Disparo || model("Disparo", DisparoSchema);
