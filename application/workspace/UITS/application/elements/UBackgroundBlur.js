import { UWidget } from './UWidget.js';

export class UBackgroundBlur extends UWidget {
  render() {
    const amount = this.getAttribute('blur-strength') || '10px';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; position: relative; }
        .blur { position: absolute; inset: 0; backdrop-filter: blur(${amount}); -webkit-backdrop-filter: blur(${amount}); z-index: 0; }
        .content { position: relative; z-index: 1; }
      </style>
      <div class="blur"></div>
      <div class="content"><slot></slot></div>`;
  }
}

UWidget.register('umg-background-blur', UBackgroundBlur);
