// prisma/seed.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const cardsData = [
  // --- LOTE ANTERIOR ---
  {
    CD_NAME: "Firewall Básico",
    CD_DESCRIPTION: "Reduz o primeiro ataque recebido em 20 pontos de dano.",
    CD_TYPE: "Defesa",
    CD_COST: 1, 
    CD_LIFE: 60,
    CD_ATTACK: 15,
    CD_DEFENSE: 50,
    CD_IMAGE: "firewall.png",
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4
  },
  {
    CD_NAME: "Atualização de Software",
    CD_DESCRIPTION: "Bloqueia qualquer ataque recebido na rodada ou redirecione qualquer ataque para a carta alvo.",
    CD_TYPE: "Magia",
    CD_COST: 2, 
    CD_LIFE: null,
    CD_ATTACK: null,
    CD_DEFENSE: null,
    CD_IMAGE: "atualizacao.png",
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4
  },
  {
    CD_NAME: "Página Fake de Login",
    CD_DESCRIPTION: "Reduz a defesa da carta afetada em 5 pontos.",
    CD_TYPE: "Ataque",
    CD_COST: 3, 
    CD_LIFE: 45,
    CD_ATTACK: 65,
    CD_DEFENSE: 30,
    CD_IMAGE: "loginFake.png",
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4
  },
  {
    CD_NAME: "Injeção de Script",
    CD_DESCRIPTION: "Divide o dano do ataque entre duas cartas (cada uma recebe metade do dano).",
    CD_TYPE: "Ataque",
    CD_COST: 2, 
    CD_LIFE: 40,
    CD_ATTACK: 60,
    CD_DEFENSE: 20,
    CD_IMAGE: "injecaoscript.png",
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4
  },
  {
    CD_NAME: "Evil Twin",
    CD_DESCRIPTION: "Engana e troca a carta de defesa do inimigo.",
    CD_TYPE: "Defesa",
    CD_COST: 4, 
    CD_LIFE: 60,
    CD_ATTACK: 70,
    CD_DEFENSE: 25,
    CD_IMAGE: "eviltwin.png",
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4
  },
  {
    CD_NAME: "Detector de Redes Falsas",
    CD_DESCRIPTION: "Revela cartas de ataque ocultas do oponente.",
    CD_TYPE: "Defesa",
    CD_COST: 2, 
    CD_LIFE: 70,
    CD_ATTACK: 20,
    CD_DEFENSE: 55,
    CD_IMAGE: "detectarede.png",
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4
  },
  {
    CD_NAME: "Escudo Digital",
    CD_DESCRIPTION: "Cura +30 de vida e +10 de defesa em uma carta ativa.",
    CD_TYPE: "Magia",
    CD_COST: 2, 
    CD_LIFE: null,
    CD_ATTACK: null,
    CD_DEFENSE: null,
    CD_IMAGE: "escudo.png",
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4
  },
  {
    CD_NAME: "Captura de Pacotes",
    CD_DESCRIPTION: "Rouba 5 pontos de vida se o ataque atingir a vida da carta.",
    CD_TYPE: "Ataque",
    CD_COST: 5, 
    CD_LIFE: 40,
    CD_ATTACK: 75,
    CD_DEFENSE: 20,
    CD_IMAGE: "capturapacotes.png",
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4
  },
  {
    CD_NAME: "VPN Ativada",
    CD_DESCRIPTION: "Imune a ataques do tipo 'Sniffer' e 'Ponto Fantasma'.",
    CD_TYPE: "Defesa",
    CD_COST: 5, 
    CD_LIFE: 65,
    CD_ATTACK: 20,
    CD_DEFENSE: 70,
    CD_IMAGE: "vpn.png",
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4
  },
  {
    CD_NAME: "Software Malicioso",
    CD_DESCRIPTION: "Diminui o atributo de dano de uma carta do oponente em 10 pontos, se a carta for do tipo ataque em seu campo aumenta o dano em 10 pontos durante uma rodada.",
    CD_TYPE: "Magia",
    CD_COST: 3, 
    CD_LIFE: null,
    CD_ATTACK: null,
    CD_DEFENSE: null,
    CD_IMAGE: "malicioso.png",
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4
  },
  
  // --- NOVAS CARTAS ADICIONADAS ---
  {
    CD_NAME: "Modo Navegação Segura",
    CD_DESCRIPTION: "Reduz dano de ataques invisíveis em 50%.",
    CD_TYPE: "Defesa",
    CD_COST: 4,
    CD_LIFE: 70,
    CD_ATTACK: 25,
    CD_DEFENSE: 65,
    CD_IMAGE: "modonavega.png",
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4
  },
  {
    CD_NAME: "Senha Forte++",
    CD_DESCRIPTION: "Anula qualquer ataque de \"Script Kiddie\".",
    CD_TYPE: "Defesa",
    CD_COST: 3,
    CD_LIFE: 60,
    CD_ATTACK: 15,
    CD_DEFENSE: 65,
    CD_IMAGE: "senhaforte.png",
    CD_MAX_IN_DECK: 3,
    CD_MAX_IN_COLLECTION: 4
  },
];

async function main() {
  console.log(`Iniciando a criação/atualização de ${cardsData.length} cartas...`);
  
  for (const card of cardsData) {
    // Converte null para undefined para campos que podem ser null no banco
    const cardData = {
      ...card,
      CD_LIFE: card.CD_LIFE === null ? undefined : card.CD_LIFE,
      CD_ATTACK: card.CD_ATTACK === null ? undefined : card.CD_ATTACK,
      CD_DEFENSE: card.CD_DEFENSE === null ? undefined : card.CD_DEFENSE,
    };
    
    const createdCard = await prisma.card.upsert({
      where: { CD_NAME: card.CD_NAME },
      update: {}, 
      create: cardData,
    });
    console.log(`✓ Carta processada: ${createdCard.CD_NAME}`);
  }
  
  console.log(`\n✅ Seeding finalizado com sucesso! ${cardsData.length} cartas foram criadas/atualizadas.`);
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });