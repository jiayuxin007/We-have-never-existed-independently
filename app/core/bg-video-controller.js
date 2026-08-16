(function (global) {
    'use strict';

    var videoEl = null;

    function init(el) {
        videoEl = el;
        if (!videoEl) return;
        videoEl.loop = true;
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.style.opacity = '1';
        var p = videoEl.play();
        if (p && p.catch) p.catch(function () {});
    }

    function setVisible(visible) {
        if (!videoEl) return;
        videoEl.style.opacity = visible ? '1' : '0';
        /* 隐藏时仍保持播放，六道阶段再淡出；再次显示时无需重新加载 */
        var playPromise = videoEl.play();
        if (playPromise && playPromise.catch) playPromise.catch(function () {});
    }

    global.BgVideoController = {
        init: init,
        setVisible: setVisible,
    };
})(typeof window !== 'undefined' ? window : this);
