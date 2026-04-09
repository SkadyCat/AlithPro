import { UWidget } from './UWidget.js';

export class UTreeView extends UWidget {
  /** nodes: Array of { label, children?: [...], expanded?: bool } */
  setNodes(nodes) {
    this._nodes = nodes;
    this._renderTree();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; overflow: auto; font-size: 13px; color: #c0c8e0; }
        .node { padding: 2px 0; }
        .node-row { display: flex; align-items: center; cursor: pointer; padding: 2px 4px; border-radius: 3px; }
        .node-row:hover { background: rgba(40,60,120,0.12); }
        .node-row.highlighted { background: rgba(64,128,224,0.18); outline: 1px solid rgba(64,128,224,0.35); }
        .toggle { width: 16px; text-align: center; color: #4a5478; flex-shrink: 0; user-select: none; }
        .label { margin-left: 4px; }
        .children { margin-left: 16px; }
        .collapsed .children { display: none; }
      </style>
      <div class="tree-root"></div>`;
    if (this._nodes) this._renderTree();
  }

  _renderTree() {
    const root = this.shadowRoot.querySelector('.tree-root');
    if (!root || !this._nodes) return;
    root.innerHTML = this._buildNodes(this._nodes);

    root.querySelectorAll('.toggle').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const nodeEl = el.closest('.node');
        nodeEl.classList.toggle('collapsed');
        el.textContent = nodeEl.classList.contains('collapsed') ? '▸' : '▾';
      });
    });

    root.querySelectorAll('.node-row').forEach(el => {
      el.addEventListener('click', () => {
        const wasSelected = el.classList.contains('highlighted');
        // Clear all highlights first
        root.querySelectorAll('.node-row.highlighted').forEach(h => h.classList.remove('highlighted'));

        if (wasSelected) {
          // Deselect — fire deselect event
          this.dispatchEvent(new CustomEvent('OnItemDeselected', {
            detail: { path: el.dataset.path, label: el.dataset.label }, bubbles: true }));
        } else {
          // Select — highlight and fire click event
          el.classList.add('highlighted');
          this.dispatchEvent(new CustomEvent('OnItemClicked', {
            detail: { path: el.dataset.path, label: el.dataset.label }, bubbles: true }));
        }
      });

      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Select node
        root.querySelectorAll('.node-row.highlighted').forEach(h => h.classList.remove('highlighted'));
        el.classList.add('highlighted');
        this.dispatchEvent(new CustomEvent('OnItemContextMenu', {
          detail: { path: el.dataset.path, label: el.dataset.label, clientX: e.clientX, clientY: e.clientY },
          bubbles: true }));
      });
    });
  }

  _buildNodes(nodes, path = '') {
    return nodes.map((n, i) => {
      const p = path ? `${path}/${n.label}` : n.label;
      const hasKids = n.children && n.children.length > 0;
      const expanded = n.expanded !== false;
      return `<div class="node ${expanded ? '' : 'collapsed'}">
        <div class="node-row" data-path="${p}" data-label="${n.label}">
          <span class="toggle">${hasKids ? (expanded ? '▾' : '▸') : ' '}</span>
          <span class="label">${n.label}</span>
        </div>
        ${hasKids ? `<div class="children">${this._buildNodes(n.children, p)}</div>` : ''}
      </div>`;
    }).join('');
  }

  /** Expand ancestors and highlight the first node whose label matches `text` (case-insensitive partial). */
  highlightNode(text) {
    const root = this.shadowRoot.querySelector('.tree-root');
    if (!root || !text) return;
    // Clear previous highlight
    root.querySelectorAll('.node-row.highlighted').forEach(el => el.classList.remove('highlighted'));

    const search = text.toLowerCase();
    const rows = root.querySelectorAll('.node-row');
    for (const row of rows) {
      const label = (row.dataset.label || '').toLowerCase();
      if (label.includes(search)) {
        // Expand all ancestor .node elements
        let parent = row.parentElement;
        while (parent && parent !== root) {
          if (parent.classList.contains('node') && parent.classList.contains('collapsed')) {
            parent.classList.remove('collapsed');
            const toggle = parent.querySelector(':scope > .node-row > .toggle');
            if (toggle) toggle.textContent = '▾';
          }
          parent = parent.parentElement;
        }
        row.classList.add('highlighted');
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return true;
      }
    }
    return false;
  }

  /** Clear all highlights. */
  clearHighlight() {
    const root = this.shadowRoot.querySelector('.tree-root');
    if (root) root.querySelectorAll('.node-row.highlighted').forEach(el => el.classList.remove('highlighted'));
  }
}

UWidget.register('umg-tree-view', UTreeView);
