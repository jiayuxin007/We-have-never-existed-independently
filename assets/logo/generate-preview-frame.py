"""Generate preview frame WebMs (430x505, 5s loop, VP9 alpha).

Usage:
  python generate-preview-frame.py           # all variants
  python generate-preview-frame.py scan      # one variant
"""
import math
import struct
import subprocess
import sys
import zlib
from pathlib import Path

W, H = 430, 505
FPS = 30
DUR = 5
FRAMES = FPS * DUR
ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "_frame_frames"

VARIANTS = ("hud", "scan", "circuit", "hex", "glitch")


def write_png(path, w, h, rgba):
    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    raw = b"".join(b"\x00" + rgba[y * w * 4 : (y + 1) * w * 4] for y in range(h))
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", zlib.compress(raw, 9)))
        f.write(chunk(b"IEND", b""))


def blend(dst, x, y, r, g, b, a):
    if x < 0 or y < 0 or x >= W or y >= H:
        return
    i = (y * W + x) * 4
    da = dst[i + 3] / 255.0
    sa = a / 255.0
    out_a = sa + da * (1 - sa)
    if out_a <= 0:
        return
    for c, sc in zip(range(3), (r, g, b)):
        val = int((sc * sa + dst[i + c] * da * (1 - sa)) / out_a)
        dst[i + c] = max(0, min(255, val))
    dst[i + 3] = max(0, min(255, int(out_a * 255)))


def draw_line(dst, x0, y0, x1, y1, r, g, b, a, thickness=2):
    steps = max(abs(x1 - x0), abs(y1 - y0), 1) * 2
    for s in range(steps + 1):
        t = s / steps
        x = int(round(x0 + (x1 - x0) * t))
        y = int(round(y0 + (y1 - y0) * t))
        half = thickness // 2
        for dx in range(-half, half + 1):
            for dy in range(-half, half + 1):
                blend(dst, x + dx, y + dy, r, g, b, a)


def corner_bracket(dst, x, y, hx, hy, r, g, b, a, arm=52, thick=2):
    draw_line(dst, x, y, x + hx * arm, y, r, g, b, a, thick)
    draw_line(dst, x, y, x, y + hy * arm, r, g, b, a, thick)


def chamfer_corner(dst, x, y, hx, hy, r, g, b, a, size=18, thick=2):
    draw_line(dst, x, y, x + hx * size, y, r, g, b, a, thick)
    draw_line(dst, x, y, x, y + hy * size, r, g, b, a, thick)
    draw_line(dst, x + hx * size, y, x + hx * (size + 10), y + hy * 10, r, g, b, a, thick)
    draw_line(dst, x, y + hy * size, x + hx * 10, y + hy * (size + 10), r, g, b, a, thick)


def border_rect(dst, inset, r, g, b, a, thick=1):
    for t in range(thick):
        i = inset + t
        for x in range(i, W - i):
            blend(dst, x, i, r, g, b, a)
            blend(dst, x, H - 1 - i, r, g, b, a)
        for y in range(i, H - i):
            blend(dst, i, y, r, g, b, a)
            blend(dst, W - 1 - i, y, r, g, b, a)


def draw_scan_beam(dst, y, r, g, b, a, height=3):
    for dy in range(-height, height + 1):
        yy = y + dy
        if yy < 0 or yy >= H:
            continue
        fade = max(0, 1 - abs(dy) / (height + 0.5))
        for x in range(10, W - 10):
            blend(dst, x, yy, r, g, b, int(a * fade))


def draw_node(dst, cx, cy, r, g, b, a, radius=2):
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx * dx + dy * dy <= radius * radius + 0.5:
                blend(dst, cx + dx, cy + dy, r, g, b, a)


def render_hud(t):
    pulse = 0.55 + 0.35 * math.sin(2 * math.pi * t / 5)
    pulse2 = 0.35 + 0.22 * math.sin(2 * math.pi * t / 2.5 + 0.8)
    rgba = bytearray(W * H * 4)
    border_a = int(70 + 45 * math.sin(2 * math.pi * t / 5))
    for x in range(W):
        for y in range(H):
            if x < 12 or y < 12 or x >= W - 12 or y >= H - 12:
                if x < 14 or y < 14 or x >= W - 15 or y >= H - 15:
                    blend(rgba, x, y, 40, 151, 134, border_a)
    ca = int(180 * pulse)
    for args in (
        (14, 14, 1, 0), (14, 14, 0, 1), (W - 15, 14, -1, 0), (W - 15, 14, 0, 1),
        (14, H - 15, 1, 0), (14, H - 15, 0, -1), (W - 15, H - 15, -1, 0), (W - 15, H - 15, 0, -1),
    ):
        corner_bracket(rgba, *args, 142, 202, 230, ca)
    tick_a = int(120 * pulse2)
    for dx in range(46):
        blend(rgba, 192 + dx, 8, 83, 99, 89, tick_a)
        blend(rgba, 192 + dx, H - 9, 83, 99, 89, tick_a)
    return rgba


def render_scan(t):
    rgba = bytearray(W * H * 4)
    pulse = 0.5 + 0.5 * math.sin(2 * math.pi * t / 5)
    scan_y = int((t / DUR) * (H - 30)) + 15
    border_a = int(55 + 35 * math.sin(2 * math.pi * t / 3))
    border_rect(rgba, 8, 40, 151, 134, border_a, 1)
    border_rect(rgba, 10, 142, 202, 230, int(90 * pulse), 1)

    for args in (
        (12, 12, 1, 1), (W - 13, 12, -1, 1), (12, H - 13, 1, -1), (W - 13, H - 13, -1, -1),
    ):
        chamfer_corner(rgba, *args, 142, 202, 230, int(200 * pulse), 18, 2)

    draw_scan_beam(rgba, scan_y, 142, 202, 230, int(150 * pulse), 4)
    draw_scan_beam(rgba, scan_y, 40, 151, 134, int(80 * pulse), 1)

    for i in range(8):
        yy = 40 + i * 52
        blink = int(160 * (0.4 + 0.6 * math.sin(2 * math.pi * t / 1.2 + i)))
        draw_node(rgba, 6, yy, 142, 202, 230, blink, 1)
        draw_node(rgba, W - 7, yy + 18, 40, 151, 134, blink, 1)

    col_x = 22
    for i in range(14):
        bit = int((t * 8 + i) % 2)
        if bit:
            blend(rgba, col_x, 28 + i * 14, 142, 202, 230, int(90 * pulse))

    for dx in range(60):
        x = 180 + dx
        a = int(100 * (0.5 + 0.5 * math.sin(2 * math.pi * (dx / 60 + t / 2))))
        blend(rgba, x, 6, 83, 99, 89, a)
        blend(rgba, x, H - 7, 83, 99, 89, a)
    return rgba


def render_circuit(t):
    rgba = bytearray(W * H * 4)
    pulse = 0.45 + 0.55 * math.sin(2 * math.pi * t / 5)
    border_rect(rgba, 9, 40, 151, 134, int(65 + 30 * pulse), 2)

    top_pts = [(30, 12), (120, 12), (210, 12), (300, 12), (390, 12)]
    right_pts = [(418, 40), (418, 120), (418, 200), (418, 280), (418, 360), (418, 440)]
    bottom_pts = [(390, 493), (300, 493), (210, 493), (120, 493), (30, 493)]
    left_pts = [(12, 440), (12, 360), (12, 280), (12, 200), (12, 120), (12, 40)]

    def trace(points, r, g, b, a):
        for i in range(len(points) - 1):
            draw_line(rgba, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], r, g, b, a, 1)
        for px, py in points:
            draw_node(rgba, px, py, r, g, b, int(a * 0.8), 2)

    trace(top_pts, 142, 202, 230, int(150 * pulse))
    trace(right_pts, 40, 151, 134, int(120 * pulse))
    trace(bottom_pts, 142, 202, 230, int(130 * pulse))
    trace(left_pts, 83, 99, 89, int(110 * pulse))

    all_pts = top_pts + right_pts + bottom_pts + left_pts
    idx = int((t / DUR) * len(all_pts)) % len(all_pts)
    nxt = (idx + 1) % len(all_pts)
    p0 = all_pts[idx]
    p1 = all_pts[nxt]
    frac = (t / DUR * len(all_pts)) % 1
    cx = int(p0[0] + (p1[0] - p0[0]) * frac)
    cy = int(p0[1] + (p1[1] - p0[1]) * frac)
    draw_node(rgba, cx, cy, 255, 255, 255, int(220 * pulse), 3)
    draw_node(rgba, cx, cy, 142, 202, 230, int(120 * pulse), 6)

    for x in range(16, W - 16, 12):
        for y in (14, H - 15):
            if (x // 12 + y) % 3 == int(t * 4) % 3:
                blend(rgba, x, y, 142, 202, 230, int(50 * pulse))

    for args in (
        (16, 16, 1, 1), (W - 17, 16, -1, 1), (16, H - 17, 1, -1), (W - 17, H - 17, -1, -1),
    ):
        draw_line(rgba, args[0], args[1], args[0] + args[2] * 24, args[1], 142, 202, 230, int(180 * pulse), 2)
        draw_line(rgba, args[0], args[1], args[0], args[1] + args[3] * 24, 142, 202, 230, int(180 * pulse), 2)
        draw_node(rgba, args[0], args[1], 255, 255, 255, int(200 * pulse), 2)
    return rgba


def render_hex(t):
    rgba = bytearray(W * H * 4)
    pulse = 0.5 + 0.5 * math.sin(2 * math.pi * t / 5)
    border_rect(rgba, 7, 40, 151, 134, int(50 + 40 * pulse), 1)

    hex_r = 5
    for row in range(-2, 20):
        for col in range(-2, 28):
            cx = 8 + col * (hex_r * 3) + (row % 2) * (hex_r * 1.5)
            cy = 8 + row * (hex_r * 1.7)
            if cx < 0 or cx >= W or cy < 0 or cy >= H:
                continue
            if cx > 18 and cx < W - 18 and cy > 18 and cy < H - 18:
                continue
            phase = math.sin(2 * math.pi * (t / 4 + col * 0.15 + row * 0.1))
            a = int(35 + 45 * max(0, phase))
            for i in range(6):
                ang0 = math.pi / 6 + i * math.pi / 3 + t * 0.4
                ang1 = math.pi / 6 + (i + 1) * math.pi / 3 + t * 0.4
                x0 = int(cx + math.cos(ang0) * hex_r)
                y0 = int(cy + math.sin(ang0) * hex_r)
                x1 = int(cx + math.cos(ang1) * hex_r)
                y1 = int(cy + math.sin(ang1) * hex_r)
                draw_line(rgba, x0, y0, x1, y1, 142, 202, 230, a, 1)

    for cx, cy in ((W // 2, 10), (W // 2, H - 11), (12, H // 2), (W - 13, H // 2)):
        radius = 10 + 4 * math.sin(2 * math.pi * t / 2.5)
        steps = 36
        for i in range(steps):
            ang0 = 2 * math.pi * i / steps + t
            ang1 = 2 * math.pi * (i + 1) / steps + t
            x0 = int(cx + math.cos(ang0) * radius)
            y0 = int(cy + math.sin(ang0) * radius)
            x1 = int(cx + math.cos(ang1) * radius)
            y1 = int(cy + math.sin(ang1) * radius)
            draw_line(rgba, x0, y0, x1, y1, 142, 202, 230, int(120 * pulse), 1)

    for args in (
        (14, 14, 1, 0), (14, 14, 0, 1), (W - 15, 14, -1, 0), (W - 15, 14, 0, 1),
        (14, H - 15, 1, 0), (14, H - 15, 0, -1), (W - 15, H - 15, -1, 0), (W - 15, H - 15, 0, -1),
    ):
        corner_bracket(rgba, *args, 142, 202, 230, int(170 * pulse), 44, 2)
    return rgba


def render_glitch(t):
    rgba = bytearray(W * H * 4)
    pulse = 0.4 + 0.6 * math.sin(2 * math.pi * t / 5)
    glitch = 0.5 + 0.5 * math.sin(2 * math.pi * t * 3.7)
    shift = int(6 * glitch) if glitch > 0.82 else 0
    border_rect(rgba, 8, 40, 151, 134, int(70 + 40 * pulse), 2)

    for y in range(10, H - 10):
        row_shift = shift if (y // 7 + int(t * 20)) % 5 == 0 else 0
        for x in range(10, W - 10):
            if x < 12 or y < 12 or x >= W - 12 or y >= H - 12:
                xx = x + row_shift
                if 0 <= xx < W:
                    blend(rgba, xx, y, 142, 202, 230, int(55 + 35 * pulse))

    for args in (
        (14, 14, 1, 0), (14, 14, 0, 1), (W - 15, 14, -1, 0), (W - 15, 14, 0, 1),
        (14, H - 15, 1, 0), (14, H - 15, 0, -1), (W - 15, H - 15, -1, 0), (W - 15, H - 15, 0, -1),
    ):
        ox = int(3 * math.sin(t * 17)) if glitch > 0.75 else 0
        corner_bracket(rgba, args[0] + ox, args[1], args[2], args[3], 142, 202, 230, int(200 * pulse), 40, 2)
        if glitch > 0.7:
            corner_bracket(rgba, args[0] - ox, args[1], args[2], args[3], 255, 60, 120, int(80 * glitch), 40, 1)

    if glitch > 0.85:
        bar_y = int(H * (0.2 + 0.6 * (t % 0.35) / 0.35))
        for x in range(20, W - 20):
            blend(rgba, x, bar_y, 255, 255, 255, int(60 * glitch))
            blend(rgba, x, bar_y + 1, 142, 202, 230, int(40 * glitch))

    for i in range(5):
        px = 40 + i * 70 + int(8 * math.sin(t * 5 + i))
        draw_node(rgba, px, 8, 142, 202, 230, int(130 * pulse), 1)
        draw_node(rgba, px, H - 9, 40, 151, 134, int(130 * pulse), 1)
    return rgba


RENDERERS = {
    "hud": render_hud,
    "scan": render_scan,
    "circuit": render_circuit,
    "hex": render_hex,
    "glitch": render_glitch,
}


def encode_webm(variant):
    webm = ROOT / f"preview-frame-{variant}.webm"
    frame_dir = OUT_DIR / variant
    frame_dir.mkdir(parents=True, exist_ok=True)
    render = RENDERERS[variant]

    for f in range(FRAMES):
        rgba = render(f / FPS)
        write_png(frame_dir / f"frame_{f:04d}.png", W, H, rgba)

    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", str(frame_dir / "frame_%04d.png"),
        "-vf", "format=rgba",
        "-c:v", "libvpx-vp9",
        "-pix_fmt", "yuva420p",
        "-auto-alt-ref", "0",
        "-b:v", "0",
        "-crf", "18",
        "-an", str(webm),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    print("wrote", webm)


def main():
    selected = sys.argv[1:] or list(VARIANTS)
    for variant in selected:
        if variant not in RENDERERS:
            raise SystemExit(f"unknown variant: {variant}")
        encode_webm(variant)


if __name__ == "__main__":
    main()
