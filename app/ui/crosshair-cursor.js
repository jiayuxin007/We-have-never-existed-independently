/**
 * 十字准心光标：非闭合十字（四条线不交于中心）+ 一层模糊发光晕染
 */
(function (global) {
    'use strict';

    const SIZE = 40;
    const CENTER = SIZE / 2;
    const ARM = 5;
    const GAP = 3;

    function drawCrosshair(canvas) {
        if (!canvas || !canvas.getContext) return;
        const ctx = canvas.getContext('2d');
        canvas.width = SIZE;
        canvas.height = SIZE;
        ctx.clearRect(0, 0, SIZE, SIZE);

        ctx.lineCap = 'round';
        ctx.lineWidth = 0.9;

        // 非闭合十字：四条独立线段，端点均不落在中心，中心留空
        const left  = CENTER - GAP - ARM;
        const right = CENTER + GAP + ARM;
        const top   = CENTER - GAP - ARM;
        const bot   = CENTER + GAP + ARM;
        const inL   = CENTER - GAP;
        const inR   = CENTER + GAP;
        const inT   = CENTER - GAP;
        const inB   = CENTER + GAP;

        // 发光层
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.moveTo(left, CENTER);
        ctx.lineTo(inL, CENTER);
        ctx.moveTo(inR, CENTER);
        ctx.lineTo(right, CENTER);
        ctx.moveTo(CENTER, top);
        ctx.lineTo(CENTER, inT);
        ctx.moveTo(CENTER, inB);
        ctx.lineTo(CENTER, bot);
        ctx.stroke();

        ctx.restore();

        // 清晰准心
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.lineWidth = 0.9;

        ctx.beginPath();
        ctx.moveTo(left, CENTER);
        ctx.lineTo(inL, CENTER);
        ctx.moveTo(inR, CENTER);
        ctx.lineTo(right, CENTER);
        ctx.moveTo(CENTER, top);
        ctx.lineTo(CENTER, inT);
        ctx.moveTo(CENTER, inB);
        ctx.lineTo(CENTER, bot);
        ctx.stroke();
    }

    function createCrosshairCursor() {
        const wrap = document.createElement('div');
        wrap.className = 'crosshair-cursor-wrap';
        wrap.style.cssText =
            'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:9999;visibility:visible;cursor:none;';
        const canvas = document.createElement('canvas');
        canvas.className = 'crosshair-cursor-canvas';
        canvas.style.cssText =
            'position:fixed;width:' + SIZE + 'px;height:' + SIZE + 'px;left:0;top:0;pointer-events:none;cursor:none;';
        wrap.appendChild(canvas);
        document.body.appendChild(wrap);

        drawCrosshair(canvas);

        const setPos = (x, y) => {
            canvas.style.left = (x - CENTER) + 'px';
            canvas.style.top = (y - CENTER) + 'px';
        };

        const moveHandler = (e) => setPos(e.clientX, e.clientY);
        document.addEventListener('mousemove', moveHandler);

        return {
            show() {
                wrap.style.visibility = 'visible';
                canvas.style.visibility = 'visible';
            },
            hide() {
                wrap.style.visibility = 'hidden';
                canvas.style.visibility = 'hidden';
            },
            updatePosition(x, y) { setPos(x, y); },
            destroy() {
                document.removeEventListener('mousemove', moveHandler);
                if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
            }
        };
    }

    global.CrosshairCursor = { create: createCrosshairCursor };
})(typeof window !== 'undefined' ? window : this);
