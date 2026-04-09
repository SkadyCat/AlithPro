const express = require('express');
const path = require('path');
const fs = require('fs');
const { scanDirectory } = require('./lib/scanner');
const { parseUAsset } = require('./lib/uasset-parser');

const app = express();
const PORT = 3210;
const UI_ROOT = String.raw`G:\GameExPro3\MagicWorld\Content\UI`;
const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const DRAFTS_DIR = path.join(WORKSPACE_ROOT, 'drafts');
const SESSIONS_DIR = path.join(WORKSPACE_ROOT, 'sessions');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Directory tree of .uasset files
app.get('/api/tree', (_req, res) => {
  try {
    const tree = scanDirectory(UI_ROOT);
    res.json(tree);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Parse a single .uasset and return its node tree
app.get('/api/parse', (req, res) => {
  const filePath = req.query.file;
  if (!filePath) return res.status(400).json({ error: 'Missing file parameter' });

  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(UI_ROOT)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const result = parseUAsset(resolved);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Suggestion endpoints ──

// Resolve a /Game/ path to a filesystem path
app.get('/api/resolve-path', (req, res) => {
  const gamePath = req.query.path;
  if (!gamePath || !gamePath.startsWith('/Game/')) {
    return res.status(400).json({ error: 'Invalid game path' });
  }
  const CONTENT_ROOT = String.raw`G:\GameExPro3\MagicWorld\Content`;
  const relativePath = gamePath.replace('/Game/', '');
  const fullPath = path.join(CONTENT_ROOT, relativePath + '.uasset');
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'Asset not found', path: fullPath });
  }
  res.json({ path: fullPath });
});

// Extract largest embedded PNG from a Texture2D .uasset and return it
app.get('/api/texture-preview', (req, res) => {
  const gamePath = req.query.path;
  if (!gamePath) return res.status(400).json({ error: 'Missing path parameter' });

  const CONTENT_ROOT = String.raw`G:\GameExPro3\MagicWorld\Content`;
  let fullPath;
  if (gamePath.startsWith('/Game/')) {
    const rel = gamePath.replace('/Game/', '');
    fullPath = path.join(CONTENT_ROOT, rel + '.uasset');
  } else {
    fullPath = gamePath;
  }

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  try {
    const buf = fs.readFileSync(fullPath);
    const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const IEND = Buffer.from([0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);

    let best = null;
    for (let i = 0; i < buf.length - 8; i++) {
      if (buf.compare(PNG_MAGIC, 0, 8, i, i + 8) === 0) {
        let end = -1;
        for (let j = i + 8; j < buf.length - 8; j++) {
          if (buf.compare(IEND, 0, 8, j, j + 8) === 0) { end = j + 8; break; }
        }
        if (end > 0) {
          const size = end - i;
          if (!best || size > best.size) best = { start: i, end, size };
        }
      }
    }

    if (!best) return res.status(404).json({ error: 'No embedded PNG found' });

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buf.slice(best.start, best.end));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List all saved suggestions
app.get('/api/suggestions', (_req, res) => {
  try {
    if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR, { recursive: true });
    const files = fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.json'));
    const suggestions = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(DRAFTS_DIR, f), 'utf-8'));
      return { id: f.replace('.json', ''), ...data };
    });
    res.json(suggestions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Save a suggestion to drafts/
app.post('/api/suggestions', (req, res) => {
  const { assetFile, nodeName, nodeClass, content } = req.body;
  if (!content) return res.status(400).json({ error: 'Missing content' });

  if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  const id = `suggestion-${Date.now()}`;
  const suggestion = {
    assetFile: assetFile || '',
    nodeName: nodeName || '',
    nodeClass: nodeClass || '',
    content,
    createdAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(DRAFTS_DIR, `${id}.json`), JSON.stringify(suggestion, null, 2), 'utf-8');
  res.json({ id, ...suggestion });
});

// Delete a suggestion
app.delete('/api/suggestions/:id', (req, res) => {
  const file = path.join(DRAFTS_DIR, `${req.params.id}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  res.json({ ok: true });
});

// Submit suggestions to sessions/ as a Markdown task file
app.post('/api/submit', (_req, res) => {
  try {
    if (!fs.existsSync(DRAFTS_DIR)) return res.status(400).json({ error: 'No drafts folder' });
    const files = fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.json'));
    if (files.length === 0) return res.status(400).json({ error: 'No suggestions to submit' });

    const suggestions = files.map(f => JSON.parse(fs.readFileSync(path.join(DRAFTS_DIR, f), 'utf-8')));

    // Build Markdown
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    let md = `# UMG 修改意见\n\n提交时间: ${new Date().toISOString()}\n\n`;
    suggestions.forEach((s, i) => {
      md += `## ${i + 1}. ${s.nodeClass} : ${s.nodeName}\n`;
      md += `- 资产: ${s.assetFile}\n`;
      md += `- 意见: ${s.content}\n\n`;
    });

    if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    const mdFile = `msg-${ts}.md`;
    fs.writeFileSync(path.join(SESSIONS_DIR, mdFile), md, 'utf-8');

    // Clean up submitted drafts
    files.forEach(f => fs.unlinkSync(path.join(DRAFTS_DIR, f)));

    res.json({ ok: true, file: mdFile, count: suggestions.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`UMG Explorer running at http://localhost:${PORT}`);
});
