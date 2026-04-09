// CalcSetup — Initialize calculation environment from a Build object
// Mirrors POB Modules/CalcSetup.lua

const ModDB = require('../core/mod-db');
const { ModType, ModFlag, ClassBases, DamageType } = require('../data/constants');

/**
 * Initialize the calculation environment from a decoded build.
 * Creates ModDB instances for player, enemy, and minion.
 */
function initEnv(build) {
  const env = {
    build,
    player: {
      modDB: new ModDB(),
      output: {},
      outputTable: {},
    },
    enemy: {
      modDB: new ModDB(),
      output: {},
    },
    minion: null,
  };

  // Base attributes from class
  const classBase = ClassBases[build.className] || ClassBases.Scion;
  const pdb = env.player.modDB;

  pdb.addMod({ name: 'Str', type: ModType.BASE, value: classBase.str, source: 'Base', flags: 0, keywordFlags: 0 });
  pdb.addMod({ name: 'Dex', type: ModType.BASE, value: classBase.dex, source: 'Base', flags: 0, keywordFlags: 0 });
  pdb.addMod({ name: 'Int', type: ModType.BASE, value: classBase.int, source: 'Base', flags: 0, keywordFlags: 0 });

  // Level-based attributes: +2 per level to all (simplified)
  const lvl = build.level || 1;
  pdb.addMod({ name: 'Str', type: ModType.BASE, value: (lvl - 1) * 0, source: 'Level', flags: 0, keywordFlags: 0 });
  pdb.addMod({ name: 'Dex', type: ModType.BASE, value: (lvl - 1) * 0, source: 'Level', flags: 0, keywordFlags: 0 });
  pdb.addMod({ name: 'Int', type: ModType.BASE, value: (lvl - 1) * 0, source: 'Level', flags: 0, keywordFlags: 0 });

  // Base life: 38 + 12 per level
  pdb.addMod({ name: 'Life', type: ModType.BASE, value: 38 + lvl * 12, source: 'Base', flags: 0, keywordFlags: 0 });
  // Str bonus: +1 life per 2 str
  // (Applied dynamically after resolving str)

  // Base mana: 34 + 6 per level
  pdb.addMod({ name: 'Mana', type: ModType.BASE, value: 34 + lvl * 6, source: 'Base', flags: 0, keywordFlags: 0 });

  // Base energy shield: 0 (comes from items/passives)
  pdb.addMod({ name: 'EnergyShield', type: ModType.BASE, value: 0, source: 'Base', flags: 0, keywordFlags: 0 });

  // Base evasion rating: 53 + 3 per level
  pdb.addMod({ name: 'Evasion', type: ModType.BASE, value: 53 + lvl * 3, source: 'Base', flags: 0, keywordFlags: 0 });

  // Base accuracy: floor(dex * 2) (resolved dynamically)
  pdb.addMod({ name: 'Accuracy', type: ModType.BASE, value: 0, source: 'Base', flags: 0, keywordFlags: 0 });

  // Resistance caps
  pdb.addMod({ name: 'FireResistCap', type: ModType.BASE, value: 75, source: 'Base', flags: 0, keywordFlags: 0 });
  pdb.addMod({ name: 'ColdResistCap', type: ModType.BASE, value: 75, source: 'Base', flags: 0, keywordFlags: 0 });
  pdb.addMod({ name: 'LightningResistCap', type: ModType.BASE, value: 75, source: 'Base', flags: 0, keywordFlags: 0 });
  pdb.addMod({ name: 'ChaosResistCap', type: ModType.BASE, value: 75, source: 'Base', flags: 0, keywordFlags: 0 });

  // Block cap
  pdb.addMod({ name: 'BlockChanceCap', type: ModType.BASE, value: 75, source: 'Base', flags: 0, keywordFlags: 0 });

  // Enemy defaults
  const edb = env.enemy.modDB;
  const enemyLevel = build.config.enemyLevel || 84;
  edb.addMod({ name: 'Level', type: ModType.BASE, value: enemyLevel, source: 'Config', flags: 0, keywordFlags: 0 });
  edb.addMod({ name: 'FireResist', type: ModType.BASE, value: 0, source: 'Base', flags: 0, keywordFlags: 0 });
  edb.addMod({ name: 'ColdResist', type: ModType.BASE, value: 0, source: 'Base', flags: 0, keywordFlags: 0 });
  edb.addMod({ name: 'LightningResist', type: ModType.BASE, value: 0, source: 'Base', flags: 0, keywordFlags: 0 });
  edb.addMod({ name: 'ChaosResist', type: ModType.BASE, value: 0, source: 'Base', flags: 0, keywordFlags: 0 });

  // Apply config conditions
  for (const [key, val] of Object.entries(build.config || {})) {
    if (typeof val === 'boolean') {
      pdb.setCondition(key, val);
    } else if (typeof val === 'number' && key.startsWith('multiplier')) {
      pdb.setMultiplier(key, val);
    }
  }

  // Import pre-calculated player stats from POB XML
  if (build.playerStats) {
    env.player.importedStats = build.playerStats;
  }

  return env;
}

module.exports = { initEnv };
