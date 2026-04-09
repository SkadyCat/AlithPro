import { UWidget } from './UWidget.js';

export class UMultiLineEditableText extends UWidget {
  render() {
    const text = this.getAttribute('text') || '';
    const hint = this.getAttribute('hint-text') || '';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        textarea { background: transparent; border: none; outline: none;
                   color: #e0e8fc; font-size: 14px; font-family: inherit;
                   width: 100%; min-height: 60px; resize: vertical; }
        textarea::placeholder { color: #4a5478; }
      </style>
      <textarea placeholder="${hint}">${text}</textarea>`;
  }
}

UWidget.register('umg-multiline-editable-text', UMultiLineEditableText);
