const presets = {
  neon: {
    eyebrow: "System Inventory",
    title: "风暴行囊",
    desc: "赛博蓝背包，用 CSS 结构导出为宣传图",
    gridTitle: "背包 / Neon Loadout",
    gridSubtitle: "科技蓝 + 高亮稀有度 + 运营截图感",
    badge: "传奇装备",
    detailTitle: "风暴之刃",
    detailText: "命中时触发雷链，对直线目标造成额外伤害。适合作为高爆发职业的主武器展示图。"
  },
  guofeng: {
    eyebrow: "Eastern Inventory",
    title: "秋水行囊",
    desc: "东方器物感背包，适合仙侠 / 武侠导图",
    gridTitle: "背包 / 国风器物页",
    gridSubtitle: "卷轴分类 + 暖铜材质 + 雅致细节",
    badge: "珍品器物",
    detailTitle: "云纹药匣",
    detailText: "服用后恢复 45% 体力，并在 10 秒内提升身法，适合东方幻想题材的展示图。"
  },
  scifi: {
    eyebrow: "Cargo Module",
    title: "Cargo Bay 07",
    desc: "模块仓式背包，适合科幻 / 机甲题材导图",
    gridTitle: "背包 / Sci-Fi Cargo",
    gridSubtitle: "冷蓝扫描感 + 模块仓排布 + 高科技信息密度",
    badge: "Epic Module",
    detailTitle: "Plasma Cell X",
    detailText: "输出增幅 +22%，可与 MK-IV 框架兼容，适合作为科幻库存界面的中心展示物。"
  },
  light: {
    eyebrow: "Travel Pack",
    title: "旅途背包",
    desc: "轻快暖色背包，适合休闲冒险截图导出",
    gridTitle: "背包 / Light Journey Pack",
    gridSubtitle: "轻量布局 + 年轻感配色 + 旅途用品氛围",
    badge: "旅途常备",
    detailTitle: "星海便当",
    detailText: "今天做好的热便当，适合在营地短暂停留时食用，让导图更有生活气息和轻松感。"
  }
};

const params = new URLSearchParams(window.location.search);
const theme = params.get("theme");
const activePreset = presets[theme] || presets.neon;

document.body.dataset.theme = presets[theme] ? theme : "neon";
document.getElementById("export-eyebrow").textContent = activePreset.eyebrow;
document.getElementById("export-title").textContent = activePreset.title;
document.getElementById("export-desc").textContent = activePreset.desc;
document.getElementById("grid-title").textContent = activePreset.gridTitle;
document.getElementById("grid-subtitle").textContent = activePreset.gridSubtitle;
document.getElementById("detail-badge").textContent = activePreset.badge;
document.getElementById("detail-title").textContent = activePreset.detailTitle;
document.getElementById("detail-text").textContent = activePreset.detailText;
document.getElementById("export-shot").classList.add("ready");
