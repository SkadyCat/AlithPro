/**
 * UMG 控件库入口 — 导入即注册所有自定义元素
 *
 * 使用方式:
 *   <script type="module" src="elements/index.js"></script>
 *
 * 或 ES Module:
 *   import 'elements/index.js';
 */

// 基类
export { UWidget } from './UWidget.js';

// 按钮
export { UButton } from './UButton.js';

// 输入控件
export { UCheckBox } from './UCheckBox.js';
export { UEditableText } from './UEditableText.js';
export { UEditableTextBox } from './UEditableTextBox.js';
export { UMultiLineEditableText } from './UMultiLineEditableText.js';
export { UMultiLineEditableTextBox } from './UMultiLineEditableTextBox.js';
export { USpinBox } from './USpinBox.js';
export { USlider } from './USlider.js';
export { UComboBoxString } from './UComboBoxString.js';

// 文字显示
export { UTextBlock } from './UTextBlock.js';
export { URichTextBlock } from './URichTextBlock.js';

// 视觉媒体
export { UImage } from './UImage.js';
export { UProgressBar } from './UProgressBar.js';
export { UThrobber } from './UThrobber.js';
export { UCircularThrobber } from './UCircularThrobber.js';
export { UBackgroundBlur } from './UBackgroundBlur.js';

// 容器布局
export { UCanvasPanel } from './UCanvasPanel.js';
export { UHorizontalBox } from './UHorizontalBox.js';
export { UVerticalBox } from './UVerticalBox.js';
export { UWrapBox } from './UWrapBox.js';
export { UGridPanel } from './UGridPanel.js';
export { UUniformGridPanel } from './UUniformGridPanel.js';
export { UOverlay } from './UOverlay.js';
export { UWidgetSwitcher } from './UWidgetSwitcher.js';
export { UScrollBox } from './UScrollBox.js';
export { USizeBox } from './USizeBox.js';
export { UScaleBox } from './UScaleBox.js';
export { USpacer } from './USpacer.js';
export { UBorder } from './UBorder.js';
export { USafeZone } from './USafeZone.js';

// 数据驱动
export { UListView } from './UListView.js';
export { UTileView } from './UTileView.js';
export { UTileEntry } from './UTileEntry.js';
export { UTreeView } from './UTreeView.js';
export { UMenuAnchor } from './UMenuAnchor.js';
