// Calc API routes — standalone calculation endpoints
const express = require('express');
const router = express.Router();
const { calcDefence } = require('../calc/calc-defence');
const { calcOffence } = require('../calc/calc-offence');
const { initEnv } = require('../calc/calc-setup');
const { decodeBuildCode } = require('../core/build-codec');

// POST /api/calc/defence — Calculate defence only
router.post('/defence', (req, res) => {
  try {
    const { code, build: rawBuild } = req.body;
    let build = rawBuild;
    if (code) build = decodeBuildCode(code);
    if (!build) return res.status(400).json({ error: 'Provide "code" or "build"' });

    const env = initEnv(build);
    const result = calcDefence(env);
    res.json({ success: true, defence: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/calc/offence — Calculate offence only
router.post('/offence', (req, res) => {
  try {
    const { code, build: rawBuild } = req.body;
    let build = rawBuild;
    if (code) build = decodeBuildCode(code);
    if (!build) return res.status(400).json({ error: 'Provide "code" or "build"' });

    const env = initEnv(build);
    const result = calcOffence(env);
    res.json({ success: true, offence: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
