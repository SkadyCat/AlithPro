const fs = require("fs/promises");
const path = require("path");
const { chromium } = require("playwright");

const projectRoot = path.resolve(__dirname, "..");
const blueprintPath = path.join(projectRoot, "bag.bp");
const exportRoot = path.join(projectRoot, "exports", "bag_undead_pack");
const assetRoot = path.join(exportRoot, "assets");

const resourceSpecs = new Map([
  ["scene_bg.png", { dir: "ui", width: 1440, height: 900, kind: "scene" }],
  ["inventory_panel_bg.png", { dir: "ui", width: 385, height: 486, kind: "inventory_panel" }],
  ["tab_idle.png", { dir: "ui", width: 127, height: 80, kind: "tab_idle" }],
  ["tab_active.png", { dir: "ui", width: 127, height: 80, kind: "tab_active" }],
  ["item_card_bg.png", { dir: "ui", width: 113, height: 108, kind: "item_card" }],
  ["item_card_selected.png", { dir: "ui", width: 113, height: 108, kind: "item_card_selected" }],
  ["capacity_plate.png", { dir: "ui", width: 140, height: 44, kind: "capacity_plate" }],
  ["close_button_bg.png", { dir: "ui", width: 56, height: 58, kind: "close_button" }],
  ["tab_equipment.png", { dir: "icons", width: 64, height: 64, kind: "icon_tab_equipment" }],
  ["tab_item.png", { dir: "icons", width: 64, height: 64, kind: "icon_tab_item" }],
  ["tab_material.png", { dir: "icons", width: 64, height: 64, kind: "icon_tab_material" }],
  ["tab_currency.png", { dir: "icons", width: 64, height: 64, kind: "icon_tab_currency" }],
  ["item_sword.png", { dir: "icons", width: 72, height: 72, kind: "icon_item_sword" }],
  ["item_potion.png", { dir: "icons", width: 72, height: 72, kind: "icon_item_potion" }],
  ["item_scroll.png", { dir: "icons", width: 72, height: 72, kind: "icon_item_scroll" }],
  ["item_shield.png", { dir: "icons", width: 72, height: 72, kind: "icon_item_shield" }],
  ["item_feather.png", { dir: "icons", width: 72, height: 72, kind: "icon_item_feather" }],
  ["item_key.png", { dir: "icons", width: 72, height: 72, kind: "icon_item_key" }],
  ["item_bow.png", { dir: "icons", width: 72, height: 72, kind: "icon_item_bow" }],
  ["item_coin.png", { dir: "icons", width: 72, height: 72, kind: "icon_item_coin" }]
]);

function parseBlueprintResources(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- res://assets/"))
    .map((line) => line.slice(2).trim().replace(/^res:\/\//, ""));
}

async function ensureDirectories() {
  await fs.mkdir(path.join(assetRoot, "ui"), { recursive: true });
  await fs.mkdir(path.join(assetRoot, "icons"), { recursive: true });
}

async function buildExportPlan() {
  const blueprint = await fs.readFile(blueprintPath, "utf8");
  const resources = parseBlueprintResources(blueprint);
  const missingSpecs = [];

  const plan = resources.map((resourcePath) => {
    const file = path.basename(resourcePath);
    const spec = resourceSpecs.get(file);
    if (!spec) {
      missingSpecs.push(file);
      return null;
    }

    return {
      resourcePath,
      file,
      ...spec,
      outputPath: path.join(assetRoot, resourcePath.replace(/^assets[\\/]/, "").replace(/\//g, path.sep))
    };
  }).filter(Boolean);

  if (missingSpecs.length > 0) {
    throw new Error(`Missing size/kind specs for: ${missingSpecs.join(", ")}`);
  }

  return { blueprint, resources, plan };
}

async function main() {
  const { blueprint, resources, plan } = await buildExportPlan();
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

    for (const asset of plan) {
      await page.evaluate(({ width, height, kind }) => {
        const canvas = document.getElementById("assetCanvas");
        const ctx = canvas.getContext("2d");
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.clearRect(0, 0, width, height);

        const palette = {
          border: "#7086ad",
          borderBright: "#d7e0f2",
          fillTop: "#313a4c",
          fillMid: "#171c28",
          fillBottom: "#090c14",
          glow: "rgba(119, 161, 232, 0.18)",
          glowStrong: "rgba(175, 205, 255, 0.26)",
          shadow: "rgba(2, 4, 10, 0.54)",
          bone: "#d6dff1",
          moss: "#5f769d",
          soul: "#95bbff",
          soulDeep: "#3f5d8b",
          accentDanger: "#876a8f",
          accentSeal: "#32405b",
          parchment: "#d6ddeb"
        };

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

        function cleanSampledEdges() {
          const image = ctx.getImageData(0, 0, width, height);
          const source = new Uint8ClampedArray(image.data);
          const data = image.data;

          function alphaAt(px, py) {
            if (px < 0 || py < 0 || px >= width || py >= height) {
              return 0;
            }
            return source[(py * width + px) * 4 + 3];
          }

          for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
              const index = (y * width + x) * 4;
              const alpha = source[index + 3];
              if (alpha === 0 || alpha === 255) {
                continue;
              }

              let touchesTransparent = false;
              for (let oy = -1; oy <= 1 && !touchesTransparent; oy += 1) {
                for (let ox = -1; ox <= 1; ox += 1) {
                  if (ox === 0 && oy === 0) {
                    continue;
                  }
                  if (alphaAt(x + ox, y + oy) === 0) {
                    touchesTransparent = true;
                    break;
                  }
                }
              }

              if (!touchesTransparent) {
                continue;
              }

              if (alpha >= 160) {
                data[index + 3] = 255;
              } else {
                data[index] = 0;
                data[index + 1] = 0;
                data[index + 2] = 0;
                data[index + 3] = 0;
              }
            }
          }

          ctx.putImageData(image, 0, 0);
        }

        function drawUndeadBase(x, y, w, h, radius, options = {}) {
          const base = ctx.createLinearGradient(x, y, x, y + h);
          base.addColorStop(0, options.fillTop || palette.fillTop);
          base.addColorStop(0.46, options.fillMid || palette.fillMid);
          base.addColorStop(1, options.fillBottom || palette.fillBottom);
          fillRoundRect(x, y, w, h, radius, base);

          strokeRoundRect(x, y, w, h, radius, options.border || palette.border, options.borderWidth || 4);

          ctx.save();
          roundRectPath(x + 2, y + 2, w - 4, h - 4, Math.max(8, radius - 2));
          ctx.clip();

          const topGlow = ctx.createRadialGradient(x + w / 2, y + h * 0.08, 8, x + w / 2, y + h * 0.12, w * 0.48);
          topGlow.addColorStop(0, options.glow || palette.glowStrong);
          topGlow.addColorStop(1, "rgba(173, 229, 177, 0)");
          ctx.fillStyle = topGlow;
          ctx.fillRect(x, y, w, h * 0.58);

          const innerShade = ctx.createLinearGradient(x, y, x, y + h);
          innerShade.addColorStop(0, "rgba(223, 235, 216, 0.04)");
          innerShade.addColorStop(0.54, "rgba(223, 235, 216, 0)");
          innerShade.addColorStop(1, options.shadow || palette.shadow);
          ctx.fillStyle = innerShade;
          ctx.fillRect(x, y, w, h);
          ctx.restore();
        }

        function drawSoulMist(x, y, w, h, strength = 1) {
          const mist = ctx.createRadialGradient(x + w / 2, y + h * 0.28, 6, x + w / 2, y + h * 0.28, Math.max(w, h) * 0.45);
          mist.addColorStop(0, `rgba(160, 224, 173, ${0.12 * strength})`);
          mist.addColorStop(0.55, `rgba(118, 177, 128, ${0.08 * strength})`);
          mist.addColorStop(1, "rgba(118, 177, 128, 0)");
          ctx.fillStyle = mist;
          ctx.fillRect(x, y, w, h);
        }

        function drawSeal(x, y, size) {
          drawUndeadBase(x, y, size, size, Math.max(8, size * 0.22), {
            fillTop: "#506351",
            fillMid: "#364538",
            fillBottom: "#1d261f",
            border: "#d1e0c5",
            borderWidth: Math.max(2, size * 0.08),
            glow: "rgba(181, 235, 190, 0.16)"
          });
          ctx.strokeStyle = palette.borderBright;
          ctx.lineWidth = Math.max(2, size * 0.06);
          ctx.beginPath();
          ctx.moveTo(x + size * 0.28, y + size * 0.32);
          ctx.lineTo(x + size * 0.72, y + size * 0.68);
          ctx.moveTo(x + size * 0.7, y + size * 0.28);
          ctx.lineTo(x + size * 0.38, y + size * 0.56);
          ctx.stroke();
        }

        function drawSceneBackground() {
          const bg = ctx.createLinearGradient(0, 0, 0, height);
          bg.addColorStop(0, "#090c14");
          bg.addColorStop(0.42, "#121827");
          bg.addColorStop(1, "#04070d");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, width, height);

          const rift = ctx.createRadialGradient(width * 0.52, 120, 18, width * 0.52, 120, 280);
          rift.addColorStop(0, "rgba(186, 210, 255, 0.32)");
          rift.addColorStop(0.55, "rgba(111, 146, 212, 0.14)");
          rift.addColorStop(1, "rgba(111, 146, 212, 0)");
          ctx.fillStyle = rift;
          ctx.beginPath();
          ctx.arc(width * 0.52, 120, 280, 0, Math.PI * 2);
          ctx.fill();

          const mist = ctx.createLinearGradient(0, height * 0.38, 0, height);
          mist.addColorStop(0, "rgba(86, 112, 164, 0.04)");
          mist.addColorStop(1, "rgba(4, 7, 13, 0.72)");
          ctx.fillStyle = mist;
          ctx.fillRect(0, height * 0.36, width, height * 0.64);

          ctx.fillStyle = "rgba(3, 6, 12, 0.9)";
          ctx.beginPath();
          ctx.moveTo(0, height * 0.78);
          ctx.lineTo(width * 0.16, height * 0.62);
          ctx.lineTo(width * 0.31, height * 0.76);
          ctx.lineTo(width * 0.52, height * 0.58);
          ctx.lineTo(width * 0.72, height * 0.8);
          ctx.lineTo(width, height * 0.66);
          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          ctx.fill();
        }

        function drawPanel(kindName) {
          const configs = {
            inventory_panel: { radius: 34 }
          };
          const config = configs[kindName];
          drawUndeadBase(10, 10, width - 20, height - 20, config.radius);
          soulMistPanel(false);
        }

        function soulMistPanel(withMarkers) {
          ctx.save();
          roundRectPath(20, 20, width - 40, height - 40, 28);
          ctx.clip();
          drawSoulMist(20, 20, width - 40, height - 40, 1.2);
          if (withMarkers) {
            fillRoundRect(34, 28, width - 68, height - 56, 24, "rgba(214, 230, 206, 0.04)");
            drawSeal(32, 28, 48);
            drawSeal(width - 80, 28, 48);
          }
          ctx.restore();
        }

        function drawTopbarPanel() {
          ctx.save();
          roundRectPath(20, 20, width - 40, height - 40, 28);
          ctx.clip();
          drawSoulMist(20, 20, width - 40, height - 40, 0.72);
          const band = ctx.createLinearGradient(0, 28, 0, height - 28);
          band.addColorStop(0, "rgba(218, 231, 209, 0.06)");
          band.addColorStop(0.48, "rgba(218, 231, 209, 0.02)");
          band.addColorStop(1, "rgba(8, 13, 10, 0.12)");
          fillRoundRect(28, 24, width - 56, height - 48, 22, band);
          ctx.restore();
        }

        function drawPlate(kindName) {
          const isWide = kindName === "capacity_plate";
          drawUndeadBase(6, 6, width - 12, height - 12, Math.min(24, height * 0.32), {
            fillTop: isWide ? "#36435d" : "#3d4a67",
            fillMid: "#1c2435",
            fillBottom: "#0b1018"
          });
          drawSoulMist(14, 14, width - 28, height - 28, 1);
        }

        function drawCloseButton() {
          drawUndeadBase(4, 4, width - 8, height - 8, 14, {
            fillTop: "#415476",
            fillMid: "#202a41",
            fillBottom: "#0c1019",
            border: "#d2dcf1",
            glow: "rgba(176, 206, 255, 0.22)"
          });
          drawSoulMist(8, 8, width - 16, height - 16, 0.9);
        }

        function drawEquipmentSlot(active) {
          drawUndeadBase(8, 8, width - 16, height - 16, 22, {
            fillTop: active ? "#556758" : "#3f4b41",
            fillMid: active ? "#344237" : "#29302a",
            fillBottom: "#161c17",
            border: active ? "#d8e6cf" : "#a8ba9d",
            glow: active ? "rgba(191, 241, 193, 0.26)" : "rgba(149, 201, 158, 0.12)"
          });
          fillRoundRect(22, 22, width - 44, height - 44, 18, active ? "rgba(206, 235, 202, 0.08)" : "rgba(206, 235, 202, 0.04)");
          drawSoulMist(22, 16, width - 44, height - 44, active ? 1.25 : 0.8);
        }

        function drawTab(active) {
          drawUndeadBase(8, 8, width - 16, height - 16, 24, {
            fillTop: active ? "#425375" : "#263044",
            fillMid: active ? "#1e2940" : "#141a28",
            fillBottom: "#090d15",
            border: active ? "#cdd8ee" : "#62779d",
            glow: active ? "rgba(175, 205, 255, 0.24)" : "rgba(100, 128, 178, 0.08)"
          });
          drawSoulMist(18, 14, width - 36, height - 28, active ? 1.1 : 0.7);
        }

        function drawItemCard(selected) {
          drawUndeadBase(8, 8, width - 16, height - 16, 26, {
            fillTop: selected ? "#3a4b6c" : "#222c3f",
            fillMid: selected ? "#1b2438" : "#121824",
            fillBottom: "#080c14",
            border: selected ? "#ccd8ef" : "#596c8f",
            glow: selected ? "rgba(176, 206, 255, 0.18)" : "rgba(94, 120, 171, 0.07)"
          });
          drawSoulMist(18, 18, width - 36, height - 36, selected ? 1 : 0.65);
        }

        function drawAction(kindName) {
          const variants = {
            action_primary: { fillTop: "#566a59", fillMid: "#354438", fillBottom: "#181f1a", border: "#dce8d1" },
            action_secondary: { fillTop: "#49564a", fillMid: "#2d352e", fillBottom: "#171d18", border: "#bfd0b5" },
            action_danger: { fillTop: "#526054", fillMid: "#323c34", fillBottom: "#161c17", border: "#cfe0c4" }
          };
          const variant = variants[kindName];
          drawUndeadBase(10, 10, width - 20, height - 20, 22, variant);
          drawSoulMist(18, 16, width - 36, height - 32, kindName === "action_primary" ? 1.05 : 0.78);
        }

        function drawCrest() {
          drawUndeadBase(6, 6, width - 12, height - 12, 24, {
            fillTop: "#4b5b4d",
            fillMid: "#2e3a30",
            fillBottom: "#151b16"
          });
          ctx.fillStyle = palette.bone;
          ctx.beginPath();
          ctx.moveTo(width / 2, 14);
          ctx.lineTo(width - 22, 28);
          ctx.lineTo(width - 28, height - 24);
          ctx.lineTo(width / 2, height - 12);
          ctx.lineTo(28, height - 24);
          ctx.lineTo(22, 28);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#eff5e8";
          ctx.lineWidth = 3;
          ctx.stroke();
          drawSoulMist(16, 12, width - 32, height - 24, 1.2);
        }

        function drawDetailHero() {
          drawUndeadBase(6, 6, width - 12, height - 12, 24, {
            fillTop: "#202925",
            fillMid: "#161c19",
            fillBottom: "#0d1210"
          });
          const moon = ctx.createRadialGradient(width - 82, 52, 8, width - 82, 52, 72);
          moon.addColorStop(0, "rgba(216, 236, 209, 0.72)");
          moon.addColorStop(0.6, "rgba(159, 221, 171, 0.18)");
          moon.addColorStop(1, "rgba(159, 221, 171, 0)");
          ctx.fillStyle = moon;
          ctx.beginPath();
          ctx.arc(width - 82, 52, 72, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "rgba(8, 10, 9, 0.84)";
          ctx.beginPath();
          ctx.moveTo(0, height - 34);
          ctx.lineTo(width * 0.22, 88);
          ctx.lineTo(width * 0.42, 132);
          ctx.lineTo(width * 0.58, 72);
          ctx.lineTo(width * 0.8, 138);
          ctx.lineTo(width, 92);
          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = palette.bone;
          ctx.beginPath();
          ctx.moveTo(144, 24);
          ctx.lineTo(154, 24);
          ctx.lineTo(160, 112);
          ctx.lineTo(150, 148);
          ctx.lineTo(140, 112);
          ctx.closePath();
          ctx.fill();
        }

        function drawScrollLike(fill) {
          drawUndeadBase(6, 6, width - 12, height - 12, 22, {
            fillTop: "#4b594d",
            fillMid: "#2e372f",
            fillBottom: "#171d18"
          });
          fillRoundRect(22, 18, width - 44, height - 36, 18, fill);
          strokeRoundRect(22, 18, width - 44, height - 36, 18, "#b5c8ab", 3);
        }

        function drawIconFrame() {
          const bg = ctx.createRadialGradient(width / 2, height / 2, 6, width / 2, height / 2, width / 2);
          bg.addColorStop(0, "rgba(179, 233, 186, 0.18)");
          bg.addColorStop(1, "rgba(179, 233, 186, 0)");
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, width / 2 - 6, 0, Math.PI * 2);
          ctx.fill();
          drawUndeadBase(8, 8, width - 16, height - 16, 18, {
            fillTop: "#445146",
            fillMid: "#283128",
            fillBottom: "#121712",
            border: "#d7e3cd",
            borderWidth: 3
          });
        }

        function drawSwordIcon() {
          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.rotate(-0.72);

          const blade = ctx.createLinearGradient(0, -24, 0, 20);
          blade.addColorStop(0, "#eef4ff");
          blade.addColorStop(0.52, "#b7c8ea");
          blade.addColorStop(1, "#7b93c0");
          fillRoundRect(-5, -24, 10, 34, 5, blade);

          fillRoundRect(-8, 8, 16, 5, 3, "#dde6f7");
          fillRoundRect(-3, 12, 6, 16, 3, "#7da0d8");
          fillRoundRect(-8, 24, 16, 7, 4, "#31476f");

          ctx.strokeStyle = "#f8fbff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -20);
          ctx.lineTo(0, 8);
          ctx.stroke();
          ctx.restore();
        }

        function drawPotionIcon() {
          fillRoundRect(18, 18, 28, 34, 10, "#72b285");
          fillRoundRect(26, 10, 12, 14, 5, palette.bone);
          ctx.strokeStyle = palette.borderBright;
          ctx.lineWidth = 3;
          ctx.strokeRect(24, 30, 16, 2);
        }

        function drawScrollIcon() {
          fillRoundRect(16, 16, 32, 34, 10, palette.parchment);
          fillRoundRect(14, 22, 6, 26, 3, "#7f9278");
          fillRoundRect(44, 22, 6, 26, 3, "#7f9278");
          ctx.strokeStyle = "#627560";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(24, 26);
          ctx.lineTo(40, 26);
          ctx.moveTo(24, 34);
          ctx.lineTo(38, 34);
          ctx.stroke();
        }

        function drawShieldIcon() {
          ctx.fillStyle = "#8aa183";
          ctx.beginPath();
          ctx.moveTo(32, 10);
          ctx.lineTo(50, 18);
          ctx.lineTo(46, 44);
          ctx.lineTo(32, 56);
          ctx.lineTo(18, 44);
          ctx.lineTo(14, 18);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = palette.borderBright;
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        function drawFeatherIcon() {
          ctx.strokeStyle = palette.bone;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(20, 50);
          ctx.quadraticCurveTo(34, 20, 48, 16);
          ctx.stroke();
          ctx.strokeStyle = "#7db38c";
          ctx.beginPath();
          ctx.moveTo(22, 46);
          ctx.lineTo(44, 18);
          ctx.stroke();
        }

        function drawKeyIcon() {
          ctx.strokeStyle = "#dbe6d3";
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
          ctx.strokeStyle = "#b6c9af";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(18, 14);
          ctx.quadraticCurveTo(46, 32, 18, 50);
          ctx.stroke();
          ctx.strokeStyle = palette.borderBright;
          ctx.beginPath();
          ctx.moveTo(18, 14);
          ctx.lineTo(18, 50);
          ctx.stroke();
          ctx.fillStyle = "#7db18a";
          ctx.beginPath();
          ctx.moveTo(34, 18);
          ctx.lineTo(50, 32);
          ctx.lineTo(34, 46);
          ctx.closePath();
          ctx.fill();
        }

        function drawAmuletIcon() {
          fillRoundRect(20, 16, 24, 34, 12, "#73b489");
          strokeRoundRect(20, 16, 24, 34, 12, palette.borderBright, 3);
          ctx.fillStyle = palette.borderBright;
          ctx.beginPath();
          ctx.arc(32, 10, 6, 0, Math.PI * 2);
          ctx.fill();
        }

        function drawCoinIcon() {
          const gold = ctx.createRadialGradient(30, 24, 6, 34, 34, 26);
          gold.addColorStop(0, "#fff4d7");
          gold.addColorStop(0.5, "#e6bc5d");
          gold.addColorStop(1, "#805119");
          ctx.fillStyle = gold;
          ctx.beginPath();
          ctx.arc(32, 32, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#fff7df";
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(32, 32, 12, 0, Math.PI * 2);
          ctx.stroke();
        }

        function drawBoxIcon() {
          fillRoundRect(14, 20, 36, 28, 8, "#90a68a");
          fillRoundRect(20, 12, 24, 14, 7, "#556b56");
          strokeRoundRect(14, 20, 36, 28, 8, palette.borderBright, 3);
        }

        function drawGenericIcon(kindName) {
          drawIconFrame();

          if (kindName === "icon_tab_equipment" || kindName === "icon_item_shield") drawShieldIcon();
          if (kindName === "icon_tab_item" || kindName === "icon_item_potion") drawPotionIcon();
          if (kindName === "icon_tab_material" || kindName === "icon_item_feather") drawFeatherIcon();
          if (kindName === "icon_tab_currency" || kindName === "icon_item_coin") drawCoinIcon();
          if (kindName === "icon_item_sword") drawSwordIcon();
          if (kindName === "icon_item_scroll") drawScrollIcon();
          if (kindName === "icon_item_shield") drawShieldIcon();
          if (kindName === "icon_item_key") drawKeyIcon();
          if (kindName === "icon_item_bow") drawBowIcon();
          if (kindName === "icon_item_amulet") drawAmuletIcon();
          if (kindName === "icon_tab_all") drawBoxIcon();
        }

        if (kind === "scene") drawSceneBackground();
        if (kind === "inventory_panel") drawPanel(kind);
        if (kind === "close_button") drawCloseButton();
        if (kind === "tab_idle") drawTab(false);
        if (kind === "tab_active") drawTab(true);
        if (kind === "item_card") drawItemCard(false);
        if (kind === "item_card_selected") drawItemCard(true);
        if (kind === "action_primary" || kind === "action_secondary" || kind === "action_danger") drawAction(kind);
        if (kind === "crest") drawCrest();
        if (kind === "capacity_plate" || kind === "title_plate" || kind === "currency_plate" || kind === "grid_header") drawPlate(kind);
        if (kind === "equipment_slot") drawEquipmentSlot(false);
        if (kind === "equipment_slot_active") drawEquipmentSlot(true);
        if (kind === "detail_title") drawPlate(kind);
        if (kind === "detail_hero") drawDetailHero();
        if (kind === "detail_seal") drawSeal(6, 6, width - 12);
        if (kind === "stat_scroll") drawScrollLike("#d5dccd");
        if (kind === "detail_lore") drawScrollLike("rgba(213, 220, 205, 0.88)");
        if (kind.startsWith("icon_")) drawGenericIcon(kind);
        cleanSampledEdges();
      }, asset);

      await fs.mkdir(path.dirname(asset.outputPath), { recursive: true });
      await page.locator("#assetCanvas").screenshot({
        path: asset.outputPath,
        omitBackground: true
      });
    }
  } finally {
    await page.close();
    await browser.close();
  }

  const manifest = {
    blueprint: path.basename(blueprintPath),
    theme: "dark-layout",
    assetCount: resources.length,
    exportRoot,
    assets: plan.map((asset) => ({
      resourcePath: asset.resourcePath,
      outputPath: asset.outputPath,
      size: `${asset.width}x${asset.height}`,
      kind: asset.kind
    }))
  };

  await fs.writeFile(path.join(exportRoot, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  await fs.writeFile(path.join(exportRoot, "bag.bp"), blueprint, "utf8");

  console.log(`Exported ${plan.length} dark-layout bag assets to ${exportRoot}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
