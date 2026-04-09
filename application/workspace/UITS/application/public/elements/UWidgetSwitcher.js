import { UWidget } from './UWidget.js';

export class UWidgetSwitcher extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'active-index'];
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; position: relative; }
        ::slotted(*) { display: none !important; }
      </style>
      <slot></slot>`;
    this._updateActive();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    super.attributeChangedCallback(name, oldVal, newVal);
    if (name === 'active-index') this._updateActive();
  }

  _updateActive() {
    const idx = parseInt(this.getAttribute('active-index') || '0');
    const children = Array.from(this.children);
    children.forEach((c, i) => {
      c.style.display = i === idx ? '' : 'none';
    });
  }
}

UWidget.register('umg-widget-switcher', UWidgetSwitcher);
