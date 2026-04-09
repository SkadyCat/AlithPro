import { UWidget } from './UWidget.js';

export class UCheckBox extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'is-checked', 'label'];
  }

  render() {
    const checked = this.getAttribute('is-checked') === 'true';
    const label   = this.getAttribute('label') || '';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
        .box { width: 18px; height: 18px; border: 2px solid #4060a0; border-radius: 3px;
               display: flex; align-items: center; justify-content: center;
               background: ${checked ? '#2a3a60' : 'transparent'}; transition: all 0.15s; }
        .box:hover { border-color: #6090e0; }
        .check { color: #80c0ff; font-size: 14px; display: ${checked ? 'block' : 'none'}; }
        .label { color: #c0c8e0; font-size: 14px; }
      </style>
      <div class="box"><span class="check">✓</span></div>
      <span class="label">${label}<slot></slot></span>`;

    this.shadowRoot.querySelector('.box').addEventListener('click', () => {
      const newVal = this.getAttribute('is-checked') !== 'true';
      this.setAttribute('is-checked', String(newVal));
      this.render();
      this.dispatchEvent(new CustomEvent('OnCheckStateChanged', { detail: { checked: newVal }, bubbles: true }));
    });
  }
}

UWidget.register('umg-checkbox', UCheckBox);
