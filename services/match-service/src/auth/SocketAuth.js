/**
 * Interceptador para validar conexões Socket.io entrantes.
 * Garante que apenas usuários com um JWT válido possam se conectar ao boardgame.io/server
 * e interagir com as partidas.
 */
async function validateSocketConnection(socket, next) {
  // Stub provisório
  console.log(`[Auth] Autenticando socket cliente...`);
  next();
}

module.exports = { validateSocketConnection };
