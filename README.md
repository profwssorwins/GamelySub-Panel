# Gamely — Sub-painel do Fornecedor (Infraestrutura Cubyc)

Sub-painel white-label em **Next.js 16 + React 19 + Tailwind CSS v4** para operar como fornecedor usando a infraestrutura oficial da Cubyc (`/api/v1/*`).

## Como rodar

1. Entre na pasta `Gamely`:
   ```bash
   cd Gamely
   ```
2. Configure `.env.local` (copie de `.env.example` se necessário):
   - `CUBYC_API_URL`: URL da sua instância Cubyc (ex: `http://localhost:3000`)
   - `CUBYC_API_KEY`: API Key do cliente/fornecedor gerada na Cubyc (`cy_...` ou `sk_...`)
   - `ADMIN_PASSWORD`: Senha de acesso ao painel Gamely (padrão dev: `gamely-admin-2026`)
   - `SESSION_SECRET`: Segredo HMAC para assinar cookies de sessão
3. Instale e inicie:
   ```bash
   npm install
   npm run dev
   ```
   O painel abre em `http://localhost:3005`.

## Módulos incluídos

- **Dashboard (`/`)**: Status em tempo real da conta Cubyc, saldo mestre, custo efetivo por key, métricas dos sub-revendedores e histórico recente.
- **Keys & Consulta (`/keys`)**: Geração de keys simples ou combo (múltiplos AppIDs), atribuição opcional a um sub-revendedor (debitando do saldo interno dele) e consulta de status/ativação via `/api/v1/keys/[code]`.
- **Catálogo de Jogos (`/catalog`)**: Busca ao vivo no catálogo Cubyc com filtros por API (`Hubcap` / `Ryuu`) e `Denuvo`, com atalho direto para gerar key.
- **Sub-revendedores (`/resellers`)**: Cadastro de clientes da Gamely com plano, preço por key próprio, controle de saldo interno (`+ R$` / `- R$`), status e API Key individual (`gm_...`).
- **Configurações (`/settings`)**: Atualização da URL/API Key da Cubyc e teste de conexão ao vivo.

## API White-Label para Sub-revendedores (`/api/sub/*`)

Os clientes cadastrados na Gamely recebem uma chave `gm_...` e podem consumir:
- `GET /api/sub/balance` — Saldo e plano do sub-revendedor
- `GET /api/sub/games/search?q=...` — Busca de jogos no catálogo
- `POST /api/sub/keys/generate` — Geração de keys debitando automaticamente do saldo interno do sub-revendedor
