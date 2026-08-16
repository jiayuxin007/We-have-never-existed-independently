# AE 透明 Logo / Line 导出说明（Chrome 可播）

## 为什么 AE 的 MOV 在 Chrome 里不显示？

Chrome / Edge 的 `<video>` **不支持** AE 常用的透明 MOV 编码，例如：

- QuickTime **Animation**（qtrle + Alpha）← 你现在的文件就是这种
- ProRes 4444 等

Safari 有时能播 MOV，但本项目在 Chrome 里跑，需要 **WebM（VP9 + Alpha）**。

---

## 推荐流程（最稳）

### 第一步：在 After Effects 导出

任选一种（都带透明通道）：

**方案 A — MOV Animation（你现在的做法，导出后再转）**

1. 选中 Composition  
2. `Composition` → `Add to Render Queue`  
3. `Output Module` → `Format: QuickTime`  
4. `Format Options` → `Video Codec: Animation`  
5. 勾选 **RGB + Alpha**（Channels: RGB + Alpha）  
6. 导出 `Deva.mov`、`line.mov` 等  

**方案 B — PNG 序列（质量最高，文件多）**

1. `Output Module` → `Format: PNG Sequence`  
2. 确保 **Channels: RGB + Alpha**  
3. 导出到文件夹  

PNG 序列转 WebM：

```bash
ffmpeg -framerate 30 -i Deva_%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 20 Deva.webm
```

（帧率 `30` 改成你的合成帧率。）

**方案 C — Adobe Media Encoder → WebM（若已安装 VP9 插件）**

- 格式选 **WebM**
- 视频编解码器 **VP9**
- 勾选 **Include Alpha Channel**

---

### 第二步：转成 WebM（Chrome 用）

把 `.mov` 放进本目录，双击运行：

```
convert-for-web.bat
```

或手动（**CRF 20**，比旧版 32 更清晰；可改为 18 更高画质）：

```bash
ffmpeg -y -i Deva.mov -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 20 Deva.webm
ffmpeg -y -i line.mov  -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 20 line.webm
```

---

## 文件命名（与六道对应）

| 文件名 | 道 |
|--------|-----|
| Deva.webm | 天道 |
| Manusya.webm | 人道 |
| Asura.webm | 修罗道 |
| Tiryag.webm | 畜生道 |
| Preta.webm | 饿鬼道 |
| Naraka.webm | 地狱道 |
| line.webm | 分隔动效 |

`.mov` 可保留作 AE 母版；**浏览器实际加载 `.webm`**。

---

## AE 导出检查清单

- [ ] 合成背景 **透明**（不要纯色背景层，除非故意要底）  
- [ ] 导出带 **Alpha 通道**  
- [ ] Logo 尺寸适中（当前约 95×54，可略大）  
- [ ] 转成 `.webm` 后强刷页面（Ctrl+F5）
