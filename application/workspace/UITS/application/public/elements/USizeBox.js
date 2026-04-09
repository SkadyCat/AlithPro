import { UWidget } from './UWidget.js';

export class USizeBox extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'width-override', 'height-override',
            'min-desired-width', 'max-desired-width', 'min-desired-height', 'max-desired-height'];
  }

  render() {
    const w    = this.getAttribute('width-override') || '';
    const h    = this.getAttribute('height-override') || '';
    const minW = this.getAttribute('min-desired-width') || '';
    const maxW = this.getAttribute('max-desired-width') || '';
    const minH = this.getAttribute('min-desired-height') || '';
    const maxH = this.getAttribute('max-desired-height') || '';

    const style = [
      w    ? `width: ${w};`          : '',
      h    ? `height: ${h};`         : '',
      minW ? `min-width: ${minW};`   : '',
      maxW ? `max-width: ${maxW};`   : '',
      minH ? `min-height: ${minH};`  : '',
      maxH ? `max-height: ${maxH};`  : '',
    ].join(' ');

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; ${style} overflow: hidden; }
      </style>
      <slot></slot>`;
  }
}

UWidget.register('umg-size-box', USizeBox);
