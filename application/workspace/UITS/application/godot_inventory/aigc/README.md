# bag AIGC 任务包

> 注意：当前目录只负责 **AIGC 任务准备**。仓库目前**没有**接入 ComfyUI、Scenario、Civitai 或其他模型服务的实际出图调用。
> 现在仓库里落盘的 PNG 资源，仍然来自现有的 Node + Canvas 确定性脚本。

这个目录用于承接 `application\godot_inventory\bag.bp` 的 AIGC 资源准备流程。

## 命令

在 `application\` 目录下执行：

```bash
npm run prepare:bag-aigc
```

执行后会生成：

- `application\godot_inventory\aigc\bag-task-pack.json`
- `application\godot_inventory\aigc\prompts\*.txt`

## 目录说明

- `bag-task-pack.json`：标准化任务包，包含每个资源的尺寸、分组、优先级、提示词、负面提示词、参考图、后处理要求，以及统一默认风格参数。
- `prompts\*.txt`：按资源拆分的单文件提示词，可直接复制到 ComfyUI、Scenario 或其他图像生成平台；每个 prompt 文件都会带上默认 theme / palette / output policy。
- `generated-assets.json`：当前仓库内实际落盘的资源清单。这里只记录本地脚本生成结果，不代表这些 PNG 由 AIGC 模型直接生成。
- `..\scenes\bag_ui.tscn`：由 `bag.bp` 自动生成的 Godot UI 场景。

## 默认值策略

`prepare:bag-aigc` 现在会优先读取 **当前** `bag.bp` 里声明的资源，并自动补齐以下默认值：

- 主题：`dark-fantasy-inventory-ui`
- 关键词：`dark / compact / clear / bronze / obsidian / emerald glow`
- 调色板：深炭黑、旧铜、暗橄榄、米金
- 批次建议：每个资源先出 `8-12` 个变体
- 输出策略：
  - 背景类可先出不透明构图，再转 PNG
  - UI 片段和 icon 默认透明 PNG
- 后处理清单：清边、留白、对称、回缩到目标尺寸后再进 Godot 检查

尺寸会优先从当前 `assets\ui` / `assets\icons` 的 PNG 实际像素中读取，因此蓝图资源调整后，不需要手工同步一套新的 size 表。

## 推荐工作流

1. 先执行 `npm run prepare:bag-aigc`，刷新任务包。
2. 按 `bag-task-pack.json` 中的 `priority` 优先处理高价值资源：
   - `scene_bg`
   - `capacity_plate`
   - `inventory_panel_bg`
   - `item_card*`
   - `item_*` 图标
3. 在外部 AIGC 平台中，为每个资源先生成 8-12 个变体。
4. 选择轮廓最干净、中心可读性最好的方案，做透明背景与边缘清理。
5. 回写到 `assets\ui` / `assets\icons` 后，用现有 Godot 场景继续联调。

当前背包蓝图主要覆盖这些资源族：

- UI 底板：`scene_bg`、`capacity_plate`、`inventory_panel_bg`
- 状态片：`tab_idle`、`tab_active`、`item_card_bg`、`item_card_selected`
- 分类 icon：`tab_equipment`、`tab_item`、`tab_material`、`tab_currency`
- 物品 icon：`item_sword`、`item_potion`、`item_scroll`、`item_shield`、`item_feather`、`item_key`、`item_bow`、`item_coin`

## 与现有脚本的关系

- `npm run generate:bag-assets`：确定性脚本直绘链，适合快速回归和兜底。
- `npm run prepare:bag-aigc`：AIGC 准备层，负责把资源需求整理成可投喂外部模型的平台无关任务包。
- `npm run generate:bag-godot-ui`：调用 Godot headless，把 `bag.bp` 生成为 `res://scenes/bag_ui.tscn`。
- `npm run build:bag-ui`：先刷新 AIGC 任务包，再运行确定性资源脚本，并输出本地生成清单；**不会调用任何 AIGC 模型服务**。

推荐做法是：

1. 先用 `prepare:bag-aigc` 产出高质感视觉母版任务。
2. 再把筛选后的结果回写为正式贴图。
3. 保留 `generate:bag-assets` 作为兜底与结构回归工具。
