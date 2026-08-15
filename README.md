# PULSA — Plataforma de Eventos e Ingressos

Projeto desenvolvido para o desafio técnico **Elite Dev** da Verzel (2026). Uma plataforma onde um **Organizador** publica eventos a partir do catálogo Ticketmaster com mapa de assentos configurável, um **Cliente** reserva um assento, paga (simulado) e recebe um ingresso com QR, e a **Portaria** valida o ingresso na entrada com 4 desfechos possíveis.

## Credenciais de acesso (seed)

Todas as senhas: **`senha123`**

| Papel | Email | O que dá pra fazer |
|---|---|---|
| Organizador | `organizador@elitedev.dev` | Buscar no catálogo Ticketmaster, criar e publicar eventos |
| Cliente | `cliente1@elitedev.dev` | Reservar assento, pagar, ver ingressos (já tem 1 válido e 1 utilizado semeados) |
| Cliente | `cliente2@elitedev.dev` | Idem (tem 1 ingresso válido semeado em outro evento — útil pra testar "evento errado" na portaria) |
| Portaria | `portaria@elitedev.dev` | Validar ingressos (câmera ou código digitado) |

O `seed` já publica 2 eventos e emite 3 ingressos de demonstração (um válido, um já utilizado, um de outro evento) — dá pra testar os 4 desfechos da portaria sem precisar simular uma compra primeiro. Ver `backend/prisma/seed.ts`.

**Cartões de teste (pagamento simulado):** `4242 4242 4242 4242` aprova sempre; `4000 0000 0000 0002` recusa sempre; qualquer outro número Luhn-válido aprova/recusa pelo último dígito (par/ímpar).

## Stack

- **Backend**: NestJS + Prisma + PostgreSQL, Swagger em `/api-docs`, JWT (passport-jwt), throttling, Helmet.
- **Frontend**: Next.js 16 (App Router) + Tailwind v4 + shadcn/ui, TanStack Query, Zustand, React Hook Form + Zod, `motion` (animações), `next-themes` (modo claro/escuro).
- **Identidade visual**: PULSA — paleta coral/violeta/lime, Space Grotesk + Manrope. Ver `docs/ARCHITECTURE.md`.

## Rodando localmente

### Backend

```bash
cd backend
cp .env.example .env   # edite os secrets se quiser, os defaults já funcionam local
docker compose up -d   # sobe um Postgres persistente em localhost:5432
npm install
npx prisma migrate deploy
npm run db:seed
npm run start:dev       # http://localhost:3333/api — Swagger em /api-docs
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev              # http://localhost:3000
```

## Deploy (Railway + backend, Vercel + frontend)

O projeto está pronto pra subir nos dois — falta só criar os projetos nos dashboards (login com sua conta, não é algo que dá pra automatizar sem acesso às contas).

### Railway (backend)

1. **New Project → Deploy from GitHub repo**, escolha este repositório.
2. Nas configurações do serviço, defina **Root Directory** = `backend`.
3. Adicione um **Postgres** ao projeto (Railway provisiona e injeta `DATABASE_URL` automaticamente — não precisa criar essa env var na mão).
4. Configure as demais env vars do serviço (veja `backend/.env.example`):
   - `JWT_SECRET` — string aleatória forte, **mínimo 32 caracteres em produção** (a validação de env do app recusa segredos fracos/placeholder — ver `backend/src/config/env.validation.ts`).
   - `QR_SIGNING_SECRET` — outra string forte, **diferente** de `JWT_SECRET`.
   - `JWT_EXPIRES_IN` = `24h`
   - `HOLD_TTL_MINUTES` = `7`
   - `TICKETMASTER_API_KEY` — sua chave de developer.ticketmaster.com (opcional — sem ela, a busca no catálogo falha graciosamente com uma mensagem de indisponibilidade, o resto do app funciona normalmente).
   - `CORS_ORIGIN` = a URL que o Vercel vai te dar (dá pra ajustar depois do passo do Vercel).
   - `NODE_ENV` = `production`
5. O `backend/railway.json` já define o build (Nixpacks) e o start command: `prisma migrate deploy && node dist/main.js` — a migration roda sozinha a cada deploy, não precisa rodar na mão. Health check em `/api/health`.
6. Depois do primeiro deploy no ar, rode o seed uma vez: no dashboard do Railway, abra um shell do serviço (ou rode localmente com `DATABASE_URL` apontando pro Postgres do Railway) e execute `npm run db:seed` — é idempotente, pode rodar de novo sem duplicar nada.

### Vercel (frontend)

1. **Add New Project → Import** este repositório.
2. **Root Directory** = `frontend` (o Next.js é detectado automaticamente, não precisa de config extra).
3. Env var: `NEXT_PUBLIC_API_URL` = `https://<seu-backend>.up.railway.app/api`.
4. Deploy. Depois, volte no Railway e atualize `CORS_ORIGIN` pra URL que o Vercel te deu (`https://<seu-projeto>.vercel.app`), sem barra no final.

### Verificação pós-deploy

1. Abrir a URL do Vercel → a home deve carregar os 2 eventos semeados.
2. Login como `cliente1@elitedev.dev` → "Meus ingressos" deve mostrar os 2 ingressos semeados.
3. Login como `portaria@elitedev.dev` → validar o código do ingresso válido semeado → esperar "Válido".
4. Swagger em `https://<seu-backend>.up.railway.app/api-docs` deve abrir e listar todos os endpoints.

## Decisões e trade-offs

- **Mapa de assentos é nosso, não da Ticketmaster** — a Discovery API não expõe mapa de assentos (é sistema interno de bilheteria deles). O organizador importa metadados do show (nome, imagem, data, local) e configura o mapa (seções/preços/fileiras) na própria plataforma.
- **Concorrência de assento**: lock pessimista (`pg_advisory_xact_lock`) + índice único parcial (`Reservation.seatId` `WHERE status IN ('HOLDING','PAID')`, escrito à mão na migration porque o Prisma DSL não expressa `WHERE` em `@@unique`) — o lock serializa e responde rápido, o índice é a rede de segurança real mesmo com múltiplas instâncias do backend.
- **QR não-forjável**: JWT HS256 com secret dedicado (`QR_SIGNING_SECRET`, diferente do secret de auth). Validação por update condicional atômico (`WHERE status='VALID'`, checando linhas afetadas) — resolve "já foi usado" sem race condition.
- **Código curto de 6 dígitos** como alternativa ao JWT pra digitação manual na portaria (o token longo é impraticável de digitar/ler em voz alta no balcão) — unicidade garantida na emissão (retry em colisão) + constraint única no banco.
- **1 assento por reserva** — o enunciado usa singular ("reserva seu lugar"). Multi-assento por pedido é um corte consciente, não um esquecimento.
- **Hold+Reserva numa entidade só** com máquina de estados, em vez de tabelas separadas de "hold" e "pedido" — no escopo atual (1 assento = 1 checkout) seria normalização prematura.
- **Auth via `localStorage` + header `Authorization: Bearer`**, não cookie httpOnly cross-domain — mais simples de acertar entre domínios Vercel/Railway dentro do prazo, ao custo de uma exposição maior a XSS do que um cookie teria.
- **Cache em memória** para o proxy do catálogo Ticketmaster (não Redis) — instância única, 7 dias de prazo, Redis seria complexidade sem ganho real aqui.
- **Pasta única com `backend/` e `frontend/` como irmãs**, não um monorepo com pacote compartilhado — não há código compartilhado entre os dois lados, então a cerimônia de um Turborepo não se paga.

## O que não foi implementado e por quê

- **Cadastro público de usuários** — o desafio pede papéis semeados, não um fluxo de signup; implementar um adicionaria superfície de ataque (verificação de email, etc.) sem valor pro escopo avaliado.
- **Painel financeiro do organizador** (receita, ingressos vendidos por evento) — ideia real e valiosa, mas fora do escopo priorizado neste momento; documentado aqui como próximo passo, não esquecimento.
- **Categorias de evento** (Música/Esportes/Festas) — o schema não guarda isso hoje; a home usa cidade real (dado que existe) em vez de categoria (que teria que ser inventada).
- **Refresh token** — JWT de 24h é suficiente pra demo; refresh token adicionaria complexidade de rotação/revogação sem ganho aqui.
- **WebSocket pro mapa de assentos em tempo real** — o polling de 5s no `GET /seatmap` já resolve "assento sumiu porque outra pessoa comprou" com latência aceitável pro caso de uso.

## Known issues

- O QR renderizado em "Meus ingressos" sempre usa fundo branco fixo, mesmo no modo escuro — é proposital: leitores de QR precisam de alto contraste, então essa é a única superfície que não segue o tema.
- `TICKETMASTER_API_KEY` vazia faz a busca no catálogo retornar "indisponível" de forma graciosa (não quebra o app) — só o organizador é afetado, o resto da plataforma funciona normalmente.

## Documentação de uso de IA

Ver [`AI_USAGE.md`](AI_USAGE.md).
