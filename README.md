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

## Requisitos do desafio — checklist

Mapa direto do enunciado (`Desafio-Elite-Dev-2026`) pro que está implementado, pra facilitar a avaliação sem precisar garimpar o código.

### Front-end

- ✅ Navegação e busca por eventos publicados (shows e filmes), com data, local e preço — home (`frontend/src/app/(public)/page.tsx`) + busca/filtro por cidade e categoria (`frontend/src/components/home/event-filters.tsx`).
- ✅ Criação e gerenciamento de eventos pelo organizador — busca no catálogo → configura seções/preços → publica/despublica/edita/exclui (`frontend/src/app/(organizer)/organizer/`).
- ✅ Fluxo de reserva com **mapa de assentos interativo** (cinema/teatro) — `frontend/src/components/seatmap/seat-map.tsx`, com hold e contador regressivo.
- ✅ Pagamento simulado com confirmação **e** recusa — dois cartões de teste determinísticos (ver acima), telas de resultado para os dois casos.
- ✅ "Meus ingressos" com QR code — `frontend/src/app/(customer)/my-tickets/page.tsx`, QR renderizado com `qrcode.react` a partir de um token assinado.
- ✅ Portaria com os 4 desfechos (válido, inválido, já utilizado, evento errado) — `frontend/src/components/gate/gate-result.tsx`, backend em `backend/src/gate/gate.service.ts`.
- ✅ Leitura de QR pela câmera + digitação manual como alternativa — `frontend/src/components/gate/qr-scanner.tsx` (câmera) e aba "Manual" em `frontend/src/app/(gate)/gate/page.tsx`.

### Back-end

- ✅ Integração com API externa — **Ticketmaster Discovery e TMDb, as duas** (`backend/src/catalog/`), unificadas por uma fonte comum (`source: 'TICKETMASTER' | 'TMDB'`).
- ✅ Autenticação com 3 papéis (Organizador, Cliente, Portaria) — `enum Role` no Prisma + guards/decorators (`@Roles()`, `RolesGuard`).
- ✅ Armazenamento de eventos, reservas e ingressos — schema Prisma completo (`User`, `Event`, `Section`, `Seat`, `Reservation`, `Ticket`).
- ✅ Garantia de que o mesmo lugar não é vendido duas vezes — lock pessimista (`pg_advisory_xact_lock`) **+** índice único parcial no banco como rede de segurança real (`backend/src/reservations/reservations.service.ts`, migration manual).
- ✅ QR não-forjável — JWT HS256 com secret dedicado, algoritmo fixado na verificação contra alg-confusion (`backend/src/tickets/utils/ticket-signing.util.ts`).
- ✅ Compartilhamento de ingresso via link gerado pela aplicação — `shareSlug` opaco, rota pública `GET /tickets/:shareSlug` / `frontend/.../t/[shareSlug]`.
- ✅ Validação de portaria impede validar o mesmo ingresso duas vezes — update condicional atômico (`WHERE status='VALID'`, checa linhas afetadas) em `gate.service.ts`.

### Não funcionais

- ✅ README detalhado com passo a passo de setup e banco de dados (esta página).
- ✅ Dados semeados: 1 organizador, 2 clientes, 1 portaria, eventos publicados com ingressos disponíveis e prontos pros 4 desfechos da portaria (ver seed acima).
- ✅ Aplicação publicada (Render + Vercel + Neon, links acima).
- ✅ Seção "Known issues" abaixo, e "O que não foi implementado e por quê".

### Opcionais implementados

- ✅ Busca e filtro de eventos (termo, cidade, categoria).
- ✅ Painel do organizador (CRUD completo — criar, editar, publicar/despublicar, excluir — e painel financeiro com receita/ingressos vendidos por evento, ver "Todas as funcionalidades do produto" abaixo).
- ✅ Cancelamento com devolução ao estoque (reserva em hold antes do pagamento).
- ✅ Mapa de assentos "em tempo real" via polling de 5s.
- ✅ Docker Compose (Postgres local persistente).
- ✅ Testes automatizados — 227 testes unitários + 4 e2e no backend (Jest) e 53 testes de lógica/componente no frontend (Vitest + Testing Library) (ver "Testes" abaixo e `AI_USAGE.md`).
- ✅ Aplicação publicada.
- ✅ SEO básico (`sitemap.xml`, `robots.txt`) — não pedido pelo desafio, ver "Home e catálogo" abaixo.
- ✅ Aviso de cookies (LGPD/GDPR) — não pedido pelo desafio, ver "Home e catálogo" abaixo.

### Todas as funcionalidades do produto

Lista mais completa do que dá pra fazer no site, além do que os requisitos do desafio exigem — inclui coisas de conta/perfil que não estão em nenhuma seção acima.

**Conta e perfil** (`/profile`, qualquer papel logado)
- Trocar nome de exibição.
- Trocar senha (pede a senha atual antes).
- Ver desde quando é usuário e um contador rápido (ingressos pro cliente, eventos pro organizador).
- Sair da sessão neste dispositivo.

**Saldo** (só para clientes)
- Créditos em saldo (`balanceCents`) vêm de duas origens: um organizador cancelando um evento com ingressos já pagos (reembolso automático pra todo cliente afetado, com aviso na próxima vez que abrir o site), ou o próprio cliente cancelando um ingresso individual já pago (ver "Ingressos" abaixo). Nenhum dos dois casos devolve via cartão simulado — sempre em saldo da plataforma.
- No checkout, se o cliente tiver saldo, ele é aplicado **primeiro**, cobrindo o quanto der do valor da reserva — só o restante (se sobrar algo) vai pro cartão. Se o saldo cobrir o total, o pagamento é aprovado direto, sem nem simular cartão.
- Saldo só aparece pra quem realmente pode ter saldo (cliente) — organizador e portaria não veem esse campo, pra não mostrar "R$ 0,00" sem sentido.

**Home e catálogo**
- Hero do evento mais próximo entre os publicados (heurística real, não sorteio).
- Carrossel de shows/filmes em destaque (curadoria manual do organizador, até 4 de cada, contados separadamente).
- Busca por nome, filtro por cidade e por categoria — cidades/categorias calculadas a partir dos eventos reais existentes, não uma lista fixa.
- Seção "Filmes" separada, com seu próprio destaque/hero e grade, sem misturar com "Eventos em cartaz" (que é só show).
- Tema claro/escuro, com preferência salva entre sessões.
- **SEO**: `/sitemap.xml` gerado dinamicamente com a home + a URL de cada evento publicado (paginando a API pública até acabar, não um teto fixo), e `/robots.txt` liberando o catálogo público mas bloqueando áreas que exigem login (`/profile`, `/my-tickets`, `/organizer`, `/gate`, `/t/`) — nenhuma delas tem valor de indexação, e a última (link de compartilhamento de ingresso) nem deveria aparecer num resultado de busca. Sitemap se regenera a cada hora (não só no build), então evento novo publicado depois do último deploy aparece sozinho; se a API estiver fora do ar na hora de gerar, cai de volta pra só a home em vez de quebrar a página. A página de cada evento também tem título/descrição/OpenGraph próprios (em vez do título genérico do site inteiro) e dados estruturados `schema.org/Event` — o formato que o Google usa pra mostrar data, local e preço direto no resultado de busca, sem precisar entrar no site. Sem meta tag de "keywords": o Google ignora esse campo desde 2009, não teria efeito nenhum.
- **Aviso de cookies**: banner flutuante que aparece na primeira visita, com "Aceitar" e "Somente essenciais" (mesmo padrão de mercado do LGPD/GDPR) e link pra `/privacidade` — a escolha fica salva e o banner não incomoda de novo. Hoje o site só usa `localStorage` essencial (login, tema, esta própria escolha), sem nenhum rastreamento de terceiros, mas a estrutura já fica pronta pro dia em que isso mudar.

**Organizador**
- Busca no catálogo real da Ticketmaster (shows) e do TMDb (filmes), com prefill de nome/local/data/sinopse quando disponível.
- Criar evento com seções/preços/fileiras configuráveis, editar, publicar/despublicar, destacar (com limite de 4 por fonte), excluir.
- Cancelar um evento publicado com reservas pagas dispara o reembolso em saldo automaticamente pra todo cliente afetado (ver "Saldo" acima) — se não há nenhuma reserva ainda, o evento é apagado direto em vez de só marcado como cancelado.
- **Painel financeiro** (`/organizer/finance`) — receita total, ingressos vendidos e ticket médio somando todos os eventos, mais a receita/ingressos vendidos por evento individualmente, ordenado do que mais vendeu pro que menos vendeu (eventos sem nenhuma venda aparecem com R$ 0,00 em vez de sumir da lista). "Vendido" conta reserva paga (`ReservationStatus.PAID`), a mesma fonte de verdade do resto do fluxo de pagamento.

**Reserva e pagamento**
- Mapa de assentos interativo por seção, com o mapa atualizando sozinho a cada 5s (outro cliente reservando aparece quase em tempo real).
- Hold de 7 minutos com contador regressivo visível; cancelamento manual do hold antes de pagar, sem precisar esperar o tempo todo acabar.
- Pagamento simulado (cartão + saldo, ver acima), com tela de aprovado e de recusado.
- Rótulo acima do mapa muda de "Palco" pra "Tela" automaticamente quando o evento é um filme (fonte TMDb).

**Ingressos**
- QR code assinado (JWT) por ingresso, mais um código curto de 6 dígitos como alternativa de digitação.
- Link de compartilhamento público (`/t/:shareSlug`) — quem recebe o link vê o QR sem precisar de login.
- "Meus ingressos" agrupado por evento (abas Ativos/Passados), com paginação dentro de cada evento quando passa de 4 ingressos.
- **Cancelar um ingresso já pago** (botão "Cancelar ingresso" em cada ingresso válido), com reembolso do valor total em saldo — só disponível antes do evento acontecer e antes de o ingresso ter sido validado na portaria. Libera o assento na hora pra outra pessoa comprar.

**Portaria**
- Leitura por câmera ou digitação manual do código curto.
- 4 desfechos com tela cheia colorida por status: válido, inválido, já utilizado (mostra quando/quem validou antes), evento errado (mostra pra qual evento o ingresso é válido).
- Busca por nome no seletor de evento.
- Histórico dos ingressos que aquele funcionário já validou, agrupado por evento, com paginação.

**Navegação**
- Barra inferior fixa no mobile, com destaque do item ativo e atalhos por papel (cliente/organizador/portaria têm itens diferentes).

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

## Testes

Nenhum dos dois lados precisa do Postgres/Docker rodando pra testar — o backend usa mocks do Prisma, o frontend não bate em API nenhuma.

```bash
cd backend
npm test                 # 227 testes unitários (Jest)
npm run test:e2e         # 4 testes e2e (sobem a aplicação de verdade, ainda com Prisma mockado)
```

```bash
cd frontend
npm test                 # 53 testes de lógica e componente (Vitest + Testing Library)
npm run typecheck        # checa as páginas dinâmicas sem depender de tipos gerados pelo build
npm run test:watch       # mesma coisa, mas observando arquivos — útil enquanto se escreve um teste novo
```

### Quality gate automático

O workflow [`quality.yml`](.github/workflows/quality.yml) roda em todo `push` para `main` e em todo Pull Request. Ele instala dependências com `npm ci`, executa lint não-mutante, type-check, testes unitários, e2e, build de produção e auditoria de dependências. O e2e usa uma configuração isolada de teste e não exige PostgreSQL porque o Prisma é mockado nesse conjunto.

A auditoria detalhada que originou os ajustes desta branch está em [`docs/REVIEW-2026-08.md`](docs/REVIEW-2026-08.md). O override de `deepmerge-ts` no `backend/package.json` corrige a vulnerabilidade transitiva observada sem fazer downgrade do Prisma.

## Deploy (Render + backend, Vercel + frontend)

**O app já está no ar:**

- **Frontend**: https://projeto-de-desenvolvimento-verzel.vercel.app/
- **Backend**: https://projeto-de-desenvolvimento-verzel.onrender.com/api
- **Swagger**: https://projeto-de-desenvolvimento-verzel.onrender.com/api-docs

> **Sobre o cold start:** o backend roda no plano gratuito do Render, que hiberna depois de ~15 min sem tráfego — a primeira requisição após esse período pode levar 30–50s pra "acordar" o serviço. Pedimos desculpas por esse atraso caso você caia bem nesse momento; é uma limitação real do plano gratuito, não um bug. Pra reduzir a chance disso acontecer durante a avaliação, um monitor do [UptimeRobot](https://uptimerobot.com) bate em `/api/health` a cada 5 minutos, mantendo o serviço quente o tempo todo. Isso substituiu uma primeira tentativa via `cron` do GitHub Actions, que falhava com frequência: o GitHub não garante horário de execução pra workflows agendados, e o atraso passava fácil dos ~15 min de hibernação do Render em horários de pico da plataforma (histórico em `docs/ARCHITECTURE.md`) — um serviço de uptime externo, feito especificamente pra esse tipo de ping, não tem esse problema. Requisições depois da primeira respondem normalmente.

O plano original era Railway pro backend, mas o trial gratuito acabou no meio do desenvolvimento. **Render (backend) + Neon (Postgres gerenciado)** foi a alternativa gratuita mais próxima — mesma lógica de deploy, outro provedor (histórico completo da migração em `docs/ARCHITECTURE.md`).

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
- **Categorias de evento** (campo `category` no schema) — preenchidas automaticamente a partir da classificação do catálogo (segment da Ticketmaster, gênero do TMDb) e editáveis pelo organizador; alimentam os chips/carrosséis por categoria da home. "Em destaque" usa uma heurística real (evento mais próximo entre os publicados), não um número inventado.

## O que não foi implementado e por quê

- **Cadastro público de usuários** — o desafio pede papéis semeados, não um fluxo de signup; implementar um adicionaria superfície de ataque (verificação de email, etc.) sem valor pro escopo avaliado.
- **Refresh token** — JWT de 24h é suficiente pra demo; refresh token adicionaria complexidade de rotação/revogação sem ganho aqui.
- **WebSocket pro mapa de assentos em tempo real** — o polling de 5s no `GET /seatmap` já resolve "assento sumiu porque outra pessoa comprou" com latência aceitável pro caso de uso.

## Known issues

- O QR renderizado em "Meus ingressos" sempre usa fundo branco fixo, mesmo no modo escuro — é proposital: leitores de QR precisam de alto contraste, então essa é a única superfície que não segue o tema.
- Se por algum motivo `TICKETMASTER_API_KEY` ou `TMDB_API_KEY` faltarem no ambiente (ex. reproduzindo o deploy do zero), a busca no catálogo falha de forma graciosa: `GET /catalog/events/search` retorna `503` com uma mensagem clara em vez de quebrar (ver `backend/src/catalog/catalog.service.ts`). Todo o resto da plataforma continua funcionando normalmente mesmo sem essas chaves, incluindo os 2 eventos mínimos que o seed cria à mão (sem depender de nenhuma API externa) só pra portaria e "Meus ingressos" terem o que mostrar de cara. Os demais eventos do catálogo (Coachella, Matrix, etc.) foram publicados de verdade através do fluxo do organizador, batendo nas APIs reais — ver "Todas as funcionalidades do produto" abaixo.

## Segurança

Auditoria completa (autenticação, autorização, injeção, dependências, headers) em [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md) — o que foi encontrado e corrigido, e o que já estava certo desde antes com a verificação que confirma isso.

## Documentação de uso de IA

Ver [`AI_USAGE.md`](AI_USAGE.md).
