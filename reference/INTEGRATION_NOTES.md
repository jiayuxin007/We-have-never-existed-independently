# 合并到 MyProject 主流程 —— 待办笔记

这份笔记记录各效果在合并时需要处理的点。合并时按各效果的清单逐条过一遍即可。

---

## noise-flow-field —— 六道效果之一

**技术风险：低。** 同样只需要 r128，没有版本冲突。

**合并时要做的事**：
- 直接按 `mountModelMorph32s` 的挂载约定接入即可（`container` + `dispose()`）。
- 注意：这个效果的着色器（5 阶噪声展开两次）在**某台机器上第一次编译**可能有明显卡顿（实测冷启动约 1.3 秒，热启动 40~80ms）。之前问过是否要做预热，你说先不用；如果之后实际体验下来觉得这个首次卡顿比较明显，可以再考虑加一个后台预热（页面刚打开、用户还在看黑洞开场或房屋模型时，偷偷 mount+dispose 一次这个效果，把驱动的着色器缓存焐热）。
- `dispose()` 已经加了 `forceContextLoss()`，反复进出六道不会累积变慢。

**文件位置**：`D:\NewProject\reference\noise-flow-field\noise-flow-field-embed.js`

---

## the-spirit —— 六道效果之一（风险最高，务必按顺序操作）

**技术风险：中。** 这个效果自带 `three.r74.min.js`，和主项目的 r128 不能同时生效，必须严格按顺序切换 `window.THREE`，否则会静默不渲染（每帧报错但不崩溃，容易被忽略）。

**铁律**：谁的渲染循环在跑，`window.THREE` 就必须一直是谁的版本；只有先 `dispose()` 停掉循环，才能切换版本。

**合并时要做的事**：

1. 页面加载时缓存好两个版本的引用（各自只需要缓存一次，之后不用重新拉脚本）：
   ```js
   window.__R128_THREE__ = window.THREE;      // 主项目默认版本，加载完 r128 后立刻存
   // ... 加载 three.r74.min.js ...
   window.__R74_THREE__ = window.THREE;        // 加载完 r74 后立刻存
   window.THREE = window.__R128_THREE__;       // 还原，页面其余部分继续用 r128
   ```
2. 进入 The Spirit 阶段：
   ```js
   window.THREE = window.__R74_THREE__;
   var handle = window.mountTheSpirit({ container });
   ```
3. 离开 The Spirit 阶段（不管下一步是别的六道效果还是回房屋模型）：
   ```js
   handle.dispose();                      // 先停循环
   window.THREE = window.__R128_THREE__;  // 再切回来
   ```
4. **不要**在 The Spirit 渲染循环还在跑的时候动 `window.THREE`，哪怕只是"临时看一眼"。
5. `dispose()` 已经加了 `forceContextLoss()`，支持反复进出，但由于内部有大量单例模块状态（GPGPU 模拟、后处理等不提供释放接口），不建议在同一页面里非常频繁地反复 mount/dispose（正常的"看一次、离开、可能再看一次"没问题，测试过两轮完整循环无报错）。
6. 每次进入都有约 200~270ms 的同步耗时（内部着色器较多：GPGPU 模拟 + Bloom + 运动模糊 + FXAA），目前决定不做特殊处理。

**文件位置**：
- `D:\NewProject\reference\the-spirit\js\the-spirit-embed.js`
- `D:\NewProject\reference\the-spirit\js\three.r74.min.js`（必须配套这个版本，不能换成 r128）
- `D:\NewProject\reference\the-spirit\compat-test.html`（版本切换验证脚本，合并后如果怀疑哪里没切对，可以拿这个脚本重新跑一遍核对）

---

## constraint-particles —— 六道效果之一

**来源**：改编自 "Constraint" WebGL 实验（GPGPU 弹性约束粒子网络：一堆点通过约束线互相牵引，形成不断变形的多面体网络，配反射地面 + Bloom 发光）。原项目已经是纯展示配置（`followMouse=false`，无交互，无 UI），改造前就已确认符合"无按钮无文字"的要求。

**技术风险：中，和 the-spirit 完全一样的模式。** 这个效果和 the-spirit **共用同一份 `three.r74.min.js`**（两个文件 SHA256 完全一致），同样是老式单文件构建，内部用 `instanceof THREE.Camera` 做类型检查、读取调用时刻的全局 `window.THREE`。

**铁律和 the-spirit 一模一样**：谁的渲染循环在跑，`window.THREE` 就必须一直是谁的版本；只有先 `dispose()` 停掉循环，才能切换版本。

**合并时要做的事**：

1. 因为和 the-spirit 用的是同一个 r74 文件，**只需要在页面里加载一次 `three.r74.min.js`**，缓存下来的 `window.__R74_THREE__` 两个效果可以共用：
   ```js
   window.THREE = window.__R74_THREE__;
   var handle = window.mountConstraintParticles({ container });
   // ……展示阶段，不要动 window.THREE ……
   handle.dispose();
   window.THREE = window.__R128_THREE__;
   ```
2. 和 the-spirit 一样，**不建议在同一页面里非常频繁地反复 mount/dispose**（内部子模块是单例闭包，不提供 GPU 资源释放接口）；已加 `forceContextLoss()`，正常的"看一次、离开、可能再看一次"没问题。
3. 原项目依赖一张 `images/normal.jpg`（反射地面法线贴图）用来做水波纹理扰动，这个改造版**没有带这张图**（`reflectedGround.js` 对缺图有 `onload` 兜底，不会阻塞渲染，只是反射面少一点细节纹理）。如果想要更精致的反射效果，之后可以把这张图放到部署目录的 `images/normal.jpg`。
4. 这个效果没有鼠标交互（`followMouse=false`），不需要接 `onMouseMove`。

**文件位置**：
- `D:\NewProject\reference\constraint-particles\js\constraint-particles-embed.js`
- `D:\NewProject\reference\constraint-particles\js\three.r74.min.js`（与 the-spirit 的是同一份文件）
- `D:\NewProject\reference\constraint-particles\compat-test.html`（版本切换验证脚本）

---

## hyper-mix —— 六道效果之一（唯一保留鼠标交互的效果）

**来源**：改编自 Edan Kwan 的公开 WebGL 实验 "Hyper Mix"——GPGPU 体积粒子混合，两种颜色的粒子在弯曲噪声场（curl noise）里互相渗透融合，配 DOF、Bloom、运动模糊、FXAA 后处理。原项目自带 `presentation/` 文件夹（已经是别人调整过的"隐藏 UI 纯展示版"），复用 `app/js/index.js` 编译产物，通过 CSS 隐藏 dat.GUI 面板/logo/说明文字，通过 URL hash 强制指定参数档位。

**和其他三个效果最大的不同：这个效果特意保留了鼠标交互**——拖拽画布可以用 OrbitControls 旋转相机，鼠标位置会通过射线投影影响粒子发射方向。空格键"暂停/继续"这个原版彩蛋已经在 `mount()`/`dispose()` 里屏蔽（用捕获阶段拦截，和原版 `presentation/index.html` 的做法一致），保证动画全程播放不会被误触暂停。

**技术风险：中，和 the-spirit / constraint-particles 同样的 r74 版本隔离模式，但多一条独有的约束。**

1. **版本隔离**：本效果自带的 `three.r74.min.js` 和 the-spirit / constraint-particles 用的**不是同一个文件**（SHA256 不同，`THREE.REVISION` 是 `"74"` 而不是 `"74dev"`），要单独加载、单独缓存一份 `window.__R74_THREE__`，不能和另外两个混用。切换铁律完全一样：谁的渲染循环在跑，`window.THREE` 就必须是谁的版本；只有 `dispose()` 之后才能切换回去。

2. **URL hash 依赖（本效果独有）**：`settings` 模块在 **`hyper-mix-embed.js` 这个 `<script>` 标签被加载执行的那一刻**就会读取一次 `window.location.hash` 来决定粒子数量档位（`amount`）和运动模糊质量。合并时必须在这个 `<script>` 标签**之前**用一段内联脚本设好：
   ```js
   window.location.hash = '#amount=524k&motionBlurQuality=high';
   ```
   注意：这会真实改变浏览器地址栏、产生一条 hash 历史记录。如果主项目自己也用 hash 做路由或状态，需要先确认不冲突；如果担心历史记录堆积，可以考虑改用 `history.replaceState` 代替直接赋值 `location.hash`（我目前的实现沿用了原版最简单的直接赋值方式，还没做这个优化）。

3. **鼠标事件不要冲突**：这个效果自己会监听 `window` 的 `mousemove`（影响粒子发射方向）和 canvas 的 `mousedown`/拖拽（OrbitControls 旋转相机）。如果这个阶段还需要主项目自己的十字光标跟随效果，两者可以共存（十字光标只是视觉层，不影响这里的 `mousemove` 监听），不需要额外接 `onMouseMove` 回调（本模块目前没有暴露这个 opts，因为原版设计就是要"看到"真实鼠标在做什么，不是接管它）。

4. **dat.GUI 面板依然会被创建**（只是通过 CSS 隐藏），`dispose()` 里已经调用了它的 `destroy()` 方法一并清理，不用担心内存泄漏。

**合并时要做的事**：
1. 复用现成的 `window.__R74_THREE__` 缓存模式，但要单独存一份（比如 `window.__R74_THREE_HYPERMIX__`），不要和 the-spirit/constraint-particles 的那份混用。
2. 挂载前先设置 `location.hash`，再加载 `three.r74.min.js` + `hyper-mix-embed.js`。
3. CSS 里加上 `.mobile, .logo, .instruction, .footer, .dg { display: none !important; }`（本效果沿用了原版结构里这几个 class 名的空 div，需要把这几个空 div 也放进页面里，否则模块内部 `document.querySelector(".mobile")` 等会拿到 `null` 报错）。

**文件位置**：
- `D:\NewProject\reference\hyper-mix\js\hyper-mix-embed.js`
- `D:\NewProject\reference\hyper-mix\js\three.r74.min.js`（本效果专属，不与其他效果共用）
- `D:\NewProject\reference\hyper-mix\compat-test.html`（版本切换验证脚本）

---

## particle-love —— 六道效果之一（有个真实踩过的坑）

**来源**：Bruno Simon 风格的公开 WebGL 实验 "Particle Love"——GPGPU 星云状粒子发射器，弯曲噪声场驱动运动，配运动模糊，鼠标位置会吸引/扰动粒子流。源文件（`D:\MyProject\pure-particle-test`）本身就是一个"多 Demo 展示壳"（quality-selector 质量选择、demo 画廊、iframe 加载其他作品），之前已经有人通过 CSS 把整套画廊 UI 隐藏掉，只留背景粒子画布。

**技术风险：中，同样是老版本 Three.js（r76）的版本隔离问题，但多了一个已经踩过的真实的坑。**

1. **版本隔离**：本效果自带 `three.r76.min.js`——注意是 **r76**，和 the-spirit / constraint-particles（r74）、hyper-mix（另一份 r74）都不是同一个版本，四个 r7x 效果里已经出现了三种不同的版本文件，都要分别单独缓存，互不通用。铁律依旧：谁的渲染循环在跑，`window.THREE` 就必须是谁的版本；只有 `dispose()` 之后才能切换。已验证完整的 r128→r76→r128 切换流程无报错。

2. **⚠️ 真实踩过的坑：`images/logo.png` 丢失会导致静默黑屏，且没有任何报错。** 原项目用 quick-loader 加载一张 `images/logo.png`（画廊 Logo）作为整个初始化流程的前置条件，但 quick-loader 的图片加载器**只绑定了 `img.onload`，没有绑定 `img.onerror`**——如果这张图 404，加载流程会永远卡住，导致质量选择按钮的点击事件永远不会被绑定，页面自动模拟的"点击 High 质量"操作变成对着一个没有监听器的按钮空点一下，全程无报错、无异常，只是安安静静地黑屏。**排查这个问题花了不少功夫**，因为所有常规排错手段（`window.onerror`、`console.error` 拦截、检查 WebGL 上下文和扩展支持）都显示一切正常。最后是通过检查本地 HTTP 服务器的访问日志才发现 `images/logo.png` 返回 404。

   **合并时的教训**：拷贝这个效果的文件时，**必须把 `images/` 目录（`logo.png` + `motion_blur.png`）一起拷过去**，只拷 `.js` 文件会导致这个隐蔽的黑屏问题。已经把这个提醒直接写进了 `particle-love-embed.js` 顶部的注释里。

3. **原项目触发渲染的机制比较特殊**：不是"调用即渲染"，而是需要先经过一次"选择画质"的点击流程才会真正创建 WebGLRenderer 并开始渲染。`mountParticleLove()` 内部用一个隐藏的画质选择器 + 自动模拟点击"High"按钮来复刻这个触发流程（`opts.quality` 可选 0/1/2 对应 Low/Medium/High，默认 High）。这个实现细节对外部调用方透明，不需要关心。

4. **和黑洞粒子一样没有额外的 `onMouseMove` 回调**：本效果自己监听 `window` 的 `mousemove` 来驱动粒子流的扰动效果，如果需要同步自定义光标，可以直接复用页面级的 `document.addEventListener('mousemove', ...)`（不冲突，两边都能收到事件）。

**文件位置**：
- `D:\NewProject\reference\particle-love\particle-love-embed.js`（**生产环境用这份，已验证可用**）
- `D:\NewProject\reference\particle-love\three.r76.min.js`（本效果专属版本）
- `D:\NewProject\reference\particle-love\TweenMax.min.js`（GSAP 补间库，效果内部动画依赖，必须一起加载）
- `D:\NewProject\reference\particle-love\images\`（**必须一起拷贝，否则黑屏**）
- `D:\NewProject\reference\particle-love\compat-test.html`（版本切换验证脚本）

### 尝试过把它移植到 r128（去掉版本切换），目前未跑通，留作记录

为了摆脱"进入前切 r76、退出后切回 r128"这套麻烦事，尝试把这个效果整个移植到 r128，过程和结果记录如下（半成品文件已经隔离到 `D:\NewProject\reference\particle-love\experimental-r128-wip\` 子目录里，**不影响主目录下 `particle-love-embed.js` / `index.html` 这套已验证可用的 r76 版本**，生产环境请继续用主目录里的）：

**已经修复、确认有效的 2 个硬性报错**：
1. `geometry.addAttribute` → `geometry.setAttribute`（r128 已彻底删除旧方法，纯机械替换）
2. 粒子拖尾（运动模糊）材质原来是"先 `new MeshPhysicalMaterial()` 再手动改 `.type` 塞入自定义 shader"的手法，在 r128 上会崩溃报 `Cannot set properties of undefined (setting 'value')`——根因是 r128 内部靠 `isMeshPhysicalMaterial` 标记位（而不是 `.type` 字符串）判断要不要刷新 clearcoat/sheen 等新版本才有的 PBR uniform，而原来合并进去的是旧版本、字段更少的 `ShaderLib.standard.uniforms`。改成合并 `ShaderLib.physical.uniforms` 补全字段，并把材质构造从 `.call(this,...)` 老式伪类继承改成 `return new o.ShaderMaterial(...)`（r128 的 Material/EventDispatcher 基类链条已经是 ES6 class，不能再用 `.call()` 硬凑）之后，这个崩溃就消失了。

**卡住的地方**：修完上面两处后不再报错，`canvas` 正确 resize，各项 settings 读出来也都正常，但最终画面是**完全透明的黑屏**（`gl.readPixels` 实测中心区域 RGBA 全是 0）。排查过程排除了 postprocessing（fxaa/motionBlur/vignette 全部禁用依然黑屏）、`autoClear`/`autoClearColor` 状态、`OES_texture_float` 扩展缺失（这个检测只是打日志，不阻断逻辑，WebGL2 本来就原生支持浮点纹理）。场景里最终只有一个 Mesh 被真正加进 scene（就是上面修复过的那个拖尾材质网格，其余粒子/发射器都在离屏 render target 里跑、靠纹理采样喂给这一个网格），怀疑是这个网格 fragment shader 里的 `if (alpha < 0.001) discard;` 提前丢弃了所有像素——说明问题出在更上游某一级离屏渲染阶段，但还没有逐级截屏比对确认具体是哪一级。

**结论**：这次移植验证了我之前分析里预判的"最大不确定区"（PBR 材质的内部分发机制）确实是个真坑，而且修完那个坑之后还有一个更深层、目前没找到根因的问题。**鉴于 r76 原版已经稳定可用，不建议为了省掉版本切换的麻烦继续投入更多时间做这个移植**，除非之后有明确的理由（比如版本隔离方案在实际合并中出了别的问题）。如果之后想继续排查，笔记和半成品代码都留着，思路见 `particle-love-embed-r128.js` 顶部注释。

---

## particle-ring —— 六道效果之一（唯一不是 Three.js 的效果，用的是 p5.js）

**来源**：`D:\参考\sketch1460968`，一个纯 p5.js 2D Canvas 小实验——720 个粒子沿一个圆环均匀分布，各自朝径向扩散并逐渐消散，同时叠加一个从不清空的离屏缓冲区（`pg`）持续累积运动轨迹，最终呈现出一个类似"蒲公英/闪电束"的放射状纹理，中心的圆环本身也带一点随机抖动的描边闪烁。原版是固定 `createCanvas(640, 640)`，没有铺满屏幕。

**技术风险：低，但和其他五个效果的技术栈不同，要单独注意。**

1. **这个效果没有用 Three.js**，本身也不需要和 r128 争抢 `window.THREE`，不存在版本切换问题。但页面需要额外加载一次 `p5.js`（本改造版用的是 `p5@1.4.0`，和源项目一致），只需要全局加载一次，多个用到 p5 的效果（目前只有这一个）可以共用同一份。
2. **用 p5 的实例模式（instance mode）封装**，而不是原版的全局 `setup`/`draw` 写法：`window.mountParticleRing(opts)` 内部 `new p5(sketchFn, opts.container)`，不污染全局命名空间，`dispose()` 直接调用 p5 实例自带的 `.remove()`（会自动停掉内部的动画循环、移除 canvas、解绑内部事件监听），不需要像 Three.js 那几个效果一样手动追踪 `requestAnimationFrame` id 或调用 `forceContextLoss()`（p5 默认用 2D Canvas 渲染，不占用 WebGL 上下文，多次进出没有上下文数量限制的顾虑）。
3. **16:9 全屏（cover 模式）**：画布内部尺寸始终维持 16:9 比例，按视口等比放大铺满（超宽屏会裁切左右，偏高屏会裁切上下），容器用 flex 居中 + `overflow: hidden`。粒子扩散边界为完整 16:9 矩形（`boundX = width/2`，`boundY = height/2`），横向也会充分展开。圆环半径 `r` 仍按画布较短边缩放（`Math.min(width, height) * 0.08`）。
4. **调试这个效果时要注意：如果浏览器标签页不在前台/失去焦点，`requestAnimationFrame` 会被浏览器整体节流甚至完全暂停**，此时用自动化脚本读取 canvas 像素会看到画面卡在很早期的稀疏状态（甚至完全黑屏、`frameCount` 长期停在 0），这不是代码问题，只是标签页没有真正在跑动画循环；正常用户在前台浏览时不会遇到这个情况。
5. **保留了原版仅有的两个键盘快捷键**（没有可见按钮/文字，纯键盘触发，符合"无交互按钮"的要求）：按 `s` 保存当前画面为图片（`p.save()`，会触发浏览器下载，合并到主项目时如果不需要这个功能，可以直接删掉 `p.keyPressed` 里对应的分支）；按 `r` 让所有粒子瞬间回到圆环重新开始扩散（原地重置，不重新创建 canvas，比全屏 resize 触发的重置更轻量）。
6. `windowResized` 会重新创建离屏缓冲区 `pg` 并调用 `initParticles()`，也就是说**每次浏览器窗口尺寸变化，之前累积的运动轨迹会被清空、粒子回到圆环重新开始**——这是没法避免的（`pg` 缓冲区尺寸必须匹配新的画布尺寸，没法保留旧内容），对于全屏沉浸式的使用场景（用户进入这个"六道"阶段之后一般不会主动拖拽调整窗口）影响很小。

**合并时要做的事**：
1. 确保页面加载过一次 `p5.js`（CDN 或本地拷贝均可），再加载 `particle-ring-embed.js`。
2. 按统一约定调用：
   ```js
   var handle = window.mountParticleRing({ container: document.getElementById('particleRingWrap') });
   // ……展示阶段……
   handle.dispose();
   ```
3. 容器建议用全屏定位（`position: fixed; inset: 0;`），CSS 里给 `canvas` 加 `display: block`，避免默认 inline 元素基线对齐产生的几像素缝隙。
4. 这个效果没有 `onMouseMove` 回调（原版本身也没有任何鼠标交互），不需要接十字光标同步。

**文件位置**：
- `D:\NewProject\reference\particle-ring\particle-ring-embed.js`
- `D:\NewProject\reference\particle-ring\index.html`（独立预览用，演示如何调用 `mountParticleRing`）

---

## mouse-black-hole —— 六道效果之一（p5.js，来源 sketch2968160）

**来源**：`D:\参考\源码\sketch2968160.zip`。p5.js 鼠标黑洞，与主流程开场无关。

**技术栈**：p5.js 2D Canvas，实例模式 `window.mountMouseBlackHole(opts)` / `dispose()`。不占用 WebGL，不涉及 `window.THREE` 切换。

**交互**：鼠标移动激活黑洞并跟随；点击释放被吞噬的粒子。16:9 cover 全屏；鼠标未移动前不显示黑洞（改进原版 p5 加载即居中的行为）。

**文件位置**：
- `D:\NewProject\reference\mouse-black-hole\mouse-black-hole-embed.js`
- `D:\NewProject\reference\mouse-black-hole\index.html`

---

## repel-particles —— 六道效果之一（p5.js，来源 sketch2960941）

**来源**：`D:\参考\源码\sketch2960941.zip`。旋转粒子球 + 鼠标圆形排斥，散开后弹簧回弹重组。

**技术栈**：p5.js 2D Canvas，`window.mountRepelParticles(opts)` / `dispose()`。不占用 WebGL，不涉及 `window.THREE` 切换。

**交互**：鼠标移动激活排斥场并跟随；未移动前粒子仅旋转不排斥。16:9 cover 全屏。默认 19000 粒子（`opts.particleCount` 可调）。

**文件位置**：
- `D:\NewProject\reference\repel-particles\repel-particles-embed.js`
- `D:\NewProject\reference\repel-particles\index.html`

---

## 通用约定（六个效果共用）

- 挂载方式统一：`window.mountXxx(opts)` → 返回 `{ dispose: function }`，和 `js/model-morph-32s-embed.js` 里 `mountModelMorph32s` 的写法一致。
- `opts.container`：承载 canvas 的容器元素。
- `opts.onMouseMove(x, y)`：转发页面坐标系的鼠标位置，用于同步自定义光标（p5.js 的 particle-ring 没有这个回调，原版本身无鼠标交互）。
- 以后新做的效果，也统一存到 `D:\NewProject\reference\<效果名>\` 下，一个效果一个文件夹。
- 如果新效果也依赖老版 Three.js（r7x 系列），优先检查是不是能直接复用已有效果的版本文件（先比对 SHA256 是否相同）：目前已经出现了三种互不相同的版本——the-spirit / constraint-particles 共用一份 r74（"74dev"），hyper-mix 用另一份 r74（"74"），particle-love 用 r76。四个效果对应四份不同的版本管理，合并时要用四个不同的缓存变量名区分（比如 `window.__R74_THREE_SPIRIT__`、`window.__R74_THREE_HYPERMIX__`、`window.__R76_THREE_PARTICLELOVE__`），不要混用。particle-ring 是唯一的例外，用的是 p5.js，不涉及 `window.THREE`。
- 如果新效果挂载后黑屏但没有任何报错，优先怀疑是不是漏拷贝了图片/字体等静态资源（参考 particle-love 踩过的 `images/logo.png` 坑）——很多老项目的资源加载器只处理成功回调，不处理失败回调，资源丢失会导致初始化流程静默卡死，而不是报错。
- 六道效果目前共 8 个：`noise-flow-field`、`the-spirit`、`constraint-particles`、`hyper-mix`、`particle-love`、`particle-ring`、`mouse-black-hole`、`repel-particles`。
