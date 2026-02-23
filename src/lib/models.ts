import mongoose, { Schema, model, models } from "mongoose";

// ─── CLIENTE ────────────────────────────────────────────────────────────────
const ClienteSchema = new Schema({
  id: { type: String, required: true, unique: true },
  nome: { type: String, required: true },
  telefone: { type: String },
  documento: { type: String },
}, { timestamps: true });

export const Cliente = models.Cliente || model("Cliente", ClienteSchema);

// ─── TITULO ─────────────────────────────────────────────────────────────────
const TituloSchema = new Schema({
  id: { type: String, required: true, unique: true },
  clienteId: { type: String, required: true },
  numeroNF: { type: String, required: true },
  numeroTitulo: { type: String },
  vencimento: { type: String },
  valorPrincipal: { type: Number, required: true },
  juros: { type: Number, default: 0 },
  total: { type: Number, required: true },
  diasAtraso: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["ABERTO", "VENCIDO", "RECEBIDO", "NEGOCIADO", "CANCELADO"],
    default: "ABERTO",
  },
  chaveMatch: { type: String, required: true },
  ultimoDisparo: { type: String },
}, { timestamps: true });

export const Titulo = models.Titulo || model("Titulo", TituloSchema);

// ─── RECEBIMENTO ─────────────────────────────────────────────────────────────
const RecebimentoSchema = new Schema({
  id: { type: String, required: true, unique: true },
  tituloId: { type: String, required: true },
  data: { type: String, required: true },
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
  id: { type: String, required: true, unique: true },
  clienteId: { type: String, required: true },
  tituloId: { type: String, required: true },
  status: {
    type: String,
    enum: ["ENVIADO", "FALHOU", "PENDENTE"],
    default: "PENDENTE",
  },
  data: { type: String, required: true },
  template: { type: String, required: true },
  resposta: { type: String },
}, { timestamps: true });

export const Disparo = models.Disparo || model("Disparo", DisparoSchema);
