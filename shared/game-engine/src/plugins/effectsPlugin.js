/**
 * Plugin opcional do boardgame.io para isolar a lógica de buffs/debuffs
 * e simplificar o objeto G (State principal).
 */
export const EffectsPlugin = {
  name: 'effects',
  setup: () => ({ active: [] }),
  api: ({ G, ctx }) => ({
    add: (effect) => {
      // Adiciona um novo efeito com expiração automática
    },
    getActive: (slot) => {
      // Retorna efeitos ativos para um slot específico
    }
  })
};
