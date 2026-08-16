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

## Deploy (Render + backend, Vercel + frontend)

**O app já está no ar:**

- **Frontend**: https://projeto-de-desenvolvimento-verzel.vercel.app/
- **Backend**: https://projeto-de-desenvolvimento-verzel.onrender.com/api
- **Swagger**: https://projeto-de-desenvolvimento-verzel.onrender.com/api-docs

> O backend roda no plano gratuito do Render, que hiberna depois de ~15 min sem tráfego — a primeira requisição após esse período pode levar 30–50s pra "acordar" o serviço (cold start). Requisições seguintes respondem normalmente. É a troca aceita por não ter custo.

O plano original era Railway pro backend (é o que a Ticketmaster/Discovery e o restante da arquitetura sempre previram), mas o trial gratuito do Railway acabou no meio do desenvolvimento. **Render (backend) + Neon (Postgres gerenciado)** foi a alternativa gratuita mais próxima — mesma lógica de deploy, outro provedor.

### Neon (Postgres)

1. Criar um projeto em [neon.tech](https://neon.tech), copiar a connection string gerada (já vem com `?sslmode=require`) — essa é a `DATABASE_URL`.

### Render (backend)

1. **New → Web Service**, conectar este repositório.
2. **Root Directory** = `backend`.
3. **Build Command** = `npm install --include=dev && npm run build` — o Render seta `NODE_ENV=production` por padrão, o que faz `npm install` pular `devDependencies`, e é lá que mora o `@nestjs/cli` que o build precisa. `--include=dev` força a instalação mesmo assim.
4. **Start Command** = `npm run build && npx prisma migrate deploy && npm run db:seed && node dist/main.js` — reaplica migrations e seed a cada deploy; o seed é idempotente (upserts), então rodar de novo não duplica nada. Isso contorna o plano gratuito do Render não ter shell pra rodar o seed manualmente depois do primeiro deploy.
5. Env vars (veja `backend/.env.example` pra descrição de cada uma): `DATABASE_URL` (do Neon), `JWT_SECRET` (string forte, **mínimo 32 caracteres** — a validação de env recusa segredos fracos/placeholder em produção, ver `backend/src/config/env.validation.ts`), `QR_SIGNING_SECRET` (outra string forte, **diferente** de `JWT_SECRET`), `JWT_EXPIRES_IN=24h`, `HOLD_TTL_MINUTES=7`, `TICKETMASTER_API_KEY` e `TMDB_API_KEY` (opcionais — ver "Known issues" abaixo), `CORS_ORIGIN` (URL do Vercel, sem barra no final), `NODE_ENV=production`.
6. **Importante**: depois de editar env vars pelo dashboard do Render, é preciso clicar em "Save, rebuild, and deploy" — só digitar no campo não persiste a mudança sozinho (achado durante o próprio deploy real deste projeto).
7. Health check: `/api/health`.

### Vercel (frontend)

1. **Add New Project → Import** este repositório.
2. **Root Directory** = `frontend` (o Next.js é detectado automaticamente).
3. Env var: `NEXT_PUBLIC_API_URL` = `https://projeto-de-desenvolvimento-verzel.onrender.com/api`.
4. Deploy. Depois, no Render, atualizar `CORS_ORIGIN` pra URL que o Vercel deu.

### Verificação pós-deploy

1. Abrir https://projeto-de-desenvolvimento-verzel.vercel.app/ → a home deve carregar os eventos semeados (pode levar até ~50s na primeira visita, ver nota de cold start acima).
2. Login como `cliente1@elitedev.dev` → "Meus ingressos" deve mostrar os ingressos semeados.
3. Login como `portaria@elitedev.dev` → validar o código do ingresso válido semeado → esperar "Válido".
4. Swagger em https://projeto-de-desenvolvimento-verzel.onrender.com/api-docs deve abrir e listar todos os endpoints.

## Decisões e trade-offs

- **Mapa de assentos é nosso, não da Ticketmaster** — a Discovery API não expõe mapa de assentos (é sistema interno de bilheteria deles). O organizador importa metadados do show (nome, imagem, data, local) e configura o mapa (seções/preços/fileiras) na própria plataforma.
- **Concorrência de assento**: lock pessimista (`pg_advisory_xact_lock`) + índice único parcial (`Reservation.seatId` `WHERE status IN ('HOLDING','PAID')`, escrito à mão na migration porque o Prisma DSL não expressa `WHERE` em `@@unique`) — o lock serializa e responde rápido, o índice é a rede de segurança real mesmo com múltiplas instâncias do backend.
- **QR não-forjável**: JWT HS256 com secret dedicado (`QR_SIGNING_SECRET`, diferente do secret de auth). Validação por update condicional atômico (`WHERE status='VALID'`, checando linhas afetadas) — resolve "já foi usado" sem race condition.
- **Código curto de 6 dígitos** como alternativa ao JWT pra digitação manual na portaria (o token longo é impraticável de digitar/ler em voz alta no balcão) — unicidade garantida na emissão (retry em colisão) + constraint única no banco.
- **1 assento por reserva** — o enunciado usa singular ("reserva seu lugar"). Multi-assento por pedido é um corte consciente, não um esquecimento.
- **Hold+Reserva numa entidade só** com máquina de estados, em vez de tabelas separadas de "hold" e "pedido" — no escopo atual (1 assento = 1 checkout) seria normalização prematura.
- **Auth via `localStorage` + header `Authorization: Bearer`**, não cookie httpOnly cross-domain — mais simples de acertar entre domínios Vercel/Render dentro do prazo, ao custo de uma exposição maior a XSS do que um cookie teria.
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
- **`TICKETMASTER_API_KEY` ainda não está configurada em produção (Render)** — a chave já foi obtida e testada com sucesso localmente (busca real no catálogo funcionando), só falta adicioná-la nas env vars do serviço no Render e clicar em "Save, rebuild, and deploy". Até lá, `GET /catalog/events/search` em produção retorna `503` com a mensagem "Catálogo indisponível: TICKETMASTER_API_KEY não configurada" — é uma falha graciosa e prevista (ver `backend/src/catalog/catalog.service.ts`), não um crash. Todo o resto da plataforma funciona normalmente, incluindo os eventos já publicados pelo seed, que usam uma fixture local capturada de uma resposta real da Ticketmaster (`backend/prisma/seed.ts`) e não dependem da API estar acessível.
- **`TMDB_API_KEY` ainda não está configurada em produção (Render)** — mesma situação do item acima, só que pra fonte de filmes. A chave já foi obtida (gratuita, em [themoviedb.org](https://www.themoviedb.org/settings/api)) e testada com sucesso localmente: busca real de filme, seleção com prefill de sinopse/categoria, criação e publicação de um evento de filme, que apareceu corretamente na home numa seção de categoria nova. Até a chave ser configurada no Render, `GET /catalog/events?source=TMDB` em produção retorna `503` ("Catálogo indisponível: TMDB_API_KEY não configurada") — mesma falha graciosa e prevista do item acima, não um crash.

## Documentação de uso de IA

Ver [`AI_USAGE.md`](AI_USAGE.md).
