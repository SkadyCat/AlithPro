/**
 * UButton — 可点击按钮，支持 Normal/Hovered/Pressed/Disabled 四态
 * 属性: style-normal, style-hovered, style-pressed, style-disabled, is-focusable, padding
 * 事件: OnClicked, OnPressed, OnReleased, OnHovered, OnUnhovered
 */
import { UWidget } from './UWidget.js';

export class UButton extends UWidget {
  static get observedAttributes() {
    return [...super.observedAttributes, 'style-normal', 'style-hovered', 'style-pressed', 'style-disabled'];
  }

  render() {
    const normal  = this.getAttribute('style-normal')  || 'background:#2a2a3a;color:#e0e0f0;';
    const hovered = this.getAttribute('style-hovered')  || 'background:#3a3a5a;color:#f0f0ff;';
    const pressed = this.getAttribute('style-pressed')  || 'background:#1a1a2a;color:#c0c0d0;';
    const disabled= this.getAttribute('style-disabled') || 'background:#1a1a1a;color:#606060;opacity:0.5;';

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; }
        button {
          border: 1px solid #3a3a5a; border-radius: 4px;
          padding: 6px 16px; cursor: pointer;
          font-family: inherit; font-size: 14px;
          transition: all 0.12s; ${normal}
        }
        button:hover { ${hovered} }
        button:active { ${pressed} }
        button:disabled { ${disabled} cursor: default; }
      </style>
      <button ${this.getAttribute('is-enabled') === 'false' ? 'disabled' : ''}>
        <slot></slot>
      </button>`;

    const btn = this.shadowRoot.querySelector('button');
    btn.addEventListener('click', () => this.dispatchEvent(new CustomEvent('OnClicked', { bubbles: true })));
    btn.addEventListener('mousedown', () => this.dispatchEvent(new CustomEvent('OnPressed', { bubbles: true })));
    btn.addEventListener('mouseup', () => this.dispatchEvent(new CustomEvent('OnReleased', { bubbles: true })));
    btn.addEventListener('mouseenter', () => this.dispatchEvent(new CustomEvent('OnHovered', { bubbles: true })));
    btn.addEventListener('mouseleave', () => this.dispatchEvent(new CustomEvent('OnUnhovered', { bubbles: true })));
  }
}

UWidget.register('umg-button', UButton);
