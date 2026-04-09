// Damage breakdown with per-mod attribution and toggle support.
// Each mod from every item is tagged with a unique ID so the frontend
// can disable individual mods via checkboxes and re-request the chain.

const weaponBases = require('../data/weapon-bases.json');

// ── Entry point ────────────────────────────────────────────────
function analyzeDamageBreakdown(build, disabledModIds = []) {
  const mainIdx = (build.mainSocketGroup || 1) - 1;
  const mainGroup = build.socketGroups?.[mainIdx];
  if (!mainGroup) return { error: '无法找到主技能组' };

  const stats = build.playerStats || {};
  const disabledSet = new Set(disabledModIds);

  // 1. Collect every damage-relevant mod from all equipped items
  const allMods = collectAllMods(build);

  // 2. Collect support-gem "more/less" entries
  const gemMods = collectGemMods(mainGroup);
  allMods.push(...gemMods);

  // Mark enabled / disabled
  for (const mod of allMods) mod.enabled = !disabledSet.has(mod.id);
  const enabledMods = allMods.filter(m => m.enabled);

  // 3. Weapon + flat base with ALL mods (original reference)
  const slots = build.items?.slots || {};
  const items = build.items?.list || [];
  const itemById = {};
  for (const it of items) itemById[it.id != null ? String(it.id) : ''] = it;
  const weaponId = slots['Weapon 1'];
  const weaponItem = weaponId != null ? itemById[String(weaponId)] : null;

  const origWeapon = computeWeaponLocal(weaponItem, allMods); // ALL mods
  const origFlatBase = computeFlatBase(origWeapon, allMods);

  // 4. Weapon + flat base with ENABLED mods only (adjusted)
  const weapon = computeWeaponLocal(weaponItem, enabledMods);
  const flatBase = computeFlatBase(weapon, enabledMods);

  // 5. Build attributed chain (pass both original and adjusted)
  const chain = buildAttributedChain(stats, weapon, flatBase, origFlatBase, origWeapon, allMods, enabledMods, disabledSet, build);

  // 6. Estimate DPS with disabled mods
  const origTotalDPS = stats.TotalDPS || 0;
  const origCombinedDPS = stats.CombinedDPS || origTotalDPS;
  const dpsRatio = origTotalDPS > 0 && disabledSet.size > 0
    ? (chain._estimatedDPS ?? origTotalDPS) / origTotalDPS : 1;
  const origDPS = origCombinedDPS || origTotalDPS;
  let estimatedDPS = origDPS;
  if (disabledSet.size > 0) {
    estimatedDPS = Math.round(origDPS * dpsRatio);
  }

  return {
    mainSkill: {
      slot: mainGroup.slot,
      gems: mainGroup.gems.map(g => ({
        name: g.nameSpec || g.skillId,
        level: g.level,
        quality: g.quality,
        role: classifyGem(g),
      })),
    },
    allMods,
    weapon,
    flatBase,
    damageChain: chain,
    originalDPS: origDPS,
    estimatedDPS,
  };
}

// ── Collect mods from every equipped item ──────────────────────
function collectAllMods(build) {
  const mods = [];
  const slots = build.items?.slots || {};
  const items = build.items?.list || [];
  const itemById = {};
  for (const it of items) itemById[it.id != null ? String(it.id) : ''] = it;

  for (const [slotName, itemId] of Object.entries(slots)) {
    if (itemId == null) continue;
    const item = itemById[String(itemId)];
    if (!item?.text) continue;

    const isWeapon = slotName === 'Weapon 1';
    const lines = item.text.split('\n').map(l => l.trim());
    let itemName = slotName;
    if (lines[0]?.startsWith('Rarity:')) itemName = lines[1] || slotName;

    // Weapon quality as a separate toggleable mod
    if (isWeapon) {
      const qm = item.text.match(/Quality:\s*\+?(\d+)/i);
      if (qm) {
        mods.push({
          id: sid(slotName, 'quality'), source: slotName, itemName,
          text: `Quality: +${qm[1]}%`,
          category: 'weapon_quality', value: +qm[1],
          element: 'Physical', isLocal: true, chainStep: 'weapon_phys',
        });
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const parsed = parseDamageMod(lines[i], slotName, itemName, isWeapon, i);
      if (parsed) mods.push(parsed);
    }
  }
  return mods;
}

// Stable mod ID from slot + line index
function sid(slot, suffix) {
  return `${slot.replace(/\s+/g, '_')}__${suffix}`;
}

// ── Parse one line into a ModEntry or null ─────────────────────
function parseDamageMod(line, slotName, itemName, isWeapon, lineIdx) {
  const id = sid(slotName, lineIdx);
  const base = { id, source: slotName, itemName, text: line };
  let m;

  // Adds X to Y Type Damage [to Attacks/Spells]
  m = line.match(/Adds?\s+(\d+)\s+to\s+(\d+)\s+(Physical|Fire|Cold|Lightning|Chaos)\s+Damage(\s+to\s+(Attacks|Spells))?/i);
  if (m) {
    const toWhat = m[5]?.toLowerCase();
    if (isWeapon && !toWhat) {
      return { ...base, category: m[3] === 'Physical' ? 'weapon_local_added_phys' : 'weapon_local_added_ele',
        element: m[3], min: +m[1], max: +m[2], isLocal: true, chainStep: m[3] === 'Physical' ? 'weapon_phys' : 'weapon_ele' };
    }
    if (toWhat === 'attacks' || (!toWhat && !isWeapon)) {
      return { ...base, category: 'gear_added_to_attacks',
        element: m[3], min: +m[1], max: +m[2], isLocal: false, chainStep: 'flat_base' };
    }
    return null;
  }

  // % increased Physical Damage
  m = line.match(/(\d+)%\s+increased\s+Physical\s+Damage/i);
  if (m) {
    if (isWeapon) return { ...base, category: 'weapon_local_inc_phys', element: 'Physical', value: +m[1], isLocal: true, chainStep: 'weapon_phys' };
    return { ...base, category: 'gear_inc_damage', element: 'Physical', value: +m[1], isLocal: false, chainStep: 'global_increased' };
  }

  // % increased Attack Speed
  m = line.match(/(\d+)%\s+increased\s+Attack\s+Speed/i);
  if (m) return { ...base, category: isWeapon ? 'weapon_local_attack_speed' : 'gear_attack_speed',
    value: +m[1], isLocal: isWeapon, chainStep: isWeapon ? 'weapon_speed' : 'global_speed' };

  // Critical Strike Multiplier
  m = line.match(/\+?(\d+)%\s+to\s+(?:Global\s+)?Critical\s+(?:Strike\s+)?Multiplier/i);
  if (m) return { ...base, category: 'crit_multi', value: +m[1], isLocal: false, chainStep: 'crit' };

  // Critical Strike Chance
  m = line.match(/(\d+)%\s+increased\s+(?:Global\s+)?Critical\s+Strike\s+Chance/i);
  if (m) return { ...base, category: 'crit_chance', value: +m[1], isLocal: isWeapon, chainStep: 'crit' };

  // % increased [Element/Type] Damage (non-physical, or generic)
  m = line.match(/(\d+)%\s+increased\s+(Elemental|Spell|Fire|Cold|Lightning|Chaos|Projectile|Area)?\s*Damage/i);
  if (m && !/Physical/i.test(line)) {
    return { ...base, category: 'gear_inc_damage', element: m[2] || 'Generic', value: +m[1], isLocal: false, chainStep: 'global_increased' };
  }

  // % more / less Damage
  m = line.match(/(\d+)%\s+(more|less)\s+(.*?Damage)/i);
  if (m) return { ...base, category: m[2] === 'more' ? 'gear_more_damage' : 'gear_less_damage',
    value: +m[1], isLocal: false, chainStep: 'global_more' };

  return null;
}

// ── Collect support-gem more/less entries ───────────────────────
function collectGemMods(group) {
  const mods = [];
  for (let i = 0; i < group.gems.length; i++) {
    const gem = group.gems[i];
    const role = classifyGem(gem);
    if (role.type === 'more' || role.type === 'less' || role.type === 'conversion' || role.type === 'penetration' || role.type === 'crit') {
      mods.push({
        id: `gem__${i}`,
        source: '技能宝石', itemName: gem.nameSpec || gem.skillId,
        text: `${gem.nameSpec || gem.skillId}: ${role.value}`,
        category: role.type === 'less' ? 'gem_less' : (role.type === 'crit' ? 'gem_crit' : 'gem_more'),
        value: null, isLocal: false,
        chainStep: role.type === 'crit' ? 'crit' : 'global_more',
        gemRole: role,
      });
    }
  }
  return mods;
}

// ── Classify gem ───────────────────────────────────────────────
function classifyGem(gem) {
  const name = (gem.nameSpec || gem.skillId || '').toLowerCase();
  const MAP = {
    'controlled destruction': { type: 'more', value: '40-49% more Spell Damage', element: 'Spell' },
    'elemental damage with attacks': { type: 'more', value: '37-54% more Elemental Damage', element: 'Elemental' },
    'added fire damage': { type: 'more', value: '25-44% of Phys as Extra Fire', element: 'Fire' },
    'physical to lightning': { type: 'conversion', value: '50% Phys→Lightning, 20-29% more Lightning', element: 'Lightning' },
    'lightning penetration': { type: 'penetration', value: '25-37% Lightning Pen', element: 'Lightning' },
    'cold penetration': { type: 'penetration', value: '25-37% Cold Pen', element: 'Cold' },
    'fire penetration': { type: 'penetration', value: '25-37% Fire Pen', element: 'Fire' },
    'inspiration': { type: 'more', value: '30-39% more Elemental Damage', element: 'Elemental' },
    'increased critical damage': { type: 'crit', value: '+30-49% Crit Multi', element: null },
    'fork': { type: 'more', value: '21-26% more Damage to initial target', element: null },
    'chain': { type: 'mechanic', value: 'Chains +2-3 times, 11-20% more per chain', element: null },
    'greater multiple projectiles': { type: 'less', value: '26% less Damage', element: null },
    'lesser multiple projectiles': { type: 'less', value: '26-20% less Damage', element: null },
    'multistrike': { type: 'more', value: '20-30% more Attack Speed', element: null },
    'spell echo': { type: 'more', value: '10% more Damage per repeat', element: null },
    'concentrated effect': { type: 'more', value: '50-54% more Area Damage', element: null },
    'minion damage': { type: 'more', value: '25-49% more Minion Damage', element: null },
    'brutality': { type: 'more', value: '25-44% more Physical Damage', element: 'Physical' },
    'melee physical damage': { type: 'more', value: '30-49% more Melee Physical Damage', element: 'Physical' },
    'vicious projectiles': { type: 'more', value: '30-49% more Physical Projectile Damage', element: 'Physical' },
    'void manipulation': { type: 'more', value: '20-39% more Chaos Damage', element: 'Chaos' },
    'returning projectiles': { type: 'mechanic', value: 'Projectiles return, less on return', element: null },
    'sacred wisps': { type: 'more', value: 'Wisps deal damage', element: null },
  };
  for (const [key, info] of Object.entries(MAP)) {
    if (name.includes(key)) return info;
  }
  if (name.includes('kinetic blast')) return { type: 'active', value: 'Attack, Projectile, Wand', element: 'Physical' };
  if (name.includes('vaal') || name.includes('aura')) return { type: 'aura', value: '', element: null };
  return { type: 'support', value: '辅助宝石', element: null };
}

// ── Compute weapon local damage using only enabled mods ────────
function computeWeaponLocal(weaponItem, enabledMods) {
  if (!weaponItem) return emptyWeapon();

  const text = weaponItem.text || '';
  const lines = text.split('\n').map(l => l.trim());
  let name = '', baseType = '';
  if (lines[0]?.startsWith('Rarity:')) { name = lines[1] || ''; baseType = lines[2] || ''; }
  const baseData = weaponBases[baseType] || null;

  // Sum weapon-local enabled mods
  const wMods = enabledMods.filter(m => m.source === 'Weapon 1');
  let quality = 0, incPhysPct = 0, flatPhysMin = 0, flatPhysMax = 0;
  let attackSpeedInc = 0;
  const eleAdded = [];

  for (const mod of wMods) {
    switch (mod.category) {
      case 'weapon_quality': quality = mod.value; break;
      case 'weapon_local_inc_phys': incPhysPct += mod.value; break;
      case 'weapon_local_added_phys': flatPhysMin += mod.min; flatPhysMax += mod.max; break;
      case 'weapon_local_added_ele': eleAdded.push({ type: mod.element, min: mod.min, max: mod.max }); break;
      case 'weapon_local_attack_speed': attackSpeedInc += mod.value; break;
    }
  }

  let physMin = 0, physMax = 0;
  if (baseData) {
    physMin = Math.round((baseData.physMin + flatPhysMin) * (1 + incPhysPct / 100) * (1 + quality / 100));
    physMax = Math.round((baseData.physMax + flatPhysMax) * (1 + incPhysPct / 100) * (1 + quality / 100));
  }

  let atkRate = baseData?.atkRate || 1.0;
  if (attackSpeedInc > 0) atkRate = Math.round(atkRate * (1 + attackSpeedInc / 100) * 100) / 100;
  const critBase = baseData?.critBase || 5.0;
  const physAvg = (physMin + physMax) / 2;
  const eleAvg = eleAdded.reduce((s, e) => s + (e.min + e.max) / 2, 0);

  return {
    name: name ? `${name} (${baseType})` : '(未知武器)',
    baseType,
    baseData: baseData ? { physMin: baseData.physMin, physMax: baseData.physMax, critBase: baseData.critBase, atkRate: baseData.atkRate } : null,
    quality, incPhysPct, flatPhysMin, flatPhysMax,
    computedPhys: { min: physMin, max: physMax },
    addedElemental: eleAdded,
    attackRate: atkRate, attackSpeedInc, critBase,
    averagePhys: r1(physAvg), averageEle: r1(eleAvg), averageTotal: r1(physAvg + eleAvg),
  };
}

function emptyWeapon() {
  return { name: '(无武器)', baseType: '', baseData: null, quality: 0, incPhysPct: 0,
    flatPhysMin: 0, flatPhysMax: 0, computedPhys: { min: 0, max: 0 }, addedElemental: [],
    attackRate: 1, attackSpeedInc: 0, critBase: 5, averagePhys: 0, averageEle: 0, averageTotal: 0 };
}

// ── Compute total flat base from weapon + gear flat adds ───────
function computeFlatBase(weapon, enabledMods) {
  const byType = {};
  byType.Physical = {
    min: weapon.computedPhys.min, max: weapon.computedPhys.max,
    sources: [{ source: '武器局部', min: weapon.computedPhys.min, max: weapon.computedPhys.max }],
  };
  for (const ele of weapon.addedElemental) {
    if (!byType[ele.type]) byType[ele.type] = { min: 0, max: 0, sources: [] };
    byType[ele.type].min += ele.min; byType[ele.type].max += ele.max;
    byType[ele.type].sources.push({ source: '武器局部', min: ele.min, max: ele.max });
  }
  for (const mod of enabledMods.filter(m => m.category === 'gear_added_to_attacks')) {
    const t = mod.element;
    if (!byType[t]) byType[t] = { min: 0, max: 0, sources: [] };
    byType[t].min += mod.min; byType[t].max += mod.max;
    byType[t].sources.push({ source: mod.source, min: mod.min, max: mod.max });
  }
  let totalMin = 0, totalMax = 0;
  for (const d of Object.values(byType)) { d.avg = r1((d.min + d.max) / 2); totalMin += d.min; totalMax += d.max; }
  return { byType, totalMin, totalMax, totalAvg: r1((totalMin + totalMax) / 2) };
}

// ── Parse numeric percentage from a gem mod text like "30-49% more Phys" ──
function parseMoreLessPct(gemMod) {
  const txt = gemMod?.text || gemMod?.gemRole?.value || '';
  // Match patterns like "40-49%", "26%", "50%"
  const m = txt.match(/(\d+)(?:\s*-\s*(\d+))?\s*%/);
  if (!m) return 0;
  // Use the higher end of the range (gem level typically maxes)
  return parseFloat(m[2] || m[1]) || 0;
}

// ── Known gem more/less effects at high level (estimates) ────
const KNOWN_GEM_MORE = {
  'SupportTrinity':         { zh: 'Trinity/三位一体', morePct: 50, note: '满共鸣时' },
  'SupportInvertTheRules':  { zh: 'Invert the Rules/逆转规则', morePct: 30, note: 'lv4 估算' },
  'SupportMirageArcher':    { zh: 'Mirage Archer/幻影射手', lessPct: 0, note: '不直接影响本体伤害' },
  'SupportEmpower':         { zh: 'Empower/赋能', morePct: 0, note: '提升技能等级' },
  'SupportManaforgedArrows':{ zh: 'Manaforged Arrows/魔铸之矢', morePct: 0, note: '触发机制' },
  'SupportCastOnCriticalStrike': { zh: 'Cast on Crit/暴击施法', morePct: 0, note: '触发机制' },
};

// Auras that provide damage bonuses
const DAMAGE_AURAS = {
  'Hatred':   { zh: '憎恨', effect: '加 25% 物理为额外冰伤', tag: 'gained-as-extra' },
  'Wrath':    { zh: '雷霆', effect: '加额外闪电伤害', tag: 'added-flat' },
  'Anger':    { zh: '愤怒', effect: '加额外火焰伤害', tag: 'added-flat' },
  'Zealotry': { zh: '热诚', effect: '法术增伤+暴击', tag: 'inc+crit' },
  'Malevolence': { zh: '恶意', effect: '持续伤害 more', tag: 'dot-more' },
  'Pride':    { zh: '骄傲', effect: '敌人受到更多物理伤害', tag: 'enemy-more' },
  'Haste':    { zh: '迅捷', effect: '攻速/施速/移速', tag: 'speed' },
  'Precision':{ zh: '精准', effect: '命中+暴击率', tag: 'accuracy' },
};

// Skill gems with known damage effectiveness / built-in conversion
const SKILL_GEM_EFFECTS = {
  'LightningArrow':   { zh: '闪电箭矢', effectiveness: 130, conversion: '50% 物理→闪电' },
  'TornadoShot':      { zh: '龙卷射击', effectiveness: 110 },
  'IceShot':          { zh: '冰霜射击', effectiveness: 120, conversion: '60% 物理→冰' },
  'ElementalHit':     { zh: '元素打击', effectiveness: 150 },
  'BarrageSupport':   { zh: '弹幕', effectiveness: 40 },
  'GalvanicArrow':    { zh: '闪电打击', effectiveness: 115, conversion: '50% 物理→闪电' },
};

// ── Build attributed chain ─────────────────────────────────────
function buildAttributedChain(stats, weapon, flatBase, origFlatBase, origWeapon, allMods, enabledMods, disabledSet, build) {
  const avgDmg = stats.AverageDamage || stats.AverageHit || 0;
  const speed = stats.Speed || 1;
  const critChance = (stats.CritChance || 0) / 100;
  const critMult = stats.CritMultiplier || 1.5;
  const hitChance = (stats.HitChance || 100) / 100;
  const totalDPS = stats.TotalDPS || 0;
  const effectiveCritMult = 1 + critChance * (critMult - 1);
  const preCritAvg = effectiveCritMult > 0 ? avgDmg / effectiveCritMult : avgDmg;

  // Global multiplier from ORIGINAL flat base (all mods enabled)
  const origFlatAvg = origFlatBase?.totalAvg || 1;
  const globalMult = origFlatAvg > 0 ? preCritAvg / origFlatAvg : 0;

  // Adjusted flat base (disabled mods excluded)
  const newFlatAvg = flatBase?.totalAvg || 1;
  const estPreCrit = newFlatAvg * globalMult;
  const estAvgDmg = estPreCrit * effectiveCritMult;

  // ── Speed adjustment ──
  // Weapon local speed ratio
  const origWeaponSpeed = origWeapon?.attackRate || 1;
  const adjWeaponSpeed = weapon?.attackRate || 1;
  const weaponSpeedRatio = origWeaponSpeed > 0 ? adjWeaponSpeed / origWeaponSpeed : 1;

  // Global speed mods ratio
  const origGlobalSpeedInc = allMods
    .filter(m => m.category === 'gear_attack_speed')
    .reduce((s, m) => s + (m.value || 0), 0);
  const adjGlobalSpeedInc = enabledMods
    .filter(m => m.category === 'gear_attack_speed')
    .reduce((s, m) => s + (m.value || 0), 0);
  const globalSpeedRatio = origGlobalSpeedInc > 0
    ? (1 + adjGlobalSpeedInc / 100) / (1 + origGlobalSpeedInc / 100)
    : 1;

  const estSpeed = speed * weaponSpeedRatio * globalSpeedRatio;
  const estDPS = estAvgDmg * estSpeed;

  // Helper: list contributing mods for a chain step
  const modsFor = (step) => allMods.filter(m => m.chainStep === step);

  const steps = [];

  // Step 1: Weapon base type
  if (weapon.baseData) {
    steps.push({
      label: '武器基底', stepKey: 'weapon_base',
      value: weapon.baseType,
      detail: `物理 ${weapon.baseData.physMin}-${weapon.baseData.physMax} | 暴击 ${weapon.baseData.critBase}% | 攻速 ${weapon.baseData.atkRate}`,
      explanation: '基底类型固有面板（不含品质和词缀）',
      contributors: [],
    });
  }

  // Step 2: Weapon local physical
  steps.push({
    label: '武器局部物理', stepKey: 'weapon_phys',
    value: `${weapon.computedPhys.min}-${weapon.computedPhys.max}`,
    detail: `平均 ${weapon.averagePhys} | 品质 ${weapon.quality}%${weapon.incPhysPct ? ` | +${weapon.incPhysPct}% 增伤` : ''}${weapon.flatPhysMin ? ` | +${weapon.flatPhysMin}-${weapon.flatPhysMax} 附加` : ''}`,
    explanation: '= (基底 + 局部附加) × (1 + 局部增物理%/100) × (1 + 品质/100)',
    contributors: modsFor('weapon_phys'),
  });

  // Step 3: Weapon local elemental
  if (weapon.averageEle > 0) {
    steps.push({
      label: '武器局部元素', stepKey: 'weapon_ele',
      value: weapon.averageEle,
      detail: weapon.addedElemental.map(e => `${e.type} ${e.min}-${e.max}`).join(', '),
      explanation: '武器附加元素（局部）',
      contributors: modsFor('weapon_ele'),
    });
  }

  // Step 4: Weapon total
  steps.push({
    label: '武器面板总伤', stepKey: 'weapon_total',
    value: weapon.averageTotal,
    detail: `物理 ${weapon.averagePhys} + 元素 ${weapon.averageEle}`,
    explanation: '武器局部总伤害',
    contributors: [],
  });

  // Step 5: Gear flat adds
  const gearAddMods = modsFor('flat_base');
  if (gearAddMods.length) {
    const lines = [];
    for (const mod of gearAddMods) {
      lines.push(`${mod.element} +${mod.min}-${mod.max} [${mod.itemName}]`);
    }
    steps.push({
      label: '装备附加伤害', stepKey: 'flat_base',
      value: lines.join('; '),
      explanation: '装备 "Adds X to Y Damage to Attacks" 词缀',
      contributors: gearAddMods,
    });
  }

  // Step 6: Total flat base — with source breakdown and formula
  const typeBreak = Object.entries(flatBase.byType).map(([t, d]) => `${eleZh(t)}: ${d.min}-${d.max} (均${d.avg})`).join(' | ');
  // Build source breakdown showing where each damage type comes from
  const sourceLines = [];
  for (const [dtype, data] of Object.entries(flatBase.byType)) {
    for (const src of data.sources) {
      sourceLines.push(`${eleZh(dtype)} ${src.min}-${src.max} ← ${slotZh(src.source)}`);
    }
  }
  // Build formula expression
  const formulaParts = [];
  for (const [dtype, data] of Object.entries(flatBase.byType)) {
    if (data.sources.length === 1) {
      formulaParts.push(`${eleZh(dtype)}(${data.min}-${data.max})`);
    } else {
      const inner = data.sources.map(s => `${s.min}-${s.max}`).join(' + ');
      formulaParts.push(`${eleZh(dtype)}(${inner} = ${data.min}-${data.max})`);
    }
  }
  const flatFormulaStr = formulaParts.join(' + ') + ` = ${flatBase.totalMin}-${flatBase.totalMax}`;
  // Collect all contributor mods for the total flat base
  const flatContribs = [...modsFor('weapon_phys'), ...modsFor('weapon_ele'), ...modsFor('flat_base')];
  steps.push({
    label: '总基础伤害', stepKey: 'total_flat',
    value: `${flatBase.totalMin}-${flatBase.totalMax} (均${flatBase.totalAvg})`,
    detail: typeBreak + '\n' + sourceLines.join('\n'),
    explanation: `公式: ${flatFormulaStr}\n来源: 武器局部(物理+元素) + 装备附加(to Attacks)`,
    contributors: flatContribs,
  });

  // Step 7: Global increased% (from gear — tree portion is in POB stats)
  const incMods = modsFor('global_increased');
  const gearIncSum = incMods.filter(m => m.enabled).reduce((s, m) => s + (m.value || 0), 0);
  steps.push({
    label: '全局增伤 (装备)', stepKey: 'global_increased',
    value: gearIncSum > 0 ? `+${gearIncSum}%` : '(仅天赋/光环)',
    detail: incMods.length ? incMods.map(m => `${m.enabled ? '✓' : '✗'} ${m.itemName}: +${m.value}% ${m.element || ''}`).join(' | ') : null,
    explanation: '装备上的 "increased Damage" 词缀（天赋树增伤内含在POB全局倍率中）',
    contributors: incMods,
  });

  // Step 8: More/less multipliers (gems + gear)
  const moreMods = modsFor('global_more');
  if (moreMods.length) {
    steps.push({
      label: 'More/Less 倍率', stepKey: 'global_more',
      value: `${moreMods.filter(m => m.enabled).length} 个活跃`,
      detail: moreMods.map(m => `${m.enabled ? '✓' : '✗'} ${m.itemName}: ${m.text.includes(':') ? m.text.split(':')[1].trim() : m.text}`).join(' | '),
      explanation: '辅助宝石和装备的 more/less 乘数',
      contributors: moreMods,
    });
  }

  // Step 9: Global multiplier — decomposed into known components
  // POB formula: damage = base × (1+Σinc%) × Π(1+more%) × hitChance × conversionFactor
  // We decompose globalMult into: hitFactor × gearIncFactor × gemMoreFactor × gearMoreFactor × residual
  const hitFactor = hitChance; // already 0-1 from stats

  // Gear increased% (all gear_inc_damage mods)
  const allIncMods = allMods.filter(m => m.category === 'gear_inc_damage');
  const gearIncTotal = allIncMods.reduce((s, m) => s + (m.value || 0), 0);

  // Gem more/less factor (product of all gem more/less multipliers)
  const gemMoreMods = allMods.filter(m => m.category === 'gem_more' || m.category === 'gem_less');
  let gemMoreFactor = 1;
  for (const gm of gemMoreMods) {
    const pct = parseMoreLessPct(gm);
    if (gm.category === 'gem_more') gemMoreFactor *= (1 + pct / 100);
    else gemMoreFactor *= (1 - pct / 100);
  }

  // Gear more/less factor
  const gearMoreMods = allMods.filter(m => m.category === 'gear_more_damage' || m.category === 'gear_less_damage');
  let gearMoreFactor = 1;
  for (const gm of gearMoreMods) {
    if (gm.category === 'gear_more_damage') gearMoreFactor *= (1 + (gm.value || 0) / 100);
    else gearMoreFactor *= (1 - (gm.value || 0) / 100);
  }

  // Known portion = hitFactor × gemMoreFactor × gearMoreFactor
  // Note: gearInc is PART of the total inc pool (tree + gear + buff), so we separate it
  const knownMultFactor = hitFactor * gemMoreFactor * gearMoreFactor;
  // Residual includes: all increased% (tree+gear+buff) + conversion + gained-as-extra + other
  const residualFactor = knownMultFactor > 0 ? globalMult / knownMultFactor : 0;
  // residualFactor ≈ (1 + totalInc%) × conversionFactor
  // We can further estimate tree inc%: residual / (1 + gearInc/100) ≈ (1 + treeAndBuffInc%) × conversion
  const gearIncFactor = 1 + gearIncTotal / 100;
  const treeConvFactor = gearIncFactor > 0 ? residualFactor / gearIncFactor : 0;

  // Build decomposition detail (short summary)
  const decompLines = [];
  decompLines.push(`总倍率 = 暴击前均伤 ${Math.round(preCritAvg)} ÷ 基础均伤 ${origFlatAvg} = ×${globalMult.toFixed(2)}`);

  // Build formula
  const formulaStr = `×${globalMult.toFixed(2)} = 命中(${hitFactor.toFixed(2)}) × 已解析宝石(${gemMoreFactor.toFixed(2)}) × 装备more(${gearMoreFactor.toFixed(2)}) × 装备inc(${gearIncFactor.toFixed(2)}) × 剩余(${treeConvFactor.toFixed(2)})`;

  // Build structured decomposition for interactive tags
  const decomposition = [];

  // 1. Hit chance
  decomposition.push({
    label: '命中率',
    factor: hitFactor,
    factorStr: `×${hitFactor.toFixed(2)}`,
    detail: `${(hitFactor * 100).toFixed(0)}%`,
    items: [],
  });

  // 2. Gem more/less
  if (gemMoreMods.length) {
    const gemItems = gemMoreMods.map(gm => {
      const pct = parseMoreLessPct(gm);
      const sign = gm.category === 'gem_less' ? 'less' : 'more';
      const f = gm.category === 'gem_less' ? (1 - pct / 100) : (1 + pct / 100);
      return { name: gm.itemName, text: `${pct}% ${sign}`, factor: f, factorStr: `×${f.toFixed(3)}`, source: gm.source, modText: gm.text };
    });
    decomposition.push({
      label: '宝石 more/less',
      factor: gemMoreFactor,
      factorStr: `×${gemMoreFactor.toFixed(3)}`,
      detail: `${gemMoreMods.length} 个宝石逐个相乘`,
      items: gemItems,
    });
  }

  // 3. Gear more/less
  if (gearMoreMods.length) {
    const gearMItems = gearMoreMods.map(gm => {
      const f = gm.category === 'gear_more_damage' ? (1 + (gm.value || 0) / 100) : (1 - (gm.value || 0) / 100);
      const sign = gm.category === 'gear_less_damage' ? 'less' : 'more';
      return { name: gm.itemName, text: `${gm.value}% ${sign}`, factor: f, factorStr: `×${f.toFixed(3)}`, source: gm.source, modText: gm.text };
    });
    decomposition.push({
      label: '装备 more/less',
      factor: gearMoreFactor,
      factorStr: `×${gearMoreFactor.toFixed(3)}`,
      detail: `${gearMoreMods.length} 个装备 more/less`,
      items: gearMItems,
    });
  }

  // 4. Gear increased
  if (gearIncTotal > 0) {
    const incItems = allIncMods.map(im => ({
      name: im.itemName, text: `+${im.value}% 增伤`, factor: null, factorStr: `+${im.value}%`, source: im.source, modText: im.text,
    }));
    decomposition.push({
      label: '装备增伤',
      factor: gearIncFactor,
      factorStr: `×${gearIncFactor.toFixed(3)}`,
      detail: `总计 +${gearIncTotal}%`,
      items: incItems,
    });
  }

  // 5. Decompose the residual (treeConvFactor) further
  //    residual = uncapturedGemMore × frenzyMore × auraFactor × tree+ascendancy+other
  const mainIdx = (build.mainSocketGroup || 1) - 1;
  const mainGroup = build.socketGroups?.[mainIdx];
  const capturedGemIds = new Set(gemMoreMods.map(m => m.gemSkillId || m.skillId || ''));

  // 5a. Uncaptured support gem more/less from main link
  let uncapturedGemFactor = 1;
  const uncapturedGemItems = [];
  if (mainGroup) {
    for (const g of mainGroup.gems || []) {
      const sid = g.skillId || '';
      if (capturedGemIds.has(sid)) continue; // already counted
      const known = KNOWN_GEM_MORE[sid];
      if (known && known.morePct > 0) {
        const f = 1 + known.morePct / 100;
        uncapturedGemFactor *= f;
        uncapturedGemItems.push({ name: known.zh, text: `+${known.morePct}% more`, factor: f, factorStr: `×${f.toFixed(3)}`, note: known.note });
      } else if (known && known.lessPct > 0) {
        const f = 1 - known.lessPct / 100;
        uncapturedGemFactor *= f;
        uncapturedGemItems.push({ name: known.zh, text: `-${known.lessPct}% less`, factor: f, factorStr: `×${f.toFixed(3)}`, note: known.note });
      }
    }
  }
  if (uncapturedGemItems.length) {
    decomposition.push({
      label: '未解析辅助宝石',
      factor: uncapturedGemFactor,
      factorStr: `×${uncapturedGemFactor.toFixed(3)}`,
      detail: `${uncapturedGemItems.length} 个辅助宝石(估算)`,
      items: uncapturedGemItems,
    });
  }

  // 5b. Frenzy charge more damage (4% more per charge)
  const frenzyCount = stats.FrenzyCharges || 0;
  let frenzyFactor = 1;
  if (frenzyCount > 0) {
    frenzyFactor = Math.pow(1.04, frenzyCount);
    decomposition.push({
      label: '狂怒球',
      factor: frenzyFactor,
      factorStr: `×${frenzyFactor.toFixed(3)}`,
      detail: `${frenzyCount} 个狂怒球 × 4% more each`,
      items: [{ name: '狂怒球', text: `${frenzyCount} 球 × 4% more`, factor: frenzyFactor, factorStr: `×${frenzyFactor.toFixed(3)}` }],
    });
  }

  // 5c. Aura gems providing damage bonuses
  const auraItems = [];
  const allGroups = build.socketGroups || [];
  for (const grp of allGroups) {
    for (const g of grp.gems || []) {
      const name = g.nameSpec || g.skillId || '';
      const aura = DAMAGE_AURAS[name] || DAMAGE_AURAS[g.skillId];
      if (aura && (aura.tag === 'gained-as-extra' || aura.tag === 'added-flat' || aura.tag === 'enemy-more' || aura.tag === 'dot-more' || aura.tag === 'inc+crit')) {
        auraItems.push({ name: `${aura.zh}(${name})`, text: aura.effect, factor: null, factorStr: '(含在倍率中)' });
      }
    }
  }
  if (auraItems.length) {
    decomposition.push({
      label: '光环增益',
      factor: null,
      factorStr: '(含下方)',
      detail: `${auraItems.length} 个增伤光环`,
      items: auraItems,
    });
  }

  // 5d. Main skill gem info
  const mainSkillItems = [];
  if (mainGroup) {
    for (const g of mainGroup.gems || []) {
      const sid = g.skillId || '';
      const eff = SKILL_GEM_EFFECTS[sid];
      if (eff) {
        const parts = [`效率 ${eff.effectiveness}%`];
        if (eff.conversion) parts.push(eff.conversion);
        mainSkillItems.push({ name: eff.zh, text: parts.join(', '), factor: null, factorStr: `${eff.effectiveness}%` });
      }
    }
  }
  if (mainSkillItems.length) {
    decomposition.push({
      label: '主技能效率',
      factor: null,
      factorStr: '(含下方)',
      detail: '技能伤害效率和转化',
      items: mainSkillItems,
    });
  }

  // 5e. Ascendancy info
  const ascClass = build.ascendClassName || '';
  const ascItems = [];
  if (ascClass === 'Deadeye') {
    ascItems.push({ name: '远射(Far Shot)', text: '距离越远伤害越高, 最高 60% more', factor: null, factorStr: '≤×1.60' });
    ascItems.push({ name: '聚风(Gathering Winds)', text: '尾风 10% 行动速度', factor: null, factorStr: '×1.10' });
  } else if (ascClass === 'Berserker') {
    ascItems.push({ name: '狂怒(Aspect of Carnage)', text: '40% more damage', factor: null, factorStr: '×1.40' });
  } else if (ascClass === 'Assassin') {
    ascItems.push({ name: '暗影迷踪(Elusive)', text: '暴击率+闪避', factor: null, factorStr: '(crit)' });
  } else if (ascClass) {
    ascItems.push({ name: ascClass, text: '升华加成(详见天赋树)', factor: null, factorStr: '(含在倍率中)' });
  }

  // 5f. Remaining residual after extracting known sub-factors
  let remainingResidual = treeConvFactor;
  if (uncapturedGemFactor > 1) remainingResidual /= uncapturedGemFactor;
  if (frenzyFactor > 1) remainingResidual /= frenzyFactor;

  decomposition.push({
    label: '天赋+升华+转化+其他',
    factor: remainingResidual,
    factorStr: `×${remainingResidual.toFixed(2)}`,
    detail: ascClass ? `${ascClass} 升华 + 天赋树增伤 + 转化链 + 光环加成(反推)` : '天赋树增伤 + 转化链 + 光环加成(反推)',
    items: [...ascItems, ...mainSkillItems.length ? [] : [], { name: '天赋树+转化', text: '所有 inc%/more% 天赋节点 + 元素转化链增幅', factor: null, factorStr: '(反推合计)' }],
  });

  // All contributor mods
  const globalMultContribs = [...allIncMods, ...gemMoreMods, ...gearMoreMods];

  steps.push({
    label: '全局增幅倍率', stepKey: 'global_mult',
    value: `×${globalMult.toFixed(2)}`,
    detail: decompLines.join('\n'),
    explanation: `公式: ${formulaStr}\n来源: POB CalcOffence → damage = base × (1+Σinc%) × Π(1+more%) × hitChance × 转化`,
    contributors: globalMultContribs,
    decomposition,
  });

  // Step 10: Weapon attack speed
  const speedMods = modsFor('weapon_speed');
  steps.push({
    label: '武器攻速 (局部)', stepKey: 'weapon_speed',
    value: weapon.attackRate,
    detail: weapon.attackSpeedInc ? `基底 ${weapon.baseData?.atkRate || '?'} × (1+${weapon.attackSpeedInc}%)` : null,
    explanation: '武器面板攻速',
    contributors: speedMods,
  });

  // Step 11: Global attack speed mods from gear
  const globalSpeedMods = modsFor('global_speed');
  if (globalSpeedMods.length) {
    const gsSum = globalSpeedMods.filter(m => m.enabled).reduce((s, m) => s + (m.value || 0), 0);
    steps.push({
      label: '装备全局攻速', stepKey: 'global_speed',
      value: gsSum > 0 ? `+${gsSum}%` : '(无)',
      detail: globalSpeedMods.map(m => `${m.enabled ? '✓' : '✗'} ${m.itemName}: +${m.value}%`).join(' | '),
      contributors: globalSpeedMods,
    });
  }

  // Step 12: Crit
  const critMods = modsFor('crit');
  steps.push({
    label: '暴击', stepKey: 'crit',
    value: `${(critChance * 100).toFixed(1)}%`,
    detail: `倍率 ${critMult}x | 有效系数 ${effectiveCritMult.toFixed(4)}`,
    explanation: '有效暴击 = 1 + 暴击率 × (暴击倍率 - 1)',
    contributors: critMods,
  });

  const hasDisabled = disabledSet.size > 0;

  // Step 13: Average Damage
  const showAvgDmg = hasDisabled ? Math.round(estAvgDmg) : avgDmg;
  steps.push({
    label: '平均单次伤害 (含暴击)', stepKey: 'avg_hit',
    value: showAvgDmg,
    detail: hasDisabled
      ? `调整后暴击前 ${Math.round(estPreCrit)} × 有效暴击 ${effectiveCritMult.toFixed(3)} (原始 ${Math.round(avgDmg)})`
      : `暴击前 ${Math.round(preCritAvg)} × 有效暴击 ${effectiveCritMult.toFixed(3)}`,
    explanation: hasDisabled ? '基于启用词条重新计算' : 'POB 计算的平均单次伤害',
    contributors: [],
  });

  // Step 14: Final speed — with full breakdown
  const showSpeed = hasDisabled ? estSpeed : speed;
  const weaponPanel = hasDisabled ? weapon.attackRate : (origWeapon?.attackRate || weapon.attackRate);
  const gearGlobalInc = hasDisabled ? adjGlobalSpeedInc : origGlobalSpeedInc;
  const gearGlobalMult = 1 + gearGlobalInc / 100;
  const withGear = weaponPanel * gearGlobalMult;
  const otherMult = withGear > 0 ? showSpeed / withGear : 0;
  const baseRate = weapon.baseData?.atkRate || '?';
  const localInc = hasDisabled ? weapon.attackSpeedInc : (origWeapon?.attackSpeedInc || weapon.attackSpeedInc);

  let speedDetail = `基底 ${baseRate}`;
  if (localInc) speedDetail += ` × (1+${localInc}%) = ${weaponPanel.toFixed(2)}`;
  if (gearGlobalInc > 0) speedDetail += ` × (1+${gearGlobalInc}%) = ${withGear.toFixed(2)}`;
  speedDetail += ` × ${otherMult.toFixed(2)} (天赋/宝石/充能) = ${showSpeed.toFixed(2)}`;
  if (hasDisabled && Math.abs(estSpeed - speed) > 0.001) {
    speedDetail += ` (原始 ${speed.toFixed(2)})`;
  }
  steps.push({
    label: '最终攻速', stepKey: 'final_speed',
    value: Math.round(showSpeed * 100) / 100,
    detail: speedDetail,
    explanation: `= 武器基底 × (1+局部攻速%) × (1+装备全局攻速%) × 其他(天赋/宝石/充能等)`,
    contributors: [...speedMods, ...globalSpeedMods],
  });

  // Step 15: Hit chance
  steps.push({
    label: '命中率', stepKey: 'hit_chance',
    value: `${(hitChance * 100).toFixed(0)}%`,
    contributors: [],
  });

  // Step 16: Total DPS
  const showDPS = hasDisabled ? Math.round(estDPS) : totalDPS;
  steps.push({
    label: '总 DPS', stepKey: 'total_dps',
    value: showDPS,
    detail: hasDisabled
      ? `= ${Math.round(estAvgDmg)} × ${estSpeed.toFixed(2)} (原始 ${Math.round(totalDPS)})`
      : `= ${avgDmg.toFixed(1)} × ${speed.toFixed(2)} ≈ ${Math.round(avgDmg * speed)}`,
    explanation: hasDisabled ? '基于启用词条重新计算' : 'POB 最终计算结果',
    contributors: [],
  });

  // DPS scaling ratio for mirage/combined
  const dpsRatio = hasDisabled && totalDPS > 0 ? estDPS / totalDPS : 1;

  if (stats.MirageDPS) {
    const showMirage = hasDisabled ? Math.round(stats.MirageDPS * dpsRatio) : stats.MirageDPS;
    steps.push({
      label: '幻影/分身 DPS', stepKey: 'mirage', value: showMirage,
      detail: hasDisabled ? `原始 ${Math.round(stats.MirageDPS)} × 缩放 ${dpsRatio.toFixed(3)}` : null,
      contributors: [],
    });
  }
  if (stats.CombinedDPS && stats.CombinedDPS !== totalDPS) {
    const showCombined = hasDisabled ? Math.round(stats.CombinedDPS * dpsRatio) : stats.CombinedDPS;
    steps.push({
      label: '综合 DPS', stepKey: 'combined', value: showCombined,
      detail: hasDisabled ? `原始 ${Math.round(stats.CombinedDPS)} × 缩放 ${dpsRatio.toFixed(3)} (Hit + DoT + 分身)` : 'Hit + DoT + 分身',
      contributors: [],
    });
  }

  return {
    steps,
    formula: 'DPS = 平均伤害 × 攻速 × 命中率',
    formulaExpanded: 'DPS = (武器基础 + 装备附加) × (1+Σ增伤%) × Π(1+more%) × 暴击系数 × 攻速 × 命中率',
    _estimatedDPS: Math.round(estDPS),
    _estimatedSpeed: Math.round(estSpeed * 100) / 100,
  };
}

function r1(n) { return Math.round(n * 10) / 10; }

const _ELE_ZH = { Physical:'物理', Fire:'火焰', Cold:'冰霜', Lightning:'闪电', Chaos:'混沌', Elemental:'元素' };
function eleZh(e) { return _ELE_ZH[e] || e; }

const _SLOT_ZH = {
  'Weapon 1':'武器1','Weapon 2':'武器2','Helmet':'头盔','Body Armour':'胸甲',
  'Gloves':'手套','Boots':'鞋子','Amulet':'项链','Ring 1':'戒指1','Ring 2':'戒指2',
  'Belt':'腰带','Flask 1':'药剂1','Flask 2':'药剂2','Flask 3':'药剂3',
  'Flask 4':'药剂4','Flask 5':'药剂5','Weapon 1 Swap':'武器1(切换)','Weapon 2 Swap':'武器2(切换)',
};
function slotZh(s) {
  if (!s) return s;
  if (_SLOT_ZH[s]) return _SLOT_ZH[s];
  // Compound: "Gloves Abyssal Socket 1" → "手套 深渊插槽1"
  for (const [en, zh] of Object.entries(_SLOT_ZH)) {
    if (s.startsWith(en + ' ')) return zh + ' ' + s.slice(en.length + 1).replace(/Abyssal Socket (\d+)/, '深渊插槽$1');
  }
  return s.replace(/Abyssal Socket (\d+)/, '深渊插槽$1');
}

module.exports = { analyzeDamageBreakdown };
