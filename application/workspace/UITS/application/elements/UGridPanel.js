import { UWidget } from './UWidget.js';

export class UGridPanel extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'columns', 'rows', 'column-widths', 'row-heights'];
  }

  render() {
    const cols = this.getAttribute('columns') || '2';
    const rows = this.getAttribute('rows') || 'auto';
    const colW = this.getAttribute('column-widths') || `repeat(${cols}, 1fr)`;
    const rowH = this.getAttribute('row-heights') || `repeat(${rows === 'auto' ? 1 : rows}, auto)`;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: grid; grid-template-columns: ${colW}; grid-template-rows: ${rowH}; }
      </style>
      <slot></slot>`;
  }
}

UWidget.register('umg-grid-panel', UGridPanel);
