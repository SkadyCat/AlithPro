"""
ComfyUI API 批量生成游戏技能图标
使用 handpaintedRPGIcons_v1 模型生成 RPG 风格技能 icon
"""
import json
import urllib.request
import urllib.error
import time
import sys
import os

COMFYUI_URL = "http://127.0.0.1:8188"

# 技能图标 prompts
SKILL_ICONS = [
    {
        "name": "fireball",
        "prompt": "rpgicondiff, a magical fireball spell icon, blazing orange and red flames swirling in a circle, fantasy RPG skill icon, hand painted style, detailed fire effect, glowing ember particles, dark background, game UI icon, high contrast, centered composition",
        "seed": 42
    },
    {
        "name": "ice_shard",
        "prompt": "rpgicondiff, a frost ice shard spell icon, sharp crystalline ice shards, icy blue and white glow, frozen magic, fantasy RPG skill icon, hand painted style, dark background, game UI icon, high contrast, centered composition",
        "seed": 123
    },
    {
        "name": "lightning_bolt",
        "prompt": "rpgicondiff, a lightning bolt spell icon, bright electric yellow and blue lightning, crackling energy, thunder magic, fantasy RPG skill icon, hand painted style, dark background, game UI icon, high contrast, centered composition",
        "seed": 456
    },
    {
        "name": "healing_aura",
        "prompt": "rpgicondiff, a healing aura spell icon, soft green and golden glow, nature magic, restoration energy, leaves and sparkles, fantasy RPG skill icon, hand painted style, dark background, game UI icon, high contrast, centered composition",
        "seed": 789
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

NEGATIVE_PROMPT = "text, watermark, signature, blurry, low quality, deformed, ugly, border, frame, photo, realistic, 3d render"

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
    """等待生成任务完成（首次加载模型需更长时间）"""
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
    # 检查 ComfyUI 是否运行
    try:
        urllib.request.urlopen(f"{COMFYUI_URL}/system_stats")
        print("[OK] ComfyUI is running")
    except:
        print("[ERROR] ComfyUI is not running. Start it first with start-comfyui.bat")
        sys.exit(1)

    for skill in SKILL_ICONS:
        print(f"\n[GEN] Generating {skill['name']} icon...")
        prompt_data = build_prompt(skill["prompt"], NEGATIVE_PROMPT, skill["seed"])
        prompt_data["prompt"]["7"]["inputs"]["filename_prefix"] = f"skill_{skill['name']}"

        result = queue_prompt(prompt_data)
        if not result:
            print(f"[FAIL] Failed to queue {skill['name']}")
            continue

        prompt_id = result.get("prompt_id")
        print(f"  Queued: {prompt_id}")

        history = wait_for_completion(prompt_id)
        if history:
            outputs = history.get("outputs", {})
            for node_id, output in outputs.items():
                if "images" in output:
                    for img in output["images"]:
                        print(f"  [OK] Saved: {img['filename']}")
        else:
            print(f"  [TIMEOUT] Generation timed out for {skill['name']}")

    print("\n[DONE] All skill icons generated!")
    print(f"Output directory: ComfyUI/output/")

if __name__ == "__main__":
    main()
