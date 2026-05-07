# Match Service

## Descrição
O **Match Service** é o responsável pela orquestração do jogo ativo (Tier 1.5). Ele mantém o estado "quente" da partida em andamento (memória), processa conexões de jogadores, recebe requisições de jogadas e consulta o `rules-service` para validar e obter o novo estado. Além disso, coordena a interação com os bots (via `bot-service`).

## Funcionalidades
- **Sessão**: Mantém os estados ativos das partidas iniciadas via Gateway.
- **Orquestração**: Encaminha as ações dos jogadores (JSON) para o `rules-service`.
- **Bots**: Gerencia timeouts e invoca o `bot-service` quando for a vez do bot jogar.
- **Snapshots**: Persiste o estado atual (e eventos) no banco de dados via Prisma em intervalos ou eventos chave.

## Variáveis de Ambiente
- `PORT` (padrão: 3001)
- `GATEWAY_URL` (padrão: http://gateway-api:3000)
- `BOT_URL` (padrão: http://bot-service:3003)
- `RULES_URL` (padrão: http://rules-service:3002)

## Como Rodar Isoladamente
```bash
npm install
npm run dev
```
