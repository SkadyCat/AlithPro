const designCanvas = document.getElementById("design-canvas");
const canvasStatus = document.getElementById("canvas-status");
const selectionStatus = document.getElementById("selection-status");
const sessionStatus = document.getElementById("session-status");
const jsonOutput = document.getElementById("json-output");
const sessionList = document.getElementById("session-list");

const widthInput = document.getElementById("canvas-width");
const heightInput = document.getElementById("canvas-height");
const zoomInput = document.getElementById("canvas-zoom");
const resizeCanvasButton = document.getElementById("resize-canvas");
const deleteBoxButton = document.getElementById("delete-box");
const clearBoxesButton = document.getElementById("clear-boxes");
const copyJsonButton = document.getElementById("copy-json");
const downloadJsonButton = document.getElementById("download-json");
const newSessionButton = document.getElementById("new-session");
const saveSessionButton = document.getElementById("save-session");
const renameSessionButton = document.getElementById("rename-session");
const deleteSessionButton = document.getElementById("delete-session");
const sessionNameInput = document.getElementById("session-name");

const idInput = document.getElementById("box-id");
const kindInput = document.getElementById("box-kind");
const labelInput = document.getElementById("box-label");
const descriptionInput = document.getElementById("box-description");
const descriptionPreview = document.getElementById("box-description-preview");
const markdownButtons = Array.from(document.querySelectorAll("[data-md-token]"));
const boxContextMenu = document.getElementById("box-context-menu");
const contextDeleteBoxButton = document.getElementById("context-delete-box");

const STORAGE_KEY = "layout-annotator-sessions-v1";
const SNAP_GRID = 20;
const SNAP_THRESHOLD = 10;
const AUTO_SAVE_DELAY = 300;

const state = {
  canvasWidth: 1440,
  canvasHeight: 900,
  boxes: [],
  selectedId: null,
  draft: null,
  counter: 1,
  sessions: [],
  currentSessionId: null,
  interaction: null,
  zoom: 1
};

let descriptionEditor = null;
let autoSaveTimer = null;
let contextMenuBoxId = null;

function initializeDescriptionEditor() {
  if (!window.CodeMirror || !descriptionInput) {
    descriptionInput.style.display = "block";
    return;
  }

  descriptionEditor = window.CodeMirror.fromTextArea(descriptionInput, {
    mode: "markdown",
    lineNumbers: false,
    lineWrapping: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    viewportMargin: Infinity
  });
  descriptionEditor.on("change", (editor) => {
    descriptionInput.value = editor.getValue();
    descriptionInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function getDescriptionValue() {
  return descriptionEditor ? descriptionEditor.getValue() : descriptionInput.value;
}

function setDescriptionValue(value) {
  descriptionInput.value = value;
  if (descriptionEditor && descriptionEditor.getValue() !== value) {
    descriptionEditor.setValue(value);
  }
}

function focusDescriptionEditor() {
  if (descriptionEditor) {
    descriptionEditor.focus();
    return;
  }
  descriptionInput.focus();
}

function createSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createBoxId() {
  const value = `region-${String(state.counter).padStart(2, "0")}`;
  state.counter += 1;
  return value;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function snapCoordinate(value, max, targets) {
  let best = value;
  let bestDelta = SNAP_THRESHOLD + 1;
  const gridTarget = Math.round(value / SNAP_GRID) * SNAP_GRID;
  const gridDelta = Math.abs(value - gridTarget);

  if (gridDelta <= SNAP_THRESHOLD) {
    best = gridTarget;
    bestDelta = gridDelta;
  }

  for (const target of targets) {
    const delta = Math.abs(value - target);
    if (delta <= SNAP_THRESHOLD && delta < bestDelta) {
      best = target;
      bestDelta = delta;
    }
  }

  return clamp(Math.round(best), 0, max);
}

function canvasRect() {
  return designCanvas.getBoundingClientRect();
}

function pointerToCanvas(event) {
  const rect = canvasRect();
  const scaleX = state.canvasWidth / rect.width;
  const scaleY = state.canvasHeight / rect.height;
  return {
    x: clamp(Math.round((event.clientX - rect.left) * scaleX), 0, state.canvasWidth),
    y: clamp(Math.round((event.clientY - rect.top) * scaleY), 0, state.canvasHeight)
  };
}

function selectedBox() {
  return state.boxes.find((box) => box.id === state.selectedId) || null;
}

function boxById(id) {
  return state.boxes.find((box) => box.id === id) || null;
}

function currentSession() {
  return state.sessions.find((session) => session.id === state.currentSessionId) || null;
}

function serializeCurrentSession() {
  return {
    id: state.currentSessionId,
    name: sessionNameInput.value.trim() || "未命名 Session",
    updatedAt: new Date().toISOString(),
    layout: serializeLayout(),
    counter: state.counter,
    zoom: state.zoom
  };
}

function persistSessions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    sessions: state.sessions,
    currentSessionId: state.currentSessionId
  }));
}

function applySession(session) {
  const layout = session.layout || {};
  state.currentSessionId = session.id;
  state.canvasWidth = layout.canvas?.width || 1440;
  state.canvasHeight = layout.canvas?.height || 900;
  state.boxes = Array.isArray(layout.regions) ? layout.regions.map((box) => ({ ...box })) : [];
  state.selectedId = null;
  state.draft = null;
  state.counter = session.counter || state.boxes.length + 1;
  state.zoom = session.zoom || 1;
  widthInput.value = state.canvasWidth;
  heightInput.value = state.canvasHeight;
  zoomInput.value = String(state.zoom);
  sessionNameInput.value = session.name || "未命名 Session";
  sessionStatus.textContent = `当前：${session.name || "未命名 Session"}`;
  canvasStatus.textContent = `已载入 ${session.name || "未命名 Session"}`;
  render();
}

function renderSessionList() {
  sessionList.innerHTML = "";
  for (const session of state.sessions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `session-item${session.id === state.currentSessionId ? " active" : ""}`;
    button.innerHTML = `<strong>${session.name || "未命名 Session"}</strong><small>${new Date(session.updatedAt).toLocaleString()}</small>`;
    button.addEventListener("click", () => applySession(session));
    sessionList.appendChild(button);
  }
}

function renameCurrentSession(announce = true) {
  const session = currentSession();
  if (!session) {
    return;
  }

  session.name = sessionNameInput.value.trim() || "未命名 Session";
  session.updatedAt = new Date().toISOString();
  persistSessions();
  renderSessionList();
  sessionStatus.textContent = announce ? `已重命名：${session.name}` : `编辑中：${session.name}`;
  if (announce) {
    canvasStatus.textContent = `当前 session 已重命名为 ${session.name}`;
  }
}

function saveCurrentSession(options = {}) {
  const { announce = true, statusText = null } = options;
  const snapshot = serializeCurrentSession();
  const index = state.sessions.findIndex((session) => session.id === snapshot.id);
  if (index === -1) {
    state.sessions.unshift(snapshot);
  } else {
    state.sessions[index] = snapshot;
  }
  persistSessions();
  renderSessionList();
  sessionStatus.textContent = announce ? `已保存：${snapshot.name}` : `自动保存：${snapshot.name}`;
  if (statusText) {
    canvasStatus.textContent = statusText;
  } else if (announce) {
    canvasStatus.textContent = `Session ${snapshot.name} 已保存`;
  }
}

function scheduleAutoSave(statusText = "") {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  autoSaveTimer = window.setTimeout(() => {
    autoSaveTimer = null;
    saveCurrentSession({ announce: false, statusText });
  }, AUTO_SAVE_DELAY);
}

function removeBoxById(boxId, statusText) {
  const exists = state.boxes.some((box) => box.id === boxId);
  if (!exists) {
    return;
  }
  state.boxes = state.boxes.filter((box) => box.id !== boxId);
  if (state.selectedId === boxId) {
    state.selectedId = null;
  }
  canvasStatus.textContent = statusText;
  render();
  scheduleAutoSave(statusText);
}

function hideContextMenu() {
  if (!boxContextMenu) {
    return;
  }
  boxContextMenu.hidden = true;
  contextMenuBoxId = null;
}

function showContextMenu(clientX, clientY, boxId) {
  if (!boxContextMenu) {
    return;
  }
  contextMenuBoxId = boxId;
  boxContextMenu.hidden = false;
  const menuWidth = 156;
  const menuHeight = 52;
  const left = Math.min(clientX, window.innerWidth - menuWidth - 12);
  const top = Math.min(clientY, window.innerHeight - menuHeight - 12);
  boxContextMenu.style.left = `${Math.max(12, left)}px`;
  boxContextMenu.style.top = `${Math.max(12, top)}px`;
}

function createSession(name = "") {
  const session = {
    id: createSessionId(),
    name: name || `新建 Session ${state.sessions.length + 1}`,
    updatedAt: new Date().toISOString(),
    layout: {
      schema: "layout-annotation.v1",
        canvas: { width: 1440, height: 900 },
        regions: []
      },
    counter: 1,
    zoom: 1
  };
  state.sessions.unshift(session);
  persistSessions();
  renderSessionList();
  applySession(session);
}

function deleteCurrentSession() {
  if (!state.currentSessionId) {
    return;
  }
  state.sessions = state.sessions.filter((session) => session.id !== state.currentSessionId);
  if (state.sessions.length === 0) {
    createSession("默认 Session");
    return;
  }
  persistSessions();
  renderSessionList();
  applySession(state.sessions[0]);
}

function initializeSessions() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      state.sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
      state.currentSessionId = parsed.currentSessionId || null;
    } catch {
      state.sessions = [];
      state.currentSessionId = null;
    }
  }

  if (state.sessions.length === 0) {
    createSession("默认 Session");
    return;
  }

  renderSessionList();
  applySession(currentSession() || state.sessions[0]);
}

function updateInspector() {
  const box = selectedBox();
  if (!box) {
    selectionStatus.textContent = "未选中";
    idInput.value = "";
    kindInput.value = "";
    labelInput.value = "";
    setDescriptionValue("");
    descriptionPreview.innerHTML = "<p>未选中区域。</p>";
    return;
  }

  selectionStatus.textContent = `${box.id} · ${box.width} × ${box.height}`;
  idInput.value = box.id;
  kindInput.value = box.kind || "";
  labelInput.value = box.label || "";
  setDescriptionValue(box.description || "");
  descriptionPreview.innerHTML = renderMarkdown(box.description || "");
}

function serializeLayout() {
  return {
    schema: "layout-annotation.v1",
    canvas: {
      width: state.canvasWidth,
      height: state.canvasHeight
    },
    regions: state.boxes.map((box) => ({
      id: box.id,
      kind: box.kind || "",
      label: box.label || "",
      description: box.description || "",
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height
    }))
  };
}

function updateJson() {
  jsonOutput.textContent = JSON.stringify(serializeLayout(), null, 2);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function renderMarkdown(source) {
  const text = (source || "").trim();
  if (!text) {
    return "<p>在这里实时预览描述区的 Markdown 效果。</p>";
  }

  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return blocks.map((block) => {
    if (block.startsWith("```") && block.endsWith("```")) {
      const code = block.slice(3, -3).trim();
      return `<pre><code>${escapeHtml(code)}</code></pre>`;
    }

    const lines = block.split("\n");
    if (lines.every((line) => line.startsWith("- "))) {
      return `<ul>${lines.map((line) => `<li>${renderInlineMarkdown(line.slice(2))}</li>`).join("")}</ul>`;
    }

    const headingMatch = block.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      return `<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`;
    }

    return `<p>${renderInlineMarkdown(block).replace(/\n/g, "<br />")}</p>`;
  }).join("");
}

function boxStyle(box) {
  return {
    left: `${(box.x / state.canvasWidth) * 100}%`,
    top: `${(box.y / state.canvasHeight) * 100}%`,
    width: `${(box.width / state.canvasWidth) * 100}%`,
    height: `${(box.height / state.canvasHeight) * 100}%`
  };
}

function snapBoxPosition(box, nextX, nextY) {
  const maxX = Math.max(0, state.canvasWidth - box.width);
  const maxY = Math.max(0, state.canvasHeight - box.height);
  const xTargets = [0, maxX];
  const yTargets = [0, maxY];

  for (const other of state.boxes) {
    if (other.id === box.id) {
      continue;
    }

    xTargets.push(other.x, other.x + other.width, other.x - box.width, other.x + other.width - box.width);
    yTargets.push(other.y, other.y + other.height, other.y - box.height, other.y + other.height - box.height);
  }

  return {
    x: snapCoordinate(clamp(nextX, 0, maxX), maxX, xTargets),
    y: snapCoordinate(clamp(nextY, 0, maxY), maxY, yTargets)
  };
}

function render() {
  designCanvas.querySelectorAll(".layout-box").forEach((node) => node.remove());

  for (const box of state.boxes) {
    const node = document.createElement("button");
    node.type = "button";
    node.className = `layout-box${box.id === state.selectedId ? " selected" : ""}`;
    node.dataset.boxId = box.id;

    Object.assign(node.style, boxStyle(box));

    if (box.label) {
      const label = document.createElement("span");
      label.className = "layout-box-label";
      label.textContent = box.label;
      node.appendChild(label);
    }

    node.addEventListener("click", (event) => {
      event.stopPropagation();
      hideContextMenu();
      state.selectedId = box.id;
      canvasStatus.textContent = `已选中 ${box.id}`;
      updateInspector();
      updateJson();
      render();
    });

    node.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }
      event.stopPropagation();
      hideContextMenu();
      const pointer = pointerToCanvas(event);
      state.selectedId = box.id;
      state.interaction = {
        mode: "drag",
        boxId: box.id,
        offsetX: pointer.x - box.x,
        offsetY: pointer.y - box.y
      };
      canvasStatus.textContent = `正在拖拽 ${box.id}`;
      render();
    });

    node.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      state.selectedId = box.id;
      canvasStatus.textContent = `已选中 ${box.id}`;
      render();
      showContextMenu(event.clientX, event.clientY, box.id);
    });

    designCanvas.appendChild(node);
  }

  if (state.draft) {
    const draft = document.createElement("div");
    draft.className = "layout-box";
    draft.style.pointerEvents = "none";
    Object.assign(draft.style, boxStyle(state.draft));
    designCanvas.appendChild(draft);
  }

  designCanvas.style.width = `${Math.round(state.canvasWidth * state.zoom)}px`;
  designCanvas.style.height = `${Math.round(state.canvasHeight * state.zoom)}px`;
  updateInspector();
  updateJson();
  renderSessionList();
}

function commitDraft() {
  if (!state.draft || state.draft.width < 12 || state.draft.height < 12) {
    state.draft = null;
    render();
    return;
  }

  const box = {
    ...state.draft,
    id: createBoxId(),
    kind: "",
    label: "",
    description: ""
  };

  state.boxes.push(box);
  state.selectedId = box.id;
  state.draft = null;
  canvasStatus.textContent = `已创建 ${box.id}`;
  render();
}

designCanvas.addEventListener("pointerdown", (event) => {
  if (event.target !== designCanvas && !event.target.classList.contains("canvas-grid")) {
    return;
  }

  const start = pointerToCanvas(event);
  state.selectedId = null;
  state.interaction = {
    mode: "create",
    start
  };
  state.draft = {
    x: start.x,
    y: start.y,
    width: 0,
    height: 0
  };
  canvasStatus.textContent = "正在绘制新框";
  render();
});

window.addEventListener("pointermove", (event) => {
  if (!state.interaction) {
    return;
  }

  if (state.interaction.mode === "create" && state.draft) {
    const current = pointerToCanvas(event);
    const left = Math.min(state.interaction.start.x, current.x);
    const top = Math.min(state.interaction.start.y, current.y);
    const right = Math.max(state.interaction.start.x, current.x);
    const bottom = Math.max(state.interaction.start.y, current.y);

    state.draft = {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top
    };
    render();
    return;
  }

  if (state.interaction.mode === "drag") {
    const box = boxById(state.interaction.boxId);
    if (!box) {
      return;
    }
    const pointer = pointerToCanvas(event);
    const snapped = snapBoxPosition(
      box,
      pointer.x - state.interaction.offsetX,
      pointer.y - state.interaction.offsetY
    );
    box.x = snapped.x;
    box.y = snapped.y;
    canvasStatus.textContent = `正在拖拽 ${box.id} · ${box.x}, ${box.y}`;
    render();
  }
});

window.addEventListener("pointerup", () => {
  if (!state.interaction) {
    return;
  }

  if (state.interaction.mode === "create") {
    state.interaction = null;
    commitDraft();
    return;
  }

  if (state.interaction.mode === "drag") {
    const box = boxById(state.interaction.boxId);
    if (box) {
      canvasStatus.textContent = `已放置 ${box.id} · ${box.x}, ${box.y}`;
    }
    state.interaction = null;
    render();
  }
});

designCanvas.addEventListener("click", (event) => {
  hideContextMenu();
  if (event.target === designCanvas || event.target.classList.contains("canvas-grid")) {
    state.selectedId = null;
    canvasStatus.textContent = "拖拽空白区域创建新框";
    render();
  }
});

window.addEventListener("click", (event) => {
  if (boxContextMenu && !boxContextMenu.hidden && !boxContextMenu.contains(event.target)) {
    hideContextMenu();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideContextMenu();
  }
});

function bindField(input, key) {
  input.addEventListener("input", () => {
    const box = selectedBox();
    if (!box) {
      return;
    }
    const nextValue = key === "description" ? input.value : input.value.trim();
    if (key === "id") {
      box.id = nextValue || box.id;
      state.selectedId = box.id;
    } else {
      box[key] = nextValue;
    }
    render();
    scheduleAutoSave(key === "description" ? `描述已自动保存到 ${sessionNameInput.value.trim() || "未命名 Session"}` : "");
  });
}

bindField(idInput, "id");
bindField(kindInput, "kind");
bindField(labelInput, "label");
bindField(descriptionInput, "description");

function wrapSelection(before, after = before, fallback = "") {
  if (descriptionEditor) {
    const doc = descriptionEditor.getDoc();
    const selection = doc.getSelection() || fallback;
    if (!selection) {
      focusDescriptionEditor();
      return;
    }
    doc.replaceSelection(`${before}${selection}${after}`);
    focusDescriptionEditor();
    return;
  }

  const start = descriptionInput.selectionStart;
  const end = descriptionInput.selectionEnd;
  const value = descriptionInput.value;
  const selected = value.slice(start, end) || fallback;
  if (!selected) {
    descriptionInput.focus();
    return;
  }
  const nextValue = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
  descriptionInput.value = nextValue;
  descriptionInput.focus();
  descriptionInput.setSelectionRange(start + before.length, start + before.length + selected.length);
  descriptionInput.dispatchEvent(new Event("input", { bubbles: true }));
}

const markdownActions = {
  heading: () => wrapSelection("## ", "", ""),
  bold: () => wrapSelection("**", "**", ""),
  italic: () => wrapSelection("*", "*", ""),
  list: () => wrapSelection("- ", "", ""),
  code: () => wrapSelection("```\n", "\n```", "")
};

markdownButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const action = markdownActions[button.dataset.mdToken];
    if (action) {
      action();
    }
  });
});

resizeCanvasButton.addEventListener("click", () => {
  state.canvasWidth = Math.max(320, Number(widthInput.value) || 1440);
  state.canvasHeight = Math.max(320, Number(heightInput.value) || 900);
  state.zoom = Number(zoomInput.value) || 1;
  canvasStatus.textContent = `画布已更新为 ${state.canvasWidth} × ${state.canvasHeight}（${Math.round(state.zoom * 100)}%）`;
  render();
  scheduleAutoSave();
});

zoomInput.addEventListener("change", () => {
  state.zoom = Number(zoomInput.value) || 1;
  canvasStatus.textContent = `当前画布缩放 ${Math.round(state.zoom * 100)}%`;
  render();
  scheduleAutoSave();
});

deleteBoxButton.addEventListener("click", () => {
  if (!state.selectedId) {
    return;
  }
  hideContextMenu();
  removeBoxById(state.selectedId, "已删除选中框");
});

clearBoxesButton.addEventListener("click", () => {
  state.boxes = [];
  state.selectedId = null;
  canvasStatus.textContent = "已清空全部框";
  render();
  scheduleAutoSave();
});

copyJsonButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(JSON.stringify(serializeLayout(), null, 2));
  canvasStatus.textContent = "JSON 已复制到剪贴板";
});

downloadJsonButton.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(serializeLayout(), null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "layout-annotation.json";
  anchor.click();
  URL.revokeObjectURL(url);
  canvasStatus.textContent = "JSON 已下载";
});

sessionNameInput.addEventListener("input", () => {
  const session = currentSession();
  if (!session) {
    return;
  }
  renameCurrentSession(false);
});

newSessionButton.addEventListener("click", () => createSession());
saveSessionButton.addEventListener("click", () => saveCurrentSession());
renameSessionButton.addEventListener("click", () => renameCurrentSession(true));
deleteSessionButton.addEventListener("click", () => deleteCurrentSession());
contextDeleteBoxButton?.addEventListener("click", () => {
  if (!contextMenuBoxId) {
    return;
  }
  const boxId = contextMenuBoxId;
  hideContextMenu();
  removeBoxById(boxId, `已删除 ${boxId}`);
});

initializeDescriptionEditor();
initializeSessions();
