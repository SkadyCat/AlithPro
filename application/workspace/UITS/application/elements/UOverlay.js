import { UWidget } from './UWidget.js';

export class UOverlay extends UWidget {
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: grid; }
        :host > *, ::slotted(*) { grid-area: 1 / 1; }
      </style>
      <slot></slot>`;
  }
}

UWidget.register('umg-overlay', UOverlay);
