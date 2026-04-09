import { UWidget } from './UWidget.js';

export class USpinBox extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'value', 'min-value', 'max-value', 'step'];
  }

  render() {
    const val  = parseFloat(this.getAttribute('value') || '0');
    const min  = this.getAttribute('min-value') || '';
    const max  = this.getAttribute('max-value') || '';
    const step = this.getAttribute('step') || '1';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-flex; align-items: center; }
        .wrap { display: flex; border: 1px solid #2a3258; border-radius: 4px; overflow: hidden; }
        button { background: #161a2c; border: none; color: #8090c0; width: 28px; height: 28px;
                 cursor: pointer; font-size: 16px; }
        button:hover { background: #1e2444; color: #c0d0f0; }
        input { background: #0e1224; border: none; color: #e0e8fc; width: 60px;
                text-align: center; font-size: 13px; outline: none; border-left: 1px solid #2a3258;
                border-right: 1px solid #2a3258; }
      </style>
      <div class="wrap">
        <button class="dec">−</button>
        <input type="number" value="${val}" ${min ? `min="${min}"` : ''} ${max ? `max="${max}"` : ''} step="${step}" />
        <button class="inc">+</button>
      </div>`;

    const inp = this.shadowRoot.querySelector('input');
    this.shadowRoot.querySelector('.dec').addEventListener('click', () => {
      inp.stepDown(); inp.dispatchEvent(new Event('input'));
    });
    this.shadowRoot.querySelector('.inc').addEventListener('click', () => {
      inp.stepUp(); inp.dispatchEvent(new Event('input'));
    });
    inp.addEventListener('input', () =>
      this.dispatchEvent(new CustomEvent('OnValueChanged', { detail: { value: parseFloat(inp.value) }, bubbles: true })));
  }
}

UWidget.register('umg-spin-box', USpinBox);
