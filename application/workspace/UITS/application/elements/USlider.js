import { UWidget } from './UWidget.js';

export class USlider extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'value', 'min-value', 'max-value', 'step'];
  }

  render() {
    const val  = this.getAttribute('value') || '0.5';
    const min  = this.getAttribute('min-value') || '0';
    const max  = this.getAttribute('max-value') || '1';
    const step = this.getAttribute('step') || '0.01';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; width: 200px; }
        input[type=range] { -webkit-appearance: none; width: 100%; height: 6px;
          background: #1a2040; border-radius: 3px; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none;
          width: 16px; height: 16px; background: #4080d0; border-radius: 50%; cursor: pointer; }
      </style>
      <input type="range" value="${val}" min="${min}" max="${max}" step="${step}" />`;

    this.shadowRoot.querySelector('input').addEventListener('input', e =>
      this.dispatchEvent(new CustomEvent('OnValueChanged', { detail: { value: parseFloat(e.target.value) }, bubbles: true })));
  }
}

UWidget.register('umg-slider', USlider);
