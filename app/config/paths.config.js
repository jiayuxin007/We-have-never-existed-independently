/**
 * 六道 pathId → 展示效果（台词与道无关，见 SIX_PATHS_SUBTITLES）
 */
(function (global) {
    'use strict';

    /** stage 11 固定一句，任意道相同 */
    global.SIX_PATHS_SUBTITLES = [
        {
            text: 'Yet all that exists here is but a transient consensus, struck by the protocol in a fleeting flash.',
            atMs: 0,
            durationMs: 15000,
        },
    ];

    global.VEDANA_BY_PATH = {
        diyu: 'dukha',
        xiuluo: 'dukha',
        egui: 'dukha',
        ren: 'sukha',
        tian: 'sukha',
        chusheng: 'upeksha',
    };

    global.VEDANA_SUBTITLES = {
        dukha: [{
            text: 'Vedana. Overload. The system rejects the contact as pain.',
            atMs: 0,
            durationMs: 9600,
            fadeDelayMs: 0,
        }],
        sukha: [{
            text: 'Vedana. Resonance. The current is received as pleasure.',
            atMs: 0,
            durationMs: 9600,
            fadeDelayMs: 0,
        }],
        upeksha: [{
            text: 'Vedana. Equanimity. Data passes through without a mark.',
            atMs: 0,
            durationMs: 9600,
            fadeDelayMs: 0,
        }],
    };

    global.PATHS_CONFIG = {
        tian: {
            name: '天道',
            effectId: 'particle-love',
            threeProfile: 'r76-love',
        },
        ren: {
            name: '人道',
            effectId: 'the-spirit',
            threeProfile: 'r74-spirit',
        },
        xiuluo: {
            name: '修罗道',
            effectId: 'noise-flow-field',
            threeProfile: 'r128',
        },
        chusheng: {
            name: '畜生道',
            effectId: 'hyper-mix',
            threeProfile: 'r74-hyper',
        },
        egui: {
            name: '饿鬼道',
            effectId: 'particle-ring',
            threeProfile: 'p5',
        },
        diyu: {
            name: '地狱道',
            effectId: 'constraint-particles',
            threeProfile: 'r74-spirit',
        },
    };
})(typeof window !== 'undefined' ? window : this);
