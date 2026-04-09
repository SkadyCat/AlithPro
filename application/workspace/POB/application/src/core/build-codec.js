// POB Build Code Encoder/Decoder
// Handles: Base64 + zlib + URL-safe substitution + XML parsing

const zlib = require('zlib');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (name) => ['Item', 'Gem', 'Slot', 'SocketGroup', 'Skill', 'SkillSet', 'Spec', 'NodeSpec', 'Jewel', 'Input', 'PlayerStat', 'ItemSet'].includes(name),
  parseAttributeValue: true,
  trimValues: true,
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  format: true,
  suppressEmptyNode: true,
});

/**
 * Decode a POB build code string into a Build object.
 * Pipeline: URL-safe de-sub → Base64 decode → zlib inflate → XML parse
 */
function decodeBuildCode(code) {
  code = code.trim();
  // Strip URL prefixes (pastebin, pobb.in, etc.)
  const urlMatch = code.match(/(?:pastebin\.com\/|pobb\.in\/|poe\.ninja\/.*?\/pob\/)([A-Za-z0-9_-]+)/);
  if (urlMatch) {
    throw new Error('URL imports require fetching from remote — use /api/build/import-url instead');
  }

  // URL-safe de-substitution
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');

  // Base64 decode
  const compressed = Buffer.from(b64, 'base64');

  // zlib inflate — try standard zlib first (0x78 header), fallback to raw deflate
  let xmlBuf;
  if (compressed[0] === 0x78) {
    xmlBuf = zlib.inflateSync(compressed);
  } else {
    xmlBuf = zlib.inflateRawSync(compressed);
  }
  const xmlStr = xmlBuf.toString('utf-8');

  // Parse XML
  const parsed = xmlParser.parse(xmlStr);
  return normalizeBuild(parsed);
}

/**
 * Encode a Build object into a shareable POB code string.
 * Pipeline: XML build → zlib deflate → Base64 encode → URL-safe sub
 */
function encodeBuildCode(build) {
  const xmlStr = xmlBuilder.build(denormalizeBuild(build));
  const compressed = zlib.deflateSync(Buffer.from(xmlStr, 'utf-8'));
  let b64 = compressed.toString('base64');
  // URL-safe substitution
  return b64.replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Parse raw POB XML string into a Build object.
 */
function parseXml(xmlStr) {
  const parsed = xmlParser.parse(xmlStr);
  return normalizeBuild(parsed);
}

/**
 * Normalize the raw XML parse result into a clean Build object.
 */
function normalizeBuild(raw) {
  const pob = raw.PathOfBuilding || raw;
  const buildNode = pob.Build || {};
  const itemsNode = pob.Items || {};
  const treeNode = pob.Tree || {};
  const configNode = pob.Config || {};
  const notesNode = pob.Notes || '';

  const build = {
    // Character info
    level: buildNode['@_level'] || 1,
    className: buildNode['@_className'] || 'Scion',
    ascendClassName: buildNode['@_ascendClassName'] || 'None',
    targetVersion: buildNode['@_targetVersion'] || '3_0',
    mainSocketGroup: buildNode['@_mainSocketGroup'] || 1,
    viewMode: buildNode['@_viewMode'] || 'CALCS',
    bandit: buildNode['@_bandit'] || 'None',
    pantheonMajorGod: buildNode['@_pantheonMajorGod'] || 'None',
    pantheonMinorGod: buildNode['@_pantheonMinorGod'] || 'None',

    // Player stats (pre-calculated by POB — may be inside Build node or top-level)
    playerStats: normalizePlayerStats(buildNode.PlayerStat || pob.PlayerStat),

    // Items
    items: normalizeItems(itemsNode),

    // Skills (POB uses <Skills><SkillSet><Skill> or legacy <SocketGroup>)
    socketGroups: normalizeSkills(pob.Skills || pob.SocketGroup || []),

    // Passive tree
    tree: normalizeTree(treeNode),

    // Config options
    config: normalizeConfig(configNode),

    // Notes
    notes: typeof notesNode === 'string' ? notesNode : (notesNode['#text'] || ''),
  };

  return build;
}

function normalizePlayerStats(stats) {
  if (!stats) return {};
  const arr = Array.isArray(stats) ? stats : [stats];
  const result = {};
  for (const s of arr) {
    if (s['@_stat']) {
      result[s['@_stat']] = parseFloat(s['@_value']) || 0;
    }
  }
  return result;
}

function normalizeItems(itemsNode) {
  const items = [];
  const rawItems = itemsNode.Item || [];
  const arr = Array.isArray(rawItems) ? rawItems : [rawItems];
  const metaPrefixes = ['Unique ID:', 'Quality:', 'Sockets:', 'LevelReq:', 'Implicits:', 'Item Level:',
    'Crafted:', 'Prefix:', 'Suffix:', 'Selected Variant:'];
  for (const item of arr) {
    const text = item['#text'] || '';
    // Parse rarity, name, and base type from item text (POB stores these in text, not XML attrs)
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let parsedRarity = 'NORMAL', parsedName = '', parsedBase = '';
    if (lines[0]?.startsWith('Rarity:')) {
      const rm = lines[0].match(/Rarity:\s*(\w+)/);
      if (rm) parsedRarity = rm[1].toUpperCase();
      parsedName = lines[1] || '';
      // RARE/UNIQUE have: name line then base type line; MAGIC/NORMAL may not
      const candidateBase = lines[2] || '';
      const isMeta = metaPrefixes.some(p => candidateBase.startsWith(p));
      if (!isMeta && candidateBase && (parsedRarity === 'RARE' || parsedRarity === 'UNIQUE')) {
        parsedBase = candidateBase;
      }
    }
    // Quality from text
    const qm = text.match(/Quality:\s*(\d+)/i);
    const parsedQuality = qm ? +qm[1] : 0;

    const displayName = item['@_name']
      || (parsedBase && parsedName !== parsedBase ? `${parsedName} (${parsedBase})` : parsedName || parsedBase);

    items.push({
      id: item['@_id'],
      slot: item['@_slot'] || null,
      name: displayName,
      rarity: item['@_rarity'] || parsedRarity,
      baseType: parsedBase,
      level: item['@_level'] || 1,
      quality: item['@_quality'] || parsedQuality,
      corrupted: item['@_corrupted'] === 'true' || item['@_corrupted'] === true || /\bCorrupted\b/.test(text),
      text,
    });
  }

  // Slot assignments — may be directly under <Items> or inside <ItemSet>
  const slots = {};
  function collectSlots(source) {
    const rawSlots = source.Slot || [];
    const slotArr = Array.isArray(rawSlots) ? rawSlots : [rawSlots];
    for (const s of slotArr) {
      if (s['@_name'] && s['@_itemId']) {
        slots[s['@_name']] = s['@_itemId'];
      }
    }
  }
  collectSlots(itemsNode);
  // Check active ItemSet
  const itemSets = itemsNode.ItemSet;
  if (itemSets) {
    const activeSetId = itemsNode['@_activeItemSet'] || 1;
    const setArr = Array.isArray(itemSets) ? itemSets : [itemSets];
    const activeSet = setArr.find(s => s['@_id'] == activeSetId) || setArr[0];
    if (activeSet) collectSlots(activeSet);
  }

  return { list: items, slots };
}

function normalizeSkills(skillsNode) {
  // Handle top-level <Skills> with nested <SkillSet><Skill>
  if (skillsNode && typeof skillsNode === 'object' && !Array.isArray(skillsNode)) {
    const skillSets = skillsNode.SkillSet || [];
    const setArr = Array.isArray(skillSets) ? skillSets : [skillSets];
    const activeSet = skillsNode['@_activeSkillSet'] || 1;
    const targetSet = setArr[activeSet - 1] || setArr[0];
    if (targetSet) {
      const skills = targetSet.Skill || [];
      return normalizeSocketGroups(skills);
    }
    // Fallback: skills directly under <Skills>
    const directSkills = skillsNode.Skill || [];
    if (directSkills.length || (directSkills && !Array.isArray(directSkills))) {
      return normalizeSocketGroups(directSkills);
    }
  }
  // Legacy: top-level <SocketGroup> array
  return normalizeSocketGroups(skillsNode);
}

function normalizeSocketGroups(groups) {
  const arr = Array.isArray(groups) ? groups : [groups];
  return arr.filter(g => g).map(g => ({
    enabled: g['@_enabled'] !== false && g['@_enabled'] !== 'false',
    label: g['@_label'] || '',
    slot: g['@_slot'] || '',
    mainActiveSkill: g['@_mainActiveSkill'] || 1,
    includeInFullDPS: g['@_includeInFullDPS'] === 'true' || g['@_includeInFullDPS'] === true,
    gems: normalizeGems(g.Gem || []),
  }));
}

function normalizeGems(gems) {
  const arr = Array.isArray(gems) ? gems : [gems];
  return arr.filter(g => g).map(g => ({
    skillId: g['@_skillId'] || g['@_grantedEffectId'] || '',
    nameSpec: g['@_nameSpec'] || '',
    level: g['@_level'] || 1,
    quality: g['@_quality'] || 0,
    enabled: g['@_enabled'] !== false && g['@_enabled'] !== 'false',
    qualityId: g['@_qualityId'] || 'Default',
  }));
}

function normalizeTree(treeNode) {
  const specs = [];
  const treeSpecs = treeNode.Spec || (treeNode['@_activeSpec'] ? [treeNode] : []);
  const specArr = Array.isArray(treeSpecs) ? treeSpecs : [treeSpecs];

  for (const spec of specArr) {
    const nodes = [];
    const nodeSpecs = spec.NodeSpec || [];
    const nArr = Array.isArray(nodeSpecs) ? nodeSpecs : [nodeSpecs];
    for (const n of nArr) {
      nodes.push({
        nodeId: n['@_nodeId'],
        ascendancy: n['@_ascendancy'] === 'True' || n['@_ascendancy'] === true,
      });
    }

    const jewels = [];
    const jewelSpecs = spec.Jewel || [];
    const jArr = Array.isArray(jewelSpecs) ? jewelSpecs : [jewelSpecs];
    for (const j of jArr) {
      jewels.push({
        nodeId: j['@_nodeId'],
        itemId: j['@_itemId'],
      });
    }

    specs.push({
      treeVersion: spec['@_treeVersion'] || '',
      ascendClassName: spec['@_ascendClassName'] || '',
      nodes: spec['@_nodes'] ? spec['@_nodes'].split(',').map(Number) : nodes.map(n => n.nodeId),
      jewels,
      URL: spec.URL || '',
    });
  }

  return {
    activeSpec: treeNode['@_activeSpec'] || 1,
    specs,
  };
}

function normalizeConfig(configNode) {
  const config = {};
  const inputs = configNode.Input || [];
  const arr = Array.isArray(inputs) ? inputs : [inputs];
  for (const input of arr) {
    if (input['@_name']) {
      let val = input['@_value'] ?? input['@_boolean'] ?? input['@_string'] ?? input['@_number'];
      if (val === 'true') val = true;
      if (val === 'false') val = false;
      config[input['@_name']] = val;
    }
  }
  return config;
}

function denormalizeBuild(build) {
  // Reverse normalization for XML export — simplified
  return {
    PathOfBuilding: {
      Build: {
        '@_level': build.level,
        '@_className': build.className,
        '@_ascendClassName': build.ascendClassName,
        '@_targetVersion': build.targetVersion,
        '@_mainSocketGroup': build.mainSocketGroup,
        '@_viewMode': build.viewMode,
        '@_bandit': build.bandit,
      },
      Notes: build.notes || '',
    }
  };
}

module.exports = { decodeBuildCode, encodeBuildCode, parseXml, normalizeBuild };
