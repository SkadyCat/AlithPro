const fs = require('fs');
const path = require('path');

// --- 1. Read server data (class hierarchy + own properties) ---
const http = require('http');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

// --- 2. Read ExportedAssets.json (DA instance data) ---
function readExportedAssets() {
  const buf = fs.readFileSync('G:\\GameExPro3\\MagicWorld\\Saved\\ExportedAssets.json');
  let text;
  if (buf[0] === 0xFF && buf[1] === 0xFE) {
    text = buf.toString('utf16le').replace(/^\uFEFF/, '');
  } else {
    text = buf.toString('utf8').replace(/^\uFEFF/, '');
  }
  return JSON.parse(text);
}

// --- 3. Class hierarchy definition ---
// Maps: className (without U prefix) -> { parent, ownProps[], daInstances[] }
const HIERARCHY = {
  'MagicAsset':     { parent: null },
  'AsAsset':        { parent: 'MagicAsset' },
  'MagicAbility':   { parent: 'AsAsset' },
  'MagicPrimary':   { parent: 'MagicAbility' },
  'MagicPassive':   { parent: 'MagicAbility' },
  'MagicBall':      { parent: 'MagicPrimary' },
  'MagicDefault':   { parent: 'MagicAbility' },
  'MagicStraitBall':            { parent: 'MagicPassive' },
  'MagicFollow':                { parent: 'MagicStraitBall' },
  'MagicProjectileAccelerate':  { parent: 'MagicPassive' },
  'MagicProjectileBounce':      { parent: 'MagicPassive' },
  'MagicBounceExplode':         { parent: 'MagicPassive' },
  'MagicBounceScatter':         { parent: 'MagicPassive' },
  'PassiveExplosion':           { parent: 'MagicPassive' },
  'ApearEnemyTop':              { parent: 'MagicPassive' },
  'MagicProjectileRing':        { parent: 'MagicPassive' },
  'MagicProjectileSplit':       { parent: 'MagicPassive' },
  'MagicPassiveTracking':       { parent: 'MagicPassive' },
  'AbilityConf':    { parent: 'AsAsset' },
  'SkillConf':      { parent: 'AsAsset' },
};

// DA instance name → class name mapping
const DA_CLASS_MAP = {
  'DA_Accelerate': 'MagicProjectileAccelerate',
  'DA_Bounce': 'MagicProjectileBounce',
  'DA_Bounce_Exp': 'MagicBounceExplode',
  'DA_BounceScatter': 'MagicBounceScatter',
  'BallStrait': 'MagicStraitBall',
  'BallFollow': 'MagicFollow',
  'DA_Passive_FireExp': 'PassiveExplosion',
  'DA_ApearEnemyTop': 'ApearEnemyTop',
  'DA_Ring': 'MagicProjectileRing',
  'DA_Split': 'MagicProjectileSplit',
  'DA_MagicPassiveTracking': 'MagicPassiveTracking',
  'DA_PrimaryAbility_WaterBall': 'MagicBall',
  'DA_PrimaryAbility_Thunder': 'MagicBall',
  'DA_PrimaryAbility_FireBall': 'MagicBall',
  'DA_Ability_Default': 'MagicDefault',
  'AbilityConf': 'AbilityConf',
  'PrimarySkillConf': 'SkillConf',
};

// DA instance → English filename mapping (functional names)
const DA_ENGLISH_NAME = {
  'DA_Accelerate': 'Accelerate',                     // 加速
  'DA_Bounce': 'Bounce',                             // 弹射
  'DA_Bounce_Exp': 'BounceBlast',                    // 弹射爆破
  'DA_BounceScatter': 'BounceScatter',               // 弹射散射
  'BallStrait': 'StraightShot',                      // 直射
  'BallFollow': 'CurveHoming',                       // 曲线追踪
  'DA_Passive_FireExp': 'FireExplosion',             // 火焰爆炸
  'DA_ApearEnemyTop': 'SkyDrop',                     // 天降
  'DA_Ring': 'RingSplit',                            // 环形分裂
  'DA_Split': 'Split',                               // 分裂
  'DA_MagicPassiveTracking': 'SpiralTracking',       // 螺旋追踪
  'DA_PrimaryAbility_WaterBall': 'DeepSeaFrostSoul', // 深海冻魄
  'DA_PrimaryAbility_Thunder': 'HeavenlyThunder',    // 天罚之雷
  'DA_PrimaryAbility_FireBall': 'AbyssalFireRite',   // 深渊焚祭
  'DA_Ability_Default': 'VoidTablet',                // 无效石板
};

// DA instance → Chinese skillName override (functional names)
const DA_SKILL_NAME = {
  'DA_Accelerate': '加速',
  'DA_Bounce': '弹射',
  'DA_Bounce_Exp': '弹射爆破',
  'DA_BounceScatter': '弹射散射',
  'BallStrait': '直射',
  'BallFollow': '曲线追踪',
  'DA_Passive_FireExp': '火焰爆炸',
  'DA_ApearEnemyTop': '天降',
  'DA_Ring': '环形分裂',
  'DA_Split': '分裂',
  'DA_MagicPassiveTracking': '螺旋追踪',
};

// Which classes have subclass folders
function getChildren(className) {
  return Object.entries(HIERARCHY)
    .filter(([_, v]) => v.parent === className)
    .map(([k]) => k);
}

function hasChildren(className) {
  return getChildren(className).length > 0;
}

// Build folder path for each class
function buildClassPath(className) {
  const parts = [];
  let cur = HIERARCHY[className]?.parent;
  while (cur) {
    parts.unshift(cur);
    cur = HIERARCHY[cur]?.parent;
  }
  // Only ancestors that have children become folders
  const folderParts = parts.filter(p => hasChildren(p));
  return folderParts;
}

// --- 4. Lua value serializer ---
function luaVal(v, indent) {
  indent = indent || 1;
  const pad = '    '.repeat(indent);
  const padInner = '    '.repeat(indent + 1);
  if (v === null || v === undefined) return 'nil';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') {
    if (v === '') return 'nil';
    const escaped = v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return '"' + escaped + '"';
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return '{}';
    const items = v.map(item => padInner + luaVal(item, indent + 1));
    return '{\n' + items.join(',\n') + '\n' + pad + '}';
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 0) return '{}';
    const entries = keys.map(k => {
      const safeKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/u.test(k) ? k : '["' + k + '"]';
      return padInner + safeKey + ' = ' + luaVal(v[k], indent + 1);
    });
    return '{\n' + entries.join(',\n') + '\n' + pad + '}';
  }
  return 'nil';
}

// --- 5. Generate Lua class file ---
function generateClassFile(className, serverNode, daInstances, exportedData) {
  const info = HIERARCHY[className];
  const parentName = info.parent;
  const folderAncestors = buildClassPath(className);

  // Calculate require path to parent
  let requireParent = '';
  if (parentName) {
    const parentFolder = buildClassPath(parentName);
    const myFolder = folderAncestors;
    // Parent file location
    let parentFilePath;
    if (hasChildren(parentName)) {
      parentFilePath = [...parentFolder, parentName, parentName].join('.');
    } else {
      parentFilePath = [...parentFolder, parentName].join('.');
    }
    requireParent = parentFilePath;
  }

  let lua = '';
  lua += '-- ' + className + '\n';
  if (parentName) {
    lua += '-- 继承自: ' + parentName + '\n';
  }
  lua += '\n';

  // Require class helper and parent (paths absolute from node/ root)
  lua += 'local class = require("class")\n';
  if (parentName) {
    lua += 'local ' + parentName + ' = require("' + requireParent + '")\n';
  }
  lua += '\n';

  // Class definition
  if (parentName) {
    lua += 'local ' + className + ' = class("' + className + '", ' + parentName + ')\n';
  } else {
    lua += 'local ' + className + ' = class("' + className + '")\n';
  }
  lua += '\n';

  // Own properties from AS parser (class-level defaults)
  if (serverNode && serverNode.properties && serverNode.properties.length > 0) {
    lua += '-- 类定义属性 (AngelScript UPROPERTY)\n';
    for (const prop of serverNode.properties) {
      const defVal = parseASDefault(prop.default, prop.type);
      lua += className + '.' + prop.name + ' = ' + defVal + '\n';
    }
    lua += '\n';
  }

  // Class-level files no longer contain DA instance data
  // Each DA instance gets its own file

  lua += 'return ' + className + '\n';
  return lua;
}

function buildRequirePath(depth, target) {
  // In Lua, require paths are absolute from package root, not relative
  // Just return the target path directly
  return target;
}

function parseASDefault(val, type) {
  if (!val || val === '') return 'nil';
  if (val === 'false') return 'false';
  if (val === 'true') return 'true';
  // float like 1.5f, 200.0f
  const fMatch = val.match(/^(\d+\.?\d*)f?$/);
  if (fMatch) return fMatch[1];
  // int
  if (/^\d+$/.test(val)) return val;
  // FVector(x,y,z)
  const vecMatch = val.match(/FVector\(([^)]+)\)/);
  if (vecMatch) {
    const parts = vecMatch[1].split(',').map(s => s.trim());
    return '{ x = ' + parts[0] + ', y = ' + parts[1] + ', z = ' + parts[2] + ' }';
  }
  // Enum like EAbilityType::none
  const enumMatch = val.match(/\w+::(\w+)/);
  if (enumMatch) return '"' + enumMatch[1] + '"';
  // String
  return '"' + val.replace(/"/g, '\\"') + '"';
}

// --- Main ---
async function main() {
  const serverData = await httpGet('http://127.0.0.1:3220/api/skills');
  const exported = readExportedAssets();

  // Build node lookup (strip U prefix)
  const nodeMap = {};
  for (const n of serverData.nodes) {
    const name = n.name.replace(/^U/, '');
    nodeMap[name] = n;
  }

  // Filter skill DA instances
  const skillDAs = exported.Assets.filter(a => DA_CLASS_MAP[a.AssetName]);

  const outRoot = 'G:\\GameExPro3\\MagicWorld\\Script\\com\\ability\\node';

  // Clean old files (keep directory)
  if (fs.existsSync(outRoot)) {
    fs.rmSync(outRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(outRoot, { recursive: true });

  // Generate class.lua helper
  const classHelper = `-- Lua 类继承辅助
local function class(name, super)
    local cls = {}
    cls.__name = name
    cls.__index = cls
    cls.__super = super
    if super then
        setmetatable(cls, { __index = super })
    end
    cls.new = function(self, o)
        o = o or {}
        setmetatable(o, self)
        return o
    end
    return cls
end

return class
`;
  fs.writeFileSync(path.join(outRoot, 'class.lua'), classHelper, 'utf8');

  let fileCount = 1; // class.lua

  // Generate each class file
  for (const [className, info] of Object.entries(HIERARCHY)) {
    const ancestors = buildClassPath(className);

    // Build directory: node/ + ancestor folders + (self folder if has children)
    let dirParts = [outRoot, ...ancestors];
    if (hasChildren(className)) {
      dirParts.push(className);
    }
    const dir = path.join(...dirParts);
    fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, className + '.lua');
    const serverNode = nodeMap[className];
    const lua = generateClassFile(className, serverNode, skillDAs, exported);
    fs.writeFileSync(filePath, lua, 'utf8');
    fileCount++;

    const relPath = path.relative(outRoot, filePath).replace(/\\/g, '/');
    console.log('  ' + relPath);
  }

  // Generate individual skill files (one per DA instance)
  console.log('\n--- Skill Instance Files ---');
  for (const da of skillDAs) {
    const engName = DA_ENGLISH_NAME[da.AssetName];
    if (!engName) continue; // skip configs without English name (AbilityConf, SkillConf)

    const parentClass = DA_CLASS_MAP[da.AssetName];
    if (!parentClass || !HIERARCHY[parentClass]) continue;

    // Build require path for parent class
    const parentAncestors = buildClassPath(parentClass);
    let parentRequire;
    if (hasChildren(parentClass)) {
      parentRequire = [...parentAncestors, parentClass, parentClass].join('.');
    } else {
      parentRequire = [...parentAncestors, parentClass].join('.');
    }

    // Skill file goes in same folder as parent class
    let dirParts = [outRoot, ...parentAncestors];
    if (hasChildren(parentClass)) {
      dirParts.push(parentClass);
    }
    const dir = path.join(...dirParts);

    let lua = '';
    const cnName = DA_SKILL_NAME[da.AssetName] || da.Properties?.skillName || da.AssetName;
    lua += '-- ' + engName + ' (' + cnName + ')\n';
    lua += '-- DA: ' + da.AssetName + '\n';
    lua += '-- 继承自: ' + parentClass + '\n';
    lua += '\n';
    lua += 'local class = require("class")\n';
    lua += 'local ' + parentClass + ' = require("' + parentRequire + '")\n';
    lua += '\n';
    lua += 'local ' + engName + ' = class("' + engName + '", ' + parentClass + ')\n';
    lua += '\n';
    lua += engName + '.assetPath = "' + (da.AssetPath || '') + '"\n';

    const props = da.Properties || {};
    const keys = Object.keys(props).sort();
    for (const k of keys) {
      const safeKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/u.test(k) ? k : '["' + k + '"]';
      let val = props[k];
      if (k === 'skillName' && DA_SKILL_NAME[da.AssetName]) val = DA_SKILL_NAME[da.AssetName];
      lua += engName + '.' + safeKey + ' = ' + luaVal(val, 0) + '\n';
    }

    lua += '\nreturn ' + engName + '\n';

    const filePath = path.join(dir, engName + '.lua');
    fs.writeFileSync(filePath, lua, 'utf8');
    fileCount++;

    const relPath = path.relative(outRoot, filePath).replace(/\\/g, '/');
    console.log('  ' + relPath);
  }

  console.log('\nTotal: ' + fileCount + ' files generated');
}

main().catch(err => { console.error(err); process.exit(1); });
