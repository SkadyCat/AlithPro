import { UWidget } from './UWidget.js';

/**
 * UTileView — UMG TileView 镜像控件
 *
 * 支持 entry-class 属性（对应 UE5 EntryWidgetClass）：
 *   <umg-tile-view entry-class="umg-tile-entry" ...>
 *
 * 当指定 entry-class 时，TileView 会为每个数据项创建该自定义元素实例，
 * 并调用其 setListItem(item, index) 传入数据（等价于 OnListItemObjectSet）。
 * 未指定时回退到内置模板渲染。
 */
export class UTileView extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes,
      'width', 'height',
      'entry-width', 'entry-height', 'tile-width', 'tile-height',
      'columns', 'items', 'gap',
      'selection-mode', 'orientation', 'scrollbar-visibility',
      'tile-alignment', 'enable-scroll-animation',
      'entry-class',
    ];
  }

  constructor() {
    super();
    this._items = null;
    this._template = null;
    this._selectedIndices = new Set();
    this._entryInstances = [];
  }

  // --- Public API ---
  setItems(items, template) {
    this._items = items;
    this._template = template;
    this._selectedIndices.clear();
    this._renderTiles();
  }

  getSelectedIndex() {
    return this._selectedIndices.size ? [...this._selectedIndices][0] : -1;
  }

  getSelectedIndices() {
    return [...this._selectedIndices];
  }

  getSelectedItems() {
    if (!this._items) return [];
    return [...this._selectedIndices].map(i => this._items[i]).filter(Boolean);
  }

  setSelectedIndex(idx) {
    this._selectedIndices.clear();
    if (idx >= 0) this._selectedIndices.add(idx);
    this._syncSelection();
  }

  clearSelection() {
    this._selectedIndices.clear();
    this._syncSelection();
  }

  scrollToItem(idx) {
    const container = this.shadowRoot?.querySelector('.tiles');
    if (!container) return;
    const tile = container.children[idx];
    if (tile) tile.scrollIntoView({ behavior: this._scrollAnimEnabled() ? 'smooth' : 'auto', block: 'nearest' });
  }

  getNumItems() {
    return this._items ? this._items.length : 0;
  }

  /** 获取所有 entry 实例（仅 entry-class 模式） */
  getEntryInstances() {
    return [...this._entryInstances];
  }

  /** 获取指定索引的 entry 实例 */
  getEntryAt(idx) {
    return this._entryInstances[idx] || null;
  }

  // --- Getters for UMG parity ---
  get EntryWidgetClass() { return this.getAttribute('entry-class') || ''; }
  get Width()       { return this.getAttribute('width') || ''; }
  get Height()      { return this.getAttribute('height') || ''; }
  get EntryWidth()  { return this.getAttribute('entry-width')  || this.getAttribute('tile-width')  || '100px'; }
  get EntryHeight() { return this.getAttribute('entry-height') || this.getAttribute('tile-height') || 'auto'; }
  get Columns()     { return this.getAttribute('columns') || 'auto-fill'; }
  get Gap()         { return this.getAttribute('gap') || '8 8'; }
  /** Parse gap as vector2 → { row, col } in CSS units */
  get GapVector2() {
    const raw = this.Gap.trim();
    const parts = raw.split(/[\s,]+/);
    if (parts.length >= 2) return { row: this._ensurePx(parts[0]), col: this._ensurePx(parts[1]) };
    const single = this._ensurePx(parts[0]);
    return { row: single, col: single };
  }
  get SelectionMode()      { return this.getAttribute('selection-mode') || 'Single'; }
  get Orientation()        { return this.getAttribute('orientation') || 'Vertical'; }
  get ScrollbarVisibility(){ return this.getAttribute('scrollbar-visibility') || 'Auto'; }
  get TileAlignment()      { return this.getAttribute('tile-alignment') || 'start'; }
  get NumItems()           { return this.getNumItems(); }

  _ensurePx(v) { return /\d$/.test(v) ? v + 'px' : v; }

  // --- Lifecycle ---
  connectedCallback() {
    super.connectedCallback();
    const jsonItems = this.getAttribute('items');
    if (jsonItems && !this._items) {
      try { this._items = JSON.parse(jsonItems); this._renderTiles(); } catch(e) {}
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    super.attributeChangedCallback?.(name, oldVal, newVal);
    if (['width','height','entry-width','entry-height','tile-width','tile-height','columns','gap','orientation','tile-alignment','scrollbar-visibility'].includes(name)) {
      if (this.shadowRoot?.querySelector('.tiles')) this.render();
    }
    if (name === 'selection-mode') this._selectedIndices.clear();
    if (name === 'entry-class' && this._items) this._renderTiles();
  }

  _scrollAnimEnabled() {
    const v = this.getAttribute('enable-scroll-animation');
    return v !== 'false' && v !== '0';
  }

  render() {
    const tileW = this.EntryWidth;
    const cols  = this.Columns;
    const gapV  = this.GapVector2;
    const gapCSS = `${gapV.row} ${gapV.col}`;
    const orient = this.Orientation;
    const align  = this.TileAlignment;
    const sbVis  = this.ScrollbarVisibility;
    const hostW  = this.Width;
    const hostH  = this.Height;

    const isHoriz = orient === 'Horizontal';
    const gridDir = isHoriz
      ? `grid-auto-flow: column; grid-template-rows: repeat(${cols}, ${tileW});`
      : `grid-template-columns: repeat(${cols}, ${tileW});`;
    const justifyItems = align === 'center' ? 'center' : align === 'end' ? 'end' : 'start';
    const overflowDir  = isHoriz ? 'overflow-x' : 'overflow-y';
    const scrollVis    = sbVis === 'AlwaysOff' ? 'display:none;' : '';
    const hostWCSS     = hostW ? `width: ${this._ensurePx(hostW)};` : '';
    const hostHCSS     = hostH ? `height: ${this._ensurePx(hostH)};` : '';

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; ${overflowDir}: auto; min-height: 60px; ${hostWCSS} ${hostHCSS} }
        :host::-webkit-scrollbar { width: 5px; height: 5px; ${scrollVis} }
        :host::-webkit-scrollbar-track { background: #0a0e1a; }
        :host::-webkit-scrollbar-thumb { background: #2a3258; border-radius: 3px; }
        .tiles { display: grid; ${gridDir} gap: ${gapCSS}; justify-items: ${justifyItems}; }
        /* Fallback tile styles (non-entry-class mode) */
        .tile { cursor: pointer; background: #111528; border: 1px solid #1e2440; border-radius: 6px;
                padding: 10px; text-align: center; transition: all 0.12s; }
        .tile:hover { border-color: #4060a0; box-shadow: 0 0 8px rgba(60,100,200,0.15); }
        .tile.selected { border-color: #5080d0; background: #1a2248; }
        .tile .icon { font-size: 28px; margin-bottom: 6px; }
        .tile .label { color: #c0c8e0; font-size: 12px; }
        .tile .sub { color: #4a5478; font-size: 11px; margin-top: 2px; }
        .empty { padding: 16px; color: #3a4060; font-size: 13px; text-align: center; grid-column: 1 / -1; }
      </style>
      <div class="tiles"></div>`;
    if (this._items) this._renderTiles();
  }

  _renderTiles() {
    const container = this.shadowRoot.querySelector('.tiles');
    if (!container) return;
    this._entryInstances = [];

    if (!this._items || this._items.length === 0) {
      container.innerHTML = '<div class="empty">( 无数据 )</div>';
      return;
    }

    const entryTag = this.getAttribute('entry-class');
    const tileH = this.EntryHeight;

    if (entryTag && customElements.get(entryTag)) {
      // Entry-class mode: create custom element instances
      container.innerHTML = '';
      this._items.forEach((item, i) => {
        const entry = document.createElement(entryTag);
        entry.style.height = tileH;
        entry.dataset.index = i;
        if (this._selectedIndices.has(i)) entry.setSelected?.(true);
        container.appendChild(entry);
        this._entryInstances.push(entry);
        // Wait for element to connect, then pass data
        if (entry.setListItem) {
          entry.setListItem(item, i);
        } else {
          // Entry may not be upgraded yet; defer
          customElements.whenDefined(entryTag).then(() => {
            entry.setListItem?.(item, i);
          });
        }
      });
      this._attachEntryEvents(container);
    } else {
      // Fallback: inline HTML tiles (backward compatible)
      container.innerHTML = this._items.map((item, i) => {
        const content = this._template
          ? this._template(item, i)
          : (typeof item === 'object'
            ? `${item.icon ? `<div class="icon">${item.icon}</div>` : ''}
               <div class="label">${item.label || item.title || item.name || ''}</div>
               ${item.subtitle ? `<div class="sub">${item.subtitle}</div>` : ''}`
            : `<div class="label">${item}</div>`);
        const selClass = this._selectedIndices.has(i) ? ' selected' : '';
        return `<div class="tile${selClass}" style="height:${tileH}" data-index="${i}">${content}</div>`;
      }).join('');
      this._attachTileEvents(container);
    }
  }

  _attachEntryEvents(container) {
    const selMode = this.SelectionMode;
    this._entryInstances.forEach((entry, idx) => {
      entry.addEventListener('click', () => {
        if (selMode === 'None') return;
        if (selMode === 'Single') {
          this._selectedIndices.clear();
          this._selectedIndices.add(idx);
        } else {
          if (this._selectedIndices.has(idx)) this._selectedIndices.delete(idx);
          else this._selectedIndices.add(idx);
        }
        this._syncSelection();
        this.dispatchEvent(new CustomEvent('OnItemClicked', { detail: { index: idx, item: this._items[idx] }, bubbles: true }));
      });
      entry.addEventListener('dblclick', () => {
        this.dispatchEvent(new CustomEvent('OnItemDoubleClicked', { detail: { index: idx, item: this._items[idx] }, bubbles: true }));
      });
    });
  }

  _attachTileEvents(container) {
    const selMode = this.SelectionMode;
    container.querySelectorAll('.tile').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index);
        if (selMode === 'None') return;
        if (selMode === 'Single') {
          this._selectedIndices.clear();
          this._selectedIndices.add(idx);
        } else {
          if (this._selectedIndices.has(idx)) this._selectedIndices.delete(idx);
          else this._selectedIndices.add(idx);
        }
        this._syncSelection();
        this.dispatchEvent(new CustomEvent('OnItemClicked', { detail: { index: idx, item: this._items[idx] }, bubbles: true }));
      });
      el.addEventListener('dblclick', () => {
        const idx = parseInt(el.dataset.index);
        this.dispatchEvent(new CustomEvent('OnItemDoubleClicked', { detail: { index: idx, item: this._items[idx] }, bubbles: true }));
      });
    });
  }

  _syncSelection() {
    const container = this.shadowRoot?.querySelector('.tiles');
    if (!container) return;

    if (this._entryInstances.length > 0) {
      // Entry-class mode
      this._entryInstances.forEach((entry, idx) => {
        entry.setSelected?.(this._selectedIndices.has(idx));
      });
    } else {
      // Fallback mode
      container.querySelectorAll('.tile').forEach(el => {
        const idx = parseInt(el.dataset.index);
        el.classList.toggle('selected', this._selectedIndices.has(idx));
      });
    }
    this.dispatchEvent(new CustomEvent('OnSelectionChanged', { detail: { indices: this.getSelectedIndices(), items: this.getSelectedItems() }, bubbles: true }));
  }
}

UWidget.register('umg-tile-view', UTileView);
