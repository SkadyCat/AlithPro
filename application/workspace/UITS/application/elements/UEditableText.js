import { UWidget } from './UWidget.js';

export class UEditableText extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'text', 'hint-text', 'font-size'];
  }

  render() {
    const text = this.getAttribute('text') || '';
    const hint = this.getAttribute('hint-text') || '';
    const size = this.getAttribute('font-size') || '14px';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; }
        input { background: transparent; border: none; outline: none;
                color: #e0e8fc; font-size: ${size}; font-family: inherit;
                width: 100%; padding: 2px 0; }
        input::placeholder { color: #4a5478; }
      </style>
      <input type="text" value="${text}" placeholder="${hint}" />`;

    const inp = this.shadowRoot.querySelector('input');
    inp.addEventListener('input', () =>
      this.dispatchEvent(new CustomEvent('OnTextChanged', { detail: { text: inp.value }, bubbles: true })));
    inp.addEventListener('change', () =>
      this.dispatchEvent(new CustomEvent('OnTextCommitted', { detail: { text: inp.value }, bubbles: true })));
  }
}

UWidget.register('umg-editable-text', UEditableText);
