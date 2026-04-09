// Analyze skill gems bound to each equipment piece in a POB build.
// Joins socketGroups (via .slot) with items.slots to produce a per-equipment gem map.

const EQUIPMENT_SLOTS = [
  'Weapon 1', 'Weapon 2', 'Weapon 1 Swap', 'Weapon 2 Swap',
  'Helmet', 'Body Armour', 'Gloves', 'Boots',
  'Amulet', 'Ring 1', 'Ring 2', 'Belt',
];

const SLOT_LABEL_CN = {
  'Weapon 1': '主手',
  'Weapon 2': '副手',
  'Weapon 1 Swap': '主手(切换)',
  'Weapon 2 Swap': '副手(切换)',
  'Helmet': '头盔',
  'Body Armour': '胸甲',
  'Gloves': '手套',
  'Boots': '鞋子',
  'Amulet': '项链',
  'Ring 1': '戒指1',
  'Ring 2': '戒指2',
  'Belt': '腰带',
};

/**
 * Analyze gem-equipment bindings for a decoded POB build.
 * @param {object} build - Decoded POB build object from build-codec
 * @returns {object} equipmentGems - mapping of slot → { item, skillGroups[] }
 */
function analyzeGemSetup(build) {
  const { items, socketGroups } = build;
  const slotMap = items?.slots || {};
  const itemList = items?.list || [];

  // Index items by id
  const itemById = {};
  for (const item of itemList) {
    itemById[item.id] = item;
  }

  // Group socket groups by slot
  const groupsBySlot = {};
  for (let i = 0; i < socketGroups.length; i++) {
    const sg = socketGroups[i];
    const slot = sg.slot || '';
    if (!slot) continue;
    if (!groupsBySlot[slot]) groupsBySlot[slot] = [];
    groupsBySlot[slot].push({ index: i + 1, ...sg });
  }

  // Unslotted groups (no slot assignment)
  const unslotted = socketGroups
    .map((sg, i) => ({ index: i + 1, ...sg }))
    .filter(sg => !sg.slot);

  // Build the result
  const equipment = [];
  const usedSlots = new Set();

  for (const slotName of EQUIPMENT_SLOTS) {
    const itemId = slotMap[slotName];
    const item = itemId ? itemById[itemId] : null;
    const groups = groupsBySlot[slotName] || [];
    usedSlots.add(slotName);

    // Parse item name from item text (first line is often the name)
    let itemName = '';
    if (item) {
      itemName = item.name || extractItemName(item.text);
    }

    const gemGroups = groups.map(g => ({
      groupIndex: g.index,
      enabled: g.enabled,
      label: g.label,
      isMainSkill: g.index === build.mainSocketGroup,
      includeInFullDPS: g.includeInFullDPS,
      gems: g.gems.map(gem => ({
        name: gem.nameSpec || gem.skillId,
        level: gem.level,
        quality: gem.quality,
        enabled: gem.enabled,
        qualityType: gem.qualityId,
      })),
    }));

    const totalGems = gemGroups.reduce((n, g) => n + g.gems.length, 0);

    equipment.push({
      slot: slotName,
      slotCN: SLOT_LABEL_CN[slotName] || slotName,
      hasItem: !!item,
      itemName,
      itemRarity: item ? extractItemRarity(item) : null,
      gemGroups,
      totalGems,
    });
  }

  // Also handle custom/extra slots not in EQUIPMENT_SLOTS
  for (const slotName of Object.keys(groupsBySlot)) {
    if (usedSlots.has(slotName)) continue;
    const itemId = slotMap[slotName];
    const item = itemId ? itemById[itemId] : null;
    const groups = groupsBySlot[slotName];

    equipment.push({
      slot: slotName,
      slotCN: SLOT_LABEL_CN[slotName] || slotName,
      hasItem: !!item,
      itemName: item ? (item.name || extractItemName(item.text)) : '',
      itemRarity: item ? extractItemRarity(item) : null,
      gemGroups: groups.map(g => ({
        groupIndex: g.index,
        enabled: g.enabled,
        label: g.label,
        isMainSkill: g.index === build.mainSocketGroup,
        includeInFullDPS: g.includeInFullDPS,
        gems: g.gems.map(gem => ({
          name: gem.nameSpec || gem.skillId,
          level: gem.level,
          quality: gem.quality,
          enabled: gem.enabled,
          qualityType: gem.qualityId,
        })),
      })),
      totalGems: groups.reduce((n, g) => n + g.gems.length, 0),
    });
  }

  // Summary
  const activeSlots = equipment.filter(e => e.totalGems > 0);
  const allGems = [];
  for (const eq of activeSlots) {
    for (const g of eq.gemGroups) {
      for (const gem of g.gems) {
        allGems.push({ ...gem, slot: eq.slot, slotCN: eq.slotCN });
      }
    }
  }

  return {
    character: {
      class: build.className,
      ascendancy: build.ascendClassName,
      level: build.level,
      mainSocketGroup: build.mainSocketGroup,
    },
    equipment: equipment.filter(e => e.totalGems > 0 || e.hasItem),
    unslotted: unslotted.length > 0 ? unslotted.map(g => ({
      groupIndex: g.index,
      enabled: g.enabled,
      label: g.label,
      gems: g.gems.map(gem => ({
        name: gem.nameSpec || gem.skillId,
        level: gem.level,
        quality: gem.quality,
        enabled: gem.enabled,
      })),
    })) : [],
    summary: {
      totalGems: allGems.length,
      totalUnslotted: unslotted.reduce((n, g) => n + g.gems.length, 0),
      activeSlots: activeSlots.length,
      mainSkillSlot: activeSlots.find(e =>
        e.gemGroups.some(g => g.isMainSkill)
      )?.slot || null,
      gemsBySlot: activeSlots.map(e => ({
        slot: e.slotCN,
        count: e.totalGems,
        gems: e.gemGroups.flatMap(g => g.gems.map(gem => gem.name)),
      })),
    },
  };
}

function extractItemName(text) {
  if (!text) return '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  // POB item text format:
  // Line 0: "Rarity: RARE" (or MAGIC/UNIQUE/NORMAL)
  // Line 1: Item name (e.g. "Dire Veil")
  // Line 2: Base type (e.g. "Blood Raiment")
  if (lines.length >= 2 && lines[0].startsWith('Rarity:')) {
    const name = lines[1] || '';
    const base = lines[2] || '';
    if (name && base && name !== base) return `${name} (${base})`;
    return name || base;
  }
  // Fallback: first non-mod line
  for (const line of lines.slice(0, 3)) {
    if (!/^[+%\d]/.test(line) && !line.startsWith('{') && line.length < 80) {
      return line;
    }
  }
  return lines[0] || '';
}

function extractItemRarity(item) {
  if (item.rarity && item.rarity !== 'NORMAL') return item.rarity;
  const text = item.text || '';
  const m = text.match(/^Rarity:\s*(\w+)/m);
  return m ? m[1] : item.rarity || 'NORMAL';
}

module.exports = { analyzeGemSetup };
