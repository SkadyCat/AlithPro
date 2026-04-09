# `.bp -> 图片生成 -> Godot` 生成文档

本文档基于当前 `application\godot_inventory` 的实际实现整理，目标是把 `bag.bp`、布局 JSON、资源生成、最新 UI 约束、以及 Godot 场景重生成流程统一说明清楚。

## 1. 当前链路总览

当前实际可执行链路：

1. `application\godot_inventory\bag.bp`
   - 作为背包 UI 的结构与资源声明源。
   - 定义节点树、控件类型、资源路径、数据字段。
2. `application\godot_inventory\layout\bag_dark_layout.json`
   - 作为布局标注 JSON 的正式落盘版本。
   - 定义标题、关闭按钮、左侧页签、中部格子区与底部代币区的最终坐标和尺寸。
3. 资源生成
   - `application\godot_inventory\tools\generate_bag_undead_assets.js`
   - 读取 `bag.bp` 中的资源声明。
   - 生成一套“暗黑、干净、无脏装饰”的 PNG 资源到导出包。
4. 资源应用
   - `application\godot_inventory\tools\apply_bag_undead_assets.js`
   - 把导出包同步到当前 Godot 正在使用的活跃 `assets\` 目录。
5. Godot UI 重生成
   - `application\godot_inventory\tools\run_generate_bag_ui.js`
   - 调用 `generate_bag_ui.gd`
   - 根据 `bag.bp`、`bag_dark_layout.json` 与当前活跃资源重新生成 `scenes\bag_ui.tscn`

## 2. 一定要区分的两个目录

### 2.1 导出包目录

- `application\godot_inventory\exports\bag_undead_pack\assets\ui\`
- `application\godot_inventory\exports\bag_undead_pack\assets\icons\`

这是**最新生成结果**，用于查看、对比、备份。

### 2.2 Godot 活跃资源目录

- `application\godot_inventory\assets\ui\`
- `application\godot_inventory\assets\icons\`

这是 `bag_ui.tscn` 实际引用的目录。  
**只生成导出包，不执行 apply，Godot 不会自动切到最新资源。**

## 3. 标准执行顺序

每次改完资源生成逻辑后，必须按下面顺序执行：

1. `npm run generate:bag-undead-assets`
2. `npm run apply:bag-undead-assets`
3. `npm run generate:bag-godot-ui`

推荐再补一轮基础检查：

1. `npm run check`

## 4. 当前可用命令

位于 `application\package.json`：

- `npm run generate:bag-undead-assets`
  - 生成最新暗黑风导出包。
- `npm run apply:bag-undead-assets`
  - 把导出包同步到当前活跃 `assets\`。
- `npm run generate:bag-godot-ui`
  - 基于当前活跃资源重生成 `bag_ui.tscn`。
- `npm run check`
  - 基础 Node 语法检查。

## 5. 当前已经固化的约束

这些约束来自最近连续迭代，不应再回退：

### 5.1 图片要干净

- 不要带无关装饰。
- 不要带脏印记。
- 不要在背景图里混入不必要的小章、角饰、乱线。
- `topbar_bg.png` 已明确要求保持纯净，只保留基础明暗和轻微光感。

### 5.2 图片里不要带文字

- 生成的是**底图资源**，不是带文案的最终按钮。
- 文字应在 Godot 或后续渲染层叠加，不应烤进底图。

### 5.3 视觉方向

- 保持当前“暗黑、干净、冷蓝灰、轻微冷光”方向。
- 可以有冷蓝灰描边、淡蓝高光、深靛黑底。
- 但不要脏、不要花、不要过多符号化装饰。

### 5.4 Godot 资源尺寸必须直接适配场景

- 不能再靠“裁完后的小图”去硬套大控件。
- 当前生成器已经改成：**直接按 Godot 当前 UI 目标尺寸生成关键资源**。
- 如果以后改动 `generate_bag_ui.gd` 中的控件尺寸，也要同步更新 `generate_bag_undead_assets.js` 的规格表。

### 5.5 导出包不是活跃资源

- `exports\bag_undead_pack\...` 只是导出结果。
- Godot 实际使用的是 `assets\...`
- 因此每次都要执行：
  - `generate`
  - `apply`
  - `generate godot ui`

## 6. 关键文件

### 6.1 蓝图源

- `application\godot_inventory\bag.bp`

### 6.2 资源生成

- `application\godot_inventory\tools\generate_bag_undead_assets.js`

### 6.3 布局落盘

- `application\godot_inventory\layout\bag_dark_layout.json`

### 6.4 导出包应用到活跃资源

- `application\godot_inventory\tools\apply_bag_undead_assets.js`

### 6.5 Godot 场景生成

- `application\godot_inventory\tools\run_generate_bag_ui.js`
- `application\godot_inventory\tools\generate_bag_ui.gd`

### 6.6 当前 Godot 场景

- `application\godot_inventory\scenes\bag_ui.tscn`

## 7. 当前关键资源路径

### 7.1 活跃资源路径

- `application\godot_inventory\assets\ui\scene_bg.png`
- `application\godot_inventory\assets\ui\title_plate.png`
- `application\godot_inventory\assets\ui\currency_plate.png`
- `application\godot_inventory\assets\ui\inventory_panel_bg.png`
- `application\godot_inventory\assets\ui\tab_idle.png`
- `application\godot_inventory\assets\ui\tab_active.png`
- `application\godot_inventory\assets\ui\item_card_bg.png`
- `application\godot_inventory\assets\ui\item_card_selected.png`
- `application\godot_inventory\assets\icons\tab_weapon.png`

### 7.2 导出包路径

- `application\godot_inventory\exports\bag_undead_pack\assets\ui\scene_bg.png`
- `application\godot_inventory\exports\bag_undead_pack\assets\ui\title_plate.png`
- `application\godot_inventory\exports\bag_undead_pack\assets\ui\currency_plate.png`
- `application\godot_inventory\exports\bag_undead_pack\assets\ui\inventory_panel_bg.png`
- `application\godot_inventory\exports\bag_undead_pack\assets\ui\tab_idle.png`
- `application\godot_inventory\exports\bag_undead_pack\assets\ui\tab_active.png`
- `application\godot_inventory\exports\bag_undead_pack\assets\ui\item_card_bg.png`
- `application\godot_inventory\exports\bag_undead_pack\assets\ui\item_card_selected.png`
- `application\godot_inventory\exports\bag_undead_pack\assets\icons\tab_weapon.png`

## 8. 当前关键尺寸约束

这些尺寸已经对齐当前暗黑布局：

- `scene_bg.png` -> `1440x900`
- `title_plate.png` -> `257x63`
- `currency_plate.png` -> `205x65`
- `inventory_panel_bg.png` -> `453x578`
- `tab_idle.png` -> `142x101`
- `tab_active.png` -> `142x101`
- `item_card_bg.png` -> `132x124`
- `item_card_selected.png` -> `132x124`

## 9. 关于 `.bp -> CSS -> 图片 -> Godot`

当前仓库里，真正落地到 `bag.bp` 整套资源上的实现是：

- `.bp + layout JSON -> Node/Canvas/Playwright 生成 PNG -> apply 到 assets -> Godot`

其中“CSS 按钮背景 -> canvas”更多是**视觉原型验证方式**，不是当前 `bag.bp` 整套资源的唯一生产方式。  
如果后续要把某些资源先用 CSS 原型化，再转成 PNG，也是允许的，但最终仍需满足本文件里的硬约束：

- 底图无文字
- 图面干净
- 不要脏装饰
- 分辨率直接适配 Godot
- 生成后必须 apply 再重生 Godot UI

## 10. 最简操作模板

在 `application\` 目录下执行：

```powershell
npm run generate:bag-undead-assets
npm run apply:bag-undead-assets
npm run generate:bag-godot-ui
npm run check
```

如果你只想确认当前 Godot 用的是不是最新资源，先检查：

1. 是否刚执行过 `npm run apply:bag-undead-assets`
2. 是否刚执行过 `npm run generate:bag-godot-ui`
3. `application\godot_inventory\assets\...` 是否已经是你刚生成的新图

