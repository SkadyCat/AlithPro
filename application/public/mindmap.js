// ─── Mind Map Engine ─────────────────────────────────────────────────────────
// Extracted from app.js — provides the mind map draft editor.
// Exposes window.MindMap for app.js integration.

(function () {
  "use strict";

  // ─── DOM refs (resolved once at load) ─────────────────────────────────────
  const canvas = document.getElementById("draft_mm_canvas");
  const scene  = document.getElementById("draft_mm_scene");
  const svg    = document.getElementById("draft_mm_svg");

  // ─── State ────────────────────────────────────────────────────────────────
  const _dm = {
    nodes: [], nextId: 1, selectedIds: new Set(), editingId: null,
    panX: 0, panY: 0, zoom: 1,
    drag: null, pan: null, ctxMenu: null,
    colors: [
      ["#6c63ff","#8b5cf6"],["#22d3ee","#06b6d4"],["#f472b6","#ec4899"],
      ["#a78bfa","#7c3aed"],["#34d399","#10b981"],["#fbbf24","#f59e0b"],
    ],
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function dmDepth(node) {
    let d = 0, n = node;
    while (n.parentId != null) {
      n = _dm.nodes.find(p => p.id === n.parentId);
      if (!n) break;
      d++;
    }
    return d;
  }

  function dmNodeColor(node) {
    return _dm.colors[dmDepth(node) % _dm.colors.length];
  }

  // ─── Parse / Serialize ────────────────────────────────────────────────────
  function dmParse(content) {
    if (!content || !content.trim()) {
      _dm.nodes = []; _dm.nextId = 1; _dm.panX = 0; _dm.panY = 0; _dm.zoom = 1;
      return;
    }
    try {
      const data = JSON.parse(content);
      _dm.nodes = Array.isArray(data.nodes) ? data.nodes : [];
      _dm.nextId = typeof data.nextId === "number" ? data.nextId : (_dm.nodes.reduce((m, n) => Math.max(m, n.id), 0) + 1);
      _dm.panX = data.panX || 0;
      _dm.panY = data.panY || 0;
      _dm.zoom = data.zoom || 1;
    } catch {
      _dm.nodes = [{ id: 1, x: 200, y: 200, title: content.slice(0, 200), parentId: null }];
      _dm.nextId = 2;
      _dm.panX = 0; _dm.panY = 0; _dm.zoom = 1;
    }
  }

  function dmSerialize() {
    return JSON.stringify({ nodes: _dm.nodes, nextId: _dm.nextId, panX: _dm.panX, panY: _dm.panY, zoom: _dm.zoom });
  }

  function dmToMarkdown() {
    const roots = _dm.nodes.filter(n => n.parentId == null);
    const lines = [];
    function walk(node, indent) {
      let label = node.title || "(空)";
      if (Array.isArray(node.messages) && node.messages.length > 0) {
        const refs = node.messages.map(m => {
          const src = m.fileName;
          const doc = src.replace(/\.md$/, "_doc.md");
          return `[${src}] [${doc}]`;
        });
        label += " " + refs.join(" ");
      }
      lines.push(`${"  ".repeat(indent)}- ${label}`);
      _dm.nodes.filter(c => c.parentId === node.id).forEach(c => walk(c, indent + 1));
    }
    roots.forEach(r => walk(r, 0));
    return lines.join("\n") || "(空思维导图)";
  }

  // ─── SVG gradient ─────────────────────────────────────────────────────────
  function dmEnsureGradient() {
    if (!svg) return;
    if (svg.querySelector("#dm-edge-gradient")) return;
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const lg = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    lg.id = "dm-edge-gradient";
    lg.setAttribute("gradientUnits", "userSpaceOnUse");
    const s1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    s1.setAttribute("offset", "0%"); s1.setAttribute("stop-color", "#6c63ff"); s1.setAttribute("stop-opacity", "0.7");
    const s2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    s2.setAttribute("offset", "100%"); s2.setAttribute("stop-color", "#a855f7"); s2.setAttribute("stop-opacity", "0.5");
    lg.append(s1, s2); defs.append(lg); svg.prepend(defs);
  }

  // ─── Position indicator (created once) ─────────────────────────────────────
  let _posIndicator = null;
  function dmEnsurePosIndicator() {
    if (_posIndicator || !canvas) return;
    _posIndicator = document.createElement("div");
    _posIndicator.className = "dm-pos-indicator";
    _posIndicator.textContent = "0, 0";
    canvas.append(_posIndicator);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  function dmRender() {
    if (!scene || !svg) return;
    scene.style.transform = `translate(${_dm.panX}px, ${_dm.panY}px) scale(${_dm.zoom})`;

    // Grid follows pan & zoom
    if (canvas) {
      const gs = 32 * _dm.zoom;
      canvas.style.backgroundSize = `${gs}px ${gs}px`;
      canvas.style.backgroundPosition = `${_dm.panX % gs}px ${_dm.panY % gs}px`;
    }

    // Update position indicator
    dmEnsurePosIndicator();
    if (_posIndicator && canvas) {
      const rect = canvas.getBoundingClientRect();
      const cx = (-_dm.panX + rect.width / 2) / _dm.zoom;
      const cy = (-_dm.panY + rect.height / 2) / _dm.zoom;
      _posIndicator.textContent = `${Math.round(cx)}, ${Math.round(cy)}`;
    }

    // Edges (right → left)
    while (svg.childElementCount > 1) svg.lastChild.remove();
    if (!svg.firstElementChild) dmEnsureGradient();

    for (const node of _dm.nodes) {
      if (node.parentId == null) continue;
      const parent = _dm.nodes.find(p => p.id === node.parentId);
      if (!parent) continue;
      const pw = 140, ph = 28;
      const x1 = parent.x + pw, y1 = parent.y + ph / 2;
      const x2 = node.x, y2 = node.y + ph / 2;
      const dx = Math.abs(x2 - x1) * 0.45;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`);
      path.setAttribute("class", "dm-edge");
      svg.append(path);
    }

    // Nodes
    const existingEls = scene.querySelectorAll(".dm-node");
    const elMap = new Map();
    existingEls.forEach(el => elMap.set(Number(el.dataset.id), el));

    const activeIds = new Set(_dm.nodes.map(n => n.id));
    elMap.forEach((el, id) => { if (!activeIds.has(id)) el.remove(); });

    for (const node of _dm.nodes) {
      let el = elMap.get(node.id);
      if (!el) {
        el = document.createElement("div");
        el.className = "dm-node";
        el.dataset.id = node.id;
        el.addEventListener("mousedown", (e) => { const n = _dm.nodes.find(n => n.id === Number(el.dataset.id)); if (n) dmNodeMouseDown(e, n); canvas?.focus(); });
        el.addEventListener("dblclick", (e) => { const n = _dm.nodes.find(n => n.id === Number(el.dataset.id)); if (n) { e.stopPropagation(); e.preventDefault(); if (typeof window.MindMap?.onNodeOpen === "function") { window.MindMap.onNodeOpen(n); } } });
        el.addEventListener("contextmenu", (e) => { const n = _dm.nodes.find(n => n.id === Number(el.dataset.id)); if (n) dmNodeCtx(e, n); });
        scene.append(el);
      }
      el.style.left = `${node.x}px`;
      el.style.top = `${node.y}px`;
      const [c1, c2] = dmNodeColor(node);
      el.style.setProperty("--dm-accent", `linear-gradient(180deg,${c1},${c2})`);
      el.classList.toggle("dm-selected", _dm.selectedIds.has(node.id));

      if (_dm.editingId !== node.id) {
        const hasMsgs = Array.isArray(node.messages) && node.messages.length > 0;
        const msgBadge = hasMsgs ? `<span class="dm-node-msg-badge" title="${node.messages.length} 条留言">💬 ${node.messages.length}</span>` : "";
        el.innerHTML = `<div class="dm-node-title">${escapeHtml(node.title || "新节点")}${msgBadge}</div>`
          + `<div class="dm-node-actions">`
          + `<span class="dm-node-btn dm-node-add" title="添加子节点">+</span>`
          + `<span class="dm-node-btn dm-node-del" title="删除">×</span>`
          + `</div>`;
        el.querySelector(".dm-node-add").addEventListener("click", (e) => {
          e.stopPropagation();
          const n = _dm.nodes.find(n => n.id === node.id);
          if (!n) return;
          const childCount = _dm.nodes.filter(c => c.parentId === n.id).length;
          dmAddNode(n.x + 200, n.y + childCount * 50, n.id);
        });
        el.querySelector(".dm-node-del").addEventListener("click", (e) => {
          e.stopPropagation();
          _dm.selectedIds.clear();
          _dm.selectedIds.add(node.id);
          dmDeleteSelected();
        });
      }
    }

    // Notify selection change
    if (typeof window.MindMap?.onSelectionChange === "function") {
      const selId = _dm.selectedIds.size === 1 ? [..._dm.selectedIds][0] : null;
      const selNode = selId != null ? _dm.nodes.find(n => n.id === selId) : null;
      window.MindMap.onSelectionChange(selNode);
    }
  }

  // ─── Node CRUD ────────────────────────────────────────────────────────────
  function dmAddNode(x, y, parentId = null, title = "", autoEdit = true) {
    const id = _dm.nextId++;
    _dm.nodes.push({ id, x, y, title: title || "新节点", parentId });
    _dm.selectedIds.clear();
    _dm.selectedIds.add(id);
    dmRender();
    if (autoEdit) dmStartEdit(_dm.nodes.find(n => n.id === id));
    return id;
  }

  function dmDeleteSelected() {
    if (_dm.editingId) return;
    const toDelete = new Set(_dm.selectedIds);
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of _dm.nodes) {
        if (!toDelete.has(n.id) && n.parentId != null && toDelete.has(n.parentId)) {
          toDelete.add(n.id);
          changed = true;
        }
      }
    }
    _dm.nodes = _dm.nodes.filter(n => !toDelete.has(n.id));
    _dm.selectedIds.clear();
    dmRender();
  }

  function dmStartEdit(node, evt) {
    if (evt) { evt.stopPropagation(); evt.preventDefault(); }
    _dm.editingId = node.id;
    _dm.selectedIds.clear();
    _dm.selectedIds.add(node.id);
    const el = scene?.querySelector(`.dm-node[data-id="${node.id}"]`);
    if (!el) return;
    el.classList.add("dm-editing");
    el.innerHTML = `<input class="dm-node-input" value="${escapeHtml(node.title || "")}" />`;
    const input = el.querySelector("input");
    input.focus();
    input.select();
    const finish = () => {
      node.title = input.value.trim() || "新节点";
      _dm.editingId = null;
      el.classList.remove("dm-editing");
      dmRender();
    };
    input.addEventListener("blur", finish);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); input.blur(); }
      if (e.key === "Escape") { input.value = node.title; input.blur(); }
      e.stopPropagation();
    });
  }

  // ─── Interaction handlers ─────────────────────────────────────────────────
  function dmNodeMouseDown(e, node) {
    if (e.button !== 0) return;
    if (_dm.editingId === node.id) return;
    e.stopPropagation();
    if (!e.ctrlKey && !e.metaKey) {
      if (!_dm.selectedIds.has(node.id)) _dm.selectedIds.clear();
      _dm.selectedIds.add(node.id);
    } else {
      if (_dm.selectedIds.has(node.id)) _dm.selectedIds.delete(node.id);
      else _dm.selectedIds.add(node.id);
    }
    dmRender();
    const startX = e.clientX, startY = e.clientY;
    const startPositions = _dm.nodes.filter(n => _dm.selectedIds.has(n.id)).map(n => ({ id: n.id, x: n.x, y: n.y }));
    const onMove = (me) => {
      const dx = (me.clientX - startX) / _dm.zoom;
      const dy = (me.clientY - startY) / _dm.zoom;
      for (const sp of startPositions) {
        const n = _dm.nodes.find(nd => nd.id === sp.id);
        if (n) { n.x = sp.x + dx; n.y = sp.y + dy; }
      }
      dmRender();
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function dmCanvasMouseDown(e) {
    if (e.target !== canvas && e.target !== scene && e.target !== svg) return;
    if (e.button !== 0) return;
    dmHideCtx();

    if (e.ctrlKey || e.metaKey) {
      // Ctrl+LMB = pan
      const startX = e.clientX, startY = e.clientY;
      const spx = _dm.panX, spy = _dm.panY;
      const onMove = (me) => {
        _dm.panX = spx + (me.clientX - startX);
        _dm.panY = spy + (me.clientY - startY);
        dmRender();
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        canvas.style.cursor = "default";
      };
      canvas.style.cursor = "grabbing";
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    } else {
      // Plain LMB = box select
      _dm.selectedIds.clear();
      dmRender();
      const cRect = canvas.getBoundingClientRect();
      const startX = e.clientX, startY = e.clientY;

      const selBox = document.createElement("div");
      selBox.className = "dm-select-box";
      canvas.append(selBox);

      const onMove = (me) => {
        const x1 = Math.min(startX, me.clientX) - cRect.left;
        const y1 = Math.min(startY, me.clientY) - cRect.top;
        const x2 = Math.max(startX, me.clientX) - cRect.left;
        const y2 = Math.max(startY, me.clientY) - cRect.top;
        selBox.style.left = `${x1}px`;
        selBox.style.top = `${y1}px`;
        selBox.style.width = `${x2 - x1}px`;
        selBox.style.height = `${y2 - y1}px`;

        // Select nodes whose screen-space bbox intersects the selection box
        _dm.selectedIds.clear();
        const nw = 140, nh = 28;
        for (const node of _dm.nodes) {
          const nx = node.x * _dm.zoom + _dm.panX;
          const ny = node.y * _dm.zoom + _dm.panY;
          const nx2 = (node.x + nw) * _dm.zoom + _dm.panX;
          const ny2 = (node.y + nh) * _dm.zoom + _dm.panY;
          if (nx2 >= x1 && nx <= x2 && ny2 >= y1 && ny <= y2) {
            _dm.selectedIds.add(node.id);
          }
        }
        dmRender();
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        selBox.remove();
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
  }

  function dmCanvasWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    _dm.zoom = Math.min(2, Math.max(0.3, _dm.zoom + delta));
    dmRender();
  }

  // ─── Context menus ────────────────────────────────────────────────────────
  function dmCanvasCtx(e) {
    if (e.target.closest(".dm-node")) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left - _dm.panX) / _dm.zoom;
    const cy = (e.clientY - rect.top - _dm.panY) / _dm.zoom;
    dmShowCtx(e.clientX, e.clientY, [
      { label: "✦ 添加节点", action: () => dmAddNode(cx - 70, cy - 14) },
    ]);
  }

  function dmNodeCtx(e, node) {
    e.preventDefault();
    e.stopPropagation();
    _dm.selectedIds.clear();
    _dm.selectedIds.add(node.id);
    dmRender();
    const items = [
      { label: "✦ 添加子节点", action: () => {
        const childCount = _dm.nodes.filter(c => c.parentId === node.id).length;
        dmAddNode(node.x + 200, node.y + childCount * 50, node.id);
      }},
      { label: "✎ 编辑", action: () => dmStartEdit(node) },
      { label: "📝 留言", action: () => {
        if (typeof window.MindMap?.onLeaveMessage === "function") {
          window.MindMap.onLeaveMessage(node, dmToMarkdown());
        }
      }},
      { label: "✕ 删除", action: () => { dmDeleteSelected(); }},
    ];
    dmShowCtx(e.clientX, e.clientY, items);
  }

  function dmShowCtx(x, y, items) {
    dmHideCtx();
    const menu = document.createElement("div");
    menu.className = "dm-ctx";
    for (const item of items) {
      const btn = document.createElement("div");
      btn.className = "dm-ctx-item";
      btn.textContent = item.label;
      btn.addEventListener("click", (e) => { e.stopPropagation(); dmHideCtx(); item.action(); });
      menu.append(btn);
    }
    document.body.append(menu);
    menu.style.left = `${Math.min(x, window.innerWidth - 180)}px`;
    menu.style.top = `${Math.min(y, window.innerHeight - items.length * 36 - 20)}px`;
    _dm.ctxMenu = menu;
    setTimeout(() => {
      const dismiss = (ev) => { if (!menu.contains(ev.target)) { dmHideCtx(); document.removeEventListener("mousedown", dismiss); } };
      document.addEventListener("mousedown", dismiss);
    }, 0);
  }

  function dmHideCtx() {
    if (_dm.ctxMenu) { _dm.ctxMenu.remove(); _dm.ctxMenu = null; }
  }

  // ─── Keyboard ─────────────────────────────────────────────────────────────
  function dmKeyDown(e) {
    if (_dm.editingId) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      dmDeleteSelected();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      e.stopImmediatePropagation();
      const sel = _dm.selectedIds.size === 1 ? _dm.nodes.find(n => n.id === [..._dm.selectedIds][0]) : null;
      if (sel) {
        const childCount = _dm.nodes.filter(c => c.parentId === sel.id).length;
        dmAddNode(sel.x + 200, sel.y + childCount * 50, sel.id, "", false);
        // Keep parent node selected instead of the new child
        _dm.selectedIds.clear();
        _dm.selectedIds.add(sel.id);
        dmRender();
      }
    }
    if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      _dm.selectedIds = new Set(_dm.nodes.map(n => n.id));
      dmRender();
    }
    if (e.key === "F2") {
      e.preventDefault();
      const sel = _dm.selectedIds.size === 1 ? _dm.nodes.find(n => n.id === [..._dm.selectedIds][0]) : null;
      if (sel) dmStartEdit(sel);
    }
  }

  // ─── Bind events ──────────────────────────────────────────────────────────
  if (canvas) {
    canvas.addEventListener("mousedown", dmCanvasMouseDown);
    canvas.addEventListener("wheel", dmCanvasWheel, { passive: false });
    canvas.addEventListener("contextmenu", dmCanvasCtx);
    canvas.addEventListener("keydown", dmKeyDown);
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  window.MindMap = {
    state: _dm,
    parse: dmParse,
    serialize: dmSerialize,
    toMarkdown: dmToMarkdown,
    render: dmRender,
    ensureGradient: dmEnsureGradient,
    hideCtx: dmHideCtx,
    canvas,
  };
})();
