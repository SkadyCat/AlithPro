import { UWidget } from './UWidget.js';

export class UTextBlock extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'text', 'font-family', 'font-size', 'font-weight',
            'color', 'justification', 'auto-wrap', 'shadow-offset', 'shadow-color',
            'outline-size', 'outline-color'];
  }

  render() {
    const text     = this.getAttribute('text') || this.textContent || '';
    const family   = this.getAttribute('font-family') || 'inherit';
    const size     = this.getAttribute('font-size') || '14px';
    const weight   = this.getAttribute('font-weight') || 'normal';
    const color    = this.getAttribute('color') || '#e0e0f0';
    const justify  = this.getAttribute('justification') || 'Left';
    const wrap     = this.getAttribute('auto-wrap') !== 'false';
    const shadowOff= this.getAttribute('shadow-offset') || '0 0';
    const shadowCol= this.getAttribute('shadow-color') || 'transparent';
    const outSize  = this.getAttribute('outline-size') || '0';
    const outColor = this.getAttribute('outline-color') || '#000';

    const alignMap = { Left: 'left', Center: 'center', Right: 'right' };
    const textShadow = shadowCol !== 'transparent' ? `text-shadow: ${shadowOff} 2px ${shadowCol};` : '';
    const stroke = parseFloat(outSize) > 0
      ? `-webkit-text-stroke: ${outSize}px ${outColor}; paint-order: stroke fill;`
      : '';

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; }
        span {
          font-family: ${family}; font-size: ${size}; font-weight: ${weight};
          color: ${color}; text-align: ${alignMap[justify] || 'left'};
          ${wrap ? 'word-wrap: break-word; overflow-wrap: break-word;' : 'white-space: nowrap;'}
          ${textShadow} ${stroke}
          display: block;
        }
      </style>
      <span>${text}</span>`;
  }
}

UWidget.register('umg-text-block', UTextBlock);
