/* eslint-env node */
// prisma/seed.js
// Seed principal: roda cards primeiro e depois users/bots/decks.
//
// - Cards: 20 cartas (PDF Cartas_Cardgame_OWASP_Atualizadas.pdf)
// - Users/Bots/Decks: seedUsersBotsDecks.js
//
// Compatível com o schema:
// - CD_HABILITY (texto idêntico ao PDF)
// - CD_TYPE: "UNIT" | "SPELL"
// - CD_EFFECT_JSON: category ("ATAQUE"|"DEFESA"|"MAGIA") + kind + params
// - CD_HAS_ABILITY, CD_ABILITY_COST, CD_ABILITY_LIMIT_JSON
//
// Observação:
// - "Habilidade: 1/2" (Detector de Redes Falsas) -> CD_ABILITY_COST = 1 e detalhei no CD_EFFECT_JSON.
// - "Passiva / 0" -> CD_ABILITY_COST = 0.

import { PrismaClient } from "@prisma/client";
import seedUsersBotsDecks from "./seedUsersBotsDecks.js";

const prisma = new PrismaClient();

// ✅ Imagens em: frontend/public/img/cards/*.png
// ✅ URL pública: /img/cards/<arquivo>.png
const existingImages = {
  "Captura de Pacotes": "/img/cards/capturapacotes.png",
  "Injeção de Script": "/img/cards/injecaoscript.png",
  "Página Fake de Login": "/img/cards/fakelogin.png",
  "Quebra de Autorização": "/img/cards/quebraautorizacao.png",
  "Força Bruta": "/img/cards/forcabruta.png",
  "Exploração de API": "/img/cards/exploracaoapi.png",
  "Man-in-the-Middle": "/img/cards/manmiddle.png",
  "Ponto Fantasma": "/img/cards/pontofantasma.png",
  "Engenharia Social": "/img/cards/engsocial.png",
  "Evil Twin": "/img/cards/eviltwin.png",

  "Firewall Básico": "/img/cards/firewall.png",
  "Detector de Redes Falsas": "/img/cards/decredesfalsas.png",
  "Modo Navegação Segura": "/img/cards/modonavsegura.png",
  "Senha Forte++": "/img/cards/senhaforte.png",
  "VPN Ativada": "/img/cards/vpnativada.png",

  "Software Malicioso": "/img/cards/malicioso.png",
  "Atualização de Software": "/img/cards/attsoftware.png",
  "Escudo Digital": "/img/cards/escudodigital.png",
  "Logs de Auditoria": "/img/cards/logsauditoria.png",
  "Backup Seguro": "/img/cards/backupseguro.png",
};

const cardsData = [
  // =========================
  // ATAQUE (UNIT) - 10
  // =========================
  {
    CD_NAME: "Captura de Pacotes",
    CD_HABILITY:
      "Se o dano deste ataque atingir a Vida da carta alvo, cure 5 de Vida desta carta; se estiver no máximo, cure 5 de Vida do jogador (1x por turno).",
    CD_TYPE: "UNIT",
    CD_COST: 3,
    CD_LIFE: 40,
    CD_ATTACK: 60,
    CD_DEFENSE: 20,
    CD_IMAGE: existingImages["Captura de Pacotes"] ?? null,
    CD_EFFECT_JSON: { category: "ATAQUE", kind: "LIFESTEAL_ON_HIT", value: 5 },
    CD_HAS_ABILITY: true,
    CD_ABILITY_COST: 1,
    CD_ABILITY_LIMIT_JSON: { per: "TURN", times: 1 },
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },
  {
    CD_NAME: "Injeção de Script",
    CD_HABILITY: "Ao atacar, você pode dividir o dano final entre até 2 cartas inimigas.",
    CD_TYPE: "UNIT",
    CD_COST: 3,
    CD_LIFE: 40,
    CD_ATTACK: 60,
    CD_DEFENSE: 20,
    CD_IMAGE: existingImages["Injeção de Script"] ?? null,
    CD_EFFECT_JSON: { category: "ATAQUE", kind: "SPLIT_DAMAGE", maxTargets: 2 },
    CD_HAS_ABILITY: true,
    CD_ABILITY_COST: 2,
    CD_ABILITY_LIMIT_JSON: null,
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },
  {
    CD_NAME: "Página Fake de Login",
    CD_HABILITY:
      "Se o dano final atingir a Vida da carta alvo, cause +10 de dano direto ao jogador inimigo.",
    CD_TYPE: "UNIT",
    CD_COST: 5,
    CD_LIFE: 45,
    CD_ATTACK: 65,
    CD_DEFENSE: 30,
    CD_IMAGE: existingImages["Página Fake de Login"] ?? null,
    CD_EFFECT_JSON: { category: "ATAQUE", kind: "BONUS_PLAYER_DAMAGE_ON_HIT", value: 10 },
    CD_HAS_ABILITY: true,
    CD_ABILITY_COST: 3,
    CD_ABILITY_LIMIT_JSON: null,
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },
  {
    CD_NAME: "Quebra de Autorização",
    CD_HABILITY: "Ao calcular o dano, ignore até 20 de Defesa da carta alvo.",
    CD_TYPE: "UNIT",
    CD_COST: 4,
    CD_LIFE: 50,
    CD_ATTACK: 60,
    CD_DEFENSE: 25,
    CD_IMAGE: existingImages["Quebra de Autorização"] ?? null,
    CD_EFFECT_JSON: { category: "ATAQUE", kind: "IGNORE_DEF_UP_TO", value: 20 },
    CD_HAS_ABILITY: true,
    CD_ABILITY_COST: 2,
    CD_ABILITY_LIMIT_JSON: null,
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },
  {
    CD_NAME: "Força Bruta",
    CD_HABILITY:
      "Se este ataque não causar dano, esta carta recebe +10 de Ataque até o fim do próximo turno.",
    CD_TYPE: "UNIT",
    CD_COST: 3,
    CD_LIFE: 45,
    CD_ATTACK: 55,
    CD_DEFENSE: 20,
    CD_IMAGE: existingImages["Força Bruta"] ?? null,
    CD_EFFECT_JSON: {
      category: "ATAQUE",
      kind: "GAIN_ATK_IF_NO_DAMAGE",
      value: 10,
      duration: "END_OF_NEXT_TURN",
    },
    CD_HAS_ABILITY: true,
    CD_ABILITY_COST: 0,
    CD_ABILITY_LIMIT_JSON: null,
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },
  {
    CD_NAME: "Exploração de API",
    CD_HABILITY:
      "Escolha uma carta inimiga: ela não pode ativar habilidades até o fim do próximo turno do oponente.",
    CD_TYPE: "UNIT",
    CD_COST: 5,
    CD_LIFE: 55,
    CD_ATTACK: 70,
    CD_DEFENSE: 30,
    CD_IMAGE: existingImages["Exploração de API"] ?? null,
    CD_EFFECT_JSON: {
      category: "ATAQUE",
      kind: "SILENCE_ABILITIES",
      duration: "END_OF_NEXT_OPPONENT_TURN",
    },
    CD_HAS_ABILITY: true,
    CD_ABILITY_COST: 3,
    CD_ABILITY_LIMIT_JSON: null,
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },
  {
    CD_NAME: "Man-in-the-Middle",
    CD_HABILITY:
      "Se houver dano excedente, metade vai para a Vida da carta alvo e metade para a Vida do jogador inimigo.",
    CD_TYPE: "UNIT",
    CD_COST: 3,
    CD_LIFE: 50,
    CD_ATTACK: 60,
    CD_DEFENSE: 25,
    CD_IMAGE: existingImages["Man-in-the-Middle"] ?? null,
    CD_EFFECT_JSON: { category: "ATAQUE", kind: "SPLIT_OVERFLOW_DAMAGE", split: "50_50" },
    CD_HAS_ABILITY: true,
    CD_ABILITY_COST: 2,
    CD_ABILITY_LIMIT_JSON: null,
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },
  {
    CD_NAME: "Ponto Fantasma",
    CD_HABILITY:
      "Se a Defesa da carta alvo for 30 ou menos, o dano excedente atinge o jogador inimigo.",
    CD_TYPE: "UNIT",
    CD_COST: 3,
    CD_LIFE: 40,
    CD_ATTACK: 55,
    CD_DEFENSE: 20,
    CD_IMAGE: existingImages["Ponto Fantasma"] ?? null,
    CD_EFFECT_JSON: { category: "ATAQUE", kind: "OVERFLOW_IF_TARGET_DEF_LEQ", thresholdDef: 30 },
    CD_HAS_ABILITY: true,
    CD_ABILITY_COST: 2,
    CD_ABILITY_LIMIT_JSON: null,
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },
  {
    CD_NAME: "Engenharia Social",
    CD_HABILITY: "O jogador inimigo revela todas as cartas da mão até o fim do turno.",
    CD_TYPE: "UNIT",
    CD_COST: 4,
    CD_LIFE: 45,
    CD_ATTACK: 60,
    CD_DEFENSE: 25,
    CD_IMAGE: existingImages["Engenharia Social"] ?? null,
    CD_EFFECT_JSON: { category: "ATAQUE", kind: "REVEAL_HAND", duration: "END_OF_TURN" },
    CD_HAS_ABILITY: true,
    CD_ABILITY_COST: 3,
    CD_ABILITY_LIMIT_JSON: null,
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },
  {
    CD_NAME: "Evil Twin",
    CD_HABILITY:
      "Ao invocar pode gastar energia para escolher uma carta de Defesa inimiga: ela troca de lado até o fim do seu turno.",
    CD_TYPE: "UNIT",
    CD_COST: 5,
    CD_LIFE: 60,
    CD_ATTACK: 70,
    CD_DEFENSE: 25,
    CD_IMAGE: existingImages["Evil Twin"] ?? null,
    CD_EFFECT_JSON: { category: "ATAQUE", kind: "STEAL_DEFENSE_TEMP", duration: "END_OF_TURN" },
    CD_HAS_ABILITY: true,
    CD_ABILITY_COST: 3,
    CD_ABILITY_LIMIT_JSON: null,
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },

  // =========================
  // DEFESA (UNIT) - 5
  // =========================
  {
    CD_NAME: "Firewall Básico",
    CD_HABILITY: "A primeira vez que for atacada na rodada, reduza o dano final em 20.",
    CD_TYPE: "UNIT",
    CD_COST: 2,
    CD_LIFE: 60,
    CD_ATTACK: 15,
    CD_DEFENSE: 50,
    CD_IMAGE: existingImages["Firewall Básico"] ?? null,
    CD_EFFECT_JSON: { category: "DEFESA", kind: "REDUCE_DAMAGE_FIRST_HIT", value: 20, scope: "ROUND" },
    CD_HAS_ABILITY: true,
    CD_ABILITY_COST: 1,
    CD_ABILITY_LIMIT_JSON: { per: "ROUND", times: 1 },
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },
  {
    CD_NAME: "Detector de Redes Falsas",
    CD_HABILITY:
      "Ao invocar, pode aplicar um efeito imediato (custo 1) de revelar uma carta aleatória da mão do oponente, pode ativar essa habilidade novamente durante seu turno (custo 2)",
    CD_TYPE: "UNIT",
    CD_COST: 3,
    CD_LIFE: 70,
    CD_ATTACK: 20,
    CD_DEFENSE: 55,
    CD_IMAGE: existingImages["Detector de Redes Falsas"] ?? null,
    CD_EFFECT_JSON: {
      category: "DEFESA",
      kind: "REVEAL_RANDOM_HAND_CARD",
      mode: "ON_PLAY_OR_ACTIVATE",
      costs: [1, 2],
    },
    CD_HAS_ABILITY: true,
    CD_ABILITY_COST: 1,
    CD_ABILITY_LIMIT_JSON: null,
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },
  {
    CD_NAME: "Modo Navegação Segura",
    CD_HABILITY: "Ataques direcionados a essa carta são reduzidos em 50%.",
    CD_TYPE: "UNIT",
    CD_COST: 4,
    CD_LIFE: 70,
    CD_ATTACK: 25,
    CD_DEFENSE: 65,
    CD_IMAGE: existingImages["Modo Navegação Segura"] ?? null,
    CD_EFFECT_JSON: { category: "DEFESA", kind: "REDUCE_INCOMING_DAMAGE_PERCENT", value: 50 },
    CD_HAS_ABILITY: true,
    CD_ABILITY_COST: 2,
    CD_ABILITY_LIMIT_JSON: null,
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },
  {
    CD_NAME: "Senha Forte++",
    CD_HABILITY: "1x por rodada, anule o dano final de um ataque de custo inferior.",
    CD_TYPE: "UNIT",
    CD_COST: 3,
    CD_LIFE: 60,
    CD_ATTACK: 15,
    CD_DEFENSE: 65,
    CD_IMAGE: existingImages["Senha Forte++"] ?? null,
    CD_EFFECT_JSON: { category: "DEFESA", kind: "NEGATE_DAMAGE_IF_LOWER_COST", per: "ROUND", times: 1 },
    CD_HAS_ABILITY: true,
    CD_ABILITY_COST: 3,
    CD_ABILITY_LIMIT_JSON: { per: "ROUND", times: 1 },
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },
  {
    CD_NAME: "VPN Ativada",
    CD_HABILITY: "Negue efeitos que forcem revelação de mão, mesmo se esta carta estiver na mão.",
    CD_TYPE: "UNIT",
    CD_COST: 4,
    CD_LIFE: 65,
    CD_ATTACK: 20,
    CD_DEFENSE: 70,
    CD_IMAGE: existingImages["VPN Ativada"] ?? null,
    CD_EFFECT_JSON: { category: "DEFESA", kind: "NEGATE_HAND_REVEAL_EFFECTS" },
    CD_HAS_ABILITY: true,
    CD_ABILITY_COST: 3,
    CD_ABILITY_LIMIT_JSON: null,
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },

  // =========================
  // MAGIA (SPELL) - 5
  // =========================
  {
    CD_NAME: "Software Malicioso",
    CD_HABILITY:
      "Debuff –10 Ataque inimigo ou buff +10 Ataque aliado até o fim do próximo turno.",
    CD_TYPE: "SPELL",
    CD_SPELL_KEY: "SOFTWARE_MALICIOSO",
    CD_COST: 3,
    CD_LIFE: null,
    CD_ATTACK: null,
    CD_DEFENSE: null,
    CD_IMAGE: existingImages["Software Malicioso"] ?? null,
    CD_EFFECT_JSON: { category: "MAGIA", kind: "ATK_BUFF_OR_DEBUFF", value: 10, duration: "END_OF_NEXT_TURN" },
    CD_HAS_ABILITY: false,
    CD_ABILITY_COST: null,
    CD_ABILITY_LIMIT_JSON: null,
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },
  {
    CD_NAME: "Atualização de Software",
    CD_HABILITY: "Bloqueie um ataque ou redirecione para outra carta válida.",
    CD_TYPE: "SPELL",
    CD_SPELL_KEY: "ATUALIZACAO_SOFTWARE",
    CD_COST: 4,
    CD_LIFE: null,
    CD_ATTACK: null,
    CD_DEFENSE: null,
    CD_IMAGE: existingImages["Atualização de Software"] ?? null,
    CD_EFFECT_JSON: { category: "MAGIA", kind: "BLOCK_OR_REDIRECT_ATTACK" },
    CD_HAS_ABILITY: false,
    CD_ABILITY_COST: null,
    CD_ABILITY_LIMIT_JSON: null,
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },
  {
    CD_NAME: "Escudo Digital",
    CD_HABILITY: "Cure 30 de Vida de uma carta aliada e conceda +10 Defesa até o fim da rodada.",
    CD_TYPE: "SPELL",
    CD_SPELL_KEY: "ESCUDO_DIGITAL",
    CD_COST: 2,
    CD_LIFE: null,
    CD_ATTACK: null,
    CD_DEFENSE: null,
    CD_IMAGE: existingImages["Escudo Digital"] ?? null,
    CD_EFFECT_JSON: { category: "MAGIA", kind: "HEAL_AND_BUFF_DEF", heal: 30, defBuff: 10, duration: "END_OF_ROUND" },
    CD_HAS_ABILITY: false,
    CD_ABILITY_COST: null,
    CD_ABILITY_LIMIT_JSON: null,
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },
  {
    CD_NAME: "Logs de Auditoria",
    CD_HABILITY: "Revele a próxima carta do oponente; se for Ataque, ela custa +1 Energia neste turno.",
    CD_TYPE: "SPELL",
    CD_SPELL_KEY: "LOGS_AUDITORIA",
    CD_COST: 3,
    CD_LIFE: null,
    CD_ATTACK: null,
    CD_DEFENSE: null,
    CD_IMAGE: existingImages["Logs de Auditoria"] ?? null,
    CD_EFFECT_JSON: { category: "MAGIA", kind: "REVEAL_NEXT_CARD_AND_TAX_ATTACK", taxEnergy: 1, duration: "THIS_TURN" },
    CD_HAS_ABILITY: false,
    CD_ABILITY_COST: null,
    CD_ABILITY_LIMIT_JSON: null,
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },
  {
    CD_NAME: "Backup Seguro",
    CD_HABILITY:
      "Restaure 1 carta da Zona de Exclusão: campo com 20% da Vida (custo 2) ou mão com Vida cheia revelada (custo 3).",
    CD_TYPE: "SPELL",
    CD_SPELL_KEY: "BACKUP_SEGURO",
    CD_COST: 5,
    CD_LIFE: null,
    CD_ATTACK: null,
    CD_DEFENSE: null,
    CD_IMAGE: existingImages["Backup Seguro"] ?? null,
    CD_EFFECT_JSON: {
      category: "MAGIA",
      kind: "RESTORE_FROM_DISCARD",
      options: [
        { to: "FIELD", lifePercent: 20, cost: 2, cantActThisTurn: true },
        { to: "HAND", fullLife: true, revealed: true, cost: 3 },
      ],
    },
    CD_HAS_ABILITY: false,
    CD_ABILITY_COST: null,
    CD_ABILITY_LIMIT_JSON: null,
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4,
  },
];

export async function seedCards() {
  console.log(`🃏 Iniciando a criação/atualização de ${cardsData.length} cartas...`);

  if (cardsData.length !== 20) {
    console.warn(`⚠️ Aviso: esperado 20 cartas, mas cardsData tem ${cardsData.length}.`);
  }

  for (const card of cardsData) {
    const cardData = {
      CD_NAME: card.CD_NAME,
      CD_HABILITY: card.CD_HABILITY,
      CD_TYPE: card.CD_TYPE,
      CD_COST: card.CD_COST,

      CD_LIFE: card.CD_LIFE ?? undefined,
      CD_ATTACK: card.CD_ATTACK ?? undefined,
      CD_DEFENSE: card.CD_DEFENSE ?? undefined,

      CD_IMAGE: card.CD_IMAGE ?? undefined,
      CD_MAX_IN_DECK: card.CD_MAX_IN_DECK ?? 3,
      CD_MAX_IN_COLLECTION: card.CD_MAX_IN_COLLECTION ?? 4,

      CD_EFFECT_JSON: card.CD_EFFECT_JSON ?? undefined,
      CD_HAS_ABILITY: card.CD_HAS_ABILITY ?? false,
      CD_ABILITY_COST: card.CD_ABILITY_COST ?? undefined,
      CD_ABILITY_LIMIT_JSON: card.CD_ABILITY_LIMIT_JSON ?? undefined,
      CD_SPELL_KEY: card.CD_SPELL_KEY ?? undefined,
    };

    const createdCard = await prisma.card.upsert({
      where: { CD_NAME: card.CD_NAME },
      update: cardData,
      create: cardData,
    });

    console.log(`✓ Carta processada: ${createdCard.CD_NAME}`);
  }

  console.log("✅ Cards OK");
}

async function main() {
  await seedCards();

  // ✅ agora roda o seed de player/bots/decks
  await seedUsersBotsDecks();

  console.log("✅ Seed completo finalizado com sucesso!");
}

// Exec direto (node prisma/seed.js)
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .catch((e) => {
      console.error("❌ Erro durante o seeding:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export default main;
