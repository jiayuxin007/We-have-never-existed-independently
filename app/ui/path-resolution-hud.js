/**
 * 六道结算说明（台词字体 + 道名图标）
 */
(function (global) {
    'use strict';

    var rootEl = null;
    var anchorEl = null;
    var logoEl = null;
    var nameEl = null;
    var noteEl = null;
    var showTimer = 0;

    function ensureDom() {
        if (rootEl) return;
        rootEl = document.getElementById('pathResolutionHud');
        if (!rootEl) return;
        anchorEl = rootEl.querySelector('.path-res-anchor');
        logoEl = rootEl.querySelector('.path-res-logo');
        nameEl = rootEl.querySelector('.path-res-name');
        noteEl = rootEl.querySelector('.path-res-note');
    }

    function pathMeta(pathId) {
        var id = pathId && global.PATHS_CONFIG && global.PATHS_CONFIG[pathId] ? pathId : 'diyu';
        var cfg = global.PATHS_CONFIG[id] || {};
        var assets = (global.REALM_ASSETS && global.REALM_ASSETS[id]) || {};
        var pie = global.KarmaPieChart && global.KarmaPieChart.PATH_META
            ? global.KarmaPieChart.PATH_META[id]
            : null;
        return {
            id: id,
            en: assets.realm || (pie && pie.label) || cfg.name || id,
            logo: assets.logo || '',
        };
    }

    function show(pathId) {
        ensureDom();
        if (!rootEl) return;
        var meta = pathMeta(pathId);
        if (anchorEl) anchorEl.textContent = 'At this bound moment, your consciousness is anchored in';
        if (nameEl) nameEl.textContent = meta.en;
        if (noteEl) {
            noteEl.textContent = 'System loaded dedicated rules based on your perceptual bias.';
        }
        if (logoEl) {
            logoEl.alt = meta.en;
            logoEl.onerror = function () {
                logoEl.hidden = true;
            };
            if (meta.logo) {
                logoEl.src = meta.logo;
                logoEl.hidden = false;
            } else {
                logoEl.removeAttribute('src');
                logoEl.hidden = true;
            }
        }
        if (global.KarmaDataPanel && typeof global.KarmaDataPanel.hide === 'function') {
            global.KarmaDataPanel.hide();
        }
        rootEl.hidden = false;
        rootEl.classList.remove('is-shown');
        if (showTimer) clearTimeout(showTimer);
        showTimer = setTimeout(function () {
            showTimer = 0;
            if (rootEl && !rootEl.hidden) rootEl.classList.add('is-shown');
        }, 20);
    }

    function hide() {
        if (!rootEl) ensureDom();
        if (!rootEl) return;
        if (showTimer) {
            clearTimeout(showTimer);
            showTimer = 0;
        }
        rootEl.classList.remove('is-shown');
        rootEl.hidden = true;
    }

    global.PathResolutionHud = {
        show: show,
        hide: hide,
    };
})(typeof window !== 'undefined' ? window : this);
