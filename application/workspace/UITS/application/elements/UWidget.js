/**
 * UWidget — UMG 控件库基类
 * 所有 UMG 镜像控件均继承此类，提供通用属性：
 * Visibility, RenderOpacity, IsEnabled, ToolTipText, Padding, HAlign, VAlign
 */
export class UWidget extends HTMLElement {
  static _registered = new Set();

  static register(tag, cls) {
    if (!UWidget._registered.has(tag)) {
      customElements.define(tag, cls);
      UWidget._registered.add(tag);
    }
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._slot = null;
  }

  connectedCallback() {
    this.render();
    this._applyCommonAttributes();
  }

  static get observedAttributes() {
    return ['visibility', 'render-opacity', 'is-enabled', 'tooltip-text', 'padding',
            'h-align', 'v-align', 'min-width', 'min-height', 'max-width', 'max-height'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal) this._applyCommonAttributes();
  }

  _applyCommonAttributes() {
    const host = this.shadowRoot.host;
    // Visibility
    const vis = this.getAttribute('visibility') || 'Visible';
    switch (vis) {
      case 'Hidden':           host.style.visibility = 'hidden'; host.style.pointerEvents = 'auto'; break;
      case 'Collapsed':        host.style.display = 'none'; break;
      case 'HitTestInvisible': host.style.pointerEvents = 'none'; break;
      case 'SelfHitTestInvisible': host.style.pointerEvents = 'none'; break;
      default:                 host.style.visibility = ''; host.style.display = ''; host.style.pointerEvents = ''; break;
    }
    // RenderOpacity
    const opacity = this.getAttribute('render-opacity');
    if (opacity !== null) host.style.opacity = opacity;
    // IsEnabled
    const enabled = this.getAttribute('is-enabled');
    if (enabled === 'false') { host.style.opacity = '0.4'; host.style.pointerEvents = 'none'; }
    // ToolTipText
    const tip = this.getAttribute('tooltip-text');
    if (tip) host.title = tip;
    // Padding
    const pad = this.getAttribute('padding');
    if (pad) host.style.padding = pad;
  }

  /** Override in subclass */
  render() {}

  /** Utility: parse "top right bottom left" or single value */
  static parsePadding(val) {
    if (!val) return '0';
    return val;
  }

  /** Utility: map UMG alignment to CSS */
  static alignToCSS(val) {
    const map = { Left: 'flex-start', Center: 'center', Right: 'flex-end', Fill: 'stretch',
                  Top: 'flex-start', Bottom: 'flex-end' };
    return map[val] || val || 'stretch';
  }
}
