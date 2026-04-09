// CalcDefence — Defence calculation engine
// Mirrors POB Modules/CalcDefence.lua

/**
 * Calculate all defence-related stats.
 */
function calcDefence(env) {
  const db = env.player.modDB;
  const cfg = null; // No special flags for defence

  // Attributes
  const str = db.calcStat(cfg, 'Str');
  const dex = db.calcStat(cfg, 'Dex');
  const int = db.calcStat(cfg, 'Int');

  // Life: base + str bonus
  const baseLife = db.sumBase(cfg, 'Life') + Math.floor(str / 2);
  const incLife = db.sumInc(cfg, 'Life');
  const moreLife = db.productMore(cfg, 'Life');
  const totalLife = Math.round(baseLife * (1 + incLife / 100) * moreLife);

  // Mana: base + int bonus
  const baseMana = db.sumBase(cfg, 'Mana') + Math.floor(int / 2);
  const incMana = db.sumInc(cfg, 'Mana');
  const moreMana = db.productMore(cfg, 'Mana');
  const totalMana = Math.round(baseMana * (1 + incMana / 100) * moreMana);

  // Energy Shield
  const baseES = db.sumBase(cfg, 'EnergyShield');
  const incES = db.sumInc(cfg, 'EnergyShield');
  const moreES = db.productMore(cfg, 'EnergyShield');
  const totalES = Math.round(baseES * (1 + incES / 100) * moreES);

  // Armour
  const baseArmour = db.sumBase(cfg, 'Armour');
  const incArmour = db.sumInc(cfg, 'Armour');
  const moreArmour = db.productMore(cfg, 'Armour');
  const totalArmour = Math.round(baseArmour * (1 + incArmour / 100) * moreArmour);

  // Evasion: base + dex bonus
  const baseEvasion = db.sumBase(cfg, 'Evasion');
  const incEvasion = db.sumInc(cfg, 'Evasion');
  const moreEvasion = db.productMore(cfg, 'Evasion');
  const totalEvasion = Math.round(baseEvasion * (1 + incEvasion / 100) * moreEvasion);

  // Resistances (capped)
  const fireResistCap = db.calcStat(cfg, 'FireResistCap');
  const coldResistCap = db.calcStat(cfg, 'ColdResistCap');
  const lightningResistCap = db.calcStat(cfg, 'LightningResistCap');
  const chaosResistCap = db.calcStat(cfg, 'ChaosResistCap');

  const fireResistUncapped = db.calcStat(cfg, 'FireResist');
  const coldResistUncapped = db.calcStat(cfg, 'ColdResist');
  const lightningResistUncapped = db.calcStat(cfg, 'LightningResist');
  const chaosResistUncapped = db.calcStat(cfg, 'ChaosResist');

  // Block
  const blockChance = Math.min(
    db.calcStat(cfg, 'BlockChance'),
    db.calcStat(cfg, 'BlockChanceCap')
  );
  const spellBlockChance = Math.min(
    db.calcStat(cfg, 'SpellBlockChance'),
    db.calcStat(cfg, 'BlockChanceCap')
  );

  // Spell suppression
  const spellSuppressChance = Math.min(db.calcStat(cfg, 'SpellSuppressionChance'), 100);

  // Dodge
  const attackDodgeChance = Math.min(db.calcStat(cfg, 'AttackDodgeChance'), 75);
  const spellDodgeChance = Math.min(db.calcStat(cfg, 'SpellDodgeChance'), 75);

  return {
    life: { base: baseLife, increased: incLife, more: moreLife, total: totalLife },
    mana: { base: baseMana, increased: incMana, more: moreMana, total: totalMana },
    energyShield: { base: baseES, increased: incES, more: moreES, total: totalES },
    armour: { base: baseArmour, increased: incArmour, more: moreArmour, total: totalArmour },
    evasion: { base: baseEvasion, increased: incEvasion, more: moreEvasion, total: totalEvasion },
    resistances: {
      fire: { uncapped: fireResistUncapped, capped: Math.min(fireResistUncapped, fireResistCap), cap: fireResistCap },
      cold: { uncapped: coldResistUncapped, capped: Math.min(coldResistUncapped, coldResistCap), cap: coldResistCap },
      lightning: { uncapped: lightningResistUncapped, capped: Math.min(lightningResistUncapped, lightningResistCap), cap: lightningResistCap },
      chaos: { uncapped: chaosResistUncapped, capped: Math.min(chaosResistUncapped, chaosResistCap), cap: chaosResistCap },
    },
    block: { attack: blockChance, spell: spellBlockChance },
    suppression: spellSuppressChance,
    dodge: { attack: attackDodgeChance, spell: spellDodgeChance },
  };
}

module.exports = { calcDefence };
