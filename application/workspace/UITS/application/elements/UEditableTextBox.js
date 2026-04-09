import { UWidget } from './UWidget.js';

export class UEditableTextBox extends UWidget {
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
        input { background: #0e1224; border: 1px solid #2a3258; border-radius: 4px;
                color: #e0e8fc; font-size: ${size}; font-family: inherit;
                width: 100%; padding: 6px 10px; box-sizing: border-box; outline: none; }
        input:focus { border-color: #4060a0; }
        input::placeholder { color: #4a5478; }
      </style>
      <input type="text" value="${text}" placeholder="${hint}" />`;

    const inp = this.shadowRoot.querySelector('input');
    inp.addEventListener('input', () =>
      this.dispatchEvent(new CustomEvent('OnTextChanged', { detail: { text: inp.value }, bubbles: true })));
  }
}

UWidget.register('umg-editable-text-box', UEditableTextBox);
