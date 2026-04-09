const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 8620);
const HOST = '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'public');

const inventory = {
  hero: {
    name: '夜裔行者',
    level: 42,
    gold: 18420,
    capacity: 36,
    weight: { current: 182, max: 240 }
  },
  tabs: ['全部', '武器', '护甲', '材料', '消耗品', '任务'],
  equipped: [
    { slot: '主手', icon: '⚔', item: '深渊裂刃', rarity: 'legendary' },
    { slot: '副手', icon: '🛡', item: '夜幕壁垒', rarity: 'epic' },
    { slot: '头部', icon: '⛑', item: '鸦羽兜帽', rarity: 'rare' },
    { slot: '胸甲', icon: '🜲', item: '黑钢胸铠', rarity: 'epic' },
    { slot: '饰品', icon: '✦', item: '古神残辉', rarity: 'legendary' },
    { slot: '靴子', icon: '🜁', item: '迷雾旅靴', rarity: 'rare' }
  ],
  items: [
    { id: 1, name: '深渊裂刃', type: '武器', rarity: 'legendary', icon: '⚔', level: 41, qty: 1, power: 412, desc: '裂开暮色的双手长刃。' },
    { id: 2, name: '夜行者短弓', type: '武器', rarity: 'epic', icon: '🏹', level: 39, qty: 1, power: 268, desc: '箭矢离弦时几乎没有声音。' },
    { id: 3, name: '黑钢胸铠', type: '护甲', rarity: 'epic', icon: '🜲', level: 40, qty: 1, power: 305, desc: '锻入月蚀符文的沉重护甲。' },
    { id: 4, name: '鸦羽兜帽', type: '护甲', rarity: 'rare', icon: '⛑', level: 37, qty: 1, power: 188, desc: '让佩戴者更难被察觉。' },
    { id: 5, name: '灵烬药剂', type: '消耗品', rarity: 'common', icon: '🧪', level: 1, qty: 8, power: 0, desc: '立即恢复 35% 灵能。' },
    { id: 6, name: '远古符文石', type: '材料', rarity: 'rare', icon: '◈', level: 1, qty: 12, power: 0, desc: '用于高阶附魔与升格。' },
    { id: 7, name: '破碎王冠碎片', type: '任务', rarity: 'quest', icon: '♛', level: 1, qty: 1, power: 0, desc: '通往王都深井的关键凭证。' },
    { id: 8, name: '夜幕壁垒', type: '护甲', rarity: 'epic', icon: '🛡', level: 41, qty: 1, power: 322, desc: '偏转暗影法术的盾牌。' },
    { id: 9, name: '迷雾旅靴', type: '护甲', rarity: 'rare', icon: '🜁', level: 36, qty: 1, power: 154, desc: '在湿地与雪地中都不会留下脚印。' },
    { id: 10, name: '月银飞刀', type: '武器', rarity: 'rare', icon: '✧', level: 33, qty: 4, power: 96, desc: '适合先手突袭的轻型投掷武器。' },
    { id: 11, name: '黯火炸弹', type: '消耗品', rarity: 'epic', icon: '✹', level: 1, qty: 3, power: 0, desc: '爆炸后形成持续燃烧的暗火区域。' },
    { id: 12, name: '虚空丝线', type: '材料', rarity: 'common', icon: '🕸', level: 1, qty: 26, power: 0, desc: '用于缝补披风与制作魔纹。' }
  ]
};

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 404, { success: false, error: 'Not found' });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function safePublicPath(requestPath) {
  const cleanPath = requestPath === '/' ? '/index.html' : requestPath;
  const normalized = path.normalize(cleanPath).replace(/^(\.\.[\\/])+/, '');
  return path.join(PUBLIC_DIR, normalized);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);

  if (req.method === 'GET' && url.pathname === '/api/inventory') {
    sendJson(res, 200, { success: true, data: inventory });
    return;
  }

  if (req.method === 'GET') {
    const filePath = safePublicPath(url.pathname);
    if (!filePath.startsWith(PUBLIC_DIR)) {
      sendJson(res, 403, { success: false, error: 'Forbidden' });
      return;
    }

    sendFile(res, filePath);
    return;
  }

  sendJson(res, 405, { success: false, error: 'Method not allowed' });
});

server.listen(PORT, HOST, () => {
  console.log(`Backpack service running at http://${HOST}:${PORT}`);
});
