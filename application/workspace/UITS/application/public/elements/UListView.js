import { UWidget } from './UWidget.js';

export class UListView extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'item-height', 'orientation', 'items', 'selection-mode'];
  }

  /** items: Array of objects; template: function(item, index) → HTMLString */
  setItems(items, template) {
    this._items = items;
    this._template = template;
    this._renderList();
  }

  getNumItems() {
    return this._items ? this._items.length : 0;
  }

  connectedCallback() {
    super.connectedCallback();
    // Support declarative JSON items attribute
    const jsonItems = this.getAttribute('items');
    if (jsonItems && !this._items) {
      try { this._items = JSON.parse(jsonItems); this._renderList(); } catch(e) {}
    }
  }

  render() {
    const orient = this.getAttribute('orientation') || 'Vertical';
    const dir = orient === 'Horizontal' ? 'row' : 'column';
    const selMode = this.getAttribute('selection-mode') || 'Single';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; overflow: auto; min-height: 60px; }
        :host::-webkit-scrollbar { width: 5px; height: 5px; }
        :host::-webkit-scrollbar-track { background: #0a0e1a; }
        :host::-webkit-scrollbar-thumb { background: #2a3258; border-radius: 3px; }
        .list { display: flex; flex-direction: ${dir}; }
        .list-item { flex-shrink: 0; padding: 8px 12px; cursor: pointer;
                     border-bottom: 1px solid #161a2c; color: #c0c8e0; font-size: 13px;
                     transition: background 0.1s; }
        .list-item:hover { background: rgba(40,60,120,0.15); }
        .list-item.selected { background: rgba(60,100,200,0.2); border-left: 3px solid #4080d0; }
        .list-item .label { font-weight: 500; }
        .list-item .sub { color: #5a6488; font-size: 12px; margin-top: 2px; }
        .empty { padding: 16px; color: #3a4060; font-size: 13px; text-align: center; }
      </style>
      <div class="list"></div>`;
    if (this._items) this._renderList();
  }

  _renderList() {
    const container = this.shadowRoot.querySelector('.list');
    if (!container) return;
    if (!this._items || this._items.length === 0) {
      container.innerHTML = '<div class="empty">( 无数据 )</div>';
      return;
    }
    const itemH = this.getAttribute('item-height') || 'auto';
    container.innerHTML = this._items.map((item, i) => {
      const content = this._template
        ? this._template(item, i)
        : (typeof item === 'object'
          ? `<div class="label">${item.label || item.title || item.name || JSON.stringify(item)}</div>
             ${item.subtitle || item.description ? `<div class="sub">${item.subtitle || item.description}</div>` : ''}`
          : `<div class="label">${item}</div>`);
      return `<div class="list-item" style="height:${itemH}" data-index="${i}">${content}</div>`;
    }).join('');

    const selMode = this.getAttribute('selection-mode') || 'Single';
    container.querySelectorAll('.list-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index);
        if (selMode === 'Single') {
          container.querySelectorAll('.list-item').forEach(e => e.classList.remove('selected'));
          el.classList.add('selected');
        } else {
          el.classList.toggle('selected');
        }
        this.dispatchEvent(new CustomEvent('OnItemClicked', { detail: { index: idx, item: this._items[idx] }, bubbles: true }));
      });
    });
  }
}

UWidget.register('umg-list-view', UListView);
