# 🌾 Cobrança Pro — Plataforma de Gestão de Títulos

Sistema SaaS profissional de cobrança de títulos para empresa de peças agrícolas.

## 🚀 Stack

- **Next.js 14** (App Router + API Routes)
- **TypeScript**
- **TailwindCSS**
- **MongoDB Atlas** (via Mongoose)
- **Z-API** (disparo WhatsApp real)
- **Recharts** (gráficos)

---

## ⚙️ Configuração do Ambiente

### 1. Clone e instale as dependências

```bash
git clone https://github.com/ChecklistXingu/cobranca-pro2.git
cd cobranca-pro2
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite o `.env.local`:

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://USUARIO:SENHA@cluster0.xxxxx.mongodb.net/cobranca-pro?retryWrites=true&w=majority

# Z-API WhatsApp
ZAPI_INSTANCE_ID=SUA_INSTANCE_ID
ZAPI_TOKEN=SEU_TOKEN
ZAPI_CLIENT_TOKEN=SEU_CLIENT_TOKEN  # Security Token (recomendado)
```

### 3. Rode o projeto

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## 🔌 Como obter as credenciais

### MongoDB Atlas (gratuito)
1. Acesse [cloud.mongodb.com](https://cloud.mongodb.com)
2. Crie um cluster gratuito (M0)
3. Em **Database Access** → crie usuário com senha
4. Em **Network Access** → adicione `0.0.0.0/0` (ou seu IP)
5. Em **Connect** → Drivers → copie a connection string
6. Substitua `<password>` pela senha do usuário

### Z-API (WhatsApp)
1. Acesse [app.z-api.io](https://app.z-api.io)
2. Crie uma instância
3. Conecte seu WhatsApp via QR Code
4. Copie **Instance ID** e **Token** da aba Credenciais
5. Copie o **Security Token** da aba Security Token

---

## 🗂 API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/clientes` | Lista clientes |
| POST | `/api/clientes` | Cria cliente |
| GET | `/api/titulos` | Lista títulos (com filtros) |
| POST | `/api/titulos` | Cria título |
| PATCH | `/api/titulos/[id]` | Atualiza título |
| DELETE | `/api/titulos/[id]` | Remove título |
| GET | `/api/recebimentos` | Lista recebimentos |
| POST | `/api/recebimentos` | Lança baixa de recebimento |
| GET | `/api/disparos` | Lista disparos |
| POST | `/api/disparos` | Envia mensagem WhatsApp via Z-API |
| POST | `/api/importar` | Importa CSV (clientes + títulos) em lote |

---

## 📥 Importação CSV

Formato esperado:

```csv
nome;telefone;numero_nf;numero_titulo;valor_principal;juros;total;dias_atraso
Fazenda São João;+5565999990001;NF-12401;DUP-001;15000;750;15750;12
```

Suporta `;` ou `,` como separador. Colunas em qualquer ordem.

---

## 📁 Estrutura

```
src/
  app/
    api/
      clientes/route.ts
      titulos/route.ts
      titulos/[id]/route.ts
      recebimentos/route.ts
      disparos/route.ts       ← Z-API real aqui
      importar/route.ts
    (app)/
      dashboard/
      titulos/
      gestao-recebimentos/
      importacoes/
      disparos/
      configuracoes/
  lib/
    db.ts           ← Conexão MongoDB (singleton)
    models.ts       ← Mongoose models
    zapi.ts         ← Integração Z-API
    store.tsx       ← Estado global com fetch real
    csv.ts          ← Parser CSV
    utils.ts
    mock/data.ts    ← Templates padrão
  types/index.ts
```
