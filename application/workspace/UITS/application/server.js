const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const port = Number(process.env.PORT || 3200);
const host = "127.0.0.1";
const publicDir = path.join(__dirname, "public");
const exportDir = path.join(publicDir, "exports");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const exportThemeByScreen = {
  inventory: "neon",
  "inventory-guofeng": "guofeng",
  "inventory-sci-fi": "scifi",
  "inventory-light": "light"
};

const allowedExportThemes = new Set(["neon", "guofeng", "scifi", "light"]);

function send(res, statusCode, body, contentType) {
  res.writeHead(statusCode, { "Content-Type": contentType });
  res.end(body);
}

function sendJson(res, statusCode, payload) {
  send(res, statusCode, JSON.stringify(payload), "application/json; charset=utf-8");
}

function resolveFile(urlPath) {
  const normalized = urlPath === "/" ? "/index.html" : urlPath;
  const safePath = path.normalize(normalized).replace(/^(\.\.[\\/])+/, "");
  return path.join(publicDir, safePath);
}

function resolveExportTheme(requestUrl) {
  const theme = requestUrl.searchParams.get("theme");
  if (theme && allowedExportThemes.has(theme)) {
    return theme;
  }

  const screen = requestUrl.searchParams.get("screen");
  if (screen && exportThemeByScreen[screen]) {
    return exportThemeByScreen[screen];
  }

  return "neon";
}

async function renderInventoryExport(theme) {
  await fs.promises.mkdir(exportDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 980 },
    deviceScaleFactor: 1
  });
  const fileName = `inventory-${theme}-${Date.now()}.png`;
  const filePath = path.join(exportDir, fileName);

  try {
    await page.goto(`http://${host}:${port}/inventory-export.html?theme=${theme}`, {
      waitUntil: "networkidle"
    });
    const shot = page.locator("#export-shot.ready");
    await shot.waitFor({ state: "visible", timeout: 10000 });
    await shot.screenshot({
      path: filePath,
      type: "png"
    });
  } finally {
    await page.close();
    await browser.close();
  }

  return fileName;
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    send(res, 400, "Bad Request", "text/plain; charset=utf-8");
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);

  // --- Suggestion API ---
  const suggestionsDir = path.join(publicDir, "suggestions");

  if (requestUrl.pathname === "/api/save-suggestion" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const { controlId, markdown } = JSON.parse(body);
        if (!controlId || !markdown) {
          sendJson(res, 400, { ok: false, message: "controlId and markdown required" });
          return;
        }
        fs.mkdirSync(suggestionsDir, { recursive: true });
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `${controlId}_${ts}.md`;
        const filePath = path.join(suggestionsDir, filename);
        const header = `# 修改意见 — ${controlId}\n> 创建时间: ${new Date().toLocaleString("zh-CN")}\n\n`;
        fs.writeFileSync(filePath, header + markdown, "utf-8");
        sendJson(res, 200, { ok: true, filename });
      } catch (e) {
        sendJson(res, 500, { ok: false, message: e.message });
      }
    });
    return;
  }

  if (requestUrl.pathname === "/api/list-suggestions" && req.method === "GET") {
    try {
      fs.mkdirSync(suggestionsDir, { recursive: true });
      const files = fs.readdirSync(suggestionsDir).filter(f => f.endsWith(".md")).sort();
      const items = files.map(f => {
        const content = fs.readFileSync(path.join(suggestionsDir, f), "utf-8");
        return { filename: f, content };
      });
      sendJson(res, 200, { ok: true, items });
    } catch (e) {
      sendJson(res, 500, { ok: false, message: e.message });
    }
    return;
  }

  if (requestUrl.pathname === "/api/delete-suggestion" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const { filename } = JSON.parse(body);
        if (!filename) {
          sendJson(res, 400, { ok: false, message: "filename required" });
          return;
        }
        const safeName = path.basename(filename);
        const filePath = path.join(suggestionsDir, safeName);
        if (!fs.existsSync(filePath)) {
          sendJson(res, 404, { ok: false, message: "File not found" });
          return;
        }
        fs.unlinkSync(filePath);
        sendJson(res, 200, { ok: true, deleted: safeName });
      } catch (e) {
        sendJson(res, 500, { ok: false, message: e.message });
      }
    });
    return;
  }

  if (requestUrl.pathname === "/api/update-suggestion" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const { filename, markdown } = JSON.parse(body);
        if (!filename || !markdown) {
          sendJson(res, 400, { ok: false, message: "filename and markdown required" });
          return;
        }
        const safeName = path.basename(filename);
        const filePath = path.join(suggestionsDir, safeName);
        if (!fs.existsSync(filePath)) {
          sendJson(res, 404, { ok: false, message: "File not found" });
          return;
        }
        fs.writeFileSync(filePath, markdown, "utf-8");
        sendJson(res, 200, { ok: true, updated: safeName });
      } catch (e) {
        sendJson(res, 500, { ok: false, message: e.message });
      }
    });
    return;
  }

  if (requestUrl.pathname === "/api/submit-suggestions" && req.method === "POST") {
    try {
      fs.mkdirSync(suggestionsDir, { recursive: true });
      const files = fs.readdirSync(suggestionsDir).filter(f => f.endsWith(".md")).sort();
      if (files.length === 0) {
        sendJson(res, 400, { ok: false, message: "No suggestions to submit" });
        return;
      }
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      let doc = `# UI 修改意见汇总\n> 提交时间: ${new Date().toLocaleString("zh-CN")}\n> 共 ${files.length} 条意见\n\n---\n\n`;
      for (const f of files) {
        const content = fs.readFileSync(path.join(suggestionsDir, f), "utf-8");
        doc += content + "\n\n---\n\n";
      }
      const sessionsDir = path.resolve(__dirname, "..", "sessions");
      fs.mkdirSync(sessionsDir, { recursive: true });
      const outName = `suggestions-${ts}.md`;
      fs.writeFileSync(path.join(sessionsDir, outName), doc, "utf-8");
      // Clean up submitted suggestions
      for (const f of files) fs.unlinkSync(path.join(suggestionsDir, f));
      sendJson(res, 200, { ok: true, filename: outName, count: files.length });
    } catch (e) {
      sendJson(res, 500, { ok: false, message: e.message });
    }
    return;
  }

  if (requestUrl.pathname === "/api/export-image") {
    if (req.method !== "GET") {
      send(res, 405, "Method Not Allowed", "text/plain; charset=utf-8");
      return;
    }

    try {
      const theme = resolveExportTheme(requestUrl);
      const fileName = await renderInventoryExport(theme);
      sendJson(res, 200, {
        ok: true,
        theme,
        fileName,
        imageUrl: `/exports/${fileName}`
      });
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        message: "导出失败",
        error: error instanceof Error ? error.message : String(error)
      });
    }
    return;
  }

  const filePath = resolveFile(requestUrl.pathname);

  if (!filePath.startsWith(publicDir)) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  fs.readFile(filePath, (error, buffer) => {
    if (error) {
      if (error.code === "ENOENT") {
        send(res, 404, "Not Found", "text/plain; charset=utf-8");
        return;
      }

      send(res, 500, "Internal Server Error", "text/plain; charset=utf-8");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";
    send(res, 200, buffer, contentType);
  });
});

server.listen(port, host, () => {
  console.log(`Inventory demo available at http://${host}:${port}`);
});
