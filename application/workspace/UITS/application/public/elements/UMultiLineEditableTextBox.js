import { UWidget } from './UWidget.js';

export class UMultiLineEditableTextBox extends UWidget {
  render() {
    const text = this.getAttribute('text') || '';
    const hint = this.getAttribute('hint-text') || '';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        textarea { background: #0e1224; border: 1px solid #2a3258; border-radius: 4px;
                   color: #e0e8fc; font-size: 14px; font-family: inherit;
                   width: 100%; min-height: 80px; padding: 8px 10px;
                   box-sizing: border-box; resize: vertical; outline: none; }
        textarea:focus { border-color: #4060a0; }
        textarea::placeholder { color: #4a5478; }
      </style>
      <textarea placeholder="${hint}">${text}</textarea>`;
  }
}

UWidget.register('umg-multiline-editable-text-box', UMultiLineEditableTextBox);
