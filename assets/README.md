# 资源清单（正赛）

路径相对 `app/index.html` 为 `../assets/...`。更细的版权见 [docs/专题-素材版权与授权.md](../docs/专题-素材版权与授权.md)。  
**不要**用仓库根目录未跟踪的 `fonts/` 或 `sci-fi-score.mp3` 当正赛文件。

## 主流程必需

| 路径 | 用途 |
|------|------|
| `assets/video/mixkit-flying-in-the-space-between-stars-and-nebulae-32973-hd-ready.mp4` | 星空底（六道段视觉上隐藏，仍解码） |
| `assets/models/less_25mb.glb` | 房屋点云 |
| `assets/fonts/NITEMARE.TTF` | 开场 / 台词 / 终章（`SiteFont`） |
| `assets/fonts/Pixelate-Regular.ttf` | 仪表、进度条百分比（主流程要用，不只是 preview） |
| `assets/fonts/FZCAOYTJW(1).TTF` | 金刚经中文（授权见版权专题） |
| `assets/audio/xanthos.mp3` | BGM。开场静音，**点雪花后**循环到 Begin again |
| `assets/favicon.svg` | 标签图标 |
| `assets/logo/Deva.png` 等 + `line.webm` | 面板图标与横线。**缺了仍能走场**（字母 / CSS 条 fallback）。当前仓库里这几份常常不在 |

BGM 来源与 Mixkit 说明：`assets/audio/README.txt`。

## 天道 particle-love 必需

| 路径 | 用途 |
|------|------|
| `reference/particle-love/images/logo.png` | 缺则**静默黑屏** |
| `reference/particle-love/images/motion_blur.png` | 运动模糊 |

## 可选 / 未走主路径

| 路径 | 说明 |
|------|------|
| `assets/audio/note1.wav` … `note6.wav` | 六入；**未提供时**用 Web Audio 合成（当前正赛） |
| `assets/video/dao-*.mp4` | 旧项目六道视频；现用 `reference/` 特效 |
| 根目录 `assets/audio/sci-fi-score.mp3` | 若存在也**不是** `assets.config.js` 里的 bgm |

## 本地验证

```bash
cd D:\NewProject
python -m http.server 8080
```

`http://localhost:8080/app/index.html` — 须 HTTP，勿 `file://`。
