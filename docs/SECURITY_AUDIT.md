# Auditoria de segurança (17/08)

Revisão de ponta a ponta do backend (NestJS/Prisma) e do frontend (Next.js), cobrindo autenticação, autorização, injeção, exposição de dados, dependências e configuração de produção. Cada item abaixo foi verificado no código real (não só por inspeção visual) e, quando possível, confirmado ao vivo contra o backend rodando — não é uma lista de boas práticas genéricas coladas aqui.

## O que foi corrigido

| # | Achado | Severidade | Onde | Correção |
|---|---|---|---|---|
| 1 | **Enumeração de usuários por tempo de resposta no login** — `bcrypt.compare` só rodava quando o email existia. Medido ao vivo: ~3ms pra email inexistente vs. ~250ms pra email existente com senha errada — diferença grande o bastante pra um atacante descobrir quais emails estão cadastrados só cronometrando respostas, mesmo com a mensagem de erro sendo idêntica nos dois casos. | Média | `backend/src/auth/auth.service.ts` | `bcrypt.compare` agora roda sempre — contra o hash real quando o usuário existe, contra um hash fixo ("morto") quando não existe. Reconferido ao vivo depois do fix: os dois casos ficam na mesma faixa de tempo (dominados pelo custo do bcrypt), não mais numa diferença de duas ordens de grandeza. |
| 2 | **Custo de bcrypt inconsistente** — o seed usa 12 rounds, mas `updateProfile` (troca de senha pelo próprio usuário) usava 10. Isso não é uma vulnerabilidade por si só, mas reabre uma versão mais sutil do achado #1: comparar sempre contra um hash de custo diferente do usado pelos usuários reais também vaza informação por tempo. | Baixa | `backend/src/auth/auth.service.ts` | Unificado: `BCRYPT_ROUNDS = 12` usado tanto no hash fixo do achado #1 quanto em `updateProfile`. |
| 3 | **Sem limite de tamanho nas senhas** — `LoginDto`/`UpdateProfileDto` validavam um mínimo, mas não um máximo. bcrypt ignora tudo depois do byte 72, então uma senha de vários KB não quebra nada, mas obriga o `bcrypt.compare`/`bcrypt.hash` a processar uma entrada enorme à toa a cada tentativa — um jeito barato de fazer o servidor gastar CPU sem necessidade, especialmente numa rota sem exigir login (`/auth/login`). | Baixa | `backend/src/auth/dto/login.dto.ts`, `update-profile.dto.ts` | `@MaxLength(128)` nas senhas, `@MaxLength(254)` no email (limite real do formato RFC), `@MaxLength(100)` no nome. |
| 4 | **CORS aceitava `localhost:3000` também em produção** — a allowlist da API incluía o localhost de desenvolvimento sempre, não só fora de produção. Não é credentials-based (o app usa Bearer token, não cookie), então o risco prático é baixo, mas não tem motivo real pra API em produção aceitar chamadas com origem local. | Baixa | `backend/src/main.ts` | `localhost:3000` só entra na allowlist quando `NODE_ENV !== 'production'`. |
| 5 | **Dependência com vulnerabilidade conhecida** — `npm audit` no backend apontava `js-yaml` (transitivo via `@nestjs/swagger`) com um CVE de negação de serviço (alto). Investigando mais a fundo: toda versão recente de `@nestjs/swagger` carrega alguma versão vulnerável de `js-yaml` (`5.2.1` tem um CVE, `4.3.0` tem outro diferente) — não dava pra resolver só trocando a versão do pacote. Na prática o risco real aqui é baixo (o `js-yaml` do Swagger só processa a documentação da própria API gerada internamente, nunca YAML vindo de uma requisição de fora), mas um scanner de dependências (inclusive quem for avaliar este projeto rodando `npm audit`) acusaria "2 vulnerabilidades altas" sem esse contexto. | Informativo (risco real baixo, mas visível em qualquer auditoria automatizada) | `backend/package.json` | Adicionado um `overrides` fixando `js-yaml` em `4.3.1` (a única versão sem nenhum dos dois CVEs) só dentro da árvore do `@nestjs/swagger`, sem precisar prender a versão do `@nestjs/swagger` em si. `npm audit` limpo depois do fix; Swagger (`/api-docs` e `/api-docs-json`) testado ao vivo pra confirmar que continua gerando a documentação normalmente. |
| 6 | **Frontend sem nenhum header de segurança** — o backend já usa Helmet, mas o Next.js (que é quem de fato serve HTML pro navegador de quem loga como cliente/organizador/portaria) não tinha `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` nem HSTS configurados. | Baixa/Média | `frontend/next.config.ts` | Adicionado `headers()` com `X-Frame-Options: DENY` (protege contra clickjacking — ex. a tela de portaria embutida num iframe malicioso), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`. Sem CSP de propósito: a portaria depende de acesso à câmera (`html5-qrcode`) pra ler QR, e um CSP mal calibrado quebraria isso sem dar tempo de testar cada caminho da aplicação — os headers acima cobrem o básico sem esse risco. Confirmado ao vivo (`curl -D -`) que os headers aparecem em produção local. |

## O que já estava correto (verificado, não só assumido)

Boa parte do que uma auditoria de segurança costuma encontrar em primeira passada já tinha sido endereçado em sessões anteriores deste projeto. O que segue foi conferido de novo, com evidência:

- **Alg confusion attack no JWT** — algoritmo fixado em `HS256` tanto na verificação do token de auth (`jwt.strategy.ts`) quanto na do QR do ingresso (`ticket-signing.util.ts`), nos dois casos com secrets dedicados e diferentes entre si.
- **Papel do usuário sempre vem do banco, nunca do payload do JWT** — evita que um token antigo continue valendo com um papel que já foi trocado no banco.
- **IDOR (acesso a recurso de outro usuário via id)** — toda mutação de evento do organizador passa por `findOwnedEventOrThrow` (17 chamadas conferidas); toda operação de reserva/ticket confere `customerId`/`ownerId` contra o usuário autenticado antes de agir.
- **SQL injection** — nenhum uso de `$queryRawUnsafe`/`$executeRawUnsafe` no projeto; o único `$executeRaw` (advisory lock de assento) usa template literal do Prisma, que parametriza automaticamente.
- **SSRF no proxy de catálogo** — as URLs base da Ticketmaster/TMDb são constantes fixas no código; o único dado do usuário que entra na URL (`externalId`) passa por `encodeURIComponent`, sem risco de path traversal ou injeção de host.
- **Endpoint público de compartilhamento de ingresso** (`GET /tickets/:shareSlug`, sem autenticação) — `ownerId` é explicitamente removido da resposta antes de devolver ao cliente; nenhum dado do dono (nome, email) é exposto.
- **Força bruta** — login limitado a 5 tentativas/min por IP (mais restritivo que o default global de 60/min); validação de ingresso na portaria (espaço de busca pequeno, código de 6 dígitos) limitada a 20/min, já documentado no próprio código como mitigação a uma conta de portaria comprometida tentando adivinhar códigos.
- **Segredos** — `.env` nunca foi commitado (conferido no histórico completo do git, não só no estado atual), `.env.example` só tem placeholders, e a validação de ambiente (`env.validation.ts`) já recusa segredos fracos/de exemplo e exige `JWT_SECRET`/`QR_SIGNING_SECRET` diferentes entre si e com pelo menos 32 caracteres em produção.
- **Vazamento de erro interno** — `PrismaExceptionFilter` mapeia erros do banco pra mensagens genéricas (nunca expõe query, stack trace ou detalhe do Postgres pro cliente).
- **XSS** — nenhum uso de `dangerouslySetInnerHTML`, `eval`, `innerHTML` ou similar em todo o frontend.
- **Open redirect** — nenhum redirecionamento no frontend é construído a partir de query param/input do usuário.
- **CSRF** — não aplicável na prática: autenticação via header `Authorization: Bearer` (não cookie), então não há como um site de terceiros "andar de carona" numa sessão só fazendo o navegador disparar uma requisição.
- **Dados de cartão** — o mock de pagamento nunca loga nem persiste o número completo do cartão, só os 4 últimos dígitos (`paymentCardLast4`).
- **Aleatoriedade** — `shareSlug`, `shortCode` e `serial` do ingresso usam `crypto.randomBytes`/`randomInt`/`randomUUID` (CSPRNG), não `Math.random()`.

## O que não foi mudado, e por quê

- **Nenhum CSP no frontend** — ver achado #6. Calibrar um CSP corretamente (permitindo câmera, fontes, animações do `motion`, hidratação do Next) exigiria testar cada fluxo da aplicação de novo; o ganho de segurança adicional é menor que o risco de quebrar algo sem essa validação completa dentro do escopo desta auditoria.
- **`js-yaml` continua sendo uma dependência transitiva do Swagger, não removida** — não dá pra tirar sem remover a documentação Swagger inteira; a mitigação (override de versão) já elimina os dois CVEs conhecidos hoje.

## Verificação

- Backend: 237 testes (2 novos, cobrindo o achado #1), `npm run build` e `npm run lint` limpos.
- Frontend: `npx tsc --noEmit` e `npm run lint` limpos.
- `npm audit` no backend: 0 vulnerabilidades (antes: 2 altas). Frontend já estava em 0.
- Achado #1 confirmado ao vivo antes e depois do fix, cronometrando `curl` contra `/api/auth/login` local.
- Achado #6 confirmado ao vivo com `curl -D -` contra o frontend local, headers presentes na resposta.
- Achado #5 confirmado reinstalando as dependências, checando a árvore com `npm ls js-yaml`, e testando `/api-docs`/`/api-docs-json` ao vivo depois do fix.
