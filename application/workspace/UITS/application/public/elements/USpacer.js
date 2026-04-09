import { UWidget } from './UWidget.js';

export class USpacer extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'size-x', 'size-y'];
  }

  render() {
    const x = this.getAttribute('size-x') || '0';
    const y = this.getAttribute('size-y') || '0';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; width: ${x}; height: ${y}; flex-shrink: 0; }
      </style>`;
  }
}

UWidget.register('umg-spacer', USpacer);
