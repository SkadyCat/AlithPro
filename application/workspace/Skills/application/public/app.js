/* MagicWorld Skill Node Visualizer — Frontend */

let allNodes = [];
let treeData = {};
let luaTree = null;
let activeItem = null;
let viewMode = 'luaTree'; // 'luaTree' | 'classes'

// ── Bootstrap ───────────────────────────────────────────────────────────────

async function init() {
  const [skillRes, luaRes] = await Promise.all([
    fetch('/api/skills'),
    fetch('/api/lua-tree')
  ]);
  const data = await skillRes.json();
  allNodes = data.nodes;
  treeData = data.tree;

  const luaData = await luaRes.json();
  luaTree = luaData.tree;

  renderLeftMenu();
}

// ── Left Menu Render ────────────────────────────────────────────────────────

function renderLeftMenu(filter = '') {
  if (viewMode === 'luaTree') {
    renderLuaTreeMenu(filter);
  } else {
    renderTree(treeData, filter);
  }
}

const ICON_MAP = {
  'Primary Skills': 'icon-primary',
  'Passive Skills': 'icon-passive',
  'Bullet Behaviors': 'icon-behavior',
  'Data Structures': 'icon-struct',
  'Enums': 'icon-enum',
  'Subsystems': 'icon-subsystem',
  'Entities': 'icon-entity',
  'Other': 'icon-other'
};

// ── Class Tree ──────────────────────────────────────────────────────────────

function renderTree(tree, filter = '') {
  const nav = document.getElementById('node-tree');
  nav.innerHTML = '';
  const lc = filter.toLowerCase();

  for (const [cat, nodes] of Object.entries(tree)) {
    const filtered = lc
      ? nodes.filter(n => n.name.toLowerCase().includes(lc))
      : nodes;
    if (filtered.length === 0) continue;

    const group = document.createElement('div');
    group.className = 'cat-group';

    const header = document.createElement('div');
    header.className = 'cat-header';
    header.innerHTML = `<span class="arrow">▼</span>${cat} <span style="margin-left:auto;font-size:11px;color:var(--text-dim)">${filtered.length}</span>`;
    header.addEventListener('click', () => {
      header.classList.toggle('collapsed');
      items.classList.toggle('collapsed');
    });

    const items = document.createElement('div');
    items.className = 'cat-items';

    for (const node of filtered) {
      const item = document.createElement('div');
      item.className = 'node-item' + (activeItem === `cls:${node.name}` ? ' active' : '');
      item.dataset.name = `cls:${node.name}`;

      const iconClass = ICON_MAP[cat] || 'icon-other';
      const badge = node.isEnum ? 'enum' : node.isStruct ? 'struct' : (node.allProperties ? node.allProperties.length : node.properties.length) + 'p';

      item.innerHTML = `<span class="node-icon ${iconClass}"></span>${node.name}<span class="node-badge">${badge}</span>`;
      item.addEventListener('click', () => selectClass(node.name));
      items.appendChild(item);
    }

    group.appendChild(header);
    group.appendChild(items);
    nav.appendChild(group);
  }
}

// ── Search ──────────────────────────────────────────────────────────────────

document.getElementById('search').addEventListener('input', (e) => {
  renderLeftMenu(e.target.value);
});

// ── Refresh ─────────────────────────────────────────────────────────────────

document.getElementById('btn-refresh').addEventListener('click', async () => {
  await fetch('/api/refresh');
  await init();
  if (activeItem) {
    if (activeItem.startsWith('inst:')) selectInstance(activeItem.slice(5));
    else if (activeItem.startsWith('cls:')) selectClass(activeItem.slice(4));
  }
});

// ── View mode toggle ────────────────────────────────────────────────────────

document.getElementById('btn-toggle-view').addEventListener('click', () => {
  viewMode = viewMode === 'luaTree' ? 'classes' : 'luaTree';
  document.getElementById('btn-toggle-view').textContent = viewMode === 'luaTree' ? '类定义' : '数据树';
  renderLeftMenu(document.getElementById('search').value);
});

// ── Select Class ────────────────────────────────────────────────────────────

function selectClass(name) {
  activeItem = `cls:${name}`;
  updateActiveState();

  const node = allNodes.find(n => n.name === name);
  if (!node) return;

  document.getElementById('welcome').classList.add('hidden');
  const detail = document.getElementById('node-detail');
  detail.classList.remove('hidden');
  detail.innerHTML = renderClassDetail(node);
}

function updateActiveState() {
  document.querySelectorAll('.node-item').forEach(el => {
    el.classList.toggle('active', el.dataset.name === activeItem);
  });
}

// ── Class Detail Render ─────────────────────────────────────────────────────

function renderClassDetail(node) {
  let html = '';

  const tagClass = node.isEnum ? 'tag-enum' : node.isStruct ? 'tag-struct' : 'tag-class';
  const tagLabel = node.isEnum ? 'Enum' : node.isStruct ? 'Struct' : 'Class';
  html += `<div class="detail-header">
    <h1>${node.name} <span class="tag ${tagClass}">${tagLabel}</span></h1>
    <div class="detail-meta">文件：${node.file}</div>`;

  if (!node.isEnum && !node.isStruct) {
    const chain = buildInheritanceChain(node.name);
    if (chain.length > 1) {
      html += `<div class="inherit-chain">`;
      chain.forEach((c, i) => {
        if (i > 0) html += `<span class="inherit-arrow">→</span>`;
        if (c === node.name) {
          html += `<strong>${c}</strong>`;
        } else {
          html += `<span class="inherit-link" onclick="selectClass('${c}')">${c}</span>`;
        }
      });
      html += `</div>`;
    }
  }
  html += `</div>`;

  if (node.isEnum) {
    html += `<div class="detail-section"><h3>枚举值</h3><div class="enum-grid">`;
    for (const p of node.properties) {
      html += `<div class="enum-val">${p.name}<span class="idx">${p.default}</span></div>`;
    }
    html += `</div></div>`;
    return html;
  }

  if (node.properties.length > 0) {
    html += `<div class="detail-section"><h3>属性 (${node.properties.length})</h3>`;
    html += `<table class="prop-table"><thead><tr>
      <th>名称</th><th>类型</th><th>默认值</th><th>分类</th>
    </tr></thead><tbody>`;
    for (const p of node.properties) {
      html += `<tr>
        <td>${p.name}</td>
        <td><span class="type-badge">${escHtml(p.type)}</span></td>
        <td><span class="default-badge">${escHtml(p.default) || '—'}</span></td>
        <td>${p.category ? `<span class="category-badge">${p.category}</span>` : ''}</td>
      </tr>`;
    }
    html += `</tbody></table></div>`;
  }

  const inherited = collectInheritedProperties(node.name);
  if (inherited.length > 0) {
    html += `<div class="detail-section"><h3>继承属性 (${inherited.length})</h3>`;
    html += `<table class="prop-table"><thead><tr>
      <th>名称</th><th>类型</th><th>默认值</th><th>来源</th>
    </tr></thead><tbody>`;
    for (const { prop, from } of inherited) {
      html += `<tr>
        <td>${prop.name}</td>
        <td><span class="type-badge">${escHtml(prop.type)}</span></td>
        <td><span class="default-badge">${escHtml(prop.default) || '—'}</span></td>
        <td><span class="inherit-link" onclick="selectClass('${from}')">${from}</span></td>
      </tr>`;
    }
    html += `</tbody></table></div>`;
  }

  if (node.methods.length > 0) {
    html += `<div class="detail-section"><h3>方法 (${node.methods.length})</h3>`;
    for (const m of node.methods) {
      const overrideBadge = m.isOverride ? '<span class="badge-override">override</span>' : '';
      html += `<div class="method-item">
        <span class="ret">${escHtml(m.returnType)}</span>
        <span class="fname">${m.name}</span>(<span class="params">${escHtml(m.params)}</span>)${overrideBadge}
      </div>`;
    }
    html += `</div>`;
  }

  const children = allNodes.filter(n => n.parent === node.name);
  if (children.length > 0) {
    html += `<div class="detail-section"><h3>子类 (${children.length})</h3>`;
    html += `<div class="enum-grid">`;
    for (const c of children) {
      html += `<div class="enum-val" style="cursor:pointer" onclick="selectClass('${c.name}')">${c.name}</div>`;
    }
    html += `</div></div>`;
  }

  return html;
}

// ── Lua Data Tree Menu ──────────────────────────────────────────────────────

function renderLuaTreeMenu(filter = '') {
  const nav = document.getElementById('node-tree');
  nav.innerHTML = '';
  if (!luaTree) return;

  const lc = filter.toLowerCase();
  renderLuaFolder(nav, luaTree, lc);
}

function renderLuaFolder(container, items, filter) {
  for (const item of items) {
    if (item.type === 'folder') {
      // Check if any child matches filter
      const hasMatch = !filter || luaFolderHasMatch(item, filter);
      if (!hasMatch) continue;

      const group = document.createElement('div');
      group.className = 'cat-group';

      const header = document.createElement('div');
      header.className = 'cat-header';
      const childCount = countLuaFiles(item);
      header.innerHTML = `<span class="arrow">▼</span>📁 ${item.name} <span style="margin-left:auto;font-size:11px;color:var(--text-dim)">${childCount}</span>`;
      header.addEventListener('click', () => {
        header.classList.toggle('collapsed');
        childDiv.classList.toggle('collapsed');
      });

      const childDiv = document.createElement('div');
      childDiv.className = 'cat-items';
      renderLuaFolder(childDiv, item.children, filter);

      group.appendChild(header);
      group.appendChild(childDiv);
      container.appendChild(group);
    } else if (item.type === 'file') {
      if (filter && !item.name.toLowerCase().includes(filter)
          && !(item.skillName || '').toLowerCase().includes(filter)
          && !(item.className || '').toLowerCase().includes(filter)) continue;

      const el = document.createElement('div');
      el.className = 'node-item' + (activeItem === `lua:${item.relPath}` ? ' active' : '');
      el.dataset.name = `lua:${item.relPath}`;

      const icon = item.isSkillInstance ? 'icon-passive' : 'icon-other';
      const badge = item.isSkillInstance ? item.skillName : item.parentClass || '';
      el.innerHTML = `<span class="node-icon ${icon}"></span>${item.name}<span class="node-badge">${escHtml(badge)}</span>`;
      el.addEventListener('click', () => selectLuaNode(item));
      container.appendChild(el);
    }
  }
}

function luaFolderHasMatch(folder, filter) {
  for (const item of folder.children) {
    if (item.type === 'folder' && luaFolderHasMatch(item, filter)) return true;
    if (item.type === 'file') {
      if (item.name.toLowerCase().includes(filter)
          || (item.skillName || '').toLowerCase().includes(filter)
          || (item.className || '').toLowerCase().includes(filter)) return true;
    }
  }
  return false;
}

function countLuaFiles(folder) {
  let count = 0;
  for (const item of folder.children) {
    if (item.type === 'file') count++;
    else if (item.type === 'folder') count += countLuaFiles(item);
  }
  return count;
}

// ── Select Lua Node ─────────────────────────────────────────────────────────

function selectLuaNode(item) {
  activeItem = `lua:${item.relPath}`;
  updateActiveState();

  document.getElementById('welcome').classList.add('hidden');
  const detail = document.getElementById('node-detail');
  detail.classList.remove('hidden');
  detail.innerHTML = renderLuaDetail(item);
}

function renderLuaDetail(item) {
  let html = '';

  const isSkill = item.isSkillInstance;
  const tagClass = isSkill ? 'tag-instance' : 'tag-class';
  const tagLabel = isSkill ? '技能' : '基类';

  html += `<div class="detail-header">
    <h1>${item.className || item.name} <span class="tag ${tagClass}">${tagLabel}</span></h1>`;

  if (item.skillName) {
    html += `<div class="detail-meta" style="font-size:16px;margin-top:4px">🎮 ${escHtml(item.skillName)}</div>`;
  }

  html += `<div class="detail-meta" style="margin-top:4px">路径：<code>${escHtml(item.relPath)}</code></div>`;

  if (item.parentClass) {
    html += `<div class="detail-meta" style="margin-top:2px">继承：<span class="inherit-link">${escHtml(item.parentClass)}</span></div>`;
  }

  if (item.assetPath) {
    html += `<div class="detail-meta" style="margin-top:2px">资产：<code>${escHtml(item.assetPath)}</code></div>`;
  }

  html += `</div>`;

  // Properties table
  const props = item.props || {};
  const keys = Object.keys(props);
  if (keys.length > 0) {
    // Separate core props from meta props
    const metaKeys = ['assetPath', 'nativeClass', 'callWords', 'assetBundleData'];
    const coreKeys = keys.filter(k => !metaKeys.includes(k));
    const extraKeys = keys.filter(k => metaKeys.includes(k));

    if (coreKeys.length > 0) {
      html += `<div class="detail-section"><h3>属性 (${coreKeys.length})</h3>`;
      html += `<table class="prop-table"><thead><tr><th>属性名</th><th>值</th></tr></thead><tbody>`;
      for (const k of coreKeys) {
        const val = props[k];
        const isLong = val.length > 80;
        html += `<tr><td>${escHtml(k)}</td><td><span class="default-badge${isLong ? ' long-val' : ''}">${escHtml(val)}</span></td></tr>`;
      }
      html += `</tbody></table></div>`;
    }

    if (extraKeys.length > 0) {
      html += `<div class="detail-section"><h3>元数据</h3>`;
      html += `<table class="prop-table"><thead><tr><th>属性名</th><th>值</th></tr></thead><tbody>`;
      for (const k of extraKeys) {
        const val = props[k];
        const isLong = val.length > 80;
        html += `<tr><td>${escHtml(k)}</td><td><span class="default-badge${isLong ? ' long-val' : ''}">${escHtml(val)}</span></td></tr>`;
      }
      html += `</tbody></table></div>`;
    }
  }

  return html;
}

// ── Cross-view navigation ───────────────────────────────────────────────────

function switchToClassAndSelect(name) {
  viewMode = 'classes';
  document.getElementById('btn-toggle-view').textContent = '数据树';
  renderLeftMenu();
  selectClass(name);
}

function switchToLuaAndSelect(relPath) {
  viewMode = 'luaTree';
  document.getElementById('btn-toggle-view').textContent = '类定义';
  renderLeftMenu();
  // Find and select node by relPath
  function findNode(items) {
    for (const item of items) {
      if (item.type === 'file' && item.relPath === relPath) return item;
      if (item.type === 'folder') { const r = findNode(item.children); if (r) return r; }
    }
    return null;
  }
  const node = findNode(luaTree || []);
  if (node) selectLuaNode(node);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildInheritanceChain(name) {
  const chain = [];
  let current = name;
  const visited = new Set();
  while (current && !visited.has(current)) {
    visited.add(current);
    chain.unshift(current);
    const node = allNodes.find(n => n.name === current);
    if (!node || node.isEnum || node.isStruct) break;
    current = node.parent;
  }
  return chain;
}

function collectInheritedProperties(name) {
  const result = [];
  const node = allNodes.find(n => n.name === name);
  if (!node) return result;

  let current = node.parent;
  const visited = new Set([name]);
  while (current && !visited.has(current)) {
    visited.add(current);
    const parentNode = allNodes.find(n => n.name === current);
    if (!parentNode) break;
    for (const prop of parentNode.properties) {
      result.push({ prop, from: current });
    }
    current = parentNode.parent;
  }
  return result;
}

function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Go ──────────────────────────────────────────────────────────────────────

init();
