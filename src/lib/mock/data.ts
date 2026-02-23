import type { Cliente, Titulo, Recebimento, Disparo, Template } from "@/types";

export const mockClientes: Cliente[] = [
  { id: "c1", nome: "Fazenda São João", telefone: "+5565999990001" },
  { id: "c2", nome: "Agropecuária Horizonte", telefone: "+5565988880002" },
  { id: "c3", nome: "Grupo Cerrado Ltda", telefone: "+5565977770003" },
  { id: "c4", nome: "Rancho das Américas", telefone: "+5565966660004" },
  { id: "c5", nome: "Terra Forte Agro", telefone: "+5565955550005" },
  { id: "c6", nome: "Irmãos Cavalheiro", telefone: "+5565944440006" },
  { id: "c7", nome: "Produções Vale Verde", telefone: "+5565933330007" },
  { id: "c8", nome: "JBS Agropecuária", telefone: "+5565922220008" },
];

export const mockTitulos: Titulo[] = [
  { id: "t1", clienteId: "c1", numeroNF: "NF-12301", numeroTitulo: "DUP-001", valorPrincipal: 18450.90, juros: 923.00, total: 19373.90, diasAtraso: 32, status: "VENCIDO", chaveMatch: "NF-12301__18450.90", createdAt: "2026-01-10T00:00:00Z", ultimoDisparo: "2026-02-18" },
  { id: "t2", clienteId: "c1", numeroNF: "NF-12302", numeroTitulo: "DUP-002", valorPrincipal: 7200.00, juros: 144.00, total: 7344.00, diasAtraso: 15, status: "VENCIDO", chaveMatch: "NF-12302__7200.00", createdAt: "2026-01-25T00:00:00Z", ultimoDisparo: "2026-02-15" },
  { id: "t3", clienteId: "c2", numeroNF: "NF-12303", numeroTitulo: "DUP-003", valorPrincipal: 3920.00, juros: 0, total: 3920.00, diasAtraso: 0, status: "ABERTO", chaveMatch: "NF-12303__3920.00", createdAt: "2026-02-01T00:00:00Z", ultimoDisparo: null },
  { id: "t4", clienteId: "c3", numeroNF: "NF-12304", numeroTitulo: "DUP-004", valorPrincipal: 45000.00, juros: 2250.00, total: 47250.00, diasAtraso: 45, status: "VENCIDO", chaveMatch: "NF-12304__45000.00", createdAt: "2026-01-01T00:00:00Z", ultimoDisparo: "2026-02-20" },
  { id: "t5", clienteId: "c4", numeroNF: "NF-12305", numeroTitulo: "DUP-005", valorPrincipal: 12300.00, juros: 0, total: 12300.00, diasAtraso: 0, status: "ABERTO", chaveMatch: "NF-12305__12300.00", createdAt: "2026-02-10T00:00:00Z", ultimoDisparo: null },
  { id: "t6", clienteId: "c5", numeroNF: "NF-12306", numeroTitulo: "DUP-006", valorPrincipal: 8750.00, juros: 0, total: 8750.00, diasAtraso: 0, status: "RECEBIDO", chaveMatch: "NF-12306__8750.00", createdAt: "2026-01-20T00:00:00Z", ultimoDisparo: null },
  { id: "t7", clienteId: "c6", numeroNF: "NF-12307", numeroTitulo: "DUP-007", valorPrincipal: 22100.00, juros: 663.00, total: 22763.00, diasAtraso: 9, status: "VENCIDO", chaveMatch: "NF-12307__22100.00", createdAt: "2026-01-28T00:00:00Z", ultimoDisparo: "2026-02-19" },
  { id: "t8", clienteId: "c7", numeroNF: "NF-12308", numeroTitulo: "DUP-008", valorPrincipal: 5600.00, juros: 0, total: 5600.00, diasAtraso: 3, status: "VENCIDO", chaveMatch: "NF-12308__5600.00", createdAt: "2026-02-10T00:00:00Z", ultimoDisparo: null },
  { id: "t9", clienteId: "c8", numeroNF: "NF-12309", numeroTitulo: "DUP-009", valorPrincipal: 31500.00, juros: 0, total: 31500.00, diasAtraso: 0, status: "NEGOCIADO", chaveMatch: "NF-12309__31500.00", createdAt: "2026-01-15T00:00:00Z", ultimoDisparo: "2026-02-10" },
  { id: "t10", clienteId: "c2", numeroNF: "NF-12310", numeroTitulo: "DUP-010", valorPrincipal: 9800.00, juros: 196.00, total: 9996.00, diasAtraso: 18, status: "VENCIDO", chaveMatch: "NF-12310__9800.00", createdAt: "2026-01-20T00:00:00Z", ultimoDisparo: "2026-02-17" },
  { id: "t11", clienteId: "c3", numeroNF: "NF-12311", numeroTitulo: "DUP-011", valorPrincipal: 14200.00, juros: 0, total: 14200.00, diasAtraso: 0, status: "ABERTO", chaveMatch: "NF-12311__14200.00", createdAt: "2026-02-15T00:00:00Z", ultimoDisparo: null },
  { id: "t12", clienteId: "c5", numeroNF: "NF-12312", numeroTitulo: "DUP-012", valorPrincipal: 6300.00, juros: 0, total: 6300.00, diasAtraso: 0, status: "RECEBIDO", chaveMatch: "NF-12312__6300.00", createdAt: "2026-01-25T00:00:00Z", ultimoDisparo: null },
];

export const mockRecebimentos: Recebimento[] = [
  { id: "r1", tituloId: "t6", data: "2026-02-15", valorRecebido: 8750.00, forma: "PIX", observacao: "Pago via Pix" },
  { id: "r2", tituloId: "t12", data: "2026-02-18", valorRecebido: 6300.00, forma: "TRANSFERENCIA", observacao: "" },
];

export const mockDisparos: Disparo[] = [
  { id: "d1", clienteId: "c1", tituloId: "t1", status: "ENVIADO", data: "2026-02-18", template: "1º Aviso", resposta: "200 OK" },
  { id: "d2", clienteId: "c3", tituloId: "t4", status: "ENVIADO", data: "2026-02-20", template: "Vencido", resposta: "200 OK" },
  { id: "d3", clienteId: "c6", tituloId: "t7", status: "FALHOU", data: "2026-02-19", template: "2º Aviso", resposta: "400 Invalid phone" },
  { id: "d4", clienteId: "c2", tituloId: "t10", status: "ENVIADO", data: "2026-02-17", template: "Vencido", resposta: "200 OK" },
  { id: "d5", clienteId: "c1", tituloId: "t2", status: "PENDENTE", data: "2026-02-21", template: "1º Aviso", resposta: "-" },
];

export const mockTemplates: Template[] = [
  { id: "tpl1", nome: "1º Aviso", mensagem: "Olá {cliente}! Seu título {numeroNF} vence em breve. Total: {total}. Entre em contato para evitar juros." },
  { id: "tpl2", nome: "Vencido", mensagem: "Olá {cliente}. Seu título {numeroNF} está vencido há {diasAtraso} dias. Total: {total}. Regularize o quanto antes!" },
  { id: "tpl3", nome: "2º Aviso", mensagem: "{cliente}, ainda não identificamos o pagamento do título {numeroNF}. Total: {total}. Contate-nos urgente." },
  { id: "tpl4", nome: "Pós-vencimento", mensagem: "Aviso final: {cliente}, o título {numeroNF} está em atraso há {diasAtraso} dias. Total: {total}. Regularize para evitar cobranças adicionais." },
];
