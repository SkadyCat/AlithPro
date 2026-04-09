// Build API routes
const express = require('express');
const router = express.Router();
const { decodeBuildCode, encodeBuildCode } = require('../core/build-codec');
const { performCalc } = require('../calc/calc-perform');
const { analyzeGemSetup } = require('../analysis/gem-setup');
const { analyzeDamageBreakdown } = require('../analysis/damage-breakdown');

// POST /api/build/decode — Decode a POB build code
router.post('/decode', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Missing "code" field' });

    const build = decodeBuildCode(code);
    res.json({ success: true, build });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/build/encode — Encode a build object to POB code
router.post('/encode', (req, res) => {
  try {
    const { build } = req.body;
    if (!build) return res.status(400).json({ error: 'Missing "build" field' });

    const code = encodeBuildCode(build);
    res.json({ success: true, code });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/build/calculate — Decode + run full calculation
router.post('/calculate', (req, res) => {
  try {
    const { code, build: rawBuild } = req.body;
    let build;

    if (code) {
      build = decodeBuildCode(code);
    } else if (rawBuild) {
      build = rawBuild;
    } else {
      return res.status(400).json({ error: 'Provide "code" or "build"' });
    }

    const result = performCalc(build);
    res.json({ success: true, build, calculation: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/build/info — Quick decode, return summary only
router.post('/info', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Missing "code" field' });

    const build = decodeBuildCode(code);
    res.json({
      success: true,
      summary: {
        class: build.className,
        ascendancy: build.ascendClassName,
        level: build.level,
        mainSkill: build.socketGroups?.[build.mainSocketGroup - 1]?.gems?.[0]?.nameSpec || 'unknown',
        gemCount: build.socketGroups?.reduce((n, g) => n + (g.gems?.length || 0), 0) || 0,
        itemCount: build.items?.list?.length || 0,
        treeNodes: build.tree?.specs?.[0]?.nodes?.length || 0,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/build/gem-setup — Analyze skill gems bound to each equipment piece
router.post('/gem-setup', (req, res) => {
  try {
    const { code, build: rawBuild } = req.body;
    let build;
    if (code) {
      build = decodeBuildCode(code);
    } else if (rawBuild) {
      build = rawBuild;
    } else {
      return res.status(400).json({ error: 'Provide "code" or "build"' });
    }
    const analysis = analyzeGemSetup(build);
    res.json({ success: true, gemSetup: analysis });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/build/damage-breakdown — Analyze main skill damage chain
router.post('/damage-breakdown', (req, res) => {
  try {
    const { code, build: rawBuild, disabledMods } = req.body;
    let build;
    if (code) {
      build = decodeBuildCode(code);
    } else if (rawBuild) {
      build = rawBuild;
    } else {
      return res.status(400).json({ error: 'Provide "code" or "build"' });
    }
    const breakdown = analyzeDamageBreakdown(build, disabledMods || []);
    res.json({ success: true, breakdown });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
