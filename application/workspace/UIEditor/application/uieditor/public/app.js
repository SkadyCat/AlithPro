const templateListEl = document.getElementById('templateList');
const refreshButton = document.getElementById('refreshButton');
const templateTitleEl = document.getElementById('templateTitle');
const templateSubtitleEl = document.getElementById('templateSubtitle');
const summaryBadgesEl = document.getElementById('summaryBadges');
const previewViewportEl = document.getElementById('previewViewport');
const previewStageEl = document.getElementById('previewStage');
const widgetDetailsEl = document.getElementById('widgetDetails');

let templateIndex = [];
let selectedTemplate = '';
let selectedWidgetPath = '';
let currentTemplateData = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function colorArrayToCss(color) {
  if (Array.isArray(color) && color.length >= 3) {
    const [r, g, b, a = 1] = color.map((value, index) => (
      index < 3 ? Math.max(0, Math.min(255, Math.round(Number(value) * 255))) : Math.max(0, Math.min(1, Number(value)))
    ));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return typeof color === 'string' ? color : '';
}

function resolveButtonStyleProps(widgetType, extra = {}) {
  if (widgetType !== 'Button') {
    return {};
  }

  const style = extra.style || {};
  const normal = style.normal || {};
  const normalImage = normal.resource || normal.resource_name || '';
  const bgTint = colorArrayToCss(normal.tint);

  return {
    ...(normalImage ? { bgImage: normalImage, normalImage } : {}),
    ...(style.hovered?.resource || style.hovered?.resource_name ? { hoveredImage: style.hovered.resource || style.hovered.resource_name } : {}),
    ...(style.pressed?.resource || style.pressed?.resource_name ? { pressedImage: style.pressed.resource || style.pressed.resource_name } : {}),
    ...(style.disabled?.resource || style.disabled?.resource_name ? { disabledImage: style.disabled.resource || style.disabled.resource_name } : {}),
    ...(bgTint ? { bgColor: bgTint, bgTint } : {}),
    ...(normal.draw_as ? { buttonDrawAs: normal.draw_as } : {}),
  };
}

function fallbackRootsFromFlat(flatWidgets) {
  if (!Array.isArray(flatWidgets) || flatWidgets.length === 0) {
    return [];
  }

  const byName = new Map();
  flatWidgets.forEach((item) => {
    byName.set(item.name, { ...item, children: [] });
  });

  const roots = [];
  byName.forEach((item) => {
    const parentName = item.parentName || '';
    const parent = byName.get(parentName);
    if (parent) {
      parent.children.push(item);
    } else {
      roots.push(item);
    }
  });
  return roots;
}

function flattenMetaTree(roots) {
  const nodes = [];
  const visit = (node, parentName = '', depth = 0) => {
    nodes.push({
      ...node,
      parentName: node.parentName || parentName,
      depth: typeof node.depth === 'number' ? node.depth : depth,
    });
    (node.children || []).forEach((child) => visit(child, node.name, depth + 1));
  };
  roots.forEach((root) => visit(root, '', typeof root.depth === 'number' ? root.depth : 0));
  return nodes;
}

function buildMetaLookup(meta) {
  const roots = Array.isArray(meta?.roots) && meta.roots.length > 0
    ? meta.roots
    : fallbackRootsFromFlat(meta?.flatWidgets || []);
  return new Map(flattenMetaTree(roots).map((node) => [node.name, node]));
}

function getMetaRoots(meta) {
  return Array.isArray(meta?.roots) && meta.roots.length > 0
    ? meta.roots
    : fallbackRootsFromFlat(meta?.flatWidgets || []);
}

function defaultWidgetSize(widgetType) {
  switch (widgetType) {
    case 'Button':
      return { w: 220, h: 64 };
    case 'TextBlock':
      return { w: 220, h: 64 };
    case 'Overlay':
      return { w: 260, h: 84 };
    default:
      return { w: 220, h: 64 };
  }
}

function buildMetaPreviewBoxes(meta) {
  const roots = getMetaRoots(meta);
  const overlayGap = 24;
  const stackedGap = 18;

  function decorateWidgetProps(node) {
    const extra = node.unrealExtra || {};
    const editable = node.templateEditableValues || {};
    const widgetType = node.className || node.templateDefinition?.type || 'Widget';
    return {
      ...(extra.text != null ? { text: extra.text } : {}),
      ...(extra.font_size != null ? { fontSize: extra.font_size } : {}),
      ...(extra.font_family != null ? { fontFamily: extra.font_family } : {}),
      ...resolveButtonStyleProps(widgetType, extra),
      ...editable,
    };
  }

  function normalizeNode(node, layout = {}) {
    const widgetType = node.className || node.templateDefinition?.type || 'Widget';
    const baseSize = defaultWidgetSize(widgetType);
    return {
      id: node.name || `${widgetType}-${Math.random().toString(16).slice(2, 8)}`,
      label: node.name || widgetType,
      widgetType,
      x: layout.x || 0,
      y: layout.y || 0,
      w: layout.w || baseSize.w,
      h: layout.h || baseSize.h,
      borderColor: widgetType === 'Overlay' ? 'rgba(255,255,255,0.18)' : (node.templateDefinition?.color || '#51627f'),
      bgColor: widgetType === 'Overlay' ? 'rgba(255,255,255,0.03)' : (node.templateDefinition?.bg || 'rgba(31,39,55,0.9)'),
      borderWidth: widgetType === 'Overlay' ? 1 : 1,
      borderRadius: widgetType === 'Button' ? 10 : 8,
      boxShadow: widgetType === 'Button' ? '0 6px 18px rgba(0,0,0,0.25)' : '',
      opacity: 1,
      widgetProps: decorateWidgetProps(node),
      children: [],
    };
  }

  function buildNode(node, depth = 0) {
    const widgetType = node.className || node.templateDefinition?.type || 'Widget';
    const children = node.children || [];

    if (children.length === 0) {
      return normalizeNode(node);
    }

    if (widgetType === 'Overlay') {
      const childBoxes = children.map((child) => buildNode(child, depth + 1));
      const overlayWidth = Math.max(
        defaultWidgetSize(widgetType).w,
        ...childBoxes.map((child) => child.w)
      );
      const overlayHeight = Math.max(
        defaultWidgetSize(widgetType).h,
        ...childBoxes.map((child) => child.h)
      );
      const parent = normalizeNode(node, { w: overlayWidth, h: overlayHeight });
      parent.children = childBoxes.map((child) => ({
        ...child,
        x: 0,
        y: 0,
        w: overlayWidth,
        h: overlayHeight,
      }));
      return parent;
    }

    const childBoxes = [];
    let cursorY = 0;
    let maxWidth = defaultWidgetSize(widgetType).w;
    children.forEach((child) => {
      const childBox = buildNode(child, depth + 1);
      childBox.x = 0;
      childBox.y = cursorY;
      cursorY += childBox.h + stackedGap;
      maxWidth = Math.max(maxWidth, childBox.w);
      childBoxes.push(childBox);
    });
    const totalHeight = Math.max(defaultWidgetSize(widgetType).h, cursorY - stackedGap);
    const parent = normalizeNode(node, { w: maxWidth, h: totalHeight });
    parent.children = childBoxes;
    return parent;
  }

  const builtRoots = roots.map((root) => buildNode(root));
  let cursorX = 80;
  return builtRoots.map((root) => {
    const positioned = { ...root, x: cursorX, y: 60 };
    cursorX += root.w + overlayGap;
    return positioned;
  });
}

function widgetPath(parentPath, box) {
  return parentPath ? `${parentPath}/${box.id}` : String(box.id);
}

function flattenSessionBoxes(boxes) {
  const flat = [];
  const visit = (box, parentPath = '', absX = 0, absY = 0) => {
    const x = Number(box.x) || 0;
    const y = Number(box.y) || 0;
    const w = Number(box.w) || 0;
    const h = Number(box.h) || 0;
    const path = widgetPath(parentPath, box);
    const current = {
      ...box,
      x,
      y,
      w,
      h,
      _path: path,
      _absX: absX + x,
      _absY: absY + y,
    };
    flat.push(current);
    (box.children || []).forEach((child) => visit(child, path, current._absX, current._absY));
  };
  (boxes || []).forEach((box) => visit(box, '', 0, 0));
  return flat;
}

function normalizeSessionAnchor(anchor = {}) {
  return {
    minX: Number(anchor.minX) || 0,
    minY: Number(anchor.minY) || 0,
    maxX: anchor.maxX == null ? (Number(anchor.minX) || 0) : (Number(anchor.maxX) || 0),
    maxY: anchor.maxY == null ? (Number(anchor.minY) || 0) : (Number(anchor.maxY) || 0),
  };
}

function canonicalWidgetToPreviewBox(widget) {
  const frame = widget.frame || widget.layout?.frame || {};
  const style = widget.style || {};
  const props = widget.props || widget.widgetProps || {};
  const flags = widget.flags || {};
  const box = {
    id: widget.id,
    label: widget.name || widget.label || `${widget.type || widget.widgetType || 'Widget'}_${widget.id}`,
    x: Number(frame.x) || 0,
    y: Number(frame.y) || 0,
    w: Number(frame.w) || 0,
    h: Number(frame.h) || 0,
    borderColor: style.borderColor || 'transparent',
    bgColor: style.bgColor || 'transparent',
    borderWidth: Number(style.borderWidth) || 0,
    opacity: style.opacity == null ? 1 : Number(style.opacity),
    widgetType: widget.type || widget.widgetType || 'Widget',
    widgetProps: { ...props },
    anchor: normalizeSessionAnchor(widget.anchor || widget.layout?.anchor || {}),
    isEntryClass: !!(flags.isEntryClass ?? widget.isEntryClass),
  };
  if (style.borderRadius != null) box.borderRadius = Number(style.borderRadius) || 0;
  if (style.boxShadow) box.boxShadow = style.boxShadow;
  if (style.bgImage) box.bgImage = style.bgImage;
  if (style.bgSize) box.bgSize = style.bgSize;
  if (widget.children?.length) {
    box.children = widget.children.map((child) => canonicalWidgetToPreviewBox(child));
  }
  return box;
}

function getSessionPreviewRoots(session) {
  if (Array.isArray(session?.widgets) && session.widgets.length > 0) {
    return session.widgets.map((widget) => canonicalWidgetToPreviewBox(widget));
  }
  return Array.isArray(session?.boxes) ? session.boxes : [];
}

function normalizeWidgetProps(box, metaLookup) {
  const metaNode = metaLookup.get(box.label) || {};
  const extra = metaNode.unrealExtra || {};
  const editable = metaNode.templateEditableValues || {};
  const widgetType = box.widgetType || metaNode.className || metaNode.templateDefinition?.type || 'Widget';
  return {
    ...(extra.text != null ? { text: extra.text } : {}),
    ...(extra.font_size != null ? { fontSize: extra.font_size } : {}),
    ...(extra.font_family != null ? { fontFamily: extra.font_family } : {}),
    ...resolveButtonStyleProps(widgetType, extra),
    ...editable,
    ...(box.widgetProps || {}),
  };
}

function renderSummary(payload) {
  const meta = payload.meta || {};
  const sessionRoots = getSessionPreviewRoots(payload.session);
  const previewRoots = sessionRoots.length > 0 ? sessionRoots : buildMetaPreviewBoxes(meta);
  const sessionFlat = flattenSessionBoxes(previewRoots);
  const rootNames = meta.summary?.rootNames?.length
    ? meta.summary.rootNames
    : previewRoots.map((box) => box.label || box.widgetType || `Widget ${box.id}`);
  const badges = [
    ['Blueprint', meta.sourceBlueprint || payload.session?.sourceBlueprint || payload.name || 'unknown'],
    ['Widgets', String(meta.summary?.widgetCount || sessionFlat.length || 0)],
    ['Roots', rootNames.join(', ') || 'n/a'],
    ['Preview', sessionRoots.length > 0 ? 'session' : 'meta fallback'],
    ['Protocol', payload.session?.protocol?.version || payload.session?.version || 'legacy'],
  ];

  if (meta.summary?.warning) {
    badges.push(['Warning', meta.summary.warning]);
  }

  summaryBadgesEl.innerHTML = badges
    .map(([label, value]) => `<span class="badge">${escapeHtml(label)}: ${escapeHtml(value)}</span>`)
    .join('');
}

function renderWidgetDetails(widget) {
  if (!widget) {
    widgetDetailsEl.classList.add('muted');
    widgetDetailsEl.textContent = 'Select a widget to inspect its exported data.';
    return;
  }

  widgetDetailsEl.classList.remove('muted');
  widgetDetailsEl.textContent = JSON.stringify(widget, null, 2);
}

function previewBoxStyles(box, widgetProps = {}) {
  const bgImage = widgetProps.bgImage || box.bgImage;
  const bgSize = widgetProps.bgSize || box.bgSize || 'cover';
  const bgColor = widgetProps.bgColor || box.bgColor || 'transparent';
  const background = bgImage
    ? `url('${bgImage}') no-repeat center/${bgSize}, ${bgColor}`
    : bgColor;
  return {
    left: `${box.x}px`,
    top: `${box.y}px`,
    width: `${box.w}px`,
    height: `${box.h}px`,
    border: `${box.borderWidth || 0}px solid ${box.borderColor || 'transparent'}`,
    background,
    opacity: box.opacity == null ? '1' : String(box.opacity),
    borderRadius: `${box.borderRadius || 0}px`,
    boxShadow: box.boxShadow || '',
  };
}

function applyStyles(el, styles) {
  Object.entries(styles).forEach(([key, value]) => {
    el.style[key] = value;
  });
}

function renderWidgetLabel(box, widgetProps) {
  if (box.widgetType === 'TextBlock') {
    const label = document.createElement('div');
    label.className = 'preview-label';
    label.style.color = widgetProps.textColor || '#ffffff';
    label.style.fontSize = `${Math.max(10, Number(widgetProps.fontSize) || 14)}px`;
    label.style.fontWeight = widgetProps.bold ? '700' : '400';
    label.style.fontStyle = widgetProps.italic ? 'italic' : 'normal';
    label.style.justifyContent = widgetProps.textAlign === 'left'
      ? 'flex-start'
      : widgetProps.textAlign === 'right'
        ? 'flex-end'
        : 'center';
    label.textContent = widgetProps.text || '';
    return label;
  }

  if (box.widgetType === 'Button') {
    const label = document.createElement('div');
    label.className = 'preview-label';
    label.style.color = widgetProps.textColor || '#ffffff';
    label.style.fontSize = `${Math.max(10, Number(widgetProps.fontSize) || 14)}px`;
    label.style.fontWeight = widgetProps.bold ? '700' : '500';
    label.style.justifyContent = widgetProps.textAlign === 'left'
      ? 'flex-start'
      : widgetProps.textAlign === 'right'
        ? 'flex-end'
        : 'center';
    label.textContent = widgetProps.text || '';
    return label;
  }

  return null;
}

function buildPreviewTree(box, metaLookup, parentPath = '') {
  const path = widgetPath(parentPath, box);
  const widgetProps = normalizeWidgetProps(box, metaLookup);
  const element = document.createElement('div');
  element.className = `preview-widget ${String(box.widgetType || 'Widget').toLowerCase()}`;
  if (selectedWidgetPath === path) {
    element.classList.add('selected');
  }
  applyStyles(element, previewBoxStyles(box, widgetProps));
  element.title = `${box.label || box.widgetType || 'Widget'} (${box.widgetType || 'Widget'})`;
  element.addEventListener('click', (event) => {
    event.stopPropagation();
    selectedWidgetPath = path;
    renderPreview(currentTemplateData);
  });

  const content = document.createElement('div');
  content.className = 'preview-widget-content';
  const label = renderWidgetLabel(box, widgetProps);
  if (label) {
    content.appendChild(label);
  }
  element.appendChild(content);

  (box.children || []).forEach((child) => {
    element.appendChild(buildPreviewTree(child, metaLookup, path));
  });

  return element;
}

function renderPreview(payload) {
  const sessionRoots = getSessionPreviewRoots(payload.session);
  const previewRoots = sessionRoots.length > 0 ? sessionRoots : buildMetaPreviewBoxes(payload.meta);
  const flatWidgets = flattenSessionBoxes(previewRoots);
  const widgetMap = new Map(flatWidgets.map((widget) => [widget._path, widget]));
  const metaLookup = buildMetaLookup(payload.meta);

  previewStageEl.innerHTML = '';

  if (previewRoots.length === 0) {
    previewStageEl.innerHTML = '<div class="empty-state">No previewable widget data found for this template.</div>';
    renderWidgetDetails(null);
    return;
  }

  if (!selectedWidgetPath || !widgetMap.has(selectedWidgetPath)) {
    selectedWidgetPath = flatWidgets[0]?._path || '';
  }

  const maxWidth = Math.max(960, ...flatWidgets.map((widget) => widget._absX + widget.w + 80));
  const maxHeight = Math.max(720, ...flatWidgets.map((widget) => widget._absY + widget.h + 80));
  previewViewportEl.style.minHeight = `${maxHeight}px`;
  previewStageEl.style.width = `${maxWidth}px`;
  previewStageEl.style.height = `${maxHeight}px`;

  previewRoots.forEach((box) => {
    previewStageEl.appendChild(buildPreviewTree(box, metaLookup, ''));
  });

  renderWidgetDetails(widgetMap.get(selectedWidgetPath) || null);
}

async function loadTemplate(name) {
  const response = await fetch(`/api/templates/${encodeURIComponent(name)}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${name}: ${response.status}`);
  }
  currentTemplateData = await response.json();
  selectedTemplate = name;
  selectedWidgetPath = '';
  templateTitleEl.textContent = currentTemplateData.meta?.sourceBlueprint
    || currentTemplateData.session?.sourceBlueprint
    || name;
  const fileParts = [currentTemplateData.files?.session, currentTemplateData.files?.meta].filter(Boolean);
  templateSubtitleEl.textContent = fileParts.length
    ? `Preview files: ${fileParts.join(' + ')}`
    : `Template: ${name}`;
  renderSummary(currentTemplateData);
  renderPreview(currentTemplateData);
  renderTemplateList();
}

function renderTemplateList() {
  if (templateIndex.length === 0) {
    templateListEl.innerHTML = '<div class="muted">No `*.session` or `*.meta.json` files found in `template/`.</div>';
    return;
  }

  templateListEl.innerHTML = templateIndex
    .map((item) => {
      const active = item.name === selectedTemplate ? ' active' : '';
      const badges = [
        item.hasSession ? 'session' : null,
        item.hasMeta ? 'meta' : null,
      ].filter(Boolean).join(' · ');
      return `
        <button class="template-item${active}" type="button" data-template="${escapeHtml(item.name)}">
          ${escapeHtml(item.name)}
          <small>${escapeHtml(item.updatedAt)} · ${escapeHtml(String(item.size))} bytes${badges ? ` · ${escapeHtml(badges)}` : ''}</small>
        </button>
      `;
    })
    .join('');

  templateListEl.querySelectorAll('[data-template]').forEach((button) => {
    button.addEventListener('click', () => {
      loadTemplate(button.getAttribute('data-template')).catch(showError);
    });
  });
}

function showError(error) {
  templateTitleEl.textContent = 'Error';
  templateSubtitleEl.textContent = error.message;
  summaryBadgesEl.innerHTML = '';
  previewStageEl.innerHTML = '<div class="empty-state">Unable to render template.</div>';
  renderWidgetDetails(null);
}

async function refreshTemplates() {
  const response = await fetch('/api/templates');
  if (!response.ok) {
    throw new Error(`Failed to list templates: ${response.status}`);
  }
  const payload = await response.json();
  templateIndex = payload.templates || [];
  renderTemplateList();
  if (!selectedTemplate && templateIndex[0]) {
    await loadTemplate(templateIndex[0].name);
  } else if (selectedTemplate) {
    const stillExists = templateIndex.some((item) => item.name === selectedTemplate);
    if (stillExists) {
      await loadTemplate(selectedTemplate);
    }
  }
}

refreshButton.addEventListener('click', () => {
  refreshTemplates().catch(showError);
});

refreshTemplates().catch(showError);
