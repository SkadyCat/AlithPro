# Session <-> WBP Roundtrip Protocol

This protocol defines the canonical `.session` contract used for roundtrip conversion between UIEditor sessions and Unreal `WidgetBlueprint` exports.

## Goals

- Keep `.session` editable inside `canvas-editor`.
- Preserve enough Unreal slot/style metadata to support stable `.session -> WBP`.
- Preserve enough exported widget data to support stable `WBP -> .session`.
- Remain backward compatible with legacy `.session` files that only contain `boxes`.

## Top-level shape

```json
{
  "version": "2.0",
  "protocol": {
    "name": "uieditor-wbp-roundtrip",
    "version": "2.0",
    "canonical": "widgets",
    "compatibility": {
      "legacyBoxes": true,
      "parentRelativeFrame": true,
      "ueSlotMetadata": true
    }
  },
  "savedAt": "2026-03-31T00:00:00.000Z",
  "nextId": 12,
  "sourceBlueprint": "/Game/UI/Panels/WBP_login_screen",
  "exportedFrom": "MagicWorld /ue/inspect-wbp + WBPEditor.inspect_widget_blueprint",
  "viewport": {
    "w": 1280,
    "h": 720
  },
  "widgets": [],
  "boxes": []
}
```

## Canonical field: `widgets`

`widgets` is the canonical tree used for roundtrip logic.

```json
{
  "id": 3,
  "name": "login_button",
  "type": "Button",
  "frame": {
    "x": 32,
    "y": 328,
    "w": 416,
    "h": 48
  },
  "anchor": {
    "minX": 0,
    "minY": 0,
    "maxX": 0,
    "maxY": 0
  },
  "props": {
    "text": "Login",
    "fontSize": 18
  },
  "style": {
    "borderColor": "#6bb5e8",
    "bgColor": "rgba(107,181,232,0.07)",
    "borderWidth": 1,
    "opacity": 1,
    "borderRadius": 10,
    "boxShadow": "0 6px 18px rgba(0,0,0,0.25)"
  },
  "flags": {
    "isEntryClass": false
  },
  "ue": {
    "slot": {
      "type": "CanvasPanelSlot",
      "anchors": {
        "min": [0, 0],
        "max": [0, 0]
      },
      "alignment": [0, 0],
      "offsets": {
        "left": 32,
        "top": 328,
        "right": 416,
        "bottom": 48
      },
      "autoSize": false,
      "zOrder": 8
    }
  },
  "children": []
}
```

## Compatibility field: `boxes`

- `boxes` remains the legacy tree used by existing `canvas-editor` runtime code.
- New writers should emit both `widgets` and `boxes`.
- New readers should prefer `widgets`; if missing, fall back to `boxes`.

## Geometry rules

- `frame.x` and `frame.y` are parent-relative coordinates.
- `frame.w` and `frame.h` are local widget size.
- `anchor` stores normalized anchor metadata for editor/runtime layout.
- `ue.slot` stores Unreal-oriented slot data required for `.session -> WBP` bridging.

## Conversion rules

### `.session -> WBP`

- Read `widgets` if available, otherwise convert legacy `boxes` into canonical widgets.
- Bridge canonical widgets into AIUI JSON tree nodes.
- Preserve anchor offsets and slot metadata through `ue.slot`.
- Use `WidgetBlueprint` creation through `AIWBPEditorLibrary.create_wbp_from_json`.

### `WBP -> .session`

- Export from `WBPEditor.inspect_widget_blueprint` and `/ue/inspect-wbp`.
- Build canonical `widgets` first.
- Derive legacy `boxes` from canonical widgets for editor compatibility.

## Notes

- `props` is the preferred place for widget-type-specific editable data.
- `style` is visual/editor styling and should stay JSON-friendly.
- `ue` is reserved for Unreal-specific roundtrip metadata and raw export context.
