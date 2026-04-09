import { UWidget } from './UWidget.js';

export class UImage extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'brush', 'tint', 'draw-as', 'tiling', 'mirroring',
            'desired-width', 'desired-height'];
  }

  render() {
    const src    = this.getAttribute('brush') || '';
    const tint   = this.getAttribute('tint') || 'none';
    const drawAs = this.getAttribute('draw-as') || 'Image';
    const tiling = this.getAttribute('tiling') || 'NoTile';
    const mirror = this.getAttribute('mirroring') || 'No';
    const w      = this.getAttribute('desired-width') || 'auto';
    const h      = this.getAttribute('desired-height') || 'auto';

    const repeatMap = { NoTile: 'no-repeat', Horizontal: 'repeat-x', Vertical: 'repeat-y', Both: 'repeat' };
    const scaleX = (mirror === 'Horizontal' || mirror === 'Both') ? -1 : 1;
    const scaleY = (mirror === 'Vertical' || mirror === 'Both') ? -1 : 1;
    const filter = tint !== 'none' ? `filter: drop-shadow(0 0 0 ${tint});` : '';

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; width: ${w}; height: ${h}; }
        img {
          width: 100%; height: 100%; object-fit: contain;
          transform: scale(${scaleX}, ${scaleY});
          ${filter}
        }
        .bg-mode {
          width: 100%; height: 100%;
          background-image: url('${src}');
          background-repeat: ${repeatMap[tiling] || 'no-repeat'};
          background-size: ${drawAs === 'Box' ? '100% 100%' : 'contain'};
          transform: scale(${scaleX}, ${scaleY});
        }
      </style>
      ${src && drawAs === 'Image'
        ? `<img src="${src}" alt="" />`
        : `<div class="bg-mode"></div>`}`;
  }
}

UWidget.register('umg-image', UImage);
