export type TituloStatus = "ABERTO" | "VENCIDO" | "RECEBIDO" | "NEGOCIADO" | "CANCELADO";
export type FormaRecebimento = "PIX" | "DINHEIRO" | "BOLETO" | "TRANSFERENCIA" | "OUTRO";
export type DisparoStatus = "ENVIADO" | "FALHOU" | "PENDENTE";

export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  documento?: string;
}

export type TipoImportacao = "TITULO" | "LEMBRETE";

export interface Titulo {
  id: string;
  clienteId: string;
  numeroNF: string;
  numeroTitulo?: string;
  vencimento?: string | null;
  valorPrincipal: number;
  juros: number;
  total: number;
  diasAtraso: number;
  status: TituloStatus;
  chaveMatch: string;
  createdAt: string;
  ultimoDisparo?: string | null;
  tipoImportacao?: TipoImportacao;
  dataReferenciaImportacao?: string;
}

export interface Recebimento {
  id: string;
  tituloId: string;
  data: string;
  valorRecebido: number;
  forma: FormaRecebimento;
  observacao?: string;
}

export interface Disparo {
  id: string;
  clienteId: string;
  tituloId: string;
  status: DisparoStatus;
  data: string;
  template: string;
  resposta: string;
}

export interface Template {
  id: string;
  nome: string;
  mensagem: string;
}

export interface Carteira {
  clientes: Cliente[];
  titulos: Titulo[];
}
