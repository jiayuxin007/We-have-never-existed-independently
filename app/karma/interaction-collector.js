/**
 * 用户交互采集器 — 面板 ACTION 行 + finalizeSession 汇总
 */
(function (global) {
    'use strict';

    var DRAG_THRESHOLD_SQ = 64;
    var STOP_IDLE_MS = 900;

    var state = {
        active: false,
        startTime: null,
        clickCount: 0,
        moveDistance: 0,
        scrollDelta: 0,
        wheelDelta: 0,
        dragCount: 0,
        dragDistance: 0,
        dragDuration: 0,
        lastX: null,
        lastY: null,
        lastScrollY: null,
        actionCode: 'STOP',
        pointerSession: null,
        dragArmed: false,
        idleTimer: null,
    };

    function setAction(code) {
        state.actionCode = code;
        scheduleIdleStop();
    }

    function scheduleIdleStop() {
        if (state.idleTimer) clearTimeout(state.idleTimer);
        state.idleTimer = setTimeout(function () {
            if (!state.active) return;
            if (state.dragArmed) return;
            state.actionCode = 'STOP';
        }, STOP_IDLE_MS);
    }

    function formatKey(e) {
        var key = e.key;
        if (!key || key === ' ') return 'SPACE';
        if (key.length === 1) return key.toUpperCase();
        return key.toUpperCase().replace(/\s+/g, '_');
    }

    function finalizePointerSession() {
        var ps = state.pointerSession;
        if (ps && ps.armed) {
            state.dragCount += 1;
            state.dragDistance += ps.sessionDistance;
            state.dragDuration += (Date.now() - ps.startMs) / 1000;
        }
        state.pointerSession = null;
        state.dragArmed = false;
    }

    function start() {
        if (state.active) return;
        state.active = true;
        state.startTime = Date.now();
        state.clickCount = 0;
        state.moveDistance = 0;
        state.scrollDelta = 0;
        state.wheelDelta = 0;
        state.dragCount = 0;
        state.dragDistance = 0;
        state.dragDuration = 0;
        state.lastX = null;
        state.lastY = null;
        state.lastScrollY = window.scrollY ?? document.documentElement.scrollTop;
        state.actionCode = 'STOP';
        state.pointerSession = null;
        state.dragArmed = false;
        bind();
        scheduleIdleStop();
    }

    function stop() {
        if (!state.active) return;
        finalizePointerSession();
        state.active = false;
        if (state.idleTimer) {
            clearTimeout(state.idleTimer);
            state.idleTimer = null;
        }
        unbind();
    }

    function bind() {
        document.addEventListener('click', onClick);
        document.addEventListener('contextmenu', onContextMenu);
        // OrbitControls preventDefault on pointerdown suppresses mousemove; use pointermove.
        document.addEventListener('pointermove', onMove, { passive: true });
        document.addEventListener('scroll', onScroll, { passive: true });
        document.addEventListener('wheel', onWheel, { passive: true });
        document.addEventListener('pointerdown', onPointerDown, { passive: true });
        document.addEventListener('pointerup', onPointerUp, { passive: true });
        document.addEventListener('pointercancel', onPointerUp, { passive: true });
        document.addEventListener('keydown', onKeyDown);
    }

    function unbind() {
        document.removeEventListener('click', onClick);
        document.removeEventListener('contextmenu', onContextMenu);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('scroll', onScroll);
        document.removeEventListener('wheel', onWheel);
        document.removeEventListener('pointerdown', onPointerDown);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);
        document.removeEventListener('keydown', onKeyDown);
    }

    function onClick() {
        if (!state.active) return;
        state.clickCount += 1;
        setAction('LEFT-CLICK');
    }

    function onContextMenu() {
        if (!state.active) return;
        setAction('RIGHT-CLICK');
    }

    function isDragButton(buttons) {
        return (buttons & 1) !== 0 || (buttons & 2) !== 0;
    }

    function beginPointerSession(e) {
        finalizePointerSession();
        state.pointerSession = {
            x0: e.clientX,
            y0: e.clientY,
            lastX: e.clientX,
            lastY: e.clientY,
            startMs: Date.now(),
            sessionDistance: 0,
            armed: false,
        };
        state.dragArmed = false;
    }

    function onPointerDown(e) {
        if (!state.active) return;
        if (e.button === 2) setAction('RIGHT-CLICK');
        if (e.button !== 0 && e.button !== 2) return;
        beginPointerSession(e);
    }

    function onPointerUp() {
        if (!state.active) return;
        finalizePointerSession();
        scheduleIdleStop();
    }

    function onMove(e) {
        if (!state.active) return;
        var x = e.clientX;
        var y = e.clientY;
        if (!state.pointerSession && isDragButton(e.buttons)) {
            beginPointerSession(e);
        }
        var ps = state.pointerSession;

        if (ps) {
            var sdx = x - ps.lastX;
            var sdy = y - ps.lastY;
            var seg = Math.sqrt(sdx * sdx + sdy * sdy);
            if (seg > 0) {
                ps.sessionDistance += seg;
                ps.lastX = x;
                ps.lastY = y;
            }
            var dx0 = x - ps.x0;
            var dy0 = y - ps.y0;
            if (dx0 * dx0 + dy0 * dy0 > DRAG_THRESHOLD_SQ) {
                ps.armed = true;
                state.dragArmed = true;
                setAction('DRAG');
            }
        }

        if (state.lastX != null && state.lastY != null) {
            var dx = x - state.lastX;
            var dy = y - state.lastY;
            state.moveDistance += Math.sqrt(dx * dx + dy * dy);
            if (!state.dragArmed && (dx * dx + dy * dy > 4)) {
                setAction('MOVE');
            }
        }
        state.lastX = x;
        state.lastY = y;
    }

    function onScroll() {
        if (!state.active) return;
        var scrollY = window.scrollY ?? document.documentElement.scrollTop;
        if (state.lastScrollY != null) {
            state.scrollDelta += Math.abs(scrollY - state.lastScrollY);
        }
        state.lastScrollY = scrollY;
        setAction('SCROLL');
    }

    function normalizeWheelDelta(e) {
        var dy = e.deltaY;
        if (e.deltaMode === 1) dy *= 16;
        else if (e.deltaMode === 2) dy *= window.innerHeight || 800;
        return Math.abs(dy);
    }

    function onWheel(e) {
        if (!state.active) return;
        state.wheelDelta += normalizeWheelDelta(e);
        setAction('SCROLL');
    }

    function onKeyDown(e) {
        if (!state.active) return;
        if (e.repeat) return;
        setAction('INPUT:' + formatKey(e));
    }

    function getSummary() {
        var endTime = state.active ? Date.now() : (state.startTime || Date.now());
        var dwellSeconds = state.startTime ? (endTime - state.startTime) / 1000 : 0;
        return {
            clickCount: state.clickCount,
            moveDistance: state.moveDistance,
            scrollDelta: state.scrollDelta,
            wheelDelta: state.wheelDelta,
            dragCount: state.dragCount,
            dragDistance: state.dragDistance,
            dragDuration: state.dragDuration,
            dwellSeconds: dwellSeconds,
        };
    }

    function getActionDisplay() {
        return state.actionCode || 'STOP';
    }

    function isActive() {
        return state.active;
    }

    global.INTERACTION_COLLECTOR = {
        start: start,
        stop: stop,
        getSummary: getSummary,
        getActionDisplay: getActionDisplay,
        isActive: isActive,
        getLastActionLabel: getActionDisplay,
    };
})(typeof window !== 'undefined' ? window : this);
