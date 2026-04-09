const fs = require("fs/promises");
const path = require("path");
const { chromium } = require("playwright");

const uiDir = path.resolve(__dirname, "..", "assets", "ui");

const assets = [
  { file: "topbar_crest.png", width: 92, height: 92, kind: "crest" },
  { file: "title_plate.png", width: 380, height: 84, kind: "title_plate" },
  { file: "currency_plate.png", width: 420, height: 78, kind: "currency_plate" },
  { file: "grid_header_plate.png", width: 320, height: 68, kind: "grid_header" },
  { file: "equipment_slot.png", width: 168, height: 110, kind: "equipment_slot" },
  { file: "equipment_slot_active.png", width: 168, height: 110, kind: "equipment_slot_active" },
  { file: "detail_title_plate.png", width: 392, height: 72, kind: "detail_title" },
  { file: "detail_hero.png", width: 398, height: 180, kind: "detail_hero" },
  { file: "detail_seal.png", width: 72, height: 72, kind: "detail_seal" },
  { file: "stat_scroll.png", width: 392, height: 226, kind: "stat_scroll" },
  { file: "detail_lore_plate.png", width: 392, height: 96, kind: "detail_lore" }
];

async function main() {
  await fs.mkdir(uiDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 600, height: 400 }, deviceScaleFactor: 1 });

  try {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8" />
          <style>
            html, body { margin: 0; width: 100%; height: 100%; background: transparent; }
            body { display: grid; place-items: center; }
            canvas { display: block; }
          </style>
        </head>
        <body>
          <canvas id="c"></canvas>
        </body>
      </html>
    `);

    for (const asset of assets) {
      const outputPath = path.join(uiDir, asset.file);

      await page.evaluate(({ width, height, kind }) => {
        const canvas = document.getElementById("c");
        const ctx = canvas.getContext("2d");
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.clearRect(0, 0, width, height);

        function roundRectPath(x, y, w, h, r) {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
        }

        function fillRoundRect(x, y, w, h, r, fillStyle) {
          roundRectPath(x, y, w, h, r);
          ctx.fillStyle = fillStyle;
          ctx.fill();
        }

        function strokeRoundRect(x, y, w, h, r, strokeStyle, lineWidth) {
          roundRectPath(x, y, w, h, r);
          ctx.lineWidth = lineWidth;
          ctx.strokeStyle = strokeStyle;
          ctx.stroke();
        }

        function cloudRibbon(x, y, scale, alpha = 0.14) {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = "#f5dfb0";
          for (let i = 0; i < 4; i += 1) {
            ctx.beginPath();
            ctx.arc(x + i * 20 * scale, y, 10 * scale, Math.PI, 0, false);
            ctx.arc(x + 10 * scale + i * 20 * scale, y - 7 * scale, 8 * scale, Math.PI, 0, false);
            ctx.arc(x + 20 * scale + i * 20 * scale, y, 10 * scale, Math.PI, 0, false);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }

        function ornateBase(fillA, fillB, borderA = "#d4b277", borderB = "#f6e1bc") {
          const base = ctx.createLinearGradient(0, 0, 0, height);
          base.addColorStop(0, fillA);
          base.addColorStop(1, fillB);
          fillRoundRect(6, 6, width - 12, height - 12, Math.min(22, height * 0.3), base);

          const frame = ctx.createLinearGradient(0, 0, width, height);
          frame.addColorStop(0, borderA);
          frame.addColorStop(0.5, borderB);
          frame.addColorStop(1, "#8a5c2a");
          strokeRoundRect(6, 6, width - 12, height - 12, Math.min(22, height * 0.3), frame, 4);
          strokeRoundRect(12, 12, width - 24, height - 24, Math.min(16, height * 0.24), "rgba(255,240,217,0.26)", 2);
          cloudRibbon(26, 26, 0.6);
          cloudRibbon(width - 112, height - 16, 0.5, 0.1);
        }

        function drawSeal(x, y, size) {
          fillRoundRect(x, y, size, size, size * 0.24, "#7b2019");
          strokeRoundRect(x, y, size, size, size * 0.24, "#f3dcaf", Math.max(2, size * 0.08));
          ctx.strokeStyle = "#f3dcaf";
          ctx.lineWidth = Math.max(2, size * 0.08);
          ctx.beginPath();
          ctx.moveTo(x + size * 0.24, y + size * 0.3);
          ctx.lineTo(x + size * 0.76, y + size * 0.7);
          ctx.moveTo(x + size * 0.72, y + size * 0.24);
          ctx.lineTo(x + size * 0.34, y + size * 0.58);
          ctx.stroke();
        }

        if (kind === "crest") {
          ornateBase("#6a2d1f", "#26120d");
          const gold = ctx.createLinearGradient(0, 8, 0, height - 8);
          gold.addColorStop(0, "#f6d690");
          gold.addColorStop(1, "#b57b35");
          ctx.fillStyle = gold;
          ctx.beginPath();
          ctx.moveTo(width / 2, 14);
          ctx.lineTo(width - 22, 30);
          ctx.lineTo(width - 30, height - 24);
          ctx.lineTo(width / 2, height - 12);
          ctx.lineTo(30, height - 24);
          ctx.lineTo(22, 30);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#f9e6c2";
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(width / 2, 26);
          ctx.lineTo(width / 2, 64);
          ctx.moveTo(width / 2 - 16, 42);
          ctx.lineTo(width / 2 + 16, 42);
          ctx.stroke();
        }

        if (kind === "title_plate") {
          ornateBase("#5e2f20", "#21110d");
          const shine = ctx.createLinearGradient(0, 10, 0, 40);
          shine.addColorStop(0, "rgba(255,255,255,0.24)");
          shine.addColorStop(1, "rgba(255,255,255,0)");
          fillRoundRect(20, 16, width - 40, 22, 10, shine);
          drawSeal(width - 62, 16, 34);
        }

        if (kind === "currency_plate") {
          ornateBase("#473224", "#241713");
          fillRoundRect(18, 18, width - 36, height - 36, 18, "rgba(255, 246, 228, 0.08)");
          drawSeal(width - 60, 14, 32);
        }

        if (kind === "grid_header") {
          ornateBase("#523225", "#241713");
          fillRoundRect(18, 18, width - 36, height - 34, 16, "rgba(255, 245, 226, 0.08)");
        }

        if (kind === "equipment_slot" || kind === "equipment_slot_active") {
          const active = kind === "equipment_slot_active";
          ornateBase(active ? "#6a3022" : "#45281d", active ? "#23110d" : "#1e1310", active ? "#e0bd85" : "#c39a62");
          fillRoundRect(18, 18, width - 36, height - 36, 18, active ? "rgba(248,232,196,0.14)" : "rgba(248,232,196,0.06)");
          strokeRoundRect(24, 24, width - 48, height - 48, 16, active ? "rgba(255,244,222,0.44)" : "rgba(255,244,222,0.18)", 2);
          drawSeal(width - 44, 14, 24);
        }

        if (kind === "detail_title") {
          ornateBase("#6e3023", "#29120f");
          fillRoundRect(20, 18, width - 40, height - 36, 18, "rgba(255,246,226,0.08)");
          drawSeal(width - 54, 18, 30);
        }

        if (kind === "detail_hero") {
          ornateBase("#2f1d1b", "#120d10");
          const moon = ctx.createRadialGradient(width - 92, 48, 8, width - 92, 48, 78);
          moon.addColorStop(0, "rgba(255, 245, 224, 0.76)");
          moon.addColorStop(1, "rgba(255, 245, 224, 0)");
          ctx.fillStyle = moon;
          ctx.beginPath();
          ctx.arc(width - 92, 48, 78, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "rgba(18, 11, 16, 0.82)";
          ctx.beginPath();
          ctx.moveTo(0, height - 28);
          ctx.lineTo(width * 0.22, 92);
          ctx.lineTo(width * 0.4, 128);
          ctx.lineTo(width * 0.58, 72);
          ctx.lineTo(width * 0.78, 138);
          ctx.lineTo(width, 90);
          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = "#e8cb8f";
          ctx.beginPath();
          ctx.moveTo(126, 42);
          ctx.lineTo(182, 94);
          ctx.lineTo(170, 98);
          ctx.lineTo(208, 148);
          ctx.lineTo(194, 156);
          ctx.lineTo(150, 100);
          ctx.lineTo(116, 148);
          ctx.lineTo(102, 140);
          ctx.lineTo(136, 92);
          ctx.lineTo(122, 88);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = "#b77c39";
          ctx.beginPath();
          ctx.moveTo(146, 26);
          ctx.lineTo(154, 26);
          ctx.lineTo(160, 112);
          ctx.lineTo(150, 146);
          ctx.lineTo(140, 112);
          ctx.closePath();
          ctx.fill();
        }

        if (kind === "detail_seal") {
          drawSeal(6, 6, width - 12);
        }

        if (kind === "stat_scroll") {
          ornateBase("#5a3f2b", "#2e1f18");
          fillRoundRect(24, 18, width - 48, height - 36, 18, "#eadab7");
          strokeRoundRect(24, 18, width - 48, height - 36, 18, "#b17d41", 3);
          ctx.strokeStyle = "rgba(132, 87, 46, 0.28)";
          ctx.lineWidth = 2;
          for (let y = 52; y < height - 26; y += 24) {
            ctx.beginPath();
            ctx.moveTo(46, y);
            ctx.lineTo(width - 46, y);
            ctx.stroke();
          }
        }

        if (kind === "detail_lore") {
          ornateBase("#4d3023", "#241611");
          fillRoundRect(22, 18, width - 44, height - 36, 18, "rgba(237, 219, 188, 0.9)");
          strokeRoundRect(22, 18, width - 44, height - 36, 18, "#a9763d", 3);
          cloudRibbon(42, 34, 0.56, 0.11);
        }
      }, asset);

      await page.locator("#c").screenshot({ path: outputPath, omitBackground: true });
    }
  } finally {
    await page.close();
    await browser.close();
  }

  console.log("Generated oriental chrome assets");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
