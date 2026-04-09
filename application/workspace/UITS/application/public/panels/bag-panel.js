// panels/bag-panel.js — 背包面板模块
// 导出面板配置供 editor.html 加载

export default {
  name: '背包',
  icon: '🎒',
  id: 'bag',

  css: `
/* === Root canvas (CanvasPanel) === */
#rootCanvas {
  width: 1440px; height: 900px;
  transform-origin: top left;
  transition: transform 0.2s;
}
/* === Backdrop fills === */
#background { position: absolute; inset: 0; }
#backdropArt {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at 40% 45%, #12162a 0%, #070810 70%);
}
#backdropArt::after {
  content: ""; position: absolute; inset: 0;
  background:
    radial-gradient(ellipse at 30% 30%, rgba(40,60,120,0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 70%, rgba(20,30,60,0.06) 0%, transparent 50%);
}
/* === CapacityPlate === */
#capacityPlate {
  position: absolute; left: 302px; top: 113px; width: 140px; height: 44px;
}
#capacityLabel {
  display: flex; align-items: baseline; justify-content: center;
  height: 100%; gap: 2px;
}
/* === Close button === */
#closeButton { position: absolute; right: 12px; top: 12px; z-index: 10; }
/* === Tabs === */
#tabs { position: absolute; left: 12px; top: 175px; z-index: 10; }
/* === InventoryPanel === */
#inventoryPanel { position: absolute; left: 147px; top: 175px; right: 12px; bottom: 12px; }
#inventoryPanelArt {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, #111528 0%, #0d1020 100%);
  border: 1px solid #1e2440; border-radius: 10px;
  pointer-events: none;
}
#gridContainer {
  position: absolute; left: 12px; top: 12px; right: 12px; bottom: 12px;
}
`,

  html: `
<umg-canvas-panel id="rootCanvas">
  <umg-border id="background" background="#070810"></umg-border>
  <div id="backdropArt"></div>
  <umg-border id="capacityPlate" background="linear-gradient(90deg,rgba(20,28,60,0.85),rgba(12,16,36,0.6))"
              border-color="rgba(60,80,140,0.25)" corner-radius="22px">
    <div id="capacityLabel">
      <umg-text-block id="capUsed" text="08" font-size="22px" font-weight="bold" color="#c8a050"></umg-text-block>
      <umg-text-block text="/" font-size="16px" color="#3a4060" padding="0 2px"></umg-text-block>
      <umg-text-block id="capTotal" text="12" font-size="16px" color="#5a6488"></umg-text-block>
    </div>
  </umg-border>
  <umg-overlay id="closeButton" style="width:56px;height:58px;cursor:pointer;">
    <umg-button
      style-normal="background:rgba(20,24,40,0.6);width:100%;height:100%;border:1px solid rgba(60,80,140,0.2);border-radius:8px;"
      style-hovered="background:rgba(160,50,50,0.5);border-color:rgba(200,60,60,0.4);"
      style-pressed="background:rgba(120,30,30,0.6);"></umg-button>
    <umg-text-block text="×" font-size="28px" color="#6070a0" h-align="Center" v-align="Center"
      style="pointer-events:none;display:flex;align-items:center;justify-content:center;width:100%;height:100%;"></umg-text-block>
  </umg-overlay>
  <umg-vertical-box id="tabs" style="gap:0px;">
    <umg-overlay class="tab-btn" data-cat="equipment" style="cursor:pointer;">
      <umg-button
        style-normal="background:linear-gradient(90deg,rgba(40,50,90,0.8),rgba(20,28,60,0.5));width:127px;border:1px solid #2a3258;border-radius:6px;padding:12px 16px;"
        style-hovered="background:linear-gradient(90deg,rgba(50,65,120,0.9),rgba(30,38,80,0.6));"></umg-button>
      <umg-text-block text="装备" font-size="14px" color="#c0c8e0"
        style="pointer-events:none;display:flex;align-items:center;gap:6px;padding:12px 16px;">
        <umg-image src="" style="width:16px;height:16px;display:inline-block;"></umg-image>
      </umg-text-block>
    </umg-overlay>
    <umg-overlay class="tab-btn" data-cat="item" style="cursor:pointer;">
      <umg-button
        style-normal="background:rgba(16,20,36,0.6);width:127px;border:1px solid transparent;border-radius:6px;padding:12px 16px;"
        style-hovered="background:rgba(24,30,54,0.8);"></umg-button>
      <umg-text-block text="道具" font-size="14px" color="#6878a0"
        style="pointer-events:none;display:flex;align-items:center;gap:6px;padding:12px 16px;">
        <umg-image src="" style="width:16px;height:16px;display:inline-block;"></umg-image>
      </umg-text-block>
    </umg-overlay>
    <umg-overlay class="tab-btn" data-cat="material" style="cursor:pointer;">
      <umg-button
        style-normal="background:rgba(16,20,36,0.6);width:127px;border:1px solid transparent;border-radius:6px;padding:12px 16px;"
        style-hovered="background:rgba(24,30,54,0.8);"></umg-button>
      <umg-text-block text="材料" font-size="14px" color="#6878a0"
        style="pointer-events:none;display:flex;align-items:center;gap:6px;padding:12px 16px;">
        <umg-image src="" style="width:16px;height:16px;display:inline-block;"></umg-image>
      </umg-text-block>
    </umg-overlay>
    <umg-overlay class="tab-btn" data-cat="currency" style="cursor:pointer;">
      <umg-button
        style-normal="background:rgba(16,20,36,0.6);width:127px;border:1px solid transparent;border-radius:6px;padding:12px 16px;"
        style-hovered="background:rgba(24,30,54,0.8);"></umg-button>
      <umg-text-block text="通货" font-size="14px" color="#6878a0"
        style="pointer-events:none;display:flex;align-items:center;gap:6px;padding:12px 16px;">
        <umg-image src="" style="width:16px;height:16px;display:inline-block;"></umg-image>
      </umg-text-block>
    </umg-overlay>
  </umg-vertical-box>
  <umg-overlay id="inventoryPanel">
    <div id="inventoryPanelArt"></div>
    <umg-tile-view id="gridContainer" columns="3" entry-width="108px" entry-height="108px" gap="10 10"
      selection-mode="Single" orientation="Vertical" scrollbar-visibility="Auto"
      tile-alignment="start" enable-scroll-animation="true"
      entry-class="umg-tile-entry">
    </umg-tile-view>
  </umg-overlay>
</umg-canvas-panel>
`,

  treeNodes: [
    { label: "RootCanvas (UCanvasPanel)", children: [
      { label: "Background (UBorder)" },
      { label: "BackdropArt (TextureRect)" },
      { label: "CapacityPlate (UBorder)", children: [
        { label: "CapacityLabel (UHorizontalBox)", children: [
          { label: "CapUsed (UTextBlock)" },
          { label: "Sep (UTextBlock)" },
          { label: "CapTotal (UTextBlock)" }
        ]}
      ]},
      { label: "CloseButton (UOverlay)", children: [
        { label: "CloseBtnBg (UButton)" },
        { label: "CloseBtnIcon (UTextBlock)" }
      ]},
      { label: "Tabs (UVerticalBox)", children: [
        { label: "TabEquipment (UOverlay)", children: [
          { label: "TabEquipBtnBg (UButton)" },
          { label: "TabEquipLabel (UTextBlock)" },
          { label: "TabEquipIcon (UImage)" }
        ]},
        { label: "TabItem (UOverlay)", children: [
          { label: "TabItemBtnBg (UButton)" },
          { label: "TabItemLabel (UTextBlock)" },
          { label: "TabItemIcon (UImage)" }
        ]},
        { label: "TabMaterial (UOverlay)", children: [
          { label: "TabMatBtnBg (UButton)" },
          { label: "TabMatLabel (UTextBlock)" },
          { label: "TabMatIcon (UImage)" }
        ]},
        { label: "TabCurrency (UOverlay)", children: [
          { label: "TabCurBtnBg (UButton)" },
          { label: "TabCurLabel (UTextBlock)" },
          { label: "TabCurIcon (UImage)" }
        ]}
      ]},
      { label: "InventoryPanel (UOverlay)", children: [
        { label: "InventoryPanelArt (TextureRect)" },
        { label: "GridContainer (UTileView)", children: [
          { label: "Item01 (UTileEntry)" }, { label: "Item02 (UTileEntry)" }, { label: "Item03 (UTileEntry)" },
          { label: "Item04 (UTileEntry)" }, { label: "Item05 (UTileEntry)" }, { label: "Item06 (UTileEntry)" },
          { label: "Item07 (UTileEntry)" }, { label: "Item08 (UTileEntry)" }, { label: "Item09 (UTileEntry)" },
          { label: "Item10 (UTileEntry)" }, { label: "Item11 (UTileEntry)" }, { label: "Item12 (UTileEntry)" }
        ]}
      ]}
    ]}
  ],

  treeLabelMap: {
    rootCanvas:       'RootCanvas',
    background:       'Background',
    backdropArt:      'BackdropArt',
    capacityPlate:    'CapacityPlate',
    capacityLabel:    'CapacityLabel',
    capUsed:          'CapUsed',
    capTotal:         'CapTotal',
    closeButton:      'CloseButton',
    tabs:             'Tabs',
    inventoryPanel:   'InventoryPanel',
    inventoryPanelArt:'InventoryPanelArt',
    gridContainer:    'GridContainer (UTileView)',
  },

  tabCatMap: { equipment:'TabEquipment', item:'TabItem', material:'TabMaterial', currency:'TabCurrency' },

  // Called after HTML is injected; receives the center_area container
  init(container) {
    const ITEMS = [
      { title:"龙雀古剑", subtitle:"装备 · 战刃", category:"equipment", quantity:1,  icon:"⚔️", stats:"攻击力 +248 / 会心 +12%", detail:"主战用的暗纹长剑。" },
      { title:"回灵丹",   subtitle:"道具 · 恢复", category:"item",      quantity:18, icon:"🧪", stats:"恢复 1200 气血 / 持有 18", detail:"用于续航的常备丹药。" },
      { title:"离火符卷", subtitle:"道具 · 卷轴", category:"item",      quantity:6,  icon:"📜", stats:"范围爆散 / 持有 6", detail:"攻伐型法符卷轴。" },
      { title:"玄甲护心盾",subtitle:"装备 · 防具",category:"equipment", quantity:1,  icon:"🛡️", stats:"格挡 +18% / 生命 +520", detail:"偏重稳固的护心盾。" },
      { title:"踏云羽令", subtitle:"材料 · 灵羽", category:"material",  quantity:3,  icon:"🪶", stats:"轻灵材料 / 持有 3", detail:"用于轻甲与灵饰制作。" },
      { title:"遗迹门钥", subtitle:"材料 · 钥匙", category:"material",  quantity:1,  icon:"🗝️", stats:"遗迹开启 / 持有 1", detail:"开启密门的关键门钥。" },
      { title:"风行灵弓", subtitle:"装备 · 远袭", category:"equipment", quantity:1,  icon:"🏹", stats:"攻击 +176 / 攻速 +9%", detail:"轻快的追风灵弓。" },
      { title:"魂银钱匣", subtitle:"通货 · 钱匣", category:"currency",  quantity:12840, icon:"🪙", stats:"流通货币 / 持有 12840", detail:"用于交易与锻造的标准通货。" }
    ];

    let activeCat = "equipment";

    function fmtQty(q) {
      return q >= 10000 ? (q/1000).toFixed(1)+"k" : String(q).padStart(2,"0");
    }

    function renderGrid() {
      const grid = container.querySelector("#gridContainer");
      if (!grid) return;
      const visible = ITEMS.filter(i => i.category === activeCat);
      const total = 12;
      const tiles = [];
      for (let i = 0; i < total; i++) {
        if (i < visible.length) {
          const it = visible[i];
          tiles.push({
            icon: it.icon,
            title: it.title,
            subtitle: it.subtitle,
            qty: `x${fmtQty(it.quantity)}`,
            stats: it.stats,
            detail: it.detail,
            _idx: i, _item: it
          });
        } else {
          tiles.push({ _empty: true, _idx: i });
        }
      }
      // Use entry-class mode: no template function → UTileEntry instances handle rendering
      grid.setItems(tiles);

      grid.removeEventListener('OnItemClicked', grid._selHandler);
      grid._selHandler = (e) => {
        const tile = e.detail.item;
        if (tile && !tile._empty) {
          grid.setSelectedIndex(e.detail.index);
        }
      };
      grid.addEventListener('OnItemClicked', grid._selHandler);

      const usedEl = container.querySelector("#capUsed");
      if (usedEl) usedEl.setAttribute("text", String(ITEMS.length).padStart(2,"0"));
      const totalEl = container.querySelector("#capTotal");
      if (totalEl) totalEl.setAttribute("text", String(total).padStart(2,"0"));
    }

    const ACTIVE_BTN_STYLE = "background:linear-gradient(90deg,rgba(40,50,90,0.8),rgba(20,28,60,0.5));width:127px;border:1px solid #2a3258;border-radius:6px;padding:12px 16px;";
    const IDLE_BTN_STYLE   = "background:rgba(16,20,36,0.6);width:127px;border:1px solid transparent;border-radius:6px;padding:12px 16px;";
    const ACTIVE_TEXT_COLOR = "#c0c8e0";
    const IDLE_TEXT_COLOR   = "#6878a0";

    function setTabActive(overlay) {
      container.querySelectorAll(".tab-btn").forEach(o => {
        const btn = o.querySelector("umg-button");
        const txt = o.querySelector("umg-text-block");
        if (btn) btn.setAttribute("style-normal", IDLE_BTN_STYLE);
        if (txt) txt.setAttribute("color", IDLE_TEXT_COLOR);
      });
      const btn = overlay.querySelector("umg-button");
      const txt = overlay.querySelector("umg-text-block");
      if (btn) btn.setAttribute("style-normal", ACTIVE_BTN_STYLE);
      if (txt) txt.setAttribute("color", ACTIVE_TEXT_COLOR);
    }

    container.querySelectorAll(".tab-btn").forEach(overlay => {
      const innerBtn = overlay.querySelector("umg-button");
      if (!innerBtn) return;
      innerBtn.addEventListener("OnClicked", () => {
        activeCat = overlay.getAttribute("data-cat");
        selectedIdx = 0;
        setTabActive(overlay);
        renderGrid();
      });
    });

    container.querySelector("#closeButton umg-button")?.addEventListener("OnClicked", () => {
      const root = container.querySelector("#rootCanvas");
      root.style.opacity = "0";
      root.style.transition = "opacity 0.3s";
      setTimeout(() => { root.style.opacity = "1"; }, 600);
    });

    renderGrid();

    return { ITEMS, renderGrid, getRootCanvas: () => container.querySelector("#rootCanvas") };
  }
};
