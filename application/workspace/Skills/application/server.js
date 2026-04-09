const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3220;

// MagicWorld paths
const MW_ROOT = String.raw`G:\GameExPro3\MagicWorld`;
const ABILITY_ROOT = path.join(MW_ROOT, 'Script', 'com', 'ability');
const SUBSYSTEM_ROOT = path.join(MW_ROOT, 'Script', 'com', 'subsystem');
const BP_ROOT = path.join(MW_ROOT, 'Script', 'com', 'bp');
const DA_ROOT = path.join(MW_ROOT, 'Script', 'com', 'da');
const CONTENT_DA_ROOT = path.join(MW_ROOT, 'Content', 'DA');
const EXPORTED_JSON = path.join(MW_ROOT, 'Saved', 'ExportedAssets.json');
const EXPORTED_DA_DIR = path.join(MW_ROOT, 'Saved', 'ExportedDA');

// ── AngelScript parser ──────────────────────────────────────────────────────

function parseASFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf-8');
  const classes = [];

  // Match class definitions
  const classRe = /class\s+(\w+)\s*:\s*(\w+)\s*\{/g;
  let cm;
  while ((cm = classRe.exec(src)) !== null) {
    const className = cm[1];
    const parentClass = cm[2];
    const startIdx = cm.index + cm[0].length;

    // Find matching closing brace (simple depth counter)
    let depth = 1;
    let i = startIdx;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    const body = src.substring(startIdx, i - 1);

    const properties = parseProperties(body);
    const methods = parseMethods(body);

    classes.push({
      name: className,
      parent: parentClass,
      file: path.relative(path.join(ABILITY_ROOT, '..', '..'), filePath).replace(/\\/g, '/'),
      properties,
      methods
    });
  }

  // Match struct definitions
  const structRe = /(?:USTRUCT\(\)\s*)?struct\s+(\w+)\s*\{/g;
  let sm;
  while ((sm = structRe.exec(src)) !== null) {
    const structName = sm[1];
    const startIdx = sm.index + sm[0].length;
    let depth = 1;
    let i = startIdx;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    const body = src.substring(startIdx, i - 1);
    const properties = parseProperties(body);

    classes.push({
      name: structName,
      parent: 'struct',
      file: path.relative(path.join(ABILITY_ROOT, '..', '..'), filePath).replace(/\\/g, '/'),
      properties,
      methods: [],
      isStruct: true
    });
  }

  // Match enum definitions
  const enumRe = /enum\s+(\w+)\s*\{([^}]*)\}/g;
  let em;
  while ((em = enumRe.exec(src)) !== null) {
    const enumName = em[1];
    const enumBody = em[2];
    const values = enumBody
      .split(',')
      .map(v => v.replace(/\/\/.*/, '').trim())
      .filter(Boolean);

    classes.push({
      name: enumName,
      parent: 'enum',
      file: path.relative(path.join(ABILITY_ROOT, '..', '..'), filePath).replace(/\\/g, '/'),
      properties: values.map((v, idx) => ({
        name: v,
        type: 'int',
        default: String(idx),
        category: '',
        meta: ''
      })),
      methods: [],
      isEnum: true
    });
  }

  return classes;
}

function parseProperties(body) {
  const props = [];
  // Match UPROPERTY lines followed by type + name (skip commented-out lines)
  const propRe = /UPROPERTY\(([^)]*)\)\s*[\r\n]+\s*(?!\/\/)([\w:<>,\s]+?)\s+(\w+)(?:\s*=\s*([^;]+))?;/g;
  let m;
  while ((m = propRe.exec(body)) !== null) {
    const meta = m[1].trim();
    const type = m[2].trim();
    const name = m[3].trim();
    const defaultVal = m[4] ? m[4].trim() : '';
    const catMatch = meta.match(/Category\s*=\s*"([^"]+)"/);
    props.push({
      name,
      type,
      default: defaultVal,
      category: catMatch ? catMatch[1] : '',
      meta
    });
  }
  return props;
}

function parseMethods(body) {
  const methods = [];
  // Match UFUNCTION + signature
  const funcRe = /(?:UFUNCTION\(([^)]*)\)\s*\n\s*)?([\w<>:&\s]+?)\s+(\w+)\s*\(([^)]*)\)(?:\s+override)?/g;
  let m;
  while ((m = funcRe.exec(body)) !== null) {
    const meta = m[1] ? m[1].trim() : '';
    const returnType = m[2].trim();
    const name = m[3].trim();
    const params = m[4].trim();

    // Skip property getters
    if (['void', 'bool', 'int', 'float', 'float32', 'int32', 'int64', 'FString',
      'UMagicAbility', 'USkillFilter', 'UBulletBehavior', 'ABullet'].includes(returnType) ||
      returnType.startsWith('T') || returnType.startsWith('U') || returnType.startsWith('A') || returnType.startsWith('F')) {
      methods.push({
        name,
        returnType,
        params,
        meta,
        isOverride: body.substring(m.index, m.index + m[0].length + 20).includes('override')
      });
    }
  }
  return methods;
}

// ── Scan and collect all skill nodes ────────────────────────────────────────

function scanASFilesRecursive(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      results.push(...scanASFilesRecursive(full));
    } else if (e.isFile() && e.name.endsWith('.as')) {
      results.push(full);
    }
  }
  return results;
}

function collectAllNodes() {
  const allNodes = [];
  const scanRoots = [ABILITY_ROOT, SUBSYSTEM_ROOT, BP_ROOT, DA_ROOT];

  for (const root of scanRoots) {
    const files = scanASFilesRecursive(root);
    for (const filePath of files) {
      const parsed = parseASFile(filePath);
      allNodes.push(...parsed);
    }
  }

  return allNodes;
}

// ── Build tree structure ────────────────────────────────────────────────────

function buildTree(nodes) {
  const nodeMap = {};
  for (const n of nodes) {
    nodeMap[n.name] = { ...n, children: [] };
  }

  const categories = {
    'Primary Skills': [],
    'Passive Skills': [],
    'Bullet Behaviors': [],
    'Data Structures': [],
    'Enums': [],
    'Subsystems': [],
    'Entities': [],
    'Other': []
  };

  for (const n of nodes) {
    if (n.isEnum) {
      categories['Enums'].push(n);
    } else if (n.isStruct) {
      categories['Data Structures'].push(n);
    } else if (n.name.includes('Bullet') && n.name.includes('Behavior')) {
      categories['Bullet Behaviors'].push(n);
    } else if (n.parent === 'UMagicPrimary' || n.parent === 'UMagicBall' ||
      n.name === 'UMagicPrimary' || n.name === 'UMagicBall') {
      categories['Primary Skills'].push(n);
    } else if (n.parent === 'UMagicPassive' || n.parent === 'UMagicStraitBall' ||
      n.name === 'UMagicPassive' || n.name === 'UMagicStraitBall' ||
      n.name === 'UMagicFollow' || n.name === 'UMagicAbility' || n.name === 'UAsAsset' ||
      n.name === 'UMagicDefault') {
      categories['Passive Skills'].push(n);
    } else if (n.name.includes('Manager') || n.name.includes('Subsystem') || n.name.includes('Filter')) {
      categories['Subsystems'].push(n);
    } else if (n.name.startsWith('A') && !n.isStruct && !n.isEnum) {
      categories['Entities'].push(n);
    } else {
      categories['Other'].push(n);
    }
  }

  return categories;
}

// ── Scan DA asset instances from Content directory ──────────────────────────

// Map known DA directories to their likely class types
const DA_DIR_CLASS_MAP = {
  'Ability': 'UMagicPassive',
  'Primary': 'UMagicPrimary',
  'Event': 'UMagicPassive'
};

// Map DA filename patterns to more specific class types
const DA_NAME_CLASS_MAP = [
  [/Bounce_Exp/i, 'UMagicBounceExplode'],
  [/Bounce(?!.*Scatter)/i, 'UMagicProjectileBounce'],
  [/BounceScatter/i, 'UMagicBounceScatter'],
  [/Split/i, 'UMagicProjectileSplit'],
  [/Ring/i, 'UMagicProjectileRing'],
  [/Track/i, 'UMagicPassiveTracking'],
  [/Accelerat/i, 'UMagicProjectileAccelerate'],
  [/ApearEnemyTop/i, 'UApearEnemyTop'],
  [/Default/i, 'UMagicDefault'],
  [/FireExp|Explosion/i, 'UPassiveExplosion'],
  [/FireBall|WaterBall|Thunder/i, 'UMagicBall'],
];

function inferClass(fileName, dirName) {
  const bare = fileName.replace(/\.uasset$/, '');
  for (const [re, cls] of DA_NAME_CLASS_MAP) {
    if (re.test(bare)) return cls;
  }
  return DA_DIR_CLASS_MAP[dirName] || 'UMagicAbility';
}

function scanDAInstances() {
  const instances = [];
  if (!fs.existsSync(CONTENT_DA_ROOT)) return instances;

  // Scan Ability/ and Primary/ subdirs
  const scanSubdirs = ['Ability', 'Primary'];
  for (const sub of scanSubdirs) {
    const dir = path.join(CONTENT_DA_ROOT, sub);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const f of files) {
      if (f.isFile() && f.name.endsWith('.uasset') && f.name.startsWith('DA_')) {
        const assetName = f.name.replace('.uasset', '');
        const className = inferClass(assetName, sub);
        instances.push({
          name: assetName,
          className,
          contentPath: `/Game/DA/${sub}/${assetName}`,
          diskPath: path.join(dir, f.name),
          category: sub === 'Primary' ? 'Primary' : 'Passive'
        });
      }
      // Scan subdirectories (e.g. Ability/Event/)
      if (f.isDirectory()) {
        const subDir = path.join(dir, f.name);
        const subFiles = fs.readdirSync(subDir).filter(n => n.endsWith('.uasset') && n.startsWith('DA_'));
        for (const sf of subFiles) {
          const assetName = sf.replace('.uasset', '');
          const className = inferClass(assetName, f.name);
          instances.push({
            name: assetName,
            className,
            contentPath: `/Game/DA/${sub}/${f.name}/${assetName}`,
            diskPath: path.join(subDir, sf),
            category: 'Passive'
          });
        }
      }
    }
  }

  return instances;
}

// Read ExportedAssets.json if available (generated by UE C++ UMagicTool)
function readExportedAssets() {
  if (!fs.existsSync(EXPORTED_JSON)) return null;
  try {
    // UE writes UTF-16 LE with BOM (FF FE)
    const buf = fs.readFileSync(EXPORTED_JSON);
    let text;
    if (buf[0] === 0xFF && buf[1] === 0xFE) {
      text = buf.toString('utf16le').replace(/^\uFEFF/, '');
    } else {
      text = buf.toString('utf-8');
    }
    return JSON.parse(text);
  } catch { return null; }
}

// Read per-asset JSON from Saved/ExportedDA/ (generated by export_da_json.py)
function readExportedDA() {
  if (!fs.existsSync(EXPORTED_DA_DIR)) return {};
  const map = {};
  try {
    for (const f of fs.readdirSync(EXPORTED_DA_DIR)) {
      if (!f.endsWith('.json') || f.startsWith('_')) continue;
      const name = f.replace('.json', '');
      try {
        map[name] = JSON.parse(fs.readFileSync(path.join(EXPORTED_DA_DIR, f), 'utf-8'));
      } catch {}
    }
  } catch {}
  return map;
}

// Merge instance info with class definitions and optional exported data
function buildInstanceData(instances, classNodes, exported) {
  const classMap = {};
  for (const n of classNodes) classMap[n.name] = n;

  // Build exported asset lookup by name (from UE C++ ExportAllAssetsToJson)
  const exportedMap = {};
  if (exported) {
    const assets = Array.isArray(exported) ? exported : (exported.Assets || []);
    for (const item of assets) {
      const key = item.AssetName || item.name || '';
      if (key) exportedMap[key] = item;
    }
  }

  // Also read per-asset DA exports from Saved/ExportedDA/
  const daExports = readExportedDA();

  return instances.map(inst => {
    const classDef = classMap[inst.className];
    // Collect all properties from class and its ancestors
    const allProps = [];
    let current = inst.className;
    const visited = new Set();
    while (current && !visited.has(current)) {
      visited.add(current);
      const node = classMap[current];
      if (!node) break;
      for (const p of node.properties) {
        allProps.push({ ...p, from: current });
      }
      current = node.parent;
    }

    // Overlay exported values if available
    const exp = exportedMap[inst.name] || null;
    const daExp = daExports[inst.name] || null;

    return {
      ...inst,
      classInfo: classDef ? {
        parent: classDef.parent,
        file: classDef.file
      } : null,
      properties: allProps,
      exportedData: exp,
      ueProperties: daExp ? daExp.properties : null
    };
  });
}

// ── Lua data tree scanner ───────────────────────────────────────────────────

const LUA_NODE_ROOT = path.join(MW_ROOT, 'Script', 'com', 'ability', 'node');

function parseLuaFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf-8');
  const result = { file: filePath, className: '', parentClass: '', skillName: '', assetPath: '', props: {} };

  // Extract class name: local XYZ = class("XYZ", Parent)
  const classMatch = src.match(/local\s+(\w+)\s*=\s*class\("(\w+)"(?:\s*,\s*(\w+))?\)/);
  if (classMatch) {
    result.className = classMatch[1];
    result.parentClass = classMatch[3] || '';
  }

  // Extract properties: ClassName.propName = value
  const propRe = /^(\w+)\.(\w+)\s*=\s*(.+)$/gm;
  let pm;
  while ((pm = propRe.exec(src)) !== null) {
    const key = pm[2];
    let val = pm[3].trim();
    // Try to simplify multi-line tables
    if (val === '{') {
      const blockEnd = src.indexOf('}', pm.index);
      if (blockEnd !== -1) val = src.substring(pm.index + pm[0].indexOf('=') + 2, blockEnd + 1).trim();
    }
    result.props[key] = val;
  }

  if (result.props.skillName) {
    result.skillName = result.props.skillName.replace(/^"|"$/g, '');
  }
  if (result.props.assetPath) {
    result.assetPath = result.props.assetPath.replace(/^"|"$/g, '');
  }

  return result;
}

function scanLuaTree(dir, relPath = '') {
  const items = [];
  if (!fs.existsSync(dir)) return items;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const e of entries) {
    if (e.name === 'class.lua') continue;
    const fullPath = path.join(dir, e.name);
    const rel = relPath ? relPath + '/' + e.name : e.name;

    if (e.isFile() && e.name.endsWith('.lua')) {
      const parsed = parseLuaFile(fullPath);
      items.push({
        type: 'file',
        name: e.name.replace('.lua', ''),
        relPath: rel,
        ...parsed,
        isSkillInstance: !!parsed.skillName && parsed.skillName !== ''
      });
    } else if (e.isDirectory()) {
      const children = scanLuaTree(fullPath, rel);
      items.push({
        type: 'folder',
        name: e.name,
        relPath: rel,
        children
      });
    }
  }

  return items;
}

let cachedLuaTree = null;

function refreshLuaTree() {
  cachedLuaTree = scanLuaTree(LUA_NODE_ROOT);
}

// ── API ─────────────────────────────────────────────────────────────────────

let cachedNodes = null;
let cachedTree = null;
let cachedInstances = null;

function refreshCache() {
  cachedNodes = collectAllNodes();
  cachedTree = buildTree(cachedNodes);
  const rawInstances = scanDAInstances();
  const exported = readExportedAssets();
  cachedInstances = buildInstanceData(rawInstances, cachedNodes, exported);
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/skills', (_req, res) => {
  if (!cachedNodes) refreshCache();
  // Build a name→node lookup for resolving inheritance
  const nodeMap = {};
  for (const n of cachedNodes) nodeMap[n.name] = n;

  // Enrich each node with allProperties (own + inherited)
  const enriched = cachedNodes.map(n => {
    if (n.isEnum) return n;
    const allProperties = [];
    const visited = new Set();
    let current = n.name;
    while (current && !visited.has(current)) {
      visited.add(current);
      const node = nodeMap[current];
      if (!node) break;
      for (const p of node.properties) {
        allProperties.push({ ...p, from: current === n.name ? '' : current });
      }
      current = node.parent;
    }
    return { ...n, allProperties };
  });

  res.json({ nodes: enriched, tree: cachedTree });
});

app.get('/api/refresh', (_req, res) => {
  refreshCache();
  refreshLuaTree();
  res.json({ ok: true, nodeCount: cachedNodes.length, instanceCount: cachedInstances.length });
});

app.get('/api/lua-tree', (_req, res) => {
  if (!cachedLuaTree) refreshLuaTree();
  res.json({ tree: cachedLuaTree });
});

// Export a single DA instance to JSON file
app.get('/api/export/:name', (req, res) => {
  if (!cachedNodes) refreshCache();
  const inst = cachedInstances.find(i => i.name === req.params.name);
  if (!inst) return res.status(404).json({ error: 'Instance not found' });

  const nodeMap = {};
  for (const n of cachedNodes) nodeMap[n.name] = n;

  // Build class hierarchy
  const chain = [];
  let cur = inst.className;
  const visited = new Set();
  while (cur && !visited.has(cur)) {
    visited.add(cur);
    chain.push(cur);
    const node = nodeMap[cur];
    if (!node) break;
    cur = node.parent;
  }

  const exportObj = {
    AssetName: inst.name,
    AssetClass: `/Script/Angelscript.${inst.className.replace(/^U/, '')}`,
    ContentPath: inst.contentPath,
    DiskPath: inst.diskPath,
    InferredClass: inst.className,
    ClassHierarchy: chain,
    Properties: (inst.properties || []).map(p => ({
      Name: p.name, Type: p.type, Default: p.default || '',
      DeclaredIn: p.from, Category: p.category || '', Meta: p.meta || ''
    })),
    ExportedData: inst.exportedData || null
  };

  // Also write to disk
  const exportDir = path.join(__dirname, 'exports');
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
  const filePath = path.join(exportDir, `${inst.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(exportObj, null, 2));

  res.json({ ...exportObj, exportedToFile: filePath });
});

app.listen(PORT, () => {
  refreshCache();
  console.log(`Skill Node Visualizer running at http://localhost:${PORT}`);
  console.log(`Parsed ${cachedNodes.length} class nodes, ${cachedInstances.length} DA instances`);
});
