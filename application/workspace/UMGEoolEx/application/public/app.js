/* UMG Explorer - Frontend */
(function () {
  const $tree = document.getElementById('file-tree');
  const $search = document.getElementById('search');
  const $placeholder = document.getElementById('placeholder');
  const $assetInfo = document.getElementById('asset-info');
  const $columnsContainer = document.getElementById('columns-container');
  const $status = document.getElementById('status');
  const $rightPanel = document.getElementById('right_panel');
  const $detailContent = document.getElementById('detail-content');

  let treeData = null;
  let currentFile = null;
  let columns = []; // { file, data, el }

  // ── Load file tree ──
  async function loadTree() {
    $status.textContent = 'Loading blueprint list...';
    try {
      const res = await fetch('/api/tree');
      treeData = await res.json();
      renderFileTree(treeData, $tree, 0);
      const count = countFiles(treeData);
      $status.textContent = `${count} blueprints`;
    } catch (e) {
      $status.textContent = 'Error loading tree';
      console.error(e);
    }
  }

  function countFiles(node) {
    if (!node.isDir) return 1;
    return (node.children || []).reduce((s, c) => s + countFiles(c), 0);
  }

  // ── Render file tree ──
  function renderFileTree(node, container, depth) {
    if (node.isDir) {
      const dir = document.createElement('div');
      dir.className = 'tree-dir' + (depth < 1 ? ' open' : '');
      const label = document.createElement('div');
      label.className = 'tree-label';
      label.textContent = node.name;
      label.addEventListener('click', () => dir.classList.toggle('open'));
      dir.appendChild(label);

      const children = document.createElement('div');
      children.className = 'tree-children';
      for (const child of node.children || []) {
        renderFileTree(child, children, depth + 1);
      }
      dir.appendChild(children);
      container.appendChild(dir);
    } else {
      const file = document.createElement('div');
      file.className = 'tree-file';
      file.dataset.path = node.path;
      file.dataset.name = node.name.toLowerCase();
      const label = document.createElement('div');
      label.className = 'tree-label';
      label.textContent = node.name.replace('.uasset', '');
      label.addEventListener('click', () => selectFile(node.path, file));
      file.appendChild(label);
      container.appendChild(file);
    }
  }

  // ── Search filter ──
  $search.addEventListener('input', () => {
    const q = $search.value.toLowerCase().trim();
    filterTree($tree, q);
  });

  function filterTree(container, query) {
    const items = container.querySelectorAll('.tree-file, .tree-dir');
    if (!query) {
      items.forEach(el => el.style.display = '');
      return;
    }
    // Show files matching query, show parent dirs
    const files = container.querySelectorAll('.tree-file');
    const visibleDirs = new Set();
    files.forEach(f => {
      const match = f.dataset.name.includes(query);
      f.style.display = match ? '' : 'none';
      if (match) {
        let parent = f.parentElement;
        while (parent && parent !== container) {
          if (parent.classList.contains('tree-dir')) {
            visibleDirs.add(parent);
            parent.classList.add('open');
          }
          parent = parent.parentElement;
        }
      }
    });
    container.querySelectorAll('.tree-dir').forEach(d => {
      d.style.display = visibleDirs.has(d) ? '' : 'none';
    });
  }

  // ── Select & parse file ──
  async function selectFile(filePath, fileEl) {
    document.querySelectorAll('.tree-file.active').forEach(el => el.classList.remove('active'));
    fileEl.classList.add('active');
    currentFile = filePath;

    $placeholder.classList.add('hidden');
    $assetInfo.classList.remove('hidden');
    $columnsContainer.classList.remove('hidden');
    $assetInfo.innerHTML = '<em>Parsing...</em>';
    clearColumns();
    $rightPanel.classList.add('hidden');

    try {
      const res = await fetch(`/api/parse?file=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.error && !data.tree) {
        $assetInfo.innerHTML = `<span style="color:#f7768e">Parse error: ${esc(data.error)}</span>`;
        if (data.fallback) {
          const col = addColumn(filePath, 'Fallback');
          col.el.innerHTML += data.fallback.map(s => `<div style="padding-left:12px">${esc(s)}</div>`).join('');
        }
        return;
      }
      renderAssetInfo(data);
      const widgetRoots = extractWidgetTree(data.tree);
      addTreeColumn(filePath, data, widgetRoots.length > 0 ? widgetRoots : data.tree);
    } catch (e) {
      $assetInfo.innerHTML = `<span style="color:#f7768e">Error: ${esc(e.message)}</span>`;
    }
  }

  // ── Column management ──
  function clearColumns() {
    columns = [];
    $columnsContainer.innerHTML = '';
  }

  function addColumn(filePath, label) {
    const colEl = document.createElement('div');
    colEl.className = 'node-column';

    const header = document.createElement('div');
    header.className = 'column-header';
    const title = document.createElement('span');
    title.textContent = label || filePath.split('\\').pop().replace('.uasset', '');
    title.title = filePath;
    header.appendChild(title);

    const colIdx = columns.length;
    if (colIdx > 0) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'col-close';
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => removeColumnsFrom(colIdx));
      header.appendChild(closeBtn);
    }

    colEl.appendChild(header);
    $columnsContainer.appendChild(colEl);
    const entry = { file: filePath, el: colEl };
    columns.push(entry);

    // Auto-scroll to the new column
    setTimeout(() => colEl.scrollIntoView({ behavior: 'smooth', inline: 'end' }), 50);
    return entry;
  }

  function removeColumnsFrom(idx) {
    while (columns.length > idx) {
      const col = columns.pop();
      col.el.remove();
    }
  }

  function addTreeColumn(filePath, data, roots) {
    const name = filePath.split('\\').pop().replace('.uasset', '');
    const col = addColumn(filePath, name);
    const colIdx = columns.length - 1;

    if (!roots || roots.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:var(--dim);padding:8px';
      empty.textContent = 'No widget tree';
      col.el.appendChild(empty);
    } else {
      const treeEl = document.createElement('div');
      treeEl.style.padding = '4px 0';
      for (const root of roots) {
        treeEl.appendChild(createNodeEl(root, data, true, colIdx));
      }
      col.el.appendChild(treeEl);
    }

    // Show blueprint references from imports (EntryClass, child blueprints)
    const refs = data.blueprintRefs || [];
    // Filter out self-references
    const selfName = name + '_C';
    const externalRefs = refs.filter(r => r.className !== selfName);
    if (externalRefs.length > 0) {
      const refsEl = document.createElement('div');
      refsEl.style.cssText = 'border-top:1px solid var(--border);margin-top:8px;padding:6px 8px';
      refsEl.innerHTML = `<div style="color:var(--dim);font-size:10px;margin-bottom:4px">引用蓝图 (${externalRefs.length})</div>`;
      for (const ref of externalRefs) {
        const link = document.createElement('div');
        link.className = 'nt-row has-ref';
        link.style.marginBottom = '2px';
        link.innerHTML = `<span class="nt-ref-icon">→</span><span class="nt-class">${esc(ref.className)}</span>`;
        link.title = ref.packagePath;
        link.addEventListener('click', () => openBlueprintRef(ref.packagePath, colIdx));
        refsEl.appendChild(link);
      }
      col.el.appendChild(refsEl);
    }
  }

  // ── Open a referenced blueprint in a new column ──
  async function openBlueprintRef(blueprintRef, afterColumnIdx) {
    // Remove any columns after the current one
    removeColumnsFrom(afterColumnIdx + 1);

    // Check if already open (avoid duplicates)
    const resolveRes = await fetch(`/api/resolve-path?path=${encodeURIComponent(blueprintRef)}`);
    if (!resolveRes.ok) {
      const err = await resolveRes.json();
      alert(`无法找到引用资产: ${blueprintRef}\n${err.error || ''}`);
      return;
    }
    const { path: filePath } = await resolveRes.json();

    // Parse the referenced blueprint
    const res = await fetch(`/api/parse?file=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    if (data.error && !data.tree) {
      const col = addColumn(filePath, blueprintRef.split('/').pop());
      const errEl = document.createElement('div');
      errEl.style.cssText = 'color:#f7768e;padding:8px';
      errEl.textContent = `解析失败: ${data.error}`;
      col.el.appendChild(errEl);
      return;
    }
    const widgetRoots = extractWidgetTree(data.tree);
    addTreeColumn(filePath, data, widgetRoots.length > 0 ? widgetRoots : data.tree);
  }

  // ── Render asset summary ──
  function renderAssetInfo(data) {
    $assetInfo.innerHTML = `
      <strong>${esc(data.fileName)}</strong><br>
      <span class="tag">UE4 v${data.fileVersionUE4}</span>
      ${data.fileVersionUE5 ? `<span class="tag">UE5 v${data.fileVersionUE5}</span>` : ''}
      <span class="tag">Names: ${data.nameCount}</span>
      <span class="tag">Imports: ${data.importCount}</span>
      <span class="tag">Exports: ${data.exportCount}</span>
      ${data.packageName ? `<br><span style="color:var(--dim)">${esc(data.packageName)}</span>` : ''}
      <br><button id="btn-json" style="margin-top:4px;padding:2px 8px;background:var(--border);border:1px solid var(--dim);color:var(--accent);border-radius:3px;cursor:pointer;font-size:11px">Export JSON</button>
      <button id="btn-schema" style="margin-top:4px;padding:2px 8px;background:var(--border);border:1px solid var(--dim);color:var(--accent2);border-radius:3px;cursor:pointer;font-size:11px">生成数据结构</button>
      <button id="btn-preview" style="margin-top:4px;padding:2px 8px;background:var(--border);border:1px solid var(--dim);color:#e0af68;border-radius:3px;cursor:pointer;font-size:11px">🖼 视觉预览</button>
    `;
    document.getElementById('btn-json').addEventListener('click', () => {
      const clean = buildCleanTree(data.tree);
      const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = data.fileName.replace('.uasset', '') + '_tree.json';
      a.click();
    });
    document.getElementById('btn-schema').addEventListener('click', () => {
      const widgetRoots = extractWidgetTree(data.tree);
      const schema = generateDataSchema(data.fileName, widgetRoots.length > 0 ? widgetRoots : data.tree);
      showSchemaPanel(schema, data.fileName);
    });
    document.getElementById('btn-preview').addEventListener('click', () => {
      const widgetRoots = extractWidgetTree(data.tree);
      showVisualPreview(widgetRoots.length > 0 ? widgetRoots : data.tree, data.fileName);
    });
  }

  function buildCleanTree(nodes) {
    return nodes.map(n => {
      const obj = { class: n.className, name: n.name };
      if (n.children && n.children.length > 0) obj.children = buildCleanTree(n.children);
      return obj;
    });
  }

  // ── Render compact node tree ──
  /**
   * Extract the primary WidgetTree subtree (under WidgetBlueprint, not the Generated Class CDO).
   * Returns the children of the primary WidgetTree for a focused widget view.
   */
  function extractWidgetTree(roots) {
    // Prefer the WidgetTree under WidgetBlueprint
    for (const root of roots) {
      if (root.className === 'WidgetBlueprint' && root.children) {
        for (const child of root.children) {
          if (child.className === 'WidgetTree' && child.children && child.children.length > 0) {
            return child.children;
          }
        }
      }
    }
    // Fallback: find first WidgetTree anywhere (skip ones under GeneratedClass)
    const widgetChildren = [];
    function findFirst(nodes, parentClass) {
      for (const n of nodes) {
        if (n.className === 'WidgetTree' && parentClass !== 'WidgetBlueprintGeneratedClass' && n.children && n.children.length > 0) {
          widgetChildren.push(...n.children);
          return true;
        }
        if (n.children && findFirst(n.children, n.className)) return true;
      }
      return false;
    }
    findFirst(roots, '');
    return widgetChildren;
  }


  function createNodeEl(node, data, isRoot, colIdx) {
    const container = document.createElement('div');
    container.className = 'nt-node' + (isRoot ? ' nt-root' : '');

    const row = document.createElement('div');
    row.className = 'nt-row' + (node.blueprintRef ? ' has-ref' : '');

    const toggle = document.createElement('span');
    toggle.className = 'nt-toggle';
    const hasChildren = node.children && node.children.length > 0;
    toggle.textContent = hasChildren ? '▾' : ' ';

    const cls = document.createElement('span');
    cls.className = 'nt-class';
    cls.textContent = node.className;

    const name = document.createElement('span');
    name.className = 'nt-name';
    name.textContent = node.name;

    // Blueprint reference indicator
    if (node.blueprintRef) {
      const refIcon = document.createElement('span');
      refIcon.className = 'nt-ref-icon';
      refIcon.textContent = '→';
      refIcon.title = `展开: ${node.blueprintRef}`;
      refIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        openBlueprintRef(node.blueprintRef, colIdx);
      });
      row.appendChild(toggle);
      row.appendChild(cls);
      row.appendChild(name);
      row.appendChild(refIcon);
    } else {
      const size = document.createElement('span');
      size.className = 'nt-size';
      size.textContent = node.serialSize ? formatBytes(node.serialSize) : '';
      row.appendChild(toggle);
      row.appendChild(cls);
      row.appendChild(name);
      row.appendChild(size);
    }

    row.addEventListener('click', (e) => {
      e.stopPropagation();
      showNodeDetail(node, data);
      document.querySelectorAll('.nt-row.selected').forEach(el => el.classList.remove('selected'));
      row.classList.add('selected');
      // Double-click to expand blueprint ref
      if (node.blueprintRef) {
        openBlueprintRef(node.blueprintRef, colIdx);
      }
    });

    container.appendChild(row);

    if (hasChildren) {
      const childrenEl = document.createElement('div');
      childrenEl.className = 'nt-children';
      for (const child of node.children) {
        childrenEl.appendChild(createNodeEl(child, data, false, colIdx));
      }
      container.appendChild(childrenEl);

      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        childrenEl.classList.toggle('collapsed');
        toggle.textContent = childrenEl.classList.contains('collapsed') ? '▸' : '▾';
      });
    }

    return container;
  }

  // ── Node detail panel ──
  function showNodeDetail(node, data) {
    $rightPanel.classList.remove('hidden');
    const exp = data.exports.find(e => e.index === node.id);
    let html = '<dl>';
    html += `<dt>Name</dt><dd>${esc(node.name)}</dd>`;
    html += `<dt>Class</dt><dd>${esc(node.className)}</dd>`;
    html += `<dt>Export Index</dt><dd>${node.id}</dd>`;
    if (exp) {
      html += `<dt>Outer Index</dt><dd>${exp.outerIndex}</dd>`;
      html += `<dt>Serial Size</dt><dd>${formatBytes(exp.serialSize)}</dd>`;
    }
    html += `<dt>Children</dt><dd>${node.children ? node.children.length : 0}</dd>`;

    // Show resource references (textures, etc.)
    if (node.resourceRefs && node.resourceRefs.length > 0) {
      html += '</dl><div style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px">';
      html += '<div style="color:var(--dim);font-size:10px;margin-bottom:4px">引用资源</div>';
      for (const ref of node.resourceRefs) {
        html += `<div style="margin-bottom:10px">`;
        html += `<div style="font-size:11px;color:var(--accent2)">${esc(ref.class)}: ${esc(ref.name)}</div>`;
        if (ref.packagePath) {
          html += `<div style="font-size:10px;color:var(--accent);word-break:break-all;margin-bottom:4px">${esc(ref.packagePath)}</div>`;
          if (ref.class === 'Texture2D') {
            const previewUrl = `/api/texture-preview?path=${encodeURIComponent(ref.packagePath)}`;
            html += `<div class="texture-preview-wrap">`;
            html += `<img class="texture-preview" src="${previewUrl}" alt="${esc(ref.name)}" loading="lazy" onerror="this.parentNode.innerHTML='<span style=\\'color:var(--dim);font-size:10px\\'>预览不可用</span>'" />`;
            html += `</div>`;
          }
        }
        html += `</div>`;
      }
      html += '</div>';
    } else {
      html += '</dl>';
    }

    if (node.blueprintRef) {
      html += `<div style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px">`;
      html += `<div style="font-size:10px;color:var(--dim)">引用蓝图</div>`;
      html += `<div style="font-size:11px;color:var(--accent);word-break:break-all">${esc(node.blueprintRef)}</div>`;
      html += `</div>`;
    }

    $detailContent.innerHTML = html;
  }

  // ── Data structure schema generation ──
  const WIDGET_TYPE_MAP = {
    'TileView':     { dataType: 'TArray<UObject*>', desc: '列表数据项' },
    'ListView':     { dataType: 'TArray<UObject*>', desc: '列表数据项' },
    'TreeView':     { dataType: 'TArray<UObject*>', desc: '树形数据项' },
    'TextBlock':    { dataType: 'FText', desc: '显示文本' },
    'EditableText': { dataType: 'FText', desc: '可编辑文本' },
    'RichTextBlock':{ dataType: 'FText', desc: '富文本' },
    'Image':        { dataType: 'UTexture2D*', desc: '贴图资源' },
    'Button':       { dataType: 'bool', desc: '按钮可见/可用状态' },
    'CheckBox':     { dataType: 'bool', desc: '勾选状态' },
    'ProgressBar':  { dataType: 'float', desc: '进度值 0-1' },
    'Slider':       { dataType: 'float', desc: '滑块值' },
    'SpinBox':      { dataType: 'float', desc: '数值' },
    'ComboBoxString':{ dataType: 'FString', desc: '选中项' },
  };

  function generateDataSchema(fileName, roots) {
    const bpName = fileName.replace('.uasset', '');
    const fields = [];

    function walk(nodes) {
      for (const node of nodes) {
        const mapping = WIDGET_TYPE_MAP[node.className];
        if (mapping) {
          const field = {
            widgetName: node.name,
            widgetClass: node.className,
            dataType: mapping.dataType,
            desc: mapping.desc
          };
          // For Image: include current texture ref as default value
          if (node.className === 'Image' && node.resourceRefs && node.resourceRefs.length > 0) {
            field.defaultValue = node.resourceRefs[0].packagePath || '';
          }
          // For TileView/ListView: note entry class if available
          if ((node.className === 'TileView' || node.className === 'ListView' || node.className === 'TreeView') && node.blueprintRef) {
            field.entryWidgetClass = node.blueprintRef;
          }
          fields.push(field);
        }
        if (node.children) walk(node.children);
      }
    }
    walk(roots);

    return {
      blueprint: bpName,
      description: `${bpName} 界面数据结构 - 通过 JSON 序列化驱动 UI 显示`,
      fields
    };
  }

  function showSchemaPanel(schema, fileName) {
    // Show in right panel with copy/download actions
    $rightPanel.classList.remove('hidden');
    const jsonStr = JSON.stringify(schema, null, 2);
    let html = '<div style="margin-bottom:8px">';
    html += '<div style="color:var(--accent2);font-size:12px;font-weight:bold;margin-bottom:4px">数据结构</div>';
    html += `<div style="color:var(--dim);font-size:10px;margin-bottom:8px">${esc(schema.blueprint)} — ${schema.fields.length} 个数据字段</div>`;

    // Summary table
    html += '<table style="width:100%;font-size:11px;border-collapse:collapse;margin-bottom:8px">';
    html += '<tr style="color:var(--dim);text-align:left"><th style="padding:2px 4px">控件</th><th style="padding:2px 4px">类型</th><th style="padding:2px 4px">数据类型</th></tr>';
    for (const f of schema.fields) {
      html += `<tr style="border-top:1px solid var(--border)">`;
      html += `<td style="padding:3px 4px;color:var(--text)">${esc(f.widgetName)}</td>`;
      html += `<td style="padding:3px 4px;color:var(--accent)">${esc(f.widgetClass)}</td>`;
      html += `<td style="padding:3px 4px;color:var(--accent2)">${esc(f.dataType)}</td>`;
      html += `</tr>`;
    }
    html += '</table>';

    // JSON preview
    html += '<div style="color:var(--dim);font-size:10px;margin-bottom:4px">JSON</div>';
    html += `<pre class="schema-json">${esc(jsonStr)}</pre>`;

    // Action buttons
    html += '<div style="display:flex;gap:6px;margin-top:8px">';
    html += '<button id="btn-copy-schema" class="schema-btn">复制 JSON</button>';
    html += '<button id="btn-download-schema" class="schema-btn">下载</button>';
    html += '</div></div>';

    $detailContent.innerHTML = html;

    document.getElementById('btn-copy-schema').addEventListener('click', () => {
      navigator.clipboard.writeText(jsonStr).then(() => {
        document.getElementById('btn-copy-schema').textContent = '已复制 ✓';
        setTimeout(() => document.getElementById('btn-copy-schema').textContent = '复制 JSON', 1500);
      });
    });
    document.getElementById('btn-download-schema').addEventListener('click', () => {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = schema.blueprint + '_schema.json';
      a.click();
    });
  }

  // ── Visual UMG Preview ──
  const WIDGET_CATEGORY = {
    container:   ['Overlay', 'CanvasPanel', 'HorizontalBox', 'VerticalBox', 'GridPanel',
                  'WrapBox', 'ScrollBox', 'SizeBox', 'Border', 'WidgetSwitcher', 'SafeZone', 'UniformGridPanel'],
    interactive: ['Button', 'CheckBox', 'ComboBoxString', 'EditableText', 'EditableTextBox',
                  'SpinBox', 'Slider', 'MultiLineEditableText'],
    display:     ['TextBlock', 'RichTextBlock', 'Image', 'CircularThrobber', 'Throbber'],
    list:        ['TileView', 'ListView', 'TreeView'],
  };

  function widgetCategory(className) {
    const base = className.replace(/_C$/, '');
    for (const [cat, list] of Object.entries(WIDGET_CATEGORY)) {
      if (list.includes(base)) return cat;
    }
    return 'generic';
  }

  function widgetLayoutClass(className) {
    if (className === 'HorizontalBox')   return 'row';
    if (className === 'VerticalBox')     return 'col';
    if (className === 'GridPanel' || className === 'UniformGridPanel') return 'grid';
    return 'stack';
  }

  function buildWidgetPreviewEl(node, depth) {
    const type = node.className.replace(/_C$/, '');
    const cat  = widgetCategory(type);
    const el   = document.createElement('div');
    el.className = `vp-widget vp-${cat}`;
    el.title = `${node.className} : ${node.name}`;

    const label = document.createElement('div');
    label.className = 'vp-label';
    label.textContent = `${type}  ${node.name ? '| ' + node.name : ''}`;
    el.appendChild(label);

    if (node.children && node.children.length > 0) {
      const layout = widgetLayoutClass(type);
      const inner = document.createElement('div');
      inner.className = `vp-children vp-layout-${layout}`;
      for (const child of node.children) {
        inner.appendChild(buildWidgetPreviewEl(child, depth + 1));
      }
      el.appendChild(inner);
    }
    return el;
  }

  function showVisualPreview(roots, fileName) {
    const existing = document.getElementById('vp-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'vp-overlay';
    overlay.className = 'vp-overlay';

    const header = document.createElement('div');
    header.className = 'vp-header';
    header.innerHTML = `
      <span>🖼 视觉预览 — <span style="color:var(--text);font-weight:400">${esc(fileName)}</span></span>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:11px;color:var(--dim)">
          <span style="color:#7aa2f7">■</span> 容器
          <span style="color:#9ece6a;margin-left:6px">■</span> 交互
          <span style="color:#e0af68;margin-left:6px">■</span> 显示
          <span style="color:#bb9af7;margin-left:6px">■</span> 列表
        </span>
        <button class="vp-close-btn">✕ 关闭</button>
      </div>
    `;
    overlay.appendChild(header);

    const canvas = document.createElement('div');
    canvas.className = 'vp-canvas';
    for (const root of roots) {
      canvas.appendChild(buildWidgetPreviewEl(root, 0));
    }
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);

    header.querySelector('.vp-close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') overlay.remove(); });
    overlay.tabIndex = -1;
    overlay.focus();
  }

  // ── Helpers ──
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1024 / 1024).toFixed(1) + ' MB';
  }

  // ── Context menu + suggestions ──
  const $ctxMenu = document.getElementById('ctx-menu');
  const $ctxAdd = document.getElementById('ctx-add-suggestion');
  const $modalOverlay = document.getElementById('modal-overlay');
  const $modalNode = document.getElementById('modal-node');
  const $modalAsset = document.getElementById('modal-asset');
  const $modalContent = document.getElementById('modal-content');
  const $draftCount = document.getElementById('draft-count');
  const $draftsOverlay = document.getElementById('drafts-overlay');
  const $draftsList = document.getElementById('drafts-list');

  let ctxTarget = null; // { nodeName, nodeClass, assetFile }

  // Right-click on tree node rows
  document.addEventListener('contextmenu', (e) => {
    const row = e.target.closest('.nt-row');
    if (!row) { $ctxMenu.classList.add('hidden'); return; }
    e.preventDefault();

    const nameEl = row.querySelector('.nt-name');
    const clsEl = row.querySelector('.nt-class');
    ctxTarget = {
      nodeName: nameEl ? nameEl.textContent : '',
      nodeClass: clsEl ? clsEl.textContent : '',
      assetFile: currentFile || ''
    };

    $ctxMenu.style.left = e.clientX + 'px';
    $ctxMenu.style.top = e.clientY + 'px';
    $ctxMenu.classList.remove('hidden');
  });

  document.addEventListener('click', () => $ctxMenu.classList.add('hidden'));

  // Open suggestion modal
  $ctxAdd.addEventListener('click', () => {
    if (!ctxTarget) return;
    $ctxMenu.classList.add('hidden');
    $modalNode.value = `${ctxTarget.nodeClass} : ${ctxTarget.nodeName}`;
    $modalAsset.value = ctxTarget.assetFile;
    $modalContent.value = '';
    $modalOverlay.classList.remove('hidden');
    $modalContent.focus();
  });

  // Close modal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  function closeModal() { $modalOverlay.classList.add('hidden'); }

  // Save suggestion
  document.getElementById('modal-save').addEventListener('click', async () => {
    const content = $modalContent.value.trim();
    if (!content) { $modalContent.focus(); return; }
    try {
      await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetFile: ctxTarget.assetFile,
          nodeName: ctxTarget.nodeName,
          nodeClass: ctxTarget.nodeClass,
          content
        })
      });
      closeModal();
      refreshDraftCount();
    } catch (e) {
      alert('保存失败: ' + e.message);
    }
  });

  // Refresh draft count badge
  async function refreshDraftCount() {
    try {
      const res = await fetch('/api/suggestions');
      const list = await res.json();
      $draftCount.textContent = list.length;
    } catch { $draftCount.textContent = '?'; }
  }

  // Drafts panel
  document.getElementById('btn-drafts').addEventListener('click', showDrafts);

  async function showDrafts() {
    $draftsList.innerHTML = '<em>加载中...</em>';
    $draftsOverlay.classList.remove('hidden');
    try {
      const res = await fetch('/api/suggestions');
      const list = await res.json();
      if (list.length === 0) {
        $draftsList.innerHTML = '<div style="color:var(--dim)">暂无修改意见草稿</div>';
        return;
      }
      $draftsList.innerHTML = list.map(s => `
        <div class="draft-item" data-id="${esc(s.id)}">
          <div class="draft-item-header">
            <strong>${esc(s.nodeClass)} : ${esc(s.nodeName)}</strong>
            <button class="draft-item-delete" data-id="${esc(s.id)}">删除</button>
          </div>
          <p>${esc(s.content)}</p>
          <div class="draft-meta">${esc(s.assetFile)} — ${new Date(s.createdAt).toLocaleString()}</div>
        </div>
      `).join('');
      $draftsList.querySelectorAll('.draft-item-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          await fetch(`/api/suggestions/${id}`, { method: 'DELETE' });
          showDrafts();
          refreshDraftCount();
        });
      });
    } catch (e) {
      $draftsList.innerHTML = `<div style="color:#f7768e">加载失败: ${esc(e.message)}</div>`;
    }
  }

  document.getElementById('drafts-close').addEventListener('click', closeDrafts);
  document.getElementById('drafts-cancel').addEventListener('click', closeDrafts);
  function closeDrafts() { $draftsOverlay.classList.add('hidden'); }

  // Submit all suggestions
  async function submitAll() {
    if (!confirm('确定要将所有修改意见投递到 UMGEoolEx 任务队列？')) return;
    try {
      const res = await fetch('/api/submit', { method: 'POST' });
      const result = await res.json();
      if (result.ok) {
        alert(`已投递 ${result.count} 条意见 → ${result.file}`);
        closeDrafts();
        refreshDraftCount();
      } else {
        alert('投递失败: ' + (result.error || '未知错误'));
      }
    } catch (e) {
      alert('投递失败: ' + e.message);
    }
  }

  document.getElementById('btn-submit').addEventListener('click', submitAll);
  document.getElementById('drafts-submit').addEventListener('click', submitAll);

  // ── Init ──
  loadTree();
  refreshDraftCount();
})();
