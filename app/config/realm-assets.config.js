/**
 * 六道 ↔ logo / 英文道名（数据面板）
 * logo 使用 assets/logo 下的静态 PNG；line 仍用透明 webm
 */
(function (global) {
    'use strict';

    var LOGO_BASE = '../assets/logo/';

    function mediaPath(name, ext) {
        return LOGO_BASE + name + ext;
    }

    function realmEntry(key, realm) {
        return {
            key: key,
            realm: realm,
            logo: mediaPath(key.toLowerCase(), '.png'),
            logoType: 'image',
        };
    }

    global.REALM_ASSETS = {
        tian:     realmEntry('Deva',    'Deva Realm'),
        ren:      realmEntry('Manusya', 'Manusya Realm'),
        xiuluo:   realmEntry('Asura',   'Asura Realm'),
        chusheng: realmEntry('Tiryag',  'Tiryag Realm'),
        egui:     realmEntry('Preta',   'Preta Realm'),
        diyu:     realmEntry('Naraka',  'Naraka Realm'),
        line: mediaPath('line', '.webm'),
        lineFallbacks: [
            mediaPath('line', '.webm'),
        ],
    };

    global.REALM_BY_PATH = global.REALM_ASSETS;
})(typeof window !== 'undefined' ? window : this);
