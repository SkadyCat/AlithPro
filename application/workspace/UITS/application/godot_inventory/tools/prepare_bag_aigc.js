const fs = require("fs/promises");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const blueprintPath = path.join(projectRoot, "bag.bp");
const outputRoot = path.join(projectRoot, "aigc");
const promptRoot = path.join(outputRoot, "prompts");

const sharedNegativePrompt = [
  "text",
  "letters",
  "watermark",
  "logo",
  "human figure",
  "character portrait",
  "photography",
  "3d render",
  "real world props",
  "tilted composition",
  "asymmetrical frame",
  "cropped ornament",
  "muddy silhouette",
  "blurry details",
  "overexposed glow",
  "busy background"
].join(", ");

const packDefaults = {
  theme: "dark-fantasy-inventory-ui",
  visualKeywords: ["dark", "compact", "clear", "bronze", "obsidian", "emerald glow"],
  colorPalette: ["#161312", "#2f241d", "#6d5235", "#8ca07a", "#d8c89c"],
  batchRecommendation: "每个资源默认生成 8-12 个变体，再筛选 1-2 个进入后处理。",
  targetPlatforms: ["ComfyUI", "Scenario", "本地手工工作流"],
  outputPolicy: "UI/图标优先透明 PNG；场景底图可先出不透明构图，再统一转 PNG。",
  postprocessChecklist: [
    "清理透明边缘或杂色边",
    "确保中心主体留给文字或图标",
    "保持左右对称和切片安全边距",
    "缩放回目标尺寸后再检查 Godot 内显示"
  ],
  negativePrompt: sharedNegativePrompt
};

const sharedWorkflow = [
  "1. 读取 bag.bp 当前资源声明，确认任务包与现有背包蓝图一致。",
  "2. 使用每个任务自带的 prompt、negative prompt、references 与默认风格参数生成 8-12 个变体。",
  "3. 只保留轮廓干净、信息区留白充分、适合游戏 UI 叠字与切片的结果。",
  "4. 进行透明背景、边缘修整、对称校正与尺寸归一，再覆盖回目标路径。",
  "5. 回写资源后继续运行现有脚本链或 Godot 场景检查，确认兼容性。"
];

const resourceOverrides = {
  "assets/ui/scene_bg.png": {
    profile: "background",
    group: "background",
    priority: "high",
    references: ["bag.bp:[Tree]/BackdropArt", "assets/ui/scene_bg.png"],
    prompt:
      "dark fantasy inventory backdrop, ruined sanctuary silhouettes, smoky vignette, bronze dust, muted obsidian and olive palette, calm center for UI readability",
    postprocess: ["保留中心静区，避免压住容量区和格子区", "控制边缘对比度，避免喧宾夺主"]
  },
  "assets/ui/capacity_plate.png": {
    profile: "plate",
    group: "plate",
    priority: "high",
    references: ["bag.bp:[Tree]/CapacityPlate", "assets/ui/capacity_plate.png"],
    prompt:
      "compact dark fantasy capacity plate, carved bronze and worn obsidian trim, restrained emerald glow, centered empty area for capacity numbers, transparent background"
  },
  "assets/ui/close_button_bg.png": {
    profile: "button",
    group: "button",
    priority: "medium",
    references: ["bag.bp:[Tree]/CloseButton", "assets/ui/close_button_bg.png"],
    prompt:
      "dark fantasy close button background, compact square bronze frame, ember accent, crisp center for close icon, interactive ui button, transparent background"
  },
  "assets/ui/inventory_panel_bg.png": {
    profile: "panel",
    group: "panel",
    priority: "high",
    references: ["bag.bp:[Tree]/InventoryPanel/InventoryPanelArt", "assets/ui/inventory_panel_bg.png"],
    prompt:
      "compact dark fantasy inventory panel, carved bronze outer frame, obsidian inner surface, modular grid-safe center, symmetrical premium game ui window"
  },
  "assets/ui/tab_idle.png": {
    profile: "tab",
    group: "tab",
    priority: "medium",
    references: ["bag.bp:[Tree]/Tabs", "assets/ui/tab_idle.png"],
    prompt:
      "vertical dark fantasy category tab, worn bronze plate, subtle green glow, clean icon anchor, compact inventory ui, transparent background"
  },
  "assets/ui/tab_active.png": {
    profile: "tab-active",
    group: "tab",
    priority: "medium",
    references: ["bag.bp:[Tree]/Tabs", "assets/ui/tab_active.png", "assets/ui/tab_idle.png"],
    prompt:
      "selected vertical dark fantasy category tab, brighter emerald glow, polished bronze edges, clear icon anchor, active inventory ui state, transparent background"
  },
  "assets/ui/item_card_bg.png": {
    profile: "card",
    group: "card",
    priority: "high",
    references: ["bag.bp:[Tree]/InventoryPanel/GridContainer", "assets/ui/item_card_bg.png"],
    prompt:
      "dark fantasy inventory item card, compact slot frame, worn bronze corners, readable center for icon and quantity, modular ui cell, transparent background"
  },
  "assets/ui/item_card_selected.png": {
    profile: "card-selected",
    group: "card",
    priority: "high",
    references: [
      "bag.bp:[Tree]/InventoryPanel/GridContainer",
      "assets/ui/item_card_selected.png",
      "assets/ui/item_card_bg.png"
    ],
    prompt:
      "selected dark fantasy inventory item card, premium highlighted slot frame, emerald edge glow, compact ui cell, readable center for icon and quantity, transparent background"
  }
};

const categoryIconMeta = {
  equipment: {
    target: "equipment category icon",
    references: ["bag.bp:[Tree]/Tabs/TabEquipment"]
  },
  item: {
    target: "general item category icon",
    references: ["bag.bp:[Tree]/Tabs/TabItem"]
  },
  material: {
    target: "material category icon",
    references: ["bag.bp:[Tree]/Tabs/TabMaterial"]
  },
  currency: {
    target: "currency category icon",
    references: ["bag.bp:[Tree]/Tabs/TabCurrency"]
  }
};

const itemIconMeta = {
  sword: "ornate sword relic",
  potion: "healing potion vial",
  scroll: "sealed magic scroll",
  shield: "heavy shield crest",
  feather: "arcane feather token",
  key: "ancient key relic",
  bow: "elegant hunting bow",
  coin: "golden coin stack emblem"
};

function parseBlueprintResources(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- res://assets/"))
    .map((line) => line.slice(2).trim().replace(/^res:\/\//, ""));
}

function inferProfile(resource) {
  const normalized = resource.replace(/\\/g, "/");
  const name = path.basename(normalized, path.extname(normalized));

  if (normalized.startsWith("assets/icons/tab_")) {
    return "category-icon";
  }

  if (normalized.startsWith("assets/icons/item_")) {
    return "item-icon";
  }

  if (name === "scene_bg") {
    return "background";
  }

  if (name.includes("capacity_plate")) {
    return "plate";
  }

  if (name.includes("close_button")) {
    return "button";
  }

  if (name.includes("inventory_panel")) {
    return "panel";
  }

  if (name === "tab_active") {
    return "tab-active";
  }

  if (name === "tab_idle") {
    return "tab";
  }

  if (name === "item_card_selected") {
    return "card-selected";
  }

  if (name === "item_card_bg") {
    return "card";
  }

  return normalized.includes("/icons/") ? "icon" : "ui";
}

function defaultGroupForProfile(profile) {
  const map = {
    background: "background",
    plate: "plate",
    button: "button",
    panel: "panel",
    tab: "tab",
    "tab-active": "tab",
    card: "card",
    "card-selected": "card",
    "category-icon": "icon",
    "item-icon": "icon",
    icon: "icon",
    ui: "ui"
  };

  return map[profile] || "ui";
}

async function readPngSize(filePath) {
  const data = await fs.readFile(filePath);
  if (data.length < 24 || data.toString("ascii", 1, 4) !== "PNG") {
    return null;
  }

  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20)
  };
}

async function resolveSize(resource) {
  const absolutePath = path.join(projectRoot, ...resource.split("/"));
  try {
    const size = await readPngSize(absolutePath);
    if (size) {
      return `${size.width}x${size.height}`;
    }
  } catch {
    return "unknown";
  }

  return "unknown";
}

function defaultReferences(resource, name, profile) {
  if (profile === "category-icon") {
    const key = name.replace(/^tab_/, "");
    return [...(categoryIconMeta[key]?.references || ["bag.bp:[Tree]/Tabs"]), resource];
  }

  if (profile === "item-icon") {
    return ["bag.bp:[Data]", resource];
  }

  const map = {
    scene_bg: ["bag.bp:[Tree]/BackdropArt", resource],
    capacity_plate: ["bag.bp:[Tree]/CapacityPlate", resource],
    close_button_bg: ["bag.bp:[Tree]/CloseButton", resource],
    inventory_panel_bg: ["bag.bp:[Tree]/InventoryPanel/InventoryPanelArt", resource],
    tab_idle: ["bag.bp:[Tree]/Tabs", resource],
    tab_active: ["bag.bp:[Tree]/Tabs", resource],
    item_card_bg: ["bag.bp:[Tree]/InventoryPanel/GridContainer", resource],
    item_card_selected: ["bag.bp:[Tree]/InventoryPanel/GridContainer", resource]
  };

  return map[name] || [`bag.bp:${resource}`, resource];
}

function defaultPostprocess(profile) {
  switch (profile) {
    case "background":
      return ["控制大背景层次，避免覆盖前景信息区", "必要时先出不透明构图，再转 PNG 底图"];
    case "plate":
    case "button":
    case "tab":
    case "tab-active":
    case "card":
    case "card-selected":
    case "ui":
      return ["确认四边安全边距，避免被九宫格或拉伸破坏", "保留清晰主体和可叠字区域"];
    case "category-icon":
    case "item-icon":
    case "icon":
      return ["强化中心识别轮廓，确保缩小后仍可读", "清掉孤立噪点，统一透明边"];
    case "panel":
      return ["保证中心区域平整，适合承载格子与信息层", "检查四角与边框重复纹样是否对称"];
    default:
      return [...packDefaults.postprocessChecklist];
  }
}

function defaultPrompt(resource, name, profile) {
  if (profile === "category-icon") {
    const key = name.replace(/^tab_/, "");
    const target = categoryIconMeta[key]?.target || `${key} category icon`;
    return `minimal dark fantasy inventory ${target}, bronze and obsidian flat emblem, subtle emerald accent, centered silhouette, transparent background`;
  }

  if (profile === "item-icon") {
    const key = name.replace(/^item_/, "");
    const target = itemIconMeta[key] || key.replace(/_/g, " ");
    return `dark fantasy inventory item icon, ${target}, centered silhouette, readable at small size, bronze and muted gold accents, transparent background`;
  }

  switch (profile) {
    case "background":
      return "dark fantasy inventory backdrop, atmospheric ruin silhouettes, smoky vignette, muted obsidian palette, calm center for interface readability";
    case "plate":
      return "compact dark fantasy information plate, carved bronze border, worn obsidian body, faint emerald glow, clean center for numbers, transparent background";
    case "button":
      return "dark fantasy ui button background, compact bronze frame, subtle glow accent, crisp interactive silhouette, transparent background";
    case "panel":
      return "dark fantasy ui panel, premium bronze frame, obsidian surface, symmetrical layout, clean modular center for content";
    case "tab":
      return "dark fantasy category tab, worn bronze trim, understated glow, clear icon anchor, transparent background";
    case "tab-active":
      return "selected dark fantasy category tab, brighter emerald glow, polished bronze trim, clear icon anchor, transparent background";
    case "card":
      return "dark fantasy inventory slot card, compact bronze frame, readable center for icon and quantity, transparent background";
    case "card-selected":
      return "selected dark fantasy inventory slot card, premium highlighted frame, emerald edge glow, readable center for icon and quantity, transparent background";
    default:
      return `dark fantasy game ui asset, ${name.replace(/_/g, " ")}, clean silhouette, compact layout, production ready, transparent background`;
  }
}

function defaultPriority(profile) {
  switch (profile) {
    case "background":
    case "panel":
    case "plate":
    case "card":
    case "card-selected":
    case "item-icon":
      return "high";
    default:
      return "medium";
  }
}

function defaultBackgroundMode(profile) {
  return profile === "background" ? "opaque-or-soft-vignette" : "transparent";
}

function toPromptText(task) {
  return [
    `# ${task.name}`,
    `target: ${task.resource}`,
    `size: ${task.size}`,
    `strategy: ${task.strategy}`,
    `profile: ${task.profile}`,
    "",
    "[defaults]",
    `theme: ${task.defaults.theme}`,
    `background_mode: ${task.defaults.backgroundMode}`,
    `variant_batch: ${task.defaults.variantBatch}`,
    `output_policy: ${task.defaults.outputPolicy}`,
    `palette: ${task.defaults.colorPalette.join(", ")}`,
    `keywords: ${task.defaults.visualKeywords.join(", ")}`,
    "",
    "[prompt]",
    task.prompt,
    "",
    "[negative_prompt]",
    task.negativePrompt,
    "",
    "[references]",
    ...task.references.map((reference) => `- ${reference}`),
    "",
    "[postprocess]",
    ...task.postprocess.map((step) => `- ${step}`),
    "",
    "[workflow]",
    ...sharedWorkflow.map((step) => `- ${step}`)
  ].join("\n");
}

async function clearPromptDirectory() {
  await fs.mkdir(promptRoot, { recursive: true });
  const entries = await fs.readdir(promptRoot, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".txt"))
      .map((entry) => fs.unlink(path.join(promptRoot, entry.name)))
  );
}

async function createTask(resource, index) {
  const override = resourceOverrides[resource] || {};
  const name = path.basename(resource, path.extname(resource));
  const profile = override.profile || inferProfile(resource);
  const size = override.size || (await resolveSize(resource));
  const references = override.references || defaultReferences(resource, name, profile);

  return {
    id: `${String(index + 1).padStart(2, "0")}-${name}`,
    name,
    profile,
    resource,
    outputPath: `res://${resource.replace(/\\/g, "/")}`,
    group: override.group || defaultGroupForProfile(profile),
    size,
    strategy: override.strategy || "hybrid-aigc",
    priority: override.priority || defaultPriority(profile),
    prompt: override.prompt || defaultPrompt(resource, name, profile),
    negativePrompt: sharedNegativePrompt,
    references,
    postprocess: override.postprocess || defaultPostprocess(profile),
    defaults: {
      theme: packDefaults.theme,
      visualKeywords: packDefaults.visualKeywords,
      colorPalette: packDefaults.colorPalette,
      variantBatch: "8-12",
      backgroundMode: defaultBackgroundMode(profile),
      outputPolicy: packDefaults.outputPolicy
    }
  };
}

async function main() {
  const blueprint = await fs.readFile(blueprintPath, "utf8");
  const resources = parseBlueprintResources(blueprint);

  if (resources.length === 0) {
    throw new Error("bag.bp does not declare any asset resources.");
  }

  await clearPromptDirectory();

  const tasks = await Promise.all(resources.map((resource, index) => createTask(resource, index)));

  const pack = {
    blueprint: "bag.bp",
    outputRoot: "application/godot_inventory/aigc",
    summary: {
      totalAssets: tasks.length,
      highPriority: tasks.filter((task) => task.priority === "high").length,
      mediumPriority: tasks.filter((task) => task.priority === "medium").length,
      groups: [...new Set(tasks.map((task) => task.group))],
      profiles: [...new Set(tasks.map((task) => task.profile))]
    },
    workflow: {
      purpose: "将当前 bag.bp 的资源需求转为可投喂 AIGC 平台的标准任务包，并附带默认风格参数。",
      stages: sharedWorkflow
    },
    defaults: packDefaults,
    tasks
  };

  await fs.writeFile(
    path.join(outputRoot, "bag-task-pack.json"),
    `${JSON.stringify(pack, null, 2)}\n`,
    "utf8"
  );

  for (const task of tasks) {
    await fs.writeFile(path.join(promptRoot, `${task.name}.txt`), `${toPromptText(task)}\n`, "utf8");
  }

  console.log(`Prepared bag AIGC pack with ${tasks.length} tasks.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
