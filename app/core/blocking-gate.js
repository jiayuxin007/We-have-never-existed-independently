(function (global) {
    'use strict';

    function waitMs(ms) {
        return new Promise(function (resolve) {
            setTimeout(resolve, Math.max(0, ms));
        });
    }

    function waitClick(hitTest) {
        return new Promise(function (resolve) {
            function onClick(e) {
                if (typeof hitTest === 'function' && !hitTest(e)) return;
                document.removeEventListener('click', onClick, true);
                resolve(e);
            }
            document.addEventListener('click', onClick, true);
        });
    }

    function waitClicks(count) {
        count = Math.max(1, count || 1);
        return new Promise(function (resolve) {
            var n = 0;
            function onClick() {
                n += 1;
                global.AppEventBus.emit('blocking:click-progress', { current: n, total: count });
                if (n >= count) {
                    document.removeEventListener('click', onClick, true);
                    resolve({ count: n });
                }
            }
            document.addEventListener('click', onClick, true);
        });
    }

    /**
     * @param {object|null} blocking
     * @returns {Promise<void>}
     */
    function runBlocking(blocking, hooks) {
        hooks = hooks || {};
        if (!blocking) return Promise.resolve();

        if (blocking.type === 'click') {
            global.AppEventBus.emit('blocking:mode', { mode: 'click' });
            return waitClick().then(function () {
                if (typeof hooks.postClick === 'function') {
                    return hooks.postClick();
                }
            });
        }

        if (blocking.type === 'click-after') {
            global.AppEventBus.emit('blocking:mode', { mode: 'click-after', afterMs: blocking.afterMs });
            return waitMs(blocking.afterMs).then(function () {
                global.AppEventBus.emit('blocking:ready', { mode: 'click-after' });
                return waitClick(hooks.hitTest);
            }).then(function () {
                if (typeof hooks.postClick === 'function') {
                    return hooks.postClick();
                }
            });
        }

        if (blocking.type === 'clicks') {
            global.AppEventBus.emit('blocking:mode', { mode: 'clicks', count: blocking.count });
            return waitClicks(blocking.count);
        }

        if (blocking.type === 'sequence') {
            global.AppEventBus.emit('blocking:mode', { mode: 'sequence', introMs: blocking.introMs });
            return waitMs(blocking.introMs || 0).then(function () {
                global.AppEventBus.emit('blocking:ready', { mode: 'sequence' });
                if (blocking.then && blocking.then.type === 'clicks') {
                    return waitClicks(blocking.then.count);
                }
                return waitClick();
            });
        }

        if (blocking.type === 'six-nodes') {
            global.AppEventBus.emit('blocking:mode', { mode: 'six-nodes', count: blocking.count || 6 });
            if (global.HouseModelStage && typeof global.HouseModelStage.isLiuruComplete === 'function' && global.HouseModelStage.isLiuruComplete()) {
                return Promise.resolve();
            }
            return new Promise(function (resolve) {
                var off = global.AppEventBus.on('liuru:complete', function () {
                    if (typeof off === 'function') off();
                    resolve();
                });
            });
        }

        return Promise.resolve();
    }

    global.BlockingGate = {
        waitMs: waitMs,
        waitClick: waitClick,
        waitClicks: waitClicks,
        runBlocking: runBlocking,
    };
})(typeof window !== 'undefined' ? window : this);
