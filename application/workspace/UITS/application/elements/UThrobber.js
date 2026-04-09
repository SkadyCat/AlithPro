import { UWidget } from './UWidget.js';

export class UThrobber extends UWidget {
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-flex; gap: 4px; align-items: center; }
        .dot { width: 8px; height: 8px; background: #6080c0; border-radius: 50%;
               animation: bounce 1.2s infinite ease-in-out; }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%,80%,100% { transform: scale(0.6); opacity:0.4; } 40% { transform: scale(1); opacity:1; } }
      </style>
      <div class="dot"></div><div class="dot"></div><div class="dot"></div>`;
  }
}

UWidget.register('umg-throbber', UThrobber);
