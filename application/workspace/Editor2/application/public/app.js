const state = {
  inventory: null,
  activeTab: '全部',
  activeItemId: null
};

const heroName = document.getElementById('hero-name');
const heroLevel = document.getElementById('hero-level');
const heroGold = document.getElementById('hero-gold');
const capacityText = document.getElementById('capacity-text');
const weightText = document.getElementById('weight-text');
const weightBar = document.getElementById('weight-bar');
const tabs = document.getElementById('tabs');
const equipmentGrid = document.getElementById('equipment-grid');
const itemGrid = document.getElementById('item-grid');
const detailCard = document.getElementById('detail-card');

function rarityClass(rarity) {
  return `rarity-${rarity}`;
}

function renderHero(hero) {
  heroName.textContent = hero.name;
  heroLevel.textContent = `Lv.${hero.level}`;
  heroGold.textContent = hero.gold.toLocaleString('zh-CN');
  capacityText.textContent = `容量 ${state.inventory.items.length} / ${hero.capacity}`;
  weightText.textContent = `重量 ${hero.weight.current} / ${hero.weight.max}`;
  weightBar.style.width = `${Math.min((hero.weight.current / hero.weight.max) * 100, 100)}%`;
}

function renderEquipment() {
  equipmentGrid.innerHTML = state.inventory.equipped.map((slot) => `
    <article class="equip-slot">
      <div class="equip-icon ${rarityClass(slot.rarity)}">${slot.icon}</div>
      <div>
        <div class="item-meta">${slot.slot}</div>
        <div class="equip-name ${rarityClass(slot.rarity)}">${slot.item}</div>
      </div>
    </article>
  `).join('');
}

function renderTabs() {
  tabs.innerHTML = state.inventory.tabs.map((tab) => `
    <button class="tab ${tab === state.activeTab ? 'active' : ''}" data-tab="${tab}">${tab}</button>
  `).join('');

  tabs.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeTab = button.dataset.tab;
      renderTabs();
      renderItems();
    });
  });
}

function filteredItems() {
  if (state.activeTab === '全部') {
    return state.inventory.items;
  }

  return state.inventory.items.filter((item) => item.type === state.activeTab);
}

function renderItems() {
  const items = filteredItems();

  if (!items.length) {
    itemGrid.innerHTML = '<div class="empty-note">该分类下暂无物品。</div>';
    return;
  }

  itemGrid.innerHTML = items.map((item) => `
    <article class="item-card ${item.id === state.activeItemId ? 'active' : ''}" data-item-id="${item.id}">
      <div class="item-top">
        <div class="item-icon ${rarityClass(item.rarity)}">${item.icon}</div>
        <div class="qty-badge">x${item.qty}</div>
      </div>
      <div class="rarity-badge ${rarityClass(item.rarity)}">${item.rarity.toUpperCase()}</div>
      <div class="item-name ${rarityClass(item.rarity)}">${item.name}</div>
      <div class="item-meta">
        <span>${item.type}</span>
        <span>战力 ${item.power}</span>
      </div>
    </article>
  `).join('');

  itemGrid.querySelectorAll('[data-item-id]').forEach((card) => {
    card.addEventListener('click', () => {
      state.activeItemId = Number(card.dataset.itemId);
      renderItems();
      renderDetail();
    });
  });
}

function renderDetail() {
  const item = state.inventory.items.find((entry) => entry.id === state.activeItemId);

  if (!item) {
    detailCard.className = 'detail-card empty';
    detailCard.innerHTML = `
      <div class="detail-icon">✦</div>
      <h3>选择一个物品</h3>
      <p>右侧将显示品质、战力与描述。</p>
    `;
    return;
  }

  detailCard.className = 'detail-card';
  detailCard.innerHTML = `
    <div class="detail-icon ${rarityClass(item.rarity)}">${item.icon}</div>
    <div>
      <h3 class="${rarityClass(item.rarity)}">${item.name}</h3>
      <p class="detail-meta">${item.type} · 需求等级 ${item.level}</p>
    </div>
    <div class="detail-meta">
      <div class="detail-metric">
        <div class="item-meta">品质</div>
        <strong class="${rarityClass(item.rarity)}">${item.rarity.toUpperCase()}</strong>
      </div>
      <div class="detail-metric">
        <div class="item-meta">数量</div>
        <strong>x${item.qty}</strong>
      </div>
      <div class="detail-metric">
        <div class="item-meta">战力</div>
        <strong>${item.power}</strong>
      </div>
      <div class="detail-metric">
        <div class="item-meta">等级</div>
        <strong>${item.level}</strong>
      </div>
    </div>
    <p>${item.desc}</p>
  `;
}

async function bootstrap() {
  const response = await fetch('/api/inventory');
  const payload = await response.json();
  if (!payload.success) {
    throw new Error(payload.error || 'Failed to load inventory');
  }

  state.inventory = payload.data;
  state.activeItemId = state.inventory.items[0]?.id || null;
  renderHero(state.inventory.hero);
  renderEquipment();
  renderTabs();
  renderItems();
  renderDetail();
}

bootstrap().catch((error) => {
  itemGrid.innerHTML = `<div class="empty-note">加载失败：${error.message}</div>`;
});
