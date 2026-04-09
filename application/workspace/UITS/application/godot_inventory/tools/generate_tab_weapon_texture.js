const fs = require("fs/promises");
const path = require("path");
const { chromium } = require("playwright");

const outputPath = path.resolve(__dirname, "..", "assets", "tab_weapon_bg.png");

async function main() {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 260, height: 108 },
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
              background: transparent;
            }

            body {
              display: grid;
              place-items: center;
              width: 100vw;
              height: 100vh;
            }

            canvas {
              width: 240px;
              height: 88px;
              display: block;
            }
          </style>
        </head>
        <body>
          <canvas id="tabCanvas" width="240" height="88"></canvas>
        </body>
      </html>
    `);

    await page.evaluate(() => {
      const canvas = document.getElementById("tabCanvas");
      const ctx = canvas.getContext("2d");

      function roundRectPath(x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const baseGradient = ctx.createLinearGradient(0, 0, 240, 88);
      baseGradient.addColorStop(0, "#214370");
      baseGradient.addColorStop(0.54, "#132947");
      baseGradient.addColorStop(1, "#0b1629");
      roundRectPath(4, 6, 232, 76, 22);
      ctx.fillStyle = baseGradient;
      ctx.fill();

      const edgeGradient = ctx.createLinearGradient(0, 6, 0, 82);
      edgeGradient.addColorStop(0, "#8bd8ff");
      edgeGradient.addColorStop(0.42, "#3c72cb");
      edgeGradient.addColorStop(1, "#10243f");
      ctx.lineWidth = 4;
      ctx.strokeStyle = edgeGradient;
      ctx.stroke();

      roundRectPath(10, 12, 220, 64, 18);
      const innerGradient = ctx.createLinearGradient(0, 12, 220, 76);
      innerGradient.addColorStop(0, "rgba(255,255,255,0.18)");
      innerGradient.addColorStop(0.3, "rgba(255,255,255,0.06)");
      innerGradient.addColorStop(1, "rgba(114, 221, 247, 0.08)");
      ctx.fillStyle = innerGradient;
      ctx.fill();

      ctx.save();
      roundRectPath(14, 16, 212, 56, 16);
      ctx.clip();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = "#bcecff";
      ctx.lineWidth = 2;
      for (let offset = -80; offset < 240; offset += 18) {
        ctx.beginPath();
        ctx.moveTo(offset, 76);
        ctx.lineTo(offset + 56, 16);
        ctx.stroke();
      }
      ctx.restore();

      const emblemGradient = ctx.createLinearGradient(0, 20, 0, 72);
      emblemGradient.addColorStop(0, "rgba(255, 223, 128, 0.96)");
      emblemGradient.addColorStop(1, "rgba(194, 128, 45, 0.94)");
      ctx.fillStyle = emblemGradient;

      ctx.beginPath();
      ctx.moveTo(62, 22);
      ctx.lineTo(78, 38);
      ctx.lineTo(72, 42);
      ctx.lineTo(84, 58);
      ctx.lineTo(77, 62);
      ctx.lineTo(62, 42);
      ctx.lineTo(47, 62);
      ctx.lineTo(40, 58);
      ctx.lineTo(52, 42);
      ctx.lineTo(46, 38);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(60, 26);
      ctx.lineTo(64, 26);
      ctx.lineTo(66, 56);
      ctx.lineTo(62, 69);
      ctx.lineTo(58, 56);
      ctx.closePath();
      ctx.fill();

      const glow = ctx.createRadialGradient(178, 44, 8, 178, 44, 60);
      glow.addColorStop(0, "rgba(114, 221, 247, 0.34)");
      glow.addColorStop(1, "rgba(114, 221, 247, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(178, 44, 60, 0, Math.PI * 2);
      ctx.fill();

      roundRectPath(12, 14, 216, 20, 14);
      const topHighlight = ctx.createLinearGradient(0, 14, 0, 34);
      topHighlight.addColorStop(0, "rgba(255,255,255,0.24)");
      topHighlight.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = topHighlight;
      ctx.fill();
    });

    await page.locator("#tabCanvas").screenshot({
      path: outputPath,
      omitBackground: true
    });
  } finally {
    await page.close();
    await browser.close();
  }

  console.log(`Generated ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
