import { UWidget } from './UWidget.js';

export class URichTextBlock extends UWidget {
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; }
        .rich { font-size: 14px; color: #e0e0f0; line-height: 1.6; }
        .rich b, .rich strong { color: #f0d070; }
        .rich a { color: #60a0e0; text-decoration: underline; }
      </style>
      <div class="rich"><slot></slot></div>`;
  }
}

UWidget.register('umg-rich-text-block', URichTextBlock);
