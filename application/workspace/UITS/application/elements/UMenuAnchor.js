import { UWidget } from './UWidget.js';

export class UMenuAnchor extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'placement'];
  }

  render() {
    const placement = this.getAttribute('placement') || 'below';
    const posMap = {
      below: 'top: 100%; left: 0;',
      above: 'bottom: 100%; left: 0;',
      right: 'top: 0; left: 100%;',
      left:  'top: 0; right: 100%;'
    };
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; position: relative; }
        .menu { position: absolute; ${posMap[placement] || posMap.below}
                z-index: 1000; display: none;
                background: #0e1224; border: 1px solid #2a3258; border-radius: 6px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.5); min-width: 120px; }
        :host(.open) .menu { display: block; }
      </style>
      <slot name="anchor"></slot>
      <div class="menu"><slot name="menu"></slot></div>`;

    this.addEventListener('click', e => {
      if (e.target.slot === 'anchor' || !e.target.slot) this.classList.toggle('open');
    });
    document.addEventListener('click', e => {
      if (!this.contains(e.target)) this.classList.remove('open');
    });
  }

  open()  { this.classList.add('open'); }
  close() { this.classList.remove('open'); }
}

UWidget.register('umg-menu-anchor', UMenuAnchor);
