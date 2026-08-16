/**
 * 唯一确定的六道数据字典（canonical）
 */
(function (global) {
    'use strict';

    global.SIX_REALMS = {
        DEVA:    { id: '01', name: 'Deva Realm',    code: 'Ether_Frictionless' },
        ASURA:   { id: '02', name: 'Asura Realm',   code: 'Conflict_Mesh' },
        MANUSYA: { id: '03', name: 'Manusya Realm', code: 'Dynamic_Balance' },
        TIRYAG:  { id: '04', name: 'Tiryag Realm',  code: 'Closed_Loop' },
        PRETA:   { id: '05', name: 'Preta Realm',   code: 'Void_Implosion' },
        NARAKA:  { id: '06', name: 'Naraka Realm',  code: 'Frozen_Constraint' },
    };
})(typeof window !== 'undefined' ? window : this);
