(function (global) {
    'use strict';

    const listeners = {};

    function on(event, fn) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(fn);
        return function off() {
            listeners[event] = (listeners[event] || []).filter(function (f) { return f !== fn; });
        };
    }

    function emit(event, payload) {
        (listeners[event] || []).slice().forEach(function (fn) {
            try { fn(payload); } catch (e) { console.error('[EventBus]', event, e); }
        });
    }

    global.AppEventBus = { on: on, emit: emit };
})(typeof window !== 'undefined' ? window : this);
