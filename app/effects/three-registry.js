(function (global) {
    'use strict';

    var SCRIPT_URLS = {
        r128: [
            'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
            'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
            'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
        ],
        'r74-spirit': ['../reference/the-spirit/js/three.r74.min.js'],
        'r74-hyper': ['../reference/hyper-mix/js/three.r74.min.js'],
        'r76-love': ['../reference/particle-love/three.r76.min.js', '../reference/particle-love/TweenMax.min.js'],
        p5: ['https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.min.js'],
    };

    var loaded = {};
    var r128Cached = null;

    function addResourceHint(rel, url, asType) {
        if (!url || !global.document) return;
        var existing = global.document.querySelector('link[rel="' + rel + '"][href="' + url + '"]');
        if (existing) return;
        var link = global.document.createElement('link');
        link.rel = rel;
        link.href = url;
        if (asType) link.as = asType;
        global.document.head.appendChild(link);
    }

    function prefetchUrls(urls, asType) {
        (urls || []).forEach(function (url) {
            addResourceHint('preload', url, asType || 'script');
        });
    }

    function prefetchR128() {
        prefetchUrls(SCRIPT_URLS.r128, 'script');
    }

    function prefetchP5() {
        prefetchUrls(SCRIPT_URLS.p5, 'script');
    }

    function loadScript(src) {
        if (loaded[src]) return loaded[src];
        loaded[src] = new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = src;
            s.async = false;
            s.onload = function () { resolve(); };
            s.onerror = function () { reject(new Error('Script load failed: ' + src)); };
            document.head.appendChild(s);
        });
        return loaded[src];
    }

    function loadScripts(urls) {
        var chain = Promise.resolve();
        urls.forEach(function (url) {
            chain = chain.then(function () { return loadScript(url); });
        });
        return chain;
    }

    function patchFileLoaderForBlobUrls() {
        if (global.__BLOB_FILELOADER_PATCHED__ || !global.THREE || !global.THREE.FileLoader) return;
        var originalLoad = global.THREE.FileLoader.prototype.load;
        global.THREE.FileLoader.prototype.load = function (url, onLoad, onProgress, onError) {
            if (typeof url === 'string' && url.indexOf('blob:') === 0) {
                var scope = this;
                var xhr = new XMLHttpRequest();
                scope.manager.itemStart(url);
                xhr.open('GET', url, true);
                xhr.responseType = scope.responseType || 'arraybuffer';
                if (xhr.overrideMimeType && scope.mimeType) {
                    xhr.overrideMimeType(scope.mimeType);
                }
                xhr.onload = function () {
                    var status = xhr.status;
                    if (status === 0 || (status >= 200 && status < 300)) {
                        if (onLoad) onLoad(xhr.response);
                    } else if (onError) {
                        onError(new Error('XHR blob failed: ' + status));
                    }
                    scope.manager.itemEnd(url);
                };
                xhr.onerror = function () {
                    if (onError) onError(new Error('XHR blob network error'));
                    scope.manager.itemEnd(url);
                };
                if (onProgress && xhr.addEventListener) {
                    xhr.addEventListener('progress', function (ev) {
                        if (ev.lengthComputable) onProgress(ev);
                    });
                }
                xhr.send(null);
                return xhr;
            }
            return originalLoad.call(this, url, onLoad, onProgress, onError);
        };
        global.__BLOB_FILELOADER_PATCHED__ = true;
    }

    function patchImageBitmapLoaderForBlobUrls() {
        if (global.__BLOB_IMAGEBITMAP_PATCHED__ || !global.THREE || !global.THREE.ImageBitmapLoader) return;
        var originalLoad = global.THREE.ImageBitmapLoader.prototype.load;
        global.THREE.ImageBitmapLoader.prototype.load = function (url, onLoad, onProgress, onError) {
            if (typeof url === 'string' && url.indexOf('blob:') === 0) {
                var scope = this;
                scope.manager.itemStart(url);
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.responseType = 'blob';
                xhr.onload = function () {
                    var opts = Object.assign(scope.options || {}, { colorSpaceConversion: 'none' });
                    global.createImageBitmap(xhr.response, opts).then(function (bitmap) {
                        if (onLoad) onLoad(bitmap);
                        scope.manager.itemEnd(url);
                    }).catch(function (err) {
                        if (onError) onError(err);
                        scope.manager.itemError(url);
                        scope.manager.itemEnd(url);
                    });
                };
                xhr.onerror = function () {
                    var err = new Error('XHR blob failed');
                    if (onError) onError(err);
                    scope.manager.itemError(url);
                    scope.manager.itemEnd(url);
                };
                xhr.send();
                return;
            }
            return originalLoad.call(this, url, onLoad, onProgress, onError);
        };
        global.__BLOB_IMAGEBITMAP_PATCHED__ = true;
    }

    function patchThreeBlobLoaders() {
        patchFileLoaderForBlobUrls();
        patchImageBitmapLoaderForBlobUrls();
    }

    function ensureR128() {
        if (global.__R128_THREE__) {
            patchThreeBlobLoaders();
            return Promise.resolve();
        }
        return loadScripts(SCRIPT_URLS.r128).then(function () {
            global.__R128_THREE__ = global.THREE;
            r128Cached = global.THREE;
            patchThreeBlobLoaders();
        });
    }

    function cacheCurrentThree() {
        return global.THREE;
    }

    var holdCount = 0;
    var holdProfile = null;

    function profileBlocksR128(profile) {
        return profile === 'r74-spirit' || profile === 'r74-hyper' || profile === 'r76-love';
    }

    function acquireProfile(profile) {
        holdCount += 1;
        holdProfile = profile;
        useProfileUnlocked(profile);
    }

    function releaseProfile() {
        holdCount = Math.max(0, holdCount - 1);
        if (holdCount === 0) holdProfile = null;
    }

    function useR128() {
        if (holdCount > 0 && profileBlocksR128(holdProfile)) return;
        useR128Unlocked();
    }

    function useR128Unlocked() {
        if (global.__R128_THREE__) global.THREE = global.__R128_THREE__;
    }

    function useProfile(profile) {
        if (holdCount > 0 && holdProfile && holdProfile !== profile) return;
        useProfileUnlocked(profile);
    }

    function useProfileUnlocked(profile) {
        if (profile === 'r128' || profile === 'p5' || profile === 'dynamic') {
            useR128Unlocked();
            return;
        }
        if (profile === 'r74-spirit' && global.__R74_THREE_SPIRIT__) {
            global.THREE = global.__R74_THREE_SPIRIT__;
        } else if (profile === 'r74-hyper' && global.__R74_THREE_HYPERMIX__) {
            global.THREE = global.__R74_THREE_HYPERMIX__;
        } else if (profile === 'r76-love' && global.__R76_THREE_LOVE__) {
            global.THREE = global.__R76_THREE_LOVE__;
        }
    }

    function ensureProfile(profile) {
        if (profile === 'r128' || profile === 'dynamic') {
            return ensureR128();
        }
        if (profile === 'p5') {
            return loadScripts(SCRIPT_URLS.p5);
        }
        if (profile === 'r74-spirit') {
            if (global.__R74_THREE_SPIRIT__) return Promise.resolve();
            return loadScripts(SCRIPT_URLS['r74-spirit']).then(function () {
                global.__R74_THREE_SPIRIT__ = global.THREE;
                useR128();
            });
        }
        if (profile === 'r74-hyper') {
            if (global.__R74_THREE_HYPERMIX__) return Promise.resolve();
            return loadScripts(SCRIPT_URLS['r74-hyper']).then(function () {
                global.__R74_THREE_HYPERMIX__ = global.THREE;
                useR128();
            });
        }
        if (profile === 'r76-love') {
            if (global.__R76_THREE_LOVE__) return Promise.resolve();
            return loadScripts(SCRIPT_URLS['r76-love']).then(function () {
                global.__R76_THREE_LOVE__ = global.THREE;
                useR128();
            });
        }
        return ensureR128();
    }

    global.ThreeRegistry = {
        ensureR128: ensureR128,
        ensureProfile: ensureProfile,
        useProfile: useProfile,
        useR128: useR128,
        acquireProfile: acquireProfile,
        releaseProfile: releaseProfile,
        cacheCurrentThree: cacheCurrentThree,
        prefetchR128: prefetchR128,
        prefetchP5: prefetchP5,
    };
})(typeof window !== 'undefined' ? window : this);
