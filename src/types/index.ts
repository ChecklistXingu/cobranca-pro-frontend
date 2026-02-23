// ─── CLIENTE ────────────────────────────────────────────────────────────────
export interface Cliente {
  _id?: string;
  id?: string;
  nome: string;
  telefone?: string;
  documento?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── TITULO ─────────────────────────────────────────────────────────────────
export interface Titulo {
  _id?: string;
  id?: string;
  clienteId: string;
  numeroNF: string;
  numeroTitulo?: string;
  valorPrincipal: number;
  juros: number;
  total: number;
  diasAtraso: number;
  vencimento?: string;
  status: "ABERTO" | "VENCIDO" | "RECEBIDO" | "NEGOCIADO" | "CANCELADO";
  chaveMatch: string;
  ultimoDisparo?: string;
  dataCobranca?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── RECEBIMENTO ─────────────────────────────────────────────────────────────
export interface Recebimento {
  _id?: string;
  id?: string;
  tituloId: string;
  data: string;
  valorRecebido: number;
  forma: "PIX" | "DINHEIRO" | "BOLETO" | "TRANSFERENCIA" | "OUTRO";
  observacao?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── DISPARO ─────────────────────────────────────────────────────────────────
export interface Disparo {
  _id?: string;
  id?: string;
  clienteId: string;
  tituloId: string;
  status: "ENVIADO" | "FALHOU" | "PENDENTE";
  template: string;
  mensagemEnviada?: string;
  resposta?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── TEMPLATE ────────────────────────────────────────────────────────────────
export interface Template {
  id: string;
  nome: string;
  conteudo: string;
  tipo: "COBRANCA" | "CONFIRMACAO" | "NEGOCIACAO" | "OUTRO";
}
