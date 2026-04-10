function createDefaultBucketFilters() {
  return {
    drafts: "latest6",
    sessions: "latest6",
    inprocess: "latest6",
    processed: "latest6",
  };
}

const CLIENT_MODEL_OPTIONS = [
  { value: "claude-sonnet-4.6", label: "Claude Sonnet 4.6 (default)" },
  { value: "claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
  { value: "claude-haiku-4.5", label: "Claude Haiku 4.5" },
  { value: "claude-opus-4.6", label: "Claude Opus 4.6" },
  { value: "claude-opus-4.6-fast", label: "Claude Opus 4.6 (fast mode)" },
  { value: "claude-opus-4.5", label: "Claude Opus 4.5" },
  { value: "claude-sonnet-4", label: "Claude Sonnet 4" },
  { value: "gpt-5.4", label: "GPT-5.4" },
  { value: "gpt-5.3-codex", label: "GPT-5.3-Codex" },
  { value: "gpt-5.2-codex", label: "GPT-5.2-Codex" },
  { value: "gpt-5.2", label: "GPT-5.2" },
  { value: "gpt-5.1", label: "GPT-5.1" },
  { value: "gpt-5.4-mini", label: "GPT-5.4 mini" },
  { value: "gpt-5-mini", label: "GPT-5 mini" },
  { value: "gpt-4.1", label: "GPT-4.1" },
];

function buildModelCatalog(catalog = {}) {
  const modelOptions = Array.isArray(catalog?.modelOptions) && catalog.modelOptions.length
    ? catalog.modelOptions
    : CLIENT_MODEL_OPTIONS;
  const presets = Array.isArray(catalog?.presets) && catalog.presets.length
    ? catalog.presets
    : modelOptions.map((entry) => entry.value);
  const defaultModel = catalog?.defaultModel || modelOptions[0]?.value || "";
  return { presets, modelOptions, defaultModel };
}

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  workspaces: [],
  currentWorkspace: "",
  currentSummary: null,
  modelCatalog: buildModelCatalog(),
  selectedItem: null,
  bucketFilters: createDefaultBucketFilters(),
  bucketFiltersByWorkspace: {},
  refreshTimer: null,
  contextMenu: null,
  openDraft: null,
  draggedDraft: null,
  chainRootMap: new Map(),
  rootsWithSubtasks: new Set(),
};

const DEV_WORKSPACE = "Alith";
const pageMode = document.body?.dataset?.page || "";
const isDevPage = pageMode === "dev" || window.location.pathname.toLowerCase() === "/dev";

// ─── DOM refs ────────────────────────────────────────────────────────────────
const workspaceList        = document.getElementById("workspace_list");
const workspaceForm        = document.getElementById("workspace_form");
const workspaceInput       = document.getElementById("workspace_name");
const currentWorkspaceName = document.getElementById("current_workspace_name");
const refreshButton        = document.getElementById("refresh_button");
const runAgentButton       = document.getElementById("run_agent_button");
const useProxyCheckbox     = document.getElementById("use_proxy_checkbox");
const saveModelButton      = document.getElementById("save_model_button");
const modelInput           = document.getElementById("model_input");
const newDraftButton       = document.getElementById("new_draft_button");
const newWorkflowButton    = document.getElementById("new_workflow_button");
const chatForm             = document.getElementById("chat_form");
const chatInput            = document.getElementById("chat_input");
const searchInput          = document.getElementById("search_input");
const searchButton         = document.getElementById("search_button");
const searchResults        = document.getElementById("search_results");
const detailPanel          = document.getElementById("detail_panel");
const detailTitle          = document.getElementById("detail_title");
const leftMenu             = document.getElementById("left_menu");
const toast                = document.getElementById("toast");
const draftModal           = document.getElementById("draft_modal");
const draftCloseButton     = document.getElementById("draft_close_button");
const draftSaveButton      = document.getElementById("draft_save_button");
const draftPromoteButton   = document.getElementById("draft_promote_button");
const draftModalMeta       = document.getElementById("draft_modal_meta");
const draftMMCanvas        = window.MindMap?.canvas;
const newMMModal           = document.getElementById("new_mm_modal");
const newMMTitle           = document.getElementById("new_mm_title");
const newMMCreate          = document.getElementById("new_mm_create");
const newMMCancel          = document.getElementById("new_mm_cancel");
const workflowModal        = document.getElementById("workflow_modal");
const workflowModalTitle   = document.getElementById("workflow_modal_title");
const workflowModalMeta    = document.getElementById("workflow_modal_meta");
const workflowCanvas       = document.getElementById("workflow_canvas");
const workflowNodes        = document.getElementById("workflow_nodes");
const workflowCanvasEmpty  = document.getElementById("workflow_canvas_empty");
const workflowCloseButton  = document.getElementById("workflow_close_button");
const workflowSaveButton   = document.getElementById("workflow_save_button");
const workflowNewNodeButton = document.getElementById("workflow_new_node_button");
const workflowPlaceNodeButton = document.getElementById("workflow_place_node_button");
const contentModal         = document.getElementById("content_modal");
const contentModalClose    = document.getElementById("content_modal_close");
const contentModalTitle    = document.getElementById("content_modal_title");
const contentModalEyebrow  = document.getElementById("content_modal_eyebrow");
const contentModalMeta     = document.getElementById("content_modal_meta");
const contentModalBody     = document.getElementById("content_modal_body");
const subtaskModal         = document.getElementById("subtask_modal");
const subtaskModalMeta     = document.getElementById("subtask_modal_meta");
const subtaskModalInput    = document.getElementById("subtask_modal_input");
const subtaskModalClose    = document.getElementById("subtask_modal_close");
const subtaskModalSubmit   = document.getElementById("subtask_modal_submit");

const contextMenu = document.createElement("div");
contextMenu.className = "context-menu hidden";
contextMenu.hidden = true;
document.body.appendChild(contextMenu);

const bucketContainers = {
  drafts:    document.getElementById("drafts_cards"),
  sessions:  document.getElementById("sessions_cards"),
  inprocess: document.getElementById("inprocess_cards"),
  processed: document.getElementById("processed_cards"),
  workflows: document.getElementById("workflows_cards"),
};
const countEls = {
  drafts:    document.getElementById("count_drafts"),
  sessions:  document.getElementById("count_sessions"),
  inprocess: document.getElementById("count_inprocess"),
  processed: document.getElementById("count_processed"),
  workflows: document.getElementById("count_workflows"),
};
const statEls = {
  drafts:    document.getElementById("stat_drafts"),
  sessions:  document.getElementById("stat_sessions"),
  inprocess: document.getElementById("stat_inprocess"),
  processed: document.getElementById("stat_processed"),
  workflows: document.getElementById("stat_workflows"),
  docs:      document.getElementById("stat_docs"),
};
const bucketFilterSelects = Object.fromEntries(
  Array.from(document.querySelectorAll("[data-bucket-filter]")).map((element) => [element.dataset.bucketFilter, element])
);
let workflowManager = null;

// ─── Utilities ───────────────────────────────────────────────────────────────
async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "请求失败。");
  return data;
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatTime(value) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function ensureWorkspaceBucketFilters(workspace) {
  const key = String(workspace || "").trim();
  if (!key) {
    return createDefaultBucketFilters();
  }
  if (!state.bucketFiltersByWorkspace[key]) {
    state.bucketFiltersByWorkspace[key] = createDefaultBucketFilters();
  }
  return state.bucketFiltersByWorkspace[key];
}

function getBucketFilterLabel(filterValue) {
  return {
    all: "全部",
    latest6: "最近6个",
  }[normalizeBucketFilter(filterValue)];
}

function normalizeBucketFilter(value) {
  return ["all", "latest6"].includes(value) ? value : "latest6";
}

function getFilteredBucketItems(bucket, items) {
  const filter = normalizeBucketFilter(state.bucketFilters?.[bucket]);
  if (filter === "all") return items;

  if (bucket === "processed") {
    // Chains (multi-member): always show all members in full.
    // Standalones (no chain): show latest 6 only.
    const childrenOf = new Set(items.filter((i) => i.subtaskParent).map((i) => i.subtaskParent));
    const isChained = (item) => Boolean(item.subtaskParent) || childrenOf.has(item.fileName);
    const standalones = items.filter((i) => !isChained(i));
    const chainItems  = items.filter((i) =>  isChained(i));
    return [...standalones.slice(-6), ...chainItems];
  }

  return items.slice(-6);
}

function getBucketItems(summary, bucket) {
  if (bucket === "workflows") {
    return summary?.workflows || [];
  }
  return summary?.buckets?.[bucket] || [];
}

function getBucketCountText(bucket, totalCount, filteredCount) {
  const filter = normalizeBucketFilter(state.bucketFilters?.[bucket]);
  if (filter === "all" || totalCount === filteredCount) {
    return String(totalCount);
  }
  return `${filteredCount}/${totalCount}`;
}

function getBucketEmptyText(bucket) {
  if (bucket === "workflows") {
    return "暂无任务流，可在导图卡片右键转换，或点击右上角新建。";
  }
  const filter = normalizeBucketFilter(state.bucketFilters?.[bucket]);
  if (filter === "all") {
    return bucket === "drafts" ? "暂无思维导图，点击右上角“新建导图”开始。" : "暂无文档";
  }
  return bucket === "drafts"
    ? `当前“${getBucketFilterLabel(filter)}”范围暂无导图。`
    : `当前“${getBucketFilterLabel(filter)}”范围暂无文档。`;
}

function syncBucketFilters() {
  Object.entries(bucketFilterSelects).forEach(([bucket, select]) => {
    if (!select) {
      return;
    }
    select.value = normalizeBucketFilter(state.bucketFilters?.[bucket]);
  });
}

function getAvailableWorkflowDocuments(summary = state.currentSummary) {
  return (summary?.workflows || []).map((item) => ({
    bucket: "workflow",
    fileName: item.fileName,
    title: item.title || item.fileName,
  }));
}

function extractDraftTitle(content, fallback) {
  const text = String(content || "");
  // Mind map JSON: extract root node title
  if (text.trimStart().startsWith("{")) {
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data.nodes)) {
        const root = data.nodes.find(n => n.parentId == null);
        if (root?.title) return `🧠 ${root.title}`;
        return `🧠 ${fallback}`;
      }
    } catch { /* not JSON, fall through */ }
  }
  // Also handle truncated JSON preview from server
  if (text.trimStart().startsWith('{"nodes"')) {
    const m = text.match(/"title"\s*:\s*"([^"]+)"/);
    if (m) return `🧠 ${m[1]}`;
    return `🧠 ${fallback}`;
  }
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const heading = lines.find((line) => line.startsWith("#"));
  if (heading) {
    return heading.replace(/^#+\s*/, "").trim() || fallback;
  }
  return lines[0] || fallback;
}

function renderInlineMarkdown(text) {
  return esc(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function buildMindmapPreview(jsonText) {
  try {
    const data = JSON.parse(jsonText);
    if (!Array.isArray(data.nodes) || data.nodes.length === 0) return "空思维导图";
    const count = data.nodes.length;
    const roots = data.nodes.filter(n => n.parentId == null);
    const titles = data.nodes.slice(0, 4).map(n => n.title || "新节点").join(" · ");
    return `${count} 个节点 · ${titles}`;
  } catch {
    return "";
  }
}

function renderMarkdown(markdown) {
  const source = String(markdown || "").replace(/\r/g, "");
  if (!source.trim()) {
    return "";
  }

  const lines = source.split("\n");
  let html = "";
  let inCode = false;
  let codeBuffer = [];
  let listType = "";
  let listBuffer = [];
  let paragraph = [];
  let blockquote = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html += `<p>${paragraph.map((line) => renderInlineMarkdown(line)).join("<br />")}</p>`;
    paragraph = [];
  }

  function flushList() {
    if (!listType || !listBuffer.length) return;
    const tag = listType === "ol" ? "ol" : "ul";
    html += `<${tag}>${listBuffer.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</${tag}>`;
    listBuffer = [];
    listType = "";
  }

  function flushBlockquote() {
    if (!blockquote.length) return;
    html += `<blockquote>${blockquote.map((line) => renderInlineMarkdown(line)).join("<br />")}</blockquote>`;
    blockquote = [];
  }

  function flushCode() {
    if (!inCode) return;
    html += `<pre><code>${esc(codeBuffer.join("\n"))}</code></pre>`;
    codeBuffer = [];
    inCode = false;
  }

  lines.forEach((line) => {
    if (line.startsWith("```")) {
      flushParagraph();
      flushList();
      flushBlockquote();
      if (inCode) {
        flushCode();
      } else {
        inCode = true;
      }
      return;
    }

    if (inCode) {
      codeBuffer.push(line);
      return;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushBlockquote();
      return;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      flushBlockquote();
      const level = heading[1].length;
      html += `<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`;
      return;
    }

    if (/^---+$/.test(line.trim())) {
      flushParagraph();
      flushList();
      flushBlockquote();
      html += "<hr />";
      return;
    }

    const unordered = line.match(/^\s*[-*]\s+(.*)$/);
    if (unordered) {
      flushParagraph();
      flushBlockquote();
      if (listType && listType !== "ul") {
        flushList();
      }
      listType = "ul";
      listBuffer.push(unordered[1]);
      return;
    }

    const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ordered) {
      flushParagraph();
      flushBlockquote();
      if (listType && listType !== "ol") {
        flushList();
      }
      listType = "ol";
      listBuffer.push(ordered[1]);
      return;
    }

    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      blockquote.push(quote[1]);
      return;
    }

    flushList();
    flushBlockquote();
    paragraph.push(line);
  });

  flushParagraph();
  flushList();
  flushBlockquote();
  flushCode();
  return html;
}

async function copyText(value) {
  const text = String(value || "");
  if (!text) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "readonly");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
}

function hideContextMenu() {
  state.contextMenu = null;
  contextMenu.hidden = true;
  contextMenu.classList.add("hidden");
  contextMenu.innerHTML = "";
}

function showContextMenu(event, items = []) {
  const visibleItems = items.filter((item) => !item.hidden);
  if (!visibleItems.length) {
    hideContextMenu();
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  contextMenu.innerHTML = "";
  visibleItems.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `context-menu-item${item.danger ? " danger" : ""}`;
    button.textContent = item.label;
    button.disabled = Boolean(item.disabled);
    if (!item.disabled) {
      button.addEventListener("click", async () => {
        hideContextMenu();
        await item.onSelect();
      });
    }
    contextMenu.appendChild(button);
  });

  contextMenu.hidden = false;
  contextMenu.classList.remove("hidden");
  contextMenu.style.left = "0px";
  contextMenu.style.top = "0px";

  const menuWidth = contextMenu.offsetWidth;
  const menuHeight = contextMenu.offsetHeight;
  const maxLeft = window.innerWidth - menuWidth - 8;
  const maxTop = window.innerHeight - menuHeight - 8;
  const left = Math.max(8, Math.min(event.clientX, maxLeft));
  const top = Math.max(8, Math.min(event.clientY, maxTop));
  contextMenu.style.left = `${left}px`;
  contextMenu.style.top = `${top}px`;
  state.contextMenu = { left, top };
}

// ─── Mind Map (loaded from mindmap.js) ───────────────────────────────────────
const _dm = window.MindMap?.state;
const dmParse = window.MindMap?.parse;
const dmSerialize = window.MindMap?.serialize;
const dmToMarkdown = window.MindMap?.toMarkdown;
const dmRender = window.MindMap?.render;
const dmEnsureGradient = window.MindMap?.ensureGradient;
const dmHideCtx = window.MindMap?.hideCtx;

// ─── 留言 (Leave Message) modal + node-message binding ──────────────────────

function dmBuildNodePath(node) {
  const parts = [];
  let cur = node;
  while (cur) {
    parts.unshift(cur.title || "(空)");
    cur = cur.parentId != null ? _dm.nodes.find(n => n.id === cur.parentId) : null;
  }
  return parts.join(" > ");
}

// Build a numbered knowledge outline for the message document.
// Shows prior knowledge based on behavior-tree execution semantics.
// Seq nodes: only children up to and including the path-child are shown
// (later siblings haven't been reached yet).
// Sel nodes on path: included, but only the path-relevant branch is expanded.
// Format: N. section headers, N.X sub-items (depth-first flattened).
function dmBuildKnowledgeOutline(targetNode) {
  if (!_dm || !_dm.nodes || !targetNode) return "(无前置知识)";
  const ancestors = [];
  let cur = targetNode;
  while (cur) {
    ancestors.unshift(cur);
    cur = cur.parentId != null ? _dm.nodes.find(n => n.id === cur.parentId) : null;
  }
  const pathIds = new Set(ancestors.map(n => n.id));
  if (ancestors.length < 2) return "(无前置知识)";

  const lines = [];
  let sec = 0, sub = 0;

  function nodeText(node) {
    let t = node.title || "(空)";
    if (Array.isArray(node.messages) && node.messages.length > 0) {
      for (const m of node.messages) {
        t += ` 需求文档: [${m.fileName}] 交付文档: [${m.fileName.replace(/\.md$/, "_doc.md")}]`;
      }
    }
    return t;
  }

  // Return visible children of a parent, respecting BT execution semantics.
  // Sel parent → only the path-relevant child. Seq/other → children up to path-child.
  function visChildren(parentId) {
    const parent = _dm.nodes.find(n => n.id === parentId);
    const children = _dm.nodes.filter(c => c.parentId === parentId);
    if (parent && parent.type === "sel") {
      const pc = children.find(c => pathIds.has(c.id));
      return pc ? [pc] : [];
    }
    const result = [];
    for (const c of children) {
      result.push(c);
      if (pathIds.has(c.id)) break;
    }
    return result;
  }

  function flatSub(node) {
    sub++;
    lines.push(`  ${sec}.${sub} ${nodeText(node)}`);
    for (const c of visChildren(node.id)) flatSub(c);
  }

  const mainNode = ancestors[1];
  const topChildren = visChildren(mainNode.id);

  sec = 1; sub = 0;
  lines.push(`${sec}. ${mainNode.title || "(空)"}`);

  let first = true;
  for (const child of topChildren) {
    if (first) {
      flatSub(child);
      first = false;
    } else {
      sec++; sub = 0;
      lines.push(`${sec}. ${nodeText(child)}`);
      for (const gc of visChildren(child.id)) flatSub(gc);
    }
  }

  return lines.join("\n") || "(无前置知识)";
}

function dmShowMsgModal(title, placeholder, onSubmit) {
  const backdrop = document.createElement("div");
  backdrop.className = "dm-msg-backdrop";
  backdrop.innerHTML = `
    <div class="dm-msg-modal">
      <div class="dm-msg-header">
        <span class="dm-msg-title">${esc(title)}</span>
        <span class="dm-msg-close">×</span>
      </div>
      <textarea class="dm-msg-input" placeholder="${esc(placeholder)}"></textarea>
      <div class="dm-msg-footer">
        <button class="dm-msg-btn dm-msg-cancel">取消</button>
        <button class="dm-msg-btn dm-msg-submit">发送</button>
      </div>
    </div>`;
  document.body.append(backdrop);
  const input = backdrop.querySelector(".dm-msg-input");
  input.focus();
  const close = () => backdrop.remove();
  backdrop.querySelector(".dm-msg-close").addEventListener("click", close);
  backdrop.querySelector(".dm-msg-cancel").addEventListener("click", close);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector(".dm-msg-submit").addEventListener("click", () => {
    const text = input.value.trim();
    if (!text) return;
    close();
    onSubmit(text);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const text = input.value.trim();
      if (text) { close(); onSubmit(text); }
    }
    e.stopPropagation();
  });
}

async function dmFetchNodeMessages(node) {
  if (!state.currentWorkspace || !Array.isArray(node.messages)) return [];
  const items = [];
  for (const msg of node.messages) {
    for (const bucket of ["sessions", "inprocess", "processed"]) {
      try {
        const data = await fetchJson(
          `/api/workspaces/${encodeURIComponent(state.currentWorkspace)}/item?bucket=${bucket}&file=${encodeURIComponent(msg.fileName)}`
        );
        items.push({ ...msg, bucket, content: data.content, docContent: data.linkedDocContent || null });
        break;
      } catch { /* not found in this bucket */ }
    }
  }
  return items;
}

function dmShowNodeViewer(node, messages) {
  const backdrop = document.createElement("div");
  backdrop.className = "dm-msg-backdrop";
  const path = dmBuildNodePath(node);
  let listHTML = "";
  if (messages.length === 0) {
    listHTML = `<div class="dm-msg-empty">暂无留言</div>`;
  } else {
    for (const m of messages) {
      const statusLabel = m.bucket === "processed" ? "✅ 已处理" : m.bucket === "inprocess" ? "⏳ 处理中" : "📨 待处理";
      const lines = String(m.content || "").split("\n");
      const reqLine = lines.find(l => /你需要做[:：]/.test(l)) || lines[0] || "";
      const reqText = reqLine.replace(/.*你需要做[:：]\s*/, "").trim() || reqLine;
      const docSection = m.docContent
        ? `<div class="dm-msg-doc"><div class="dm-msg-doc-label">处理结果</div><pre class="dm-msg-doc-pre">${esc(m.docContent)}</pre></div>`
        : "";
      listHTML += `<div class="dm-msg-item"><div class="dm-msg-item-header"><span class="dm-msg-item-status">${statusLabel}</span><span class="dm-msg-item-file">${esc(m.fileName)}</span></div><div class="dm-msg-item-text">${esc(reqText)}</div>${docSection}</div>`;
    }
  }
  backdrop.innerHTML = `
    <div class="dm-msg-modal dm-msg-viewer">
      <div class="dm-msg-header">
        <span class="dm-msg-title">📋 ${esc(node.title || "节点")} 的留言</span>
        <span class="dm-msg-close">×</span>
      </div>
      <div class="dm-msg-path">${esc(path)}</div>
      <div class="dm-msg-list">${listHTML}</div>
      <div class="dm-msg-footer">
        <button class="dm-msg-btn dm-msg-new">+ 新留言</button>
        <button class="dm-msg-btn dm-msg-cancel">关闭</button>
      </div>
    </div>`;
  document.body.append(backdrop);
  const close = () => backdrop.remove();
  backdrop.querySelector(".dm-msg-close").addEventListener("click", close);
  backdrop.querySelector(".dm-msg-cancel").addEventListener("click", close);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector(".dm-msg-new").addEventListener("click", () => {
    close();
    if (typeof window.MindMap?.onLeaveMessage === "function") {
      window.MindMap.onLeaveMessage(node, dmToMarkdown());
    }
  });
}

if (window.MindMap) {
  window.MindMap.onLeaveMessage = (node, treeMarkdown) => {
    if (!state.currentWorkspace) {
      showToast("请先选择 Workspace。", "error");
      return;
    }
    dmShowMsgModal(`📝 留言 — ${node.title || "节点"}`, "请输入留言内容…（Ctrl+Enter 发送）", async (message) => {
      const content =
        `我们目前需要解决的是: ${message}\n` +
        `你在解决这个问题之前，你已经具备了以下知识：\n` +
        `${dmBuildKnowledgeOutline(node)}\n\n` +
        `你需要从这个链路去收束你的思考范围。\n`;
      try {
        const result = await fetchJson(
          `/api/workspaces/${encodeURIComponent(state.currentWorkspace)}/tasks`,
          { method: "POST", body: JSON.stringify({ content }) }
        );
        if (!Array.isArray(node.messages)) node.messages = [];
        node.messages.push({ fileName: result.fileName });
        await saveDraft();
        await loadWorkspace(state.currentWorkspace);
        showToast(`📝 留言已创建：${result.fileName}`);
        if (typeof window.MindMap?.refreshSidePanel === "function") window.MindMap.refreshSidePanel();
      } catch (error) {
        showToast(error.message || "创建留言失败", "error");
      }
    });
  };

  window.MindMap.onNodeOpen = async (node) => {
    if (!Array.isArray(node.messages) || node.messages.length === 0) {
      // No messages — offer to create one
      if (typeof window.MindMap?.onLeaveMessage === "function") {
        window.MindMap.onLeaveMessage(node, dmToMarkdown());
      }
      return;
    }
    try {
      const messages = await dmFetchNodeMessages(node);
      dmShowNodeViewer(node, messages);
    } catch (error) {
      showToast("加载留言失败", "error");
    }
  };

  // ─── Side Panel (node detail & messages) ────────────────────────────────────
  const _sidePanel = document.getElementById("dm_side_panel");
  const _sideContent = document.getElementById("dm_side_content");
  const _sideClose = document.getElementById("dm_side_close");
  let _sidePrevNodeId = null;

  if (_sideClose) {
    _sideClose.addEventListener("click", () => {
      _sidePanel?.classList.add("dm-side-hidden");
      _sidePrevNodeId = null;
    });
  }

  function dmUpdateSidePanel(node) {
    if (!_sidePanel || !_sideContent) return;
    if (!node) {
      _sidePanel.classList.add("dm-side-hidden");
      _sidePrevNodeId = null;
      return;
    }
    // Show panel
    _sidePanel.classList.remove("dm-side-hidden");
    // Avoid redundant re-fetch if same node
    if (_sidePrevNodeId === node.id) return;
    _sidePrevNodeId = node.id;
    const path = dmBuildNodePath(node);
    const hasMsgs = Array.isArray(node.messages) && node.messages.length > 0;
    _sideContent.innerHTML =
      `<div class="dm-side-node-path">📍 ${esc(path)}</div>` +
      `<div class="dm-side-section">${hasMsgs ? `💬 留言 (${node.messages.length})` : "💬 留言"}</div>` +
      `<div class="dm-side-empty">加载中…</div>`;
    if (!hasMsgs) {
      _sideContent.innerHTML =
        `<div class="dm-side-node-path">📍 ${esc(path)}</div>` +
        `<div class="dm-side-section">💬 留言</div>` +
        `<div class="dm-side-empty">暂无留言</div>` +
        `<button class="dm-side-new-btn" id="dm_side_new_msg">+ 新留言</button>`;
      document.getElementById("dm_side_new_msg")?.addEventListener("click", () => {
        if (typeof window.MindMap?.onLeaveMessage === "function") {
          window.MindMap.onLeaveMessage(node, window.MindMap.toMarkdown());
        }
      });
      return;
    }
    // Fetch messages async
    dmFetchNodeMessages(node).then(messages => {
      if (_sidePrevNodeId !== node.id) return;
      let html = `<div class="dm-side-node-path">📍 ${esc(path)}</div>`;
      html += `<div class="dm-side-section">💬 留言 (${messages.length})</div>`;
      for (const m of messages) {
        const statusLabel = m.bucket === "processed" ? "✅ 已处理" : m.bucket === "inprocess" ? "⏳ 处理中" : "📨 待处理";
        const lines = String(m.content || "").split("\n");
        const reqLine = lines.find(l => /你需要做[:：]/.test(l)) || lines[0] || "";
        const reqText = reqLine.replace(/.*你需要做[:：]\s*/, "").trim() || reqLine;
        const docName = m.fileName.replace(/\.md$/, "_doc.md");
        const refsHtml = `<div class="dm-side-msg-refs">`
          + `<div class="dm-side-msg-ref"><span class="dm-side-msg-ref-label">📄 文档原文</span><span class="dm-side-msg-ref-name">${esc(m.fileName)}</span></div>`
          + (m.docContent ? `<div class="dm-side-msg-ref"><span class="dm-side-msg-ref-label">📋 交付文档</span><span class="dm-side-msg-ref-name">${esc(docName)}</span></div>` : "")
          + `</div>`;
        const docSection = m.docContent
          ? `<div class="dm-side-msg-doc"><div class="dm-side-msg-doc-label">处理结果</div><pre class="dm-side-msg-doc-pre">${esc(m.docContent)}</pre></div>`
          : "";
        html += `<div class="dm-side-msg"><div class="dm-side-msg-header"><span class="dm-side-msg-status">${statusLabel}</span></div><div class="dm-side-msg-text">${esc(reqText)}</div>${refsHtml}${docSection}</div>`;
      }
      html += `<button class="dm-side-new-btn" id="dm_side_new_msg">+ 新留言</button>`;
      _sideContent.innerHTML = html;
      document.getElementById("dm_side_new_msg")?.addEventListener("click", () => {
        if (typeof window.MindMap?.onLeaveMessage === "function") {
          window.MindMap.onLeaveMessage(node, window.MindMap.toMarkdown());
        }
      });
    }).catch(() => {
      if (_sidePrevNodeId !== node.id) return;
      _sideContent.innerHTML =
        `<div class="dm-side-node-path">📍 ${esc(path)}</div>` +
        `<div class="dm-side-section">💬 留言</div>` +
        `<div class="dm-side-empty">加载留言失败</div>`;
    });
  }

  // Force re-fetch when messages array changes (e.g., after sending a new message)
  window.MindMap.refreshSidePanel = () => {
    _sidePrevNodeId = null;
    const selId = window.MindMap.state.selectedIds.size === 1 ? [...window.MindMap.state.selectedIds][0] : null;
    const selNode = selId != null ? window.MindMap.state.nodes.find(n => n.id === selId) : null;
    dmUpdateSidePanel(selNode);
  };

  window.MindMap.onSelectionChange = (node) => {
    dmUpdateSidePanel(node);
  };
}

function openDraftModal(detail) {
  if (!draftModal || !draftModalMeta) return;
  state.openDraft = { fileName: detail.fileName, content: detail.content || "" };
  draftModalMeta.textContent = `${detail.fileName} · 思维导图`;
  dmParse(detail.content || "");
  _dm.selectedIds.clear();
  _dm.editingId = null;
  dmEnsureGradient();
  draftModal.hidden = false;
  draftModal.classList.remove("hidden");
  draftMMCanvas?.focus();
  // Only center on root if no saved pan position exists
  if (draftMMCanvas && _dm.panX === 0 && _dm.panY === 0) {
    const rect = draftMMCanvas.getBoundingClientRect();
    const root = _dm.nodes.find(n => n.parentId == null);
    if (root) {
      _dm.panX = rect.width / 2 - root.x - 70;
      _dm.panY = rect.height / 2 - root.y - 14;
      _dm.selectedIds.add(root.id);
    } else {
      _dm.panX = rect.width / 2 - 100;
      _dm.panY = rect.height / 2 - 30;
    }
  }
  dmRender();
}

function closeDraftModal() {
  state.openDraft = null;
  _dm.editingId = null;
  _dm.selectedIds.clear();
  dmHideCtx();
  if (!draftModal) return;
  draftModal.hidden = true;
  draftModal.classList.add("hidden");
}

function canDeleteWorkspace(workspaceName) {
  return !isDevPage && workspaceName !== DEV_WORKSPACE && workspaceName !== "test";
}

async function deleteWorkspaceByName(workspaceName) {
  const confirmed = window.confirm(`确认删除 Workspace「${workspaceName}」吗？`);
  if (!confirmed) return;

  await fetchJson(`/api/workspaces/${encodeURIComponent(workspaceName)}`, {
    method: "DELETE",
  });

  const nextWorkspace = state.currentWorkspace === workspaceName ? "" : state.currentWorkspace;
  await refreshWorkspaceList(nextWorkspace);
  showToast(`🗑️ 已删除 Workspace「${workspaceName}」。`);
}

// ─── Clone Workspace Modal ────────────────────────────────────────────────────
function ensureCloneModalDOM() {
  if (document.getElementById("clone_ws_modal")) return;
  const backdrop = document.createElement("div");
  backdrop.id = "clone_ws_modal";
  backdrop.className = "modal-backdrop hidden";
  backdrop.hidden = true;
  backdrop.innerHTML = `
    <div class="subtask-modal" role="dialog" aria-modal="true" style="width:min(440px,100%)">
      <div class="subtask-modal-header">
        <div>
          <span class="eyebrow">克隆 Workspace</span>
          <p id="clone_ws_meta" class="subtask-modal-meta"></p>
        </div>
        <button id="clone_ws_close" type="button" class="btn-secondary">取消</button>
      </div>
      <div class="subtask-modal-body" style="display:flex;flex-direction:column;gap:.9rem">
        <div>
          <label style="font-size:.75rem;color:var(--text3);display:block;margin-bottom:.35rem">新 Workspace 名称</label>
          <input id="clone_ws_name" type="text" class="subtask-modal-input" style="width:100%;box-sizing:border-box;padding:.55rem .7rem;height:auto" placeholder="新名称…" maxlength="80" autocomplete="off" />
        </div>
        <label style="display:flex;align-items:center;gap:.55rem;font-size:.82rem;color:var(--text2);cursor:pointer;user-select:none">
          <input id="clone_ws_keep" type="checkbox" checked style="width:15px;height:15px;accent-color:var(--accent)" />
          保留文档（sessions / doc / processed 等文件）
        </label>
      </div>
      <div class="subtask-modal-footer">
        <button id="clone_ws_submit" type="button">克隆 →</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeCloneModal(); });
  document.getElementById("clone_ws_close")?.addEventListener("click", closeCloneModal);
  document.getElementById("clone_ws_submit")?.addEventListener("click", submitCloneWorkspace);
  document.getElementById("clone_ws_name")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); submitCloneWorkspace(); }
    if (e.key === "Escape") closeCloneModal();
  });
}

// ─── Sync .github Modal ──────────────────────────────────────────────────────
function ensureSyncGithubModalDOM() {
  if (document.getElementById("sync_github_modal")) return;
  const backdrop = document.createElement("div");
  backdrop.id = "sync_github_modal";
  backdrop.className = "modal-backdrop hidden";
  backdrop.hidden = true;
  backdrop.innerHTML = `
    <div class="subtask-modal" role="dialog" aria-modal="true" style="width:min(440px,100%)">
      <div class="subtask-modal-header">
        <div>
          <span class="eyebrow">同步 .github</span>
          <p id="sync_github_meta" class="subtask-modal-meta"></p>
        </div>
        <button id="sync_github_close" type="button" class="btn-secondary">取消</button>
      </div>
      <div class="subtask-modal-body">
        <label style="font-size:.75rem;color:var(--text3);display:block;margin-bottom:.35rem">从哪个 Workspace 同步</label>
        <select id="sync_github_source" style="width:100%;padding:.55rem .7rem;background:var(--bg2);color:var(--text1);border:1px solid var(--border1);border-radius:6px;font-size:.9rem">
        </select>
      </div>
      <div class="subtask-modal-footer">
        <button id="sync_github_submit" type="button">同步覆盖 →</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeSyncGithubModal(); });
  document.getElementById("sync_github_close")?.addEventListener("click", closeSyncGithubModal);
  document.getElementById("sync_github_submit")?.addEventListener("click", submitSyncGithub);
}

let _syncGithubTarget = "";

function openSyncGithubModal(wsName) {
  ensureSyncGithubModalDOM();
  _syncGithubTarget = wsName;
  const meta = document.getElementById("sync_github_meta");
  const select = document.getElementById("sync_github_source");
  const modal = document.getElementById("sync_github_modal");
  if (meta) meta.textContent = `目标 Workspace：${wsName}`;
  if (select) {
    select.innerHTML = state.workspaces
      .filter((ws) => ws.name !== wsName)
      .map((ws) => `<option value="${ws.name}">${ws.name}</option>`)
      .join("");
  }
  if (modal) { modal.hidden = false; modal.classList.remove("hidden"); }
  setTimeout(() => select?.focus(), 50);
}

function closeSyncGithubModal() {
  const modal = document.getElementById("sync_github_modal");
  _syncGithubTarget = "";
  if (modal) { modal.hidden = true; modal.classList.add("hidden"); }
}

async function submitSyncGithub() {
  const select = document.getElementById("sync_github_source");
  const submitBtn = document.getElementById("sync_github_submit");
  const sourceWorkspace = select?.value?.trim();
  if (!sourceWorkspace) { showToast("请选择来源 Workspace。", "error"); return; }
  if (submitBtn) submitBtn.disabled = true;
  try {
    await fetchJson(`/api/workspaces/${encodeURIComponent(_syncGithubTarget)}/sync-github`, {
      method: "POST",
      body: JSON.stringify({ sourceWorkspace }),
    });
    closeSyncGithubModal();
    showToast(`✅ 已将 ${sourceWorkspace} 的 .github 同步至 ${_syncGithubTarget}`);
  } catch (err) {
    showToast(`同步失败：${err.message}`, "error");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}


async function openCloneWorkspaceModal(wsName) {
  ensureCloneModalDOM();
  _cloneSource = wsName;
  const modal = document.getElementById("clone_ws_modal");
  const meta  = document.getElementById("clone_ws_meta");
  const input = document.getElementById("clone_ws_name");
  const keep  = document.getElementById("clone_ws_keep");
  if (meta)  meta.textContent  = `来源：${wsName}`;
  if (input) { input.value = `${wsName}-copy`; }
  if (keep)  keep.checked = true;
  if (modal) { modal.hidden = false; modal.classList.remove("hidden"); }
  setTimeout(() => { input?.focus(); input?.select(); }, 50);
}

function closeCloneModal() {
  const modal = document.getElementById("clone_ws_modal");
  _cloneSource = "";
  if (modal) { modal.hidden = true; modal.classList.add("hidden"); }
}

async function submitCloneWorkspace() {
  const input     = document.getElementById("clone_ws_name");
  const keepEl    = document.getElementById("clone_ws_keep");
  const submitBtn = document.getElementById("clone_ws_submit");
  const newName   = input?.value?.trim();

  if (!newName) { showToast("请输入新 Workspace 名称。", "error"); return; }
  if (newName === _cloneSource) { showToast("新名称不能与来源相同。", "error"); return; }

  try {
    if (submitBtn) submitBtn.disabled = true;
    await fetchJson(
      `/api/workspaces/${encodeURIComponent(_cloneSource)}/clone`,
      {
        method: "POST",
        body: JSON.stringify({ newName, keepDocs: keepEl?.checked !== false }),
      }
    );
    closeCloneModal();
    await refreshWorkspaceList(state.currentWorkspace);
    showToast(`📋 已克隆为 Workspace「${newName}」。`);
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}


async function deleteCardItem(bucket, fileName) {
  const confirmed = window.confirm(`确认删除 ${bucket} / ${fileName} 吗？`);
  if (!confirmed || !state.currentWorkspace) return;

  await fetchJson(
    `/api/workspaces/${encodeURIComponent(state.currentWorkspace)}/item?bucket=${encodeURIComponent(bucket)}&file=${encodeURIComponent(fileName)}`,
    { method: "DELETE" }
  );

  if (
    state.selectedItem &&
    state.selectedItem.bucket === bucket &&
    state.selectedItem.fileName === fileName
  ) {
    state.selectedItem = null;
    renderDetail(null);
  }

  if (state.openDraft?.fileName === fileName) {
    closeDraftModal();
  }

  await loadWorkspace(state.currentWorkspace);
  showToast(`🗑️ 已删除 ${fileName}。`);
}

// ─── Subtask Modal ────────────────────────────────────────────────────────────
let _subtaskContext = null;

function ensureSubtaskModalDOM() {
  if (document.getElementById("subtask_modal")) return;
  const backdrop = document.createElement("div");
  backdrop.id = "subtask_modal";
  backdrop.className = "modal-backdrop hidden";
  backdrop.hidden = true;
  backdrop.innerHTML = `
    <div class="subtask-modal" role="dialog" aria-modal="true">
      <div class="subtask-modal-header">
        <div>
          <span class="eyebrow">创建子任务</span>
          <h3>子任务</h3>
          <p id="subtask_modal_meta" class="subtask-modal-meta"></p>
        </div>
        <button id="subtask_modal_close" type="button" class="btn-secondary">取消</button>
      </div>
      <div class="subtask-modal-body">
        <textarea id="subtask_modal_input" class="subtask-modal-input" placeholder="输入子任务需求描述…" rows="6"></textarea>
      </div>
      <div class="subtask-modal-footer">
        <button id="subtask_modal_submit" type="button">创建子任务 →</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeSubtaskModal(); });
  document.getElementById("subtask_modal_close")?.addEventListener("click", closeSubtaskModal);
  document.getElementById("subtask_modal_submit")?.addEventListener("click", submitSubtask);
  document.getElementById("subtask_modal_input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitSubtask(); }
    if (e.key === "Escape") closeSubtaskModal();
  });
}

function getSubtaskEl(id) {
  return document.getElementById(id);
}

function openSubtaskModal(bucket, fileName) {
  ensureSubtaskModalDOM();
  const modal = getSubtaskEl("subtask_modal");
  const meta  = getSubtaskEl("subtask_modal_meta");
  const input = getSubtaskEl("subtask_modal_input");
  if (!modal) return;
  _subtaskContext = { bucket, fileName };
  if (meta) meta.textContent = `父任务：${fileName}`;
  if (input) input.value = "";
  modal.hidden = false;
  modal.classList.remove("hidden");
  if (input) input.focus();
}

function closeSubtaskModal() {
  const modal = getSubtaskEl("subtask_modal");
  _subtaskContext = null;
  if (!modal) return;
  modal.hidden = true;
  modal.classList.add("hidden");
}

async function submitSubtask() {
  if (!_subtaskContext) {
    showToast("请先通过右键菜单打开子任务弹窗。", "error");
    return;
  }
  if (!state.currentWorkspace) {
    showToast("请先选择 Workspace。", "error");
    return;
  }
  const input = getSubtaskEl("subtask_modal_input");
  const submitBtn = getSubtaskEl("subtask_modal_submit");
  const content = input?.value?.trim();
  if (!content) {
    showToast("子任务内容不能为空。", "error");
    return;
  }
  try {
    if (submitBtn) submitBtn.disabled = true;
    const result = await fetchJson(
      `/api/workspaces/${encodeURIComponent(state.currentWorkspace)}/tasks/subtask`,
      {
        method: "POST",
        body: JSON.stringify({
          parentBucket: _subtaskContext.bucket,
          parentFileName: _subtaskContext.fileName,
          content,
        }),
      }
    );
    closeSubtaskModal();
    await loadWorkspace(state.currentWorkspace);
    showToast(`🌿 已创建子任务：${result.fileName}`);
  } catch (error) {
    showToast(error.message || "创建子任务失败，请检查服务器连接。", "error");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function createDraft() {
  if (!state.currentWorkspace) {
    showToast("请先选择 Workspace。", "error");
    return;
  }
  if (!newMMModal || !newMMTitle) return;
  newMMTitle.value = "";
  newMMModal.hidden = false;
  newMMModal.classList.remove("hidden");
  newMMTitle.focus();
}

async function confirmCreateDraft() {
  if (!newMMModal || !newMMTitle) return;
  const title = newMMTitle.value.trim() || "中心主题";
  newMMModal.hidden = true;
  newMMModal.classList.add("hidden");
  try {
    const cx = 300, cy = 260;
    const initial = JSON.stringify({
      nodes: [{ id: 1, x: cx, y: cy, title, parentId: null }],
      nextId: 2, panX: 0, panY: 0, zoom: 1,
    });
    const result = await fetchJson(
      `/api/workspaces/${encodeURIComponent(state.currentWorkspace)}/drafts`,
      { method: "POST", body: JSON.stringify({ content: initial }) }
    );
    await loadWorkspace(state.currentWorkspace);
    await openDraftEditor(result.fileName);
    showToast(`🧠 已创建思维导图 ${result.fileName}`);
  } catch (error) {
    showToast(error.message, "error");
  }
}

function closeNewMMModal() {
  if (!newMMModal) return;
  newMMModal.hidden = true;
  newMMModal.classList.add("hidden");
}

async function saveDraft() {
  if (!state.currentWorkspace || !state.openDraft) return;
  try {
    const content = dmSerialize();
    const result = await fetchJson(
      `/api/workspaces/${encodeURIComponent(state.currentWorkspace)}/item?bucket=drafts&file=${encodeURIComponent(state.openDraft.fileName)}`,
      { method: "PUT", body: JSON.stringify({ content }) }
    );
    state.openDraft.content = result.content;
    await loadWorkspace(state.currentWorkspace);
    showToast(`💾 已保存思维导图 ${state.openDraft.fileName}`);
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function promoteDraftToSessions(fileName = state.draggedDraft || state.openDraft?.fileName) {
  if (!state.currentWorkspace || !fileName) return;
  try {
    // Convert mind map data to readable markdown before promoting
    if (state.openDraft?.fileName === fileName) {
      const md = dmToMarkdown();
      await fetchJson(
        `/api/workspaces/${encodeURIComponent(state.currentWorkspace)}/item?bucket=drafts&file=${encodeURIComponent(fileName)}`,
        { method: "PUT", body: JSON.stringify({ content: md }) }
      );
    }
    const result = await fetchJson(
      `/api/workspaces/${encodeURIComponent(state.currentWorkspace)}/drafts/${encodeURIComponent(fileName)}/promote`,
      { method: "POST" }
    );
    if (state.openDraft?.fileName === fileName) {
      closeDraftModal();
    }
    if (state.selectedItem?.bucket === "drafts" && state.selectedItem.fileName === fileName) {
      state.selectedItem = { bucket: "sessions", fileName: result.targetFileName };
    }
    await loadWorkspace(state.currentWorkspace);
    showToast(`🚀 已将思维导图投递到待处理：${result.targetFileName}`);
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    state.draggedDraft = null;
    bucketContainers.sessions?.classList.remove("drop-target");
  }
}

async function createWorkflow() {
  if (!state.currentWorkspace) {
    showToast("请先选择 Workspace。", "error");
    return;
  }
  try {
    const result = await fetchJson(
      `/api/workspaces/${encodeURIComponent(state.currentWorkspace)}/workflows`,
      { method: "POST", body: JSON.stringify({}) }
    );
    await loadWorkspace(state.currentWorkspace);
    await openWorkflow(result.fileName);
    showToast(`🧭 已创建任务流 ${result.fileName}`);
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function saveWorkflowDocument(workflow) {
  if (!state.currentWorkspace || !workflow?.fileName) {
    throw new Error("缺少任务流文件名。");
  }
  const result = await fetchJson(
    `/api/workspaces/${encodeURIComponent(state.currentWorkspace)}/workflows/${encodeURIComponent(workflow.fileName)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        title: workflow.title,
        nodes: workflow.nodes,
        source: workflow.source,
        createdAt: workflow.createdAt,
      }),
    }
  );
  await loadWorkspace(state.currentWorkspace);
  return result.workflow;
}

async function openWorkflow(fileName) {
  if (!state.currentWorkspace || !fileName || !workflowManager) return;
  state.selectedItem = { bucket: "workflows", fileName };
  renderBuckets();
  try {
    const workflow = await fetchJson(
      `/api/workspaces/${encodeURIComponent(state.currentWorkspace)}/workflows/${encodeURIComponent(fileName)}`
    );
    workflowManager.setAvailableDocuments(getAvailableWorkflowDocuments());
    workflowManager.open(workflow, getAvailableWorkflowDocuments());
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function deleteWorkflowDocument(fileName) {
  if (!state.currentWorkspace || !fileName) return;
  const confirmed = window.confirm(`确认删除任务流 ${fileName} 吗？`);
  if (!confirmed) return;
  try {
    await fetchJson(
      `/api/workspaces/${encodeURIComponent(state.currentWorkspace)}/workflows/${encodeURIComponent(fileName)}`,
      { method: "DELETE" }
    );
    if (state.selectedItem?.bucket === "workflows" && state.selectedItem.fileName === fileName) {
      state.selectedItem = null;
    }
    workflowManager?.close();
    await loadWorkspace(state.currentWorkspace);
    showToast(`🗑️ 已删除任务流 ${fileName}`);
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function convertDraftToWorkflow(fileName) {
  if (!state.currentWorkspace || !fileName) return;
  try {
    const result = await fetchJson(
      `/api/workspaces/${encodeURIComponent(state.currentWorkspace)}/drafts/${encodeURIComponent(fileName)}/workflow`,
      { method: "POST" }
    );
    await loadWorkspace(state.currentWorkspace);
    await openWorkflow(result.fileName);
    showToast(`🧭 已将导图转换为任务流：${result.fileName}`);
  } catch (error) {
    showToast(error.message, "error");
  }
}

let toastTimer;
function showToast(message, type = "info") {
  toast.textContent = message;
  toast.className   = `toast toast-${type}`;
  toast.hidden      = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

// ─── Workspace List ───────────────────────────────────────────────────────────
function renderWorkspaces() {
  workspaceList.innerHTML = "";
  if (!state.workspaces.length) {
    workspaceList.innerHTML = `<div class="ws-empty">暂无 Workspace，请创建一个。</div>`;
    return;
  }
  const visibleWorkspaces = isDevPage
    ? state.workspaces.filter((ws) => ws.name === DEV_WORKSPACE)
    : state.workspaces;
  if (!visibleWorkspaces.length) {
    workspaceList.innerHTML = `<div class="ws-empty">未找到 Workspace「${esc(DEV_WORKSPACE)}」。</div>`;
    return;
  }
  visibleWorkspaces.forEach((ws) => {
    const btn = document.createElement("button");
    btn.type      = "button";
    btn.className = `ws-btn${ws.name === state.currentWorkspace ? " active" : ""}`;
    btn.innerHTML = `
      <span class="ws-name">${esc(ws.name)}</span>
      <span class="ws-meta">
        <span class="dot dot-draft"></span>${ws.counts.drafts || 0}
        <span class="dot dot-pending"></span>${ws.counts.sessions}
        <span class="dot dot-active"></span>${ws.counts.inprocess}
        <span class="dot dot-done"></span>${ws.counts.processed}
      </span>`;
    if (!isDevPage) {
      btn.addEventListener("click", () => loadWorkspace(ws.name));
    } else {
      btn.disabled = true;
    }
    btn.addEventListener("contextmenu", (event) => {
      showContextMenu(event, [
        {
          label: "克隆 Workspace",
          onSelect: async () => {
            await openCloneWorkspaceModal(ws.name);
          },
        },
        {
          label: "同步 .github",
          onSelect: () => openSyncGithubModal(ws.name),
        },
        {
          label: "复制名称",
          onSelect: async () => {
            await copyText(ws.name);
            showToast(`📋 已复制 Workspace 名称：${ws.name}`);
          },
        },
        {
          label: "删除 Workspace",
          danger: true,
          disabled: !canDeleteWorkspace(ws.name),
          onSelect: async () => {
            await deleteWorkspaceByName(ws.name);
          },
        },
      ]);
    });
    workspaceList.appendChild(btn);
  });
}

// ─── Top Menu ────────────────────────────────────────────────────────────────
function renderTopMenu() {
  const ws = state.currentWorkspace || "未选择";
  currentWorkspaceName.textContent = ws;

  const summary = state.currentSummary;
  const configuredOptions = summary?.settings?.modelOptions;
  const fallbackOptions = state.modelCatalog?.modelOptions;
  const options = Array.isArray(configuredOptions) && configuredOptions.length
    ? configuredOptions
    : Array.isArray(fallbackOptions) && fallbackOptions.length
      ? fallbackOptions
      : (summary?.settings?.presets || state.modelCatalog?.presets || []).map((value) => ({ value, label: value }));
  const current = summary?.settings?.model || "";

  modelInput.innerHTML = `<option value="">使用默认</option>`;
  options.forEach((entry) => {
    const value = typeof entry === "string" ? entry : entry.value;
    const label = typeof entry === "string" ? entry : (entry.label || entry.value);
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    if (value === current) opt.selected = true;
    modelInput.appendChild(opt);
  });
  if (current && !options.some((entry) => (typeof entry === "string" ? entry : entry.value) === current)) {
    const opt = document.createElement("option");
    opt.value = current;
    opt.textContent = current;
    opt.selected = true;
    modelInput.appendChild(opt);
  }
}

async function loadModelCatalog() {
  try {
    const catalog = await fetchJson("/api/model-presets");
    state.modelCatalog = buildModelCatalog(catalog);
    renderTopMenu();
  } catch (error) {
    console.warn("Failed to load model catalog, falling back to workspace settings.", error);
  }
}

// ─── Stats ───────────────────────────────────────────────────────────────────
function renderStats() {
  const summary = state.currentSummary;
  if (!summary) {
    Object.values(statEls).forEach((el) => { if (el) el.textContent = "0"; });
    return;
  }
  const b = summary.buckets || {};
  const drafts = b.drafts || [];
  const sessions = b.sessions || [];
  const inprocess = b.inprocess || [];
  const processed = b.processed || [];
  const workflows = summary.workflows || [];
  if (statEls.drafts) statEls.drafts.textContent = drafts.length;
  if (statEls.sessions) statEls.sessions.textContent = sessions.length;
  if (statEls.inprocess) statEls.inprocess.textContent = inprocess.length;
  if (statEls.processed) statEls.processed.textContent = processed.length;
  if (statEls.workflows) statEls.workflows.textContent = workflows.length;
  if (statEls.docs) statEls.docs.textContent = (summary.docs || []).length;
  if (leftMenu) leftMenu.classList.toggle("left-menu--has-pending", sessions.length > 0);
}

// ─── Cards ───────────────────────────────────────────────────────────────────
function buildCard(item, bucket, compact = false) {
  const isSelected =
    state.selectedItem &&
    state.selectedItem.bucket   === bucket &&
    state.selectedItem.fileName === item.fileName;

  const card = document.createElement("div");
  const isMindMapDraft = bucket === "drafts" && String(item.preview || "").trimStart().startsWith('{"nodes"');
  card.className = `card${compact ? " card-tree-node" : ""}${isSelected ? " selected" : ""}${bucket === "drafts" ? (isMindMapDraft ? " card-mindmap" : " card-draft") : ""}${bucket === "workflows" ? " card-workflow" : ""}`;
  card.dataset.filename = item.fileName;
  card.dataset.subtaskParent = item.subtaskParent || "";
  const isInChain = item.subtaskParent || state.rootsWithSubtasks.has(item.fileName);
  const chainRoot = isInChain ? (state.chainRootMap.get(item.fileName) || item.fileName) : "";
  if (chainRoot) card.dataset.chainRoot = chainRoot;
  if (bucket === "drafts") {
    card.draggable = true;
  }

  const timeStr = formatTime(item.updatedAt);
  const title = bucket === "drafts"
    ? extractDraftTitle(item.preview === "(empty document)" ? "" : item.preview, item.fileName)
    : bucket === "workflows"
      ? item.title || item.fileName
      : item.fileName;

  const chainAlias = chainRoot ? getChainAlias(chainRoot) : "";

  let docBtn = "";
  if (bucket === "processed" && item.hasLinkedDoc) {
    docBtn = compact
      ? `<button type="button" class="btn-doc btn-doc-sm" data-doc="${esc(item.linkedDocName)}" data-bucket="doc">📄</button>`
      : `<button type="button" class="btn-doc" data-doc="${esc(item.linkedDocName)}" data-bucket="doc">📄 查看文档</button>`;
  }

  if (compact) {
    // For subtask items, extract content after "它的需求是：" as the display title
    let treeTitle = title;
    let treePreview = item.preview && item.preview !== "(empty document)" ? item.preview : "";
    // Show node summary for mind map drafts
    if (isMindMapDraft) {
      treePreview = buildMindmapPreview(item.preview);
    }
    if (item.subtaskParent && treePreview) {
      const reqMatch = treePreview.match(/它的需求是[：:]\s*([\s\S]*?)(?:\s*---|\s*$)/);
      if (reqMatch) {
        const reqText = reqMatch[1].trim();
        treeTitle = reqText.split("\n")[0].trim() || title;
        treePreview = reqText;
      }
    }
    card.innerHTML = `
      <div class="card-tree-body">
        <div class="card-tree-top">
          <span class="card-tree-title">${esc(treeTitle)}</span>
          <span class="card-tree-meta">${esc(timeStr)}${docBtn}</span>
        </div>
        ${treePreview ? `<div class="card-tree-preview">${esc(treePreview)}</div>` : ""}
      </div>`;
  } else {
    const previewText = isMindMapDraft ? buildMindmapPreview(item.preview) : item.preview;
    card.innerHTML = `
      <div class="card-body">
        ${chainAlias ? `<div class="card-chain-badge">📁 ${esc(chainAlias)}</div>` : ""}
        <div class="card-title">${esc(title)}</div>
        ${previewText ? `<div class="card-preview">${esc(previewText)}</div>` : ""}
        <div class="card-footer">
          <span class="card-time">${esc(timeStr)}</span>
          ${docBtn}
        </div>
      </div>`;
  }

  card.addEventListener("click", (e) => {
    if (e.target.closest(".btn-doc")) return;
    if (bucket === "drafts") {
      openDraftEditor(item.fileName);
      return;
    }
    if (bucket === "workflows") {
      openWorkflow(item.fileName);
      return;
    }
    loadItem(bucket, item.fileName);
  });

  card.addEventListener("contextmenu", (event) => {
    showContextMenu(event, [
      {
        label: "复制名称",
        onSelect: async () => {
          await copyText(item.fileName);
          showToast(`📋 已复制卡片名称：${item.fileName}`);
        },
      },
      {
        label: "复制完整路径",
        hidden: bucket === "workflows" && !item.fullPath,
        onSelect: async () => {
          await copyText(item.fullPath);
          showToast(`📋 已复制完整路径：${item.fullPath}`);
        },
      },
      {
        label: "创建子任务",
        hidden: bucket === "drafts" || bucket === "workflows",
        onSelect: async () => {
          openSubtaskModal(bucket, item.fileName);
        },
      },
      {
        label: "重命名链路",
        hidden: !chainRoot || bucket === "drafts" || bucket === "workflows",
        onSelect: () => openChainRenameModal(chainRoot),
      },
      {
        label: "转换为任务流",
        hidden: bucket !== "drafts",
        onSelect: async () => {
          await convertDraftToWorkflow(item.fileName);
        },
      },
      {
        label: bucket === "drafts" ? "删除导图" : bucket === "workflows" ? "删除任务流" : "删除卡片",
        danger: true,
        onSelect: async () => {
          if (bucket === "workflows") {
            await deleteWorkflowDocument(item.fileName);
            return;
          }
          await deleteCardItem(bucket, item.fileName);
        },
      },
    ]);
  });

  if (bucket === "drafts") {
    card.addEventListener("dragstart", (event) => {
      state.draggedDraft = item.fileName;
      card.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.fileName);
    });
    card.addEventListener("dragend", () => {
      state.draggedDraft = null;
      card.classList.remove("dragging");
      bucketContainers.sessions?.classList.remove("drop-target");
    });
  }

  const docButton = card.querySelector(".btn-doc");
  if (docButton) {
    docButton.addEventListener("click", (e) => {
      e.stopPropagation();
      loadItem("doc", item.linkedDocName, true);
    });
  }


  return card;
}

function renderBuckets() {
  const summary = state.currentSummary;

  // Build global chain root map from ALL items across all card buckets
  const allCardItems = ["drafts", "sessions", "inprocess", "processed"]
    .flatMap((b) => getBucketItems(summary, b) || []);
  const globalParentMap = new Map(
    allCardItems.filter((i) => i.subtaskParent).map((i) => [i.fileName, i.subtaskParent])
  );
  state.rootsWithSubtasks = new Set(allCardItems.map((i) => i.subtaskParent).filter(Boolean));
  state.chainRootMap = new Map(
    allCardItems.map((i) => [i.fileName, resolveRoot(i.fileName, globalParentMap)])
  );

  Object.entries(bucketContainers).forEach(([bucket, container]) => {
    const items = getBucketItems(summary, bucket);
    const filteredItems = bucket === "workflows" ? items : getFilteredBucketItems(bucket, items);
    if (countEls[bucket]) {
      countEls[bucket].textContent = bucket === "workflows"
        ? String(items.length)
        : getBucketCountText(bucket, items.length, filteredItems.length);
    }
    if (!container) return;
    container.innerHTML = "";
    if (!filteredItems.length) {
      container.innerHTML = `<div class="card-empty">${getBucketEmptyText(bucket)}</div>`;
      return;
    }
    if (bucket === "processed") {
      renderProcessedGrouped(container, filteredItems);
    } else {
      renderChainTree(container, filteredItems, bucket);
    }
  });
}

function resolveRoot(fileName, parentMap, visited = new Set()) {
  if (visited.has(fileName)) return fileName;
  visited.add(fileName);
  const parent = parentMap.get(fileName);
  if (!parent) return fileName;
  return resolveRoot(parent, parentMap, visited);
}

function renderProcessedGrouped(container, items) {
  const parentMap = new Map(
    items.filter((item) => item.subtaskParent).map((item) => [item.fileName, item.subtaskParent])
  );
  const rootMap = new Map(items.map((item) => [item.fileName, resolveRoot(item.fileName, parentMap)]));
  const groups = new Map();
  items.forEach((item) => {
    const root = rootMap.get(item.fileName) || item.fileName;
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(item);
  });

  // Split into standalones (1-member) and chains (2+ members).
  const standalones = [];
  const chains = [];
  groups.forEach((groupItems, root) => {
    if (groupItems.length === 1) {
      standalones.push(groupItems[0]);
    } else {
      // Sort chain members in original time order
      groupItems.sort((a, b) => items.indexOf(a) - items.indexOf(b));
      chains.push({ root, groupItems });
    }
  });

  // Standalones: preserve original time order, render in a column (no grid overlap)
  standalones.sort((a, b) => items.indexOf(a) - items.indexOf(b));
  if (standalones.length) {
    const standaloneCol = document.createElement("div");
    standaloneCol.className = "processed-standalone-col";
    standalones.forEach((item) => standaloneCol.appendChild(buildCard(item, "processed", true)));
    container.appendChild(standaloneCol);
  }

  // Chains: sort by earliest member, render as tree
  chains.sort((a, b) => items.indexOf(a.groupItems[0]) - items.indexOf(b.groupItems[0]));
  chains.forEach(({ root, groupItems }) => {
    container.appendChild(buildChainHeader(root));
    renderChainTree(container, groupItems, "processed");
  });
}

// Render items as a chain tree (parent → indented children).
// Items with no parent in the set render as plain cards (roots).
// Items with children render with nested child containers.
function renderChainTree(container, items, bucket) {
  const itemSet = new Set(items.map((i) => i.fileName));
  // Only track parent relationships within this item set
  const directParentMap = new Map(
    items
      .filter((i) => i.subtaskParent && itemSet.has(i.subtaskParent))
      .map((i) => [i.fileName, i.subtaskParent])
  );
  const childrenMap = new Map();
  directParentMap.forEach((parent, child) => {
    const item = items.find((i) => i.fileName === child);
    if (!childrenMap.has(parent)) childrenMap.set(parent, []);
    if (item) childrenMap.get(parent).push(item);
  });
  childrenMap.forEach((children) => {
    children.sort((a, b) => items.indexOf(a) - items.indexOf(b));
  });
  const isChild = new Set(directParentMap.keys());
  const roots = items.filter((i) => !isChild.has(i.fileName));
  roots.sort((a, b) => items.indexOf(a) - items.indexOf(b));

  function renderNode(item, depth) {
    const children = childrenMap.get(item.fileName) || [];
    const card = buildCard(item, bucket, true); // always compact
    if (!children.length) return card;
    const wrap = document.createElement("div");
    wrap.className = "chain-tree-wrap";
    wrap.appendChild(card);
    const childContainer = document.createElement("div");
    childContainer.className = "chain-tree-children";
    children.forEach((child) => {
      const childWrap = document.createElement("div");
      childWrap.className = "chain-tree-child";
      childWrap.appendChild(renderNode(child, depth + 1));
      childContainer.appendChild(childWrap);
    });
    wrap.appendChild(childContainer);
    return wrap;
  }

  roots.forEach((root) => {
    const treeEl = renderNode(root, 0);
    // Root element must span full grid width
    if (treeEl.classList) treeEl.classList.add("chain-tree-root");
    container.appendChild(treeEl);
  });
}

// ─── Chain Alias ─────────────────────────────────────────────────────────────
function chainAliasKey(root) {
  return `alith:chain:${state.currentWorkspace}:${root}`;
}

function getChainAlias(root) {
  return localStorage.getItem(chainAliasKey(root)) || "";
}

function setChainAlias(root, alias) {
  if (alias.trim()) {
    localStorage.setItem(chainAliasKey(root), alias.trim());
  } else {
    localStorage.removeItem(chainAliasKey(root));
  }
}

// ─── Chain Rename Modal ──────────────────────────────────────────────────────
let _chainRenameContext = null;

function openChainRenameModal(chainRoot) {
  _chainRenameContext = chainRoot;
  let modal = document.getElementById("chain_rename_modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "chain_rename_modal";
    modal.className = "modal-backdrop hidden";
    modal.setAttribute("hidden", "");
    modal.innerHTML = `
      <div class="chain-rename-dialog" role="dialog" aria-modal="true">
        <div class="subtask-modal-header">
          <div><span class="eyebrow">重命名链路</span><p id="chain_rename_hint" class="subtask-modal-meta"></p></div>
          <button id="chain_rename_close" type="button" class="btn-secondary">取消</button>
        </div>
        <div class="subtask-modal-body">
          <input id="chain_rename_input" type="text" class="chain-rename-modal-input"
            placeholder="链路名称（留空则清除）" maxlength="80" />
        </div>
        <div class="subtask-modal-footer">
          <button id="chain_rename_submit" type="button">保存 →</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById("chain_rename_close").addEventListener("click", closeChainRenameModal);
    document.getElementById("chain_rename_submit").addEventListener("click", submitChainRename);
    document.getElementById("chain_rename_input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submitChainRename(); }
      if (e.key === "Escape") closeChainRenameModal();
    });
    modal.addEventListener("click", (e) => { if (e.target === modal) closeChainRenameModal(); });
  }
  const hint = document.getElementById("chain_rename_hint");
  if (hint) hint.textContent = chainRoot;
  const input = document.getElementById("chain_rename_input");
  if (input) { input.value = getChainAlias(chainRoot); input.placeholder = chainRoot; }
  modal.hidden = false;
  modal.classList.remove("hidden");
  input?.focus();
  input?.select();
}

function closeChainRenameModal() {
  const modal = document.getElementById("chain_rename_modal");
  if (modal) { modal.hidden = true; modal.classList.add("hidden"); }
  _chainRenameContext = null;
}

function submitChainRename() {
  const chainRoot = _chainRenameContext;
  if (!chainRoot) return closeChainRenameModal();
  const input = document.getElementById("chain_rename_input");
  setChainAlias(chainRoot, input?.value || "");
  const alias = getChainAlias(chainRoot);
  closeChainRenameModal();
  showToast(`✏️ 链路已重命名：${alias || chainRoot}`);
  // Live-update processed group headers and card badges without full re-render
  document.querySelectorAll(`.processed-group-header[data-chain-root="${CSS.escape(chainRoot)}"] .chain-header-label`)
    .forEach((el) => { el.textContent = `📁 ${alias || chainRoot}`; });
  document.querySelectorAll(`.card[data-chain-root="${CSS.escape(chainRoot)}"] .card-chain-badge`)
    .forEach((el) => {
      if (alias) { el.textContent = `📁 ${alias}`; }
      else { el.remove(); }
    });
}

function buildChainHeader(root) {
  const alias = getChainAlias(root);
  const header = document.createElement("div");
  header.className = "processed-group-header";
  header.dataset.chainRoot = root;

  const label = document.createElement("span");
  label.className = "chain-header-label";
  label.textContent = `📁 ${alias || root}`;

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "chain-rename-btn";
  editBtn.title = "重命名链路";
  editBtn.textContent = "✏️";

  header.appendChild(label);
  header.appendChild(editBtn);

  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openChainRenameModal(root);
  });

  return header;
}


// ─── Detail Panel ────────────────────────────────────────────────────────────
function renderDetail(detail) {
  if (!detail) {
    detailTitle.textContent = "📄 文档详情";
    detailPanel.innerHTML   = `<p class="muted">点击卡片或搜索结果查看文档内容。</p>`;
    return;
  }

  detailTitle.textContent = `📄 ${detail.bucket} / ${detail.fileName}`;

  if (detail.bucket === "doc") {
    detailPanel.innerHTML = `
      <div class="detail-block">
        <div class="detail-filename">${esc(detail.fileName)}</div>
        <pre class="detail-content">${esc(detail.content)}</pre>
      </div>`;
    return;
  }

  const docBlock = detail.linkedDocName
    ? `<div class="detail-block detail-doc">
        <div class="detail-filename">🔗 关联文档: ${esc(detail.linkedDocName)}</div>
        <pre class="detail-content">${esc(detail.linkedDocContent || "(文档未找到)")}</pre>
       </div>`
    : "";

  const pathBlock = detail.fullPath
    ? `<div class="detail-block">
        <div class="detail-filename">完整路径</div>
        <pre class="detail-content">${esc(detail.fullPath)}</pre>
      </div>`
    : "";

  detailPanel.innerHTML = `
    <div class="detail-block">
      <div class="detail-filename">${esc(detail.bucket)} / ${esc(detail.fileName)}</div>
      <pre class="detail-content">${esc(detail.content)}</pre>
    </div>
    ${pathBlock}
    ${docBlock}`;
}

// ─── Content Detail Modal ─────────────────────────────────────────────────────
function showContentModal(detail) {
  if (!detail || !contentModal) return;

  contentModalEyebrow.textContent = detail.bucket || "文档内容";
  contentModalTitle.textContent   = detail.fileName || "";
  contentModalMeta.textContent    = detail.fullPath || "";

  let html = `
    <div class="content-modal-block">
      <div class="content-modal-block-label">内容</div>
      <pre class="content-modal-pre">${esc(detail.content)}</pre>
    </div>`;

  if (detail.linkedDocName) {
    html += `
    <div class="content-modal-block">
      <div class="content-modal-block-label">🔗 关联文档: ${esc(detail.linkedDocName)}</div>
      <pre class="content-modal-pre">${esc(detail.linkedDocContent || "(文档未找到)")}</pre>
    </div>`;
  }

  contentModalBody.innerHTML = html;
  contentModal.hidden = false;
  contentModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeContentModal() {
  if (!contentModal) return;
  contentModal.hidden = true;
  contentModal.classList.add("hidden");
  document.body.style.overflow = "";
}

// ─── Load Data ────────────────────────────────────────────────────────────────
async function loadItem(bucket, fileName, isDoc = false) {
  if (!state.currentWorkspace) return;

  if (bucket === "drafts") {
    await openDraftEditor(fileName);
    return;
  }

  if (!isDoc) {
    state.selectedItem = { bucket, fileName };
  }

  try {
    const detail = await fetchJson(
      `/api/workspaces/${encodeURIComponent(state.currentWorkspace)}/item?bucket=${encodeURIComponent(bucket)}&file=${encodeURIComponent(fileName)}`
    );
    renderDetail(detail);
    renderBuckets();
    showContentModal(detail);
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function openDraftEditor(fileName) {
  if (!state.currentWorkspace) return;
  state.selectedItem = { bucket: "drafts", fileName };
  try {
    renderBuckets();
    const detail = await fetchJson(
      `/api/workspaces/${encodeURIComponent(state.currentWorkspace)}/item?bucket=drafts&file=${encodeURIComponent(fileName)}`
    );
    openDraftModal(detail);
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function loadWorkspace(name) {
  const targetWorkspace = isDevPage ? DEV_WORKSPACE : name;
  if (state.currentWorkspace && state.currentWorkspace !== targetWorkspace) {
    workflowManager?.close();
  }
  state.currentWorkspace = targetWorkspace;
  state.bucketFilters = ensureWorkspaceBucketFilters(targetWorkspace);
  syncBucketFilters();
  renderWorkspaces();
  renderTopMenu();
  try {
    const summary = await fetchJson(`/api/workspaces/${encodeURIComponent(targetWorkspace)}`);
    state.currentSummary = summary;
    workflowManager?.setAvailableDocuments(getAvailableWorkflowDocuments(summary));
    renderTopMenu();
    renderStats();
    renderBuckets();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function refreshWorkspaceList(preferredWorkspace = state.currentWorkspace) {
  try {
    const data = await fetchJson("/api/workspaces");
    const allWorkspaces = data.workspaces || [];
    state.workspaces = isDevPage
      ? allWorkspaces.filter((w) => w.name === DEV_WORKSPACE)
      : allWorkspaces;
    renderWorkspaces();

    if (!state.workspaces.length) {
      state.currentWorkspace = "";
      state.currentSummary   = null;
      state.bucketFilters = createDefaultBucketFilters();
      workflowManager?.close();
      syncBucketFilters();
      renderTopMenu();
      renderStats();
      renderBuckets();
      renderDetail(null);
      return;
    }

    const target = isDevPage
      ? DEV_WORKSPACE
      : state.workspaces.some((w) => w.name === preferredWorkspace)
        ? preferredWorkspace
        : state.workspaces[0].name;

    if (target !== state.currentWorkspace) {
      await loadWorkspace(target);
    } else if (state.currentWorkspace) {
      await loadWorkspace(state.currentWorkspace);
    }
  } catch (error) {
    showToast(error.message, "error");
  }
}

// ─── Search ───────────────────────────────────────────────────────────────────
async function performSearch() {
  const q = searchInput.value.trim();
  if (!q) {
    searchResults.innerHTML = "";
    searchResults.classList.add("hidden");
    return;
  }
  if (!state.currentWorkspace) {
    showToast("请先选择 Workspace。", "error");
    return;
  }

  try {
    const data = await fetchJson(
      `/api/workspaces/${encodeURIComponent(state.currentWorkspace)}/search?q=${encodeURIComponent(q)}`
    );
    const results = data.results || [];
    searchResults.classList.remove("hidden");

    if (!results.length) {
      searchResults.innerHTML = `<div class="search-empty">未找到包含「${esc(q)}」的文档。</div>`;
      return;
    }

    searchResults.innerHTML = results
      .map(
        (r) => `
      <div class="search-item" data-bucket="${esc(r.bucket)}" data-file="${esc(r.fileName)}">
        <span class="search-bucket">${esc(r.bucket)}</span>
        <span class="search-name">${esc(r.fileName)}</span>
        <span class="search-preview">${esc(r.preview)}</span>
      </div>`
      )
      .join("");

    searchResults.querySelectorAll(".search-item").forEach((el) => {
      el.addEventListener("click", () => {
        const bucket   = el.dataset.bucket;
        const fileName = el.dataset.file;
        if (bucket === "drafts") {
          openDraftEditor(fileName);
          return;
        }
        loadItem(bucket, fileName, bucket === "doc");
      });
    });
  } catch (error) {
    showToast(error.message, "error");
  }
}

// ─── Model ───────────────────────────────────────────────────────────────────
async function persistModel() {
  if (!state.currentWorkspace) {
    showToast("请先选择 Workspace。", "error");
    return;
  }
  const model = modelInput.value.trim();
  try {
    const result = await fetchJson(
      `/api/workspaces/${encodeURIComponent(state.currentWorkspace)}/settings`,
      { method: "PUT", body: JSON.stringify({ model }) }
    );
    state.modelCatalog = buildModelCatalog({
      presets: result.settings?.presets || state.modelCatalog.presets,
      modelOptions: result.settings?.modelOptions || state.modelCatalog.modelOptions,
      defaultModel: state.modelCatalog.defaultModel,
    });
    state.currentSummary = { ...state.currentSummary, settings: result.settings };
    renderTopMenu();
    showToast(model ? `✅ 模型已切换为 ${model}，run.bat 已更新。` : "✅ 已重置为默认模型。");
  } catch (error) {
    showToast(error.message, "error");
  }
}

// ─── Event Listeners ─────────────────────────────────────────────────────────
if (workspaceForm && workspaceInput) {
  workspaceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isDevPage) {
      showToast(`开发页仅允许使用 Workspace「${DEV_WORKSPACE}」。`, "error");
      return;
    }
    const name = workspaceInput.value.trim();
    if (!name) { showToast("请输入 Workspace 名称。", "error"); return; }
    try {
      await fetchJson("/api/workspaces", { method: "POST", body: JSON.stringify({ name }) });
      workspaceInput.value = "";
      await refreshWorkspaceList(name);
      showToast(`✅ Workspace「${name}」已从 test 复制创建。`);
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

if (newDraftButton) {
  newDraftButton.addEventListener("click", createDraft);
}

if (newWorkflowButton) {
  newWorkflowButton.addEventListener("click", createWorkflow);
}

Object.entries(bucketFilterSelects).forEach(([bucket, select]) => {
  select.addEventListener("change", () => {
    state.bucketFilters[bucket] = normalizeBucketFilter(select.value);
    if (state.currentWorkspace) {
      state.bucketFiltersByWorkspace[state.currentWorkspace] = state.bucketFilters;
    }
    renderBuckets();
  });
});

saveModelButton.addEventListener("click", persistModel);
modelInput.addEventListener("change", persistModel);

runAgentButton.addEventListener("click", async () => {
  if (!state.currentWorkspace) { showToast("请先选择 Workspace。", "error"); return; }
  try {
    const model = modelInput.value.trim();
    const useProxy = useProxyCheckbox?.checked !== false;
    await fetchJson(
      `/api/workspaces/${encodeURIComponent(state.currentWorkspace)}/run-agent`,
      { method: "POST", body: JSON.stringify({ model, useProxy }) }
    );
    const proxyLabel = useProxy ? "（代理）" : "（无代理）";
    showToast(`✅ Agent 已在 ${state.currentWorkspace} 中启动${model ? `（模型: ${model}）` : ""}${proxyLabel}。`);
  } catch (error) {
    showToast(error.message, "error");
  }
});

refreshButton.addEventListener("click", async () => {
  await refreshWorkspaceList(state.currentWorkspace);
  showToast("✅ 已刷新。");
});

searchButton.addEventListener("click", performSearch);
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); performSearch(); }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".context-menu")) {
    hideContextMenu();
  }
});

document.addEventListener("contextmenu", (event) => {
  if (!event.target.closest(".ws-btn") && !event.target.closest(".card")) {
    hideContextMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (workflowManager?.isOpen()) {
      workflowManager.close();
      return;
    }
    if (!subtaskModal?.hidden) {
      closeSubtaskModal();
      return;
    }
    const chainRenameModal = document.getElementById("chain_rename_modal");
    if (chainRenameModal && !chainRenameModal.hidden) {
      closeChainRenameModal();
      return;
    }
    if (newMMModal && !newMMModal.hidden) {
      closeNewMMModal();
      return;
    }
    if (!draftModal?.hidden) {
      closeDraftModal();
      return;
    }
    hideContextMenu();
  }
});

window.addEventListener("resize", hideContextMenu);
window.addEventListener("scroll", hideContextMenu, true);

if (draftModal) {
  draftModal.addEventListener("click", (event) => {
    if (event.target === draftModal) {
      closeDraftModal();
    }
  });
}

if (contentModal) {
  contentModal.addEventListener("click", (event) => {
    if (event.target === contentModal) {
      closeContentModal();
    }
  });
}

if (contentModalClose) {
  contentModalClose.addEventListener("click", closeContentModal);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && contentModal && !contentModal.classList.contains("hidden")) {
    closeContentModal();
  }
});

// Mind map canvas events are bound in mindmap.js

if (draftCloseButton) {
  draftCloseButton.addEventListener("click", closeDraftModal);
}

if (draftSaveButton) {
  draftSaveButton.addEventListener("click", saveDraft);
}

if (draftPromoteButton) {
  draftPromoteButton.addEventListener("click", () => promoteDraftToSessions());
}

if (newMMCreate) {
  newMMCreate.addEventListener("click", confirmCreateDraft);
}
if (newMMCancel) {
  newMMCancel.addEventListener("click", closeNewMMModal);
}
if (newMMModal) {
  newMMModal.addEventListener("click", (e) => { if (e.target === newMMModal) closeNewMMModal(); });
}
if (newMMTitle) {
  newMMTitle.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); confirmCreateDraft(); }
    if (e.key === "Escape") { closeNewMMModal(); }
  });
}

function initializeWorkflowManager() {
  if (!window.AlithTaskWorkflow?.createWorkflowManager) {
    return;
  }
  workflowManager = window.AlithTaskWorkflow.createWorkflowManager({
    modal: workflowModal,
    titleEl: workflowModalTitle,
    metaEl: workflowModalMeta,
    canvasEl: workflowCanvas,
    nodesEl: workflowNodes,
    emptyEl: workflowCanvasEmpty,
    closeButton: workflowCloseButton,
    saveButton: workflowSaveButton,
    newNodeButton: workflowNewNodeButton,
    placeNodeButton: workflowPlaceNodeButton,
    onSave: saveWorkflowDocument,
    onError: (message) => showToast(message, "error"),
    onToast: (message) => showToast(message),
  });
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!state.currentWorkspace) { showToast("请先选择 Workspace。", "error"); return; }
  const content = chatInput.value.trim();
  if (!content) { showToast("内容不能为空。", "error"); return; }
  try {
    const result = await fetchJson(
      `/api/workspaces/${encodeURIComponent(state.currentWorkspace)}/tasks`,
      { method: "POST", body: JSON.stringify({ content }) }
    );
    chatInput.value = "";
    await loadWorkspace(state.currentWorkspace);
    showToast(`✅ 已创建 ${result.fileName}`);
  } catch (error) {
    showToast(error.message, "error");
  }
});

// Wire up static subtask modal refs if HTML already contains them
subtaskModalClose?.addEventListener("click", closeSubtaskModal);
subtaskModalSubmit?.addEventListener("click", submitSubtask);
subtaskModalInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitSubtask(); }
  if (e.key === "Escape") closeSubtaskModal();
});
subtaskModal?.addEventListener("click", (e) => { if (e.target === subtaskModal) closeSubtaskModal(); });


chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event("submit"));
  }
});

if (bucketContainers.sessions) {
  bucketContainers.sessions.addEventListener("dragover", (event) => {
    if (!state.draggedDraft) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    bucketContainers.sessions.classList.add("drop-target");
  });
  bucketContainers.sessions.addEventListener("dragleave", (event) => {
    if (!bucketContainers.sessions.contains(event.relatedTarget)) {
      bucketContainers.sessions.classList.remove("drop-target");
    }
  });
  bucketContainers.sessions.addEventListener("drop", async (event) => {
    event.preventDefault();
    const fileName = event.dataTransfer.getData("text/plain") || state.draggedDraft;
    bucketContainers.sessions.classList.remove("drop-target");
    await promoteDraftToSessions(fileName);
  });
}

// ─── Polling ──────────────────────────────────────────────────────────────────
function startPolling() {
  clearInterval(state.refreshTimer);
  state.refreshTimer = setInterval(() => {
    if (state.currentWorkspace) {
      loadWorkspace(state.currentWorkspace).catch(() => {});
      refreshWorkspaceList(state.currentWorkspace).catch(() => {});
    }
  }, 6000);
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
async function initialize() {
  try {
    initializeWorkflowManager();
    syncBucketFilters();
    await loadModelCatalog();
    if (isDevPage) {
      state.currentWorkspace = DEV_WORKSPACE;
      if (workspaceInput) {
        workspaceInput.value = DEV_WORKSPACE;
        workspaceInput.disabled = true;
      }
      if (workspaceForm) {
        const workspaceSection = workspaceForm.closest(".panel-section");
        if (workspaceSection) {
          workspaceSection.hidden = true;
        }
        const workspaceButton = workspaceForm.querySelector("button");
        if (workspaceButton) {
          workspaceButton.disabled = true;
        }
      }
      document.title = "alith / dev";
      renderTopMenu();
      await loadWorkspace(DEV_WORKSPACE);
    }
    await refreshWorkspaceList(isDevPage ? DEV_WORKSPACE : state.currentWorkspace);
    startPolling();
  } catch (error) {
    showToast(error.message, "error");
  }
}

initialize();
