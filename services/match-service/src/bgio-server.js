// services/match-service/src/bgio-server.js
// Entry point do Match Service
const express = require('express');
const cors = require('cors');

async function main() {
  const gameEngine = await require('@security-zone/game-engine').load();
  const SecurityZoneGame = gameEngine.SecurityZoneGame;

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Injetamos o game engine na rota
  const { matchRoutes } = require('./api/matchRoutes.js');
  app.use('/', matchRoutes(SecurityZoneGame));

  const PORT = process.env.PORT || 3001;

  app.listen(PORT, () => {
    console.log(`[match-service] Servidor REST in-memory rodando na porta ${PORT}`);
  });
}

main().catch((err) => {
  console.error('[match-service] Falha ao inicializar:', err);
  process.exit(1);
});
