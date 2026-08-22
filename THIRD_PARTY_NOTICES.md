# Third-party notices

This file lists third-party code and media bundled or loaded by
「We have never existed independently.」

The original application code under `app/` has **no root LICENSE file** as of
this writing. Do not assume the whole repository is MIT or public domain.
See `docs/专题-素材版权与授权.md` (Chinese) for exhibition / publication notes.

This is not legal advice. Verify current terms on each upstream site.

## Runtime libraries (CDN)

- three.js r128 — MIT — https://github.com/mrdoob/three.js
- GLTFLoader.js / OrbitControls.js (three@0.128.0 examples) — MIT
- p5.js 1.4.0 — MIT — https://p5js.org / https://github.com/processing/p5.js

## Vendored JavaScript

- `reference/the-spirit/js/three.r74.min.js` — three.js (older build), MIT
- `reference/hyper-mix/js/three.r74.min.js` — three.js (different r74 build), MIT
- `reference/particle-love/three.r76.min.js` — three.js r76, MIT
- `reference/particle-love/TweenMax.min.js` — GreenSock GSAP 1.x (TweenMax); **GreenSock license, not MIT**
- DataV BorderBox1 port in `app/ui/datav-border-box-1.js` — derived from @jiaminghi/data-view (MIT)

## Embedded visual experiments (see `reference/`)

Used via `window.mountXxx`. Attribution and original licenses remain with
their authors / original pages (The Spirit, Particle Love, Hyper Mix,
noise-flow-field / OpenProcessing, constraint-particles, particle-ring,
repel-particles, etc.).

## Media

- `assets/video/mixkit-flying-in-the-space-between-stars-and-nebulae-32973-hd-ready.mp4` — Mixkit
- `assets/audio/xanthos.mp3` — “Xanthos” by Eugenio Mininni, Mixkit License  
  https://mixkit.co/free-stock-music/xanthos/

## Fonts (restrictive — check before redistributing)

- `assets/fonts/NITEMARE.TTF` — third-party font; embedding terms must be checked
- `assets/fonts/Pixelate-Regular.ttf` — used by the live HUD; license of *this* file
  must be checked (several unrelated fonts share the name)
- `assets/fonts/FZCAOYTJW(1).TTF` — Founder (方正) style font; commercial embedding
  and GitHub redistribution typically require a Founder license

## House model

- `assets/models/less_25mb.glb` — confirm the model contract allows web use
