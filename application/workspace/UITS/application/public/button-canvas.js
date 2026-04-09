const width = 320;
const height = 96;
const cssPath = "/button-canvas.css";

const canvas = document.getElementById("render-canvas");
const status = document.getElementById("render-status");

function createButtonMarkup() {
  return `<div xmlns="http://www.w3.org/1999/xhtml" class="button-bg"></div>`;
}

async function loadCssText(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`无法读取 CSS：${response.status}`);
  }
  return response.text();
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function renderCssButtonToCanvas() {
  const cssText = await loadCssText(cssPath);
  const html = createButtonMarkup();
  document.getElementById("button-bg").innerHTML = "";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;">
          <style>${escapeXml(cssText)}</style>
          ${html}
        </div>
      </foreignObject>
    </svg>
  `;

  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("SVG 栅格化失败"));
      img.src = url;
    });

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    status.textContent = "已绘制到 canvas";
  } finally {
    URL.revokeObjectURL(url);
  }
}

renderCssButtonToCanvas().catch((error) => {
  status.textContent = error instanceof Error ? error.message : String(error);
});
