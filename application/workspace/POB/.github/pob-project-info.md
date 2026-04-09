# Path of Building Community (PoBC) — 项目基础信息

> 源路径：`G:\poegj\PoeCharm3[20251103]-Release-3.5.0\PathOfBuildingCommunity-Portable (2)`
> 仓库：https://github.com/PathOfBuildingCommunity/PathOfBuilding

## 概览

Path of Building Community 是 Path of Exile（流放之路）的离线 Build 计算器，用于模拟角色配置（装备、天赋树、技能宝石）并精确计算 DPS、防御等关键数值。

| 属性 | 值 |
|------|-----|
| 版本 | 2.62.0（最新 2.63.0） |
| 平台 | Windows 32-bit |
| 许可证 | MIT |
| 主语言 | Lua 5.1 + LuaJIT |
| 图形框架 | SimpleGraphic（OpenGL ES 2.0 / GLFW3 / ImGui） |
| 网络库 | libcurl + Lua-cURL |

## 目录结构

```
PathOfBuildingCommunity-Portable/
├── Launch.lua              # 入口，SimpleGraphic 指令
├── Modules/                # 核心模块
│   ├── Main.lua            # 主控制器
│   ├── Build.lua           # Build 管理（XML 序列化）
│   ├── Calcs.lua           # 计算系统协调
│   ├── CalcSetup.lua       # 计算环境初始化
│   ├── CalcPerform.lua     # 计算执行引擎
│   ├── CalcActiveSkill.lua # 主动技能计算
│   ├── CalcDefence.lua     # 防御计算（护甲/闪避/ES/抗性等）
│   ├── CalcOffence.lua     # 攻击/DPS 计算
│   ├── CalcTriggers.lua    # 触发机制计算
│   ├── CalcMirages.lua     # 幻影/回响计算
│   ├── Data.lua            # 游戏数据加载器
│   ├── ModParser.lua       # 词缀文本解析器
│   └── ...                 # 更多模块
├── Classes/                # UI 控件类（70+文件）
│   ├── Control.lua         # 基础 UI 控件
│   ├── ModDB.lua           # 词缀数据库
│   ├── PassiveTree.lua     # 天赋树管理
│   ├── Item.lua            # 物品类
│   ├── TradeQuery.lua      # 交易查询
│   └── ...
├── Data/                   # 游戏内容数据
│   ├── Global.lua          # 全局常量（颜色、ModFlag、KeywordFlag）
│   ├── Gems.lua            # 技能宝石数据
│   ├── Skills/             # 技能定义（按属性分类）
│   ├── Bases/              # 物品基底（22类）
│   ├── Uniques/            # 暗金装备数据
│   ├── ModItem.lua         # 物品词缀池（自动生成）
│   ├── Pantheons.lua       # 神殿系统
│   ├── ClusterJewels.lua   # 星团珠宝
│   └── ...                 # 50+ 数据文件
├── TreeData/               # 天赋树数据（40+ 游戏版本）
│   ├── 3_6/ ~ 3_28/       # 各版本天赋树
│   ├── *.zip / *.bin       # 压缩树数据
│   └── *.png               # 200+ 天赋树 UI 素材
├── Assets/                 # 游戏素材（升华肖像等）
├── lua/                    # Lua 第三方库
│   ├── dkjson.lua          # JSON 解析
│   ├── xml.lua             # XML 解析
│   ├── base64.lua          # Base64 编解码
│   └── sha1/               # SHA-1 哈希
├── Builds/                 # 用户 Build 存档（XML 格式）
├── manifest.xml            # 版本与更新清单
├── GameVersions.lua        # 游戏版本映射
└── [30+ DLL 依赖]
```

## 启动流程

1. `Path of Building.exe` → SimpleGraphic 运行时
2. `Launch.lua` → 创建 `launch` 对象，启用 JIT 优化
3. `OnInit` → 加载 `manifest.xml`，调用 `PLoadModule("Modules/Main")`
4. `Main.lua` → 加载 Common/Data/ModTools 等模块，初始化 LIST 和 BUILD 两种模式
5. 主循环 `OnFrame` → 渲染 + 更新

## Build 计算引擎

```
ModDB（词缀数据库）
  ├── ModList（个体词缀列表）
  ├── 条件标志（需满足的条件）
  └── 乘数（动态叠加效果）

计算管线（CalcPerform）
  1. 应用基础属性
  2. 应用装备词缀
  3. 应用天赋树词缀
  4. 应用主动技能词缀
  5. 应用辅助宝石词缀
  6. 应用增减益条件
  7. 输出计算结果（DPS/防御/生命等）
```

**ModFlag 位标志**：Attack / Spell / Hit / DoT / Melee / Area / Projectile / 各武器类型  
**KeywordFlag**：Aura / Curse / Minion / Totem / Trap / Mine 等

## 外部依赖（DLL）

| 类别 | 组件 |
|------|------|
| 图形 | SimpleGraphic.dll, libGLESv2.dll, libEGL.dll, glfw3.dll, d3dcompiler_47.dll |
| 网络 | libcurl.dll, lcurl.dll |
| 数据 | zstd.dll, zlib1.dll, lzip.dll, libwebpdecoder.dll |
| 正则 | re2.dll |
| 运行时 | lua51.dll, lua-utf8.dll, abseil_dll.dll, fmt.dll |
| C++ RT | msvcp140.dll, vcruntime140.dll 等 |

## 关键统计

| 指标 | 数量 |
|------|------|
| Lua 源文件 | 100+ |
| UI 控件类 | 70+ |
| 数据文件 | 50+ |
| 支持游戏版本 | 40+ |
| 天赋树版本 | 50+（含变体） |
| PNG 素材 | 200+ |
| DLL 依赖 | 30+ |
