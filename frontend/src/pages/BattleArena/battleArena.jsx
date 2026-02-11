// frontend/src/pages/BattleArena/battleArena.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate, useParams } from "react-router-dom";

// hooks
import useMatchSession from "./hooks/useMatchSession.js";
import useActionQueue from "./hooks/useActionQueue.js";
import useSelections from "./hooks/useSelections.js";

// utils
import { pickBoard3, buildSlots } from "./utils/stateSelectors.js";
import {
  formatTime,
  getCardId,
  getCardType,
  typeBadge,
} from "./utils/mappers.js";

// components
import ArenaHeader from "./components/ArenaHeader.jsx";
import ActionBar from "./components/ActionBar.jsx";
import Stage from "./components/Stage.jsx";
import Board from "./components/Board.jsx";
import ZoneCard from "./components/ZoneCard.jsx";
import EnergyOrb from "./components/EnergyOrb.jsx";
import PlayerHand from "./components/PlayerHand.jsx";
import EnemyHand from "./components/EnemyHand.jsx";

// overlays
import TargetPickerModal from "./components/Overlays/TargetPickerModal.jsx";

const ARENA_BG_URL = "/img/arena-bg.jpg";

// palco
const STAGE_W = 1600;
const STAGE_H = 900;

function toUpper(v, fb = "") {
  return String(v ?? fb)
    .trim()
    .toUpperCase();
}

function normalizeSlug(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

/** imagem real (mão do player / cartas reveladas do inimigo) */
function getCardImageUrl(card) {
  if (!card) return null;
  const img = card.img ?? card.CD_IMAGE ?? card.image ?? card.art ?? null;
  if (typeof img === "string" && img.trim()) {
    const p = img.trim();
    const idx = p.indexOf("/img/cards/");
    if (idx >= 0) return p.slice(idx);
    return p;
  }
  return null;
}

/** Detecta qual spell é (espelha o resolveSpell.js) */
function detectSpellKind(card) {
  const id = normalizeSlug(card?.cardId ?? card?.id ?? getCardId(card) ?? "");
  const nm = normalizeSlug(card?.name ?? card?.CD_NAME ?? "");

  const isSoftwareMalicioso =
    id.includes("software_malicioso") || nm.includes("software malicioso");
  const isEscudoDigital =
    id.includes("escudo_digital") || nm.includes("escudo digital");
  const isLogsAuditoria =
    id.includes("logs_auditoria") || nm.includes("logs de auditoria");
  const isAtualizacaoSoftware =
    id.includes("atualizacao_software") ||
    nm.includes("atualização de software") ||
    nm.includes("atualizacao de software");
  const isBackupSeguro =
    id.includes("backup_seguro") || nm.includes("backup seguro");

  if (isSoftwareMalicioso) return "SOFTWARE_MALICIOSO";
  if (isEscudoDigital) return "ESCUDO_DIGITAL";
  if (isLogsAuditoria) return "LOGS_AUDITORIA";
  if (isAtualizacaoSoftware) return "ATUALIZACAO_SOFTWARE";
  if (isBackupSeguro) return "BACKUP_SEGURO";
  return "GENERIC";
}

/** Detecta abilities (espelha resolveAbility.js) */
function listUnitAbilities(unit) {
  if (!unit) return [];

  if (Array.isArray(unit.abilities)) {
    return unit.abilities
      .filter((a) => a && typeof a === "object" && a.key)
      .map((a) => ({ key: String(a.key), cost: a.cost }));
  }

  const k =
    unit.abilityKey ?? unit?.effect?.abilityKey ?? unit?.effect?.key ?? null;
  if (k) return [{ key: String(k), cost: unit.abilityCost ?? null }];

  if (unit.hasAbility && unit?.effect?.kind)
    return [{ key: String(unit.effect.kind), cost: unit.abilityCost ?? null }];

  return [];
}

export default function Arena() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const matchId = params.matchId || location.state?.matchId || null;
  const session = useMatchSession(matchId);

  const selections = useSelections();

  const [secondsLeft, setSecondsLeft] = useState(10 * 60);
  useEffect(() => {
    const id = setInterval(
      () => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)),
      1000,
    );
    return () => clearInterval(id);
  }, []);

  // scale
  const arenaBoxRef = useRef(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = arenaBoxRef.current;
    if (!el) return;

    const compute = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const s = Math.min(w / STAGE_W, h / STAGE_H);
      setScale(Math.max(0.52, s));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);

    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, []);

  const [endTurnToast, setEndTurnToast] = useState(false);

  // ✅ somente TargetPicker
  const [targetModal, setTargetModal] = useState(null);

  const { post: postAction, isSending } = useActionQueue({
    matchId,
    onApply: (patch) => {
      if (patch?.events) session.pushEvents(patch.events);
      if (patch?.state) session.setState(patch.state);
      if (patch?.rejected)
        session.setHint(
          `Ação rejeitada: ${patch.rejected?.code || "REJECTED"}`,
        );
    },
  });

  const mySide = session.viewerSide;
  const enemySide = session.enemySide;

  const myBoard3 = useMemo(
    () => pickBoard3(session.state, mySide),
    [session.state, mySide],
  );
  const enemyBoard3 = useMemo(
    () => pickBoard3(session.state, enemySide),
    [session.state, enemySide],
  );
  const slots = useMemo(
    () => buildSlots(enemyBoard3, myBoard3),
    [enemyBoard3, myBoard3],
  );

  const topFanRotation = useMemo(() => [-26, -16, -8, 0, 8, 16, 26], []);
  const bottomFanRotation = useMemo(() => [-16, -8, 0, 8, 16], []);

  const myHp = useMemo(() => {
    const v = Number(
      session.state?.players?.[mySide]?.hp ??
        session.state?.players?.[mySide]?.life ??
        100,
    );
    return Number.isFinite(v) ? v : 100;
  }, [session.state, mySide]);

  const enemyHp = useMemo(() => {
    const v = Number(
      session.state?.players?.[enemySide]?.hp ??
        session.state?.players?.[enemySide]?.life ??
        100,
    );
    return Number.isFinite(v) ? v : 100;
  }, [session.state, enemySide]);

  function canDropInSlot(slotIndex) {
    if (slotIndex < 3) return false;
    if (!session.isMyTurn) return false;
    if (toUpper(session.phase, "MAIN") !== "MAIN") return false;
    const localIndex = slotIndex - 3;
    return myBoard3?.[localIndex] == null;
  }

  async function endTurn() {
    if (!session.isMyTurn || session.isLoading || isSending) return;
    try {
      session.setHint("Encerrando turno...");
      const out = await postAction({ type: "END_TURN", payload: {} });

      setEndTurnToast(true);
      window.setTimeout(() => setEndTurnToast(false), 1100);

      if (out?.ok) session.setHint("Turno encerrado. Aguardando bot...");
    } catch (e) {
      session.setErr(e?.message || "Erro ao encerrar turno");
      session.setHint("Erro ao encerrar turno.");
    }
  }

  async function attackWithSlot(localSlot) {
    if (!session.isMyTurn || isSending) return;
    if (toUpper(session.phase, "MAIN") !== "MAIN") return;
    if (localSlot < 0 || localSlot > 2) return;

    if (!myBoard3?.[localSlot]) {
      session.setHint("Não há unidade nesse slot.");
      return;
    }

    try {
      session.setHint("Atacando...");
      await postAction({
        type: "ATTACK",
        payload: { attackerSlot: localSlot },
      });
      session.setHint("Ataque enviado.");
    } catch (e) {
      session.setErr(e?.message || "Erro ao atacar");
      session.setHint("Erro ao atacar.");
    }
  }

  async function castSpell(payload) {
    if (!session.isMyTurn || isSending) return;

    if (toUpper(session.phase, "MAIN") !== "MAIN") {
      session.setHint("Você só pode usar Magias na fase MAIN.");
      return;
    }
    if (session.state?.turn?.hasAttacked) {
      session.setHint("Não é possível usar Magias após atacar.");
      return;
    }

    try {
      session.setHint("Conjurando...");
      await postAction({ type: "CAST_SPELL", payload });
      selections.clearDrag();
      session.setHint("Magia aplicada.");
    } catch (e) {
      session.setErr(e?.message || "Erro ao conjurar");
      session.setHint("Erro ao conjurar.");
    }
  }

  async function activateAbility({ sourceSlot, abilityKey, payload }) {
    if (!session.isMyTurn || isSending) return;

    if (toUpper(session.phase, "MAIN") !== "MAIN") {
      session.setHint("Você só pode usar Habilidade na fase MAIN.");
      return;
    }
    if (session.state?.turn?.hasAttacked) {
      session.setHint("Habilidade não pode após atacar.");
      return;
    }
    if (session.state?.turn?.abilityUsed) {
      session.setHint("Você já usou uma habilidade neste turno.");
      return;
    }

    try {
      session.setHint("Ativando habilidade...");
      await postAction({
        type: "ACTIVATE_ABILITY",
        payload: {
          source: { slot: sourceSlot },
          abilityKey,
          ...(payload || {}),
        },
      });
      session.setHint("Habilidade aplicada.");
    } catch (e) {
      session.setErr(e?.message || "Erro ao ativar habilidade");
      session.setHint("Erro ao ativar habilidade.");
    }
  }

  /**
   * ✅ Com só um TargetPicker:
   * - magias com escolhas/targets abrem o modal unificado (flow)
   * - magias simples (LOGS) conjuram direto
   */
  function beginCastSpell(card) {
    const cardId = getCardId(card);
    if (!cardId) {
      session.setHint("Carta sem ID (cardId/CD_ID).");
      return;
    }

    const kind = detectSpellKind(card);

    // sem interação
    if (kind === "LOGS_AUDITORIA" || kind === "GENERIC") {
      castSpell({ cardId });
      return;
    }

    // ESCUDO: escolhe slot aliado
    if (kind === "ESCUDO_DIGITAL") {
      setTargetModal({
        title: "Escudo Digital",
        flow: {
          pickAction: false,
          pickChoice: false,
          pickTarget: true,
          allowEnemy: false,
          allowSelf: true,
          defaultSide: "SELF",
        },
        onConfirm: ({ slot }) => castSpell({ cardId, target: { slot } }),
        onCancel: () => setTargetModal(null),
      });
      return;
    }

    // SOFTWARE MALICIOSO: BUFF/DEBUFF + alvo (self/enemy)
    if (kind === "SOFTWARE_MALICIOSO") {
      setTargetModal({
        title: "Software Malicioso",
        subtitle: "Escolha BUFF/DEBUFF e selecione o alvo.",
        flow: {
          pickAction: false,
          pickChoice: true,
          choices: [
            { key: "BUFF", label: "BUFF (+10 ATK aliado)" },
            { key: "DEBUFF", label: "DEBUFF (-10 ATK inimigo)" },
          ],
          pickTarget: true,
          allowEnemy: true,
          allowSelf: true,
          defaultSide: "ENEMY",
        },
        onConfirm: ({ choiceKey, side, slot }) => {
          const choice = choiceKey === "BUFF" ? "BUFF" : "DEBUFF";
          castSpell({
            cardId,
            choice,
            target: { side: toUpper(side) === "SELF" ? "SELF" : "ENEMY", slot },
          });
        },
        onCancel: () => setTargetModal(null),
      });
      return;
    }

    // ATUALIZAÇÃO: BLOCK ou REDIRECT (REDIRECT escolhe slot aliado)
    if (kind === "ATUALIZACAO_SOFTWARE") {
      setTargetModal({
        title: "Atualização de Software",
        subtitle: "Bloquear ou redirecionar o próximo ataque.",
        flow: {
          pickAction: false,
          pickChoice: true,
          choices: [
            { key: "BLOCK", label: "Bloquear próximo ataque" },
            {
              key: "REDIRECT",
              label: "Redirecionar próximo ataque (escolher slot)",
            },
          ],
          pickTarget: true,
          allowEnemy: false,
          allowSelf: true,
          defaultSide: "SELF",
          // ✅ se for BLOCK, a escolha de slot não importa, mas a UI vai pedir slot;
          // pra manter simples com 1 modal, a gente interpreta:
          // - se BLOCK => ignora slot e conjura
        },
        onConfirm: ({ choiceKey, slot }) => {
          if (choiceKey === "BLOCK") {
            castSpell({ cardId, choice: "BLOCK" });
          } else {
            castSpell({ cardId, choice: "REDIRECT", redirectToSlot: slot });
          }
        },
        onCancel: () => setTargetModal(null),
      });
      return;
    }

    // BACKUP: aqui precisa escolher carta do discard + destino.
    // ✅ Sem ConfirmActionModal, a forma mais simples é:
    // - clicar na carta (spell) abre o TargetPicker pedindo o "alvo/slot" para FIELD,
    // - e o restoreCardId/restoreTo você pode passar via UI separada depois (ex: clique na Dead Zone)
    // Por enquanto, mantemos um fallback: conjura direto se payload já vier por outro fluxo.
    if (kind === "BACKUP_SEGURO") {
      session.setHint(
        "Backup Seguro: selecione uma carta na Dead Zone (UI pendente) e então conjure.",
      );
      // Se você já tem uma UI de dead zone clicável, você chamaria castSpell({cardId, restoreCardId,...})
      return;
    }
  }

  function beginAbility(localSlot) {
    if (!session.isMyTurn || isSending) return;
    if (toUpper(session.phase, "MAIN") !== "MAIN") return;

    if (session.state?.turn?.hasAttacked) {
      session.setHint("Habilidade não pode após atacar.");
      return;
    }
    if (session.state?.turn?.abilityUsed) {
      session.setHint("Você já usou uma habilidade neste turno.");
      return;
    }

    const unit = myBoard3?.[localSlot];
    if (!unit) {
      session.setHint("Sem unidade nesse slot.");
      return;
    }

    const abilities = listUnitAbilities(unit);
    if (!abilities.length) {
      session.setHint("Essa unidade não possui habilidade.");
      return;
    }

    const abilityKey = String(abilities[0].key || "").trim();
    if (!abilityKey) return;

    // exemplo 1: dano direto (precisa alvo)
    if (toUpper(abilityKey) === "DIRECT_DAMAGE_UNIT") {
      setTargetModal({
        title: "Habilidade: Dano Direto",
        subtitle: "Selecione o alvo (self/enemy).",
        flow: {
          pickAction: false,
          pickChoice: false,
          pickTarget: true,
          allowEnemy: true,
          allowSelf: true,
          defaultSide: "ENEMY",
        },
        onConfirm: ({ side, slot }) => {
          activateAbility({
            sourceSlot: localSlot,
            abilityKey,
            payload: {
              target: {
                side: toUpper(side) === "SELF" ? "SELF" : "ENEMY",
                slot,
              },
              amount: 10,
            },
          });
        },
        onCancel: () => setTargetModal(null),
      });
      return;
    }

    // exemplo 2: mod atk (+10 ou -10) + alvo
    if (toUpper(abilityKey) === "BUFF_ATK_UNTIL_END_NEXT_TURN") {
      setTargetModal({
        title: "Habilidade: Mod ATK",
        subtitle: "Escolha +10/-10 e selecione o alvo.",
        flow: {
          pickAction: false,
          pickChoice: true,
          choices: [
            { key: "+10", label: "+10 ATK" },
            { key: "-10", label: "-10 ATK" },
          ],
          pickTarget: true,
          allowEnemy: true,
          allowSelf: true,
          defaultSide: "SELF",
        },
        onConfirm: ({ choiceKey, side, slot }) => {
          const mod = choiceKey === "-10" ? -10 : 10;
          activateAbility({
            sourceSlot: localSlot,
            abilityKey,
            payload: {
              target: {
                side: toUpper(side) === "SELF" ? "SELF" : "ENEMY",
                slot,
              },
              mod,
            },
          });
        },
        onCancel: () => setTargetModal(null),
      });
      return;
    }

    session.setHint(
      `Habilidade '${abilityKey}' precisa de UI dedicada (payload).`,
    );
  }

  async function onDropSlot(slotIndex) {
    const payloadRef = selections.dragCardRef.current;
    if (!payloadRef) return;

    if (!session.isMyTurn) {
      session.setHint("Não é seu turno.");
      return;
    }
    if (toUpper(session.phase, "MAIN") !== "MAIN") {
      session.setHint("Ações só são permitidas na fase MAIN.");
      return;
    }

    const { card } = payloadRef;
    const cardId = getCardId(card);
    if (!cardId) {
      session.setHint("Carta sem ID (cardId/CD_ID).");
      selections.clearDrag();
      return;
    }

    const type = getCardType(card);

    try {
      // SPELL: abre seleção / conjura direto
      if (type === "SPELL") {
        selections.clearDrag();
        beginCastSpell(card);
        return;
      }

      // UNIT: precisa slot válido
      if (!canDropInSlot(slotIndex)) {
        session.setHint("Slot inválido/ocupado.");
        return;
      }

      const slot = slotIndex - 3;
      session.setHint("Jogando carta...");
      await postAction({ type: "PLAY_CARD", payload: { cardId, slot } });

      selections.clearDrag();
      session.setHint(
        "Carta jogada. Clique numa unidade sua para atacar ou usar habilidade.",
      );
    } catch (e) {
      session.setErr(e?.message || "Erro ao aplicar ação");
      session.setHint("Erro ao aplicar ação.");
    }
  }

  const enemyPlayerObj = session.state?.players?.[enemySide] ?? {};
  const enemyHand = Array.isArray(enemyPlayerObj.hand)
    ? enemyPlayerObj.hand
    : [];
  const enemyHandCount =
    Number(enemyPlayerObj.handCount ?? enemyHand.length ?? 0) || 0;

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: `url(${ARENA_BG_URL})` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,0,0,0.10),rgba(0,0,0,0.92))]" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_50%_55%,transparent_40%,rgba(0,0,0,0.85))]" />
      <div className="absolute inset-0 backdrop-blur-[1px]" />

      <EnergyOrb
        energy={session.energyInfo.energy}
        energyMax={session.energyInfo.energyMax}
      />

      <div className="relative z-10 h-full w-full p-3 sm:p-4 lg:p-5">
        <div className="mx-auto h-full w-full max-w-[1920px] grid grid-rows-[auto_1fr_auto] gap-3 sm:gap-4">
          <ArenaHeader
            hint={session.hint}
            secondsLeft={secondsLeft}
            matchId={session.matchMeta?.matchId}
            onBack={() => navigate(-1)}
            formatTime={formatTime}
            viewerSide={session.viewerSide}
            turnOwnerSide={session.turnOwnerSide}
            phase={session.phase}
            myHp={myHp}
            enemyHp={enemyHp}
          />

          <div className="min-h-0 grid grid-cols-1 lg:grid-cols-[10%_80%_10%] gap-3 sm:gap-4">
            {/* LEFT */}
            <div className="min-h-0 flex flex-col gap-3">
              <ZoneCard title="DECK ZONE" tone="cyan" showBack />
              <ActionBar
                turnOwnerSide={session.turnOwnerSide}
                viewerSide={session.viewerSide}
                phase={session.phase}
                turnCount={session.turnCount}
                isMyTurn={session.isMyTurn}
                isLoading={session.isLoading}
                onEndTurn={endTurn}
              />
            </div>

            {/* CENTER */}
            <div className="min-h-0 flex items-center justify-center">
              <div
                ref={arenaBoxRef}
                className="relative w-full h-full max-h-[calc(100dvh-154px)] lg:max-h-[calc(100dvh-132px)]"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full max-w-[1820px] max-h-full aspect-[16/9]">
                    <div
                      className="absolute left-1/2 top-1/2"
                      style={{
                        width: STAGE_W,
                        height: STAGE_H,
                        transform: `translate(-50%, -50%) scale(${scale})`,
                        transformOrigin: "center",
                      }}
                    >
                      <Stage />

                      {/* ✅ EnemyHand real (handCount + reveals) */}
                      <EnemyHand
                        enemyHand={enemyHand}
                        enemyHandCount={enemyHandCount}
                        rotations={topFanRotation}
                        y={10}
                        containerWidth={820}
                        containerHeight={250}
                        cardWidth={130}
                        cardHeight={180}
                        maxShown={6}
                      />

                      <Board
                        slots={slots}
                        dragging={selections.dragging}
                        hoverSlot={selections.hoverSlot}
                        setHoverSlot={selections.setHoverSlot}
                        canDropInSlot={canDropInSlot}
                        onDropSlot={onDropSlot}
                        phase={session.phase}
                        turnMeta={session.state?.turn}
                        onAttackSlot={attackWithSlot}
                        onAbilitySlot={beginAbility}
                        isMyTurn={session.isMyTurn}
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {endTurnToast && (
                    <motion.div
                      className="absolute z-[40] left-1/2 -translate-x-1/2 top-2"
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    >
                      <div className="rounded-2xl border border-white/12 bg-black/40 backdrop-blur px-4 py-2 shadow-[0_18px_70px_rgba(0,0,0,0.7)]">
                        <div className="text-xs font-mono text-slate-200/80 tracking-widest">
                          TURNO ENCERRADO
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {(session.isLoading || session.err) && (
                    <motion.div
                      className="absolute inset-0 z-[60] flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="rounded-2xl border border-white/12 bg-black/55 backdrop-blur px-5 py-4 shadow-[0_18px_70px_rgba(0,0,0,0.7)] max-w-[520px]">
                        {session.isLoading ? (
                          <div className="text-sm text-slate-200/85 font-mono">
                            Carregando partida...
                          </div>
                        ) : (
                          <div className="text-sm text-red-100">
                            Erro: {session.err}
                            <div className="mt-3 flex gap-2">
                              <button
                                className="px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition text-xs font-mono"
                                onClick={() => window.location.reload()}
                                type="button"
                              >
                                Recarregar
                              </button>
                              <button
                                className="px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition text-xs font-mono"
                                onClick={() => navigate(-1)}
                                type="button"
                              >
                                Voltar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Overlays */}
                <AnimatePresence>
                  {targetModal && (
                    <TargetPickerModal
                      key="target-picker"
                      {...targetModal}
                      onClose={() => setTargetModal(null)}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* RIGHT */}
            <div className="min-h-0 flex flex-col gap-3 items-end">
              <div className="flex flex-col gap-2 items-end">
                <ZoneCard title="DEAD ZONE" tone="purple" />
                <ZoneCard title="DEAD ZONE" tone="purple" />
              </div>

              <div className="mt-auto">
                <ZoneCard title="DECK ZONE" tone="cyan" showBack />
              </div>
            </div>
          </div>

          <PlayerHand
            hand={session.hand}
            isLoading={session.isLoading}
            err={session.err}
            rotations={bottomFanRotation}
            getCardKey={(card, i) => `${getCardId(card) ?? "card"}-${i}`}
            renderCard={(card, i) => (
              <DraggableCard
                card={card}
                onClick={() => {
                  if (getCardType(card) === "SPELL") beginCastSpell(card);
                }}
                onDragStart={() => {
                  selections.onDragStartCard(card, i);
                  session.setHint(
                    "Solte no seu SLOT para jogar. SPELL abre seleção.",
                  );
                }}
                onDragEnd={() => {
                  selections.onDragEndCard();
                  session.setHint("Arraste uma carta para jogar.");
                }}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}

/* -------- local -------- */

function DraggableCard({ card, onDragStart, onDragEnd, onClick }) {
  const cost = card?.CD_COST ?? card?.cost ?? 0;
  const type = card?.CD_TYPE ?? card?.type ?? "";
  const img = getCardImageUrl(card);

  return (
    <motion.div
      draggable
      onClick={onClick}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(getCardId(card) ?? ""));
        onDragStart?.();
      }}
      onDragEnd={() => onDragEnd?.()}
      whileHover={{ y: -10, scale: 1.045 }}
      className="relative w-full h-full rounded-2xl cursor-grab active:cursor-grabbing select-none"
      title={
        toUpper(type) === "SPELL"
          ? "Clique para conjurar / arraste"
          : "Arraste para um SLOT"
      }
    >
      <div className="absolute inset-0 rounded-2xl border border-white/18 bg-black/45 backdrop-blur shadow-[0_22px_90px_rgba(0,0,0,0.80)]" />
      <div className="absolute inset-[6px] rounded-xl border border-white/12 bg-white/5 shadow-[inset_0_0_30px_rgba(0,0,0,0.55)]" />

      <motion.div
        className="absolute inset-[6px] rounded-xl opacity-20"
        style={{
          background:
            "linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.22) 40%, transparent 70%)",
        }}
        animate={{ x: [-60, 60, -60] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute left-3 top-3 z-10 w-9 h-9 rounded-full border border-cyan-300/25 bg-black/55 backdrop-blur flex items-center justify-center shadow-[0_0_24px_rgba(34,211,238,0.25)]">
        <span className="text-sm font-extrabold text-cyan-100 font-mono">
          {cost}
        </span>
      </div>

      <div className="absolute right-3 top-3 z-10 px-2 py-1 rounded-xl border border-white/12 bg-white/8 backdrop-blur">
        <span
          className={[
            "text-[10px] font-extrabold tracking-widest",
            typeBadge(type),
          ].join(" ")}
        >
          {type || "-"}
        </span>
      </div>

      <div className="absolute inset-[10px] top-[52px] bottom-[12px] rounded-xl overflow-hidden border border-white/10 bg-black/35">
        {img ? (
          <img
            src={img}
            alt="card"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-200/60 font-mono">
            NO IMG
          </div>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,214,10,0.12),transparent_55%)]" />
      </div>
    </motion.div>
  );
}
