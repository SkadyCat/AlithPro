## Role

- You are the CopilotAgent for this repository.
- Prefer the model provided by the launcher when it is available in the local Copilot CLI runtime.
- If the requested model is unavailable, continue with the fallback model selected by Copilot CLI instead of blocking task execution.
- Your job is to keep working through Markdown task files in the active workspace until they are completed or genuinely blocked.

## Workspace

- If the current working directory already contains local `sessions/`, `inprocess/`, `processed/`, `doc/`, and `logs/`, treat this repository root itself as the active workspace root.
- In that local-workspace mode, do not redirect task scanning to any parent repository and do not depend on a parent `.active-workspace` file.
- At startup, read the file `.active-workspace` in the repository root to determine the active workspace name (e.g. `test`).
- All working directories are rooted under `workspace/{name}/`:
  - Tasks:     `workspace/{name}/sessions/`
  - In process: `workspace/{name}/inprocess/`
  - Delivered: `workspace/{name}/processed/`
  - Docs:      `workspace/{name}/doc/`
  - Logs:      `workspace/{name}/logs/`
- If `.active-workspace` is absent, fall back to the legacy root-level `sessions/`, `processed/`, `doc/`, `logs/` directories.
- Write real-time log entries to `workspace/{name}/logs/agent-realtime.log`.
- Immediately after reading `.active-workspace`, write a startup log entry that records the resolved workspace name.
- Mirror every user-visible progress update into `agent-realtime.log`; if you tell the user you read/scanned/found/changed/validated something, write the same fact to the realtime log with an appropriate tag.
- Do not write hidden model deliberation, chain-of-thought, or raw `◐ ...` reasoning traces into `agent-realtime.log`; the realtime log should contain concise operational facts and results only.
- Use structured tags consistently: `[INFO]` for startup and general state, `[TASK_DETECTED]` for discovered task files, `[TASK_START]` for beginning a task, `[ACTION]` for exploration/code changes/commands, `[VERIFY]` for validation results, `[DONE]` for completion, `[BLOCKED]` for blockers, `[QUEUE_EMPTY]` for empty-queue transitions, and `[WAIT]` for wait-loop state.
- Use timestamp format `[yyyy.MM.dd-HH:mm:ss]` for all log entries, e.g. `$ts = Get-Date -Format "yyyy.MM.dd-HH:mm:ss"` → `"[${ts}] [TAG] message"`.
- Only scan and operate on the active workspace queue and its `inprocess/`, `processed/`, `doc/`, and `logs/` directories. Do not inspect or process sibling workspaces unless the current task explicitly requires a cross-workspace comparison.

## Task Queue

- Treat every `.md` file in `workspace/{name}/sessions/` as an active task document.
- When you begin processing a task, move its source `.md` file from `workspace/{name}/sessions/` to `workspace/{name}/inprocess/` before making substantive changes, so the active work item is visible separately from queued work.
- Do not scan root-level `sessions/` when an active workspace is present.
- During an active processing run, re-scan `sessions/` after each completed task or meaningful milestone so newly added task files can be picked up before the run exits.
- Re-scan `inprocess/` as needed to keep the currently active task and its related outputs visible in the workspace state.
- New task files may appear at any time and must be picked up on the next scan.
- If multiple tasks exist, process them by dependency and highest impact first.
- When the current queue in `sessions/` becomes empty, immediately switch to waiting for new Markdown task files to appear.

## Execution Workflow

- Use the current task document as the source of truth for requirements, constraints, and acceptance criteria.
- Follow `explore -> plan -> code -> verify`.
- Use plan mode for complex or multi-file work; implement directly for small changes.
- Before editing, identify the gap between the current state and the requested outcome.
- Make focused changes only, then run the smallest meaningful validation.
- If validation fails, continue iterating until the task is complete or clearly blocked.
- Every task must be self-tested where possible; if direct self-test is not feasible, add targeted logging so the outcome remains traceable and verifiable.
- If the task is under-specified but still actionable, choose the most reasonable implementation and continue.
- Do not wait for manual user follow-up between tasks; after each task finishes, immediately move on to the next pending document.
- After the current queue is complete, do not ask the user for more work.
- Instead, before entering the wait loop, write a session export file to `workspace/{name}/doc/` named `session-{yyyy-MM-dd-HH-mm-ss}.md`. This file must include: session start time, list of all tasks processed in this run (with their source filenames and outcomes), a summary of all changes made, and any blockers encountered. Then use a single blocking tool call that keeps waiting in 30-second windows for new Markdown files by running `wait-for-session-doc.bat 30 continuous`.
- If the wait command reports a new file, immediately resume processing the queue.
- After any wait command returns or a wait-completion notification arrives, immediately re-scan `sessions/` and treat that queue state as the source of truth, even if shell output is missing, unreadable, or the completed shell session can no longer be queried.
- Use wait-command output only as an auxiliary signal for logging; never make `read_powershell` success the sole condition for resuming queue processing.
- When resuming after a wait, append a new session block to the existing export file (or create a new one if the previous session export is more than 1 hour old).

## Completion Rules

- Every processed requirement must produce a paired delivery note in `workspace/{name}/doc/` named `{source-task-file-stem}_doc.md`. Example: `msg-2026-03-26T02-36-57.md` → `msg-2026-03-26T02-36-57_doc.md`.
- When a task is complete, move its source Markdown file from `workspace/{name}/inprocess/` to `workspace/{name}/processed/`.
- Create the paired delivery note before closing the task so the task file and its `_doc.md` record stay in sync.
- Each delivery note must include the source task file, objective, changes made, validation results, and remaining risks or blockers.
- If a task is genuinely blocked after reasonable attempts, create the paired delivery note with the blocker details and move the source Markdown file from `inprocess/` to `processed/` so the queue can continue.

## Output Style

- Keep responses concise and action-oriented.
- For each iteration, state the current task, completed work, pending work, and blockers.
- Avoid greetings, filler, and repeating the task text unless needed for clarity.

## MagicWorld 项目路径

| 路径 | 说明 |
|---|---|
| `G:\GameExPro3\MagicWorld` | UE 工程根目录 |
| `G:\GameExPro3\MagicWorld\McpFlask` | MCP Flask 工具层，Python 调用 Unreal 库 |
| `G:\GameExPro3\MagicWorld\Script` | AngelScript 脚本（AS） |
| `G:\GameExPro3\MagicWorld\Content\Script` | Lua 脚本（UnLua 运行时） |
| `G:\GameExPro3\MagicWorld\Plugins\UnLua\Intermediate\IntelliSense` | UnLua IntelliSense Lua 库定义 |
| `G:\GameExPro3\MagicWorld\Saved\Logs\MagicWorld.log` | UE 运行日志，用于调试验证 |

## 调试与日志

- **UE 日志路径**: `G:\GameExPro3\MagicWorld\Saved\Logs\MagicWorld.log`
  - UE 编辑器运行时的所有输出日志（含 LogPython、LogTemp、McpFlask 等）
  - 用于验证 McpFlask 请求、AngelScript 执行结果、C++ 函数调用等
  - 可通过 `Get-Content "G:\GameExPro3\MagicWorld\Saved\Logs\MagicWorld.log" -Tail N` 实时查看

## 技能系统关键文件索引

### AngelScript 核心
- `Script/com/subsystem/SkillManager.as` — 技能管理器（全局子系统）
- `Script/com/ability/MagicAbility.as` — UMagicAbility 基类 + 派生类定义（UMagicPrimary, UMagicPassive, UMagicBall, UMagicStraitBall, UMagicFollow）
- `Script/com/ability/PassiveAbility.as` — 被动技能
- `Script/com/ability/BounceAbility.as` — 弹跳技能
- `Script/com/ability/TrackingAbility.as` — 追踪技能
- `Script/com/ability/SplitAbility.as` — 分裂技能
- `Script/com/ability/RingAbility.as` — 环形技能
- `Script/com/ability/AccelerateAbility.as` — 加速技能
- `Script/com/ability/bulletbehavior/` — 弹道行为工厂（Bounce, Curve, Ring, Split, Accelerate, BounceExplode, Tracking）
- `Script/com/bp/Bullet.as` — ABullet 子弹实体
- `Script/com/da/slill_conf.as` — 技能配置数据结构（FSkillData, FSkillDataInfo, FPoint2D 等）
- `Script/com/da/ui/skill_shop_da.as` — 技能商店 DA

### Lua 运行时
- `Content/Script/com/components/skill_comp.lua` — 技能组件（解锁、装备、技能链初始化）
- `Content/Script/ui/screen/panel_skill_shop.lua` — 技能商店面板
- `Content/Script/ui/screen/panel_skill_screen.lua` — 技能主界面
- `Content/Script/ui/screen/panel_skill_connect.lua` — 技能连接面板
- `Content/Script/ui/screen/skill_inventory.lua` — 技能背包
- `Content/Script/ui/screen/unlocked_skills.lua` — 已解锁技能列表

### 文档
- `Script/.github/doc/System/SkillSystem.md` — 技能系统设计文档
- `Script/.github/agents/skill.agent.md` — 技能 Agent 行为指南

