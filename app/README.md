# NewProject App Framework

13 段沉浸式体验的技术骨架（Vanilla JS，无构建步骤）。

## 当前进度

| 状态 | 内容 |
|------|------|
| ✅ 骨架 | 22 个模块、阶段表、effect/karma 注册 |
| ✅ 已实现 | Stage 0 雪花开场、Stage 1 金刚经、Stage 2 repel + 空心圆、**Stage 3 模型从原点展开（5s）** |
| 🚧 占位 | Stage 4–7 粒子化 / 六圆 / Frequency / karma |
| ⚠️ 资源 | 已从 MyProject 同步至 `NewProject/assets/`（见 `assets/README.md`） |


必须在 HTTP 下打开（`file://` 会导致 GLB / 字体 / 部分效果静默失败）：

```bash
cd D:\NewProject
python -m http.server 8080
```

浏览器访问：`http://localhost:8080/app/index.html`

## 调试

| URL 参数 | 作用 |
|----------|------|
| `?debug=1&stage=N` | 从第 N 段开始（六道是 `stage=11`） |
| `?path=chusheng` | 强制某一道，并直接进入主流程六道段 |
| `?vedana=dukha\|sukha\|upeksha` | 强制受的三态 |
| `?market=mock` | 行情用本地 mock，不请求 CoinGecko |

## 目录

```
app/
├── config/          stages / paths / assets 声明
├── core/            导演、字幕、阻塞、背景视频
├── effects/         effect-registry + three-registry
├── house/           房屋模型阶段（当前为占位）
├── karma/           交互采集(含 wheelDelta)、六道算法、行情、进度条
├── ui/              十字光标、音符、雪花层
├── index.html
└── main.js
```

## 资源

从 `MyProject` 拷贝到 `NewProject/assets/`：

- `models/less_25mb.glb`
- `fonts/`、`video/bg.mp4`
- `particle-love/images/`（六道「天道」必须，否则黑屏）

## 行情（第 7 步 karma）

归道 = **用户行为** + **行情推送累计**（与 `MyProject/test-stream.html` 相同）：

- 雪花点击后连接 **Binance WebSocket**（`btcusdt@ticker`）
- **每收到一条推送**才调用 `tickFromStream` 一次
- `dt` = 距上一条推送的实际秒数（推送间隔可能很长，权重由 dt 自然体现）
- 本地离线调试：`?market=mock`（模拟稀疏推送，不连外网）

## 用户采集字段

`getSummary()`：`clickCount`, `moveDistance`, `scrollDelta`, **`wheelDelta`**, `dwellSeconds`

滚轮并入算法：`activity` 加 `wheel/400`，`chaos` 加 `wheel/800`。

## 效果登记

`mouse-black-hole` 已在 `effect-registry` 登记，**不在**主流程 13 段中挂载。
