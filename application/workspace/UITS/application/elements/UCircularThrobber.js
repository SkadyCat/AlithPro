import { UWidget } from './UWidget.js';

export class UCircularThrobber extends UWidget {
  render() {
    const size = this.getAttribute('desired-width') || '24px';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; }
        .spinner { width: ${size}; height: ${size}; border: 3px solid #1a2040;
                   border-top-color: #6080c0; border-radius: 50%;
                   animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
      <div class="spinner"></div>`;
  }
}

UWidget.register('umg-circular-throbber', UCircularThrobber);
