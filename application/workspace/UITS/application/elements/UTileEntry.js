import { UWidget } from './UWidget.js';

/**
 * UTileEntry — TileView / ListView 的默认条目控件
 *
 * 对应 UE5 的 EntryWidgetClass：TileView 为每个可见数据项
 * 创建一个 Entry 实例，通过 setListItem(item, index) 传入数据。
 * 等价于 UE5 中 IUserObjectListEntry::OnListItemObjectSet。
 *
 * 用法:
 *   <umg-tile-view entry-class="umg-tile-entry" ...>
 *
 * 自定义子类:
 *   class MySlotEntry extends UTileEntry {
 *     onListItemObjectSet(item, index) { ... 自定义渲染 ... }
 *   }
 *   UWidget.register('my-slot-entry', MySlotEntry);
 *   <umg-tile-view entry-class="my-slot-entry">
 */
export class UTileEntry extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'selected'];
  }

  constructor() {
    super();
    this._item = null;
    this._index = -1;
  }

  /**
   * 由 TileView/ListView 调用，传入数据项和索引。
   * 等价于 UE5 IUserObjectListEntry::OnListItemObjectSet
   */
  setListItem(item, index) {
    this._item = item;
    this._index = index;
    this.onListItemObjectSet(item, index);
  }

  /** 获取绑定的数据项 */
  getListItem() { return this._item; }

  /** 获取绑定的索引 */
  getListIndex() { return this._index; }

  /**
   * 子类重写此方法来自定义渲染。
   * 默认实现根据 item 类型渲染 icon + label + subtitle + qty。
   * 空槽位（item._empty === true）渲染为半透明占位。
   */
  onListItemObjectSet(item, index) {
    const root = this.shadowRoot.querySelector('.entry-content');
    if (!root) return;

    if (!item || item._empty) {
      root.innerHTML = '';
      this.shadowRoot.host.classList.add('empty-slot');
      return;
    }
    this.shadowRoot.host.classList.remove('empty-slot');

    if (typeof item === 'object') {
      let html = '';
      if (item.icon) html += `<div class="entry-icon">${item.icon}</div>`;
      const label = item.label || item.title || item.name || '';
      if (label) html += `<div class="entry-label">${label}</div>`;
      if (item.subtitle) html += `<div class="entry-sub">${item.subtitle}</div>`;
      if (item.qty !== undefined && item.qty !== null) {
        html += `<div class="entry-qty">${item.qty}</div>`;
      }
      root.innerHTML = html;

      // Tooltip
      const tipParts = [item.title, item.subtitle, item.stats, item.detail].filter(Boolean);
      if (tipParts.length) this.setAttribute('title', tipParts.join('\n'));
    } else {
      root.innerHTML = `<div class="entry-label">${item ?? ''}</div>`;
    }
  }

  /** 由 TileView 调用设置选中状态 */
  setSelected(selected) {
    if (selected) this.setAttribute('selected', '');
    else this.removeAttribute('selected');
  }

  get isSelected() { return this.hasAttribute('selected'); }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          cursor: pointer; position: relative;
          background: #111528; border: 1px solid #1e2440;
          border-radius: 6px; padding: 10px;
          text-align: center; transition: all 0.12s;
          overflow: hidden; box-sizing: border-box;
          aspect-ratio: 1 / 1;
        }
        :host(:hover) {
          border-color: #4060a0;
          box-shadow: 0 0 8px rgba(60,100,200,0.15);
        }
        :host([selected]) {
          border-color: #5080d0; background: #1a2248;
        }
        :host(.empty-slot) {
          opacity: 0.35; cursor: default;
          background: rgba(17,21,40,0.4);
          border-style: dashed;
        }
        :host(.empty-slot:hover) {
          border-color: #1e2440; box-shadow: none;
        }
        .entry-content {
          display: flex; flex-direction: column;
          align-items: center; gap: 4px; width: 100%;
        }
        .entry-icon { font-size: 32px; margin-bottom: 2px; }
        .entry-label { color: #c0c8e0; font-size: 12px; line-height: 1.3; }
        .entry-sub { color: #4a5478; font-size: 11px; }
        .entry-qty {
          position: absolute; bottom: 4px; right: 6px;
          font-size: 11px; color: #6878a0;
        }
      </style>
      <div class="entry-content"></div>`;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    super.attributeChangedCallback?.(name, oldVal, newVal);
  }
}

UWidget.register('umg-tile-entry', UTileEntry);
