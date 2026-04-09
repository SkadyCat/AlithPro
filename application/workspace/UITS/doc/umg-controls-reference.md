# UE5 UMG 基础控件参考手册

> 本文档汇总了 Unreal Engine 5 UMG (Unreal Motion Graphics) 中所有常用 Widget 类型、属性、插槽和布局约束，供 UI 设计和开发时快速查阅。

---

## 一、输入控件（Input）

| 控件 | 类名 | 说明 |
|------|------|------|
| **Button** | `UButton` | 可点击按钮，支持 Normal/Hovered/Pressed/Disabled 四态样式。可内嵌 TextBlock 或 Image 作为内容。 |
| **CheckBox** | `UCheckBox` | 复选框，二值切换（选中/未选中）。支持自定义选中图标。 |
| **EditableText** | `UEditableText` | 单行文本输入，无边框。适用于轻量输入场景。 |
| **EditableTextBox** | `UEditableTextBox` | 带边框的单行文本输入框。支持提示文字、字体、背景贴图。 |
| **MultiLineEditableText** | `UMultiLineEditableText` | 多行纯文本编辑区。 |
| **MultiLineEditableTextBox** | `UMultiLineEditableTextBox` | 多行带边框文本编辑器，支持样式配置。 |
| **SpinBox** | `USpinBox` | 数值输入框，支持加减按钮和拖拽调节。 |
| **Slider** | `USlider` | 滑块，在指定最小/最大值间选择连续数值。 |
| **ComboBox (String)** | `UComboBoxString` | 下拉选择框，选项为字符串列表。 |

### Button 属性详解

| 属性 | 说明 |
|------|------|
| Style → Normal / Hovered / Pressed / Disabled | 各状态的背景图片、颜色、圆角等 |
| Content | 子 Widget（通常放 TextBlock 或 Image） |
| Padding | 内容与按钮边界的内间距 |
| IsFocusable | 是否支持键盘 / 手柄聚焦 |
| ClickMethod | 按下方式（DownAndUp / MouseDown / PreciseClick） |
| 事件 | OnClicked、OnPressed、OnReleased、OnHovered、OnUnhovered |

---

## 二、文字与显示（Text & Display）

| 控件 | 类名 | 说明 |
|------|------|------|
| **TextBlock** | `UTextBlock` | 显示静态文本。支持字体、字号、颜色、描边、阴影。 |
| **RichTextBlock** | `URichTextBlock` | 富文本，支持内联样式标签、嵌入图片、超链接。需要配合 DataTable 定义样式行。 |

### TextBlock 属性详解

| 属性 | 说明 |
|------|------|
| Text | 显示的文本内容（支持绑定） |
| Font | 字体族、字号、字重（Regular/Bold/Italic） |
| Color and Opacity | 文字颜色和透明度 |
| Justification | 对齐方式：Left / Center / Right |
| AutoWrapText | 是否自动换行 |
| Shadow Offset / Color | 文字阴影偏移和颜色 |
| Outline Size / Color | 文字描边宽度和颜色 |

---

## 三、视觉与媒体（Visuals & Media）

| 控件 | 类名 | 说明 |
|------|------|------|
| **Image** | `UImage` | 显示图片/纹理。支持材质、色调、平铺、镜像。 |
| **ProgressBar** | `UProgressBar` | 进度条，常用于血条、加载条、经验条。 |
| **Throbber** | `UThrobber` | 加载动画（跳动点样式）。 |
| **CircularThrobber** | `UCircularThrobber` | 圆形旋转加载指示器。 |
| **BackgroundBlur** | `UBackgroundBlur` | 对控件后方区域做模糊处理，营造景深效果。 |

### Image 属性详解

| 属性 | 说明 |
|------|------|
| Brush → Image | 引用的 Texture2D 或 Material 资产 |
| Brush → Draw As | Box / Border / Image / RoundedBox |
| Brush → Tiling | NoTile / Horizontal / Vertical / Both |
| Brush → Mirroring | No / Horizontal / Vertical / Both |
| Color and Opacity | 叠加色调和透明度 |
| Desired Size Override | 强制显示尺寸（可选） |

---

## 四、容器与布局（Containers & Layout）

### 4.1 绝对定位容器

| 控件 | 类名 | 说明 |
|------|------|------|
| **Canvas Panel** | `UCanvasPanel` | 绝对定位面板。子控件通过锚点 + 偏移放置。是 WBP 的默认根容器。 |

### 4.2 线性排列容器

| 控件 | 类名 | 说明 |
|------|------|------|
| **Horizontal Box** | `UHorizontalBox` | 水平排列子控件。 |
| **Vertical Box** | `UVerticalBox` | 垂直排列子控件。 |
| **WrapBox** | `UWrapBox` | 自动换行排列，宽度溢出时折行。 |

### 4.3 网格容器

| 控件 | 类名 | 说明 |
|------|------|------|
| **Grid Panel** | `UGridPanel` | 灵活网格，行列可不等宽。 |
| **Uniform Grid Panel** | `UUniformGridPanel` | 等分网格，每格大小一致。 |

### 4.4 层叠与切换

| 控件 | 类名 | 说明 |
|------|------|------|
| **Overlay** | `UOverlay` | 层叠面板，子控件依次堆叠。 |
| **WidgetSwitcher** | `UWidgetSwitcher` | 切换器，同一时刻只显示一个子控件。常用于标签页。 |

### 4.5 滚动与约束

| 控件 | 类名 | 说明 |
|------|------|------|
| **ScrollBox** | `UScrollBox` | 滚动区域，内容超出时出现滚动条。 |
| **Size Box** | `USizeBox` | 约束子控件到指定尺寸。 |
| **Scale Box** | `UScaleBox` | 缩放子控件以适配。策略包括 Fit / Fill / UserSpecified 等。 |
| **Spacer** | `USpacer` | 占位空白，用于布局间隔。 |
| **SafeZone** | `USafeZone` | 安全区域，避开设备异形屏边缘。 |

### 4.6 其他容器

| 控件 | 类名 | 说明 |
|------|------|------|
| **Border** | `UBorder` | 给单个子控件加边框和背景。 |
| **Named Slot** | `UNamedSlot` | 具名插槽，用于模板化 Widget 的可替换区域。 |
| **RetainerBox** | `URetainerBox` | 将子控件渲染到 RT，减少实时绘制开销。 |
| **Invalidation Box** | `UInvalidationBox` | 失效缓存优化，减少子控件重绘。 |
| **MenuAnchor** | `UMenuAnchor` | 弹出菜单锚点，用于右键菜单或浮动面板。 |

---

## 五、数据驱动控件

| 控件 | 类名 | 说明 |
|------|------|------|
| **ListView** | `UListView` | 数据驱动列表，支持大量条目虚拟化滚动。每行由 Widget 模板渲染。 |
| **TileView** | `UTileView` | 网格版 ListView，以平铺方式展示条目（如图标墙）。 |
| **TreeView** | `UTreeView` | 树形列表，支持展开/折叠的层级数据。 |

---

## 六、插槽系统（Slot Types）

每种容器为子控件分配不同类型的插槽，决定子控件的位置和大小行为：

### Canvas Panel Slot

| 属性 | 说明 |
|------|------|
| Anchors (Min/Max) | 锚点范围 (0~1)，定义子控件相对父容器的基准区域 |
| Position (Offset) | 相对锚点的 X/Y 偏移（像素） |
| Size | 宽度/高度（像素） |
| Alignment | 对齐枢轴 (0,0)=左上，(0.5,0.5)=居中，(1,1)=右下 |
| ZOrder | 绘制层级 |

### HBox / VBox Slot

| 属性 | 说明 |
|------|------|
| Padding | 上下左右内间距 |
| Size → Fill | 比例填充权重 (0=自适应大小) |
| HAlign / VAlign | 水平/垂直对齐 |

### Overlay Slot

| 属性 | 说明 |
|------|------|
| Padding | 上下左右间距 |
| HAlign / VAlign | 对齐方式 |

### Grid Panel Slot

| 属性 | 说明 |
|------|------|
| Row / Column | 所在行列索引 |
| Row Span / Column Span | 跨行/跨列数 |
| Padding | 间距 |

### Uniform Grid Slot

| 属性 | 说明 |
|------|------|
| Row / Column | 所在行列索引 |
| HAlign / VAlign | 对齐方式 |

---

## 七、SizeBox 约束属性

SizeBox 用于强制约束子控件的尺寸范围：

| 属性 | 说明 |
|------|------|
| Width Override | 强制宽度（忽略子控件自然尺寸） |
| Height Override | 强制高度 |
| Min Desired Width | 最小期望宽度 |
| Max Desired Width | 最大期望宽度 |
| Min Desired Height | 最小期望高度 |
| Max Desired Height | 最大期望高度 |
| Min Aspect Ratio | 最小宽高比 |
| Max Aspect Ratio | 最大宽高比 |

---

## 八、通用属性（所有 Widget 共享）

| 属性分类 | 属性 | 说明 |
|----------|------|------|
| **可见性** | Visibility | Visible / Hidden / Collapsed / HitTestInvisible / SelfHitTestInvisible |
| **渲染** | Render Transform | 平移/旋转/缩放 |
| | Render Opacity | 渲染透明度 (0~1) |
| | Clipping | 裁剪模式 |
| **交互** | Is Enabled | 是否启用 |
| | Tool Tip Text | 悬浮提示文字 |
| | Cursor | 鼠标光标样式 |
| **导航** | Navigation | 键盘/手柄焦点导航规则 |
| **动画** | 可绑定属性 | 通过 Property Binding 动态驱动（文本、颜色、可见性等） |

---

## 九、常用 Widget 组合模式

### 9.1 标签页切换
```
WidgetSwitcher
  ├── Page1 (VerticalBox)
  ├── Page2 (VerticalBox)
  └── Page3 (VerticalBox)
```
结合 TabBar (HorizontalBox + Buttons) 控制 ActiveWidgetIndex。

### 9.2 滚动列表
```
ScrollBox
  └── VerticalBox
       ├── ItemWidget_1
       ├── ItemWidget_2
       └── ...
```

### 9.3 弹窗 / 对话框
```
Overlay
  ├── BackgroundBlur (全屏遮罩)
  └── SizeBox (限制弹窗大小)
       └── Border (边框背景)
            └── VerticalBox (内容)
```

### 9.4 背包网格
```
CanvasPanel
  ├── Image (背景)
  ├── UniformGridPanel (物品格子)
  │    ├── ItemSlot_1 (Button)
  │    ├── ItemSlot_2 (Button)
  │    └── ...
  ├── VerticalBox (标签栏)
  │    ├── TabButton_1
  │    └── TabButton_2
  └── TextBlock (容量显示)
```

---

## 十、参考链接

- [Epic 官方 Widget Type Reference](https://dev.epicgames.com/documentation/en-us/unreal-engine/widget-type-reference-for-umg-ui-designer-in-unreal-engine)
- [UMG Slots 文档](https://dev.epicgames.com/documentation/en-us/unreal-engine/umg-slots-in-unreal-engine)
- [UMG Styling 指南](https://dev.epicgames.com/documentation/en-us/unreal-engine/umg-styling-in-unreal-engine)
- [UMG-Slate Compendium (GitHub)](https://github.com/YawLighthouse/UMG-Slate-Compendium)
- [UMG 基础教程 (uhiyama-lab)](https://uhiyama-lab.com/en/notes/ue/umg-widget-blueprint-basic-to-advanced/)
