// CalcOffence — Offence/DPS calculation engine
// Mirrors POB Modules/CalcOffence.lua

const { ModFlag, KeywordFlag, DamageType } = require('../data/constants');

/**
 * Calculate all offence-related stats.
 */
function calcOffence(env) {
  const db = env.player.modDB;
  const imported = env.player.importedStats || {};

  // Attempt to use imported POB stats if available (full calculation
  // requires the complete game data layer — items, passive tree, gems)
  const result = {
    // Per-element damage
    physicalDPS: imported.TotalDPS ? null : 0,
    fireDPS: 0,
    coldDPS: 0,
    lightningDPS: 0,
    chaosDPS: 0,

    // Combined
    totalDPS: imported.TotalDPS || 0,
    averageHit: imported.AverageHit || imported.AverageDamage || 0,

    // Speed
    attackSpeed: imported.Speed || db.calcStat({ flags: ModFlag.Attack }, 'Speed') || 1,
    castSpeed: imported.Speed || db.calcStat({ flags: ModFlag.Spell }, 'Speed') || 1,

    // Crit
    critChance: imported.CritChance || db.calcStat(null, 'CritChance') || 0,
    critMultiplier: imported.CritMultiplier || db.calcStat(null, 'CritMultiplier') || 150,

    // Hit
    hitChance: imported.HitChance || 100,

    // DoT
    totalDot: imported.TotalDot || 0,
    bleedDPS: imported.BleedDPS || 0,
    poisonDPS: imported.PoisonDPS || 0,
    igniteDPS: imported.IgniteDPS || 0,

    // Combined DPS (hit + dot)
    combinedDPS: imported.CombinedDPS || imported.TotalDPS || 0,

    // Impale
    impaleDPS: imported.ImpaleDPS || 0,

    // Full DPS (all sources)
    fullDPS: imported.FullDPS || imported.TotalDPS || 0,

    // Source: whether from imported POB stats or locally calculated
    source: imported.TotalDPS ? 'imported' : 'calculated',
  };

  // If we have locally-computed base damage, do a simplified DPS calc
  const basePhys = db.sumBase({ flags: ModFlag.Attack | ModFlag.Hit }, 'PhysicalDamage', 'PhysicalMin', 'PhysicalMax');
  const baseFire = db.sumBase({ flags: ModFlag.Hit }, 'FireDamage', 'FireMin', 'FireMax');
  const baseCold = db.sumBase({ flags: ModFlag.Hit }, 'ColdDamage', 'ColdMin', 'ColdMax');
  const baseLightning = db.sumBase({ flags: ModFlag.Hit }, 'LightningDamage', 'LightningMin', 'LightningMax');
  const baseChaos = db.sumBase({ flags: ModFlag.Hit }, 'ChaosDamage', 'ChaosMin', 'ChaosMax');

  if (basePhys || baseFire || baseCold || baseLightning || baseChaos) {
    const incDmg = db.sumInc(null, 'Damage');
    const moreDmg = db.productMore(null, 'Damage');
    const speed = result.attackSpeed;
    const crit = result.critChance / 100;
    const critMult = result.critMultiplier / 100;
    const effectiveCritMult = 1 + crit * (critMult - 1);

    const calcElementDPS = (base, incNames, moreNames) => {
      const inc = db.sumInc(null, ...incNames) + incDmg;
      const more = db.productMore(null, ...moreNames) * moreDmg;
      return base * (1 + inc / 100) * more * speed * effectiveCritMult;
    };

    result.physicalDPS = calcElementDPS(basePhys, ['PhysicalDamage'], ['PhysicalDamage']);
    result.fireDPS = calcElementDPS(baseFire, ['FireDamage', 'ElementalDamage'], ['FireDamage', 'ElementalDamage']);
    result.coldDPS = calcElementDPS(baseCold, ['ColdDamage', 'ElementalDamage'], ['ColdDamage', 'ElementalDamage']);
    result.lightningDPS = calcElementDPS(baseLightning, ['LightningDamage', 'ElementalDamage'], ['LightningDamage', 'ElementalDamage']);
    result.chaosDPS = calcElementDPS(baseChaos, ['ChaosDamage'], ['ChaosDamage']);

    result.totalDPS = result.physicalDPS + result.fireDPS + result.coldDPS + result.lightningDPS + result.chaosDPS;
    result.combinedDPS = result.totalDPS + result.totalDot;
    result.fullDPS = result.combinedDPS + result.impaleDPS;
    result.source = 'calculated';
  }

  return result;
}

module.exports = { calcOffence };
