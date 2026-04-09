import { UWidget } from './UWidget.js';

export class UCanvasPanel extends UWidget {
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; position: relative; width: 100%; height: 100%; }
        ::slotted(*) { position: absolute; }
      </style>
      <slot></slot>`;
  }
}

UWidget.register('umg-canvas-panel', UCanvasPanel);
