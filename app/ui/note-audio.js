(function (global) {
    'use strict';

    var ctx = null;
    var master = null;
    var delay = null;
    var delayGain = null;

    var PENTA = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];

    function ensureContext() {
        if (ctx) return ctx;
        var AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.22;
        delay = ctx.createDelay(1.2);
        delay.delayTime.value = 0.28;
        delayGain = ctx.createGain();
        delayGain.gain.value = 0.32;
        delay.connect(delayGain);
        delayGain.connect(delay);
        delayGain.connect(master);
        master.connect(ctx.destination);
        return ctx;
    }

    function unlock() {
        var c = ensureContext();
        if (c && c.state === 'suspended') {
            return c.resume();
        }
        return Promise.resolve();
    }

    function playVoice(freq, duration, peak, type) {
        var c = ensureContext();
        if (!c) return;
        var now = c.currentTime;
        var osc = c.createOscillator();
        var osc2 = c.createOscillator();
        var gain = c.createGain();
        var filter = c.createBiquadFilter();
        osc.type = type || 'sine';
        osc2.type = 'triangle';
        osc.frequency.value = freq;
        osc2.frequency.value = freq * 2.002;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, now);
        filter.frequency.exponentialRampToValueAtTime(680, now + duration * 0.7);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(peak, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(peak * 0.45, now + duration * 0.35);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        gain.connect(delay);
        osc.start(now);
        osc2.start(now);
        osc.stop(now + duration + 0.05);
        osc2.stop(now + duration + 0.05);
    }

    function playNote(index) {
        var freq = PENTA[index % PENTA.length];
        playVoice(freq, 1.85, 0.22, 'sine');
        playVoice(freq * 0.5, 2.1, 0.08, 'sine');
    }

    global.NoteAudio = {
        unlock: unlock,
        playNote: playNote,
    };
})(typeof window !== 'undefined' ? window : this);
