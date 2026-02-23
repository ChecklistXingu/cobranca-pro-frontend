export type MensagemTemplateNome = "1º Aviso" | "Vencido" | "2º Aviso" | "Pós-vencimento";

export interface MensagemTituloPayload {
  numeroNF: string;
  numeroTitulo?: string | null;
  vencimento?: string | null;
  valorPrincipal: number;
  juros: number;
  total: number;
  diasAtraso?: number | null;
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

const templates: Record<MensagemTemplateNome, { assunto: string; corpo: string; rodape?: string }> = {
  "1º Aviso": {
    assunto: "Lembrete de vencimento",
    corpo: "Identificamos títulos próximos do vencimento e gostaríamos de confirmar o recebimento.",
    rodape: "Qualquer dúvida estamos à disposição no setor financeiro.",
  },
  "Vencido": {
    assunto: "Título em atraso",
    corpo: "Consta em nosso sistema um ou mais títulos em aberto. Poderia verificar, por gentileza?",
    rodape: "Se já efetuou o pagamento, por favor desconsidere e nos encaminhe o comprovante.",
  },
  "2º Aviso": {
    assunto: "Segundo aviso de cobrança",
    corpo: "Reforçamos o contato sobre os títulos ainda pendentes. Precisamos do seu retorno para atualizar nossa carteira.",
    rodape: "Estamos disponíveis para negociar as melhores condições.",
  },
  "Pós-vencimento": {
    assunto: "Atualização de cobrança",
    corpo: "Mantemos este aviso sobre títulos vencidos. Vamos regularizar juntos?",
    rodape: "Evite restrições: fale conosco imediatamente.",
  },
};

export function buildMensagemCobranca(
  titulos: MensagemTituloPayload[],
  clienteNome: string,
  template: string
): string {
  const templateConfig = templates[(template as MensagemTemplateNome) || "Vencido"] ?? templates["Vencido"];

  const totalGeral = titulos.reduce((acc, item) => acc + Number(item.total ?? 0), 0);
  const listaTitulos = titulos
    .map((titulo, index) => {
      const atraso = titulo.diasAtraso && titulo.diasAtraso > 0 ? `${titulo.diasAtraso} dias` : "Em dia";
      return `*${index + 1}) NF ${titulo.numeroNF}*
• Vencimento: ${formatDate(titulo.vencimento)}
• Valor: ${currency.format(titulo.total)}
• Situação: ${atraso}`;
    })
    .join("\n\n");

  return [
    `Olá, ${clienteNome}! Tudo bem?`,
    templateConfig.assunto,
    templateConfig.corpo,
    listaTitulos,
    `Total em aberto: *${currency.format(totalGeral)}*`,
    templateConfig.rodape ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export const TEMPLATES_DISPONIVEIS: MensagemTemplateNome[] = ["1º Aviso", "Vencido", "2º Aviso", "Pós-vencimento"];
