// Session save/load routes
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const SESSIONS_DIR = path.join(__dirname, '..', '..', 'data', 'sessions');

function ensureDir() {
  if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// POST /api/session/save — Save a parsed session
router.post('/save', (req, res) => {
  try {
    ensureDir();
    const session = req.body;
    const build = session.build;
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const charLabel = build
      ? `${build.ascendClassName || build.className}_Lv${build.level}`
      : 'unknown';
    const filename = `session_${charLabel}_${ts}.json`;

    fs.writeFileSync(
      path.join(SESSIONS_DIR, filename),
      JSON.stringify(session, null, 2),
      'utf-8'
    );
    res.json({ success: true, filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/session/list — List saved sessions
router.get('/list', (req, res) => {
  try {
    ensureDir();
    const files = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();

    const sessions = files.map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf-8'));
        const stats = data.build?.playerStats || {};
        return {
          filename: f,
          name: f.replace('.json', ''),
          character: data.build
            ? `${data.build.ascendClassName || data.build.className} Lv.${data.build.level}`
            : null,
          dps: stats.TotalDPS || stats.CombinedDPS || null,
          savedAt: data.savedAt || '',
        };
      } catch {
        return { filename: f, name: f, character: null, dps: null, savedAt: '' };
      }
    });

    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/session/load/:filename — Load a saved session
router.get('/load/:filename', (req, res) => {
  try {
    const filePath = path.join(SESSIONS_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const session = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/session/delete/:filename — Delete a saved session
router.delete('/delete/:filename', (req, res) => {
  try {
    const filePath = path.join(SESSIONS_DIR, req.params.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
