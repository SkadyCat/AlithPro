import { UWidget } from './UWidget.js';

export class UWrapBox extends UWidget {
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: flex; flex-wrap: wrap; align-items: flex-start; }
      </style>
      <slot></slot>`;
  }
}

UWidget.register('umg-wrap-box', UWrapBox);
