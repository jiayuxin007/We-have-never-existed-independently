# NewProject 资源清单

与 `MyProject/assets/` 同结构。路径均相对 `app/index.html`（`../assets/...`）。

## 必需（主流程）

| 路径 | 用途 | 状态 |
|------|------|------|
| `assets/video/mixkit-flying-in-the-space-between-stars-and-nebulae-32973-hd-ready.mp4` | 全站背景视频（六道段除外） | ✅ |
| `assets/models/less_25mb.glb` | 房屋模型 Stage 3–7、9–10 | ✅ |
| `assets/fonts/NITEMARE.TTF` | 英文字幕 / SiteFont | ✅ |
| `assets/fonts/FZCAOYTJW(1).TTF` | 金刚经中文 | ✅ |
| `assets/favicon.svg` | 站点图标 | ✅ |

## 六道「天道」particle-love 专用

| 路径 | 用途 | 状态 |
|------|------|------|
| `reference/particle-love/images/logo.png` | 效果初始化（缺则静默黑屏） | ✅ |
| `reference/particle-love/images/motion_blur.png` | 运动模糊贴图 | ✅ |

（与 MyProject 中 `assets/tesktop/images/` 为同一套图，已同步到 reference 目录供 embed 加载。）

## 可选

| 路径 | 说明 |
|------|------|
| `assets/audio/note1.wav` … `note6.wav` | 第 5 步六圆音符；**未提供时**使用 Web Audio 合成音 |
| `assets/audio/audio.MP3` | MyProject BGM；NewProject 剧本暂不使用 BGM |
| `assets/video/dao-*.mp4` | 旧 MyProject 六道视频；NewProject 用 reference 效果替代 |

## 本地验证

```bash
cd D:\NewProject
python -m http.server 8765
```

打开 `http://localhost:8765/app/index.html` — 应能看到星空背景视频；Stage 3 起需 GLB 正常加载（勿用 `file://`）。
