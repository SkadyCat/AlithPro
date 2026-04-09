const fs = require('fs');

// Read UTF-16 LE with BOM
const buf = fs.readFileSync('G:\\GameExPro3\\MagicWorld\\Saved\\ExportedAssets.json');
let text;
if (buf[0] === 0xFF && buf[1] === 0xFE) {
  text = buf.toString('utf16le').replace(/^\uFEFF/, '');
} else {
  text = buf.toString('utf8').replace(/^\uFEFF/, '');
}
const data = JSON.parse(text);

// Skill-related classes
const skillClasses = new Set([
  'MagicProjectileAccelerate', 'MagicProjectileBounce', 'MagicBounceExplode', 'MagicBounceScatter',
  'MagicStraitBall', 'MagicFollow', 'PassiveExplosion', 'ApearEnemyTop',
  'MagicProjectileRing', 'MagicProjectileSplit', 'MagicPassiveTracking',
  'MagicBall', 'MagicDefault', 'AbilityConf', 'SkillConf'
]);

const skillAssets = data.Assets.filter(a => skillClasses.has(a.AssetClass));

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

// Split into Primary vs Passive
const primaryAssets = [];
const passiveAssets = [];

for (const asset of skillAssets) {
  const props = asset.Properties || {};
  const rt = props.releaseType;
  const rtArr = Array.isArray(rt) ? rt : (typeof rt === 'string' ? rt.split(/\s+/) : []);
  if (rtArr.includes('primary')) {
    primaryAssets.push(asset);
  } else {
    passiveAssets.push(asset);
  }
}

function buildLua(assets, varName, label) {
  const ts = new Date().toISOString();
  let lua = '-- ' + label + ' (从 ExportedAssets.json 自动生成)\n';
  lua += '-- 生成时间: ' + ts + '\n';
  lua += '-- 总计: ' + assets.length + ' 个\n';
  lua += '\n';
  lua += 'local ' + varName + ' = {\n';

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    lua += '    --- ' + asset.AssetName + ' [' + asset.AssetClass + ']\n';
    lua += '    {\n';
    lua += '        assetClass = "' + asset.AssetClass + '",\n';
    lua += '        assetPath = "' + (asset.AssetPath || '').replace(/\\/g, '\\\\') + '",\n';

    const props = asset.Properties || {};
    const keys = Object.keys(props).sort();
    for (const k of keys) {
      const safeKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/u.test(k) ? k : '["' + k + '"]';
      lua += '        ' + safeKey + ' = ' + luaVal(props[k], 2) + ',\n';
    }
    lua += '    },\n';
  }

  lua += '}\n\n';
  lua += 'return ' + varName + '\n';
  return lua;
}

const outDir = 'G:\\GameExPro3\\MagicWorld\\Script\\com\\ability\\node\\';

const primaryLua = buildLua(primaryAssets, 'PrimaryNodeData', '主动技能节点数据');
fs.writeFileSync(outDir + 'PrimaryNodeData.lua', primaryLua, 'utf8');
console.log('Primary: ' + primaryAssets.length + ' assets → PrimaryNodeData.lua (' + fs.statSync(outDir + 'PrimaryNodeData.lua').size + ' bytes)');

const passiveLua = buildLua(passiveAssets, 'PassiveNodeData', '被动技能节点数据');
fs.writeFileSync(outDir + 'PassiveNodeData.lua', passiveLua, 'utf8');
console.log('Passive: ' + passiveAssets.length + ' assets → PassiveNodeData.lua (' + fs.statSync(outDir + 'PassiveNodeData.lua').size + ' bytes)');

// Remove old combined file if it exists
const oldPath = outDir + 'SkillNodeData.lua';
if (fs.existsSync(oldPath)) {
  fs.unlinkSync(oldPath);
  console.log('Removed old SkillNodeData.lua');
}
