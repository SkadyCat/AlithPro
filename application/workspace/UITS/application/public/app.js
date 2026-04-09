const screens = [
  {
    id: "main-hud",
    name: "主 HUD",
    subtitle: "顶部资源 + 底部技能栏",
    summary: "展示玩家在战斗中最常见的 HUD 结构，重点是状态、技能和小地图。",
    tag: "战斗",
    layers: [
      { name: "RootCanvas", detail: "全屏根节点" },
      { name: "TopBar", detail: "金币 / 钻石 / 时间" },
      { name: "MiniMap", detail: "右上角导航" },
      { name: "SkillBar", detail: "底部技能按钮组" },
      { name: "QuestTracker", detail: "左侧任务追踪" }
    ]
  },
  {
    id: "inventory",
    name: "背包界面",
    subtitle: "左分类 + 中间格子 + 右侧详情",
    summary: "用于展示道具管理与详情查看，适合作为 RPG 背包模板。",
    tag: "系统",
    layers: [
      { name: "RootCanvas", detail: "模态根节点" },
      { name: "CategoryTabs", detail: "背包分类切换" },
      { name: "ItemGrid", detail: "背包格子区" },
      { name: "ItemDetail", detail: "选中道具详情" },
      { name: "ActionBar", detail: "出售 / 使用 / 拆分" }
    ]
  },
  {
    id: "inventory-guofeng",
    name: "国风背包",
    subtitle: "卷轴分类 + 器物格 + 雅致详情",
    summary: "强调器物感、暖色材质和东方幻想语境，适合仙侠/武侠类背包页。",
    tag: "国风",
    layers: [
      { name: "RootCanvas", detail: "背包模态根节点" },
      { name: "ScrollTabs", detail: "卷轴分类栏" },
      { name: "TreasureGrid", detail: "器物与材料格子区" },
      { name: "ArtifactDetail", detail: "物品典故与属性说明" },
      { name: "ActionSealBar", detail: "装备 / 收纳 / 丢弃按钮" }
    ]
  },
  {
    id: "inventory-sci-fi",
    name: "科幻背包",
    subtitle: "模块仓 + 能量栏 + 扫描信息",
    summary: "强调系统感、扫描反馈和模块仓结构，适合机甲/科幻题材库存页。",
    tag: "科幻",
    layers: [
      { name: "RootCanvas", detail: "系统面板根节点" },
      { name: "ModuleTabs", detail: "装备舱分类切换" },
      { name: "StorageCells", detail: "模块仓格子区" },
      { name: "ScannerInfo", detail: "右侧扫描与稀有度信息" },
      { name: "EnergyActionBar", detail: "装配 / 拆解 / 发送按钮" }
    ]
  },
  {
    id: "inventory-light",
    name: "轻日式旅包",
    subtitle: "明快格子 + 旅途道具 + 轻量信息",
    summary: "强调轻松、清晰和全年龄感，适合休闲冒险、箱庭探索和主机向 UI。",
    tag: "轻快",
    layers: [
      { name: "RootCanvas", detail: "旅包根节点" },
      { name: "BagTabs", detail: "分类标签条" },
      { name: "TravelGrid", detail: "旅途用品格子区" },
      { name: "TripDetail", detail: "道具说明与旅途用途" },
      { name: "QuickUseBar", detail: "快捷使用与整理按钮" }
    ]
  },
  {
    id: "dialogue",
    name: "剧情对话",
    subtitle: "角色立绘 + 文本框 + 选项区",
    summary: "适合展示 AVG / RPG 的对话层级结构，突出角色、文本和分支选项。",
    tag: "剧情",
    layers: [
      { name: "RootCanvas", detail: "剧情根节点" },
      { name: "Background", detail: "场景底图" },
      { name: "CharacterPortraits", detail: "左右角色立绘" },
      { name: "DialoguePanel", detail: "底部对话框" },
      { name: "ChoiceGroup", detail: "分支按钮组" }
    ]
  }
];

const menuList = document.getElementById("menu-list");
const previewTitle = document.getElementById("preview-title");
const previewTag = document.getElementById("preview-tag");
const previewDesc = document.getElementById("preview-desc");
const canvasPanel = document.querySelector(".canvas_panel");
const currentScreenName = document.getElementById("current-screen-name");
const currentScreenSummary = document.getElementById("current-screen-summary");
const layerTree = document.getElementById("layer-tree");
const themeSelect = document.getElementById("theme-select");
const refreshButton = document.getElementById("refresh-button");
const exportButton = document.getElementById("export-button");
const canvas = document.getElementById("preview-canvas");
const ctx = canvas.getContext("2d");
const inspectorCheckbox = document.getElementById("inspector-checkbox");
const inspectorPanel = document.getElementById("inspector-panel");
const inspectorClose = document.getElementById("inspector-close");
const inspectorStatus = document.getElementById("inspector-status");
const inspectorCurrent = document.getElementById("inspector-current");
const inspectorTree = document.getElementById("inspector-tree");
const inspectorOverlay = document.getElementById("inspector-overlay");
const exportStatus = document.getElementById("export-status");
const exportLink = document.getElementById("export-link");
const exportPreview = document.getElementById("export-preview");

let activeScreenId = screens[0].id;
let inspectorOpen = false;
let selectedElement = null;
let exportInFlight = false;

const excludedIds = new Set([
  "inspector-checkbox",
  "inspector-panel",
  "inspector-close",
  "inspector-status",
  "inspector-current",
  "inspector-tree",
  "inspector-overlay"
]);

function getActiveScreen() {
  return screens.find((screen) => screen.id === activeScreenId) || screens[0];
}

function getExportThemeByScreen(screenId) {
  if (screenId === "inventory") {
    return "neon";
  }

  if (screenId === "inventory-guofeng") {
    return "guofeng";
  }

  if (screenId === "inventory-sci-fi") {
    return "scifi";
  }

  if (screenId === "inventory-light") {
    return "light";
  }

  return "";
}

function updateExportState(message) {
  const exportTheme = getExportThemeByScreen(activeScreenId);
  const exportable = Boolean(exportTheme);
  exportButton.disabled = exportInFlight || !exportable;

  if (message) {
    exportStatus.textContent = message;
    return;
  }

  if (exportInFlight) {
    exportStatus.textContent = "正在导出 PNG 图片，请稍候…";
    return;
  }

  if (!exportable) {
    exportStatus.textContent = "当前页面不是背包类界面，暂不支持导图。";
    return;
  }

  exportStatus.textContent = "点击顶部按钮可把 CSS 背包样式导出为 PNG 图片。";
}

function renderMenu() {
  menuList.innerHTML = screens
    .map(
      (screen) => `
        <button class="menu_item ${screen.id === activeScreenId ? "active" : ""}" type="button" data-screen-id="${screen.id}">
          <strong>${screen.name}</strong>
          <span>${screen.subtitle}</span>
        </button>
      `
    )
    .join("");

  menuList.querySelectorAll("[data-screen-id]").forEach((element) => {
    element.addEventListener("click", () => {
      const { screenId } = element.dataset;
      if (!screenId || screenId === activeScreenId) {
        return;
      }

      activeScreenId = screenId;
      renderAll();
    });
  });
}

function fillRoundRect(x, y, width, height, radius, color) {
  ctx.fillStyle = color;
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
  ctx.fill();
}

function drawText(text, x, y, font, color, align = "left") {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.textAlign = "left";
}

function drawStrokeText(text, x, y, font, fill, stroke) {
  ctx.font = font;
  ctx.lineWidth = 4;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function drawHud() {
  fillRoundRect(30, 24, canvas.width - 60, canvas.height - 48, 28, "#162033");
  fillRoundRect(54, 118, canvas.width - 108, canvas.height - 230, 24, "#1b263c");
  fillRoundRect(60, 48, canvas.width - 120, 54, 16, "#2f4770");
  fillRoundRect(canvas.width - 280, 130, 180, 180, 20, "#243147");
  fillRoundRect(120, canvas.height - 140, canvas.width - 240, 90, 22, "#111827");
  fillRoundRect(82, 126, 220, 84, 18, "#243147");
  fillRoundRect(84, 234, 240, 136, 18, "#1c2940");
  drawText("Lv.52  雷鸣骑士", 94, 154, "bold 24px Microsoft YaHei", "#f8fafc");
  drawText("HP 12,840 / 15,000", 94, 184, "16px Microsoft YaHei", "#93c5fd");
  drawText("当前任务", 102, 264, "bold 18px Microsoft YaHei", "#f8fafc");
  drawText("· 追踪风暴祭坛", 102, 296, "16px Microsoft YaHei", "#dbeafe");
  drawText("· 与守林人会合", 102, 326, "16px Microsoft YaHei", "#dbeafe");
  drawText("· 收集雷纹石 x3", 102, 356, "16px Microsoft YaHei", "#dbeafe");
  drawText("金币 12,480", 92, 83, "bold 18px Microsoft YaHei", "#fde68a");
  drawText("钻石 1,240", 260, 83, "bold 18px Microsoft YaHei", "#c4b5fd");
  drawText("20:45 夜晚", canvas.width - 210, 83, "bold 18px Microsoft YaHei", "#bfdbfe");
  drawText("小地图", canvas.width - 220, 160, "bold 18px Microsoft YaHei", "#f8fafc");
  drawText("东境营地", canvas.width - 220, 192, "15px Microsoft YaHei", "#dbeafe");
  drawStrokeText("风暴裂隙", canvas.width / 2 - 80, 180, "bold 40px Microsoft YaHei", "#ffffff", "#0f172a");
  drawText("Boss 即将刷新 · 00:38", canvas.width / 2 - 46, 214, "18px Microsoft YaHei", "#fbbf24");
  fillRoundRect(canvas.width / 2 - 110, 250, 220, 10, 5, "#243147");
  fillRoundRect(canvas.width / 2 - 110, 250, 164, 10, 5, "#22c55e");
  for (let index = 0; index < 5; index += 1) {
    fillRoundRect(190 + index * 160, canvas.height - 120, 110, 50, 16, index === 2 ? "#5b7cff" : "#30415f");
    drawText(index === 2 ? "大招" : `技能${index + 1}`, 245 + index * 160, canvas.height - 88, "16px Microsoft YaHei", "#eef4ff", "center");
  }
}

function drawInventory() {
  fillRoundRect(34, 28, canvas.width - 68, canvas.height - 56, 28, "#171f31");
  fillRoundRect(60, 84, 180, canvas.height - 140, 18, "#202d45");
  fillRoundRect(262, 84, Math.max(360, canvas.width - 590), canvas.height - 140, 18, "#111827");
  fillRoundRect(canvas.width - 330, 84, 270, canvas.height - 140, 18, "#1b273d");
  ["全部", "装备", "材料", "任务"].forEach((label, index) => {
    fillRoundRect(82, 120 + index * 66, 136, 48, 14, index === 0 ? "#5b7cff" : "#2d3d59");
    drawText(label, 150, 151 + index * 66, "16px Microsoft YaHei", "#eef4ff", "center");
  });
  drawText("背包容量 48 / 72", 290, 118, "bold 20px Microsoft YaHei", "#f8fafc");
  drawText("风暴之刃", canvas.width - 290, 128, "bold 24px Microsoft YaHei", "#f8fafc");
  drawText("传说 · 双手剑", canvas.width - 290, 160, "16px Microsoft YaHei", "#fbbf24");
  drawText("攻击 +128", canvas.width - 290, 220, "16px Microsoft YaHei", "#dbeafe");
  drawText("暴击 +18%", canvas.width - 290, 252, "16px Microsoft YaHei", "#dbeafe");
  drawText("耐久 92 / 100", canvas.width - 290, 284, "16px Microsoft YaHei", "#93c5fd");
  drawText("命中时触发雷链，对直线目标造成额外伤害。", canvas.width - 290, 316, "16px Microsoft YaHei", "#cbd5e1");
  drawText("推荐搭配：雷鸣骑士套装 4/5", canvas.width - 290, 352, "16px Microsoft YaHei", "#cbd5e1");
  fillRoundRect(canvas.width - 300, canvas.height - 142, 110, 46, 14, "#ef4444");
  fillRoundRect(canvas.width - 172, canvas.height - 142, 90, 46, 14, "#5b7cff");
  drawText("出售", canvas.width - 245, canvas.height - 112, "16px Microsoft YaHei", "#fff", "center");
  drawText("装备", canvas.width - 127, canvas.height - 112, "16px Microsoft YaHei", "#fff", "center");
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      fillRoundRect(290 + col * 92, 120 + row * 108, 72, 72, 14, (row + col) % 2 === 0 ? "#314fb4" : "#2d3d59");
      if (row === 0 && col === 0) {
        drawText("剑", 326, 164, "bold 26px Microsoft YaHei", "#fff", "center");
      } else if (row === 0 && col === 1) {
        drawText("药", 418, 164, "bold 26px Microsoft YaHei", "#fff", "center");
      } else if (row === 1 && col === 2) {
        drawText("盾", 510, 272, "bold 26px Microsoft YaHei", "#fff", "center");
      }
    }
  }
}

function drawGuofengInventory() {
  fillRoundRect(34, 28, canvas.width - 68, canvas.height - 56, 28, "#2b2119");
  fillRoundRect(58, 84, 170, canvas.height - 140, 18, "#4a3323");
  fillRoundRect(246, 84, Math.max(360, canvas.width - 570), canvas.height - 140, 18, "#201712");
  fillRoundRect(canvas.width - 304, 84, 246, canvas.height - 140, 18, "#3a281d");
  ["兵器", "药囊", "卷轴", "材料"].forEach((label, index) => {
    fillRoundRect(82, 120 + index * 66, 124, 48, 14, index === 1 ? "#c08457" : "#6b4b33");
    drawText(label, 144, 151 + index * 66, "16px Microsoft YaHei", "#fff7ed", "center");
  });
  drawText("行囊 · 秋水阁", 270, 118, "bold 22px Microsoft YaHei", "#fff7ed");
  drawText("云纹药匣", canvas.width - 250, 128, "bold 24px Microsoft YaHei", "#fff7ed");
  drawText("珍品 · 回灵", canvas.width - 250, 160, "16px Microsoft YaHei", "#fbbf24");
  drawText("服用后恢复 45% 体力，并在 10 秒内提升身法。", canvas.width - 250, 220, "16px Microsoft YaHei", "#fde7d5");
  fillRoundRect(canvas.width - 270, canvas.height - 142, 90, 46, 14, "#92400e");
  fillRoundRect(canvas.width - 160, canvas.height - 142, 90, 46, 14, "#c08457");
  drawText("收纳", canvas.width - 225, canvas.height - 112, "16px Microsoft YaHei", "#fff", "center");
  drawText("使用", canvas.width - 115, canvas.height - 112, "16px Microsoft YaHei", "#fff", "center");
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      fillRoundRect(276 + col * 88, 122 + row * 102, 68, 68, 14, (row + col) % 2 === 0 ? "#7c4a2d" : "#4b2f1f");
      if (row === 0 && col === 0) {
        drawText("丹", 310, 164, "bold 24px Microsoft YaHei", "#fff7ed", "center");
      }
    }
  }
}

function drawSciFiInventory() {
  fillRoundRect(34, 28, canvas.width - 68, canvas.height - 56, 28, "#121826");
  fillRoundRect(56, 84, 180, canvas.height - 140, 18, "#172033");
  fillRoundRect(254, 84, Math.max(360, canvas.width - 590), canvas.height - 140, 18, "#0f172a");
  fillRoundRect(canvas.width - 318, 84, 258, canvas.height - 140, 18, "#182234");
  ["武装仓", "芯片仓", "能量仓", "材料仓"].forEach((label, index) => {
    fillRoundRect(80, 120 + index * 66, 132, 48, 14, index === 0 ? "#22d3ee" : "#243147");
    drawText(label, 146, 151 + index * 66, "16px Microsoft YaHei", "#e0f2fe", "center");
  });
  drawText("Cargo Bay 07", 282, 118, "bold 22px Microsoft YaHei", "#f8fafc");
  drawText("Plasma Cell X", canvas.width - 286, 128, "bold 24px Microsoft YaHei", "#f8fafc");
  drawText("Epic Module", canvas.width - 286, 160, "16px Microsoft YaHei", "#22d3ee");
  drawText("输出增幅 +22% · 能耗 18/s · 稳定值 A", canvas.width - 286, 220, "16px Microsoft YaHei", "#cbd5e1");
  drawText("Scanner: compatible with MK-IV frame", canvas.width - 286, 252, "16px Microsoft YaHei", "#93c5fd");
  fillRoundRect(canvas.width - 286, canvas.height - 142, 100, 46, 14, "#ef4444");
  fillRoundRect(canvas.width - 168, canvas.height - 142, 100, 46, 14, "#2563eb");
  drawText("拆解", canvas.width - 236, canvas.height - 112, "16px Microsoft YaHei", "#fff", "center");
  drawText("装配", canvas.width - 118, canvas.height - 112, "16px Microsoft YaHei", "#fff", "center");
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      fillRoundRect(286 + col * 88, 122 + row * 102, 68, 68, 14, (row + col) % 2 === 0 ? "#1d4ed8" : "#1e293b");
      if (row === 0 && col === 1) {
        drawText("核", 408, 164, "bold 24px Microsoft YaHei", "#e0f2fe", "center");
      }
    }
  }
}

function drawLightInventory() {
  fillRoundRect(34, 28, canvas.width - 68, canvas.height - 56, 28, "#fff7ed");
  fillRoundRect(58, 84, 170, canvas.height - 140, 18, "#ffe4e6");
  fillRoundRect(246, 84, Math.max(360, canvas.width - 570), canvas.height - 140, 18, "#ffffff");
  fillRoundRect(canvas.width - 304, 84, 246, canvas.height - 140, 18, "#fff1f2");
  ["食物", "工具", "纪念品", "地图"].forEach((label, index) => {
    fillRoundRect(82, 120 + index * 66, 124, 48, 14, index === 2 ? "#fb7185" : "#f9a8d4");
    drawText(label, 144, 151 + index * 66, "16px Microsoft YaHei", "#7f1d1d", "center");
  });
  drawText("旅途背包", 270, 118, "bold 22px Microsoft YaHei", "#7c2d12");
  drawText("星海便当", canvas.width - 246, 128, "bold 24px Microsoft YaHei", "#7c2d12");
  drawText("恢复 25 点体力", canvas.width - 246, 160, "16px Microsoft YaHei", "#be123c");
  drawText("今天做好的热便当，适合在营地短暂停留时食用。", canvas.width - 246, 220, "16px Microsoft YaHei", "#7c2d12");
  fillRoundRect(canvas.width - 274, canvas.height - 142, 96, 46, 14, "#f97316");
  fillRoundRect(canvas.width - 164, canvas.height - 142, 96, 46, 14, "#fb7185");
  drawText("整理", canvas.width - 226, canvas.height - 112, "16px Microsoft YaHei", "#fff", "center");
  drawText("食用", canvas.width - 116, canvas.height - 112, "16px Microsoft YaHei", "#fff", "center");
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      fillRoundRect(276 + col * 88, 122 + row * 102, 68, 68, 14, (row + col) % 2 === 0 ? "#fdba74" : "#fecdd3");
      if (row === 1 && col === 1) {
        drawText("饭", 398, 266, "bold 24px Microsoft YaHei", "#7c2d12", "center");
      }
    }
  }
}

function drawDialogue() {
  fillRoundRect(30, 24, canvas.width - 60, canvas.height - 48, 28, "#241933");
  fillRoundRect(60, 46, canvas.width - 120, Math.max(240, canvas.height - 320), 18, "#3a2f52");
  fillRoundRect(74, 64, 260, 310, 24, "#8e5cf6");
  fillRoundRect(canvas.width - 314, 64, 240, 310, 24, "#f26ca7");
  fillRoundRect(104, canvas.height - 220, canvas.width - 208, 170, 24, "#181f2f");
  drawText("璃月", 164, 96, "bold 28px Microsoft YaHei", "#fff");
  drawText("夜巡队长", 144, 132, "16px Microsoft YaHei", "#ede9fe");
  drawText("希娜", canvas.width - 250, 100, "bold 28px Microsoft YaHei", "#fff");
  drawText("旅团向导", canvas.width - 250, 136, "16px Microsoft YaHei", "#fbcfe8");
  drawText("AUTO", canvas.width - 184, canvas.height - 180, "bold 16px Microsoft YaHei", "#fbbf24");
  drawText("LOG", canvas.width - 118, canvas.height - 180, "bold 16px Microsoft YaHei", "#bfdbfe");
  drawText("你终于到了。风暴祭坛已经开始崩塌，我们没有多少时间。", 142, canvas.height - 170, "18px Microsoft YaHei", "#f8fafc");
  drawText("接下来你打算怎么做？", 142, canvas.height - 134, "18px Microsoft YaHei", "#cbd5e1");
  for (let index = 0; index < 3; index += 1) {
    fillRoundRect(170 + index * 270, canvas.height - 92, 230, 40, 12, index === 1 ? "#ffb26b" : "#314fb4");
    drawText(["立刻出发", "先收集情报", "让我准备一下"][index], 285 + index * 270, canvas.height - 65, "16px Microsoft YaHei", "#fff", "center");
  }
}

function drawScreen() {
  const screen = getActiveScreen();
  const theme = document.body.dataset.theme || "neon";
  const panelWidth = Math.max(640, Math.floor(canvasPanel.clientWidth - 20));
  const panelHeight = Math.max(420, Math.floor(canvasPanel.clientHeight - 20));
  canvas.width = panelWidth;
  canvas.height = panelHeight;
  const bgColor = theme === "warm" ? "#231611" : theme === "clean" ? "#dfe9f7" : "#0f172a";
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = theme === "clean" ? "#1d2a42" : "#f8fafc";
  ctx.font = "bold 32px Microsoft YaHei";
  ctx.fillText(screen.name, 52, 58);
  ctx.font = "18px Microsoft YaHei";
  ctx.fillStyle = theme === "clean" ? "#5f708f" : "#9fb0d1";
  ctx.fillText(screen.subtitle, 52, 88);

  if (screen.id === "main-hud") {
    drawHud();
  } else if (screen.id === "inventory") {
    drawInventory();
  } else if (screen.id === "inventory-guofeng") {
    drawGuofengInventory();
  } else if (screen.id === "inventory-sci-fi") {
    drawSciFiInventory();
  } else if (screen.id === "inventory-light") {
    drawLightInventory();
  } else {
    drawDialogue();
  }
}

function renderRightInfo() {
  const screen = getActiveScreen();
  previewTitle.textContent = screen.name;
  previewTag.textContent = screen.tag;
  previewDesc.textContent = screen.subtitle;
  currentScreenName.textContent = screen.name;
  currentScreenSummary.textContent = screen.summary;
  layerTree.innerHTML = screen.layers
    .map(
      (layer, index) => `
        <button class="tree_item" type="button">
          ${index + 1}. ${layer.name}
          <small>${layer.detail}</small>
        </button>
      `
    )
    .join("");
}

function renderAll() {
  renderMenu();
  renderRightInfo();
  drawScreen();
  updateExportState();
}

function describeElement(element) {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const className = Array.from(element.classList).slice(0, 2).map((item) => `.${item}`).join("");
  return `${tag}${id}${className}`;
}

function isInspectableElement(element) {
  return element instanceof HTMLElement && !excludedIds.has(element.id) && !element.closest("#inspector-panel");
}

function setOverlay(element) {
  if (!element) {
    inspectorOverlay.classList.remove("visible");
    return;
  }

  const rect = element.getBoundingClientRect();
  inspectorOverlay.style.left = `${rect.left}px`;
  inspectorOverlay.style.top = `${rect.top}px`;
  inspectorOverlay.style.width = `${rect.width}px`;
  inspectorOverlay.style.height = `${rect.height}px`;
  inspectorOverlay.classList.add("visible");
}

function renderInspectorTree() {
  const nodes = Array.from(document.querySelectorAll(".workbench .card, .top_menu"))
    .filter((element) => isInspectableElement(element))
    .map(
      (element) => `
        <button class="inspector_node" type="button" data-target="${element.id || ""}">
          ${describeElement(element)}
          <small>${element.textContent.trim().slice(0, 28) || "容器节点"}</small>
        </button>
      `
    );
  inspectorTree.innerHTML = nodes.join("");

  inspectorTree.querySelectorAll(".inspector_node").forEach((element, index) => {
    element.addEventListener("click", () => {
      const target = Array.from(document.querySelectorAll(".workbench .card, .top_menu")).filter((node) => isInspectableElement(node))[index];
      if (target) {
        selectedElement = target;
        inspectorCurrent.innerHTML = `<strong>当前节点</strong><code>${describeElement(target)}</code>`;
        setOverlay(target);
      }
    });
  });
}

function toggleInspector(force) {
  inspectorOpen = typeof force === "boolean" ? force : !inspectorOpen;
  document.body.classList.toggle("inspector-open", inspectorOpen);
  inspectorPanel.setAttribute("aria-hidden", String(!inspectorOpen));
  inspectorCheckbox.checked = inspectorOpen;

  if (inspectorOpen) {
    inspectorStatus.textContent = "检视器已开启：点击工作台区域查看节点，Esc 可关闭。";
    renderInspectorTree();
  } else {
    inspectorOverlay.classList.remove("visible");
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "F12") {
    event.preventDefault();
    toggleInspector();
    return;
  }

  if (event.key === "Escape" && inspectorOpen) {
    event.preventDefault();
    toggleInspector(false);
  }
});

document.addEventListener("click", (event) => {
  if (!inspectorOpen) {
    return;
  }

  const target = event.target;
  if (!isInspectableElement(target)) {
    return;
  }

  selectedElement = target;
  inspectorCurrent.innerHTML = `<strong>当前节点</strong><code>${describeElement(target)}</code>`;
  setOverlay(target);
});

themeSelect.addEventListener("change", () => {
  document.body.dataset.theme = themeSelect.value;
  drawScreen();
});

refreshButton.addEventListener("click", () => drawScreen());
inspectorCheckbox.addEventListener("change", () => toggleInspector(inspectorCheckbox.checked));
inspectorClose.addEventListener("click", () => toggleInspector(false));
window.addEventListener("resize", () => drawScreen());
exportButton.addEventListener("click", async () => {
  const exportTheme = getExportThemeByScreen(activeScreenId);
  if (!exportTheme || exportInFlight) {
    return;
  }

  exportInFlight = true;
  updateExportState();
  let finalMessage = "";

  try {
    const response = await fetch(`/api/export-image?screen=${encodeURIComponent(activeScreenId)}&theme=${encodeURIComponent(exportTheme)}`);
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || payload.message || "导出失败");
    }

    exportLink.href = payload.imageUrl;
    exportLink.textContent = "打开导出图片";
    exportLink.style.display = "inline-flex";
    exportPreview.src = `${payload.imageUrl}?t=${Date.now()}`;
    exportPreview.style.display = "block";
    finalMessage = `已导出：${payload.fileName}`;
  } catch (error) {
    finalMessage = `导出失败：${error.message}`;
  } finally {
    exportInFlight = false;
    updateExportState(finalMessage);
  }
});

renderAll();
