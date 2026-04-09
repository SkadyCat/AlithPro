"""
AIGC Gallery Server
Displays all generated AIGC images from ComfyUI output directory.
Port: 8331
"""

import http.server
import json
import os
import sys
import urllib.parse
from pathlib import Path

PORT = 8331
SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = SCRIPT_DIR / "ComfyUI" / "output"

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AIGC Gallery</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0d1117; color: #c9d1d9;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    min-height: 100vh;
  }
  header {
    background: linear-gradient(135deg, #161b22, #1a1e2e);
    border-bottom: 1px solid #30363d;
    padding: 20px 32px; display: flex; align-items: center; gap: 16px;
  }
  header h1 { font-size: 22px; color: #58a6ff; }
  header .stats { font-size: 14px; color: #8b949e; margin-left: auto; }
  .toolbar {
    padding: 16px 32px; display: flex; gap: 12px; flex-wrap: wrap;
    border-bottom: 1px solid #21262d; background: #161b22;
  }
  .toolbar input, .toolbar select {
    background: #0d1117; border: 1px solid #30363d; color: #c9d1d9;
    padding: 8px 12px; border-radius: 6px; font-size: 14px;
  }
  .toolbar input:focus, .toolbar select:focus { border-color: #58a6ff; outline: none; }
  .toolbar input { flex: 1; min-width: 200px; }
  .btn {
    background: #21262d; border: 1px solid #30363d; color: #c9d1d9;
    padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;
  }
  .btn:hover { background: #30363d; border-color: #58a6ff; }
  .btn.active { background: #1f6feb; border-color: #1f6feb; color: #fff; }
  .gallery {
    display: grid; gap: 16px; padding: 24px 32px;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
  .card {
    background: #161b22; border: 1px solid #30363d; border-radius: 10px;
    overflow: hidden; transition: transform 0.2s, border-color 0.2s;
    cursor: pointer;
  }
  .card:hover { transform: translateY(-4px); border-color: #58a6ff; }
  .card img {
    width: 100%; aspect-ratio: 1; object-fit: cover;
    background: #0d1117; display: block;
  }
  .card .info {
    padding: 10px 12px; font-size: 12px; color: #8b949e;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .card .info .name { color: #c9d1d9; font-weight: 500; font-size: 13px; display: block; margin-bottom: 2px; }
  .empty {
    text-align: center; padding: 80px 32px; color: #484f58;
  }
  .empty svg { width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.4; }
  .empty h2 { font-size: 20px; margin-bottom: 8px; }

  /* Lightbox */
  .lightbox {
    display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.92);
    z-index: 1000; justify-content: center; align-items: center; flex-direction: column;
  }
  .lightbox.active { display: flex; }
  .lightbox img { max-width: 90vw; max-height: 80vh; border-radius: 8px; }
  .lightbox .caption {
    color: #c9d1d9; margin-top: 12px; font-size: 14px; text-align: center;
  }
  .lightbox .close {
    position: absolute; top: 20px; right: 28px; font-size: 32px;
    color: #8b949e; cursor: pointer; background: none; border: none;
  }
  .lightbox .close:hover { color: #fff; }
</style>
</head>
<body>
<header>
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <path d="M21 15l-5-5L5 21"/>
  </svg>
  <h1>AIGC Gallery</h1>
  <div class="stats" id="stats"></div>
</header>
<div class="toolbar">
  <input type="text" id="search" placeholder="搜索图片名称...">
  <select id="sort">
    <option value="newest">最新优先</option>
    <option value="oldest">最早优先</option>
    <option value="name">按名称</option>
    <option value="size">按大小</option>
  </select>
  <button class="btn" onclick="refresh()">🔄 刷新</button>
</div>
<div class="gallery" id="gallery"></div>
<div class="lightbox" id="lightbox" onclick="closeLightbox(event)">
  <button class="close" onclick="closeLightbox(event)">&times;</button>
  <img id="lb-img" src="">
  <div class="caption" id="lb-caption"></div>
</div>

<script>
let images = [];

async function loadImages() {
  const res = await fetch('/api/images');
  images = await res.json();
  renderGallery();
}

function renderGallery() {
  const q = document.getElementById('search').value.toLowerCase();
  const sort = document.getElementById('sort').value;
  let filtered = images.filter(img => img.name.toLowerCase().includes(q));

  if (sort === 'newest') filtered.sort((a, b) => b.mtime - a.mtime);
  else if (sort === 'oldest') filtered.sort((a, b) => a.mtime - b.mtime);
  else if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'size') filtered.sort((a, b) => b.size - a.size);

  document.getElementById('stats').textContent = `${filtered.length} / ${images.length} 张图片`;

  const gallery = document.getElementById('gallery');
  if (filtered.length === 0) {
    gallery.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="M21 15l-5-5L5 21"/>
      </svg>
      <h2>${images.length === 0 ? '暂无生成图片' : '没有匹配结果'}</h2>
      <p>${images.length === 0 ? 'ComfyUI 生成的图片将自动显示在这里' : '尝试其他搜索关键词'}</p>
    </div>`;
    return;
  }

  gallery.innerHTML = filtered.map(img => `
    <div class="card" onclick="openLightbox('${encodeURIComponent(img.name)}', '${img.name}', '${formatSize(img.size)}')">
      <img src="/images/${encodeURIComponent(img.name)}" loading="lazy" alt="${img.name}">
      <div class="info">
        <span class="name">${img.name}</span>
        ${formatSize(img.size)} · ${formatDate(img.mtime)}
      </div>
    </div>
  `).join('');
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function formatDate(ts) {
  const d = new Date(ts * 1000);
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function openLightbox(src, name, size) {
  document.getElementById('lb-img').src = '/images/' + src;
  document.getElementById('lb-caption').textContent = name + ' — ' + size;
  document.getElementById('lightbox').classList.add('active');
}

function closeLightbox(e) {
  if (e.target.id === 'lightbox' || e.target.classList.contains('close'))
    document.getElementById('lightbox').classList.remove('active');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.getElementById('lightbox').classList.remove('active');
});

function refresh() { loadImages(); }

document.getElementById('search').addEventListener('input', renderGallery);
document.getElementById('sort').addEventListener('change', renderGallery);

loadImages();
setInterval(loadImages, 10000);
</script>
</body>
</html>"""


class GalleryHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # suppress default logging

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path

        if path == "/" or path == "":
            self._serve_html()
        elif path == "/api/images":
            self._serve_image_list()
        elif path.startswith("/images/"):
            self._serve_image(path[8:])
        else:
            self.send_error(404)

    def _serve_html(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(HTML_TEMPLATE.encode("utf-8"))

    def _serve_image_list(self):
        images = []
        if OUTPUT_DIR.exists():
            for f in OUTPUT_DIR.iterdir():
                if f.suffix.lower() in IMAGE_EXTENSIONS and f.is_file():
                    stat = f.stat()
                    images.append({
                        "name": f.name,
                        "size": stat.st_size,
                        "mtime": stat.st_mtime,
                    })
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(images).encode("utf-8"))

    def _serve_image(self, encoded_name):
        name = urllib.parse.unquote(encoded_name)
        filepath = OUTPUT_DIR / name
        if not filepath.exists() or not filepath.is_file():
            self.send_error(404)
            return
        # Prevent path traversal
        try:
            filepath.resolve().relative_to(OUTPUT_DIR.resolve())
        except ValueError:
            self.send_error(403)
            return

        ext = filepath.suffix.lower()
        content_types = {
            ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".webp": "image/webp", ".gif": "image/gif", ".bmp": "image/bmp",
        }
        ctype = content_types.get(ext, "application/octet-stream")

        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(filepath.stat().st_size))
        self.send_header("Cache-Control", "public, max-age=3600")
        self.end_headers()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                self.wfile.write(chunk)


def main():
    server = http.server.HTTPServer(("127.0.0.1", PORT), GalleryHandler)
    print(f"AIGC Gallery running at http://127.0.0.1:{PORT}")
    print(f"Image source: {OUTPUT_DIR}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()


if __name__ == "__main__":
    main()
