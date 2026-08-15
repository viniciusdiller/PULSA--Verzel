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
| Testes unitários do backend | ~150 testes (services, guards, filters, utils) | Um bug real foi encontrado e corrigido justamente por um teste escrito para o `PrismaExceptionFilter` (formato de resposta inconsistente no caso 500) |
| Identidade visual PULSA | Sistema de tokens de cor/tipografia, componentes re-temados | Guia de marca (Claude Design) importado e lido na íntegra antes de qualquer código; decisão de quais partes do wireframe de home implementar (e quais descartar por não terem dado real por trás) foi humana, documentada em `docs/ARCHITECTURE.md` |
| Animações (`motion`/Framer Motion) | Transições de estado (checkout, portaria, hover de card) | Duas animações problemáticas encontradas e corrigidas em teste real de navegador: race condition no scanner de QR (Strict Mode) e overlay fantasma bloqueando cliques na tela de portaria — ambas só apareceram testando no navegador, não no código estático |
| Deploy (Railway/Vercel) | `railway.json`, scripts de build/seed, este README | Configuração de env vars e criação das contas/projetos nos dashboards é ação humana — a IA não tem acesso às contas |

## Padrão de trabalho

Cada funcionalidade foi construída, testada num navegador real (não só compilada) e commitada individualmente antes de seguir pra próxima — o histórico de commits do repositório reflete esse processo passo a passo, incluindo os bugs encontrados e corrigidos ao longo do caminho (não é um único commit "gerado pronto").
