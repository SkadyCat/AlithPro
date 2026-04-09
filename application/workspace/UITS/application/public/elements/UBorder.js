import { UWidget } from './UWidget.js';

export class UBorder extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'background', 'border-color', 'border-width', 'corner-radius'];
  }

  render() {
    const bg     = this.getAttribute('background') || 'transparent';
    const bColor = this.getAttribute('border-color') || '#2a3258';
    const bWidth = this.getAttribute('border-width') || '1px';
    const radius = this.getAttribute('corner-radius') || '0';
    const pad    = this.getAttribute('padding') || '0';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; background: ${bg}; border: ${bWidth} solid ${bColor};
                border-radius: ${radius}; padding: ${pad}; }
      </style>
      <slot></slot>`;
  }
}

UWidget.register('umg-border', UBorder);
