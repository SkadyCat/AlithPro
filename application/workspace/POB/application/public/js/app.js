// POB Node — Frontend Application
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let currentBuild = null;
let currentCalc = null;
let currentGemSetup = null;
let currentDamageBreakdown = null;
let currentFilename = null; // active session filename
let buildListCache = [];   // sidebar build list
let disabledMods = new Set(); // toggled-off mod IDs
let currentBuildCode = '';  // last decoded build code

// ── Slot name Chinese mapping ──
const _SLOT_ZH = {
  'Weapon 1':'武器 1','Weapon 2':'武器 2','Helmet':'头盔','Body Armour':'胸甲',
  'Gloves':'手套','Boots':'鞋子','Amulet':'项链','Ring 1':'戒指 1','Ring 2':'戒指 2',
  'Belt':'腰带','Flask 1':'药剂 1','Flask 2':'药剂 2','Flask 3':'药剂 3',
  'Flask 4':'药剂 4','Flask 5':'药剂 5','Weapon 1 Swap':'武器 1 (切换)',
  'Weapon 2 Swap':'武器 2 (切换)',
};
function _slotZh(s) { return _SLOT_ZH[s] || s; }

// Tab switching
$$('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.remove('active'));
    $$('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    $(`#tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// Buttons
$('#btnDecode').addEventListener('click', () => doDecode(false));
$('#btnCalc').addEventListener('click', () => doDecode(true));
$('#btnNewBuild').addEventListener('click', showImportNew);
$('#btnClear').addEventListener('click', clearBuild);
$('#buildSearch').addEventListener('input', filterBuildList);

// Init — load build list
refreshBuildList();

function clearBuild() {
  $('#buildCode').value = '';
  $('#resultSection').classList.add('hidden');
  $('#importSection').classList.remove('hidden');
  hideError();
  currentBuild = null;
  currentCalc = null;
  currentGemSetup = null;
  currentDamageBreakdown = null;
  currentFilename = null;
  currentBuildCode = '';
  disabledMods = new Set();
  updateHeader(null);
  highlightActiveBuild();
}

function showImportNew() {
  currentFilename = null;
  $('#buildCode').value = '';
  $('#resultSection').classList.add('hidden');
  $('#importSection').classList.remove('hidden');
  hideError();
  currentBuild = null;
  updateHeader(null);
  highlightActiveBuild();
  $('#buildCode').focus();
}

async function doDecode(withCalc) {
  const code = $('#buildCode').value.trim();
  if (!code) return showError('请输入 POB Build Code');
  hideError();
  disabledMods = new Set();
  currentBuildCode = code;

  try {
    const endpoint = withCalc ? '/api/build/calculate' : '/api/build/decode';
    const [mainResp, gemResp, dmgResp] = await Promise.all([
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      }),
      fetch('/api/build/gem-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      }),
      fetch('/api/build/damage-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      }),
    ]);
    const data = await mainResp.json();
    const gemData = await gemResp.json();
    const dmgData = await dmgResp.json();
    if (!data.success) throw new Error(data.error || '未知错误');

    currentBuild = data.build;
    currentCalc = data.calculation || null;
    currentGemSetup = gemData.success ? gemData.gemSetup : null;
    currentDamageBreakdown = dmgData.success ? dmgData.breakdown : null;
    renderResult();

    // Auto-save to sidebar
    await autoSave(code);
  } catch (err) {
    showError(err.message);
  }
}

async function autoSave(code) {
  try {
    const session = {
      code,
      build: currentBuild,
      calculation: currentCalc,
      gemSetup: currentGemSetup,
      damageBreakdown: currentDamageBreakdown,
      savedAt: new Date().toISOString(),
    };
    const resp = await fetch('/api/session/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    const data = await resp.json();
    if (data.success) {
      currentFilename = data.filename;
      await refreshBuildList();
    }
  } catch { /* silent */ }
}

function renderResult() {
  $('#resultSection').classList.remove('hidden');
  renderSummary();
  renderGemSetup();
  renderDamageBreakdown();
  renderDefence();
  renderOffence();
  renderItems();
  renderTree();
  renderRaw();
}

function renderSummary() {
  const b = currentBuild;
  const c = currentCalc;
  const grid = $('#summaryGrid');
  const cards = [];

  cards.push(statCard('角色', `${b.ascendClassName || b.className}`, `${b.className} Lv.${b.level}`));
  cards.push(statCard('赏金猎人', b.bandit || 'None'));

  if (c) {
    cards.push(statCard('力量', c.attributes.str, `+${c.attributes.strLifeBonus} 生命`));
    cards.push(statCard('敏捷', c.attributes.dex, `+${c.attributes.dexAccuracyBonus} 命中`));
    cards.push(statCard('智慧', c.attributes.int, `+${c.attributes.intManaBonus} 魔力`));
    cards.push(statCard('生命', c.defence?.life?.total || 0, '', 'life'));
    cards.push(statCard('魔力', c.defence?.mana?.total || 0, '', 'mana'));
    if (c.defence?.energyShield?.total) cards.push(statCard('能量护盾', c.defence.energyShield.total, '', 'es'));
    if (c.offence?.totalDPS) cards.push(statCard('总 DPS', fmt(c.offence.totalDPS), c.offence.source, 'dps'));
  }

  // Gems summary
  const gemCount = b.socketGroups?.reduce((n, g) => n + (g.gems?.length || 0), 0) || 0;
  cards.push(statCard('技能宝石', gemCount));
  cards.push(statCard('装备', b.items?.list?.length || 0));
  cards.push(statCard('天赋点', b.tree?.specs?.[0]?.nodes?.length || 0));

  grid.innerHTML = cards.join('');
}

function renderDefence() {
  const grid = $('#defenceGrid');
  if (!currentCalc?.defence) { grid.innerHTML = '<p>需要计算</p>'; return; }
  const d = currentCalc.defence;
  const cards = [];

  cards.push(statCard('生命', d.life.total, `基础 ${d.life.base} | +${d.life.increased}% | ×${d.life.more.toFixed(2)}`, 'life'));
  cards.push(statCard('魔力', d.mana.total, `基础 ${d.mana.base}`, 'mana'));
  cards.push(statCard('能量护盾', d.energyShield.total, `基础 ${d.energyShield.base}`, 'es'));
  cards.push(statCard('护甲', d.armour.total, `基础 ${d.armour.base}`));
  cards.push(statCard('闪避', d.evasion.total, `基础 ${d.evasion.base}`));

  const r = d.resistances;
  cards.push(statCard('火焰抗性', `${r.fire.capped}%`, `未上限 ${r.fire.uncapped}%`, 'fire'));
  cards.push(statCard('冰霜抗性', `${r.cold.capped}%`, `未上限 ${r.cold.uncapped}%`, 'cold'));
  cards.push(statCard('闪电抗性', `${r.lightning.capped}%`, `未上限 ${r.lightning.uncapped}%`, 'lightning'));
  cards.push(statCard('混沌抗性', `${r.chaos.capped}%`, `未上限 ${r.chaos.uncapped}%`, 'chaos'));

  if (d.block.attack) cards.push(statCard('攻击格挡', `${d.block.attack}%`));
  if (d.block.spell) cards.push(statCard('法术格挡', `${d.block.spell}%`));
  if (d.suppression) cards.push(statCard('法术压制', `${d.suppression}%`));

  grid.innerHTML = cards.join('');
}

function renderOffence() {
  const grid = $('#offenceGrid');
  if (!currentCalc?.offence) { grid.innerHTML = '<p>需要计算</p>'; return; }
  const o = currentCalc.offence;
  const cards = [];

  cards.push(statCard('总 DPS', fmt(o.totalDPS), o.source === 'imported' ? '来自 POB 导入数据' : '本地计算', 'dps'));
  if (o.averageHit) cards.push(statCard('平均伤害', fmt(o.averageHit), '', 'dps'));
  if (o.physicalDPS) cards.push(statCard('物理 DPS', fmt(o.physicalDPS)));
  if (o.fireDPS) cards.push(statCard('火焰 DPS', fmt(o.fireDPS), '', 'fire'));
  if (o.coldDPS) cards.push(statCard('冰霜 DPS', fmt(o.coldDPS), '', 'cold'));
  if (o.lightningDPS) cards.push(statCard('闪电 DPS', fmt(o.lightningDPS), '', 'lightning'));
  if (o.chaosDPS) cards.push(statCard('混沌 DPS', fmt(o.chaosDPS), '', 'chaos'));

  cards.push(statCard('暴击率', `${o.critChance}%`));
  cards.push(statCard('暴击倍率', `${o.critMultiplier}%`));
  cards.push(statCard('命中率', `${o.hitChance}%`));
  cards.push(statCard('攻击速度', o.attackSpeed?.toFixed(2) || '-'));

  if (o.bleedDPS) cards.push(statCard('流血 DPS', fmt(o.bleedDPS), '', 'life'));
  if (o.poisonDPS) cards.push(statCard('中毒 DPS', fmt(o.poisonDPS), '', 'chaos'));
  if (o.igniteDPS) cards.push(statCard('点燃 DPS', fmt(o.igniteDPS), '', 'fire'));
  if (o.combinedDPS && o.combinedDPS !== o.totalDPS) {
    cards.push(statCard('综合 DPS', fmt(o.combinedDPS), 'Hit + DoT', 'dps'));
  }
  if (o.fullDPS && o.fullDPS !== o.combinedDPS) {
    cards.push(statCard('Full DPS', fmt(o.fullDPS), '所有来源', 'dps'));
  }

  grid.innerHTML = cards.join('');
}

function renderItems() {
  const el = $('#itemsList');
  if (!currentBuild?.items?.list?.length) { el.innerHTML = '<p>无装备数据</p>'; return; }

  // Build slot → item mapping for display order
  const slots = currentBuild.items?.slots || {};
  const slotOrder = ['Weapon 1', 'Weapon 2', 'Helmet', 'Body Armour', 'Gloves', 'Boots',
    'Amulet', 'Ring 1', 'Ring 2', 'Belt', 'Flask 1', 'Flask 2', 'Flask 3', 'Flask 4', 'Flask 5',
    'Weapon 1 Swap', 'Weapon 2 Swap'];
  const itemById = {};
  for (const item of currentBuild.items.list) itemById[String(item.id)] = item;

  const rendered = new Set();
  const cards = [];

  // Render equipped items in slot order first
  for (const slotName of slotOrder) {
    const itemId = slots[slotName];
    if (!itemId) continue;
    const item = itemById[String(itemId)];
    if (!item) continue;
    rendered.add(String(item.id));
    cards.push(renderItemCard(item, slotName));
  }

  // Render remaining items (jewels, unequipped)
  for (const item of currentBuild.items.list) {
    if (rendered.has(String(item.id))) continue;
    cards.push(renderItemCard(item, ''));
  }

  el.innerHTML = cards.join('');
}

function renderItemCard(item, slotName) {
  const rarityClass = (item.rarity || 'NORMAL').toLowerCase();
  const rarityLabel = { UNIQUE: '传奇', RARE: '稀有', MAGIC: '魔法', NORMAL: '普通' }[item.rarity] || item.rarity;
  const rawName = item.name || '未知物品';
  // Translate slot name
  const slotZh = _slotZh(slotName);
  // Translate item name: try unique name first, then show baseType translation
  let displayName = rawName;
  if (typeof translateUniqueName === 'function') {
    const zhName = translateUniqueName(rawName);
    if (zhName !== rawName) displayName = zhName;
  }
  const baseZh = (typeof translateBaseType === 'function' && item.baseType) ? translateBaseType(item.baseType) : '';
  const baseTag = baseZh && baseZh !== item.baseType ? ` <span class="item-base-zh">(${escHtml(baseZh)})</span>` : '';
  // Format mods: highlight key lines
  const modsHtml = item.text ? formatItemMods(item.text) : '';
  return `<div class="item-card rarity-${rarityClass}">
    <div class="item-header">
      <span class="item-slot-tag" title="${escHtml(slotName)}">${escHtml(slotZh)}</span>
      <span class="item-rarity-tag">${rarityLabel}</span>
    </div>
    <div class="item-name ${rarityClass}" title="${escHtml(rawName)}">${escHtml(displayName)}${baseTag}</div>
    ${modsHtml ? `<div class="item-mods">${modsHtml}</div>` : ''}
  </div>`;
}

function formatItemMods(text) {
  const lines = text.split('\n');
  const skipPrefixes = ['Rarity:', 'Unique ID:', 'Item Level:', 'LevelReq:',
    'Sockets:', 'Implicits:', 'Quality:'];
  const result = [];
  let inImplicits = false;
  let implicitCount = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // Skip metadata lines
    if (skipPrefixes.some(p => line.startsWith(p))) {
      if (line.startsWith('Implicits:')) {
        const m = line.match(/Implicits:\s*(\d+)/);
        implicitCount = m ? +m[1] : 0;
        inImplicits = true;
      }
      continue;
    }
    // Skip the item name and base type (first 2 non-Rarity lines)
    if (result.length === 0 && !line.startsWith('{') && !line.startsWith('+') && !/^\d/.test(line)) {
      continue; // skip name line
    }
    // Classify line
    const isCrafted = line.startsWith('{crafted}');
    const isFractured = line.startsWith('{fractured}');
    const isMutated = line.startsWith('{mutated}');
    const cleanLine = line.replace(/^\{(crafted|fractured|mutated)\}/, '').trim();
    if (!cleanLine) continue;
    let cls = 'mod-explicit';
    if (isCrafted) cls = 'mod-crafted';
    if (isFractured) cls = 'mod-fractured';
    if (isMutated) cls = 'mod-crafted';
    if (inImplicits && implicitCount > 0) { cls = 'mod-implicit'; implicitCount--; if (implicitCount === 0) inImplicits = false; }
    if (cleanLine === 'Corrupted') { cls = 'mod-corrupted'; }
    const zhLine = (typeof translateMod === 'function') ? translateMod(cleanLine) : cleanLine;
    if (zhLine === null) continue; // skip metadata lines
    const display = (zhLine && zhLine !== cleanLine) ? zhLine : cleanLine;
    result.push(`<div class="${cls}" title="${escHtml(cleanLine)}">${escHtml(display)}</div>`);
  }
  return result.join('');
}

function findSlotForItem(itemId) {
  const slots = currentBuild?.items?.slots || {};
  for (const [name, id] of Object.entries(slots)) {
    if (String(id) === String(itemId)) return name;
  }
  return '';
}

function renderTree() {
  const el = $('#treeInfo');
  const tree = currentBuild?.tree;
  if (!tree?.specs?.length) { el.innerHTML = '<p>无天赋树数据</p>'; return; }

  const spec = tree.specs[(tree.activeSpec || 1) - 1] || tree.specs[0];
  el.innerHTML = `
    <p><strong>天赋树版本：</strong>${spec.treeVersion || '未知'}</p>
    <p><strong>升华职业：</strong>${spec.ascendClassName || '无'}</p>
    <p><strong>已分配节点：</strong>${spec.nodes?.length || 0}</p>
    <p><strong>珠宝插槽：</strong>${spec.jewels?.length || 0}</p>
    ${spec.URL ? `<p><a href="${spec.URL}" target="_blank" style="color:var(--accent)">在线查看天赋树 ↗</a></p>` : ''}
  `;
}

function renderRaw() {
  const data = currentCalc ? { build: currentBuild, calculation: currentCalc } : { build: currentBuild };
  $('#rawJson').textContent = JSON.stringify(data, null, 2);
}

function renderGemSetup() {
  const el = $('#gemSetup');
  if (!currentGemSetup) { el.innerHTML = '<p class="muted">无宝石数据</p>'; return; }
  const gs = currentGemSetup;

  let html = `<div class="gem-header">
    <span>${gs.character.ascendancy} Lv.${gs.character.level}</span>
    <span>总宝石: ${gs.summary.totalGems}</span>
    <span>活跃槽位: ${gs.summary.activeSlots}</span>
  </div>`;

  for (const eq of gs.equipment) {
    const rarityClass = (eq.itemRarity || '').toLowerCase();
    const hasGems = eq.totalGems > 0;
    html += `<div class="gem-equipment${hasGems ? '' : ' empty'}">
      <div class="gem-slot-header">
        <span class="gem-slot-name">${eq.slotCN}</span>
        <span class="gem-item-name ${rarityClass}">${eq.itemName || '(空)'}</span>
        ${eq.totalGems > 0 ? `<span class="gem-count">${eq.totalGems} 宝石</span>` : ''}
      </div>`;

    for (const g of eq.gemGroups) {
      const mainLabel = g.isMainSkill ? ' <span class="main-skill-badge">★ 主技能</span>' : '';
      const dpsLabel = g.includeInFullDPS ? ' <span class="dps-badge">DPS</span>' : '';
      html += `<div class="gem-group">
        <div class="gem-group-header">组 #${g.groupIndex}${mainLabel}${dpsLabel}</div>
        <div class="gem-list">`;
      for (const gem of g.gems) {
        const disabled = gem.enabled ? '' : ' disabled';
        html += `<div class="gem-item${disabled}">
          <span class="gem-name">${escHtml(gem.name)}</span>
          <span class="gem-level">Lv${gem.level}</span>
          ${gem.quality > 0 ? `<span class="gem-quality">Q${gem.quality}</span>` : ''}
        </div>`;
      }
      html += `</div></div>`;
    }
    html += `</div>`;
  }

  if (gs.unslotted?.length) {
    html += `<div class="gem-equipment unslotted">
      <div class="gem-slot-header"><span class="gem-slot-name">未装备</span></div>`;
    for (const g of gs.unslotted) {
      html += `<div class="gem-group">
        <div class="gem-group-header">组 #${g.groupIndex}</div>
        <div class="gem-list">`;
      for (const gem of g.gems) {
        html += `<div class="gem-item"><span class="gem-name">${escHtml(gem.name)}</span> Lv${gem.level}</div>`;
      }
      html += `</div></div>`;
    }
    html += `</div>`;
  }

  el.innerHTML = html;
}

function renderDamageBreakdown() {
  const el = $('#damageBreakdown');
  if (!currentDamageBreakdown) { el.innerHTML = '<p class="muted">无伤害分析数据</p>'; return; }
  const bd = currentDamageBreakdown;

  let html = '';

  // DPS comparison bar (shows when mods are disabled)
  if (disabledMods.size > 0 && bd.originalDPS && bd.estimatedDPS) {
    const diff = bd.estimatedDPS - bd.originalDPS;
    const pct = bd.originalDPS > 0 ? ((diff / bd.originalDPS) * 100).toFixed(1) : 0;
    const cls = diff < 0 ? 'dps-down' : 'dps-up';
    html += `<div class="dps-compare ${cls}">
      <span>原始 DPS: <strong>${fmt(bd.originalDPS)}</strong></span>
      <span>➜</span>
      <span>估算 DPS: <strong>${fmt(bd.estimatedDPS)}</strong></span>
      <span class="dps-delta">(${diff >= 0 ? '+' : ''}${pct}%)</span>
      <button class="btn btn-sm" onclick="resetAllMods()">全部启用</button>
    </div>`;
  }

  // Main skill info
  html += `<div class="dmg-section">
    <h3>🎯 主技能: ${bd.mainSkill.gems.map(g => g.name).join(' + ')}</h3>
    <div class="dmg-slot">槽位: ${bd.mainSkill.slot}</div>
  </div>`;

  // Gem roles
  html += `<div class="dmg-section">
    <h3>💎 技能石分解</h3>
    <table class="dmg-table"><thead><tr><th>宝石</th><th>类型</th><th>效果</th><th>Lv/Q</th></tr></thead><tbody>`;
  for (const gem of bd.mainSkill.gems) {
    const typeLabel = { active: '主动', more: '✕ more', less: '✕ less', penetration: '穿透', conversion: '转换', crit: '暴击', mechanic: '机制', support: '辅助', aura: '光环' }[gem.role?.type] || '辅助';
    const typeClass = { more: 'more', less: 'less', penetration: 'pen', active: 'active' }[gem.role?.type] || '';
    html += `<tr>
      <td class="gem-name">${escHtml(gem.name)}</td>
      <td class="dmg-type ${typeClass}">${typeLabel}</td>
      <td>${gem.role?.value || '-'}</td>
      <td>Lv${gem.level} Q${gem.quality}</td>
    </tr>`;
  }
  html += `</tbody></table></div>`;

  // All Mods grouped by source item — with checkboxes
  if (bd.allMods?.length) {
    html += `<div class="dmg-section">
      <h3>📋 词条来源 <span class="muted">(取消勾选可重新计算)</span></h3>`;

    // Group mods by source
    const groups = {};
    for (const mod of bd.allMods) {
      const key = mod.source + '||' + mod.itemName;
      if (!groups[key]) groups[key] = { source: mod.source, itemName: mod.itemName, mods: [] };
      groups[key].mods.push(mod);
    }

    for (const [, group] of Object.entries(groups)) {
      html += `<div class="mod-group">
        <div class="mod-group-header">${getSlotIcon(group.source)} ${escHtml(group.itemName)} <span class="muted">[${escHtml(_slotZh(group.source))}]</span></div>`;
      for (const mod of group.mods) {
        const checked = mod.enabled !== false ? 'checked' : '';
        const dimClass = mod.enabled === false ? ' mod-disabled' : '';
        const zhText = (typeof translateMod === 'function') ? (translateMod(mod.text) || mod.text) : mod.text;
        html += `<label class="mod-entry${dimClass}">
          <input type="checkbox" ${checked} data-mod-id="${escAttr(mod.id)}" onchange="toggleMod(this)" />
          <span class="mod-text" title="${escHtml(mod.text)}">${escHtml(zhText)}</span>
          <span class="mod-cat muted">${modCategoryLabel(mod.category)}</span>
        </label>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
  }

  // Damage chain with contributor badges
  if (bd.damageChain) {
    const chain = bd.damageChain;
    html += `<div class="dmg-section">
      <h3>📊 伤害计算链</h3>
      <div class="dmg-formula">${chain.formulaExpanded}</div>
      <div class="dmg-chain">`;
    for (const step of chain.steps) {
      const val = typeof step.value === 'number' ? fmt(step.value) : step.value;
      const detailHtml = step.detail ? escHtml(step.detail).replace(/\n/g, '<br>') : '';
      const explainHtml = step.explanation ? escHtml(step.explanation).replace(/\n/g, '<br>') : '';
      html += `<div class="chain-step">
        <div class="chain-label">${step.label}</div>
        <div class="chain-value">${val}</div>`;
      html += `${detailHtml ? `<div class="chain-detail">${detailHtml}</div>` : ''}
        ${explainHtml ? `<div class="chain-explain">${explainHtml}</div>` : ''}`;
      // Show decomposition tags (interactive factor breakdown)
      if (step.decomposition?.length) {
        html += `<div class="decomp-tags">`;
        for (let di = 0; di < step.decomposition.length; di++) {
          const d = step.decomposition[di];
          const hasItems = d.items && d.items.length > 0;
          const clickable = hasItems ? ' decomp-clickable' : '';
          html += `<span class="decomp-tag${clickable}" data-decomp-idx="${di}" data-decomp-json="${escAttr(JSON.stringify(d))}" title="${escHtml(d.detail)}">`;
          html += `<span class="decomp-label">${escHtml(d.label)}</span>`;
          html += `<span class="decomp-factor">${escHtml(d.factorStr)}</span>`;
          html += `</span>`;
          if (di < step.decomposition.length - 1) html += `<span class="decomp-op">×</span>`;
        }
        html += `</div>`;
      }
      // Show contributor badges
      if (step.contributors?.length) {
        html += `<div class="chain-contributors">`;
        for (const c of step.contributors) {
          const disClass = c.enabled === false ? ' contrib-disabled' : '';
          html += `<span class="contrib-badge${disClass}" data-slot="${escAttr(c.source)}" data-item="${escAttr(c.itemName)}" data-mod-text="${escAttr(c.text)}">${escHtml(c.itemName)}${c.value != null ? `: ${c.value}` : ''}</span>`;
        }
        html += `</div>`;
      }
      html += `</div>`;
    }
    html += `</div></div>`;
  }

  el.innerHTML = html;
  // Attach popup events to contributor badges
  initContribPopups(el);
}

// ── Contributor badge popup system ──
let _pinnedPopup = null;
let _hoverPopup = null;
let _hoverTimer = null;
let _subPopup = null;      // sub-popup spawned from inside a decomp popup
let _subHoverTimer = null;

function initContribPopups(container) {
  container.querySelectorAll('.contrib-badge').forEach(badge => {
    badge.addEventListener('mouseenter', () => {
      if (_pinnedPopup) return;
      clearTimeout(_hoverTimer);
      _hoverTimer = setTimeout(() => showItemPopup(badge, false), 200);
    });
    badge.addEventListener('mouseleave', () => {
      clearTimeout(_hoverTimer);
      if (_hoverPopup && !_pinnedPopup) {
        _hoverPopup.remove();
        _hoverPopup = null;
      }
    });
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      clearTimeout(_hoverTimer);
      if (_hoverPopup) { _hoverPopup.remove(); _hoverPopup = null; }
      if (_pinnedPopup) { _pinnedPopup.remove(); _pinnedPopup = null; }
      showItemPopup(badge, true);
    });
  });
  // Decomposition tags
  container.querySelectorAll('.decomp-tag.decomp-clickable').forEach(tag => {
    tag.addEventListener('mouseenter', () => {
      if (_pinnedPopup) return;
      clearTimeout(_hoverTimer);
      _hoverTimer = setTimeout(() => showDecompPopup(tag, false), 200);
    });
    tag.addEventListener('mouseleave', () => {
      clearTimeout(_hoverTimer);
      if (_hoverPopup && !_pinnedPopup) {
        _hoverPopup.remove();
        _hoverPopup = null;
      }
    });
    tag.addEventListener('click', (e) => {
      e.stopPropagation();
      clearTimeout(_hoverTimer);
      if (_hoverPopup) { _hoverPopup.remove(); _hoverPopup = null; }
      if (_pinnedPopup) { _pinnedPopup.remove(); _pinnedPopup = null; }
      showDecompPopup(tag, true);
    });
  });
}

function showDecompPopup(tag, pinned) {
  let d;
  try { d = JSON.parse(tag.dataset.decompJson); } catch { return; }
  if (!d.items || !d.items.length) return;

  const popup = document.createElement('div');
  popup.className = 'item-popup' + (pinned ? ' pinned' : '');

  let content = `<div class="item-popup-header">`;
  if (pinned) content += `<button class="item-popup-close" onclick="closePopup(this)">✕</button>`;
  content += `<strong>${escHtml(d.label)}</strong> <span class="decomp-factor-popup">${escHtml(d.factorStr)}</span></div>`;
  content += `<div class="item-popup-mods">`;
  for (const item of d.items) {
    const hasSource = item.source && item.modText;
    const clickClass = hasSource ? ' decomp-item-link' : '';
    const dataAttrs = hasSource ? ` data-slot="${escAttr(item.source)}" data-item="${escAttr(item.name)}" data-mod-text="${escAttr(item.modText)}"` : '';
    content += `<div class="popup-mod${clickClass}"${dataAttrs}>`;
    content += `<span class="decomp-item-name">${escHtml(item.name)}</span>`;
    content += `<span class="decomp-item-detail">${escHtml(item.text)}</span>`;
    content += `<span class="decomp-item-factor">${escHtml(item.factorStr)}</span>`;
    content += `</div>`;
  }
  content += `</div>`;
  popup.innerHTML = content;

  // Attach hover/click handlers on items with source data
  popup.querySelectorAll('.decomp-item-link').forEach(row => {
    row.addEventListener('mouseenter', () => {
      clearTimeout(_subHoverTimer);
      _subHoverTimer = setTimeout(() => {
        if (_subPopup && !_subPopup.classList.contains('pinned')) { _subPopup.remove(); _subPopup = null; }
        if (_subPopup) return; // already pinned
        const popupRect = popup.getBoundingClientRect();
        const anchorRect = { top: row.getBoundingClientRect().top, bottom: row.getBoundingClientRect().bottom, left: popupRect.right + 6, right: popupRect.right + 6 };
        _subPopup = createItemPopupEl(row, false);
        // Keep sub-popup alive when cursor is over it
        _subPopup.addEventListener('mouseenter', () => clearTimeout(_subHoverTimer));
        _subPopup.addEventListener('mouseleave', () => {
          _subHoverTimer = setTimeout(() => {
            if (_subPopup && !_subPopup.classList.contains('pinned')) { _subPopup.remove(); _subPopup = null; }
          }, 150);
        });
        document.body.appendChild(_subPopup);
        positionPopup(_subPopup, anchorRect);
      }, 200);
    });
    row.addEventListener('mouseleave', () => {
      clearTimeout(_subHoverTimer);
      _subHoverTimer = setTimeout(() => {
        if (_subPopup && !_subPopup.matches(':hover') && !_subPopup.classList.contains('pinned')) {
          _subPopup.remove(); _subPopup = null;
        }
      }, 150);
    });
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      clearTimeout(_subHoverTimer);
      if (_subPopup) { _subPopup.remove(); _subPopup = null; }
      const popupRect = popup.getBoundingClientRect();
      const anchorRect = { top: row.getBoundingClientRect().top, bottom: row.getBoundingClientRect().bottom, left: popupRect.right + 6, right: popupRect.right + 6 };
      _subPopup = createItemPopupEl(row, true);
      document.body.appendChild(_subPopup);
      positionPopup(_subPopup, anchorRect);
    });
  });

  document.body.appendChild(popup);
  const rect = tag.getBoundingClientRect();
  const popRect = popup.getBoundingClientRect();
  let top = rect.bottom + 6;
  let left = rect.left;
  if (left + popRect.width > window.innerWidth - 10) left = window.innerWidth - popRect.width - 10;
  if (top + popRect.height > window.innerHeight - 10) top = rect.top - popRect.height - 6;
  popup.style.top = top + 'px';
  popup.style.left = left + 'px';

  if (pinned) _pinnedPopup = popup;
  else _hoverPopup = popup;
}

function createItemPopupEl(badge, pinned) {
  const slot = badge.dataset.slot;
  const itemName = badge.dataset.item;
  const modText = badge.dataset.modText;

  const bd = currentDamageBreakdown;
  const itemMods = bd?.allMods?.filter(m => m.source === slot) || [];

  const popup = document.createElement('div');
  popup.className = 'item-popup' + (pinned ? ' pinned' : '');

  let content = `<div class="item-popup-header">`;
  if (pinned) content += `<button class="item-popup-close" onclick="closePopup(this)">✕</button>`;
  content += `<strong>${escHtml(itemName)}</strong><span class="muted"> [${escHtml(_slotZh(slot))}]</span></div>`;
  content += `<div class="item-popup-mods">`;
  for (const mod of itemMods) {
    const highlight = mod.text === modText ? ' popup-mod-highlight' : '';
    const disClass = mod.enabled === false ? ' popup-mod-disabled' : '';
    const zhText = (typeof translateMod === 'function') ? (translateMod(mod.text) || mod.text) : mod.text;
    content += `<div class="popup-mod${highlight}${disClass}" title="${escHtml(mod.text)}">${escHtml(zhText)} <span class="muted">${modCategoryLabel(mod.category)}</span></div>`;
  }
  if (!itemMods.length) content += `<div class="muted">无已识别词条</div>`;
  content += `</div>`;
  popup.innerHTML = content;
  return popup;
}

function positionPopup(popup, anchorRect) {
  const popRect = popup.getBoundingClientRect();
  let top = anchorRect.top;
  let left = anchorRect.left;
  if (left + popRect.width > window.innerWidth - 10) left = window.innerWidth - popRect.width - 10;
  if (top + popRect.height > window.innerHeight - 10) top = anchorRect.top - popRect.height - 6;
  if (top < 10) top = 10;
  popup.style.top = top + 'px';
  popup.style.left = left + 'px';
}

function showItemPopup(badge, pinned, anchorRect) {
  const popup = createItemPopupEl(badge, pinned);
  document.body.appendChild(popup);
  const rect = anchorRect || badge.getBoundingClientRect();
  const defaultAnchor = anchorRect ? rect : { top: rect.bottom + 6, left: rect.left, bottom: rect.bottom + 6 };
  positionPopup(popup, defaultAnchor);

  if (pinned) _pinnedPopup = popup;
  else _hoverPopup = popup;
}

function closePopup(btn) {
  const popup = btn.closest('.item-popup');
  if (popup) popup.remove();
  if (_pinnedPopup === popup) _pinnedPopup = null;
  if (_subPopup === popup) _subPopup = null;
}

document.addEventListener('click', (e) => {
  // Close sub-popup if clicking outside it
  if (_subPopup && !_subPopup.contains(e.target) && !e.target.closest('.decomp-item-link')) {
    _subPopup.remove(); _subPopup = null;
  }
  if (_pinnedPopup && !_pinnedPopup.contains(e.target) && !e.target.closest('.contrib-badge') && !e.target.closest('.decomp-tag')) {
    _pinnedPopup.remove();
    _pinnedPopup = null;
    // Also clean sub-popup when parent closes
    if (_subPopup) { _subPopup.remove(); _subPopup = null; }
  }
});
let _toggleTimer = null;
function toggleMod(cb) {
  const modId = cb.dataset.modId;
  if (cb.checked) {
    disabledMods.delete(modId);
  } else {
    disabledMods.add(modId);
  }
  console.log('[POB] toggleMod', modId, 'checked=', cb.checked, 'disabled=', [...disabledMods]);
  clearTimeout(_toggleTimer);
  _toggleTimer = setTimeout(() => refreshDamageBreakdown(), 300);
}

function resetAllMods() {
  disabledMods = new Set();
  refreshDamageBreakdown();
}

async function refreshDamageBreakdown() {
  const code = currentBuildCode || $('#buildCode').value.trim();
  if (!code) { console.warn('[POB] refreshDamageBreakdown: no code'); return; }
  // Show a loading indicator on the damage section
  const el = $('#damageBreakdown');
  const loadingBanner = document.createElement('div');
  loadingBanner.className = 'dps-loading';
  loadingBanner.textContent = '⏳ 重新计算中…';
  if (el.firstChild) el.insertBefore(loadingBanner, el.firstChild);
  else el.appendChild(loadingBanner);
  try {
    const body = { code, disabledMods: [...disabledMods] };
    console.log('[POB] refreshDamageBreakdown', body.disabledMods.length, 'disabled');
    const resp = await fetch('/api/build/damage-breakdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (data.success) {
      currentDamageBreakdown = data.breakdown;
      console.log('[POB] breakdown updated, estDPS=', data.breakdown.estimatedDPS, 'origDPS=', data.breakdown.originalDPS);
      renderDamageBreakdown();
    } else {
      console.error('[POB] API error:', data.error);
      loadingBanner.textContent = '❌ 计算失败: ' + (data.error || '未知错误');
    }
  } catch (err) {
    console.error('[POB] refreshDamageBreakdown error:', err);
    loadingBanner.textContent = '❌ 请求失败: ' + err.message;
  }
}

function getSlotIcon(slot) {
  if (!slot) return '📦';
  const s = slot.toLowerCase();
  if (s.includes('weapon')) return '🗡️';
  if (s.includes('helmet') || s.includes('helm')) return '⛑️';
  if (s.includes('body')) return '🛡️';
  if (s.includes('glove')) return '🧤';
  if (s.includes('boot')) return '👢';
  if (s.includes('belt')) return '🎗️';
  if (s.includes('ring')) return '💍';
  if (s.includes('amulet')) return '📿';
  if (s.includes('flask')) return '🧪';
  if (s.includes('jewel')) return '💎';
  if (s.includes('gem') || s.includes('技能')) return '✨';
  return '📦';
}

function modCategoryLabel(cat) {
  const MAP = {
    weapon_quality: '品质', weapon_local_inc_phys: '局部增物理', weapon_local_added_phys: '局部附加物理',
    weapon_local_added_ele: '局部附加元素', weapon_local_attack_speed: '局部攻速',
    gear_added_to_attacks: '附加攻击伤害', gear_inc_damage: '增伤%', gear_more_damage: 'more%',
    gear_less_damage: 'less%', gear_attack_speed: '全局攻速', crit_chance: '暴击率', crit_multi: '暴击倍率',
    gem_more: 'more', gem_less: 'less', gem_crit: '暴击',
  };
  return MAP[cat] || cat || '';
}

// Session save/load
// === Sidebar Build List ===

async function refreshBuildList() {
  try {
    const resp = await fetch('/api/session/list');
    const data = await resp.json();
    buildListCache = data.success ? (data.sessions || []) : [];
    renderBuildList(buildListCache);
  } catch { buildListCache = []; renderBuildList([]); }
}

function renderBuildList(list) {
  const el = $('#buildList');
  const search = ($('#buildSearch')?.value || '').toLowerCase();
  const filtered = search ? list.filter(s =>
    (s.character || '').toLowerCase().includes(search) ||
    (s.name || '').toLowerCase().includes(search)
  ) : list;

  if (!filtered.length) {
    el.innerHTML = `<div class="build-list-empty">${search ? '无匹配结果' : '暂无保存的 Build'}</div>`;
    return;
  }

  el.innerHTML = filtered.map(s => {
    const isActive = currentFilename === s.filename;
    const charName = s.character || '未知角色';
    const dps = s.dps ? fmt(s.dps) + ' DPS' : '';
    const icon = getClassIcon(s.character);
    return `<div class="build-entry${isActive ? ' active' : ''}" data-filename="${escAttr(s.filename)}">
      <span class="be-icon">${icon}</span>
      <div class="be-info">
        <div class="be-name">${escHtml(charName)}</div>
        <div class="be-detail">${escHtml(s.savedAt?.substring(0, 10) || '')}</div>
        ${dps ? `<div class="be-dps">${dps}</div>` : ''}
      </div>
      <button class="be-delete" title="删除" data-filename="${escAttr(s.filename)}">&times;</button>
    </div>`;
  }).join('');

  // Event delegation for click/delete
  el.querySelectorAll('.build-entry').forEach(entry => {
    entry.addEventListener('click', (e) => {
      if (e.target.classList.contains('be-delete')) return;
      selectBuild(entry.dataset.filename);
    });
  });
  el.querySelectorAll('.be-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteBuild(btn.dataset.filename);
    });
  });
}

function highlightActiveBuild() {
  $$('.build-entry').forEach(el => {
    el.classList.toggle('active', el.dataset.filename === currentFilename);
  });
}

function filterBuildList() {
  renderBuildList(buildListCache);
}

async function selectBuild(filename) {
  hideError();
  disabledMods = new Set();
  try {
    const resp = await fetch(`/api/session/load/${encodeURIComponent(filename)}`);
    const data = await resp.json();
    if (!data.success) throw new Error(data.error);

    const session = data.session;
    currentBuild = session.build || null;
    currentCalc = session.calculation || null;
    currentGemSetup = session.gemSetup || null;
    currentDamageBreakdown = session.damageBreakdown || null;
    currentFilename = filename;
    currentBuildCode = session.code || '';

    if (session.code) $('#buildCode').value = session.code;
    if (currentBuild) {
      $('#importSection').classList.add('hidden');
      renderResult();
      // Always refresh damage breakdown from API to get latest allMods attribution
      refreshDamageBreakdown();
    }
    updateHeader(currentBuild);
    highlightActiveBuild();
  } catch (err) {
    showError('加载失败: ' + err.message);
  }
}

async function deleteBuild(filename) {
  if (!confirm('确定删除这个 Build？')) return;
  try {
    await fetch(`/api/session/delete/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    if (currentFilename === filename) clearBuild();
    await refreshBuildList();
  } catch { /* silent */ }
}

function updateHeader(build) {
  const title = $('#headerTitle');
  const sub = $('#headerSubtitle');
  if (build) {
    const cls = build.ascendClassName || build.className || '?';
    title.textContent = `${cls} Lv.${build.level}`;
    const stats = build.playerStats || {};
    const dps = stats.TotalDPS || stats.CombinedDPS;
    sub.textContent = dps ? `${fmt(dps)} DPS` : build.className || '';
  } else {
    title.textContent = '⚔️ POB Node';
    sub.textContent = '导入一个 Build Code 开始分析';
  }
}

function getClassIcon(charStr) {
  if (!charStr) return '🎮';
  const c = charStr.toLowerCase();
  if (c.includes('necromancer') || c.includes('witch')) return '🧙';
  if (c.includes('deadeye') || c.includes('ranger')) return '🏹';
  if (c.includes('gladiator') || c.includes('duelist')) return '⚔️';
  if (c.includes('assassin') || c.includes('shadow')) return '🗡️';
  if (c.includes('juggernaut') || c.includes('marauder')) return '🛡️';
  if (c.includes('inquisitor') || c.includes('templar')) return '✝️';
  if (c.includes('pathfinder') || c.includes('scion')) return '🌿';
  return '🎮';
}

function escAttr(s) { return (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

// Helpers
function statCard(label, value, detail, colorClass) {
  return `<div class="stat-card">
    <div class="label">${label}</div>
    <div class="value ${colorClass || ''}">${value}</div>
    ${detail ? `<div class="detail">${detail}</div>` : ''}
  </div>`;
}

function fmt(n) {
  if (n == null || isNaN(n)) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Number(n).toFixed(1);
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showError(msg) { const el = $('#errorMsg'); el.textContent = msg; el.classList.remove('hidden'); }
function hideError() { $('#errorMsg').classList.add('hidden'); }
