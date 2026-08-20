/**
 * 底部操作提示：2.4s 一闪；每句连闪两次再换句
 * 识 / 名色：四句播完即停
 * 六入：两句循环到点完 6 个节点
 * 触：一句循环到关卡结束
 * 受：识/名色四句各闪一轮（2.4s），刚好 9.6s
 * 取：一句闪三轮（2.4s × 3 = 7.2s），进度条出现即停
 * 人道：一句循环到六道结束
 * 畜生道：两句循环到六道结束
 * 饿鬼道：一句循环到六道结束
 */
(function (global) {
    'use strict';

    var HOUSE_LINES = [
        'Hold and drag to warp the observer\'s horizon.',
        'Scroll to scale the spatial density.',
        'Approach the field to evoke perceptual ripples.',
        'Strike any point of the form to release a wave of perturbation.',
    ];
    var CHUSHENG_LINES = [
        'Hold and drag to warp the observer\'s horizon.',
        'Scroll to scale the spatial density.',
    ];
    var SIX_LINES = [
        'Click the orbital nodes to evoke sound waves.',
        'Complete the sonic sequence to breach the current realm.',
    ];
    var CHU_LINES = [
        'Hover to awaken the epicenter, radiating ripples of light and tremor.',
    ];
    var QU_LINES = [
        'Approach to displace the dust; depart to restore the form.',
    ];
    var REN_LINES = [
        'Move to weave a luminous trace; pass to let it fade to dust.',
    ];
    var EGUI_LINES = [
        'Press \'R\' to reset the illusion; layering endless karmic weight.',
    ];
    var HOUSE_STAGES = {
        'house-expand': true,
        'house-particleize': true,
    };
    var PULSES_PER_LINE = 2;

    var rootEl = null;
    var textEl = null;
    var lines = HOUSE_LINES;
    var index = 0;
    var running = false;
    var loopForever = false;
    var showTimer = 0;
    var bound = false;
    var lastCycleAt = 0;
    var pulsesPerLine = PULSES_PER_LINE;
    var pulsesLeft = PULSES_PER_LINE;
    var setsLeft = 1;

    function init() {
        rootEl = document.getElementById('houseHint');
        textEl = rootEl ? rootEl.querySelector('.house-hint-text') : null;
        if (global.AppEventBus) {
            global.AppEventBus.on('stage:enter', onStageEnter);
        }
    }

    function onStageEnter(payload) {
        var key = payload && payload.stage && payload.stage.key;
        var pathId = payload && payload.pathId;
        if (HOUSE_STAGES[key]) {
            start(HOUSE_LINES, 1);
            return;
        }
        if (key === 'capturing-six') {
            start(SIX_LINES, 0);
            return;
        }
        if (key === 'house-chu') {
            start(CHU_LINES, 0);
            return;
        }
        if (key === 'house-shou') {
            start(HOUSE_LINES, 1, 1);
            return;
        }
        if (key === 'house-qu') {
            start(QU_LINES, 1, 3);
            return;
        }
        if (key === 'six-paths-reveal' && pathId === 'ren') {
            start(REN_LINES, 0);
            return;
        }
        if (key === 'six-paths-reveal' && pathId === 'chusheng') {
            start(CHUSHENG_LINES, 0);
            return;
        }
        if (key === 'six-paths-reveal' && pathId === 'egui') {
            start(EGUI_LINES, 0);
            return;
        }
        stop();
    }

    function onPulseCycle() {
        if (!running || !textEl) return;
        var now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (now - lastCycleAt < 1500) return;
        lastCycleAt = now;
        pulsesLeft -= 1;
        if (pulsesLeft > 0) return;
        pulsesLeft = pulsesPerLine;
        index += 1;
        if (index >= lines.length) {
            index = 0;
            if (!loopForever) {
                setsLeft -= 1;
                if (setsLeft <= 0) {
                    stop();
                    return;
                }
            }
        }
        textEl.textContent = lines[index];
    }

    function bindPulse() {
        if (!textEl || bound) return;
        textEl.addEventListener('animationiteration', onPulseCycle);
        bound = true;
    }

    function unbindPulse() {
        if (!textEl || !bound) return;
        textEl.removeEventListener('animationiteration', onPulseCycle);
        bound = false;
    }

    function start(nextLines, sets, pulses) {
        var same = running && lines === nextLines;
        if (same) return;
        if (running) stop();
        if (!rootEl) init();
        if (!rootEl || !textEl) return;
        lines = nextLines || HOUSE_LINES;
        loopForever = !sets;
        running = true;
        index = 0;
        pulsesPerLine = pulses == null ? PULSES_PER_LINE : pulses;
        pulsesLeft = pulsesPerLine;
        setsLeft = sets || 1;
        lastCycleAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
        textEl.textContent = lines[0];
        rootEl.hidden = false;
        rootEl.classList.remove('is-shown');
        bindPulse();
        if (showTimer) clearTimeout(showTimer);
        showTimer = setTimeout(function () {
            showTimer = 0;
            if (!running || !rootEl) return;
            rootEl.classList.add('is-shown');
        }, 20);
    }

    function stop() {
        running = false;
        loopForever = false;
        if (showTimer) {
            clearTimeout(showTimer);
            showTimer = 0;
        }
        unbindPulse();
        if (!rootEl) return;
        rootEl.classList.remove('is-shown');
        rootEl.hidden = true;
    }

    global.HouseHint = {
        init: init,
        start: start,
        stop: stop,
    };
})(typeof window !== 'undefined' ? window : this);
