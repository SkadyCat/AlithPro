"""
ComfyUI API — 批量生成 MagicWorld 600 技能图标 (基于 skill-catalog.json)
模型: handpaintedRPGIcons_v1 (trigger: rpgicondiff)
512x512, 25 steps, euler_ancestral, cfg 7.5

用法:
  python generate-catalog-icons.py                # 全量生成
  python generate-catalog-icons.py --type passive  # 只生成辅助石
  python generate-catalog-icons.py --type primary  # 只生成主技能
  python generate-catalog-icons.py --cat split     # 只生成某分类
  python generate-catalog-icons.py --skip 200      # 跳过前200个（断点续传）
  python generate-catalog-icons.py --dry-run       # 预览不执行
"""
import json
import urllib.request
import urllib.error
import time
import sys
import os
import argparse

COMFYUI_URL = "http://127.0.0.1:8188"
NEGATIVE_PROMPT = "text, watermark, signature, blurry, low quality, deformed, ugly, border, frame, photo, realistic, 3d render, multiple objects, split image"

# ── 分类关键词映射 → 用于增强prompt的视觉描述 ──

CAT_VISUAL_HINTS = {
    "trajectory": "a glowing projectile with a dynamic flight trail, motion path magic",
    "split": "a shattering projectile splitting into multiple fragments, explosion burst magic",
    "element": "an enchanted magical element rune with elemental energy swirl, enchantment magic",
    "speed": "a streaking fast-moving energy bolt with speed lines, velocity boost magic",
    "range": "a far-reaching energy beam extending across distance, long range projection magic",
    "duration": "a glowing hourglass with persistent magical aura, time extension magic",
    "damage": "a powerful destructive energy impact with sharp edges, critical damage magic",
    "effect": "a swirling magical effect aura with particle sparks, status effect magic",
    "defense": "a shining protective shield barrier with magical runes, defense ward magic",
    "control": "a binding magical chain or restraint with control runes, crowd control magic",
}

FORM_VISUAL_HINTS = {
    "projectile": "a flying magical projectile energy ball, projectile spell",
    "ground_target": "a magical targeting circle on the ground with runes, area spell",
    "persistent_zone": "a swirling persistent magical field zone, sustained area magic",
    "melee": "a close combat magical weapon strike with energy slash, melee spell",
    "summon": "a summoned magical creature or entity emerging from a portal, summon spell",
    "aura": "concentric magical rings radiating outward energy, aura buff spell",
    "self_buff": "a glowing self-enhancement magical shield, self buff spell",
    "channeling": "concentrated magical energy beam being channeled through hands, channel spell",
    "dash": "a swift magical dash movement blur trail, dash spell",
    "trap": "a hidden magical trap device with trigger runes on ground, trap spell",
}

ELEM_VISUAL_HINTS = {
    "fire": "fiery orange and red flames, fire magic",
    "ice": "frost blue ice crystals and cold mist, ice magic",
    "thunder": "crackling golden lightning bolts, thunder magic",
    "poison": "toxic green bubbling poison, poison magic",
    "water": "flowing azure water streams, water magic",
    "dark": "shadowy dark purple energy, dark magic",
    "light": "radiant golden holy light, light magic",
    "wind": "swirling grey-blue wind vortex, wind magic",
    "earth": "solid brown rocky earth energy, earth magic",
    "void": "ethereal pink-purple void rift, void magic",
}


def build_prompt(positive_text, negative_text, seed, filename_prefix):
    """构建 ComfyUI API prompt"""
    return {
        "prompt": {
            "1": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {"ckpt_name": "handpaintedRPGIcons_v1.safetensors"}
            },
            "2": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": positive_text, "clip": ["1", 1]}
            },
            "3": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": negative_text, "clip": ["1", 1]}
            },
            "4": {
                "class_type": "EmptyLatentImage",
                "inputs": {"width": 512, "height": 512, "batch_size": 1}
            },
            "5": {
                "class_type": "KSampler",
                "inputs": {
                    "model": ["1", 0], "positive": ["2", 0],
                    "negative": ["3", 0], "latent_image": ["4", 0],
                    "seed": seed, "control_after_generate": "fixed",
                    "steps": 25, "cfg": 7.5,
                    "sampler_name": "euler_ancestral",
                    "scheduler": "normal", "denoise": 1.0
                }
            },
            "6": {
                "class_type": "VAEDecode",
                "inputs": {"samples": ["5", 0], "vae": ["1", 2]}
            },
            "7": {
                "class_type": "SaveImage",
                "inputs": {"images": ["6", 0], "filename_prefix": filename_prefix}
            }
        }
    }


def make_prompt_text(skill, skill_type):
    """根据技能特征生成增强的AIGC prompt"""
    parts = ["rpgicondiff"]

    name_cn = skill.get("skillName", "")
    class_name = skill.get("className", "")

    if skill_type == "primary":
        # 主技能: 使用元素+形态
        elem = (skill.get("elementTypes") or [""])[0]
        ft = skill.get("formType", "")
        if elem and elem in ELEM_VISUAL_HINTS:
            parts.append(ELEM_VISUAL_HINTS[elem])
        if ft and ft in FORM_VISUAL_HINTS:
            parts.append(FORM_VISUAL_HINTS[ft])
        parts.append(f"a powerful {class_name} spell icon")
    else:
        # 辅助石: 使用分类
        cat = skill.get("category", "")
        if cat and cat in CAT_VISUAL_HINTS:
            parts.append(CAT_VISUAL_HINTS[cat])
        parts.append(f"a {cat} passive stone icon named {name_cn}")

        # 从nodeProps提取额外视觉线索
        np = skill.get("nodeProps", {})
        if np:
            elem_type = np.get("elementType", "")
            if elem_type and elem_type in ELEM_VISUAL_HINTS:
                parts.append(ELEM_VISUAL_HINTS[elem_type])
            ctrl_type = np.get("controlType", "")
            if ctrl_type:
                parts.append(f"{ctrl_type} effect")
            traj_type = np.get("trajectoryType", "")
            if traj_type:
                parts.append(f"{traj_type} trajectory path")

    # callWords 中可能有额外关键词
    cw = skill.get("callWords", "")
    if cw:
        # 提取有用部分（去掉 "moba game icon, passive stone, " 前缀）
        cw_parts = [p.strip() for p in cw.split(",")]
        # 跳过通用前缀，取最后的中文名和分类名
        for p in cw_parts[2:]:
            if p and len(p) > 1:
                parts.append(p)

    parts.append("fantasy RPG skill icon, hand painted style, dark background, game UI icon, high contrast, centered composition")
    return ", ".join(parts)


def queue_prompt(prompt_data):
    """向 ComfyUI 提交生成任务"""
    data = json.dumps(prompt_data).encode('utf-8')
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())
    except urllib.error.URLError as e:
        print(f"  [ERROR] Cannot connect to ComfyUI: {e}")
        return None


def wait_for_completion(prompt_id, timeout=300):
    """等待生成任务完成"""
    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = urllib.request.urlopen(f"{COMFYUI_URL}/history/{prompt_id}")
            history = json.loads(resp.read())
            if prompt_id in history:
                return history[prompt_id]
        except:
            pass
        time.sleep(2)
    return None


def main():
    parser = argparse.ArgumentParser(description="批量生成技能图标 (ComfyUI)")
    parser.add_argument("--type", choices=["primary", "passive"], help="只生成某类型")
    parser.add_argument("--cat", help="只生成某分类 (如 split, trajectory)")
    parser.add_argument("--skip", type=int, default=0, help="跳过前N个（断点续传）")
    parser.add_argument("--limit", type=int, default=0, help="最多生成N个")
    parser.add_argument("--dry-run", action="store_true", help="预览prompt不执行")
    parser.add_argument("--catalog", default=None, help="skill-catalog.json路径")
    args = parser.parse_args()

    # 定位 catalog
    catalog_path = args.catalog
    if not catalog_path:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        # 尝试多个位置
        candidates = [
            os.path.join(script_dir, "..", "application", "public", "skill-catalog.json"),
            os.path.join(script_dir, "public", "skill-catalog.json"),
        ]
        for c in candidates:
            if os.path.exists(c):
                catalog_path = c
                break
    if not catalog_path or not os.path.exists(catalog_path):
        print("[ERROR] skill-catalog.json not found. Use --catalog to specify path.")
        sys.exit(1)

    print(f"[INFO] Loading catalog: {catalog_path}")
    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    # 构建任务列表
    tasks = []
    for s in catalog.get("primaries", []):
        s["_type"] = "primary"
        tasks.append(s)
    for s in catalog.get("passives", []):
        s["_type"] = "passive"
        tasks.append(s)

    # 过滤
    if args.type:
        tasks = [t for t in tasks if t["_type"] == args.type]
    if args.cat:
        tasks = [t for t in tasks if t.get("category", "") == args.cat or t.get("formType", "") == args.cat]

    # 跳过+限制
    tasks = tasks[args.skip:]
    if args.limit:
        tasks = tasks[:args.limit]

    total = len(tasks)
    print(f"[INFO] Total tasks: {total} (skip={args.skip}, limit={args.limit or 'none'})")

    if args.dry_run:
        print(f"\n--- DRY RUN: showing first 5 prompts ---\n")
        for i, t in enumerate(tasks[:5]):
            prompt = make_prompt_text(t, t["_type"])
            prefix = f"skill_{t['_type']}_{t['className']}"
            print(f"[{i+1}] {t['className']} ({t['skillName']})")
            print(f"  prefix: {prefix}")
            print(f"  prompt: {prompt[:200]}...")
            print()
        print(f"... and {max(0, total - 5)} more.")
        return

    # 检查 ComfyUI
    try:
        urllib.request.urlopen(f"{COMFYUI_URL}/system_stats")
        print("[OK] ComfyUI is running")
    except:
        print("[ERROR] ComfyUI is not running at", COMFYUI_URL)
        print("  Start: cd AIGC\\application\\ComfyUI && python main.py --listen 127.0.0.1 --port 8188 --disable-cuda-malloc")
        sys.exit(1)

    # 输出目录
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ComfyUI", "output")
    os.makedirs(output_dir, exist_ok=True)

    success = 0
    failed = []

    print(f"\n[START] Generating {total} skill icons...\n")

    for i, skill in enumerate(tasks, 1):
        class_name = skill["className"]
        skill_type = skill["_type"]
        prefix = f"skill_{skill_type}_{class_name}"
        seed = skill.get("assetId", 10000 + i) % 999999 + 1000

        prompt_text = make_prompt_text(skill, skill_type)

        print(f"[{i}/{total}] {class_name} ({skill['skillName']}) — {skill_type}/{skill.get('category','') or skill.get('formType','')}")

        prompt_data = build_prompt(prompt_text, NEGATIVE_PROMPT, seed, prefix)

        result = queue_prompt(prompt_data)
        if not result:
            print(f"  [FAIL] Failed to queue")
            failed.append(class_name)
            continue

        prompt_id = result.get("prompt_id")
        history = wait_for_completion(prompt_id)
        if history:
            outputs = history.get("outputs", {})
            for node_id, output in outputs.items():
                if "images" in output:
                    for img in output["images"]:
                        print(f"  [OK] {img['filename']}")
                        success += 1
        else:
            print(f"  [TIMEOUT] Generation timed out")
            failed.append(class_name)

    print(f"\n{'='*60}")
    print(f"[DONE] {success}/{total} icons generated successfully")
    if failed:
        print(f"[FAILED] {len(failed)}: {', '.join(failed[:20])}{'...' if len(failed)>20 else ''}")
    print(f"[OUTPUT] {output_dir}")

    # 写入清单
    manifest_path = os.path.join(output_dir, "catalog_icons_manifest.json")
    manifest = []
    for skill in tasks:
        class_name = skill["className"]
        skill_type = skill["_type"]
        manifest.append({
            "className": class_name,
            "skillName": skill["skillName"],
            "type": skill_type,
            "category": skill.get("category", skill.get("formType", "")),
            "file": f"skill_{skill_type}_{class_name}_00001_.png"
        })
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"[MANIFEST] {manifest_path}")


if __name__ == "__main__":
    main()
