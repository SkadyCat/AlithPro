// CalcPerform — Main calculation orchestrator
// Mirrors POB Modules/CalcPerform.lua

const { initEnv } = require('./calc-setup');
const { calcDefence } = require('./calc-defence');
const { calcOffence } = require('./calc-offence');

/**
 * Perform full build calculation.
 * @param {object} build - Normalized build object from build-codec
 * @returns {object} Complete calculation results
 */
function performCalc(build) {
  // Phase 1: Initialize environment
  const env = initEnv(build);

  // Phase 2: Calculate defence stats
  const defence = calcDefence(env);

  // Phase 3: Calculate offence stats
  const offence = calcOffence(env);

  // Phase 4: Assemble output
  const output = {
    character: {
      class: build.className,
      ascendancy: build.ascendClassName,
      level: build.level,
      bandit: build.bandit,
    },
    attributes: {
      str: env.player.modDB.calcStat(null, 'Str'),
      dex: env.player.modDB.calcStat(null, 'Dex'),
      int: env.player.modDB.calcStat(null, 'Int'),
    },
    defence,
    offence,
    // Include imported POB stats for comparison
    importedStats: env.player.importedStats || {},
    config: build.config,
  };

  // Add attribute-derived bonuses
  output.attributes.strLifeBonus = Math.floor(output.attributes.str / 2);
  output.attributes.dexAccuracyBonus = output.attributes.dex * 2;
  output.attributes.intManaBonus = Math.floor(output.attributes.int / 2);

  return output;
}

module.exports = { performCalc };
