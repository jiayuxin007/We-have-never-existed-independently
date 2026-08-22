# App

主流程入口：`app/index.html`（须 HTTP，勿 `file://`）。

**完整技术说明在仓库 `docs/`，不要以本文件旧进度表为准。** 现为十五段（id 0–14），房屋与六道均已接入，BGM 为点雪花后的 `xanthos.mp3`，行情为币安 `btcusdt@ticker`（不是 CoinGecko）。

```bash
cd D:\NewProject
python -m http.server 8080
```

打开 `http://localhost:8080/app/index.html`。文档目录：[`docs/README.md`](../docs/README.md)。
