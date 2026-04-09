import { UWidget } from './UWidget.js';

export class UVerticalBox extends UWidget {
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: flex; flex-direction: column; align-items: stretch; }
      </style>
      <slot></slot>`;
  }
}

UWidget.register('umg-vertical-box', UVerticalBox);
