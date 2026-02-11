// match-service/src/controllers/matchController.js
// Controller do match-service (stateful/orchestrator) — ESM puro.

/* eslint-env node */
import { resolveAction } from "../services/rulesClient.js";
import { getMove } from "../services/botClient.js";
import * as stateService from "../services/stateService.js";

const MAX_BOT_STEPS = Number(process.env.MAX_BOT_STEPS || 6);

function nowIso() {
  return new Date().toISOString();
}

function ev(type, payload = {}) {
  return { type, payload };
}

function normalizeMode(v) {
  const m = String(v || "BOT").toUpperCase();
  return m === "PVP" ? "PVP" : "BOT";
}

function normalizeDifficulty(v) {
  const d = String(v || "easy").toLowerCase();
  return ["easy", "normal", "hard"].includes(d) ? d : "easy";
}

function normalizeBodyAction(body) {
  const b = body || {};
  return b.action && typeof b.action === "object" ? b.action : b;
}

function getClientActionId(body, action) {
  return (
    body?.clientActionId ||
    action?.actionId ||
    action?.clientActionId ||
    action?.payload?.clientActionId ||
    null
  );
}

function getPlayerIdFromHeader(req) {
  const h = req.headers["x-player-id"];
  const n = h != null ? Number(h) : NaN;
  return Number.isFinite(n) ? n : null;
}

function isBotTurn(state) {
  return state?.turn?.owner === "P2";
}

function isGameEnded(state) {
  return String(state?.turn?.phase || "").toUpperCase() === "ENDED";
}

/**
 * Determina qual lado (P1/P2) está tentando agir.
 * - Em BOT: sempre P1 (porque P2 é bot).
 * - Em PVP: decide pelo x-player-id comparando com players.P1.playerId e players.P2.playerId.
 */
function resolveActorSide(req, match, state) {
  const mode = normalizeMode(match?.mode);
  if (mode === "BOT") return "P1";

  // PVP: tentar mapear pelo header
  const playerId = getPlayerIdFromHeader(req);
  if (playerId == null) return "P1"; // fallback seguro

  const p1Id = Number(state?.players?.P1?.playerId ?? NaN);
  const p2Id = Number(state?.players?.P2?.playerId ?? NaN);

  if (Number.isFinite(p1Id) && playerId === p1Id) return "P1";
  if (Number.isFinite(p2Id) && playerId === p2Id) return "P2";

  // Se não bate, não autoriza agir (evita “jogar pelo outro” no PVP)
  return null;
}

function resolveViewerSide(req, match, state) {
  // quem chamou (PVP) deve ver o state sanitizado pra si
  const actorSide = resolveActorSide(req, match, state);
  return actorSide || "P1";
}

export async function createMatch(req, res) {
  const mode = normalizeMode(req.body?.mode);
  const difficulty = normalizeDifficulty(req.body?.difficulty);
  const debug = req.body?.debug ?? null;

  const p1PlayerId = getPlayerIdFromHeader(req) ?? 1;

  // ✅ NOVO: gateway pode enviar deck do bot seeded
  // Formato esperado: [{ quantity, card }]
  const botDeckCards = Array.isArray(req.body?.botDeckCards) ? req.body.botDeckCards : null;

  const { match, events } = await stateService.createMatch({
    mode,
    difficulty,
    p1PlayerId,
    botDeckCards,
    debug,
    reqHeaders: req.headers,
  });

  return res.status(201).json({
    matchId: match.id,
    mode: match.mode,
    difficulty: match.difficulty,
    createdAt: match.createdAt,
    state: stateService.sanitizeStateForViewer(match.state, "P1"),
    events: Array.isArray(events) ? events : [],
  });
}

export async function getMatch(req, res) {
  const matchId = req.params.id;
  const match = stateService.getMatch(matchId);
  if (!match) return res.status(404).json({ error: "MATCH_NOT_FOUND" });

  const state = stateService.ensureStateShape(match.state);
  const viewerSide = resolveViewerSide(req, match, state);

  return res.json({
    matchId: match.id,
    mode: match.mode,
    difficulty: match.difficulty,
    createdAt: match.createdAt,
    state: stateService.sanitizeStateForViewer(state, viewerSide),
  });
}

/**
 * Aplica ação do player e, se for BOT, aplica automaticamente ações do bot.
 * - Idempotência por clientActionId
 * - Limite de passos do bot (anti-loop)
 * - Sempre sanitiza antes de devolver ao caller (viewerSide)
 */
export async function applyAction(req, res) {
  try {
    const matchId = req.params.id;
    const match = stateService.getMatch(matchId);
    if (!match) return res.status(404).json({ error: "MATCH_NOT_FOUND" });

    const body = req.body || {};
    const action = normalizeBodyAction(body);

    if (!action?.type) {
      return res.status(400).json({ error: "MISSING_ACTION_TYPE" });
    }

    // Estado completo (nunca sanitizado internamente)
    let state = stateService.ensureStateShape(match.state);
    const viewerSide = resolveViewerSide(req, match, state);

    const clientActionId = getClientActionId(body, action);

    // Idempotência: se já processou, devolve igual
    const cached = stateService.getCachedActionResult(matchId, clientActionId);
    if (cached) return res.json(cached);

    // Se acabou, bloqueia ações
    if (isGameEnded(state)) {
      const response = {
        matchId,
        mode: match.mode,
        difficulty: match.difficulty,
        createdAt: match.createdAt,
        rejected: { code: "MATCH_ENDED", message: "A partida já foi encerrada." },
        events: [ev("MATCH_ENDED", { at: nowIso() })],
        state: stateService.sanitizeStateForViewer(state, viewerSide),
      };
      stateService.setCachedActionResult(matchId, clientActionId, response);
      return res.json(response);
    }

    // Determina lado do ator e valida turno
    const actorSide = resolveActorSide(req, match, state);
    if (!actorSide) {
      const response = {
        matchId,
        mode: match.mode,
        difficulty: match.difficulty,
        createdAt: match.createdAt,
        rejected: { code: "UNAUTHORIZED_ACTOR", message: "Jogador não pertence a esta partida." },
        events: [ev("UNAUTHORIZED_ACTOR", { at: nowIso() })],
        state: stateService.sanitizeStateForViewer(state, viewerSide),
      };
      stateService.setCachedActionResult(matchId, clientActionId, response);
      return res.json(response);
    }

    if (state?.turn?.owner !== actorSide) {
      const response = {
        matchId,
        mode: match.mode,
        difficulty: match.difficulty,
        createdAt: match.createdAt,
        rejected: {
          code: "NOT_YOUR_TURN",
          message: `Não é o turno de ${actorSide}. Turno atual: ${state?.turn?.owner}.`,
        },
        events: [ev("NOT_YOUR_TURN", { actorSide, turnOwner: state?.turn?.owner, at: nowIso() })],
        state: stateService.sanitizeStateForViewer(state, viewerSide),
      };
      stateService.setCachedActionResult(matchId, clientActionId, response);
      return res.json(response);
    }

    // Em BOT, só P1 joga
    if (normalizeMode(match.mode) === "BOT" && actorSide !== "P1") {
      const response = {
        matchId,
        mode: match.mode,
        difficulty: match.difficulty,
        createdAt: match.createdAt,
        rejected: { code: "BOT_OWNED_SIDE", message: "P2 é controlado pelo bot." },
        events: [ev("BOT_OWNED_SIDE", { at: nowIso() })],
        state: stateService.sanitizeStateForViewer(state, viewerSide),
      };
      stateService.setCachedActionResult(matchId, clientActionId, response);
      return res.json(response);
    }

    // ==========================
    // 1) Ação do player → rules
    // ==========================
    let playerOut;
    try {
      playerOut = await resolveAction({ state, action });
    } catch (err) {
      return res.status(502).json({
        error: "RULES_UPSTREAM_FAILURE",
        message: err?.message || "Falha ao chamar rules-service",
        details: err?.details,
      });
    }

    let events = [];
    events.push(ev("ACTION_META", { source: "PLAYER", action, at: nowIso() }));
    if (Array.isArray(playerOut?.events)) events.push(...playerOut.events);

    // Se rejeitou, não muda state
    if (playerOut?.rejected) {
      const response = {
        matchId,
        mode: match.mode,
        difficulty: match.difficulty,
        createdAt: match.createdAt,
        rejected: playerOut.rejected,
        events,
        state: stateService.sanitizeStateForViewer(state, viewerSide),
      };

      stateService.setCachedActionResult(matchId, clientActionId, response);
      return res.json(response);
    }

    // Sucesso: aplica newState no Map
    let newState = stateService.ensureStateShape(playerOut.newState);
    stateService.setState(matchId, newState);

    // ==========================
    // 2) Bot loop (se BOT e turno P2)
    // ==========================
    const modeNorm = normalizeMode(match.mode);
    const difficultyNorm = normalizeDifficulty(match.difficulty);

    if (modeNorm === "BOT") {
      let botSteps = 0;

      while (!isGameEnded(newState) && isBotTurn(newState) && botSteps < MAX_BOT_STEPS) {
        botSteps += 1;

        // 2.1) Bot escolhe ação
        let botAction;
        try {
          botAction = await getMove({ state: newState, difficulty: difficultyNorm });
        } catch (err) {
          events.push(ev("BOT_SERVICE_ERROR", { step: botSteps, message: err?.message, code: err?.code }));
          break;
        }

        events.push(ev("ACTION_META", { source: "BOT", action: botAction, step: botSteps, at: nowIso() }));

        // 2.2) Rules resolve ação do bot
        let botOut;
        try {
          botOut = await resolveAction({ state: newState, action: botAction });
        } catch (err) {
          events.push(ev("RULES_UPSTREAM_FAILURE", { during: "BOT", step: botSteps, message: err?.message }));
          break;
        }

        if (Array.isArray(botOut?.events)) events.push(...botOut.events);

        if (botOut?.rejected) {
          events.push(ev("BOT_ACTION_REJECTED", { step: botSteps, action: botAction, rejected: botOut.rejected }));

          // Fallback: tentar END_TURN se não era END_TURN (pra não travar o jogo)
          const botType = String(botAction?.type || "").toUpperCase();
          if (botType !== "END_TURN") {
            const fallback = { type: "END_TURN", payload: {} };
            events.push(ev("ACTION_META", { source: "BOT_FALLBACK", action: fallback, step: botSteps, at: nowIso() }));

            try {
              const fbOut = await resolveAction({ state: newState, action: fallback });
              if (!fbOut?.rejected && fbOut?.newState) {
                newState = stateService.ensureStateShape(fbOut.newState);
                if (Array.isArray(fbOut.events)) events.push(...fbOut.events);
                stateService.setState(matchId, newState);
                continue;
              }
              if (fbOut?.rejected) {
                events.push(ev("BOT_FALLBACK_REJECTED", { step: botSteps, rejected: fbOut.rejected }));
              }
            } catch (e) {
              events.push(ev("BOT_FALLBACK_ERROR", { step: botSteps, message: e?.message }));
            }
          }

          break;
        }

        // aplica novo estado do bot
        newState = stateService.ensureStateShape(botOut.newState);
        stateService.setState(matchId, newState);
      }

      if (botSteps >= MAX_BOT_STEPS && isBotTurn(newState)) {
        events.push(ev("BOT_STEPS_LIMIT_REACHED", { limit: MAX_BOT_STEPS, at: nowIso() }));
      }
    }

    // ==========================
    // Resposta final (sempre sanitizada para viewerSide)
    // ==========================
    const response = {
      matchId,
      mode: match.mode,
      difficulty: match.difficulty,
      createdAt: match.createdAt,
      events,
      state: stateService.sanitizeStateForViewer(newState, viewerSide),
    };

    stateService.setCachedActionResult(matchId, clientActionId, response);
    return res.json(response);
  } catch (e) {
    // ✅ evita crash do processo (o que vira 502 no Nginx)
    return res.status(500).json({
      error: "MATCH_SERVICE_INTERNAL_ERROR",
      message: e?.message || "Erro interno no match-service",
    });
  }
}

export async function health(req, res) {
  return res.json({ ok: true, service: "match-service", time: nowIso() });
}

export default {
  createMatch,
  getMatch,
  applyAction,
  health,
};
