# AIGC 与 Civitai 使用指南

## 概述

本文档记录了 AIGC 工作区中使用 Civitai 平台下载模型的策略，以及通过本地代理访问外网资源的配置方法。

## Civitai 平台

- 官网：https://civitai.com/
- 开发者 API：https://developer.civitai.com/docs/category/api
- 提供 Stable Diffusion 系列模型（checkpoints、LoRA、VAE、embeddings 等）

## API Key 获取

1. 登录 Civitai 账号
2. 进入 Account Settings → API Keys
3. 创建新的 API Key 并妥善保存（不要提交到代码仓库）

## 代理配置

本机代理端口为 `7897`，需要在访问外网时配置：

### 环境变量方式

```powershell
$env:HTTP_PROXY = "http://127.0.0.1:7897"
$env:HTTPS_PROXY = "http://127.0.0.1:7897"
```

### Python requests 方式

```python
proxies = {
    "http": "http://127.0.0.1:7897",
    "https": "http://127.0.0.1:7897"
}
requests.get(url, headers=headers, proxies=proxies)
```

### Git 代理

```bash
git config --global http.proxy http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897
```

## 模型下载方式

### 方式一：civitai-dl CLI（推荐）

```powershell
pip install civitai-dl
# 设置代理后下载
$env:HTTPS_PROXY = "http://127.0.0.1:7897"
civitai-dl download model <model_id> --dir application\ComfyUI\models\checkpoints
```

### 方式二：直接 API 下载

```powershell
$apiKey = "YOUR_API_KEY"
$modelUrl = "https://civitai.com/api/download/models/<version_id>?token=$apiKey"
Invoke-WebRequest -Uri $modelUrl -OutFile "model.safetensors" -Proxy "http://127.0.0.1:7897"
```

### 方式三：浏览器手动下载

配置浏览器代理为 `127.0.0.1:7897`，直接从 Civitai 网页下载。

## 模型存放目录

下载的模型按类型放入 ComfyUI 对应目录：

| 模型类型 | 目录 |
|---------|------|
| Checkpoint | `application/ComfyUI/models/checkpoints/` |
| LoRA | `application/ComfyUI/models/loras/` |
| VAE | `application/ComfyUI/models/vae/` |
| ControlNet | `application/ComfyUI/models/controlnet/` |
| Embedding | `application/ComfyUI/models/embeddings/` |
| Upscaler | `application/ComfyUI/models/upscale_models/` |

## 安全注意事项

- 优先下载 `.safetensors` 格式，避免 `.ckpt`（后者存在代码执行风险）
- API Key 不要硬编码在脚本中，使用环境变量 `$env:CIVITAI_API_KEY`
- 批量下载时建议并行连接数不超过 8，避免被限流
- 在非高峰时段下载可获得更好的速度

## 推荐的入门模型

- **SDXL 系列**：适合高质量图像生成，需 8GB+ VRAM
- **SD 1.5 系列**：兼容性好，4GB VRAM 即可运行
- **Flux 系列**：新一代架构，质量优秀但资源需求较高

当前环境（RTX 4070 Ti 12GB）可流畅运行 SDXL 及大部分 Flux 模型。
