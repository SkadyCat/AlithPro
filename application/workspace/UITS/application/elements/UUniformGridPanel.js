import { UWidget } from './UWidget.js';

export class UUniformGridPanel extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'columns', 'slot-padding'];
  }

  render() {
    const cols = this.getAttribute('columns') || '3';
    const gap  = this.getAttribute('slot-padding') || '0px';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: ${gap}; }
      </style>
      <slot></slot>`;
  }
}

UWidget.register('umg-uniform-grid-panel', UUniformGridPanel);
