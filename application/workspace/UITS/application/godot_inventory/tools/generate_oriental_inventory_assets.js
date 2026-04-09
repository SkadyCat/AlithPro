const fs = require("fs/promises");
const path = require("path");
const { chromium } = require("playwright");

const projectRoot = path.resolve(__dirname, "..");
const assetRoot = path.join(projectRoot, "assets");

const assets = [
  { file: "scene_bg.png", dir: "ui", width: 1600, height: 900, kind: "scene" },
  { file: "topbar_bg.png", dir: "ui", width: 640, height: 140, kind: "topbar" },
  { file: "inventory_panel_bg.png", dir: "ui", width: 760, height: 760, kind: "inventory_panel" },
  { file: "detail_panel_bg.png", dir: "ui", width: 420, height: 760, kind: "detail_panel" },
  { file: "tab_idle.png", dir: "ui", width: 240, height: 88, kind: "tab_idle" },
  { file: "tab_active.png", dir: "ui", width: 240, height: 88, kind: "tab_active" },
  { file: "item_card_bg.png", dir: "ui", width: 268, height: 172, kind: "item_card" },
  { file: "item_card_selected.png", dir: "ui", width: 268, height: 172, kind: "item_card_selected" },
  { file: "action_primary.png", dir: "ui", width: 240, height: 84, kind: "action_primary" },
  { file: "action_secondary.png", dir: "ui", width: 240, height: 84, kind: "action_secondary" },
  { file: "action_danger.png", dir: "ui", width: 240, height: 84, kind: "action_danger" },
  { file: "tab_all.png", dir: "icons", width: 64, height: 64, kind: "icon_tab_all" },
  { file: "tab_weapon.png", dir: "icons", width: 64, height: 64, kind: "icon_tab_weapon" },
  { file: "tab_potion.png", dir: "icons", width: 64, height: 64, kind: "icon_tab_potion" },
  { file: "tab_quest.png", dir: "icons", width: 64, height: 64, kind: "icon_tab_quest" },
  { file: "item_sword.png", dir: "icons", width: 72, height: 72, kind: "icon_item_sword" },
  { file: "item_potion.png", dir: "icons", width: 72, height: 72, kind: "icon_item_potion" },
  { file: "item_amulet.png", dir: "icons", width: 72, height: 72, kind: "icon_item_amulet" },
  { file: "item_scroll.png", dir: "icons", width: 72, height: 72, kind: "icon_item_scroll" },
  { file: "item_shield.png", dir: "icons", width: 72, height: 72, kind: "icon_item_shield" },
  { file: "item_feather.png", dir: "icons", width: 72, height: 72, kind: "icon_item_feather" },
  { file: "item_key.png", dir: "icons", width: 72, height: 72, kind: "icon_item_key" },
  { file: "item_bow.png", dir: "icons", width: 72, height: 72, kind: "icon_item_bow" },
  { file: "tab_weapon_bg.png", dir: ".", width: 240, height: 88, kind: "tab_active" }
];

async function ensureDirectories() {
  await fs.mkdir(path.join(assetRoot, "ui"), { recursive: true });
  await fs.mkdir(path.join(assetRoot, "icons"), { recursive: true });
}

async function main() {
  await ensureDirectories();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1
  });

  try {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8" />
          <style>
            html, body {
              margin: 0;
              width: 100%;
              height: 100%;
              background: transparent;
            }

            body {
              display: grid;
              place-items: center;
            }

            canvas {
              display: block;
            }
          </style>
        </head>
        <body>
          <canvas id="assetCanvas"></canvas>
        </body>
      </html>
    `);

    for (const asset of assets) {
      const outputDir = asset.dir === "." ? assetRoot : path.join(assetRoot, asset.dir);
      const outputPath = path.join(outputDir, asset.file);

      await page.evaluate(({ width, height, kind }) => {
        const canvas = document.getElementById("assetCanvas");
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

        function drawCloudRibbon(x, y, scale, color, alpha) {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = color;
          for (let index = 0; index < 4; index += 1) {
            ctx.beginPath();
            ctx.arc(x + index * 24 * scale, y, 12 * scale, Math.PI, 0, false);
            ctx.arc(x + 12 * scale + index * 24 * scale, y - 8 * scale, 10 * scale, Math.PI, 0, false);
            ctx.arc(x + 24 * scale + index * 24 * scale, y, 12 * scale, Math.PI, 0, false);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }

        function drawSeal(x, y, size, fill, stroke) {
          ctx.save();
          fillRoundRect(x, y, size, size, size * 0.24, fill);
          strokeRoundRect(x, y, size, size, size * 0.24, stroke, Math.max(2, size * 0.08));
          ctx.strokeStyle = stroke;
          ctx.lineWidth = Math.max(2, size * 0.08);
          ctx.beginPath();
          ctx.moveTo(x + size * 0.24, y + size * 0.28);
          ctx.lineTo(x + size * 0.74, y + size * 0.72);
          ctx.moveTo(x + size * 0.7, y + size * 0.24);
          ctx.lineTo(x + size * 0.34, y + size * 0.56);
          ctx.stroke();
          ctx.restore();
        }

        function drawOrnamentalFrame(x, y, w, h) {
          const outline = ctx.createLinearGradient(x, y, x + w, y + h);
          outline.addColorStop(0, "#d3b06a");
          outline.addColorStop(0.5, "#f3ddb0");
          outline.addColorStop(1, "#8c5f2a");
          strokeRoundRect(x, y, w, h, 24, outline, 5);
          strokeRoundRect(x + 8, y + 8, w - 16, h - 16, 18, "rgba(255, 240, 216, 0.34)", 2);
          drawCloudRibbon(x + 28, y + 28, 0.7, "#f1ddb3", 0.12);
          drawCloudRibbon(x + w - 148, y + h - 36, 0.64, "#f1ddb3", 0.1);
        }

        function drawSceneBackground() {
          const bg = ctx.createLinearGradient(0, 0, 0, height);
          bg.addColorStop(0, "#120f19");
          bg.addColorStop(0.48, "#22181f");
          bg.addColorStop(1, "#0d0b11");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, width, height);

          const moon = ctx.createRadialGradient(width - 220, 120, 16, width - 220, 120, 180);
          moon.addColorStop(0, "rgba(255, 242, 214, 0.72)");
          moon.addColorStop(1, "rgba(255, 242, 214, 0)");
          ctx.fillStyle = moon;
          ctx.beginPath();
          ctx.arc(width - 220, 120, 180, 0, Math.PI * 2);
          ctx.fill();

          const mist = ctx.createLinearGradient(0, height * 0.54, 0, height);
          mist.addColorStop(0, "rgba(115, 84, 70, 0.08)");
          mist.addColorStop(1, "rgba(12, 10, 14, 0.58)");
          ctx.fillStyle = mist;
          ctx.fillRect(0, height * 0.42, width, height * 0.58);

          ctx.fillStyle = "rgba(28, 19, 25, 0.9)";
          ctx.beginPath();
          ctx.moveTo(0, height * 0.72);
          ctx.lineTo(width * 0.2, height * 0.48);
          ctx.lineTo(width * 0.38, height * 0.68);
          ctx.lineTo(width * 0.56, height * 0.44);
          ctx.lineTo(width * 0.76, height * 0.7);
          ctx.lineTo(width, height * 0.54);
          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = "rgba(227, 198, 147, 0.18)";
          ctx.lineWidth = 2;
          for (let offset = -180; offset < width + 180; offset += 140) {
            ctx.beginPath();
            ctx.moveTo(offset, height * 0.66);
            ctx.bezierCurveTo(offset + 60, height * 0.58, offset + 120, height * 0.84, offset + 200, height * 0.74);
            ctx.stroke();
          }
        }

        function drawPanel(fillA, fillB, accent, highlight, options = {}) {
          const base = ctx.createLinearGradient(0, 0, width, height);
          base.addColorStop(0, fillA);
          base.addColorStop(1, fillB);
          fillRoundRect(10, 10, width - 20, height - 20, 36, base);
          drawOrnamentalFrame(10, 10, width - 20, height - 20);

          ctx.save();
          roundRectPath(24, 24, width - 48, height - 48, 28);
          ctx.clip();
          const wash = ctx.createLinearGradient(0, 24, 0, height - 24);
          wash.addColorStop(0, "rgba(255, 245, 226, 0.16)");
          wash.addColorStop(1, "rgba(255, 245, 226, 0)");
          ctx.fillStyle = wash;
          ctx.fillRect(24, 24, width - 48, height * 0.36);
          drawCloudRibbon(70, 78, 0.9, highlight, 0.16);
          drawCloudRibbon(width - 210, height - 66, 0.82, highlight, 0.12);
          ctx.restore();

          if (options.topbar) {
            const topGlow = ctx.createLinearGradient(0, 16, 0, height * 0.72);
            topGlow.addColorStop(0, "rgba(255, 239, 214, 0.28)");
            topGlow.addColorStop(1, "rgba(255, 239, 214, 0)");
            fillRoundRect(22, 18, width - 44, height * 0.42, 26, topGlow);

            const centerBand = ctx.createLinearGradient(0, 0, width, 0);
            centerBand.addColorStop(0, "rgba(84, 27, 22, 0)");
            centerBand.addColorStop(0.18, "rgba(132, 43, 33, 0.52)");
            centerBand.addColorStop(0.5, "rgba(214, 154, 84, 0.22)");
            centerBand.addColorStop(0.82, "rgba(132, 43, 33, 0.52)");
            centerBand.addColorStop(1, "rgba(84, 27, 22, 0)");
            fillRoundRect(96, 20, width - 192, height - 40, 24, centerBand);

            ctx.strokeStyle = "rgba(248, 226, 183, 0.34)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(118, height - 28);
            ctx.lineTo(width - 118, height - 28);
            ctx.stroke();

            drawSeal(34, 30, 46, "#7b2019", "#f1ddb1");
            drawSeal(width - 80, 30, 46, "#7b2019", "#f1ddb1");
          }

          drawSeal(width - 90, 30, 42, accent, "#f7dfb8");
        }

        function drawTab(active) {
          const base = ctx.createLinearGradient(0, 0, width, height);
          if (active) {
            base.addColorStop(0, "#7b2019");
            base.addColorStop(0.52, "#5a1714");
            base.addColorStop(1, "#2b0d0c");
          } else {
            base.addColorStop(0, "#574435");
            base.addColorStop(0.52, "#35271f");
            base.addColorStop(1, "#1f1612");
          }

          fillRoundRect(8, 8, width - 16, height - 16, 24, base);
          strokeRoundRect(8, 8, width - 16, height - 16, 24, active ? "#f1d59d" : "#b48c5a", 4);
          strokeRoundRect(16, 16, width - 32, height - 32, 18, "rgba(255, 238, 214, 0.24)", 2);

          const shine = ctx.createLinearGradient(0, 14, 0, 42);
          shine.addColorStop(0, "rgba(255,255,255,0.24)");
          shine.addColorStop(1, "rgba(255,255,255,0)");
          fillRoundRect(16, 16, width - 32, 24, 14, shine);
          drawCloudRibbon(width - 112, height - 22, 0.5, "#f5d9ab", active ? 0.22 : 0.14);
        }

        function drawItemCard(selected) {
          const base = ctx.createLinearGradient(0, 0, width, height);
          if (selected) {
            base.addColorStop(0, "#6d3920");
            base.addColorStop(0.46, "#47251b");
            base.addColorStop(1, "#241210");
          } else {
            base.addColorStop(0, "#4a3125");
            base.addColorStop(0.46, "#2e1d18");
            base.addColorStop(1, "#1c1211");
          }

          fillRoundRect(8, 8, width - 16, height - 16, 26, base);
          strokeRoundRect(8, 8, width - 16, height - 16, 26, selected ? "#f5d39a" : "#ab7c47", 4);
          strokeRoundRect(18, 18, width - 36, height - 36, 20, "rgba(255, 243, 223, 0.18)", 2);
          drawSeal(width - 58, 20, 26, selected ? "#8f2020" : "#5d3520", "#f2d9aa");
        }

        function drawAction(kindName) {
          const colors = {
            action_primary: ["#8e1f1e", "#611516", "#2c0b0d", "#f2d39c"],
            action_secondary: ["#5c462a", "#403022", "#241912", "#e5c893"],
            action_danger: ["#5b1017", "#390810", "#170507", "#f0b8ae"]
          };
          const [fromColor, midColor, toColor, border] = colors[kindName];
          const base = ctx.createLinearGradient(0, 0, width, height);
          base.addColorStop(0, fromColor);
          base.addColorStop(0.52, midColor);
          base.addColorStop(1, toColor);
          fillRoundRect(10, 10, width - 20, height - 20, 22, base);
          strokeRoundRect(10, 10, width - 20, height - 20, 22, border, 4);
          strokeRoundRect(18, 18, width - 36, height - 36, 16, "rgba(255,255,255,0.16)", 2);
        }

        function drawBoxIcon() {
          const g = ctx.createLinearGradient(0, 10, 0, height - 10);
          g.addColorStop(0, "#f4d38d");
          g.addColorStop(1, "#b47734");
          ctx.fillStyle = g;
          fillRoundRect(14, 20, 36, 28, 8, g);
          fillRoundRect(20, 12, 24, 14, 7, "#8c2b20");
          strokeRoundRect(14, 20, 36, 28, 8, "#f8e1b6", 3);
        }

        function drawSwordIcon() {
          ctx.strokeStyle = "#f3ddb2";
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(20, 50);
          ctx.lineTo(48, 18);
          ctx.stroke();
          ctx.fillStyle = "#d5a652";
          fillRoundRect(16, 46, 22, 8, 4, "#d5a652");
          fillRoundRect(12, 48, 8, 18, 4, "#8a231c");
        }

        function drawPotionIcon() {
          fillRoundRect(18, 18, 28, 34, 10, "#65c7a5");
          fillRoundRect(26, 10, 12, 14, 5, "#f2d8a3");
          ctx.strokeStyle = "#f6ead1";
          ctx.lineWidth = 3;
          ctx.strokeRect(24, 30, 16, 2);
        }

        function drawScrollIcon() {
          fillRoundRect(16, 16, 32, 34, 10, "#efe3bf");
          fillRoundRect(14, 22, 6, 26, 3, "#a3622b");
          fillRoundRect(44, 22, 6, 26, 3, "#a3622b");
          ctx.strokeStyle = "#8a5b31";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(24, 26);
          ctx.lineTo(40, 26);
          ctx.moveTo(24, 34);
          ctx.lineTo(38, 34);
          ctx.stroke();
        }

        function drawShieldIcon() {
          ctx.fillStyle = "#b58147";
          ctx.beginPath();
          ctx.moveTo(32, 10);
          ctx.lineTo(50, 18);
          ctx.lineTo(46, 44);
          ctx.lineTo(32, 56);
          ctx.lineTo(18, 44);
          ctx.lineTo(14, 18);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#f4ddb4";
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        function drawFeatherIcon() {
          ctx.strokeStyle = "#f0dfba";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(20, 50);
          ctx.quadraticCurveTo(34, 20, 48, 16);
          ctx.stroke();
          ctx.strokeStyle = "#b14835";
          ctx.beginPath();
          ctx.moveTo(22, 46);
          ctx.lineTo(44, 18);
          ctx.stroke();
        }

        function drawKeyIcon() {
          ctx.strokeStyle = "#ddb772";
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(24, 30, 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(34, 30);
          ctx.lineTo(52, 30);
          ctx.moveTo(46, 30);
          ctx.lineTo(46, 40);
          ctx.moveTo(52, 30);
          ctx.lineTo(52, 36);
          ctx.stroke();
        }

        function drawBowIcon() {
          ctx.strokeStyle = "#d9be8c";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(18, 14);
          ctx.quadraticCurveTo(46, 32, 18, 50);
          ctx.stroke();
          ctx.strokeStyle = "#f5eddc";
          ctx.beginPath();
          ctx.moveTo(18, 14);
          ctx.lineTo(18, 50);
          ctx.stroke();
          ctx.fillStyle = "#8a251d";
          ctx.beginPath();
          ctx.moveTo(34, 18);
          ctx.lineTo(50, 32);
          ctx.lineTo(34, 46);
          ctx.closePath();
          ctx.fill();
        }

        function drawAmuletIcon() {
          fillRoundRect(20, 16, 24, 34, 12, "#4dbf8b");
          strokeRoundRect(20, 16, 24, 34, 12, "#f3e2b8", 3);
          ctx.fillStyle = "#f3e2b8";
          ctx.beginPath();
          ctx.arc(32, 10, 6, 0, Math.PI * 2);
          ctx.fill();
        }

        function drawGenericIcon(kindName) {
          const base = ctx.createRadialGradient(width / 2, height / 2, 8, width / 2, height / 2, width / 2);
          base.addColorStop(0, "rgba(255, 245, 227, 0.26)");
          base.addColorStop(1, "rgba(255, 245, 227, 0)");
          ctx.fillStyle = base;
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, width / 2 - 8, 0, Math.PI * 2);
          ctx.fill();
          fillRoundRect(8, 8, width - 16, height - 16, 18, "rgba(77, 38, 28, 0.92)");
          strokeRoundRect(8, 8, width - 16, height - 16, 18, "#d8b376", 3);

          if (kindName === "icon_tab_all") drawBoxIcon();
          if (kindName === "icon_tab_weapon" || kindName === "icon_item_sword") drawSwordIcon();
          if (kindName === "icon_tab_potion" || kindName === "icon_item_potion") drawPotionIcon();
          if (kindName === "icon_tab_quest" || kindName === "icon_item_scroll") drawScrollIcon();
          if (kindName === "icon_item_shield") drawShieldIcon();
          if (kindName === "icon_item_feather") drawFeatherIcon();
          if (kindName === "icon_item_key") drawKeyIcon();
          if (kindName === "icon_item_bow") drawBowIcon();
          if (kindName === "icon_item_amulet") drawAmuletIcon();
        }

        if (kind === "scene") drawSceneBackground();
        if (kind === "topbar") drawPanel("#6a2d1f", "#241310", "#7d1d1a", "#f6ddb4", { topbar: true });
        if (kind === "inventory_panel") drawPanel("#4b281d", "#1d1311", "#6d2b1f", "#f3ddba");
        if (kind === "detail_panel") drawPanel("#45251c", "#181111", "#7b2019", "#f5debc");
        if (kind === "tab_idle") drawTab(false);
        if (kind === "tab_active") drawTab(true);
        if (kind === "item_card") drawItemCard(false);
        if (kind === "item_card_selected") drawItemCard(true);
        if (kind === "action_primary" || kind === "action_secondary" || kind === "action_danger") drawAction(kind);
        if (kind.startsWith("icon_")) drawGenericIcon(kind);
      }, asset);

      await page.locator("#assetCanvas").screenshot({
        path: outputPath,
        omitBackground: true
      });
    }
  } finally {
    await page.close();
    await browser.close();
  }

  console.log("Generated oriental inventory assets");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
