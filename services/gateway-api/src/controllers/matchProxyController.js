// gateway-api/src/controllers/matchProxyController.js
// Gateway -> Match Service proxy (Tier 1.5)
//
// Responsabilidades:
// - Receber requisições do front (já autenticadas pelo authMiddleware)
// - Encaminhar para o match-service
// - Anexar contexto do jogador via headers internos (confiança interna)
// - (NOVO) quando MT_MODE=BOT + difficulty, anexar bot seeded + deck do bot
// - Padronizar erros de upstream (4xx/5xx) vs rede/timeout
//
// Observação:
// - NÃO repassa Authorization do client ao match-service.
// - O match-service confia em x-player-id/x-firebase-uid vindos do Gateway.

/* eslint-env node */
import prisma from "../prismaClient.js";
import { createHttpClient, buildServiceHeaders, replyWithHttpError } from "../utils/httpClient.js";

// ✅ Dentro do Docker, "localhost" = container atual (gateway-api).
// Default correto deve apontar para o service do compose.
const MATCH_SERVICE_URL = (
  process.env.MATCH_SERVICE_URL || "http://match-service:3001"
).replace(/\/$/, "");

const HTTP_TIMEOUT_MS = Number(process.env.MATCH_PROXY_TIMEOUT_MS || 12_000);

const http = createHttpClient({
  baseURL: MATCH_SERVICE_URL,
  timeoutMs: HTTP_TIMEOUT_MS,
});

// Bots seeded (mesma convenção do seedUsersBotsDecks.js)
const BOT_EMAILS_BY_LEVEL = {
  easy: "bot_easy@sz.local",
  normal: "bot_normal@sz.local",
};

function sendOk(req, res, upstreamResponse, fallbackStatus = 200) {
  const rid = req?.headers?.["x-request-id"];
  if (rid) res.setHeader("x-request-id", String(rid));

  const status = Number(upstreamResponse?.status || fallbackStatus);
  return res.status(status).json(upstreamResponse?.data ?? {});
}

function normalizeDifficulty(raw) {
  const d = String(raw || "").trim().toLowerCase();
  if (d === "easy" || d === "normal") return d;
  return null;
}

function inferIsBotMatch(body) {
  // tolerante: aceita campos diferentes vindos do front
  const mode = String(body?.mode ?? body?.MT_MODE ?? body?.matchMode ?? "").toUpperCase();
  if (mode === "BOT") return true;

  // fallback: se tem difficulty/botLevel, consideramos BOT
  if (body?.difficulty || body?.botLevel || body?.level) return true;

  return false;
}

async function fetchBotByDifficulty(difficulty) {
  const email = BOT_EMAILS_BY_LEVEL[difficulty];
  if (!email) return null;

  return prisma.player.findUnique({
    where: { PL_EMAIL: email },
    select: { PL_ID: true, PL_NAME: true, PL_EMAIL: true, PL_LEVEL: true, PL_AUTH_PROVIDER: true },
  });
}

async function fetchActiveDeckWithCards(playerId) {
  const deck = await prisma.deck.findFirst({
    where: { PLAYER_PL_ID: playerId, DECK_IS_ACTIVE: true },
    select: {
      DECK_ID: true,
      DECK_NAME: true,
      cardsInDeck: {
        select: {
          DECK_CD_QUANTITY: true,
          card: {
            select: {
              CD_ID: true,
              CD_NAME: true,
              CD_HABILITY: true,
              CD_TYPE: true,
              CD_COST: true,
              CD_LIFE: true,
              CD_ATTACK: true,
              CD_DEFENSE: true,
              CD_IMAGE: true,
              CD_EFFECT_JSON: true,
              CD_HAS_ABILITY: true,
              CD_ABILITY_COST: true,
              CD_ABILITY_LIMIT_JSON: true,
            },
          },
        },
      },
    },
  });

  return deck || null;
}

/**
 * POST /api/matches
 * Cria uma partida no match-service.
 *
 * (NOVO) Se for BOT e vier difficulty:
 * - busca bot seeded + deck ativo e envia no payload para o match-service
 */
export async function createMatch(req, res) {
  const headers = buildServiceHeaders(req);

  try {
    const body = req.body ?? {};
    let payload = { ...body };

    // ---- NOVO: anexar bot seeded ao payload ----
    if (inferIsBotMatch(body)) {
      const difficulty = normalizeDifficulty(body.difficulty ?? body.botLevel ?? body.level);
      if (difficulty) {
        const bot = await fetchBotByDifficulty(difficulty);

        if (!bot) {
          return res.status(500).json({
            success: false,
            error: "BOT_SEED_NOT_FOUND",
            message: `Bot seeded não encontrado para difficulty="${difficulty}". Rode a seed (bots) no banco.`,
          });
        }

        const botDeck = await fetchActiveDeckWithCards(bot.PL_ID);
        if (!botDeck || !botDeck.cardsInDeck?.length) {
          return res.status(500).json({
            success: false,
            error: "BOT_DECK_NOT_FOUND",
            message: `Deck ativo do bot (${difficulty}) não encontrado ou vazio. Verifique a seed do deck do bot.`,
          });
        }

        const botDeckCards = botDeck.cardsInDeck.map((x) => ({
          quantity: x.DECK_CD_QUANTITY,
          card: x.card,
        }));

        payload = {
          ...payload,
          mode: "BOT",
          difficulty,
          bot: {
            level: difficulty,
            playerId: bot.PL_ID,
            deckId: botDeck.DECK_ID,
            deckName: botDeck.DECK_NAME,
          },
          botDeckCards,
        };
      }
    }

    const r = await http.post("/matches", payload, { headers });

    if (r.status >= 400) {
      return replyWithHttpError(res, r, { publicError: "MATCH_SERVICE_ERROR" });
    }

    return sendOk(req, res, r, 201);
  } catch (err) {
    return replyWithHttpError(res, err, { publicError: "MATCH_SERVICE_UNREACHABLE" });
  }
}

/**
 * GET /api/matches/:id
 * Retorna o estado (já sanitizado pelo match-service para o viewer).
 */
export async function getMatch(req, res) {
  const headers = buildServiceHeaders(req);
  const { id } = req.params;

  try {
    const r = await http.get(`/matches/${encodeURIComponent(id)}`, { headers });

    if (r.status >= 400) {
      return replyWithHttpError(res, r, { publicError: "MATCH_SERVICE_ERROR" });
    }

    return sendOk(req, res, r, 200);
  } catch (err) {
    return replyWithHttpError(res, err, { publicError: "MATCH_SERVICE_UNREACHABLE" });
  }
}

/**
 * POST /api/matches/:id/actions
 *
 * Aceita:
 * - { action: { type, payload? }, clientActionId? }
 * - { type, payload?, clientActionId? } (fallback)
 *
 * Encaminha SEMPRE como:
 * { action: {...}, clientActionId? }
 */
export async function postAction(req, res) {
  const headers = buildServiceHeaders(req);
  const { id } = req.params;

  const body = req.body ?? {};
  const action = body.action ?? body;

  if (!action || !action.type) {
    return res.status(400).json({
      success: false,
      error: "INVALID_ACTION",
      message: "Envie { action: { type, ... } } ou { type, ... }",
    });
  }

  const payload = {
    action,
    clientActionId: body.clientActionId ?? action.clientActionId ?? action.actionId ?? undefined,
  };
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  try {
    const r = await http.post(`/matches/${encodeURIComponent(id)}/actions`, payload, { headers });

    if (r.status >= 400) {
      return replyWithHttpError(res, r, { publicError: "MATCH_SERVICE_ERROR" });
    }

    return sendOk(req, res, r, 200);
  } catch (err) {
    return replyWithHttpError(res, err, { publicError: "MATCH_SERVICE_UNREACHABLE" });
  }
}

/**
 * GET /api/match-service/health
 * Útil pra demo e troubleshooting.
 */
export async function health(req, res) {
  const headers = buildServiceHeaders(req);

  try {
    const r = await http.get("/health", { headers });

    if (r.status >= 400) {
      return replyWithHttpError(res, r, { publicError: "MATCH_SERVICE_ERROR" });
    }

    return res.status(200).json({
      ok: true,
      matchServiceUrl: MATCH_SERVICE_URL,
      matchService: r.data,
    });
  } catch (err) {
    return replyWithHttpError(res, err, { publicError: "MATCH_SERVICE_UNREACHABLE" });
  }
}
