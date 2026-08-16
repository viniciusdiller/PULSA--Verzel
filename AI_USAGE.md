# Uso de IA neste projeto

O desafio pede explicitamente para documentar o uso de IA em vez de escondê-lo — este projeto foi construído em par com o Claude Code (Anthropic), com revisão e decisão humana em cada ponto que importa. Este documento existe pra deixar claro **onde** a IA ajudou e **o que foi verificado manualmente**, não pra listar prompts.

## Ferramenta

**Claude Code** (Sonnet 5), usado interativamente durante toda a construção do projeto — planejamento, código, testes, debugging e esta própria documentação.

## Onde foi usado e o que foi revisado

| Área | O que a IA gerou | O que foi verificado/decidido por humano |
|---|---|---|
| Modelagem de dados (Prisma) | Schema completo, migrations | Decisões de escopo (1 assento/reserva, Hold+Reserva numa entidade) confirmadas em conversa; migration manual do índice único parcial testada contra concorrência real (2 requisições simultâneas no mesmo assento) |
| Garantia de concorrência de assento | `pg_advisory_xact_lock` + índice único parcial | Testado manualmente disparando holds concorrentes contra o mesmo assento antes de considerar pronto |
| Assinatura/verificação do QR (JWT HS256) | `ticket-signing.util.ts` | Escolha de HS256 vs RS256 discutida e justificada (verificador único = simétrico é suficiente); testes cobrindo forjadura, secret errado, alg-confusion attack |
| Validação da portaria (4 desfechos) | `gate.service.ts`, update condicional atômico | Os 4 status testados manualmente em sequência real (câmera + digitação), incluindo o caso de corrida (duas validações simultâneas) |
| Testes unitários do backend | 227 testes unitários + 4 e2e (231 no total — services, guards, filters, utils) | Um bug real foi encontrado e corrigido justamente por um teste escrito para o `PrismaExceptionFilter` (formato de resposta inconsistente no caso 500) |
| Catálogo TMDb (filmes) como 2ª fonte, ao lado da Ticketmaster | `tmdb-mapper.util.ts`, ramificação em `CatalogService`, abas Shows/Filmes no wizard, campos de local/data editáveis no passo 2 | Escopo (filme = mais uma fonte do mesmo catálogo, não fluxo paralelo; V1 só busca por nome) discutido e aprovado antes da implementação; mapa de gênero→categoria do TMDb hardcoded por decisão consciente (evita chamada extra à API); testado de ponta a ponta com uma `TMDB_API_KEY` real — busca, seleção com prefill de sinopse/categoria, criação e publicação de um evento de filme, que apareceu corretamente na home numa seção de categoria nova ("Ação"), criada automaticamente pelo sistema de categorias já existente. Um bug real apareceu só nesse teste ao vivo (não visível com a busca mockada/sem chave): `image.tmdb.org` não estava liberado em `images.remotePatterns` do Next.js, quebrando a página assim que os resultados com imagem apareciam — corrigido em `next.config.ts` |
| Identidade visual PULSA | Sistema de tokens de cor/tipografia, componentes re-temados | Guia de marca (Claude Design) importado e lido na íntegra antes de qualquer código; decisão de quais partes do wireframe de home implementar (e quais descartar por não terem dado real por trás) foi humana, documentada em `docs/ARCHITECTURE.md` |
| Animações (`motion`/Framer Motion) | Transições de estado (checkout, portaria, hover de card, troca de tema claro/escuro) | Duas animações problemáticas encontradas e corrigidas em teste real de navegador: race condition no scanner de QR (Strict Mode) e overlay fantasma bloqueando cliques na tela de portaria — ambas só apareceram testando no navegador, não no código estático |
| Categorias de evento + carrossel de destaque na home | Campo `category` no schema, endpoint `/events/featured`, chips de categoria e carrossel na home | Escolha das categorias e critério de "destaque" (heurística real sobre dado existente, não número inventado) discutida e aprovada antes da implementação |
| Portaria: busca no seletor de evento + histórico de validações | Campo de busca em `/gate`, nova tela `/gate/history` (agrupada por evento, com paginação e preview "últimos 4 + Ver todos"), endpoints `GET /gate/history/events` e `.../tickets` | Escopo do histórico (só validações com sucesso — recusas não geram linha no banco) e o corte de paginação por tela confirmados em conversa; bug de scroll lateral no modal de "Ver todos" (CSS Grid com `min-width: auto` derrotando o `truncate`) diagnosticado e corrigido testando no navegador real |
| Deploy (Render/Neon/Vercel) | Scripts de build/seed, este README | Configuração de env vars e criação das contas/projetos nos dashboards é ação humana — a IA não tem acesso às contas. O plano original era Railway; a migração pra Render+Neon aconteceu no meio do projeto, quando o trial gratuito do Railway acabou, e foi diagnosticada/conduzida em conjunto com a IA através de vários ciclos reais de deploy com erro (build faltando devDependencies, path de output do TypeScript errado, env var não salva no dashboard) |

## Padrão de trabalho

Cada funcionalidade foi construída, testada num navegador real (não só compilada) e commitada individualmente antes de seguir pra próxima — o histórico de commits do repositório reflete esse processo passo a passo, incluindo os bugs encontrados e corrigidos ao longo do caminho (não é um único commit "gerado pronto").
