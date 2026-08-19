/**
 * 静态资源路径（相对 app/index.html）
 * 请从 MyProject 拷贝 models / fonts / video / audio 到 NewProject/assets/
 */
(function (global) {
    'use strict';

    global.ASSETS_CONFIG = {
        video: {
            bg: '../assets/video/mixkit-flying-in-the-space-between-stars-and-nebulae-32973-hd-ready.mp4',
        },
        model: {
            house: '../assets/models/less_25mb.glb',
        },
        fonts: {
            site: '../assets/fonts/NITEMARE.TTF',
            sutra: '../assets/fonts/FZCAOYTJW(1).TTF',
        },
        notes: [
            '../assets/audio/note1.wav',
            '../assets/audio/note2.wav',
            '../assets/audio/note3.wav',
            '../assets/audio/note4.wav',
            '../assets/audio/note5.wav',
            '../assets/audio/note6.wav',
        ],
        /** Mixkit — Xanthos by Eugenio Mininni. Free under Mixkit License. */
        bgm: '../assets/audio/xanthos.mp3',
        favicon: '../assets/favicon.svg',
        market: {
            /** Binance @ticker 推送（默认）；MC = circulatingSupply × P */
            binanceSymbol: 'btcusdt',
            circulatingSupply: 19900000,
            wsBase: 'wss://stream.binance.com:9443/ws/',
        },
    };
})(typeof window !== 'undefined' ? window : this);
