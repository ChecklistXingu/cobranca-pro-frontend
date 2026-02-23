import type { Template } from "@/types";

export const mockTemplates: Template[] = [
  {
    id: "1",
    nome: "Cobrança Padrão",
    conteudo:
      "Olá {{nome}}, tudo bem? Aqui é da Xingu Máquinas New Holland. Gostaríamos de confirmar o recebimento do pagamento referente à NF {{numeroNF}} no valor de R$ {{total}}. Poderia nos dar um retorno?",
    tipo: "COBRANCA",
  },
  {
    id: "2",
    nome: "Cobrança com Atraso",
    conteudo:
      "Olá {{nome}}, tudo bem? Aqui é da Xingu Máquinas New Holland. Notamos que a NF {{numeroNF}} (R$ {{total}}) está vencida há {{diasAtraso}} dias. Poderia regularizar o pagamento?",
    tipo: "COBRANCA",
  },
  {
    id: "3",
    nome: "Confirmação de Pagamento",
    conteudo:
      "Obrigado {{nome}}! Confirmamos o recebimento do seu pagamento referente à NF {{numeroNF}}. Qualquer dúvida, nos contacte.",
    tipo: "CONFIRMACAO",
  },
  {
    id: "4",
    nome: "Negociação",
    conteudo:
      "Olá {{nome}}, gostaríamos de oferecer uma negociação especial para a NF {{numeroNF}}. Entre em contato conosco para mais detalhes.",
    tipo: "NEGOCIACAO",
  },
];
