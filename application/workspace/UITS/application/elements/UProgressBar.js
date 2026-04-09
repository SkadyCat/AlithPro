import { UWidget } from './UWidget.js';

export class UProgressBar extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'percent', 'fill-color', 'bg-color', 'fill-type'];
  }

  render() {
    const pct      = parseFloat(this.getAttribute('percent') || '0');
    const fill     = this.getAttribute('fill-color') || '#4080d0';
    const bg       = this.getAttribute('bg-color') || '#1a1a2a';
    const fillType = this.getAttribute('fill-type') || 'LeftToRight';

    const isVert = fillType === 'TopToBottom' || fillType === 'BottomToTop';
    const invert = fillType === 'RightToLeft' || fillType === 'BottomToTop';
    const size = Math.max(0, Math.min(100, pct * 100));

    let barStyle;
    if (isVert) {
      barStyle = invert
        ? `width:100%;height:${size}%;top:0;left:0;`
        : `width:100%;height:${size}%;bottom:0;left:0;`;
    } else {
      barStyle = invert
        ? `height:100%;width:${size}%;top:0;right:0;`
        : `height:100%;width:${size}%;top:0;left:0;`;
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; width: 200px; height: 20px; }
        .track { position: relative; width: 100%; height: 100%; background: ${bg}; border-radius: 3px; overflow: hidden; }
        .fill  { position: absolute; ${barStyle} background: ${fill}; border-radius: 3px; transition: all 0.2s; }
      </style>
      <div class="track"><div class="fill"></div></div>`;
  }
}

UWidget.register('umg-progress-bar', UProgressBar);
