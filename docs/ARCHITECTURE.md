# Plano — Desafio Elite Dev (Verzel): Plataforma de Eventos e Ingressos

> Este arquivo é o artefato de processo pedido pelo desafio, versionado como registro do raciocínio ao longo da construção — não um documento retroativo escrito no fim. Fica em ordem cronológica: cada seção nova foi escrita no momento da decisão correspondente, então trechos anteriores podem descrever um estado que uma seção posterior já revisou (ex. a direção visual "editorial escuro cinematográfico" original foi substituída pela identidade "PULSA" na seção correspondente mais abaixo — a ordem cronológica fica preservada de propósito).

## Contexto

Este é um teste técnico para uma vaga de emprego na Verzel, com prazo de 7 dias corridos. O PDF do desafio (`Desafio-Elite-Dev-2026.pdf`) é enfático num ponto que muda como este projeto deve ser conduzido: eles já sabem que qualquer prompt colado numa IA devolve um app inteiro, e avisam explicitamente que **não avaliam volume entregue, avaliam como a pessoa pensa** — as decisões tomadas, o que foi descartado, por que a tela é assim e não de outro jeito. Pedem para documentar o uso de IA e versionar artefatos de processo. Isso significa que a qualidade do README/documentação de decisões pesa tanto quanto o código, e que a interface **não pode ter cara de ferramenta de IA genérica** ("AI slop").

O pedido funcional: uma plataforma onde um Organizador publica eventos a partir de um catálogo externo (Ticketmaster Discovery), um Cliente reserva assento, paga (simulado), recebe ingresso com QR e pode compartilhar por link, e a Portaria valida o ingresso na entrada. A pasta de destino (`Fase 3 verzel/Projeto de desenvolvimento - Verzel`) já existe e está vazia — projeto greenfield.

Decisões já fechadas com o usuário: API = Ticketmaster Discovery; reserva = mapa de assentos interativo; deploy backend = Railway, frontend = Vercel; pagamento = mock interno determinístico; stack = NestJS + Prisma + Swagger no backend, Next.js + Tailwind + shadcn/ui + componentes de referência do 21st.dev + animações (Framer Motion) no frontend; direção visual = editorial escuro e cinematográfico; escopo = MVP obrigatório completo + polish forte, com só 1–2 opcionais leves (busca/filtro de eventos, seed caprichado).

Levantamento dos projetos NestJS/Prisma existentes do usuário (`TotalAgenda`, `ApaixoneSe-Back`) confirmou padrões a reaproveitar para manter consistência com o que ele já sabe: estrutura feature-module com guards/decorators (`@Public()`, `@Roles()`, `RolesGuard`, `JwtAuthGuard`), Swagger via `DocumentBuilder().addBearerAuth()` montado em `/api-docs` com prefixo global `/api`, e o hábito de complementar o Prisma DSL com SQL manual na migration quando a constraint que importa (ex. índice único parcial, `pg_advisory_xact_lock`) não é expressável no schema.

## Decisão de modelagem chave: o mapa de assentos é nosso, não da Ticketmaster

A Ticketmaster Discovery API não expõe mapa de assentos (isso é sistema interno de bilheteria deles). Então o organizador importa **metadados do show** (nome, imagem, data, local) do catálogo, e **configura o mapa de assentos na nossa plataforma** (seções, fileiras, assentos/fileira, preço por seção). Isso precisa estar explícito no README como decisão consciente — é exatamente o tipo de raciocínio que o PDF pede para documentar.

## Stack final

- **Backend**: NestJS + Prisma + PostgreSQL, Swagger em `/api-docs`, `@nestjs/passport` + `passport-jwt`, `@nestjs/schedule` (sweeper de holds expirados), `@nestjs/cache-manager` (cache do catálogo), `@nestjs/throttler` (rate-limit no proxy), `qrcode`/`jsonwebtoken` para o token assinado do QR (HS256).
- **Frontend**: Next.js (App Router) + Tailwind + shadcn/ui, componentes de referência adaptados do 21st.dev (nunca colados sem customizar — ver seção de direção visual), Framer Motion para as transições de estado, TanStack Query para data-fetching, Zustand só para estado client-side efêmero (seleção de assento, contador de hold), React Hook Form + Zod para formulários, `html5-qrcode` para leitura de câmera na portaria, `qrcode.react` para renderizar o QR a partir do token assinado retornado pelo backend.
- **Repositório**: pasta única com `backend/` e `frontend/` como irmãs (não replicar o monorepo Turborepo do `TotalAgenda` — aqui não há pacote compartilhado entre front e back, então seria cerimônia sem ganho; registrar isso no README como desvio deliberado do padrão de referência).

## Modelagem de dados (Prisma)

Convenções: `id` UUID, `@db.Timestamptz(6)` em datas, campos camelCase, enums UPPER_SNAKE_CASE, `@@index` em FKs de leitura quente.

- **User**: email (unique), passwordHash, name, `role` (enum `ORGANIZER | CUSTOMER | GATE_STAFF`).
- **Event**: título/descrição/imagem/data/local denormalizados do catálogo, `externalSource="TICKETMASTER"`, `externalId` (unique — evita duplicar o mesmo show), `externalRaw` (Json, snapshot para auditoria), `organizerId`, `capacity` (denormalizado), `status` (`DRAFT | PUBLISHED | CANCELED`).
- **Section**: eventId, name, priceCents, rowsCount, seatsPerRow, colorHex. Sem entidade `Row` própria (fileira é só uma dimensão gerada, não tem atributos — normalizar isso seria over-engineering).
- **Seat**: sectionId, eventId (denormalizado, indexado), row, number, label (`"A12"`), `status` (`AVAILABLE | HELD | SOLD` — **cache de leitura**, não é a fonte de verdade da garantia de concorrência).
- **Reservation**: eventId, seatId, customerId, `status` (`HOLDING | PAID | DECLINED | EXPIRED | CANCELED`), holdExpiresAt, totalCents, paymentCardLast4, paymentDeclineReason. Decisão deliberada: fundir Hold+Order numa única entidade com máquina de estados em vez de 3 tabelas — no MVP (1 assento = 1 checkout), separá-las seria normalização prematura; documentar no README como corte consciente, não esquecimento.
- **Ticket**: reservationId (unique, 1:1), eventId, seatId, ownerId, `serial` (nonce assinado no QR), `status` (`VALID | USED | VOID`), usedAt, usedByGateUserId, `shareSlug` (unique, token opaco separado do id interno).

**Escopo explícito**: 1 assento por reserva (o enunciado usa singular — "reserva seu lugar"). Multi-assento por pedido fica de fora, citado no README como corte consciente.

### Garantia de "mesmo assento não vendido duas vezes"

Combinar dois mecanismos, descartando lock otimista por ser redundante:
1. **Lock pessimista** (`pg_advisory_xact_lock(hashtext(seatId)::bigint)` dentro de `$transaction`, mesmo padrão já usado no `BookingsService` do `TotalAgenda`) — serializa tentativas concorrentes, permite responder rápido com mensagem clara.
2. **Índice único parcial** (`Reservation(seatId)` `WHERE status IN ('HOLDING','PAID')`, adicionado à mão na migration SQL porque o Prisma DSL não expressa `WHERE` em `@@unique`) — é a rede de segurança real, vale mesmo com bug de app, retry de rede, ou múltiplas instâncias do backend.

### Hold expira em 7 minutos (`HOLD_TTL_MINUTES` via env)

Fonte de verdade: reconferência de `holdExpiresAt` dentro da própria transação de escrita, sempre — nunca depende de um job rodar a tempo. Sweeper via `@nestjs/schedule` (cron ~30s) só faz a limpeza/consistência (marca `EXPIRED`, libera `Seat`). No GET do mapa, holds expirados são tratados como livres na resposta mesmo antes do sweeper rodar (só efeito de leitura).

## QR não-forjável

JWT HS256 assinado com secret dedicado (`QR_SIGNING_SECRET`, diferente do secret de auth), payload `{ ticketId, eventId, serial }`, sem `exp` curto (o ingresso deve continuar válido até o evento, "expiração" é modelada por `status`, não por claim JWT). Validação na portaria via update condicional atômico: `UPDATE Ticket SET status='USED', usedAt=now(), usedByGateUserId=$staff WHERE id=$id AND status='VALID'` — `rowCount === 0` já resolve "já foi usado" sem race condition, reaproveitando a mesma estratégia de "update condicional + checar linhas afetadas" usada no lock de assento.

Por que HS256 simétrico e não RS256/EdDSA: há um único verificador (nosso backend) — assimetria só valeria a pena com leitores offline de terceiros com chave pública embarcada, que não é o caso.

**Link de compartilhamento**: `shareSlug` opaco, distinto do `ticketId`/token. `GET /tickets/:shareSlug` é público (sem auth) e mostra o QR real — é literalmente o caso de uso "comprei para alguém, mando o link, essa pessoa mostra na entrada".

## Fluxo de reserva

1. `GET /events/:id/seatmap` — leitura do status por assento.
2. `POST /events/:id/seats/:seatId/hold` (role `CUSTOMER`) — advisory lock → reconfere disponibilidade → cria `Reservation HOLDING` (`holdExpiresAt`) → `Seat.status=HELD`. Frontend mostra contador regressivo.
3. `POST /reservations/:id/pay` — mock determinístico documentado no README/seed: `4242 4242 4242 4242` sempre aprova, `4000 0000 0000 0002` sempre recusa, qualquer outro Luhn-válido aprova/recusa pelo último dígito (par/ímpar).
4. Aprovado → `Reservation.PAID`, `Seat.SOLD`, cria `Ticket` (gera `serial`, assina JWT). Recusado → `Reservation.DECLINED`, `Seat.AVAILABLE`, cliente pode tentar de novo.
5. Abandono sem ação: coberto pelo TTL automaticamente (sem precisar de handler de cancelamento explícito); `DELETE /reservations/:id` via `navigator.sendBeacon` no unload é nice-to-have de UX, não estrutural.

## Integração Ticketmaster Discovery API

Backend guarda a API key — frontend nunca fala direto com a Ticketmaster. `GET /catalog/events/search?keyword=&city=&page=` e `GET /catalog/events/:externalId` (role `ORGANIZER`), com cache em memória (~5min, `@nestjs/cache-manager` — Redis é overkill para 7 dias/instância única, corte consciente) e rate-limit no nosso próprio endpoint. Falha graciosa se a Ticketmaster estiver fora do ar ("catálogo indisponível no momento"), já que é dependência externa fora do controle no dia da avaliação. **Seed resiliente**: capturar payload real de 1–2 eventos durante o dev e versionar como fixture local usada pelo `seed.ts`, para o seed não depender da Ticketmaster estar no ar/com key válida na hora da avaliação.

## Autenticação e papéis

`POST /auth/login` (bcrypt + JWT, payload `{sub, role, email}`, sem refresh token — corte consciente, ~24h de expiração bastam para demo). `JwtAuthGuard` global respeitando `@Public()`, `RolesGuard` + `@Roles()`, mesmo padrão do `TotalAgenda`. Rotas públicas: login, `GET /events`, `GET /tickets/:shareSlug`. Resto exige auth. Seed cria exatamente os 4 usuários exigidos (1 organizador, 2 clientes, 1 portaria) com senhas documentadas no topo do README.

## Estrutura de pastas

**Backend** (`backend/src/`): `common/{decorators,guards,filters,utils}` (`public.decorator.ts`, `roles.decorator.ts`, `current-user.decorator.ts`, `jwt-auth.guard.ts`, `roles.guard.ts`), `config/` (validação de env), `prisma/{prisma.module.ts,prisma.service.ts}`, módulos por feature: `auth/`, `events/`, `catalog/` (proxy Ticketmaster), `reservations/` (hold+pagamento mock, mesma transação), `tickets/` (assinatura/verificação QR, "meus ingressos", share link), `gate/` (validação, 4 status). `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`.

**Frontend** (`frontend/src/`): route groups por papel — `app/(public)/{page.tsx, events/[slug]/page.tsx, events/[slug]/checkout/page.tsx, t/[shareSlug]/page.tsx, login/page.tsx}`, `app/(customer)/my-tickets/page.tsx`, `app/(organizer)/organizer/{page.tsx,new/page.tsx,[eventId]/page.tsx}`, `app/(gate)/gate/page.tsx`. `components/{ui (shadcn), seatmap, events, tickets, gate}`, `lib/{api-client.ts,auth.ts}`. Gating de rota no `middleware.ts` é só UX — autorização real sempre no backend via guards (deixar isso explícito no README para não parecer fronteira de segurança).

## Deploy real (Railway + Vercel)

**Railway**: Postgres gerenciado + serviço Node do `backend/`, start command `prisma migrate deploy && node dist/main.js` (Railway não tem release phase separada). Seed **idempotente** (upserts) para poder rodar com segurança logo após o deploy — remove o risco de o avaliador não saber semear o banco. Env vars: `DATABASE_URL` (auto), `JWT_SECRET`, `QR_SIGNING_SECRET`, `TICKETMASTER_API_KEY`, `CORS_ORIGIN`, `NODE_ENV=production`. Swagger ativo em produção em `/api-docs` (útil para o avaliador testar a API direto). `GET /health` para o health check do Railway.

**Vercel**: Next.js, `NEXT_PUBLIC_API_URL` apontando para a URL do Railway, `next.config.js` com `images.remotePatterns` liberando `s1.ticketm.net`.

**Conexão**: CORS com allow-list explícita (`[CORS_ORIGIN, 'http://localhost:3000']`). Auth via `localStorage` + header `Authorization: Bearer` (não cookie httpOnly cross-domain — trade-off documentado explicitamente no README: cookie `SameSite=None` entre domínios Vercel/Railway é mais frágil de acertar no prazo).

Para dev local: README com um `docker run` de uma linha para subir Postgres local (não é Docker Compose completo — não faz parte dos opcionais escolhidos, é só conveniência de setup).

## Direção visual — "editorial escuro e cinematográfico" (fugir do AI slop)

Decisões concretas, não genéricas:
1. Tipografia com regra rígida: serifada de alto contraste (Fraunces/Instrument Serif) **só** em títulos de evento, nunca em botão/label; pareada com grotesca neutra (Inter/Geist) no chrome de UI. Salto de escala grande entre título e corpo.
2. Mapa de assentos como **planta baixa real** (seções como formas/polígonos refletindo geometria de venue, palco no topo, fileiras em leque, rótulos na serifada) — não a grade genérica de quadradinhos coloridos.
3. Cards de evento como fragmento de cartaz de turnê: crop retrato, kicker caixa-alta (venue • data) + regra fina colorida acima do título serifado, duotone sutil para unificar fotos variadas da Ticketmaster.
4. Uma única cor de destaque (âmbar/dourado, clima de spotlight) usada **só** para estado (assento disponível, CTA primário) — nunca decoração.
5. Micro-motion sempre ligado a transição de estado real (seleção com press+glow tátil, "processando pagamento" com pausa deliberada, QR "materializa" ao entrar em Meus Ingressos) — nunca blobs/gradientes flutuando em loop (tell mais óbvio de output de IA genérico).
6. Preto quase-puro com tom quente (não `#000`, não slate azulado padrão de biblioteca), textura de grão sutil em superfícies grandes.
7. **21st.dev/shadcn como ponto de partida, não produto final**: usar componentes de lá como base estrutural (ex. um hero, um form pattern), mas sempre re-tematizar cores/tipografia/espaçamento para a direção acima antes de considerar pronto — colar componente genérico sem adaptar é exatamente o "AI slop" que o PDF pede para evitar.

UX não-óbvia: contador de hold com aviso nos últimos ~60s oferecendo renovar; assento vira "vendido" no próprio mapa em tempo real quando outra pessoa leva na frente (em vez de toast genérico); portaria em tela cheia com cor+ícone+1 palavra por status, `ALREADY_USED` mostrando quando/por quem foi validado antes, `WRONG_EVENT` mostrando para qual evento o ingresso É válido; entrada manual só valida no submit, não a cada tecla.

## Status em 13/08 — backend 100% pronto, foco agora no frontend + ambiente local

O backend está completo e testado: os 6 módulos (`auth`, `events`, `catalog`, `reservations`, `tickets`, `gate`) estão implementados, com 146 testes unitários + 4 e2e (todos passando), lint e build limpos, hardening de segurança aplicado (Helmet, JWT com algoritmo fixado em HS256, throttle no login, validação de secrets fortes em produção), e validado com smoke tests manuais completos contra um Postgres real — incluindo os 4 status da portaria, a garantia de concorrência no hold de assento, e o ciclo pagamento aprovado/recusado. Tudo commitado na branch `feature/backvalidation`, em 6 commits.

O frontend só tem o scaffold e a tela de login funcionando. **A partir de agora o foco muda para: (1) estabilizar o ambiente local pra conseguirmos testar tudo no navegador, e (2) construir o resto do frontend, módulo a módulo, testando cada um de verdade antes de avançar pro próximo.**

Decisão de deploy confirmada com o usuário: **Railway (backend) + Vercel (frontend)**, como o plano original já previa e como o PDF cita como referência aceitável. Cogitamos usar o VPS do usuário como alternativa, mas descartamos: o VPS já tem outras coisas rodando, não tem Docker instalado, e exigiria configurar proxy reverso do zero — mais fricção e risco pro que já está no ar lá, sem ganho real sobre o Railway. O deploy em si fica para depois que o frontend estiver validado localmente — não é o foco imediato.

### Ambiente local: Postgres estável via Docker Compose (não mais `prisma dev`)

O `prisma dev` (Postgres local efêmero do próprio Prisma, usado até agora) se mostrou instável neste ambiente — a instância caía sozinha após alguns minutos ociosa, exigindo reiniciar e remigrar várias vezes ao longo da sessão anterior. Substituir por um Postgres real via Docker Compose resolve isso de vez (container persistente, não expira).

**Pré-requisito, a ser feito pelo usuário (fora do meu alcance neste ambiente sandboxed, exige admin):** o Docker Desktop está com um bug conhecido — um socket travado (`AppData\Local\Docker\run\dockerInference` e `userAnalyticsOtlpHttp.sock`, reparse points de um recurso de IA do Docker que trava numa reinicialização anterior) que impede o daemon de subir. Fix: com Docker Desktop fechado, abrir PowerShell **como administrador** e rodar:
```powershell
Remove-Item "$env:LOCALAPPDATA\Docker\run" -Recurse -Force
```
(o Docker recria essa pasta de estado de runtime sozinho; não mexe nas imagens/volumes já baixados, que ficam em `Docker\wsl\data`). Depois abrir o Docker Desktop normalmente e confirmar que fica com o ícone "Running".

**O que eu faço depois que o Docker estiver de pé:**
- `backend/docker-compose.yml` com um único serviço `postgres:16-alpine`, porta `5432` mapeada, volume nomeado (`pgdata`) para persistir dados entre restarts do container, usuário/senha/nome de banco fixos (não gerados aleatoriamente a cada vez, ao contrário do `prisma dev`).
- Atualizar `backend/.env` e `.env.example` para `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/elite_dev_tickets?schema=public"` (fixo, sem porta mudando a cada restart).
- Rodar `docker compose up -d`, depois `npx prisma migrate deploy` + `npm run db:seed` uma vez, e a partir daí o banco fica no ar persistentemente — sem precisar remigrar toda vez que eu (ou você) abrir uma sessão nova de terminal.
- Atualizar o README com o passo a passo (`docker compose up -d` como primeiro passo do setup local).
- Isso também bate com o opcional "Docker Compose" citado no PDF, então vira um pequeno ganho de nota de brinde.

### Construção do frontend — módulo a módulo, testado no navegador a cada passo

Mesma lógica usada no backend: implementar um pedaço completo (não a UI toda de uma vez), testar de verdade contra a API real rodando localmente (usando as ferramentas de browser — não só confiar que compila), só então seguir pro próximo. Ordem, cada item termina com commit:

1. **Layout/sessão compartilhada**: header com estado de login (papel atual, logout), proteção de rota client-side via `proxy.ts` (Next 16 — não `middleware.ts`, que foi descontinuado nessa versão) redirecionando quem não tem o papel certo. Isso é só UX; a autorização real continua nos guards do backend.
2. **Público**: home com listagem real de eventos (`GET /events`, busca/filtro já suportado pelo backend) nos cards estilo pôster da direção visual definida; página de detalhe do evento (`GET /events/:id`).
3. **Organizador**: busca no catálogo Ticketmaster (`GET /catalog/events`) → formulário de seções/preços → `POST /events` → lista "meus eventos" (`GET /events/organizer/mine`) → botão publicar.
4. **Mapa de assentos + checkout**: componente de mapa como planta baixa (decisão visual central do projeto), hold (`POST /events/:id/seats/:seatId/hold`) com contador regressivo visível, formulário de pagamento mock com os dois cartões de teste documentados, telas de resultado aprovado/recusado.
5. **Meus ingressos**: `GET /tickets/mine`, QR renderizado com `qrcode.react` a partir do `qrToken` retornado pelo backend, botão de copiar link de compartilhamento.
6. **Página pública do ingresso compartilhado**: `GET /tickets/:shareSlug` (rota já existe como placeholder, falta o conteúdo real).
7. **Portaria**: seleção do evento sendo checado, leitura de câmera (`html5-qrcode`) com entrada manual como alternativa, tela de resultado em tela cheia por status (cor+ícone+1 palavra, com os detalhes extras de `ALREADY_USED`/`WRONG_EVENT` que o backend já retorna).

Cada etapa reaproveita os componentes shadcn já instalados (`button`, `card`, `form`, `dialog`, `sheet`, `tabs`, `sonner` etc.), retematizados pra direção "editorial escuro cinematográfico" já definida — não uso os componentes shadcn/21st.dev crus.

## Plano de execução — 6 dias (entrega com 1 dia de antecedência)

O prazo do desafio é 7 dias corridos, mas a meta aqui é fechar tudo em 6 e entregar com um dia de folga. Isso comprime principalmente os dias de polish/hardening (que eram 3 dias de sobra no plano original) em 2 — o núcleo funcional continua tendo prioridade total e sai cedo, sem compressão, porque é a parte de maior risco técnico. Ordem prioriza ter o **fluxo completo funcionando ponta a ponta o quanto antes** (dica central do PDF), deixando polish visual para depois.

- **Dia 1**: scaffold backend+frontend, schema Prisma completo + migration inicial, Postgres no Railway, deploy vazio do backend **já hoje** (de-risk do pipeline), Swagger, auth completo (login+JWT+guards+roles) validado contra os 4 seeds, skeleton do Next no Vercel. Meta: login pelos 3 papéis contra o backend já publicado.
- **Dia 2**: proxy+cache Ticketmaster, fluxo organizador busca→escolhe→configura seções→publica, seed com 1+ evento real. Frontend: wizard do organizador (sem estilo) + listagem/detalhe pública com dados reais. Meta: organizador publica evento de ponta a ponta.
- **Dia 3** (parte mais arriscada tecnicamente, por isso cedo, sem compressão): endpoint de mapa, hold com advisory lock + índice único parcial, pagamento mock, assinatura/verificação de QR, endpoint de portaria com os 4 status. Testar concorrência manualmente (2 requisições paralelas no mesmo assento). Meta: backend completo e garantia de concorrência verificada.
- **Dia 4**: frontend dos fluxos reais — mapa interativo, checkout com contador, "Meus ingressos" com QR real, portaria (câmera+digitação) ligada aos 4 status, página pública de compartilhamento. Meta: **jornada completa no ar** (feia, mas inteira) — já no dia 4, sobrando 2 dias para polish/hardening/documentação.
- **Dia 5**: identidade visual completa (tipografia, paleta, cards-pôster, mapa como planta, Framer Motion, telas de portaria refinadas) + opcionais escolhidos (busca/filtro de eventos, seed caprichado com múltiplos eventos/venues, incluindo um ticket pré-usado e um de outro evento para demonstrar os 4 status sem esforço do avaliador).
- **Dia 6**: hardening (hold expirado, pagamento recusado com retry, estados vazios/loading/erro, responsividade — principalmente a portaria, que roda no celular de alguém) + reconferência CORS/env entre os deploys + README + `AI_USAGE.md` + QA final como se fosse o avaliador (navegador anônimo, os 3 papéis, os 4 resultados de portaria). Sem buffer formal — se algo do dia 5 atrasar, é aqui que absorve, mas sem deixar feature nova entrar de última hora.

## README e documentação de uso de IA

**README** (credenciais perto do topo): visão geral + link do deploy + link do Swagger; setup passo a passo (clone, env vars de exemplo, install, migrate, seed, dev); tabela com credenciais dos 4 usuários; arquitetura (estrutura de pastas, por que Postgres/Railway/Vercel); seção **"Decisões e trade-offs"** (mapa de assentos gerado por nós, assinatura do QR, hold/concorrência, escopo 1-assento, localStorage vs cookie, cache em memória vs Redis, pasta única vs monorepo); seção **"O que não implementei e por quê"** (painel completo do organizador, cancelamento com devolução, testes automatizados, mapa em tempo real via websocket — cada um com 1 linha de razão); "Known issues"; os dois números de cartão mock; nota de que o seed já inclui ticket pré-usado e ticket de outro evento para ver os 4 status de portaria sem precisar simular uma compra inteira. Em português (mesmo idioma do desafio e do avaliador).

**`AI_USAGE.md`**: tabela ferramenta → onde foi usada → o que foi feito/revisado manualmente (ex. "estratégia de concorrência desenhada e validada com teste de requisições paralelas escrito à mão"). Versionar também este plano de arquitetura como `docs/ARCHITECTURE.md` — atende diretamente ao pedido do PDF de versionar artefatos de processo.

## Arquivos críticos (a criar)

- `backend/prisma/schema.prisma` — modelo de dados e âncora das constraints de concorrência (inclui migration manual com índice único parcial).
- `backend/src/reservations/reservations.service.ts` — hold com advisory lock, máquina de estados, pagamento mock, criação do ticket.
- `backend/src/tickets/ticket-signing.util.ts` — assinatura/verificação HMAC do QR, geração de `shareSlug`.
- `backend/src/gate/gate.service.ts` — update condicional atômico que resolve os 4 status de validação.
- `frontend/src/components/seatmap/SeatMap.tsx` — decisão visual central (planta baixa) + fluxo de seleção/hold no cliente.
- `backend/prisma/seed.ts` — os 4 usuários, evento(s) publicados, ticket pré-usado e de outro evento.
- `README.md`, `AI_USAGE.md`, `docs/ARCHITECTURE.md`.

## Verificação end-to-end

1. Local: `docker compose up -d` (Postgres persistente) → `prisma migrate deploy` → `seed.ts` → subir backend (Swagger em `/api-docs`) e frontend (`next dev`).
2. Testar via Swagger: login dos 3 papéis, busca no catálogo, publicação de evento, hold de assento, pagamento aprovado/recusado, geração de ticket, validação de portaria (válido/inválido/já usado/evento errado).
3. Teste de concorrência: disparar 2 requisições `hold` simultâneas no mesmo assento (script simples ou duas abas), confirmar que só uma vence e a outra recebe erro claro.
4. No browser: fluxo completo cliente (buscar evento → escolher assento → pagar → ver QR em "Meus ingressos" → abrir link de compartilhamento em aba anônima) e fluxo portaria (ler QR via câmera do notebook/celular + digitação manual), conferindo os 4 estados visuais.
5. Após deploy (Railway+Vercel): repetir o fluxo completo contra as URLs públicas, verificar CORS, e confirmar que o `seed` já deixou dados navegáveis sem setup manual do avaliador.

## Redesign visual — identidade "PULSA" (14/08, branch `refactor/pulsa-visual-identity`)

### Contexto

Após o backend e o frontend funcional estarem completos e mergeados em `main` (PR aceito), o usuário trouxe um guia de estilo de marca ("PULSA") criado no Claude Design (projeto `Identidade visual Pulsa`, arquivo `Guia de Estilo - PULSA.dc.html`, lido via `DesignSync`) e pediu para redesenhar visualmente todo o site com essa identidade — cores, tipografia, componentes, dark/light mode e animações — mantendo o hábito de commits pequenos e frequentes já estabelecido no projeto. Isso é puramente visual/UX: nenhuma rota, contrato de API ou lógica de negócio muda.

### Identidade extraída do guia

**Conceito:** plataforma de ingressos para festivais de música, festas premium e eventos esportivos. Três palavras guiam a decisão visual: Energia, Confiança, Exclusividade.

**Paleta** (hexs exatos do guia):
- Coral energético `#FF3B5C` (CTA primário) — hover `#E62A4B`, pressed `#B21F3C`, disabled bg `#F1EFEC`/texto `#A9A6BD`.
- Violeta Pulsa `#6C2BD9` — marca/ação secundária.
- Champagne VIP `#E8C468` — reservado para estados de aviso/exclusividade.
- Lime `#C6FF3D` — reaproveitado como cor de "sucesso/válido" (o guia já usa lime como pill de alto contraste; mapeamento natural para "vá").
- Esportes `#2D6CFF` — reaproveitado como cor de "informação".
- Festas `#FF2FB0` — mantido como token de categoria reservado (sem uso ainda, ver decisão de escopo abaixo).
- Light mode: bg `#FAF9FC`, texto `#14121C` (15.2:1), texto secundário `#6B6980` (4.9:1), divisor `#E4E2EA`.
- Dark mode: bg `#0C0B14`, superfície `#16141F`, texto `#F5F3FA` (16.8:1), texto secundário `#A9A6BD` (6.1:1), divisor `#2A2836`.
- Nota do próprio guia: coral sobre branco é só ~3.4:1 — por isso só em botão sólido com texto branco, nunca como cor de texto corrido (já é assim no plano abaixo).

**Tipografia:** Space Grotesk 700/800 (display/headings, "cartaz de show") + Manrope 400/500/600 (corpo/checkout, legibilidade). Substituem Fraunces+Geist atuais.

**Componentes:** cards com radius 16px e sombra difusa baixa (`0 8px 24px rgba(20,18,28,.10)`); botões/tags em pill (radius 100%) com 4 estados (default/hover escurece+translateY(1px)/pressed escurece mais+scale(.97)/disabled cinza 45%); card de evento com imagem, kicker, título Space Grotesk, preço+CTA sempre na mesma linha.

### Decisão-chave: como o token system se propaga (baixo risco, alta cobertura)

O frontend já usa Tailwind v4 com `@theme inline` em `globals.css` mapeando nomes semânticos do shadcn (`--background`, `--primary`, `--border` etc.) — **todo componente shadcn (Button, Card, Badge, Input, Dialog, Sheet, Tabs...) e a maioria das páginas já consomem só essas variáveis**, nunca cor hardcoded. Confirmei isso via grep: `bg-|text-|border-(amber|emerald|sky|violet|...)-[0-9]` só aparece em **dois arquivos**: `seat-map.tsx` e `gate-result.tsx`. Isso significa que reescrever os valores das variáveis em `globals.css` (mantendo os MESMOS nomes) + trocar as fontes já re-pinta automaticamente ~90% do app (login, event-detail, checkout, my-tickets, organizer/*, my-tickets) sem tocar nesses arquivos — só preciso editar manualmente onde há cor hardcoded ou onde a hierarquia de informação muda de verdade (header, home, seat-map, gate-result).

Vou também corrigir de passagem um bug real encontrado durante a exploração: `--font-sans: var(--font-sans)` em `globals.css` é auto-referente (nunca resolve), deveria apontar pra variável do Manrope.

### Decisão-chave: dark/light mode via `next-themes` (já é dependência, só não está montado)

`next-themes@^0.4.6` já está no `package.json` mas **não tem `ThemeProvider` nenhum montado** — hoje `layout.tsx` força `className="dark"` fixo no `<html>`, e o único consumidor de `useTheme()` (`sonner.tsx`) sempre recebe o default. Plano: montar `<ThemeProvider attribute="class" defaultTheme="dark" enableSystem>` em `providers.tsx` (a estratégia `attribute="class"` já bate 100% com o `@custom-variant dark (&:is(.dark *))` existente, zero mudança de convenção), remover o `dark` fixo de `layout.tsx`, adicionar `suppressHydrationWarning` no `<html>` (obrigatório com next-themes), e criar um botão de alternância (`components/theme-toggle.tsx`, ícone sol/lua com crossfade via `motion/react`) no header. Default dark (mantém a energia "show à noite" do conceito original), mas totalmente navegável em light e respeitando preferência do SO na primeira visita.

### Decisão-chave: mapeamento semântico de cor além do CTA

O guia não define cor de "sucesso"/"erro"/"aviso" explicitamente (isso é doc de marca, não de UI states) — para as 4 telas de portaria (`VALID/ALREADY_USED/WRONG_EVENT/INVALID`) e badges de status (ticket, evento do organizador), decidi reaproveitar as próprias cores da paleta em vez de inventar tons novos: lime = sucesso/válido (o guia já usa lime como pill de alto contraste, mapeamento natural pra "liberado"), champagne = aviso/já-utilizado (dourado neutro, não alarmante), azul-esportes = informação/evento-errado, e um vermelho de destructive **distinto do coral** (coral é o CTA em todo o app — reusá-lo também como "erro" criaria ambiguidade visual). Isso mantém a paleta disciplinada (reaproveita hexs já definidos) em vez de inflar o sistema com tons não documentados.

### Decisão-chave: até onde vai o redesign da home (sem inventar dado falso)

O guia (seção 05) desenha uma home de marketplace completa: hero, chips de categoria, "em alta"/urgência, carrosséis por categoria, chips de cidade, seção de confiança com depoimentos, CTA final de "baixe o app". O produto real não tem: categoria de evento (nem no schema do Prisma, nem no `EventSummary` do frontend — confirmei), contagem de assentos restantes exposta na listagem, nem app mobile. Decisão: **implementar as partes que são honestas com o dado real, adaptar as que fazem sentido pro produto real, e não implementar as que exigiriam inventar dado/funcionalidade que não existe**:
- ✅ **Hero**: evento mais próximo (`startsAt` mais cedo entre os publicados) — heurística real e defensável de "em destaque", não aleatória.
- ✅ **Chips de cidade**: o backend **já suporta** `GET /events?city=` (confirmei em `events.service.ts:146-153`, nunca usado pelo frontend até agora) — vou agregar cidades reais a partir da própria lista de eventos e ligar o clique nesse parâmetro já existente. 100% funcional, zero mudança de backend.
- ✅ **Grid "em cartaz"**: o que já existe hoje, só re-estilizado + animado (já vem ordenado por `startsAt asc`, então já é "em breve primeiro" de graça).
- ✅ **Seção de confiança**: 3 cards editoriais sobre capacidades REAIS já implementadas (QR assinado, validação em tempo real na portaria, lock de concorrência no assento) — vira conteúdo de marketing honesto sobre engenharia que existe, sem números/depoimentos inventados (depoimento falso de "cliente satisfeito" é exatamente o tipo de "AI slop" que o PDF do desafio pede pra evitar).
- ✅ **CTA final**: adaptado de "baixe o app" (não existe) pra "crie seu evento" → linka pro fluxo de organizador, que é real.
- ❌ **Chips de categoria / carrosséis por categoria / badge de urgência "últimos ingressos"**: descartados — exigiriam campo de categoria e contagem de assentos que não existem hoje; fica documentado aqui como corte consciente (mesmo padrão de "por que não" já usado no resto do plano), não como esquecimento.
- ❌ **Depoimentos de clientes**: descartado pelo motivo acima (fabricação de prova social).

Vou também renomear a marca de "Elite Dev Ingressos" pra **"PULSA"** no header/wordmark/título da página — é literalmente o guia de identidade dessa marca, adotar o nome faz parte de adotar a identidade.

### Arquivos a editar

**Camada de tokens (efeito cascata, cobre ~90% do app sozinha):**
- `frontend/src/app/globals.css` — paleta PULSA completa (light+dark) nos mesmos nomes de variável já usados pelo shadcn, `--radius: 1rem` (cards em 16px), novos tokens semânticos (`--color-success`, `--color-warning`, `--color-info`, mantendo `--destructive` só que recolorido), fix do bug `--font-sans`.
- `frontend/src/app/layout.tsx` — troca Fraunces+Geist → Space Grotesk+Manrope (`next/font/google`), remove `dark` fixo, `suppressHydrationWarning`, título "PULSA".
- `frontend/src/app/providers.tsx` — monta `ThemeProvider` do `next-themes`.

**Primitivas (cascata pros consumidores):**
- `frontend/src/components/ui/button.tsx` — `rounded-full`, variantes coral/violeta/outline com os 4 estados do guia, `active:scale-[.97]`.
- `frontend/src/components/ui/badge.tsx` — variantes novas `success`/`warning`/`info` (lime/champagne/azul).

**Hardcoded, precisam de edição manual (os únicos 2 achados no grep):**
- `frontend/src/components/seatmap/seat-map.tsx` — disponível=contorno violeta, selecionado/pending=coral preenchido, ocupado/reservado=neutro (troca os `amber-*` hardcoded).
- `frontend/src/components/gate/gate-result.tsx` — recolore os 4 estados pro mapeamento semântico acima (mantém a decisão já documentada de não ter exit-animation nessa tela).

**Remapeamento de variant (badges de status, agora que success/warning existem):**
- `frontend/src/components/tickets/ticket-card.tsx`, `frontend/src/app/(organizer)/organizer/page.tsx`.

**Header/marca:**
- `frontend/src/components/site-header.tsx` — wordmark PULSA, adiciona `theme-toggle`.
- `frontend/src/components/theme-toggle.tsx` (novo).
- `frontend/src/components/site-footer.tsx` (novo, minimal — brand + tagline, sem link morto).

**Home (maior bloco de UI nova):**
- `frontend/src/hooks/use-events.ts` — `useEventsQuery` passa a aceitar `city` opcional (backend já suporta).
- `frontend/src/app/(public)/page.tsx` — reestrutura em hero + chips de cidade + busca + grid + confiança + CTA.
- `frontend/src/components/home/hero-event.tsx`, `city-chips.tsx`, `trust-section.tsx`, `cta-band.tsx` (novos).
- `frontend/src/components/events/event-card.tsx` — polish de hover (`motion` lift + a animação de zoom da imagem que já existe).

**Não precisam de edição** (herdam tudo via token cascade): `(public)/events/[eventId]/page.tsx`, `.../checkout/page.tsx`, `(public)/login/page.tsx`, `(customer)/my-tickets/page.tsx`, `(gate)/gate/page.tsx`, `(organizer)/organizer/new/page.tsx`, `(organizer)/organizer/[eventId]/page.tsx` — só ganham polish leve de animação (`motion` fade/stagger em listas) se sobrar tempo, não é obrigatório pra correção visual.

### Commits (pequenos, na ordem)

1. `chore(frontend): tokens de cor + tipografia PULSA em globals.css/layout.tsx`
2. `feat(frontend): dark/light mode via next-themes + toggle no header`
3. `feat(frontend): re-tema Button/Badge para os padrões PULSA (pill, estados, variantes semânticas)`
4. `feat(frontend): recolore mapa de assentos para a paleta PULSA`
5. `feat(frontend): recolore os 4 estados da portaria para a paleta PULSA`
6. `feat(frontend): rebrand do header — PULSA + toggle de tema`
7. `feat(frontend): remapeia badges de status (ticket e organizador) para as novas variantes semânticas`
8. `feat(frontend): home — hero do próximo evento, filtro de cidade real, seção de confiança, CTA de organizador, footer`
9. `feat(frontend): polish de hover/entrada no card de evento`
10. commits extras conforme bugs/ajustes aparecerem testando no navegador (mesmo padrão usado a sessão toda)

### Verificação

1. `git checkout main && git pull && git checkout -b refactor/pulsa-visual-identity`.
2. Depois de cada commit relevante, subir `docker compose up -d` (se não estiver) + backend (`npm run start:dev`) + frontend (`npm run dev`) e conferir no browser real (Browser pane): home (hero, chips de cidade clicáveis filtrando de verdade, grid, seção de confiança, CTA), alternar tema claro/escuro (persiste em reload — `next-themes` usa localStorage), event-detail, checkout completo (hold→pagar→aprovado/recusado), my-tickets (QR continua com fundo branco fixo — só ele não deve mudar com o tema, pra continuar legível pra leitor de QR), portaria nos 4 status (válido/já usado/evento errado/inválido) via digitação manual, organizer (lista + criar + publicar).
3. Contraste: conferir visualmente que nenhum texto secundário fica ilegível em cima do coral/violeta usados só em botão (nunca como texto corrido, conforme já avisa o próprio guia).
4. `npm run build` e `npx tsc --noEmit` no frontend antes do commit final, sem quebrar nada do que já funcionava (checkout, hold de assento, portaria).

## Migração de deploy: Railway → Render + Neon (15/08)

O trial gratuito do Railway (previsto nas seções acima como plataforma de backend) acabou no meio do processo de deploy, antes do primeiro deploy real em produção. Alternativa escolhida: **Render** (Web Service gratuito) pro backend + **Neon** (Postgres gerenciado gratuito) pro banco — mesma forma (build + start command + env vars), provedor diferente. `backend/railway.json` ficou no repositório sem uso por um tempo (não removido — documentar aqui pareceu mais honesto que apagar rastro de uma decisão que existiu) — *atualização de 16/08: removido na auditoria final, ver última seção deste documento; o registro histórico acima permanece intacto.*

Três problemas reais apareceram só durante o deploy de verdade, nenhum visível rodando local:
1. **`nest: not found`** no build do Render — o `NODE_ENV=production` que o Render seta por padrão faz `npm install` pular `devDependencies`, onde mora o `@nestjs/cli`. Fix: `Build Command` = `npm install --include=dev && npm run build`.
2. **`dist/main.js` não existia em runtime**, só `dist/src/main.js`, mesmo com o build passando. Causa raiz: `prisma/seed.ts` importa de `../src/...`, e quando o `seed.ts` acaba sendo incluído no build do Nest (porque `prisma db seed` chama `ts-node prisma/seed.ts` e o `tsconfig.build.json` não excluía a pasta `prisma/`), o TypeScript recalcula o `rootDir` inferido a partir do ancestral comum de TODOS os arquivos compilados — que deixa de ser `backend/src` e passa a ser `backend`, deslocando a saída. Fix: adicionar `"prisma"` ao array `exclude` de `backend/tsconfig.build.json`. Verificado rodando `node dist/main.js` isoladamente (não só `nest start`) depois do fix, pra não repetir o erro de considerar "build passou" como sinônimo de "output está no lugar certo".
3. **`JWT_SECRET` continuava reprovando a validação de env mesmo aparecendo certo no dashboard do Render** — o dashboard não salva a edição de uma env var só por ela aparecer preenchida no campo; é preciso clicar em "Save, rebuild, and deploy" explicitamente depois de editar.

Consequência prática pro README: as instruções de deploy foram reescritas pra Render+Neon (a versão Railway foi removida do README pra não confundir quem for reproduzir o deploy — quem quiser o histórico da decisão original encontra aqui). URLs reais de produção (Vercel + Render + Swagger) foram adicionadas ao README nesse mesmo momento, já que antes só havia placeholders mesmo com o deploy funcionando.

## Navbar inferior mobile (LimelightNav) + logo (15/08)

A navegação mobile usa um componente de referência fornecido pelo usuário (`limelight-nav.tsx`, adaptado de um projeto externo) — barra com um indicador "limelight" que desliza entre os itens ativos via `useLayoutEffect` medindo `offsetLeft`/`offsetWidth`, com um efeito de brilho (`clip-path` + gradiente) que intencionalmente extrapola a própria largura do indicador.

Dois bugs reais apareceram só em teste no dispositivo real do usuário (não reproduzidos em nenhum viewport testado durante o desenvolvimento):
- **Logout acidental**: "Sair" vivia como item da própria barra de navegação (ex. `Início | Ingressos | Sair`), sem separação visual do item real vizinho — um toque perto da borda de "Ingressos" acabava caindo em "Sair". Fix: removido `getItemsForRole()` (`mobile-bottom-nav.tsx`) pra CUSTOMER/ORGANIZER/GATE_STAFF — a barra volta a ter só destinos de navegação real. "Sair" passou a viver isolado no header (`site-header.tsx`), visível em qualquer largura de tela (antes só aparecia em desktop).
- **Brilho "cortado"**: o efeito decorativo do indicador (`left:-30%`/`w:160%`, proposital pra criar um glow maior que o próprio indicador) não tinha nenhum container com `overflow-hidden` contendo-o — em dispositivos reais ele estourava a borda da barra de forma imprevisível dependendo do navegador/tela. Fix: `overflow-hidden` no `<nav>` do `LimelightNav`.

Também foi integrada a arte final da logo PULSA (entregue pelo usuário como PNGs: símbolo isolado + dois lockups completos claro/escuro). Decisão: usar só o **símbolo isolado** ao lado do wordmark em texto (já existente, real, não imagem) no header — os lockups completos têm um ponto decorativo bem afastado do texto, com bastante espaço morto entre os dois, que exigiria recorte manual da arte pra caber bem num header compacto; símbolo + texto real evita esse problema sem perder identidade, e o texto continua nítido em qualquer tamanho/tema por ser CSS, não bitmap. Favicon (`frontend/src/app/favicon.ico`, convenção do Next App Router) substituído pela versão do símbolo.

## Segunda fonte de catálogo: TMDb, pra importar filmes (15/08)

O `category` (adicionado nesta mesma sessão, ver migração `event_category_and_featured`) já tinha sido desenhado de propósito pra acomodar "um catálogo futuro que não seja só shows" — este é esse catálogo. Decisão: TMDb (The Movie Database) vira uma **segunda fonte do mesmo catálogo**, não um fluxo paralelo — o organizador escolhe a aba "Shows" ou "Filmes" no wizard de criação de evento, busca, escolhe, configura e publica exatamente como já fazia com a Ticketmaster. Nenhuma rota nova de ticket/reserva/portaria muda; é só mais uma fonte de metadados de evento.

**Formato normalizado ganhou um dono próprio.** `CatalogEvent` (antes definido dentro de `ticketmaster-mapper.util.ts`, implicitamente acoplado à Ticketmaster) virou `backend/src/catalog/utils/catalog-event.model.ts` — um tipo agnóstico de fonte (`source: 'TICKETMASTER' | 'TMDB'`, `raw: Record<string, unknown>` em vez do tipo bruto específico), que os dois mappers (`ticketmaster-mapper.util.ts`, `tmdb-mapper.util.ts`) convergem pra produzir. `CatalogSearchQueryDto` ganhou `source` opcional (default `'TICKETMASTER'`, então nada quebra pra quem já chamava o endpoint sem esse parâmetro) e `CatalogService` ramifica internamente (`searchTicketmaster`/`searchTmdb`, `getTicketmasterEventById`/`getTmdbMovieById`) — um único controller/endpoint pros dois, sem duplicar guards/throttle/módulo.

**`externalId` de filme vem prefixado (`tmdb:27205`).** A coluna é única globalmente na tabela `events` (não escopada por fonte) — IDs numéricos do TMDb poderiam, em teoria, colidir com um ID alfanumérico da Ticketmaster. O prefixo também é o que `CatalogService.getById()` usa pra rotear pra API certa sem precisar de um parâmetro `source` separado nessa rota.

**Gênero do TMDb → categoria: mapa fixo, sem chamada extra à API.** A busca do TMDb retorna só `genre_ids` (números); resolver o nome exigiria uma segunda chamada a `/genre/movie/list` por busca. Como a lista de gêneros de filme do TMDb é pequena e estável, ela foi hardcoded em `TMDB_GENRE_NAMES` (`tmdb-mapper.util.ts`) — mesmo espírito de custo-benefício do `pickCategory()` da Ticketmaster (nenhuma chamada de rede extra só pra resolver um nome).

**A lacuna real: filme não tem sessão.** Diferente de um show (Ticketmaster já manda local + data prontos), um filme no TMDb é só o filme — sem cinema, sem horário. O passo 2 do wizard (`organizer/new/page.tsx`) não tinha sequer campos editáveis pra local/cidade/data antes disso (vinham direto do item selecionado, sem UI pra corrigir); ganharam campos de formulário de verdade (`venueName`, `venueCity`, `startsAt` como `<input type="datetime-local">`), pré-preenchidos quando o catálogo souber (Ticketmaster) e em branco quando não souber (TMDb) — decisão consciente de aplicar isso aos **dois** fluxos, não só ao de filmes: também virou uma melhoria real pro organizador poder corrigir local/data errados vindos da Ticketmaster, que antes não existia.

**Ganho de bônus, não desenhado de propósito**: o TMDb já devolve sinopse pronta (`overview`) — algo que a Ticketmaster nunca forneceu nos campos mapeados aqui, e que hoje o organizador sempre digitava na mão. `CatalogEvent.description` é `null` pra Ticketmaster e a sinopse traduzida (pedimos `language=pt-BR` na chamada) pro TMDb, pré-preenchendo o campo Descrição do formulário quando disponível.

**A home não precisou de nenhuma mudança.** A seção de categorias já agrupa eventos publicados por qualquer valor distinto de `category` presente nos dados (`(public)/page.tsx`, `categoryOptions` via `Map` contando ocorrências) — não é uma lista fixa de segmentos da Ticketmaster. Filmes publicados com categoria "Ação"/"Comédia"/etc. (vinda do gênero do TMDb) aparecem como novos chips/carrosséis na home automaticamente, de graça.

**V1 escopado deliberadamente pequeno**: só busca por nome (mesma UX do fluxo de shows, sem seção "em cartaz"/"populares" do TMDb) — cobre o caso de uso real (organizador sabe qual filme quer publicar) sem inflar a UI com um segundo padrão de navegação de catálogo.

## Auditoria final e limpeza de Railway (16/08)

Com o produto funcionalmente completo, pedi uma reconferência linha por linha do PDF do desafio (`Desafio-Elite-Dev-2026.md`) contra o código real — não contra a documentação, contra a implementação em si. Um agente de exploração verificou os 29 pontos do enunciado (7 requisitos funcionais de front-end, 7 de back-end, 4 não-funcionais, 6 opcionais, mais os itens de entrega e uso de IA), cada um com evidência em arquivo/linha, sem confiar em "o README diz que está feito".

**Resultado: nenhum requisito obrigatório faltando.** Os únicos gaps encontrados foram de documentação desatualizada, não de código:

- `AI_USAGE.md` citava "223 testes" — número de uma fase anterior do projeto. Rodei `npm test` de novo: **227 testes unitários + 4 e2e (231 no total)**. Corrigido.
- Faltava um jeito de quem avalia confirmar cada requisito do PDF sem precisar ler o README inteiro de cabo a rabo. Adicionei uma seção "Requisitos do desafio — checklist" no topo do README, item por item, cada um com o arquivo onde está implementado — ataca direto o aviso do próprio PDF de que "a ausência de explicações impactará negativamente na nota final".
- As env vars `TICKETMASTER_API_KEY`/`TMDB_API_KEY` — que já tinham sido testadas com sucesso localmente, mas nunca tinham sido configuradas no Render — foram configuradas em produção pelo usuário durante esta mesma sessão de auditoria. Os dois bullets de "Known issues" no README que descreviam isso como pendente foram substituídos por uma nota só sobre o comportamento de fallback gracioso (`503`), já que o problema real deixou de existir.
- Confirmei via API pública do GitHub (`GET /repos/viniciusdiller/PULSA--Verzel`) que o repositório é público (`"visibility": "public"`) — item de entrega do PDF, sem gap.

**Limpeza de Railway**: o usuário notou que várias partes do código ainda citavam Railway (provedor abandonado no meio do projeto, ver seção acima) e pediu limpeza. Removido `backend/railway.json` (arquivo órfão, `startCommand` já nem batia mais com o que o Render roda hoje) e atualizados três comentários de código que citavam "Railway" (`backend/src/main.ts`, `backend/prisma/seed.ts`, `frontend/src/lib/api-client.ts`) para "Render". As seções históricas deste documento que mencionam Railway (o plano de execução original, a seção "Deploy real (Railway + Vercel)") foram **deliberadamente preservadas** — são o registro real do que foi planejado naquele momento, e reescrevê-las destruiria o valor do documento como prova de processo, que é exatamente o que o PDF pede pra versionar.

## Testes de frontend (Vitest) + correção sobre o seed de catálogo (16/08)

Adicionado o primeiro lote de testes automatizados do frontend (o backend já tinha 227+4; o frontend não tinha nenhum) — Vitest + Testing Library, 42 testes em 6 arquivos: funções puras de `lib/` (`format.ts`, `auth.ts`), hooks com timer (`use-debounced-value`, `use-countdown`, usando `vi.useFakeTimers`) e dois componentes (`FilterChipsBreadcrumb`, `GateResult`). Achado real ao escrever o primeiro teste: `Intl.NumberFormat("pt-BR")` separa "R$" do valor com um espaço não separável (U+00A0), não um espaço comum — um literal `"R$ 50,00"` no teste falhava sempre apesar de parecer idêntico no editor; resolvido montando a string esperada via `String.fromCharCode(160)`.

Também corrigida uma imprecisão que vinha se arrastando desde o plano original (seção "Integração Ticketmaster Discovery API", acima): a ideia de "capturar payload real de 1–2 eventos e versionar como fixture local usada pelo seed" nunca chegou a ser implementada — não existe nenhum arquivo de fixture no repositório. O que `backend/prisma/seed.ts` de fato cria é 2 eventos simples, escritos à mão, sem vir de nenhuma resposta gravada de API. O usuário fez uma escolha diferente (e melhor pra provar a integração real): todo o resto do catálogo que aparece no site em produção — Coachella, Matrix, Carros 2, US Men's National Soccer vs. Mexico, etc. — foi publicado de verdade através do fluxo do organizador, batendo nas APIs reais da Ticketmaster e do TMDb. O README e o `AI_USAGE.md` tinham uma frase desatualizada afirmando que o seed usava "fixtures locais capturadas de respostas reais" — corrigida nos dois lugares pra refletir o que o código realmente faz.
