"""
ComfyUI API — 批量生成 MagicWorld 全部技能图标
模型: handpaintedRPGIcons_v1 (trigger: rpgicondiff)
512x512, 25 steps, euler_ancestral, cfg 7.5

包含:
  - 3 个主技能 (Primary)
  - 11 个现有被动 (Existing Passive)
  - 24 个扩展被动 (Proposed Passive)
  合计 38 张图标
"""
import json
import urllib.request
import urllib.error
import time
import sys
import os

COMFYUI_URL = "http://127.0.0.1:8188"
NEGATIVE_PROMPT = "text, watermark, signature, blurry, low quality, deformed, ugly, border, frame, photo, realistic, 3d render, multiple objects, split image"

# ── 所有技能图标定义 ──────────────────────────────────────────────────────────

SKILL_ICONS = [
    # ═══ Primary Skills (主技能) ═══
    {
        "name": "AbyssalFireRite",
        "cn": "深渊火仪式",
        "category": "primary",
        "prompt": "rpgicondiff, a dark abyssal fire ritual spell icon, swirling crimson and black flames erupting from a runic circle, hellfire magic, fantasy RPG skill icon, hand painted style, ominous glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 1001
    },
    {
        "name": "DeepSeaFrostSoul",
        "cn": "深海霜魂",
        "category": "primary",
        "prompt": "rpgicondiff, a deep sea frost soul spell icon, ethereal ice blue soul energy rising from dark ocean depths, frozen crystal shards, deep water magic, fantasy RPG skill icon, hand painted style, cold blue glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 1002
    },
    {
        "name": "HeavenlyThunder",
        "cn": "天雷",
        "category": "primary",
        "prompt": "rpgicondiff, a heavenly divine thunder spell icon, brilliant golden lightning bolt striking from holy clouds, crackling celestial energy, divine judgment, fantasy RPG skill icon, hand painted style, electric golden glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 1003
    },

    # ═══ Existing Passive Skills (现有被动) ═══

    # 轨迹修改
    {
        "name": "StraightShot",
        "cn": "直射",
        "category": "passive_trajectory",
        "prompt": "rpgicondiff, a straight shot arrow spell icon, a glowing energy bolt flying in a perfect straight line, piercing light trail, precision aim magic, fantasy RPG skill icon, hand painted style, sharp focus, dark background, game UI icon, high contrast, centered composition",
        "seed": 2001
    },
    {
        "name": "Accelerate",
        "cn": "加速",
        "category": "passive_trajectory",
        "prompt": "rpgicondiff, a speed boost spell icon, a blazing fast projectile with motion blur streaks, orange and yellow energy trails, velocity magic, fantasy RPG skill icon, hand painted style, dynamic speed lines, dark background, game UI icon, high contrast, centered composition",
        "seed": 2002
    },
    {
        "name": "CurveHoming",
        "cn": "曲线追踪",
        "category": "passive_trajectory",
        "prompt": "rpgicondiff, a homing missile spell icon, a glowing magic orb curving in an arc toward a target, green tracking energy trails, seeking spell, fantasy RPG skill icon, hand painted style, curved motion path, dark background, game UI icon, high contrast, centered composition",
        "seed": 2003
    },
    {
        "name": "SpiralTracking",
        "cn": "螺旋追踪",
        "category": "passive_trajectory",
        "prompt": "rpgicondiff, a spiral tracking spell icon, a magic projectile spiraling in a helix toward an enemy, purple vortex trail, lock-on targeting magic, fantasy RPG skill icon, hand painted style, spiral energy, dark background, game UI icon, high contrast, centered composition",
        "seed": 2004
    },

    # 弹跳
    {
        "name": "Bounce",
        "cn": "弹射",
        "category": "passive_bounce",
        "prompt": "rpgicondiff, a bouncing projectile spell icon, a glowing energy ball ricocheting between surfaces, multiple bounce arc lines, reflection magic, fantasy RPG skill icon, hand painted style, dynamic bouncing trails, dark background, game UI icon, high contrast, centered composition",
        "seed": 2005
    },

    # 分裂/生成
    {
        "name": "Split",
        "cn": "分裂",
        "category": "passive_split",
        "prompt": "rpgicondiff, a split projectile spell icon, one magic orb splitting into three glowing fragments in a fan shape, fragmentation magic, fantasy RPG skill icon, hand painted style, branching energy trails, dark background, game UI icon, high contrast, centered composition",
        "seed": 2006
    },
    {
        "name": "RingSplit",
        "cn": "环形分裂",
        "category": "passive_split",
        "prompt": "rpgicondiff, a ring formation spell icon, four magic projectiles arranged in a perfect circle pattern, radial energy ring, orbital magic formation, fantasy RPG skill icon, hand painted style, circular glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 2007
    },
    {
        "name": "BounceScatter",
        "cn": "弹射散射",
        "category": "passive_split",
        "prompt": "rpgicondiff, a scatter shot spell icon, a projectile bouncing and releasing multiple smaller shots in all directions, explosive scatter magic, fantasy RPG skill icon, hand painted style, radial burst effect, dark background, game UI icon, high contrast, centered composition",
        "seed": 2008
    },

    # 碰撞/爆炸
    {
        "name": "FireExplosion",
        "cn": "火焰爆炸",
        "category": "passive_explosion",
        "prompt": "rpgicondiff, a fire explosion spell icon, a massive fiery blast with orange and red flames radiating outward, burning ember particles, combustion magic, fantasy RPG skill icon, hand painted style, intense fire glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 2009
    },
    {
        "name": "BounceBlast",
        "cn": "弹射爆破",
        "category": "passive_explosion",
        "prompt": "rpgicondiff, a bounce blast spell icon, a projectile bouncing with electric arc explosions at each impact point, lightning detonation magic, fantasy RPG skill icon, hand painted style, electric blue explosions, dark background, game UI icon, high contrast, centered composition",
        "seed": 2010
    },

    # 位置/召唤
    {
        "name": "SkyDrop",
        "cn": "天降",
        "category": "passive_position",
        "prompt": "rpgicondiff, a sky drop spell icon, a glowing meteor falling vertically from above through clouds, divine bombardment, aerial strike magic, fantasy RPG skill icon, hand painted style, downward impact trail, dark background, game UI icon, high contrast, centered composition",
        "seed": 2011
    },

    # ═══ Proposed Expansion Passives (扩展被动) ═══

    # 穿透/连锁
    {
        "name": "VoidPierce",
        "cn": "虚无穿刺",
        "category": "proposed_pierce",
        "prompt": "rpgicondiff, a void pierce spell icon, a dark purple energy lance passing through multiple enemy silhouettes, phase-through magic, ethereal piercing, fantasy RPG skill icon, hand painted style, ghostly trail, dark background, game UI icon, high contrast, centered composition",
        "seed": 3001
    },
    {
        "name": "LightningChain",
        "cn": "闪电链",
        "category": "proposed_pierce",
        "prompt": "rpgicondiff, a chain lightning spell icon, electric arcs jumping between multiple targets, branching blue white lightning bolts, thunder chain magic, fantasy RPG skill icon, hand painted style, electric connections, dark background, game UI icon, high contrast, centered composition",
        "seed": 3002
    },
    {
        "name": "CausalChain",
        "cn": "因果锁链",
        "category": "proposed_pierce",
        "prompt": "rpgicondiff, a causal chain spell icon, glowing runic chains connecting marked enemies, fate binding magic, purple mystic links, delayed detonation, fantasy RPG skill icon, hand painted style, chain link glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 3003
    },

    # 新星/扩散
    {
        "name": "AnnihilationNova",
        "cn": "毁灭新星",
        "category": "proposed_nova",
        "prompt": "rpgicondiff, an annihilation nova spell icon, a massive radial explosion of energy beams shooting outward in all directions, supernova blast, total destruction magic, fantasy RPG skill icon, hand painted style, bright white and gold burst, dark background, game UI icon, high contrast, centered composition",
        "seed": 3004
    },
    {
        "name": "PulseExpand",
        "cn": "脉冲扩散",
        "category": "proposed_nova",
        "prompt": "rpgicondiff, a pulse expand spell icon, rhythmic energy waves expanding outward from a central orb, concentric pulse rings, sonar-like magic, fantasy RPG skill icon, hand painted style, ripple effect, dark background, game UI icon, high contrast, centered composition",
        "seed": 3005
    },
    {
        "name": "SpatialTear",
        "cn": "空间撕裂",
        "category": "proposed_nova",
        "prompt": "rpgicondiff, a spatial tear spell icon, a crack in reality with dimensional energy pouring through, space-time rift, void shockwave, fantasy RPG skill icon, hand painted style, reality fracture glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 3006
    },

    # 状态效果
    {
        "name": "FrostTouch",
        "cn": "冰封触碰",
        "category": "proposed_status",
        "prompt": "rpgicondiff, a frost touch spell icon, a frozen hand reaching out with ice crystals spreading from fingertips, freezing magic, blue and white frost effect, fantasy RPG skill icon, hand painted style, ice crystal glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 3007
    },
    {
        "name": "SoulCorrosion",
        "cn": "灵魂腐蚀",
        "category": "proposed_status",
        "prompt": "rpgicondiff, a soul corrosion spell icon, dark green toxic energy eating away at a ghostly soul, poison dot magic, corrosive acid dripping, necrotic decay, fantasy RPG skill icon, hand painted style, toxic glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 3008
    },
    {
        "name": "TemporalSlow",
        "cn": "时间减速",
        "category": "proposed_status",
        "prompt": "rpgicondiff, a temporal slow spell icon, a glowing hourglass or clock with blue time distortion waves, slow motion magic, time manipulation, fantasy RPG skill icon, hand painted style, blue temporal glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 3009
    },
    {
        "name": "WeakenCurse",
        "cn": "虚弱诅咒",
        "category": "proposed_status",
        "prompt": "rpgicondiff, a weakness curse spell icon, a dark red cursed skull with downward debuff arrows, vulnerability hex, dark magic debuff, fantasy RPG skill icon, hand painted style, ominous red glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 3010
    },

    # 暴击增强
    {
        "name": "CritChain",
        "cn": "暴击连锁",
        "category": "proposed_crit",
        "prompt": "rpgicondiff, a critical chain spell icon, a crossed sword symbol with explosive chain reaction sparks, critical hit magic, golden burst with branching impacts, fantasy RPG skill icon, hand painted style, golden critical glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 3011
    },
    {
        "name": "DevastatingBlow",
        "cn": "毁灭一击",
        "category": "proposed_crit",
        "prompt": "rpgicondiff, a devastating blow spell icon, a massive fist or weapon crashing down with shockwave, critical smash, overwhelming power strike, fantasy RPG skill icon, hand painted style, red and gold impact glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 3012
    },
    {
        "name": "EnergyDrain",
        "cn": "能量吸取",
        "category": "proposed_crit",
        "prompt": "rpgicondiff, an energy drain spell icon, green life energy flowing from a target into a glowing crystal, vampiric absorption, life steal magic, fantasy RPG skill icon, hand painted style, green healing glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 3013
    },

    # 回旋/特殊轨迹
    {
        "name": "Boomerang",
        "cn": "回旋飞镖",
        "category": "proposed_trajectory",
        "prompt": "rpgicondiff, a boomerang spell icon, a glowing curved throwing weapon in mid-flight with a return arc trail, return throw magic, circular flight path, fantasy RPG skill icon, hand painted style, curved motion trail, dark background, game UI icon, high contrast, centered composition",
        "seed": 3014
    },
    {
        "name": "SpiralTrajectory",
        "cn": "螺旋弹道",
        "category": "proposed_trajectory",
        "prompt": "rpgicondiff, a spiral trajectory spell icon, a magic projectile moving in a wide spiral helix pattern, expanding spiral trail, tornado-like flight, fantasy RPG skill icon, hand painted style, purple spiral glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 3015
    },
    {
        "name": "DimensionalRicochet",
        "cn": "次元弹跳",
        "category": "proposed_trajectory",
        "prompt": "rpgicondiff, a dimensional ricochet spell icon, an energy projectile bouncing off dimensional walls and portals, reality bounce magic, spatial reflection, fantasy RPG skill icon, hand painted style, portal and bounce glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 3016
    },

    # 范围/持续场
    {
        "name": "ScorchedEarth",
        "cn": "灼热地面",
        "category": "proposed_area",
        "prompt": "rpgicondiff, a scorched earth spell icon, burning ground with flames rising from cracked molten earth, fire trail magic, ground ablaze, fantasy RPG skill icon, hand painted style, lava and fire glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 3017
    },
    {
        "name": "GravityWell",
        "cn": "重力井",
        "category": "proposed_area",
        "prompt": "rpgicondiff, a gravity well spell icon, a dark vortex pulling objects inward with distortion rings, gravitational singularity, dark matter magic, fantasy RPG skill icon, hand painted style, dark purple inward pull glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 3018
    },
    {
        "name": "VoidTrap",
        "cn": "虚空陷阱",
        "category": "proposed_area",
        "prompt": "rpgicondiff, a void trap spell icon, a dark magical trap circle on the ground with glowing runes waiting to trigger, mine magic, dormant dark energy, fantasy RPG skill icon, hand painted style, ominous purple trap glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 3019
    },

    # 数值缩放
    {
        "name": "DistanceAmplify",
        "cn": "距离增伤",
        "category": "proposed_scaling",
        "prompt": "rpgicondiff, a distance amplify spell icon, a projectile growing larger and more powerful as it travels far, range power scaling, long range magic, fantasy RPG skill icon, hand painted style, expanding energy trail, dark background, game UI icon, high contrast, centered composition",
        "seed": 3020
    },
    {
        "name": "ChargeEmpower",
        "cn": "蓄力强化",
        "category": "proposed_scaling",
        "prompt": "rpgicondiff, a charge empower spell icon, a glowing energy orb being charged up with crackling power, gathering energy, concentration magic, fantasy RPG skill icon, hand painted style, bright charging glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 3021
    },
    {
        "name": "RapidEscalation",
        "cn": "连发递增",
        "category": "proposed_scaling",
        "prompt": "rpgicondiff, a rapid escalation spell icon, multiple projectiles firing in sequence each bigger than the last, stacking power magic, rapid fire crescendo, fantasy RPG skill icon, hand painted style, escalating energy glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 3022
    },

    # 击杀/终结触发
    {
        "name": "SoulHarvest",
        "cn": "灵魂收割",
        "category": "proposed_kill",
        "prompt": "rpgicondiff, a soul harvest spell icon, a dark scythe reaping glowing soul wisps from a fallen enemy, death magic, soul collection, ghostly green wisps, fantasy RPG skill icon, hand painted style, ethereal soul glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 3023
    },
    {
        "name": "ChainDetonation",
        "cn": "连锁爆破",
        "category": "proposed_kill",
        "prompt": "rpgicondiff, a chain detonation spell icon, sequential explosions triggering one after another in a chain, domino blast magic, cascading fire explosions, fantasy RPG skill icon, hand painted style, sequential explosion glow, dark background, game UI icon, high contrast, centered composition",
        "seed": 3024
    },
]


def build_prompt(positive_text, negative_text, seed, batch_size=1):
    """构建 ComfyUI API prompt"""
    return {
        "prompt": {
            "1": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {
                    "ckpt_name": "handpaintedRPGIcons_v1.safetensors"
                }
            },
            "2": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "text": positive_text,
                    "clip": ["1", 1]
                }
            },
            "3": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "text": negative_text,
                    "clip": ["1", 1]
                }
            },
            "4": {
                "class_type": "EmptyLatentImage",
                "inputs": {
                    "width": 512,
                    "height": 512,
                    "batch_size": batch_size
                }
            },
            "5": {
                "class_type": "KSampler",
                "inputs": {
                    "model": ["1", 0],
                    "positive": ["2", 0],
                    "negative": ["3", 0],
                    "latent_image": ["4", 0],
                    "seed": seed,
                    "control_after_generate": "fixed",
                    "steps": 25,
                    "cfg": 7.5,
                    "sampler_name": "euler_ancestral",
                    "scheduler": "normal",
                    "denoise": 1.0
                }
            },
            "6": {
                "class_type": "VAEDecode",
                "inputs": {
                    "samples": ["5", 0],
                    "vae": ["1", 2]
                }
            },
            "7": {
                "class_type": "SaveImage",
                "inputs": {
                    "images": ["6", 0],
                    "filename_prefix": "skill_icon"
                }
            }
        }
    }


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
        print(f"[ERROR] Cannot connect to ComfyUI: {e}")
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
    # 可选：只生成某个分类
    filter_category = None
    if len(sys.argv) > 1:
        filter_category = sys.argv[1]
        print(f"[FILTER] Only generating category: {filter_category}")

    # 检查 ComfyUI 是否运行
    try:
        urllib.request.urlopen(f"{COMFYUI_URL}/system_stats")
        print("[OK] ComfyUI is running")
    except:
        print("[ERROR] ComfyUI is not running. Start it first:")
        print("  cd application\\ComfyUI && python main.py --listen 127.0.0.1 --port 8188 --disable-cuda-malloc")
        sys.exit(1)

    # 输出目录
    output_dir = os.path.join(os.path.dirname(__file__), "ComfyUI", "output")
    skills_to_gen = SKILL_ICONS
    if filter_category:
        skills_to_gen = [s for s in SKILL_ICONS if filter_category in s["category"]]

    total = len(skills_to_gen)
    success = 0
    failed = []

    print(f"\n[START] Generating {total} skill icons...\n")

    for i, skill in enumerate(skills_to_gen, 1):
        prefix = f"skill_{skill['name']}"
        print(f"[{i}/{total}] {skill['name']} ({skill['cn']}) — {skill['category']}")

        prompt_data = build_prompt(skill["prompt"], NEGATIVE_PROMPT, skill["seed"])
        prompt_data["prompt"]["7"]["inputs"]["filename_prefix"] = prefix

        result = queue_prompt(prompt_data)
        if not result:
            print(f"  [FAIL] Failed to queue")
            failed.append(skill["name"])
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
            failed.append(skill["name"])

    print(f"\n{'='*50}")
    print(f"[DONE] {success}/{total} icons generated successfully")
    if failed:
        print(f"[FAILED] {len(failed)}: {', '.join(failed)}")
    print(f"Output: {output_dir}")

    # 写入清单文件
    manifest_path = os.path.join(output_dir, "skill_icons_manifest.json")
    manifest = []
    for skill in SKILL_ICONS:
        manifest.append({
            "name": skill["name"],
            "cn": skill["cn"],
            "category": skill["category"],
            "file": f"skill_{skill['name']}_00001_.png"
        })
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"[MANIFEST] Written to {manifest_path}")


if __name__ == "__main__":
    main()
