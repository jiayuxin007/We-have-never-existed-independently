/**
 * 与 MyProject/index.html 内联常量保持一致
 */
(function (global) {
    'use strict';

    global.TIMING_CONFIG = {
        introRevealDelayMs: 1000,
        introRevealDurationS: 2.5,
        introCharAnimS: 0.05,

        sutraRevealDurationS: 8,
        sutraRevealTailMs: 150,
        sutraPauseAfterMs: 5000,
        sutraCharAnimS: 0.06,

        subtitleFadeDelayMs: 800,
        subtitleColorTransitionS: 1.5,
        finalQuoteDelayMs: 2000,

        /** logo / line / 边框动画播放间隔（与 AE 导出时长一致） */
        logoPlayIntervalMs: 5000,
    };
})(typeof window !== 'undefined' ? window : this);
