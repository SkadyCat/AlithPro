import { UWidget } from './UWidget.js';

export class UScaleBox extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'stretch'];
  }

  render() {
    const stretch = this.getAttribute('stretch') || 'Fit';
    const fitMap = {
      Fit: 'contain', Fill: 'cover', UserSpecified: 'none',
      FillWidth: '100% auto', FillHeight: 'auto 100%'
    };
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; overflow: hidden; }
        ::slotted(*) { object-fit: ${fitMap[stretch] || 'contain'}; width: 100%; height: 100%; }
      </style>
      <slot></slot>`;
  }
}

UWidget.register('umg-scale-box', UScaleBox);
