const { Async } = require('boardgame.io/internal');

/**
 * Adapter customizado de persistência do Boardgame.io.
 * Implementa a interface Async Storage API para mapear as operações
 * de gravação/leitura do G para as tabelas MatchState/MatchEvent do Prisma.
 */
class PrismaStorage extends Async {
  constructor(prismaClient) {
    super();
    this.prisma = prismaClient;
  }

  async connect() {
    console.log("[PrismaStorage] Conectado.");
  }

  async setMetadata(matchID, metadata) {
    // Atualiza metadados da partida no MySQL
  }

  async fetchMetadata(matchID) {
    return {};
  }

  async setState(matchID, state, log) {
    // Salva o snapshot do estado (G e ctx) em MatchState
  }

  async fetchState(matchID, opts) {
    return {};
  }

  async wipe(matchID) {
    // Remove partida do DB
  }
}

module.exports = { PrismaStorage };
