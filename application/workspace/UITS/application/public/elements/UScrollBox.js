import { UWidget } from './UWidget.js';

export class UScrollBox extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'orientation'];
  }

  render() {
    const orient = this.getAttribute('orientation') || 'Vertical';
    const isHoriz = orient === 'Horizontal';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; overflow: ${isHoriz ? 'auto hidden' : 'hidden auto'}; }
        :host::-webkit-scrollbar { width: 6px; height: 6px; }
        :host::-webkit-scrollbar-track { background: #0a0e1a; }
        :host::-webkit-scrollbar-thumb { background: #2a3258; border-radius: 3px; }
      </style>
      <slot></slot>`;
  }
}

UWidget.register('umg-scroll-box', UScrollBox);
