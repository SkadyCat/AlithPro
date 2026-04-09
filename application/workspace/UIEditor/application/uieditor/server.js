const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3210);
const ROOT_DIR = __dirname;
const TEMPLATE_DIR = path.join(ROOT_DIR, 'template');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}

function safeTemplateBase(input) {
  const normalized = String(input || '').trim();
  if (!normalized || normalized.includes('..') || normalized.includes('/') || normalized.includes('\\')) {
    return '';
  }
  return normalized.replace(/(\.meta\.json|\.meta|\.session)$/i, '');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listTemplates() {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    return [];
  }

  const templates = new Map();
  const entries = fs.readdirSync(TEMPLATE_DIR, { withFileTypes: true });

  entries
    .filter((entry) => entry.isFile() && (entry.name.endsWith('.meta.json') || entry.name.endsWith('.meta') || entry.name.endsWith('.session')))
    .forEach((entry) => {
      const isMetaJson = entry.name.endsWith('.meta.json');
      const isMeta = isMetaJson || entry.name.endsWith('.meta');
      const name = isMetaJson
        ? entry.name.replace(/\.meta\.json$/i, '')
        : isMeta
          ? entry.name.replace(/\.meta$/i, '')
          : entry.name.replace(/\.session$/i, '');
      const fullPath = path.join(TEMPLATE_DIR, entry.name);
      const stats = fs.statSync(fullPath);
      const current = templates.get(name) || {
        name,
        hasMeta: false,
        hasSession: false,
        metaFile: '',
        sessionFile: '',
        updatedAt: stats.mtime.toISOString(),
        size: 0,
      };

      if (isMeta) {
        current.hasMeta = true;
        current.metaFile = entry.name;
      } else {
        current.hasSession = true;
        current.sessionFile = entry.name;
      }

      current.size += stats.size;
      if (new Date(stats.mtime) > new Date(current.updatedAt)) {
        current.updatedAt = stats.mtime.toISOString();
      }

      templates.set(name, current);
    });

  return [...templates.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function getTemplateFiles(name) {
  const metaPath = path.join(TEMPLATE_DIR, `${name}.meta.json`);
  const legacyMetaPath = path.join(TEMPLATE_DIR, `${name}.meta`);
  const sessionPath = path.join(TEMPLATE_DIR, `${name}.session`);
  const resolvedMetaPath = fs.existsSync(metaPath) ? metaPath : legacyMetaPath;
  return {
    metaPath: resolvedMetaPath,
    sessionPath,
    hasMeta: fs.existsSync(resolvedMetaPath),
    hasSession: fs.existsSync(sessionPath),
  };
}

function serveStatic(res, filePath) {
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendText(res, 404, 'Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const type = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
  const pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname === '/api/templates') {
    sendJson(res, 200, {
      templates: listTemplates(),
      templateDir: TEMPLATE_DIR,
    });
    return;
  }

  if (pathname.startsWith('/api/templates/')) {
    const templateBase = safeTemplateBase(pathname.slice('/api/templates/'.length));
    if (!templateBase) {
      sendJson(res, 400, { error: 'Invalid template name.' });
      return;
    }

    const files = getTemplateFiles(templateBase);
    if (!files.hasMeta && !files.hasSession) {
      sendJson(res, 404, { error: `Template not found: ${templateBase}` });
      return;
    }

    try {
      sendJson(res, 200, {
        name: templateBase,
        meta: files.hasMeta ? readJson(files.metaPath) : null,
        session: files.hasSession ? readJson(files.sessionPath) : null,
        files: {
          meta: files.hasMeta ? path.basename(files.metaPath) : null,
          session: files.hasSession ? path.basename(files.sessionPath) : null,
        },
      });
    } catch (error) {
      sendJson(res, 500, { error: `Failed to parse ${templateBase}: ${error.message}` });
    }
    return;
  }

  const staticPath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);
  serveStatic(res, staticPath);
});

server.listen(PORT, HOST, () => {
  console.log(`UIEditor preview listening on http://${HOST}:${PORT}`);
  console.log(`Serving template preview data from ${TEMPLATE_DIR}`);
});
