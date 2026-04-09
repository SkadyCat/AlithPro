import { UWidget } from './UWidget.js';

export class UComboBoxString extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'options', 'selected-option'];
  }

  render() {
    const opts = (this.getAttribute('options') || '').split(',').filter(Boolean);
    const sel  = this.getAttribute('selected-option') || '';
    const optHtml = opts.map(o =>
      `<option value="${o}" ${o === sel ? 'selected' : ''}>${o}</option>`).join('');

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; }
        select { background: #0e1224; border: 1px solid #2a3258; border-radius: 4px;
                 color: #e0e8fc; font-size: 13px; padding: 6px 10px; outline: none;
                 font-family: inherit; min-width: 120px; }
        select:focus { border-color: #4060a0; }
      </style>
      <select>${optHtml}</select>`;

    this.shadowRoot.querySelector('select').addEventListener('change', e =>
      this.dispatchEvent(new CustomEvent('OnSelectionChanged', { detail: { value: e.target.value }, bubbles: true })));
  }
}

UWidget.register('umg-combo-box-string', UComboBoxString);
