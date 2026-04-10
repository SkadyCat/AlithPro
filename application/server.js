const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const APP_DIR = __dirname;
const PUBLIC_DIR = path.join(APP_DIR, "public");
const REPO_ROOT = path.resolve(APP_DIR, "..");
const WORKSPACE_ROOT = path.join(APP_DIR, "workspace");
const MODEL_CONFIG_PATH = path.join(APP_DIR, "model-presets.json");
const ROOT_WORKSPACE_NAME = path.basename(REPO_ROOT);
const TEMPLATE_WORKSPACE = "test";
const WORKFLOW_DIR_NAME = "WorkFlow";
const PORT = process.env.PORT || 7439;
const CARD_BUCKETS = ["drafts", "sessions", "inprocess", "processed"];
const DETAIL_BUCKETS = new Set(["drafts", "sessions", "inprocess", "processed", "doc"]);
const FALLBACK_DEFAULT_MODEL = "claude-sonnet-4.6";
const FALLBACK_MODEL_OPTIONS = [
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

app.use(express.json({ limit: "1mb" }));
app.get("/dev", (_request, response) => {
  response.sendFile(path.join(PUBLIC_DIR, "dev.html"));
});
app.use(express.static(PUBLIC_DIR));

function sanitizeWorkspaceName(input) {
  return String(input || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function ensureSafeWorkspaceName(name) {
  const normalized = sanitizeWorkspaceName(name);
  if (!normalized) {
    const error = new Error("Workspace name is required.");
    error.status = 400;
    throw error;
  }
  return normalized;
}

function ensureSafeFileName(fileName) {
  if (!fileName || fileName.includes("..") || /[\\/]/.test(fileName)) {
    const error = new Error("Invalid file name.");
    error.status = 400;
    throw error;
  }
  return fileName;
}

async function hasWorkspaceMarkers(dirPath) {
  const markerNames = ["sessions", "inprocess", "processed", "doc", "logs", "run.bat"];
  const markers = await Promise.all(
    markerNames.map(async (name) => {
      try {
        await fs.stat(path.join(dirPath, name));
        return true;
      } catch (error) {
        if (error.code === "ENOENT") {
          return false;
        }
        throw error;
      }
    })
  );
  return markers.some(Boolean);
}

async function listWorkspaceNames() {
  let names = [];
  try {
    const entries = await fs.readdir(WORKSPACE_ROOT, { withFileTypes: true });
    names = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  if (await hasWorkspaceMarkers(REPO_ROOT) && !names.includes(ROOT_WORKSPACE_NAME)) {
    names.push(ROOT_WORKSPACE_NAME);
  }

  return names.sort((left, right) => left.localeCompare(right));
}

function getWorkspaceDir(workspace) {
  const normalized = ensureSafeWorkspaceName(workspace);
  if (normalized === ROOT_WORKSPACE_NAME) {
    return REPO_ROOT;
  }
  return path.join(WORKSPACE_ROOT, normalized);
}

function ensureWorkspaceDeletable(workspace) {
  const normalized = ensureSafeWorkspaceName(workspace);
  if (normalized === ROOT_WORKSPACE_NAME) {
    const error = new Error(`Workspace "${workspace}" cannot be deleted.`);
    error.status = 400;
    throw error;
  }
  if (normalized === TEMPLATE_WORKSPACE) {
    const error = new Error(`Workspace "${workspace}" is the template workspace and cannot be deleted.`);
    error.status = 400;
    throw error;
  }
  return normalized;
}

async function ensureWorkspace(workspace) {
  const workspaceDir = getWorkspaceDir(workspace);
  try {
    const stats = await fs.stat(workspaceDir);
    if (!stats.isDirectory()) {
      throw new Error("Workspace path is not a directory.");
    }
    return workspaceDir;
  } catch (error) {
    if (error.code === "ENOENT") {
      const notFound = new Error(`Workspace "${workspace}" was not found.`);
      notFound.status = 404;
      throw notFound;
    }
    throw error;
  }
}

async function readTextIfExists(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

async function writeTextIfChanged(filePath, content) {
  const current = await readTextIfExists(filePath);
  if (current === content) {
    return false;
  }
  await fs.writeFile(filePath, content, "utf8");
  return true;
}

function getWorkspaceConfigPath(workspaceDir) {
  return path.join(workspaceDir, "config.json");
}

function getCopilotConfigPath(workspaceDir) {
  return path.join(workspaceDir, ".copilot", "config.json");
}

function normalizeModel(value) {
  const model = String(value || "").trim();
  if (!model) {
    return "";
  }
  if (model.length > 100 || /[\r\n\t]/.test(model)) {
    const error = new Error("Invalid model value.");
    error.status = 400;
    throw error;
  }
  return model;
}

function normalizeModelOption(entry) {
  if (typeof entry === "string") {
    const value = normalizeModel(entry);
    return value ? { value, label: value } : null;
  }
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }
  const value = normalizeModel(entry.value);
  if (!value) {
    return null;
  }
  const label = String(entry.label || value).trim() || value;
  return { value, label };
}

async function readModelCatalog() {
  const content = await readTextIfExists(MODEL_CONFIG_PATH);
  if (!content.trim()) {
    return {
      defaultModel: FALLBACK_DEFAULT_MODEL,
      modelOptions: FALLBACK_MODEL_OPTIONS,
      presets: FALLBACK_MODEL_OPTIONS.map((option) => option.value),
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    const parseError = new Error(`Model config is invalid JSON: ${MODEL_CONFIG_PATH}`);
    parseError.status = 500;
    throw parseError;
  }

  const configuredOptions = Array.isArray(parsed?.modelOptions)
    ? parsed.modelOptions
    : Array.isArray(parsed?.presets)
      ? parsed.presets
      : FALLBACK_MODEL_OPTIONS;

  const dedupedOptions = [];
  const seenValues = new Set();
  configuredOptions.forEach((entry) => {
    const option = normalizeModelOption(entry);
    if (!option || seenValues.has(option.value)) {
      return;
    }
    seenValues.add(option.value);
    dedupedOptions.push(option);
  });

  if (!dedupedOptions.length) {
    dedupedOptions.push(...FALLBACK_MODEL_OPTIONS);
  }

  let defaultModel = normalizeModel(parsed?.defaultModel || "");
  if (!defaultModel) {
    defaultModel = dedupedOptions[0]?.value || FALLBACK_DEFAULT_MODEL;
  }
  if (!dedupedOptions.some((option) => option.value === defaultModel)) {
    dedupedOptions.unshift({ value: defaultModel, label: defaultModel });
  }

  return {
    defaultModel,
    modelOptions: dedupedOptions,
    presets: dedupedOptions.map((option) => option.value),
  };
}

async function buildWorkspaceSettings(workspaceDir, preferredModel = "") {
  const [modelCatalog, model] = await Promise.all([
    readModelCatalog(),
    syncWorkspaceLaunchers(workspaceDir, preferredModel),
  ]);
  return {
    model,
    presets: modelCatalog.presets,
    modelOptions: modelCatalog.modelOptions,
  };
}

app.get("/api/model-presets", async (_request, response, next) => {
  try {
    const modelCatalog = await readModelCatalog();
    response.json(modelCatalog);
  } catch (error) {
    next(error);
  }
});

async function readWorkspaceConfig(workspaceDir) {
  const configPath = getWorkspaceConfigPath(workspaceDir);
  const content = await readTextIfExists(configPath);
  if (!content.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    const parseError = new Error(`Workspace config is invalid JSON: ${configPath}`);
    parseError.status = 500;
    throw parseError;
  }
}

async function readCopilotConfig(workspaceDir) {
  const configPath = getCopilotConfigPath(workspaceDir);
  const content = await readTextIfExists(configPath);
  if (!content.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    const parseError = new Error(`Copilot config is invalid JSON: ${configPath}`);
    parseError.status = 500;
    throw parseError;
  }
}

async function writeWorkspaceConfig(workspaceDir, updates) {
  const configPath = getWorkspaceConfigPath(workspaceDir);
  const currentConfig = await readWorkspaceConfig(workspaceDir);
  const nextConfig = {
    ...currentConfig,
    ...updates,
  };

  if (!nextConfig.model) {
    delete nextConfig.model;
  }

  await fs.writeFile(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`, "utf8");
  return nextConfig;
}

async function readRunBatModel(workspaceDir) {
  const runBatPath = path.join(workspaceDir, "run.bat");
  const content = await readTextIfExists(runBatPath);
  const match = content.match(/--model=([^\s\r\n]+)/);
  return match ? normalizeModel(match[1]) : "";
}

async function resolveDefaultLauncherModel(workspaceDir) {
  const [copilotConfig, modelCatalog] = await Promise.all([
    readCopilotConfig(workspaceDir),
    readModelCatalog(),
  ]);
  return normalizeModel(copilotConfig.model || "") || modelCatalog.defaultModel;
}

async function resolveLauncherModel(workspaceDir, preferredModel = "") {
  if (preferredModel) {
    return preferredModel;
  }

  const runBatModel = await readRunBatModel(workspaceDir);
  if (runBatModel) {
    return runBatModel;
  }

  return resolveDefaultLauncherModel(workspaceDir);
}

function buildRunBatContent(model) {
  return [
    "@echo off",
    "echo ========================================",
    "echo   GitHub Copilot CLI launcher (wmsxwd)",
    "echo ========================================",
    "",
    ":: Keep this file in CRLF format so cmd.exe reads each command correctly.",
    ":: If your proxy port differs, update PROXY_PORT below.",
    "set PROXY_PORT=7897",
    "",
    ":: Configure proxy",
    "set HTTP_PROXY=http://127.0.0.1:%PROXY_PORT%",
    "set HTTPS_PROXY=http://127.0.0.1:%PROXY_PORT%",
    "set NO_PROXY=localhost,127.0.0.1,.github.com,.githubusercontent.com,*.github.com",
    "",
    `copilot --allow-all --model=${model}`,
    "",
  ].join("\r\n");
}

function buildRunWithoutProxyBatContent(model) {
  return [
    "@echo off",
    "echo ========================================",
    "echo   GitHub Copilot CLI launcher (wmsxwd)",
    "echo ========================================",
    "",
    `copilot --allow-all --model=${model}`,
    "",
  ].join("\r\n");
}

function buildExportLogBatContent(model) {
  return [
    "@echo off",
    "setlocal EnableExtensions",
    "",
    "cd /d %~dp0",
    "if not exist logs mkdir logs",
    "",
    'set "shell_log=logs\\copilot-shell.log"',
    "",
    "(",
    '    echo [INFO] Starting Copilot CLI with shell output redirected to "%shell_log%".',
    `    echo [INFO] Command line: copilot --allow-all --model=${model} --log-dir=logs --log-level=all %*`,
    `    copilot --allow-all --model=${model} --log-dir=logs --log-level=all %*`,
    ') > "%shell_log%" 2>&1',
    "",
    "endlocal",
    "",
  ].join("\r\n");
}

async function syncWorkspaceLaunchers(workspaceDir, preferredModel = "") {
  const model = await resolveLauncherModel(workspaceDir, preferredModel);
  await Promise.all([
    writeTextIfChanged(path.join(workspaceDir, "run.bat"), buildRunBatContent(model)),
    writeTextIfChanged(path.join(workspaceDir, "run_without_proxy.bat"), buildRunWithoutProxyBatContent(model)),
    writeTextIfChanged(path.join(workspaceDir, "export_log.bat"), buildExportLogBatContent(model)),
  ]);
  return model;
}

function parseSubtaskParent(content) {
  const match = content.match(/^这个文本是(.+?)的迭代子任务/m);
  return match ? match[1].trim() : "";
}

function parseSubtaskChain(content) {
  const match = content.match(/^任务链路：(.+)$/m);
  return match ? match[1].trim() : "";
}

function summarizeText(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.slice(0, 3).join(" ").slice(0, 180);
}

function getWorkflowDir(workspaceDir) {
  return path.join(workspaceDir, WORKFLOW_DIR_NAME);
}

function getWorkflowPath(workspaceDir, fileName) {
  return path.join(getWorkflowDir(workspaceDir), ensureSafeFileName(fileName));
}

function createWorkflowFileName() {
  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  return `workflow-${iso}.json`;
}

function createWorkflowNodeId() {
  return `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function extractTitleFromContent(content, fallback) {
  const lines = String(content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const heading = lines.find((line) => line.startsWith("#"));
  if (heading) {
    return heading.replace(/^#+\s*/, "").trim() || fallback;
  }
  return lines[0] || fallback;
}

function normalizeWorkflowNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeWorkflowNode(node, index = 0) {
  const rawFileName = String(node?.fileName || "").trim();
  const rawBucket = String(node?.bucket || "").trim();
  const safeFileName = rawFileName ? ensureSafeFileName(rawFileName) : "";
  const nodeType = ["start", "end", "document"].includes(String(node?.type || "").trim())
    ? String(node.type).trim()
    : "document";
  return {
    id: String(node?.id || createWorkflowNodeId()),
    type: nodeType,
    title: String(node?.title || safeFileName || `未命名节点 ${index + 1}`).trim().slice(0, 200) || `未命名节点 ${index + 1}`,
    bucket: rawBucket || (safeFileName ? "drafts" : "custom"),
    fileName: safeFileName,
    x: normalizeWorkflowNumber(node?.x, 80 + index * 36),
    y: normalizeWorkflowNumber(node?.y, 80 + index * 20),
    width: Math.max(280, normalizeWorkflowNumber(node?.width, 340)),
    height: Math.max(150, normalizeWorkflowNumber(node?.height, 180)),
  };
}

function ensureWorkflowBoundaryNodes(nodes) {
  const normalized = Array.isArray(nodes) ? nodes.map((node) => ({ ...node })) : [];
  const hasStart = normalized.some((node) => node.type === "start");
  const hasEnd = normalized.some((node) => node.type === "end");

  if (!hasStart) {
    normalized.unshift({
      id: createWorkflowNodeId(),
      type: "start",
      title: "开始",
      bucket: "workflow",
      fileName: "",
      x: 96,
      y: 220,
      width: 280,
      height: 160,
    });
  }

  if (!hasEnd) {
    normalized.push({
      id: createWorkflowNodeId(),
      type: "end",
      title: "结束",
      bucket: "workflow",
      fileName: "",
      x: 1080,
      y: 220,
      width: 280,
      height: 160,
    });
  }

  return normalized;
}

function normalizeWorkflowDocument(input, fallbacks = {}) {
  const sourceBucket = String(input?.source?.bucket || fallbacks.source?.bucket || "").trim();
  const sourceFileNameRaw = String(input?.source?.fileName || fallbacks.source?.fileName || "").trim();
  const sourceFileName = sourceFileNameRaw ? ensureSafeFileName(sourceFileNameRaw) : "";
  const fallbackNodes = Array.isArray(fallbacks.nodes) ? fallbacks.nodes : [];
  const normalizedNodes = ensureWorkflowBoundaryNodes(
    (Array.isArray(input?.nodes) ? input.nodes : fallbackNodes).map((node, index) =>
      normalizeWorkflowNode(node, index)
    )
  );
  const title = String(input?.title || fallbacks.title || "未命名任务流").trim().slice(0, 200) || "未命名任务流";

  return {
    version: 1,
    title,
    source: {
      bucket: sourceBucket,
      fileName: sourceFileName,
    },
    nodes: normalizedNodes,
    createdAt: String(input?.createdAt || fallbacks.createdAt || new Date().toISOString()),
    updatedAt: new Date().toISOString(),
  };
}

function buildWorkflowPreview(workflow) {
  const sourceFileName = workflow?.source?.fileName || "";
  const sourceText = sourceFileName ? `来源 ${sourceFileName}` : "未绑定来源文档";
  return `${workflow.nodes.length} 个节点 · ${sourceText}`;
}

async function readWorkflowDocument(workspaceDir, fileName) {
  const workflowPath = getWorkflowPath(workspaceDir, fileName);
  const content = await fs.readFile(workflowPath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    const parseError = new Error(`Workflow document is invalid JSON: ${workflowPath}`);
    parseError.status = 500;
    throw parseError;
  }

  const stats = await fs.stat(workflowPath);
  const workflow = normalizeWorkflowDocument(parsed, {
    title: path.parse(fileName).name,
    createdAt: stats.birthtime.toISOString(),
  });

  return {
    fileName,
    fullPath: workflowPath,
    ...workflow,
    updatedAt: stats.mtime.toISOString(),
  };
}

async function writeWorkflowDocument(workspaceDir, fileName, workflowInput, fallbacks = {}) {
  const workflowPath = getWorkflowPath(workspaceDir, fileName);
  const workflowDir = path.dirname(workflowPath);
  await fs.mkdir(workflowDir, { recursive: true });
  const workflow = normalizeWorkflowDocument(workflowInput, fallbacks);
  await fs.writeFile(workflowPath, `${JSON.stringify(workflow, null, 2)}\n`, "utf8");
  return readWorkflowDocument(workspaceDir, fileName);
}

async function listWorkflows(workspaceDir) {
  const workflowDir = getWorkflowDir(workspaceDir);
  let entries = [];
  try {
    entries = await fs.readdir(workflowDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const workflows = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => {
        const workflow = await readWorkflowDocument(workspaceDir, entry.name);
        return {
          fileName: entry.name,
          title: workflow.title,
          preview: buildWorkflowPreview(workflow),
          updatedAt: workflow.updatedAt,
          fullPath: workflow.fullPath,
          nodeCount: workflow.nodes.length,
          sourceFileName: workflow.source?.fileName || "",
        };
      })
  );

  return workflows;
}

async function listCards(workspaceDir, bucketName) {
  const bucketDir = path.join(workspaceDir, bucketName);
  let entries = [];
  try {
    entries = await fs.readdir(bucketDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const cards = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => {
        const filePath = path.join(bucketDir, entry.name);
        const content = await readTextIfExists(filePath);
        const stats = await fs.stat(filePath);
        const stem = path.parse(entry.name).name;
        const linkedDocName = `${stem}_doc.md`;
        const linkedDocPath = path.join(workspaceDir, "doc", linkedDocName);
        let hasLinkedDoc = false;

        if (bucketName === "processed") {
          try {
            const docStats = await fs.stat(linkedDocPath);
            hasLinkedDoc = docStats.isFile();
          } catch (error) {
            if (error.code !== "ENOENT") {
              throw error;
            }
          }
        }

        const subtaskParent = parseSubtaskParent(content);

        return {
          fileName: entry.name,
          title: entry.name,
          preview: summarizeText(content) || "(empty document)",
          updatedAt: stats.mtime.toISOString(),
          fullPath: filePath,
          linkedDocName: hasLinkedDoc ? linkedDocName : "",
          hasLinkedDoc,
          subtaskParent,
        };
      })
  );

  return cards;
}

async function listDocs(workspaceDir) {
  const docDir = path.join(workspaceDir, "doc");
  try {
    const entries = await fs.readdir(docDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function readLogTail(workspaceDir, maxLines = 200) {
  const logPath = path.join(workspaceDir, "logs", "agent-realtime.log");
  const content = await readTextIfExists(logPath);
  const lines = content.split(/\r?\n/).filter(Boolean);
  return {
    fileName: path.basename(logPath),
    lines: lines.slice(-maxLines),
  };
}

async function buildWorkspaceSummary(workspace) {
  const workspaceDir = await ensureWorkspace(workspace);
  const [drafts, sessions, inprocess, processed, workflows, docs, logs] = await Promise.all([
    listCards(workspaceDir, "drafts"),
    listCards(workspaceDir, "sessions"),
    listCards(workspaceDir, "inprocess"),
    listCards(workspaceDir, "processed"),
    listWorkflows(workspaceDir),
    listDocs(workspaceDir),
    readLogTail(workspaceDir),
  ]);

  return {
    workspace,
    buckets: {
      drafts,
      sessions,
      inprocess,
      processed,
    },
    workflows,
    docs,
    logs,
    settings: await buildWorkspaceSettings(workspaceDir),
  };
}

function getDetailPath(workspaceDir, bucket, fileName) {
  if (!DETAIL_BUCKETS.has(bucket)) {
    const error = new Error("Invalid bucket.");
    error.status = 400;
    throw error;
  }
  return path.join(workspaceDir, bucket, ensureSafeFileName(fileName));
}

async function deleteWorkspace(workspace) {
  const normalized = ensureWorkspaceDeletable(workspace);
  const workspaceDir = getWorkspaceDir(normalized);
  try {
    const stats = await fs.stat(workspaceDir);
    if (!stats.isDirectory()) {
      const notFound = new Error(`Workspace "${workspace}" was not found.`);
      notFound.status = 404;
      throw notFound;
    }
  } catch (error) {
    if (error.status === 404) {
      throw error;
    }
    if (error.code === "ENOENT") {
      const notFound = new Error(`Workspace "${workspace}" was not found.`);
      notFound.status = 404;
      throw notFound;
    }
    throw error;
  }
  try {
    await fs.rm(workspaceDir, {
      recursive: true,
      force: false,
      maxRetries: 5,
      retryDelay: 200,
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      const notFound = new Error(`Workspace "${workspace}" was not found.`);
      notFound.status = 404;
      throw notFound;
    }
    if (["EPERM", "EBUSY", "ENOTEMPTY"].includes(error.code)) {
      const deleteError = new Error(
        `Workspace "${workspace}" could not be deleted because some files are still in use. Close any process using that workspace and try again.`
      );
      deleteError.status = 409;
      throw deleteError;
    }
    throw error;
  }
}

async function deleteWorkspaceItem(workspaceDir, bucket, fileName) {
  const itemPath = getDetailPath(workspaceDir, bucket, fileName);
  await fs.rm(itemPath, { force: false });

  let deletedLinkedDoc = "";
  if (bucket === "processed") {
    const stem = path.parse(fileName).name;
    const linkedDocName = `${stem}_doc.md`;
    const linkedDocPath = path.join(workspaceDir, "doc", linkedDocName);
    try {
      await fs.rm(linkedDocPath, { force: false });
      deletedLinkedDoc = linkedDocName;
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  return {
    deleted: true,
    bucket,
    fileName,
    deletedLinkedDoc,
  };
}

function createTaskFileName() {
  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  return `msg-${iso}.md`;
}

function createDraftFileName() {
  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  return `draft-${iso}.md`;
}

app.get("/api/workspaces", async (_request, response, next) => {
  try {
    const workspaces = await listWorkspaceNames();
    const items = await Promise.all(
      workspaces.map(async (workspace) => {
        const summary = await buildWorkspaceSummary(workspace);
        return {
          name: workspace,
          counts: {
            drafts: summary.buckets.drafts.length,
            sessions: summary.buckets.sessions.length,
            inprocess: summary.buckets.inprocess.length,
            processed: summary.buckets.processed.length,
            workflows: (summary.workflows || []).length,
          },
        };
      })
    );
    response.json({ workspaces: items });
  } catch (error) {
    next(error);
  }
});

app.post("/api/workspaces", async (request, response, next) => {
  try {
    const name = ensureSafeWorkspaceName(request.body?.name);
    const templateDir = await ensureWorkspace(TEMPLATE_WORKSPACE);
    const targetDir = path.join(WORKSPACE_ROOT, name);
    const templateModel = await resolveLauncherModel(templateDir);

    try {
      await fs.stat(targetDir);
      const existsError = new Error(`Workspace "${name}" already exists.`);
      existsError.status = 409;
      throw existsError;
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    await fs.cp(templateDir, targetDir, { recursive: true });

    // Clear runtime data from the template copy — keep the dirs, remove their contents.
    const CLEAR_DIRS = ["drafts", "sessions", "doc", "processed", "logs", "inprocess", WORKFLOW_DIR_NAME];
    await Promise.all(
      CLEAR_DIRS.map(async (dirName) => {
        const dirPath = path.join(targetDir, dirName);
        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true });
          await Promise.all(
            entries.map((entry) =>
              fs.rm(path.join(dirPath, entry.name), { recursive: true, force: true })
            )
          );
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
          // dir didn't exist in template — create it fresh
          await fs.mkdir(dirPath, { recursive: true });
        }
      })
    );

    await syncWorkspaceLaunchers(targetDir, templateModel);

    response.status(201).json({
      created: true,
      workspace: name,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/workspaces/:workspace/clone", async (request, response, next) => {
  try {
    const sourceDir = await ensureWorkspace(request.params.workspace);
    const newName = ensureSafeWorkspaceName(request.body?.newName);
    const keepDocs = Boolean(request.body?.keepDocs);

    if (!newName) {
      const error = new Error("New workspace name is required.");
      error.status = 400;
      throw error;
    }

    const targetDir = path.join(WORKSPACE_ROOT, newName);
    try {
      await fs.stat(targetDir);
      const existsError = new Error(`Workspace "${newName}" already exists.`);
      existsError.status = 409;
      throw existsError;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    await fs.cp(sourceDir, targetDir, { recursive: true });

    if (!keepDocs) {
      const CLEAR_DIRS = ["drafts", "sessions", "doc", "processed", "logs", "inprocess", WORKFLOW_DIR_NAME];
      await Promise.all(
        CLEAR_DIRS.map(async (dirName) => {
          const dirPath = path.join(targetDir, dirName);
          try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            await Promise.all(
              entries.map((entry) =>
                fs.rm(path.join(dirPath, entry.name), { recursive: true, force: true })
              )
            );
          } catch (error) {
            if (error.code !== "ENOENT") throw error;
          }
        })
      );
    }

    const sourceModel = await resolveLauncherModel(sourceDir);
    await syncWorkspaceLaunchers(targetDir, sourceModel);

    response.status(201).json({ created: true, workspace: newName });
  } catch (error) {
    next(error);
  }
});

app.post("/api/workspaces/:workspace/sync-github", async (request, response, next) => {
  try {
    const targetDir = await ensureWorkspace(request.params.workspace);
    const sourceName = ensureSafeWorkspaceName(request.body?.sourceWorkspace);
    if (!sourceName) {
      const error = new Error("sourceWorkspace is required.");
      error.status = 400;
      throw error;
    }
    const sourceDir = path.join(WORKSPACE_ROOT, sourceName);
    try {
      await fs.stat(sourceDir);
    } catch {
      const error = new Error(`Source workspace "${sourceName}" not found.`);
      error.status = 404;
      throw error;
    }
    const sourceGithub = path.join(sourceDir, ".github");
    const targetGithub = path.join(targetDir, ".github");
    try {
      await fs.stat(sourceGithub);
    } catch {
      const error = new Error(`Source workspace "${sourceName}" has no .github folder.`);
      error.status = 404;
      throw error;
    }
    // Overwrite target .github with source .github
    await fs.rm(targetGithub, { recursive: true, force: true });
    await fs.cp(sourceGithub, targetGithub, { recursive: true });
    response.json({ synced: true, from: sourceName, to: request.params.workspace });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/workspaces/:workspace", async (request, response, next) => {
  try {
    await deleteWorkspace(request.params.workspace);
    response.json({
      deleted: true,
      workspace: request.params.workspace,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/workspaces/:workspace/drafts", async (request, response, next) => {
  try {
    const workspaceDir = await ensureWorkspace(request.params.workspace);
    const content = String(request.body?.content || "");
    const fileName = createDraftFileName();
    const draftDir = path.join(workspaceDir, "drafts");
    const draftPath = path.join(draftDir, fileName);
    await fs.mkdir(draftDir, { recursive: true });
    await fs.writeFile(draftPath, content, "utf8");
    response.status(201).json({
      created: true,
      bucket: "drafts",
      fileName,
      content,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/workspaces/:workspace", async (request, response, next) => {
  try {
    const summary = await buildWorkspaceSummary(request.params.workspace);
    response.json(summary);
  } catch (error) {
    next(error);
  }
});

app.get("/api/workspaces/:workspace/item", async (request, response, next) => {
  try {
    const workspaceDir = await ensureWorkspace(request.params.workspace);
    const bucket = String(request.query.bucket || "");
    const fileName = String(request.query.file || "");
    const itemPath = getDetailPath(workspaceDir, bucket, fileName);
    const content = await fs.readFile(itemPath, "utf8");
    const stem = path.parse(fileName).name;
    const linkedDocName = `${stem}_doc.md`;
    const linkedDocContent = await readTextIfExists(path.join(workspaceDir, "doc", linkedDocName));

    response.json({
      bucket,
      fileName,
      fullPath: itemPath,
      content,
      linkedDocName,
      linkedDocContent,
    });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/workspaces/:workspace/item", async (request, response, next) => {
  try {
    const workspaceDir = await ensureWorkspace(request.params.workspace);
    const bucket = String(request.query.bucket || "");
    const fileName = String(request.query.file || "");
    response.json(await deleteWorkspaceItem(workspaceDir, bucket, fileName));
  } catch (error) {
    next(error);
  }
});

app.put("/api/workspaces/:workspace/item", async (request, response, next) => {
  try {
    const workspaceDir = await ensureWorkspace(request.params.workspace);
    const bucket = String(request.query.bucket || "");
    const fileName = String(request.query.file || "");
    if (bucket !== "drafts") {
      const error = new Error("Only drafts can be edited.");
      error.status = 400;
      throw error;
    }

    const content = String(request.body?.content || "");
    const itemPath = getDetailPath(workspaceDir, bucket, fileName);
    await fs.mkdir(path.dirname(itemPath), { recursive: true });
    await fs.writeFile(itemPath, content, "utf8");
    response.json({
      saved: true,
      bucket,
      fileName,
      content,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/workspaces/:workspace/drafts/:file/promote", async (request, response, next) => {
  try {
    const workspaceDir = await ensureWorkspace(request.params.workspace);
    const sourceFileName = ensureSafeFileName(request.params.file);
    const sourcePath = path.join(workspaceDir, "drafts", sourceFileName);
    const content = await fs.readFile(sourcePath, "utf8");
    const targetFileName = createTaskFileName();
    const targetPath = path.join(workspaceDir, "sessions", targetFileName);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, "utf8");
    await fs.rm(sourcePath, { force: false });
    response.json({
      promoted: true,
      sourceBucket: "drafts",
      sourceFileName,
      targetBucket: "sessions",
      targetFileName,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/workspaces/:workspace/drafts/:file/workflow", async (request, response, next) => {
  try {
    const workspaceDir = await ensureWorkspace(request.params.workspace);
    const sourceFileName = ensureSafeFileName(request.params.file);
    const sourcePath = path.join(workspaceDir, "drafts", sourceFileName);
    const content = await fs.readFile(sourcePath, "utf8");
    const sourceTitle = extractTitleFromContent(content, sourceFileName);
    const fileName = createWorkflowFileName();
    const workflow = await writeWorkflowDocument(
      workspaceDir,
      fileName,
      {
        title: `${sourceTitle} 任务流`,
        source: {
          bucket: "drafts",
          fileName: sourceFileName,
        },
        nodes: [
          {
            id: createWorkflowNodeId(),
            type: "start",
            title: "开始",
            bucket: "workflow",
            fileName: "",
            x: 96,
            y: 220,
            width: 280,
            height: 160,
          },
          {
            id: createWorkflowNodeId(),
            type: "document",
            title: sourceTitle,
            bucket: "drafts",
            fileName: sourceFileName,
            x: 460,
            y: 180,
            width: 360,
            height: 180,
          },
          {
            id: createWorkflowNodeId(),
            type: "end",
            title: "结束",
            bucket: "workflow",
            fileName: "",
            x: 920,
            y: 220,
            width: 280,
            height: 160,
          },
        ],
      },
      {
        title: `${sourceTitle} 任务流`,
      }
    );

    response.status(201).json({
      created: true,
      fileName,
      workflow,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/workspaces/:workspace/workflows", async (request, response, next) => {
  try {
    const workspaceDir = await ensureWorkspace(request.params.workspace);
    const requestedTitle = String(request.body?.title || "").trim();
    const title = requestedTitle || `任务流 ${new Date().toLocaleString("zh-CN", { hour12: false })}`;
    const fileName = createWorkflowFileName();
    const workflow = await writeWorkflowDocument(workspaceDir, fileName, {
      title,
      nodes: [],
    });

    response.status(201).json({
      created: true,
      fileName,
      workflow,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/workspaces/:workspace/workflows/:file", async (request, response, next) => {
  try {
    const workspaceDir = await ensureWorkspace(request.params.workspace);
    const fileName = ensureSafeFileName(request.params.file);
    response.json(await readWorkflowDocument(workspaceDir, fileName));
  } catch (error) {
    next(error);
  }
});

app.put("/api/workspaces/:workspace/workflows/:file", async (request, response, next) => {
  try {
    const workspaceDir = await ensureWorkspace(request.params.workspace);
    const fileName = ensureSafeFileName(request.params.file);
    let existing;
    try {
      existing = await readWorkflowDocument(workspaceDir, fileName);
    } catch (error) {
      if (error.status !== 404 && error.code !== "ENOENT") {
        throw error;
      }
      existing = null;
    }

    const workflow = await writeWorkflowDocument(
      workspaceDir,
      fileName,
      request.body || {},
      {
        title: existing?.title || path.parse(fileName).name,
        source: existing?.source || {},
        nodes: existing?.nodes || [],
        createdAt: existing?.createdAt || new Date().toISOString(),
      }
    );

    response.json({
      saved: true,
      workflow,
    });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/workspaces/:workspace/workflows/:file", async (request, response, next) => {
  try {
    const workspaceDir = await ensureWorkspace(request.params.workspace);
    const fileName = ensureSafeFileName(request.params.file);
    await fs.rm(getWorkflowPath(workspaceDir, fileName), { force: false });
    response.json({
      deleted: true,
      fileName,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/workspaces/:workspace/logs", async (request, response, next) => {
  try {
    const workspaceDir = await ensureWorkspace(request.params.workspace);
    const tail = Number.parseInt(String(request.query.tail || "200"), 10);
    response.json(await readLogTail(workspaceDir, Number.isNaN(tail) ? 200 : tail));
  } catch (error) {
    next(error);
  }
});

app.post("/api/workspaces/:workspace/tasks", async (request, response, next) => {
  try {
    const workspaceDir = await ensureWorkspace(request.params.workspace);
    const content = String(request.body?.content || "").trim();
    if (!content) {
      const error = new Error("Task content cannot be empty.");
      error.status = 400;
      throw error;
    }

    const fileName = createTaskFileName();
    const taskPath = path.join(workspaceDir, "sessions", fileName);
    await fs.mkdir(path.dirname(taskPath), { recursive: true });
    await fs.writeFile(taskPath, `${content}\n`, "utf8");

    response.status(201).json({
      created: true,
      fileName,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/workspaces/:workspace/tasks/subtask", async (request, response, next) => {
  try {
    const workspaceDir = await ensureWorkspace(request.params.workspace);
    const { parentBucket, parentFileName, content } = request.body || {};

    if (!String(content || "").trim()) {
      const error = new Error("Sub-task content cannot be empty.");
      error.status = 400;
      throw error;
    }
    if (!parentBucket || !parentFileName) {
      const error = new Error("Parent information is required.");
      error.status = 400;
      throw error;
    }

    const parentPath = path.join(workspaceDir, parentBucket, parentFileName);
    const parentContent = await readTextIfExists(parentPath);
    const existingChain = parseSubtaskChain(parentContent);
    const chain = existingChain
      ? `${existingChain} > ${parentFileName}`
      : parentFileName;

    const taskContent = `这个文本是${parentFileName}的迭代子任务，它的需求是：\n${String(content).trim()}\n\n---\n任务链路：${chain}`;

    const fileName = createTaskFileName();
    const taskPath = path.join(workspaceDir, "sessions", fileName);
    await fs.mkdir(path.dirname(taskPath), { recursive: true });
    await fs.writeFile(taskPath, `${taskContent}\n`, "utf8");

    response.status(201).json({ created: true, fileName, chain });
  } catch (error) {
    next(error);
  }
});

app.put("/api/workspaces/:workspace/settings", async (request, response, next) => {
  try {
    const workspaceDir = await ensureWorkspace(request.params.workspace);
    const model = normalizeModel(request.body?.model);
    const launcherModel = await syncWorkspaceLaunchers(workspaceDir, model);

    response.json({
      saved: true,
      settings: await buildWorkspaceSettings(workspaceDir, launcherModel),
      launcherModel,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/workspaces/:workspace/run-agent", async (request, response, next) => {
  try {
    const workspaceDir = await ensureWorkspace(request.params.workspace);
    const model = normalizeModel(request.body?.model);
    const useProxy = request.body?.useProxy !== false;
    const launcherModel = await syncWorkspaceLaunchers(workspaceDir, model);

    const launcherScript = path.join(APP_DIR, "launch-agent.py");
    await fs.access(launcherScript);

    const args = [launcherScript, request.params.workspace, launcherModel];
    if (!useProxy) args.push("--no-proxy");

    const child = spawn("python", args, {
      cwd: APP_DIR,
      detached: true,
      stdio: ["ignore", "ignore", "ignore"],
      windowsHide: false,
    });
    child.unref();

    response.json({
      started: true,
      workspace: request.params.workspace,
      model: launcherModel,
      useProxy,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/workspaces/:workspace/search", async (request, response, next) => {
  try {
    const workspaceDir = await ensureWorkspace(request.params.workspace);
    const query = String(request.query.q || "").toLowerCase().trim();
    if (!query) {
      return response.json({ results: [], query: "" });
    }

    const searchBuckets = ["drafts", "sessions", "inprocess", "processed", "doc"];
    const allResults = [];

    for (const bucket of searchBuckets) {
      const bucketDir = path.join(workspaceDir, bucket);
      let entries = [];
      try {
        entries = await fs.readdir(bucketDir, { withFileTypes: true });
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        continue;
      }

      const mdFiles = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"));
      for (const entry of mdFiles) {
        const filePath = path.join(bucketDir, entry.name);
        const content = await readTextIfExists(filePath);
        if (content.toLowerCase().includes(query) || entry.name.toLowerCase().includes(query)) {
          allResults.push({
            bucket,
            fileName: entry.name,
            preview: summarizeText(content),
          });
        }
      }
    }

    response.json({ results: allResults, query });
  } catch (error) {
    next(error);
  }
});

app.use((request, response, next) => {
  if (request.path.startsWith("/api/")) {
    next();
    return;
  }
  response.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.use((error, _request, response, _next) => {
  const status = error.status || 500;
  response.status(status).json({
    error: error.message || "Unexpected server error.",
  });
});

app.listen(PORT, () => {
  console.log(`alith is running on http://localhost:${PORT}`);
});
