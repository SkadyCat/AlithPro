# UMG 控件库 (HTML Web Components)

与 UE5 UMG Widget 同名同功能的 HTML 自定义元素库。每个控件映射一个 UMG Widget 类型，属性名和事件名尽量保持一致。

## 快速使用

```html
<script type="module" src="elements/index.js"></script>

<umg-vertical-box>
  <umg-text-block text="背包" font-size="18px" color="#e0d070"></umg-text-block>
  <umg-button>确认</umg-button>
  <umg-progress-bar percent="0.7" fill-color="#40d080"></umg-progress-bar>
</umg-vertical-box>
```

## 控件清单

### 基类
| 文件 | 类 | 标签 | 说明 |
|------|-----|------|------|
| UWidget.js | UWidget | — | 所有控件基类，提供 visibility/render-opacity/is-enabled/tooltip-text/padding |

### 输入控件
| 文件 | 类 | 标签 | UMG 对应 |
|------|-----|------|----------|
| UButton.js | UButton | `<umg-button>` | UButton |
| UCheckBox.js | UCheckBox | `<umg-checkbox>` | UCheckBox |
| UEditableText.js | UEditableText | `<umg-editable-text>` | UEditableText |
| UEditableTextBox.js | UEditableTextBox | `<umg-editable-text-box>` | UEditableTextBox |
| UMultiLineEditableText.js | UMultiLineEditableText | `<umg-multiline-editable-text>` | UMultiLineEditableText |
| UMultiLineEditableTextBox.js | UMultiLineEditableTextBox | `<umg-multiline-editable-text-box>` | UMultiLineEditableTextBox |
| USpinBox.js | USpinBox | `<umg-spin-box>` | USpinBox |
| USlider.js | USlider | `<umg-slider>` | USlider |
| UComboBoxString.js | UComboBoxString | `<umg-combo-box-string>` | UComboBoxString |

### 文字显示
| 文件 | 类 | 标签 | UMG 对应 |
|------|-----|------|----------|
| UTextBlock.js | UTextBlock | `<umg-text-block>` | UTextBlock |
| URichTextBlock.js | URichTextBlock | `<umg-rich-text-block>` | URichTextBlock |

### 视觉媒体
| 文件 | 类 | 标签 | UMG 对应 |
|------|-----|------|----------|
| UImage.js | UImage | `<umg-image>` | UImage |
| UProgressBar.js | UProgressBar | `<umg-progress-bar>` | UProgressBar |
| UThrobber.js | UThrobber | `<umg-throbber>` | UThrobber |
| UCircularThrobber.js | UCircularThrobber | `<umg-circular-throbber>` | UCircularThrobber |
| UBackgroundBlur.js | UBackgroundBlur | `<umg-background-blur>` | UBackgroundBlur |

### 容器布局
| 文件 | 类 | 标签 | UMG 对应 |
|------|-----|------|----------|
| UCanvasPanel.js | UCanvasPanel | `<umg-canvas-panel>` | UCanvasPanel |
| UHorizontalBox.js | UHorizontalBox | `<umg-horizontal-box>` | UHorizontalBox |
| UVerticalBox.js | UVerticalBox | `<umg-vertical-box>` | UVerticalBox |
| UWrapBox.js | UWrapBox | `<umg-wrap-box>` | UWrapBox |
| UGridPanel.js | UGridPanel | `<umg-grid-panel>` | UGridPanel |
| UUniformGridPanel.js | UUniformGridPanel | `<umg-uniform-grid-panel>` | UUniformGridPanel |
| UOverlay.js | UOverlay | `<umg-overlay>` | UOverlay |
| UWidgetSwitcher.js | UWidgetSwitcher | `<umg-widget-switcher>` | UWidgetSwitcher |
| UScrollBox.js | UScrollBox | `<umg-scroll-box>` | UScrollBox |
| USizeBox.js | USizeBox | `<umg-size-box>` | USizeBox |
| UScaleBox.js | UScaleBox | `<umg-scale-box>` | UScaleBox |
| USpacer.js | USpacer | `<umg-spacer>` | USpacer |
| UBorder.js | UBorder | `<umg-border>` | UBorder |
| USafeZone.js | USafeZone | `<umg-safe-zone>` | USafeZone |

### 数据驱动
| 文件 | 类 | 标签 | UMG 对应 |
|------|-----|------|----------|
| UListView.js | UListView | `<umg-list-view>` | UListView |
| UTileView.js | UTileView | `<umg-tile-view>` | UTileView |
| UTreeView.js | UTreeView | `<umg-tree-view>` | UTreeView |
| UMenuAnchor.js | UMenuAnchor | `<umg-menu-anchor>` | UMenuAnchor |

## 通用属性（UWidget 基类）

所有控件都支持以下属性：

| HTML 属性 | UMG 属性 | 值 |
|-----------|---------|-----|
| `visibility` | Visibility | Visible / Hidden / Collapsed / HitTestInvisible / SelfHitTestInvisible |
| `render-opacity` | RenderOpacity | 0~1 |
| `is-enabled` | IsEnabled | true / false |
| `tooltip-text` | ToolTipText | 字符串 |
| `padding` | Padding | CSS padding 值 |

## 文件结构

```
elements/
├── index.js                     # 入口，导入即注册所有元素
├── UWidget.js                   # 基类
├── UButton.js                   # Button
├── UCheckBox.js                 # CheckBox
├── UEditableText.js             # EditableText
├── UEditableTextBox.js          # EditableTextBox
├── UMultiLineEditableText.js    # MultiLineEditableText
├── UMultiLineEditableTextBox.js # MultiLineEditableTextBox
├── USpinBox.js                  # SpinBox
├── USlider.js                   # Slider
├── UComboBoxString.js           # ComboBoxString
├── UTextBlock.js                # TextBlock
├── URichTextBlock.js            # RichTextBlock
├── UImage.js                    # Image
├── UProgressBar.js              # ProgressBar
├── UThrobber.js                 # Throbber
├── UCircularThrobber.js         # CircularThrobber
├── UBackgroundBlur.js           # BackgroundBlur
├── UCanvasPanel.js              # CanvasPanel
├── UHorizontalBox.js            # HorizontalBox
├── UVerticalBox.js              # VerticalBox
├── UWrapBox.js                  # WrapBox
├── UGridPanel.js                # GridPanel
├── UUniformGridPanel.js         # UniformGridPanel
├── UOverlay.js                  # Overlay
├── UWidgetSwitcher.js           # WidgetSwitcher
├── UScrollBox.js                # ScrollBox
├── USizeBox.js                  # SizeBox
├── UScaleBox.js                 # ScaleBox
├── USpacer.js                   # Spacer
├── UBorder.js                   # Border
├── USafeZone.js                 # SafeZone
├── UListView.js                 # ListView
├── UTileView.js                 # TileView
├── UTreeView.js                 # TreeView
├── UMenuAnchor.js               # MenuAnchor
└── README.md                    # 本文件
```

## 设计原则

1. **同名映射** — 类名与 UMG C++ 类名一致（如 `UButton`、`UTextBlock`）
2. **属性对齐** — HTML 属性名 kebab-case 映射 UMG PascalCase（如 `font-size` → `FontSize`）
3. **事件对齐** — 自定义事件名保持 UMG 风格（如 `OnClicked`、`OnValueChanged`）
4. **Web Component** — 基于 Custom Elements V1，每个控件使用 Shadow DOM 隔离样式
5. **暗色主题** — 默认配色匹配项目 undead 风格
