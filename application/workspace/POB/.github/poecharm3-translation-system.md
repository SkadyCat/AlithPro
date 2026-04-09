# PoeCharm3 翻译系统分析

> 源路径：`G:\poegj\PoeCharm3[20251103]-Release-3.5.0\Data`

## 概览

PoeCharm3 是一个基于 Qt5 的 POB 封装器，通过 CSV 文件实现多语言翻译注入。翻译系统采用**嵌入式 CSV 字符串替换**方案，非传统 i18n 框架（无 .po/.pot）。

## 架构

```
PoeCharm3.exe (Qt5 GUI)
    │
    ├── Settings.conf → TranslateTL=zh-rCN
    │
    ├── SimpleGraphicExtend.dll (Qt ↔ Lua 桥接层)
    │     ├── 读取 Translate.json（可用语言列表）
    │     ├── 加载 Data/Translate/{locale}/*.csv 到哈希表
    │     └── 在 Lua 模块初始化时执行字符串查找替换
    │
    └── PathOfBuilding Lua VM
          └── 模块中英文字符串 → 被 CSV 翻译覆盖
```

## 翻译流程

1. 启动 → 读取 `Settings.conf` → 获取语言 `zh-rCN`
2. `SimpleGraphicExtend.dll` 加载 `Translate.json` → 定位路径
3. DLL 预加载所选语言的所有 CSV 文件到哈希表
4. POB Lua 模块初始化时：每个英文字符串 → 查哈希表 → 有则替换 → 无则英文回退

## CSV 格式规范

| 属性 | 值 |
|------|-----|
| 格式 | 两列：`Source_String,Target_String` |
| 分隔符 | 逗号 `,` |
| 编码 | UTF-8 with BOM |
| 引用规则 | RFC 4180（含逗号或引号的字段用双引号包裹） |
| 无表头行 | 直接开始翻译对 |

示例：
```csv
Update Ready,更新已就绪
All,全部
"Shock increases Damage taken by up to 50%...","（感电能额外提高至多50%的伤害...）"
```

## CSV 文件 → POB 模块映射

| CSV 文件 | 对应 POB 模块 | 内容 |
|----------|--------------|------|
| `Main.csv` | 主 UI | 菜单、按钮、通用文本 |
| `Build.csv` | `Modules/Build.lua` | Build 配置 UI |
| `GUI.csv` | `Classes/GUI*.lua` | 通用 GUI 标签 |
| `ConfigOptions.csv` | `Modules/ConfigOptions.lua` | 配置选项 |
| `CalcDefence.csv` | `Modules/CalcDefence.lua` | 防御计算标签 |
| `CalcOffence.csv` | `Modules/CalcOffence.lua` | 攻击计算标签 |
| `Data.csv` | `Modules/Data.lua` | 游戏数据标签 |
| `passiveTree.csv` | `Classes/PassiveSpec.lua` | 天赋树描述 |
| `statDescriptions.csv` | `Data/StatDescriptions/` | 属性描述文本（40K+条） |
| `Gems_data.csv` | `Data/Gems.lua` | 宝石描述 |
| `Items_*.txt.csv` | `Data/Bases/Items/` | 物品基底名称 |
| `Uniques.txt.csv` | 暗金数据 | 暗金装备名称与描述 |

## 可用语言

来源：`Data/Translate.json`

```json
[
  {"name": "中文", "value": "zh-rCN", "path": "Data/Translate/zh-rCN"},
  {"name": "中文(繁體)", "value": "zh-rTW", "path": "Data/Translate/zh-rTW"}
]
```

另有 `ko-KR`（韩文）目录但未列入 Translate.json。

## 各语言覆盖对比

| 语言 | CSV 文件数 | 翻译条目数 | 总大小 | 覆盖范围 |
|------|-----------|-----------|--------|---------|
| zh-rCN | 64 | ~63,038 | 5.36 MB | 完整 UI + 核心游戏数据 |
| zh-rTW | 19 | ~83,581 | 7.23 MB | 精简 UI，侧重游戏数据（属性/天赋/物品） |
| ko-KR | 80 | ~224,108 | 16.47 MB | 最全面，含版本特定内容 |

### 翻译覆盖矩阵

| 类别 | zh-rCN | zh-rTW | ko-KR |
|------|--------|--------|-------|
| 核心 UI | ✓ | ✓ | ✓ |
| Build 配置 | ✓ | ✗ | ✗ |
| GUI 组件 | ✓ | ✓ | ✓ |
| 天赋树 | ✓ | ✓ | ✓ |
| 属性描述 | ✓ | ✓ | ✓ |
| 宝石与技能 | ✓ | ✗ | ✓ |
| 物品 | ✓ | ✓ | ✓ |
| 配置选项 | ✓ | ✗ | ✓ |

## 关键文件

| 文件 | 用途 |
|------|------|
| `Data/Settings.conf` | Qt INI 格式配置，`TranslateTL` 指定当前语言 |
| `Data/Translate.json` | 语言目录，定义可选语言及路径 |
| `Data/Translate/{locale}/*.csv` | 翻译 CSV 文件集 |
| `SimpleGraphicExtend.dll` | Qt ↔ Lua 桥接，负责 CSV 加载与字符串替换 |
| `PoeCharm3.exe` | Qt5 主程序（15.50 MB） |

## 扩展翻译的方法

1. 在 `Data/Translate/{locale}/` 下新增或编辑 CSV 文件
2. 每行格式：`英文原文,翻译文本`
3. CSV 文件名应与目标 POB 模块对应
4. 重启应用即可生效（CSV 在启动时预加载）
