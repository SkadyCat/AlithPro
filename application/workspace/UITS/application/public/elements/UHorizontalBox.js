import { UWidget } from './UWidget.js';

export class UHorizontalBox extends UWidget {
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: flex; flex-direction: row; align-items: stretch; }
      </style>
      <slot></slot>`;
  }
}

UWidget.register('umg-horizontal-box', UHorizontalBox);
