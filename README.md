# BoraVaga
Projeto acadêmico de agregador de vagas. Interface React/TypeScript, backend Worker, SQLite/D1 e coletor Python (biblioteca padrão).

## Estado real da implementação
Busca textual sem distinção de acentos, filtros combinados, detalhes e favoritos persistentes por cookie anônimo. Demonstração explícita com oito anúncios fictícios. Vagas reais lidas de D1, importação autenticada por token. Não há coleta ativa de Indeed, InfoJobs, LinkedIn ou Catho; integrações não foram validadas ao vivo. Não há agendamento nem descoberta automática de links.

## Executar
Use `pnpm dev` com Node 22+. `pnpm db:generate` gera migrações; o processo de publicação aplica as migrações D1. Para preview local, veja as instruções do starter em scripts. O endpoint GET /api/jobs só retorna anúncios não expirados. Favoritos ficam vinculados a um cookie HttpOnly: não sincronizam entre aparelhos; apagar cookies perde o vínculo.

## Coleta
`python collector/collect.py` lê collector/sources.json. Por padrão todas as fontes estão desativadas. Depois de validar uma fonte e sua permissão de acesso, preencha URLs públicas individuais de anúncios e habilite a fonte. O extrator procura JobPosting em JSON-LD (incluindo @graph), consulta robots.txt, aplica intervalo e limite de resposta, não faz login nem contorna bloqueios. Páginas sem JSON-LD exigem um adaptador específico ainda não implementado. Ausência de informação vira 'Não informado'. FULL_TIME não implica CLT. Deduplicação por cargo, empresa e localidade pode agrupar vagas diferentes; em produção deverá preservar todas as origens e usar identificadores mais específicos.

`python collector/collect.py --send` envia os lotes. Configure BORAVAGA_URL e INGEST_TOKEN no processo e o mesmo INGEST_TOKEN como segredo do site. Sem segredo o endpoint permanece fechado. Não coloque o token no frontend ou no Git. A expiração usa validThrough; anúncios sem essa data precisam de verificação periódica futura. Não apresentar a demonstração como dados coletados.

## Próximas etapas para coleta real
Validar uma fonte, implementar e testar adaptador específico se não houver JSON-LD, acrescentar descoberta/paginação, agendar execução externa e registrar histórico de falhas. Validar regras e acesso de cada portal antes de ativar. A plataforma e o coletor base estão implementados; a integração real com os quatro portais permanece pendente.

## Vercel

O projeto agora usa Next.js/Node.js e está preparado para Vercel. `vercel.json` agenda `/api/cron/collect` diariamente às 08:00 UTC. Configure `CRON_SECRET` no projeto antes de produção; a rota rejeita chamadas sem `Authorization: Bearer`. Configure `INGEST_TOKEN` se for enviar lotes pelo endpoint `/api/ingest`.

Nesta versão o armazenamento é temporário por instância para manter o protótipo compatível sem banco externo. Para favoritos e vagas persistirem em produção, conecte Postgres/KV pelo Storage da Vercel e troque o adaptador `lib/database.ts`.
