import { UWidget } from './UWidget.js';

export class USafeZone extends UWidget {
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; padding: env(safe-area-inset-top) env(safe-area-inset-right)
                env(safe-area-inset-bottom) env(safe-area-inset-left); }
      </style>
      <slot></slot>`;
  }
}

UWidget.register('umg-safe-zone', USafeZone);
