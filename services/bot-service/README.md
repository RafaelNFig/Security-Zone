# Bot Service

## Descrição
O **Bot Service** provê a inteligência artificial para jogar as partidas contra o usuário (modo vsBot). O `match-service` notifica este serviço sempre que é o turno do robô, enviando o `state` atual. O bot avalia o tabuleiro e retorna uma ação (Action Payload).

## Arquitetura de IAs
- **`botEasy.js`**: Heurística básica. Joga a primeira carta possível e ataca aleatoriamente. Foca na completude das ações simples.
- **`botNormal.js`**: Heurística moderada. Identifica cartas defensivas versus ofensivas. Tenta invocar defensores quando necessário e escolhe alvos de ataque buscando otimizar o dano no jogador, evitando escudos inquebráveis.
- **`botHelpers.js`**: Reúne utilitários comuns a ambas as IAs (mapeamento de slots, limites e contadores).

## Fluxo
Recebe `POST /bot/play`:
```json
{
  "state": { ... },
  "difficulty": "normal"
}
```
Retorna:
```json
{
  "action": { "type": "PLAY_CARD", "payload": { "cardId": "10", "slot": 0 } }
}
```

## Como Rodar Isoladamente
```bash
npm install
npm run dev
```
