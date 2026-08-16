(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){


    /**
     * Array forEach
     */
    function forEach(arr, callback, thisObj) {
        if (arr == null) {
            return;
        }
        var i = -1,
            len = arr.length;
        while (++i < len) {
            // we iterate over sparse items since there is no way to make it
            // work properly on IE 7-8. see #64
            if ( callback.call(thisObj, arr[i], i, arr) === false ) {
                break;
            }
        }
    }

    module.exports = forEach;



},{}],2:[function(require,module,exports){


    /**
     * Create slice of source array or array-like object
     */
    function slice(arr, start, end){
        var len = arr.length;

        if (start == null) {
            start = 0;
        } else if (start < 0) {
            start = Math.max(len + start, 0);
        } else {
            start = Math.min(start, len);
        }

        if (end == null) {
            end = len;
        } else if (end < 0) {
            end = Math.max(len + end, 0);
        } else {
            end = Math.min(end, len);
        }

        var result = [];
        while (start < end) {
            result.push(arr[start++]);
        }

        return result;
    }

    module.exports = slice;



},{}],3:[function(require,module,exports){
var kindOf = require(9);
var isPlainObject = require(8);
var mixIn = require(16);

    /**
     * Clone native types.
     */
    function clone(val){
        switch (kindOf(val)) {
            case 'Object':
                return cloneObject(val);
            case 'Array':
                return cloneArray(val);
            case 'RegExp':
                return cloneRegExp(val);
            case 'Date':
                return cloneDate(val);
            default:
                return val;
        }
    }

    function cloneObject(source) {
        if (isPlainObject(source)) {
            return mixIn({}, source);
        } else {
            return source;
        }
    }

    function cloneRegExp(r) {
        var flags = '';
        flags += r.multiline ? 'm' : '';
        flags += r.global ? 'g' : '';
        flags += r.ignoreCase ? 'i' : '';
        return new RegExp(r.source, flags);
    }

    function cloneDate(date) {
        return new Date(+date);
    }

    function cloneArray(arr) {
        return arr.slice();
    }

    module.exports = clone;



},{"16":16,"8":8,"9":9}],4:[function(require,module,exports){
var clone = require(3);
var forOwn = require(12);
var kindOf = require(9);
var isPlainObject = require(8);

    /**
     * Recursively clone native types.
     */
    function deepClone(val, instanceClone) {
        switch ( kindOf(val) ) {
            case 'Object':
                return cloneObject(val, instanceClone);
            case 'Array':
                return cloneArray(val, instanceClone);
            default:
                return clone(val);
        }
    }

    function cloneObject(source, instanceClone) {
        if (isPlainObject(source)) {
            var out = {};
            forOwn(source, function(val, key) {
                this[key] = deepClone(val, instanceClone);
            }, out);
            return out;
        } else if (instanceClone) {
            return instanceClone(source);
        } else {
            return source;
        }
    }

    function cloneArray(arr, instanceClone) {
        var out = [],
            i = -1,
            n = arr.length,
            val;
        while (++i < n) {
            out[i] = deepClone(arr[i], instanceClone);
        }
        return out;
    }

    module.exports = deepClone;




},{"12":12,"3":3,"8":8,"9":9}],5:[function(require,module,exports){
var isKind = require(6);
    /**
     */
    var isArray = Array.isArray || function (val) {
        return isKind(val, 'Array');
    };
    module.exports = isArray;


},{"6":6}],6:[function(require,module,exports){
var kindOf = require(9);
    /**
     * Check if value is from a specific "kind".
     */
    function isKind(val, kind){
        return kindOf(val) === kind;
    }
    module.exports = isKind;


},{"9":9}],7:[function(require,module,exports){
var isKind = require(6);
    /**
     */
    function isObject(val) {
        return isKind(val, 'Object');
    }
    module.exports = isObject;


},{"6":6}],8:[function(require,module,exports){


    /**
     * Checks if the value is created by the `Object` constructor.
     */
    function isPlainObject(value) {
        return (!!value && typeof value === 'object' &&
            value.constructor === Object);
    }

    module.exports = isPlainObject;



},{}],9:[function(require,module,exports){


    var _rKind = /^\[object (.*)\]$/,
        _toString = Object.prototype.toString,
        UNDEF;

    /**
     * Gets the "kind" of value. (e.g. "String", "Number", etc)
     */
    function kindOf(val) {
        if (val === null) {
            return 'Null';
        } else if (val === UNDEF) {
            return 'Undefined';
        } else {
            return _rKind.exec( _toString.call(val) )[1];
        }
    }
    module.exports = kindOf;


},{}],10:[function(require,module,exports){
var forEach = require(1);
var slice = require(2);
var forOwn = require(12);

    /**
     * Copy missing properties in the obj from the defaults.
     */
    function fillIn(obj, var_defaults){
        forEach(slice(arguments, 1), function(base){
            forOwn(base, function(val, key){
                if (obj[key] == null) {
                    obj[key] = val;
                }
            });
        });
        return obj;
    }

    module.exports = fillIn;



},{"1":1,"12":12,"2":2}],11:[function(require,module,exports){
var hasOwn = require(13);

    var _hasDontEnumBug,
        _dontEnums;

    function checkDontEnum(){
        _dontEnums = [
                'toString',
                'toLocaleString',
                'valueOf',
                'hasOwnProperty',
                'isPrototypeOf',
                'propertyIsEnumerable',
                'constructor'
            ];

        _hasDontEnumBug = true;

        for (var key in {'toString': null}) {
            _hasDontEnumBug = false;
        }
    }

    /**
     * Similar to Array/forEach but works over object properties and fixes Don't
     * Enum bug on IE.
     * based on: http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
     */
    function forIn(obj, fn, thisObj){
        var key, i = 0;
        // no need to check if argument is a real object that way we can use
        // it for arrays, functions, date, etc.

        //post-pone check till needed
        if (_hasDontEnumBug == null) checkDontEnum();

        for (key in obj) {
            if (exec(fn, obj, key, thisObj) === false) {
                break;
            }
        }


        if (_hasDontEnumBug) {
            var ctor = obj.constructor,
                isProto = !!ctor && obj === ctor.prototype;

            while (key = _dontEnums[i++]) {
                // For constructor, if it is a prototype object the constructor
                // is always non-enumerable unless defined otherwise (and
                // enumerated above).  For non-prototype objects, it will have
                // to be defined on this object, since it cannot be defined on
                // any prototype objects.
                //
                // For other [[DontEnum]] properties, check if the value is
                // different than Object prototype value.
                if (
                    (key !== 'constructor' ||
                        (!isProto && hasOwn(obj, key))) &&
                    obj[key] !== Object.prototype[key]
                ) {
                    if (exec(fn, obj, key, thisObj) === false) {
                        break;
                    }
                }
            }
        }
    }

    function exec(fn, obj, key, thisObj){
        return fn.call(thisObj, obj[key], key, obj);
    }

    module.exports = forIn;



},{"13":13}],12:[function(require,module,exports){
var hasOwn = require(13);
var forIn = require(11);

    /**
     * Similar to Array/forEach but works over object properties and fixes Don't
     * Enum bug on IE.
     * based on: http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
     */
    function forOwn(obj, fn, thisObj){
        forIn(obj, function(val, key){
            if (hasOwn(obj, key)) {
                return fn.call(thisObj, obj[key], key, obj);
            }
        });
    }

    module.exports = forOwn;



},{"11":11,"13":13}],13:[function(require,module,exports){


    /**
     * Safer Object.hasOwnProperty
     */
     function hasOwn(obj, prop){
         return Object.prototype.hasOwnProperty.call(obj, prop);
     }

     module.exports = hasOwn;



},{}],14:[function(require,module,exports){
var forOwn = require(12);

    /**
     * Get object keys
     */
     var keys = Object.keys || function (obj) {
            var keys = [];
            forOwn(obj, function(val, key){
                keys.push(key);
            });
            return keys;
        };

    module.exports = keys;



},{"12":12}],15:[function(require,module,exports){
var hasOwn = require(13);
var deepClone = require(4);
var isObject = require(7);

    /**
     * Deep merge objects.
     */
    function merge() {
        var i = 1,
            key, val, obj, target;

        // make sure we don't modify source element and it's properties
        // objects are passed by reference
        target = deepClone( arguments[0] );

        while (obj = arguments[i++]) {
            for (key in obj) {
                if ( ! hasOwn(obj, key) ) {
                    continue;
                }

                val = obj[key];

                if ( isObject(val) && isObject(target[key]) ){
                    // inception, deep merge objects
                    target[key] = merge(target[key], val);
                } else {
                    // make sure arrays, regexp, date, objects are cloned
                    target[key] = deepClone(val);
                }

            }
        }

        return target;
    }

    module.exports = merge;



},{"13":13,"4":4,"7":7}],16:[function(require,module,exports){
var forOwn = require(12);

    /**
    * Combine properties from all the objects into first one.
    * - This method affects target object in place, if you want to create a new Object pass an empty object as first param.
    * @param {object} target    Target Object
    * @param {...object} objects    Objects to be combined (0...n objects).
    * @return {object} Target Object.
    */
    function mixIn(target, objects){
        var i = 0,
            n = arguments.length,
            obj;
        while(++i < n){
            obj = arguments[i];
            if (obj != null) {
                forOwn(obj, copyProp, target);
            }
        }
        return target;
    }

    function copyProp(val, key){
        this[key] = val;
    }

    module.exports = mixIn;


},{"12":12}],17:[function(require,module,exports){
var typecast = require(20);
var isArray = require(5);
var hasOwn = require(13);

    /**
     * Decode query string into an object of keys => vals.
     */
    function decode(queryStr, shouldTypecast) {
        var queryArr = (queryStr || '').replace('?', '').split('&'),
            reg = /([^=]+)=(.+)/,
            i = -1,
            obj = {},
            equalIndex, cur, pValue, pName;

        while ((cur = queryArr[++i])) {
            equalIndex = cur.indexOf('=');
            pName = cur.substring(0, equalIndex);
            pValue = decodeURIComponent(cur.substring(equalIndex + 1));
            if (shouldTypecast !== false) {
                pValue = typecast(pValue);
            }
            if (hasOwn(obj, pName)){
                if(isArray(obj[pName])){
                    obj[pName].push(pValue);
                } else {
                    obj[pName] = [obj[pName], pValue];
                }
            } else {
                obj[pName] = pValue;
           }
        }
        return obj;
    }

    module.exports = decode;


},{"13":13,"20":20,"5":5}],18:[function(require,module,exports){


    /**
     * Gets full query as string with all special chars decoded.
     */
    function getQuery(url) {
        url = url.replace(/#.*/, ''); //removes hash (to avoid getting hash query)
        var queryString = /\?[a-zA-Z0-9\=\&\%\$\-\_\.\+\!\*\'\(\)\,]+/.exec(url); //valid chars according to: http://www.ietf.org/rfc/rfc1738.txt
        return (queryString)? decodeURIComponent(queryString[0].replace(/\+/g,' ')) : '';
    }

    module.exports = getQuery;


},{}],19:[function(require,module,exports){
var decode = require(17);
var getQuery = require(18);

    /**
     * Get query string, parses and decodes it.
     */
    function parse(url, shouldTypecast) {
        return decode(getQuery(url), shouldTypecast);
    }

    module.exports = parse;



},{"17":17,"18":18}],20:[function(require,module,exports){


    var UNDEF;

    /**
     * Parses string and convert it into a native value.
     */
    function typecast(val) {
        var r;
        if ( val === null || val === 'null' ) {
            r = null;
        } else if ( val === 'true' ) {
            r = true;
        } else if ( val === 'false' ) {
            r = false;
        } else if ( val === UNDEF || val === 'undefined' ) {
            r = UNDEF;
        } else if ( val === '' || isNaN(val) ) {
            //isNaN('') returns false
            r = val;
        } else {
            //parseFloat(null || '') returns NaN
            r = parseFloat(val);
        }
        return r;
    }

    module.exports = typecast;


},{}],21:[function(require,module,exports){
(function (process){(function (){
// Generated by CoffeeScript 1.6.3
(function() {
  var getNanoSeconds, hrtime, loadTime;

  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
    module.exports = function() {
      return performance.now();
    };
  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
    module.exports = function() {
      return (getNanoSeconds() - loadTime) / 1e6;
    };
    hrtime = process.hrtime;
    getNanoSeconds = function() {
      var hr;
      hr = hrtime();
      return hr[0] * 1e9 + hr[1];
    };
    loadTime = getNanoSeconds();
  } else if (Date.now) {
    module.exports = function() {
      return Date.now() - loadTime;
    };
    loadTime = Date.now();
  } else {
    module.exports = function() {
      return new Date().getTime() - loadTime;
    };
    loadTime = new Date().getTime();
  }

}).call(this);

/*

*/

}).call(this)}).call(this,require(22))
},{"22":22}],22:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],23:[function(require,module,exports){
var now = require(21)
  , global = typeof window === 'undefined' ? {} : window
  , vendors = ['moz', 'webkit']
  , suffix = 'AnimationFrame'
  , raf = global['request' + suffix]
  , caf = global['cancel' + suffix] || global['cancelRequest' + suffix]

for(var i = 0; i < vendors.length && !raf; i++) {
  raf = global[vendors[i] + 'Request' + suffix]
  caf = global[vendors[i] + 'Cancel' + suffix]
      || global[vendors[i] + 'CancelRequest' + suffix]
}

// Some versions of FF have rAF but not cAF
if(!raf || !caf) {
  var last = 0
    , id = 0
    , queue = []
    , frameDuration = 1000 / 60

  raf = function(callback) {
    if(queue.length === 0) {
      var _now = now()
        , next = Math.max(0, frameDuration - (_now - last))
      last = next + _now
      setTimeout(function() {
        var cp = queue.slice(0)
        // Clear queue here to prevent
        // callbacks from appending listeners
        // to the current frame's queue
        queue.length = 0
        for(var i = 0; i < cp.length; i++) {
          if(!cp[i].cancelled) {
            try{
              cp[i].callback(last)
            } catch(e) {
              setTimeout(function() { throw e }, 0)
            }
          }
        }
      }, Math.round(next))
    }
    queue.push({
      handle: ++id,
      callback: callback,
      cancelled: false
    })
    return id
  }

  caf = function(handle) {
    for(var i = 0; i < queue.length; i++) {
      if(queue[i].handle === handle) {
        queue[i].cancelled = true
      }
    }
  }
}

module.exports = function(fn) {
  // Wrap in a new function to prevent
  // `cancel` potentially being assigned
  // to the native rAF function
  return raf.call(global, fn)
}
module.exports.cancel = function() {
  caf.apply(global, arguments)
}

},{"21":21}],24:[function(require,module,exports){
var THREE = require(40);


var undef;


var _renderer;
var _mesh;
var _scene;
var _camera;

var rawShaderPrefix = exports.rawShaderPrefix = undef;
var vertexShader = exports.vertexShader = undef;
var copyMaterial = exports.copyMaterial = undef;

exports.init = init;
exports.copy = copy;
exports.render = render;
exports.createRenderTarget = createRenderTarget;
exports.getColorState = getColorState;
exports.setColorState = setColorState;

function init(renderer) {

    // ensure it wont initialized twice
    if(_renderer) return;

    _renderer = renderer;

    rawShaderPrefix = exports.rawShaderPrefix = 'precision ' + _renderer.capabilities.precision + ' float;\n';

    _scene = new THREE.Scene();
    _camera = new THREE.Camera();
    _camera.position.z = 1;

    copyMaterial = exports.copyMaterial = new THREE.RawShaderMaterial({
        uniforms: {
            u_texture: { type: 't', value: undef }
        },
        vertexShader: vertexShader = exports.vertexShader = rawShaderPrefix + "#define GLSLIFY 1\nattribute vec3 position;\nattribute vec2 uv;\n\nvarying vec2 v_uv;\n\nvoid main() {\n    v_uv = uv;\n    gl_Position = vec4( position, 1.0 );\n}\n",
        fragmentShader: rawShaderPrefix + "#define GLSLIFY 1\nuniform sampler2D u_texture;\n\nvarying vec2 v_uv;\n\nvoid main() {\n    gl_FragColor = texture2D( u_texture, v_uv );\n}\n"
    });

    _mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), copyMaterial );
    _scene.add( _mesh );

}

function copy(inputTexture, ouputTexture) {
    _mesh.material = copyMaterial;
    copyMaterial.uniforms.u_texture.value = inputTexture;
    if(ouputTexture) {
        _renderer.render( _scene, _camera, ouputTexture );
    } else {
        _renderer.render( _scene, _camera );
    }
}
function render(material, renderTarget) {
    _mesh.material = material;
    if(renderTarget) {
        _renderer.render( _scene, _camera, renderTarget );
    } else {
        _renderer.render( _scene, _camera );
    }
}

function createRenderTarget(width, height, format, type, minFilter, magFilter) {
    var renderTarget = new THREE.WebGLRenderTarget(width || 1, height || 1, {
        format: format || THREE.RGBFormat,
        type: type || THREE.UnsignedByteType,
        minFilter: minFilter || THREE.LinearFilter,
        magFilter: magFilter || THREE.LinearFilter,
        // depthBuffer: false,
        // stencilBuffer: false
    });

    renderTarget.texture.generateMipMaps = false;

    return renderTarget;
}

function getColorState() {
    return {
        autoClearColor : _renderer.autoClearColor,
        clearColor : _renderer.getClearColor().getHex(),
        clearAlpha : _renderer.getClearAlpha()
    };
}

function setColorState(state) {
    _renderer.setClearColor(state.clearColor, state.clearAlpha);
    _renderer.autoClearColor = state.autoClearColor;
}

},{"40":40}],25:[function(require,module,exports){
var settings = require(37);
var THREE = require(40);
var MeshMotionMaterial = require(32);

var undef;

exports.mesh = undef;
exports.init = init;

function init() {
    var geometry = new THREE.PlaneGeometry( 4000, 4000, 10, 10 );
    var planeMaterial = new THREE.MeshStandardMaterial( {
        roughness: 0.7,
        metalness: 1.0,
        color: 0x333333,
        emissive: 0x000000
    });
    var floor = exports.mesh = new THREE.Mesh( geometry, planeMaterial );

    floor.rotation.x = -1.57;
    floor.receiveShadow = true;




}

},{"32":32,"37":37,"40":40}],26:[function(require,module,exports){
var settings = require(37);
var THREE = require(40);

var undef;

var mesh = exports.mesh = undef;
var pointLight = exports.pointLight = undef;
exports.init = init;
exports.update = update;

var _shadowDarkness = 0.45;

function init() {

    mesh = exports.mesh = new THREE.Object3D();
    mesh.position.set(0, 500, 0);

    var ambient = new THREE.AmbientLight( 0x333333 );
    mesh.add( ambient );

    pointLight = exports.pointLight = new THREE.PointLight( 0xffffff, 1, 700 );
    pointLight.castShadow = true;
    pointLight.shadowCameraNear = 10;
    pointLight.shadowCameraFar = 700;
    // pointLight.shadowCameraFov = 90;
    pointLight.shadowBias = 0.1;
    // pointLight.shadowDarkness = 0.45;
    pointLight.shadowMapWidth = 4096;
    pointLight.shadowMapHeight = 2048;
    mesh.add( pointLight );

    var directionalLight = new THREE.DirectionalLight( 0xba8b8b, 0.5 );
    directionalLight.position.set( 1, 1, 1 );
    mesh.add( directionalLight );

    var directionalLight2 = new THREE.DirectionalLight( 0x8bbab4, 0.3 );
    directionalLight2.position.set( 1, 1, -1 );
    mesh.add( directionalLight2 );

}

function update(dt) {
    pointLight.shadowDarkness = _shadowDarkness += (settings.shadowDarkness - _shadowDarkness) * 0.1;
}

},{"37":37,"40":40}],27:[function(require,module,exports){
var settings = require(37);
var THREE = require(40);
var shaderParse = require(38);

var simulator = require(35);
var MeshMotionMaterial = require(32);

var undef;

var container = exports.container = undef;
exports.init = init;
exports.update = update;

var _renderer;
var _particleMesh;
var _triangleMesh;
var _meshes;

var _color1;
var _color2;
var _tmpColor;

var TEXTURE_WIDTH = settings.simulatorTextureWidth;
var TEXTURE_HEIGHT = settings.simulatorTextureHeight;
var AMOUNT = TEXTURE_WIDTH * TEXTURE_HEIGHT;

function init(renderer) {

    container = exports.container = new THREE.Object3D();

    _tmpColor = new THREE.Color();
    _color1 = new THREE.Color(settings.color1);
    _color2 = new THREE.Color(settings.color2);

    _meshes = [
        _triangleMesh = _createTriangleMesh(),
        _particleMesh = _createParticleMesh()
    ];
    _triangleMesh.visible = false;
    _particleMesh.visible = false;

    _renderer = renderer;

}

function _createParticleMesh() {

    var position = new Float32Array(AMOUNT * 3);
    var i3;
    for(var i = 0; i < AMOUNT; i++ ) {
        i3 = i * 3;
        position[i3 + 0] = (i % TEXTURE_WIDTH) / TEXTURE_WIDTH;
        position[i3 + 1] = ~~(i / TEXTURE_WIDTH) / TEXTURE_HEIGHT;
    }
    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute( 'position', new THREE.BufferAttribute( position, 3 ));

    var material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
            THREE.UniformsLib.shadowmap,
            {
                texturePosition: { type: 't', value: undef },
                color1: { type: 'c', value: undef },
                color2: { type: 'c', value: undef }
            }
        ]),
        vertexShader: shaderParse("#define GLSLIFY 1\nuniform sampler2D texturePosition;\n\nvarying float vLife;\n// chunk(shadowmap_pars_vertex);\n\nvoid main() {\n\n    vec4 positionInfo = texture2D( texturePosition, position.xy );\n\n    vec4 worldPosition = modelMatrix * vec4( positionInfo.xyz, 1.0 );\n    vec4 mvPosition = viewMatrix * worldPosition;\n\n    // chunk(shadowmap_vertex);\n\n    vLife = positionInfo.w;\n    gl_PointSize = 1300.0 / length( mvPosition.xyz ) * smoothstep(0.0, 0.2, positionInfo.w);\n\n    gl_Position = projectionMatrix * mvPosition;\n\n}\n"),
        fragmentShader: shaderParse("#define GLSLIFY 1\n// chunk(common);\n// chunk(fog_pars_fragment);\n// chunk(shadowmap_pars_fragment);\n\nvarying float vLife;\nuniform vec3 color1;\nuniform vec3 color2;\n\nvoid main() {\n\n    vec3 outgoingLight = mix(color2, color1, smoothstep(0.0, 0.7, vLife));\n\n    // chunk(shadowmap_fragment);\n\n    outgoingLight *= shadowMask;//pow(shadowMask, vec3(0.75));\n\n    // chunk(fog_fragment);\n    // chunk(linear_to_gamma_fragment);\n\n    gl_FragColor = vec4( outgoingLight, 1.0 );\n\n}\n"),
        blending: THREE.NoBlending
    });

    material.uniforms.color1.value = _color1;
    material.uniforms.color2.value = _color2;

    var mesh = new THREE.Points( geometry, material );

    mesh.customDistanceMaterial = new THREE.ShaderMaterial( {
        uniforms: {
            lightPos: { type: 'v3', value: new THREE.Vector3( 0, 0, 0 ) },
            texturePosition: { type: 't', value: undef }
        },
        vertexShader: shaderParse("#define GLSLIFY 1\nuniform sampler2D texturePosition;\n\nvarying vec4 vWorldPosition;\n\nvoid main() {\n\n    vec4 positionInfo = texture2D( texturePosition, position.xy );\n\n    vec4 worldPosition = modelMatrix * vec4( positionInfo.xyz, 1.0 );\n    vec4 mvPosition = viewMatrix * worldPosition;\n\n    gl_PointSize = 50.0 / length( mvPosition.xyz );\n\n    vWorldPosition = worldPosition;\n\n    gl_Position = projectionMatrix * mvPosition;\n\n}\n"),
        fragmentShader: shaderParse("#define GLSLIFY 1\nuniform vec3 lightPos;\nvarying vec4 vWorldPosition;\n\n//chunk(common);\n\nvec4 pack1K ( float depth ) {\n\n   depth /= 1000.0;\n   const vec4 bitSh = vec4( 256.0 * 256.0 * 256.0, 256.0 * 256.0, 256.0, 1.0 );\n   const vec4 bitMsk = vec4( 0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0 );\n   vec4 res = fract( depth * bitSh );\n   res -= res.xxyz * bitMsk;\n   return res;\n\n}\n\nfloat unpack1K ( vec4 color ) {\n\n   const vec4 bitSh = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );\n   return dot( color, bitSh ) * 1000.0;\n\n}\n\nvoid main () {\n\n   gl_FragColor = pack1K( length( vWorldPosition.xyz - lightPos.xyz ) );\n\n}\n"),
        depthTest: true,
        depthWrite: true,
        side: THREE.BackSide,
        blending: THREE.NoBlending
    });

    mesh.motionMaterial = new MeshMotionMaterial( {
        uniforms: {
            texturePosition: { type: 't', value: undef },
            texturePrevPosition: { type: 't', value: undef }
        },
        vertexShader: shaderParse("#define GLSLIFY 1\nuniform sampler2D texturePosition;\nuniform sampler2D texturePrevPosition;\n\nuniform mat4 u_prevModelViewMatrix;\n\nvarying vec2 v_motion;\n\nvoid main() {\n\n    vec4 positionInfo = texture2D( texturePosition, position.xy );\n    vec4 prevPositionInfo = texture2D( texturePrevPosition, position.xy );\n\n    vec4 mvPosition = modelViewMatrix * vec4( positionInfo.xyz, 1.0 );\n    gl_PointSize = 1300.0 / length( mvPosition.xyz ) * smoothstep(0.0, 0.2, positionInfo.w);\n\n    vec4 pos = projectionMatrix * mvPosition;\n    vec4 prevPos = projectionMatrix * u_prevModelViewMatrix * vec4(prevPositionInfo.xyz, 1.0);\n    v_motion = (pos.xy / pos.w - prevPos.xy / prevPos.w) * 0.5 * step(positionInfo.w, prevPositionInfo.w);\n\n    gl_Position = pos;\n\n}\n"),
        depthTest: true,
        depthWrite: true,
        side: THREE.DoubleSide,
        blending: THREE.NoBlending
    });

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    container.add(mesh);

    return mesh;
}

function _createTriangleMesh() {

    var position = new Float32Array(AMOUNT * 3 * 3);
    var positionFlip = new Float32Array(AMOUNT * 3 * 3);
    var fboUV = new Float32Array(AMOUNT * 2 * 3);

    var PI = Math.PI;
    var angle = PI * 2 / 3;
    var angles = [
        Math.sin(angle * 2 + PI),
        Math.cos(angle * 2 + PI),
        Math.sin(angle + PI),
        Math.cos(angle + PI),
        Math.sin(angle * 3 + PI),
        Math.cos(angle * 3 + PI),
        Math.sin(angle * 2),
        Math.cos(angle * 2),
        Math.sin(angle),
        Math.cos(angle),
        Math.sin(angle * 3),
        Math.cos(angle * 3)
    ]
    var i6, i9;
    for(var i = 0; i < AMOUNT; i++ ) {
        i6 = i * 6;
        i9 = i * 9;
        if(i % 2) {
            position[ i9 + 0] = angles[0];
            position[ i9 + 1] = angles[1];
            position[ i9 + 3] = angles[2];
            position[ i9 + 4] = angles[3];
            position[ i9 + 6] = angles[4];
            position[ i9 + 7] = angles[5];

            positionFlip[ i9 + 0] = angles[6];
            positionFlip[ i9 + 1] = angles[7];
            positionFlip[ i9 + 3] = angles[8];
            positionFlip[ i9 + 4] = angles[9];
            positionFlip[ i9 + 6] = angles[10];
            positionFlip[ i9 + 7] = angles[11];
        } else {
            positionFlip[ i9 + 0] = angles[0];
            positionFlip[ i9 + 1] = angles[1];
            positionFlip[ i9 + 3] = angles[2];
            positionFlip[ i9 + 4] = angles[3];
            positionFlip[ i9 + 6] = angles[4];
            positionFlip[ i9 + 7] = angles[5];

            position[ i9 + 0] = angles[6];
            position[ i9 + 1] = angles[7];
            position[ i9 + 3] = angles[8];
            position[ i9 + 4] = angles[9];
            position[ i9 + 6] = angles[10];
            position[ i9 + 7] = angles[11];
        }

        fboUV[ i6 + 0] = fboUV[ i6 + 2] = fboUV[ i6 + 4] = (i % TEXTURE_WIDTH) / TEXTURE_WIDTH;
        fboUV[ i6 + 1 ] = fboUV[ i6 + 3 ] = fboUV[ i6 + 5 ] = ~~(i / TEXTURE_WIDTH) / TEXTURE_HEIGHT;
    }
    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute( 'position', new THREE.BufferAttribute( position, 3 ));
    geometry.addAttribute( 'positionFlip', new THREE.BufferAttribute( positionFlip, 3 ));
    geometry.addAttribute( 'fboUV', new THREE.BufferAttribute( fboUV, 2 ));

    var material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
            THREE.UniformsLib.shadowmap,
            {
                texturePosition: { type: 't', value: undef },
                flipRatio: { type: 'f', value: 0 },
                color1: { type: 'c', value: undef },
                color2: { type: 'c', value: undef },
                cameraMatrix: { type: 'm4', value: undef }
            }
        ]),
        vertexShader: shaderParse("#define GLSLIFY 1\nuniform sampler2D texturePosition;\n\n// chunk(shadowmap_pars_vertex);\n\nvarying float vLife;\nattribute vec3 positionFlip;\nattribute vec2 fboUV;\n\nuniform float flipRatio;\nuniform mat4 cameraMatrix;\n\nvoid main() {\n\n    vec4 positionInfo = texture2D( texturePosition, fboUV );\n    vec3 pos = positionInfo.xyz;\n\n    vec4 worldPosition = modelMatrix * vec4( pos, 1.0 );\n    vec4 mvPosition = viewMatrix * worldPosition;\n\n    vLife = positionInfo.w;\n\n    mvPosition += vec4((position + (positionFlip - position) * flipRatio) * smoothstep(0.0, 0.2, positionInfo.w), 0.0);\n    gl_Position = projectionMatrix * mvPosition;\n    worldPosition = cameraMatrix * mvPosition;\n\n    // chunk(shadowmap_vertex);\n\n}\n"),
        fragmentShader: shaderParse("#define GLSLIFY 1\n// chunk(common);\n// chunk(fog_pars_fragment);\n// chunk(shadowmap_pars_fragment);\n\nvarying float vLife;\nuniform vec3 color1;\nuniform vec3 color2;\n\nvoid main() {\n\n    vec3 outgoingLight = mix(color2, color1, smoothstep(0.0, 0.7, vLife));\n\n    // chunk(shadowmap_fragment);\n\n    outgoingLight *= shadowMask;//pow(shadowMask, vec3(0.75));\n\n    // chunk(fog_fragment);\n    // chunk(linear_to_gamma_fragment);\n\n    gl_FragColor = vec4( outgoingLight, 1.0 );\n\n}\n"),
        blending: THREE.NoBlending
    });

    material.uniforms.color1.value = _color1;
    material.uniforms.color2.value = _color2;
    material.uniforms.cameraMatrix.value = settings.camera.matrixWorld;

    var mesh = new THREE.Mesh( geometry, material );

    mesh.customDistanceMaterial = new THREE.ShaderMaterial( {
        uniforms: {
            lightPos: { type: 'v3', value: new THREE.Vector3( 0, 0, 0 ) },
            texturePosition: { type: 't', value: undef },
            flipRatio: { type: 'f', value: 0 }
        },
        vertexShader: shaderParse("#define GLSLIFY 1\nuniform sampler2D texturePosition;\n\nvarying vec4 vWorldPosition;\n\nattribute vec3 positionFlip;\nattribute vec2 fboUV;\n\nuniform float flipRatio;\n\nvoid main() {\n\n    vec4 positionInfo = texture2D( texturePosition, fboUV );\n    vec3 pos = positionInfo.xyz;\n\n    vec4 worldPosition = modelMatrix * vec4( pos, 1.0 );\n    vec4 mvPosition = viewMatrix * worldPosition;\n\n    vWorldPosition = worldPosition;\n\n    gl_Position = projectionMatrix * (mvPosition + vec4((position + (positionFlip - position) * flipRatio) * smoothstep(0.0, 0.2, positionInfo.w), 0.0));\n\n}\n"),
        fragmentShader: shaderParse("#define GLSLIFY 1\nuniform vec3 lightPos;\nvarying vec4 vWorldPosition;\n\n//chunk(common);\n\nvec4 pack1K ( float depth ) {\n\n   depth /= 1000.0;\n   const vec4 bitSh = vec4( 256.0 * 256.0 * 256.0, 256.0 * 256.0, 256.0, 1.0 );\n   const vec4 bitMsk = vec4( 0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0 );\n   vec4 res = fract( depth * bitSh );\n   res -= res.xxyz * bitMsk;\n   return res;\n\n}\n\nfloat unpack1K ( vec4 color ) {\n\n   const vec4 bitSh = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );\n   return dot( color, bitSh ) * 1000.0;\n\n}\n\nvoid main () {\n\n   gl_FragColor = pack1K( length( vWorldPosition.xyz - lightPos.xyz ) );\n\n}\n"),
        depthTest: true,
        depthWrite: true,
        side: THREE.BackSide,
        blending: THREE.NoBlending
    });

    mesh.motionMaterial = new MeshMotionMaterial( {
        uniforms: {
            texturePosition: { type: 't', value: undef },
            texturePrevPosition: { type: 't', value: undef },
            flipRatio: { type: 'f', value: 0 }
        },
        vertexShader: shaderParse("#define GLSLIFY 1\nuniform sampler2D texturePosition;\nuniform sampler2D texturePrevPosition;\n\nattribute vec3 positionFlip;\nattribute vec2 fboUV;\n\nuniform float flipRatio;\nuniform mat4 u_prevModelViewMatrix;\n\nvarying vec2 v_motion;\n\nvoid main() {\n\n    vec4 positionInfo = texture2D( texturePosition, fboUV );\n    vec4 prevPositionInfo = texture2D( texturePrevPosition, fboUV );\n    gl_Position = projectionMatrix * modelViewMatrix * vec4(positionInfo.xyz + (position + (positionFlip - position) * flipRatio) * smoothstep(0.0, 0.2, positionInfo.w), 1.0);\n\n    vec4 pos = projectionMatrix * modelViewMatrix * vec4(positionInfo.xyz, 1.0);\n    vec4 prevPos = projectionMatrix * u_prevModelViewMatrix * vec4(prevPositionInfo.xyz, 1.0);\n    v_motion = (pos.xy / pos.w - prevPos.xy / prevPos.w) * 0.5 * step(positionInfo.w, prevPositionInfo.w);\n\n}\n"),
        depthTest: true,
        depthWrite: true,
        side: THREE.DoubleSide,
        blending: THREE.NoBlending
    });

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    container.add(mesh);

    return mesh;
}

function update(dt) {
    var mesh;

    _triangleMesh.visible = settings.useTriangleParticles;
    _particleMesh.visible = !settings.useTriangleParticles;

    _tmpColor.setStyle(settings.color1);
    _color1.lerp(_tmpColor, 0.05);

    _tmpColor.setStyle(settings.color2);
    _color2.lerp(_tmpColor, 0.05);

    for(var i = 0; i < 2; i++) {
        mesh = _meshes[i];
        mesh.material.uniforms.texturePosition.value = simulator.positionRenderTarget;
        mesh.customDistanceMaterial.uniforms.texturePosition.value = simulator.positionRenderTarget;
        mesh.motionMaterial.uniforms.texturePrevPosition.value = simulator.prevPositionRenderTarget;
        if(mesh.material.uniforms.flipRatio ) {
            mesh.material.uniforms.flipRatio.value ^= 1;
            mesh.customDistanceMaterial.uniforms.flipRatio.value ^= 1;
            mesh.motionMaterial.uniforms.flipRatio.value ^= 1;
        }
    }
}

},{"32":32,"35":35,"37":37,"38":38,"40":40}],28:[function(require,module,exports){
var THREE = require(40);
var effectComposer = require(30);
var fboHelper = require(24);
var merge = require(15);



var undef;

function Effect() {}

module.exports = Effect;
var _p = Effect.prototype;

_p.init = init;
_p.resize = resize;
_p.render = render;

var _shaderMaterialQuadVertexShader = "#define GLSLIFY 1\nvarying vec2 v_uv;\n\nvoid main() {\n    v_uv = uv;\n    gl_Position = vec4( position, 1.0 );\n}\n";

function init(cfg) {

    merge(this, {

        uniforms: {
            u_texture: { type: 't', value: undef },
            u_resolution: { type: 'v2', value: effectComposer.resolution },
            u_aspect: { type: 'f', value: 1 }
        },
        enabled: true,
        vertexShader: '',
        fragmentShader: '',
        isRawMaterial: true,
        addRawShaderPrefix: true

    }, cfg);

    if(!this.vertexShader) {
        this.vertexShader = this.isRawMaterial ? fboHelper.vertexShader : _shaderMaterialQuadVertexShader;
    }

    if(this.addRawShaderPrefix && this.isRawMaterial) {
        this.vertexShader = fboHelper.rawShaderPrefix + this.vertexShader;
        this.fragmentShader = fboHelper.rawShaderPrefix + this.fragmentShader;
    }

    this.material = new THREE[ this.isRawMaterial ? 'RawShaderMaterial' : 'ShaderMaterial']({
          uniforms : this.uniforms,
          vertexShader : this.vertexShader,
          fragmentShader : this.fragmentShader
    });

}

function resize(width, height) {

}

function render(dt, renderTarget, toScreen) {

    this.uniforms.u_texture.value = renderTarget;
    this.uniforms.u_aspect.value = this.uniforms.u_resolution.value.x / this.uniforms.u_resolution.value.y;

    return effectComposer.render(this.material, toScreen);

}

},{"15":15,"24":24,"30":30,"40":40}],29:[function(require,module,exports){
var Effect = require(28);
var effectComposer = require(30);
var fboHelper = require(24);


var THREE = require(40);

var undef;

var exports = module.exports = new Effect();
var _super = Effect.prototype;

exports.init = init;
exports.render = render;

exports.blurRadius = 1.3;
exports.amount = 0.3;

var _blurMaterial;

var BLUR_BIT_SHIFT = 1;

function init() {

    _super.init.call(this, {
        uniforms: {
            u_blurTexture: { type: 't', value: undef },
            u_amount: { type: 'f', value: 0 }
        },
        fragmentShader: "#define GLSLIFY 1\nuniform sampler2D u_texture;\nuniform sampler2D u_blurTexture;\n\nuniform float u_amount;\n\nvarying vec2 v_uv;\n\nvoid main()\n{\n\n    vec3 baseColor = texture2D(u_texture, v_uv).rgb;\n    vec3 blurColor = texture2D(u_blurTexture, v_uv).rgb;\n    vec3 color = mix(baseColor, 1.0 - ((1.0 - baseColor) * (1.0 - blurColor)), u_amount);\n    // vec3 color = mix(baseColor, max(baseColor, blurColor), u_amount);\n\n    gl_FragColor = vec4(color, 1.0);\n\n}\n"
    });

    _blurMaterial = new THREE.RawShaderMaterial({
        uniforms: {
            u_texture: { type: 't', value: undef },
            u_delta: { type: 'v2', value: new THREE.Vector2() }
        },
        vertexShader: fboHelper.vertexShader,
        fragmentShader: fboHelper.rawShaderPrefix + "#define GLSLIFY 1\nuniform sampler2D u_texture;\nuniform vec2 u_delta;\n\nvarying vec2 v_uv;\n\nvoid main()\n{\n\n    vec3 color = texture2D( u_texture, v_uv ).rgb * 0.1633;\n\n    vec2 delta = u_delta;\n    color += texture2D( u_texture,  v_uv - delta ).rgb * 0.1531;\n    color += texture2D( u_texture,  v_uv + delta ).rgb * 0.1531;\n\n    delta += u_delta;\n    color += texture2D( u_texture,  v_uv - delta ).rgb * 0.12245;\n    color += texture2D( u_texture,  v_uv + delta ).rgb * 0.12245;\n\n    delta += u_delta;\n    color += texture2D( u_texture,  v_uv - delta ).rgb * 0.0918;\n    color += texture2D( u_texture,  v_uv + delta ).rgb * 0.0918;\n\n    delta += u_delta;\n    color += texture2D( u_texture,  v_uv - delta ).rgb * 0.051;\n    color += texture2D( u_texture,  v_uv + delta ).rgb * 0.051;\n\n    gl_FragColor = vec4(color, 1.0);\n\n}\n"
    });

}


function render(dt, renderTarget, toScreen) {

    var tmpRenderTarget1 = effectComposer.getRenderTarget(BLUR_BIT_SHIFT);
    var tmpRenderTarget2 = effectComposer.getRenderTarget(BLUR_BIT_SHIFT);
    effectComposer.releaseRenderTarget(tmpRenderTarget1, tmpRenderTarget2);

    var blurRadius = exports.blurRadius;
    _blurMaterial.uniforms.u_texture.value = renderTarget;
    _blurMaterial.uniforms.u_delta.value.set(blurRadius / effectComposer.resolution.x, 0);

    fboHelper.render(_blurMaterial, tmpRenderTarget1);

    blurRadius = exports.blurRadius;
    _blurMaterial.uniforms.u_texture.value = tmpRenderTarget1;
    _blurMaterial.uniforms.u_delta.value.set(0, blurRadius / effectComposer.resolution.y);
    fboHelper.render(_blurMaterial, tmpRenderTarget2);

    this.uniforms.u_blurTexture.value = tmpRenderTarget2;
    this.uniforms.u_amount.value = exports.amount;
    _super.render.call(this, dt, renderTarget, toScreen);

}

},{"24":24,"28":28,"30":30,"40":40}],30:[function(require,module,exports){
var THREE = require(40);
var fboHelper = require(24);
var merge = require(15);

var undef;

exports.init = init;
exports.resize = resize;
exports.renderQueue = renderQueue;
exports.renderScene = renderScene;
exports.render = render;
exports.swapRenderTarget = swapRenderTarget;
exports.getRenderTarget = getRenderTarget;
exports.releaseRenderTarget = releaseRenderTarget;

exports.resolution = undef;

var queue = exports.queue = [];
var fromRenderTarget = exports.fromRenderTarget = undef;
var toRenderTarget = exports.toRenderTarget = undef;
var resolution = exports.resolution = undef;
var _renderTargetLists = {};
var _renderTargetCounts = {};
var _renderTargetDefaultState = {
    depthBuffer : false,
    texture: {
        generateMipmaps : false
    }
};

exports.renderer = undef;
exports.scene = undef;
exports.camera = undef;

function init(renderer, scene, camera) {

    fromRenderTarget = exports.fromRenderTarget = fboHelper.createRenderTarget();
    toRenderTarget = exports.toRenderTarget = fboHelper.createRenderTarget();

    resolution = exports.resolution = new THREE.Vector2();

    exports.renderer = renderer;
    exports.scene = scene;
    exports.camera = camera;

}

function resize(width, height) {
    resolution.set(width, height);

    fromRenderTarget.setSize(width, height);
    toRenderTarget.setSize(width, height);

    exports.camera.aspect = width / height;
    exports.camera.updateProjectionMatrix();
    exports.renderer.setSize(width, height);

    for(var i = 0, len = queue.length; i < len; i++) {
        queue[i].resize(width, height);
    }
}

function _filterQueue(effect) {
    return effect.enabled;
}

function renderQueue(dt) {
    var renderableQueue = queue.filter(_filterQueue);

    if(renderableQueue.length) {


        toRenderTarget.depthBuffer = true;
        toRenderTarget.stencilBuffer = true;
        exports.renderer.render( exports.scene, exports.camera, toRenderTarget );
        // toRenderTarget.depthBuffer = false;
        // toRenderTarget.stencilBuffer = false;
        swapRenderTarget();

        var effect;
        for(var i = 0, len = renderableQueue.length; i < len; i++) {
            effect = renderableQueue[i];
            effect.render(dt, fromRenderTarget, i === len - 1);
        }

    } else {
        exports.renderer.render( exports.scene, exports.camera );
    }

}

function renderScene(renderTarget, scene, camera) {
    scene = scene || exports.scene;
    camera = camera || exports.camera;
    if(renderTarget) {
        exports.renderer.render( scene, camera, renderTarget );
    } else {
        exports.renderer.render( scene, camera );
    }
}

function render(material, toScreen) {
    fboHelper.render(material, toScreen ? undef : toRenderTarget);
    swapRenderTarget();
    return fromRenderTarget;
}

function swapRenderTarget() {
    var tmp = toRenderTarget;
    toRenderTarget = exports.toRenderTarget = fromRenderTarget;
    fromRenderTarget = exports.fromRenderTarget = tmp;
}


function getRenderTarget(bitShift, isRGBA) {
    bitShift = bitShift || 0;
    isRGBA = +(isRGBA || 0);

    var width = resolution.x >> bitShift;
    var height = resolution.y >> bitShift;
    var id = bitShift + '_' + isRGBA;
    var list = _getRenderTargetList(id);
    var renderTarget;
    if(list.length) {
        renderTarget = list.pop();
        merge(renderTarget, _renderTargetDefaultState);
    } else {
        renderTarget = fboHelper.createRenderTarget(width, height, isRGBA ? THREE.RGBAFormat : THREE.RGBFormat);
        renderTarget._listId = id;
        _renderTargetCounts[id] = _renderTargetCounts[id] || 0;
    }
    _renderTargetCounts[id]++;

    if((renderTarget.width !== width) || (renderTarget.height !== height)) {
        renderTarget.setSize(width, height);
    }

    return renderTarget;
}

function releaseRenderTarget(renderTarget) {
    var renderTargets = arguments;
    var found, j, jlen, id, list;

    for(var i = 0, len = renderTargets.length; i < len; i++) {
        renderTarget = renderTargets[i];
        id = renderTarget._listId;
        list = _getRenderTargetList(id);
        found = false;
        _renderTargetCounts[id]--;
        for(j = 0, jlen = list.length; j < jlen; j++) {
            if(list[j] === renderTarget) {
                found = true;
                break;
            }
        }
        if(!found) {
            list.push(renderTarget);
        }
    }
}

function _getRenderTargetList(id) {
    return _renderTargetLists[id] || (_renderTargetLists[id] = []);
}

},{"15":15,"24":24,"40":40}],31:[function(require,module,exports){
var Effect = require(28);


module.exports = new Effect();
var _super = Effect.prototype;

module.exports.init = init;

function init(isLow) {

    var vs = isLow ? "#define GLSLIFY 1\nvarying vec2 v_rgbNW;\nvarying vec2 v_rgbNE;\nvarying vec2 v_rgbSW;\nvarying vec2 v_rgbSE;\nvarying vec2 v_rgbM;\n\nattribute vec3 position;\nattribute vec2 uv;\n\nuniform vec2 u_resolution;\n\nvarying vec2 v_uv;\n\n//To save 9 dependent texture reads, you can compute\n//these in the vertex shader and use the optimized\n//frag.glsl function in your frag shader. \n\n//This is best suited for mobile devices, like iOS.\n\nvoid texcoords(vec2 fragCoord, vec2 resolution,\n\t\t\tout vec2 v_rgbNW, out vec2 v_rgbNE,\n\t\t\tout vec2 v_rgbSW, out vec2 v_rgbSE,\n\t\t\tout vec2 v_rgbM) {\n\tvec2 inverseVP = 1.0 / resolution.xy;\n\tv_rgbNW = (fragCoord + vec2(-1.0, -1.0)) * inverseVP;\n\tv_rgbNE = (fragCoord + vec2(1.0, -1.0)) * inverseVP;\n\tv_rgbSW = (fragCoord + vec2(-1.0, 1.0)) * inverseVP;\n\tv_rgbSE = (fragCoord + vec2(1.0, 1.0)) * inverseVP;\n\tv_rgbM = vec2(fragCoord * inverseVP);\n}\n\nvoid main() {\n\n   vec2 fragCoord = uv * u_resolution;\n   texcoords(fragCoord, u_resolution, v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);\n\n    v_uv = uv;\n    gl_Position = vec4( position, 1.0 );\n\n}\n" : '';
    var fs = isLow ? "#define GLSLIFY 1\nvarying vec2 v_rgbNW;\nvarying vec2 v_rgbNE;\nvarying vec2 v_rgbSW;\nvarying vec2 v_rgbSE;\nvarying vec2 v_rgbM;\n\nuniform vec2 u_resolution;\nuniform sampler2D u_texture;\n\nvarying vec2 v_uv;\n\n/**\nBasic FXAA implementation based on the code on geeks3d.com with the\nmodification that the texture2DLod stuff was removed since it's\nunsupported by WebGL.\n\n--\n\nFrom:\nhttps://github.com/mitsuhiko/webgl-meincraft\n\nCopyright (c) 2011 by Armin Ronacher.\n\nSome rights reserved.\n\nRedistribution and use in source and binary forms, with or without\nmodification, are permitted provided that the following conditions are\nmet:\n\n    * Redistributions of source code must retain the above copyright\n      notice, this list of conditions and the following disclaimer.\n\n    * Redistributions in binary form must reproduce the above\n      copyright notice, this list of conditions and the following\n      disclaimer in the documentation and/or other materials provided\n      with the distribution.\n\n    * The names of the contributors may not be used to endorse or\n      promote products derived from this software without specific\n      prior written permission.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS\n\"AS IS\" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT\nLIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR\nA PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT\nOWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,\nSPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT\nLIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,\nDATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY\nTHEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\nOF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n*/\n\n#ifndef FXAA_REDUCE_MIN\n    #define FXAA_REDUCE_MIN   (1.0/ 128.0)\n#endif\n#ifndef FXAA_REDUCE_MUL\n    #define FXAA_REDUCE_MUL   (1.0 / 8.0)\n#endif\n#ifndef FXAA_SPAN_MAX\n    #define FXAA_SPAN_MAX     8.0\n#endif\n\n//optimized version for mobile, where dependent \n//texture reads can be a bottleneck\nvec4 fxaa(sampler2D tex, vec2 fragCoord, vec2 resolution,\n            vec2 v_rgbNW, vec2 v_rgbNE, \n            vec2 v_rgbSW, vec2 v_rgbSE, \n            vec2 v_rgbM) {\n    vec4 color;\n    mediump vec2 inverseVP = vec2(1.0 / resolution.x, 1.0 / resolution.y);\n    vec3 rgbNW = texture2D(tex, v_rgbNW).xyz;\n    vec3 rgbNE = texture2D(tex, v_rgbNE).xyz;\n    vec3 rgbSW = texture2D(tex, v_rgbSW).xyz;\n    vec3 rgbSE = texture2D(tex, v_rgbSE).xyz;\n    vec4 texColor = texture2D(tex, v_rgbM);\n    vec3 rgbM  = texColor.xyz;\n    vec3 luma = vec3(0.299, 0.587, 0.114);\n    float lumaNW = dot(rgbNW, luma);\n    float lumaNE = dot(rgbNE, luma);\n    float lumaSW = dot(rgbSW, luma);\n    float lumaSE = dot(rgbSE, luma);\n    float lumaM  = dot(rgbM,  luma);\n    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));\n    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));\n    \n    mediump vec2 dir;\n    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));\n    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));\n    \n    float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) *\n                          (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);\n    \n    float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);\n    dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX),\n              max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),\n              dir * rcpDirMin)) * inverseVP;\n    \n    vec3 rgbA = 0.5 * (\n        texture2D(tex, fragCoord * inverseVP + dir * (1.0 / 3.0 - 0.5)).xyz +\n        texture2D(tex, fragCoord * inverseVP + dir * (2.0 / 3.0 - 0.5)).xyz);\n    vec3 rgbB = rgbA * 0.5 + 0.25 * (\n        texture2D(tex, fragCoord * inverseVP + dir * -0.5).xyz +\n        texture2D(tex, fragCoord * inverseVP + dir * 0.5).xyz);\n\n    float lumaB = dot(rgbB, luma);\n    if ((lumaB < lumaMin) || (lumaB > lumaMax))\n        color = vec4(rgbA, texColor.a);\n    else\n        color = vec4(rgbB, texColor.a);\n    return color;\n}\n\nvoid main() {\n\n    vec2 fragCoord = v_uv * u_resolution;\n\n    gl_FragColor = fxaa(u_texture, fragCoord, u_resolution, v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);\n\n}\n" : "#define GLSLIFY 1\nuniform vec2 u_resolution;\nuniform sampler2D u_texture;\n\n/**\nBasic FXAA implementation based on the code on geeks3d.com with the\nmodification that the texture2DLod stuff was removed since it's\nunsupported by WebGL.\n\n--\n\nFrom:\nhttps://github.com/mitsuhiko/webgl-meincraft\n\nCopyright (c) 2011 by Armin Ronacher.\n\nSome rights reserved.\n\nRedistribution and use in source and binary forms, with or without\nmodification, are permitted provided that the following conditions are\nmet:\n\n    * Redistributions of source code must retain the above copyright\n      notice, this list of conditions and the following disclaimer.\n\n    * Redistributions in binary form must reproduce the above\n      copyright notice, this list of conditions and the following\n      disclaimer in the documentation and/or other materials provided\n      with the distribution.\n\n    * The names of the contributors may not be used to endorse or\n      promote products derived from this software without specific\n      prior written permission.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS\n\"AS IS\" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT\nLIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR\nA PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT\nOWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,\nSPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT\nLIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,\nDATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY\nTHEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\nOF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n*/\n\n#ifndef FXAA_REDUCE_MIN\n    #define FXAA_REDUCE_MIN   (1.0/ 128.0)\n#endif\n#ifndef FXAA_REDUCE_MUL\n    #define FXAA_REDUCE_MUL   (1.0 / 8.0)\n#endif\n#ifndef FXAA_SPAN_MAX\n    #define FXAA_SPAN_MAX     8.0\n#endif\n\n//optimized version for mobile, where dependent \n//texture reads can be a bottleneck\nvec4 fxaa(sampler2D tex, vec2 fragCoord, vec2 resolution,\n            vec2 v_rgbNW, vec2 v_rgbNE, \n            vec2 v_rgbSW, vec2 v_rgbSE, \n            vec2 v_rgbM) {\n    vec4 color;\n    mediump vec2 inverseVP = vec2(1.0 / resolution.x, 1.0 / resolution.y);\n    vec3 rgbNW = texture2D(tex, v_rgbNW).xyz;\n    vec3 rgbNE = texture2D(tex, v_rgbNE).xyz;\n    vec3 rgbSW = texture2D(tex, v_rgbSW).xyz;\n    vec3 rgbSE = texture2D(tex, v_rgbSE).xyz;\n    vec4 texColor = texture2D(tex, v_rgbM);\n    vec3 rgbM  = texColor.xyz;\n    vec3 luma = vec3(0.299, 0.587, 0.114);\n    float lumaNW = dot(rgbNW, luma);\n    float lumaNE = dot(rgbNE, luma);\n    float lumaSW = dot(rgbSW, luma);\n    float lumaSE = dot(rgbSE, luma);\n    float lumaM  = dot(rgbM,  luma);\n    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));\n    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));\n    \n    mediump vec2 dir;\n    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));\n    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));\n    \n    float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) *\n                          (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);\n    \n    float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);\n    dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX),\n              max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),\n              dir * rcpDirMin)) * inverseVP;\n    \n    vec3 rgbA = 0.5 * (\n        texture2D(tex, fragCoord * inverseVP + dir * (1.0 / 3.0 - 0.5)).xyz +\n        texture2D(tex, fragCoord * inverseVP + dir * (2.0 / 3.0 - 0.5)).xyz);\n    vec3 rgbB = rgbA * 0.5 + 0.25 * (\n        texture2D(tex, fragCoord * inverseVP + dir * -0.5).xyz +\n        texture2D(tex, fragCoord * inverseVP + dir * 0.5).xyz);\n\n    float lumaB = dot(rgbB, luma);\n    if ((lumaB < lumaMin) || (lumaB > lumaMax))\n        color = vec4(rgbA, texColor.a);\n    else\n        color = vec4(rgbB, texColor.a);\n    return color;\n}\n\n//To save 9 dependent texture reads, you can compute\n//these in the vertex shader and use the optimized\n//frag.glsl function in your frag shader. \n\n//This is best suited for mobile devices, like iOS.\n\nvoid texcoords(vec2 fragCoord, vec2 resolution,\n\t\t\tout vec2 v_rgbNW, out vec2 v_rgbNE,\n\t\t\tout vec2 v_rgbSW, out vec2 v_rgbSE,\n\t\t\tout vec2 v_rgbM) {\n\tvec2 inverseVP = 1.0 / resolution.xy;\n\tv_rgbNW = (fragCoord + vec2(-1.0, -1.0)) * inverseVP;\n\tv_rgbNE = (fragCoord + vec2(1.0, -1.0)) * inverseVP;\n\tv_rgbSW = (fragCoord + vec2(-1.0, 1.0)) * inverseVP;\n\tv_rgbSE = (fragCoord + vec2(1.0, 1.0)) * inverseVP;\n\tv_rgbM = vec2(fragCoord * inverseVP);\n}\n\nvec4 apply(sampler2D tex, vec2 fragCoord, vec2 resolution) {\n\tmediump vec2 v_rgbNW;\n\tmediump vec2 v_rgbNE;\n\tmediump vec2 v_rgbSW;\n\tmediump vec2 v_rgbSE;\n\tmediump vec2 v_rgbM;\n\n\t//compute the texture coords\n\ttexcoords(fragCoord, resolution, v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);\n\t\n\t//compute FXAA\n\treturn fxaa(tex, fragCoord, resolution, v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);\n}\n\nvoid main() {\n    gl_FragColor = apply(u_texture, gl_FragCoord.xy, u_resolution);\n}\n";

    _super.init.call(this, {
        uniforms: {},
        vertexShader: vs,
        fragmentShader: fs
    });

}

},{"28":28}],32:[function(require,module,exports){
var THREE = require(40);

var mixIn = require(16);
var fillIn = require(10);
var shaderParse = require(38);

function MeshMotionMaterial ( parameters ) {

    parameters = parameters || {};

    var uniforms = parameters.uniforms || {};
    var vertexShader = shaderParse("#define GLSLIFY 1\n// chunk(morphtarget_pars_vertex);\n// chunk(skinning_pars_vertex);\n\nuniform mat4 u_prevModelViewMatrix;\n\nvarying vec2 v_motion;\n\nvoid main() {\n\n    // chunk(skinbase_vertex);\n    // chunk(begin_vertex);\n\n    // chunk(morphtarget_vertex);\n    // chunk(skinning_vertex);\n\n    vec4 pos = projectionMatrix * modelViewMatrix * vec4( transformed, 1.0 );\n    vec4 prevPos = projectionMatrix * u_prevModelViewMatrix * vec4( transformed, 1.0 );\n    gl_Position = pos;\n    v_motion = (pos.xy / pos.w - prevPos.xy / prevPos.w) * 0.5;\n\n}\n");
    var fragmentShader = shaderParse("#define GLSLIFY 1\nuniform float u_motionMultiplier;\n\nvarying vec2 v_motion;\n\nvoid main() {\n\n        gl_FragColor = vec4( v_motion * u_motionMultiplier, gl_FragCoord.z, 1.0 );\n\n}\n");
    this.motionMultiplier = parameters.motionMultiplier || 1;

    THREE.ShaderMaterial.call( this, mixIn({

        uniforms: fillIn(uniforms, {
            u_prevModelViewMatrix: {type: 'm4', value: new THREE.Matrix4()},
            u_motionMultiplier: {type: 'f', value: 1}
        }),
        vertexShader : vertexShader,
        fragmentShader : fragmentShader

    }, parameters));

}

var _p = MeshMotionMaterial.prototype = Object.create( THREE.ShaderMaterial.prototype );
_p.constructor = MeshMotionMaterial;
module.exports = MeshMotionMaterial;

},{"10":10,"16":16,"38":38,"40":40}],33:[function(require,module,exports){
var Effect = require(28);
var effectComposer = require(30);
var fboHelper = require(24);


var THREE = require(40);

var undef;

var exports = module.exports = new Effect();
var _super = Effect.prototype;

exports.init = init;
exports.resize = resize;
exports.render = render;

exports.useSampling = false;

// for debug
exports.skipMatrixUpdate = false;

exports.fadeStrength = 1;
exports.motionMultiplier = 1;
exports.maxDistance = 100;
exports.targetFPS = 60;
exports.leaning = 0.5;

// lines method only options
exports.jitter = 0;
exports.opacity = 1;
exports.depthBias = 0.002;
exports.depthTest = false;
exports.useDithering = false;

exports.motionRenderTargetScale = 1;
exports.linesRenderTargetScale = 1 / 2;

var _motionRenderTarget;
var _linesRenderTarget;

var _lines;
var _linesCamera;
var _linesScene;
var _linesPositions;
var _linesPositionAttribute;
var _linesGeometry;
var _linesMaterial;

var _samplingMaterial;

var _prevUseDithering;
var _prevUseSampling;

var _visibleCache = [];

var _width;
var _height;

function init(sampleCount) {

    var gl = effectComposer.renderer.getContext();
    if(!gl.getExtension('OES_texture_float') || !gl.getExtension('OES_texture_float_linear')) {
        alert('no float linear support');
    }

    _motionRenderTarget = fboHelper.createRenderTarget(1, 1, THREE.RGBAFormat, THREE.FloatType);
    _motionRenderTarget.depthBuffer = true;

    _linesRenderTarget = fboHelper.createRenderTarget(1, 1, THREE.RGBAFormat, THREE.FloatType);
    _linesCamera = new THREE.Camera();
    _linesCamera.position.z = 1.0;
    _linesScene = new THREE.Scene();

    _super.init.call(this, {
        uniforms: {
            u_lineAlphaMultiplier: { type: 'f', value: 1 },
            u_linesTexture: { type: 't', value: _linesRenderTarget }
            // u_motionTexture: { type: 't', value: _motionRenderTarget }
        },
        fragmentShader: "#define GLSLIFY 1\nuniform sampler2D u_texture;\nuniform sampler2D u_linesTexture;\nuniform float u_lineAlphaMultiplier;\n\nvarying vec2 v_uv;\n\nvoid main() {\n\n    vec3 base = texture2D( u_texture, v_uv.xy ).rgb;\n    vec4 lines = texture2D( u_linesTexture, v_uv.xy );\n\n    vec3 color = (base + lines.rgb * u_lineAlphaMultiplier) / (lines.a * u_lineAlphaMultiplier + 1.0);\n\n    gl_FragColor = vec4( color, 1.0 );\n\n}\n"
    });

    _linesPositions = [];
    _linesGeometry = new THREE.BufferGeometry();
    _linesMaterial = new THREE.RawShaderMaterial({
        uniforms: {
            u_texture: { type: 't', value: undef },
            u_motionTexture: { type: 't', value: _motionRenderTarget },
            u_resolution: { type: 'v2', value: effectComposer.resolution },
            u_maxDistance: { type: 'f', value: 1 },
            u_jitter: { type: 'f', value: 0.3 },
            u_fadeStrength: { type: 'f', value: 1 },
            u_motionMultiplier: { type: 'f', value: 1 },
            u_depthTest: { type: 'f', value: 0 },
            u_opacity: { type: 'f', value: 1 },
            u_leaning: { type: 'f', value: 0.5 },
            u_depthBias: { type: 'f', value: 0.01 }
        },
        vertexShader: fboHelper.rawShaderPrefix + "#define GLSLIFY 1\nattribute vec3 position;\n\nuniform sampler2D u_texture;\nuniform sampler2D u_motionTexture;\n\nuniform vec2 u_resolution;\nuniform float u_maxDistance;\nuniform float u_jitter;\nuniform float u_motionMultiplier;\nuniform float u_leaning;\n\nvarying vec3 v_color;\nvarying float v_ratio;\nvarying float v_depth;\nvarying vec2 v_uv;\n\nvoid main() {\n\n    v_color = texture2D( u_texture, position.xy ).rgb;\n\n    float side = step(0.001, position.z);\n\n    v_ratio = side;\n\n    vec3 motion = texture2D( u_motionTexture, position.xy ).xyz;\n    v_depth = motion.z;\n\n    vec2 offset = motion.xy * u_resolution * u_motionMultiplier;\n    float offsetDistance = length(offset);\n    if(offsetDistance > u_maxDistance) {\n        offset = normalize(offset) * u_maxDistance;\n    }\n\n    vec2 pos = position.xy * 2.0 - 1.0 - offset / u_resolution * 2.0 * (1.0 - position.z * u_jitter) * (side - u_leaning);\n    v_uv = pos * 0.5 + 0.5;\n\n    gl_Position = vec4( pos, 0.0, 1.0 );\n\n}\n",
        fragmentShader: fboHelper.rawShaderPrefix + "#define GLSLIFY 1\nuniform sampler2D u_motionTexture;\nuniform float u_depthTest;\nuniform float u_opacity;\nuniform float u_leaning;\nuniform float u_fadeStrength;\nuniform float u_depthBias;\nuniform float u_useDepthWeight;\n\nvarying vec3 v_color;\nvarying float v_ratio;\nvarying float v_depth;\nvarying vec2 v_uv;\n\nvoid main() {\n\n    vec3 motion = texture2D( u_motionTexture, v_uv ).xyz;\n\n    float alpha = smoothstep(0.0, u_leaning, v_ratio) * (1.0 - smoothstep (u_leaning, 1.0, v_ratio));\n\n    alpha = pow(alpha, u_fadeStrength) * u_opacity;\n\n    if(alpha < 0.00392157) {\n        discard;\n    }\n\n    float threshold = v_depth * step(0.0001, motion.z);\n    alpha *= max(1.0 - u_depthTest, smoothstep(threshold - u_depthBias, threshold, motion.z));\n\n    gl_FragColor = vec4( v_color * alpha, alpha );\n\n}\n",

        blending : THREE.CustomBlending,
        blendEquation : THREE.AddEquation,
        blendSrc : THREE.OneFactor,
        blendDst : THREE.OneFactor ,
        blendEquationAlpha : THREE.AddEquation,
        blendSrcAlpha : THREE.OneFactor,
        blendDstAlpha : THREE.OneFactor,
        depthTest: false,
        depthWrite: false,
        transparent: true
    });
    _lines = new THREE.LineSegments(_linesGeometry, _linesMaterial);
    _linesScene.add(_lines);

    _samplingMaterial = new THREE.RawShaderMaterial({
        uniforms: {
            u_texture: { type: 't', value: undef },
            u_motionTexture: { type: 't', value: _motionRenderTarget },
            u_resolution: { type: 'v2', value: effectComposer.resolution },
            u_maxDistance: { type: 'f', value: 1 },
            u_fadeStrength: { type: 'f', value: 1 },
            u_motionMultiplier: { type: 'f', value: 1 },
            u_leaning: { type: 'f', value: 0.5 }
        },
        defines: {
            SAMPLE_COUNT: sampleCount || 21
        },
        vertexShader: this.material.vertexShader,
        fragmentShader: fboHelper.rawShaderPrefix + '#define SAMPLE_COUNT ' + (sampleCount || 21) + '\n' + "#define GLSLIFY 1\nuniform sampler2D u_texture;\nuniform sampler2D u_motionTexture;\n\nuniform vec2 u_resolution;\nuniform float u_maxDistance;\nuniform float u_motionMultiplier;\nuniform float u_leaning;\n\nvarying vec2 v_uv;\n\nvoid main() {\n\n    vec2 motion = texture2D( u_motionTexture, v_uv ).xy;\n\n    vec2 offset = motion * u_resolution * u_motionMultiplier;\n    float offsetDistance = length(offset);\n    if(offsetDistance > u_maxDistance) {\n        offset = normalize(offset) * u_maxDistance;\n    }\n    vec2 delta = - offset / u_resolution * 2.0 / float(SAMPLE_COUNT);\n    vec2 pos = v_uv - delta * u_leaning * float(SAMPLE_COUNT);\n    vec3 color = vec3(0.0);\n\n    for(int i = 0; i < SAMPLE_COUNT; i++) {\n        color += texture2D( u_texture, pos ).rgb;\n        pos += delta;\n    }\n\n    gl_FragColor = vec4( color / float(SAMPLE_COUNT), 1.0 );\n\n}\n"
    });
}

function resize(width, height) {

    if(!width) {
        width = _width;
        height = _height;
    } else {
        _width = width;
        _height = height;
    }

    var motionWidth = ~~(width * exports.motionRenderTargetScale);
    var motionHeight = ~~(height * exports.motionRenderTargetScale);
    _motionRenderTarget.setSize(motionWidth , motionHeight);

    if(!exports.useSampling) {
        var linesWidth = ~~(width * exports.linesRenderTargetScale);
        var linesHeight = ~~(height * exports.linesRenderTargetScale);
        _linesRenderTarget.setSize(linesWidth, linesHeight);

        var i;
        var noDithering = !exports.useDithering;
        var amount = noDithering ? linesWidth * linesHeight : _getDitheringAmount(linesWidth, linesHeight);
        var currentLen = _linesPositions.length / 6;
        if(amount > currentLen) {
            _linesPositions = new Float32Array(amount * 6);
            _linesPositionAttribute = new THREE.BufferAttribute(_linesPositions, 3);
            _linesGeometry.removeAttribute('position');
            _linesGeometry.addAttribute( 'position', _linesPositionAttribute );
        }
        var i6 = 0;
        var x, y;
        var size = linesWidth * linesHeight;
        for(i = 0; i < size; i++) {
            x = i % linesWidth;
            y = ~~(i / linesWidth);
            if(noDithering || ((x + (y & 1)) & 1)) {
                _linesPositions[i6 + 0] = _linesPositions[i6 + 3] = (x + 0.5) / linesWidth;
                _linesPositions[i6 + 1] = _linesPositions[i6 + 4] = (y + 0.5) / linesHeight;
                _linesPositions[i6 + 2] = 0;
                _linesPositions[i6 + 5] = (0.001 + 0.999 * Math.random());
                i6 += 6;
            }
        }
        _linesPositionAttribute.needsUpdate = true;
        _linesGeometry.drawRange.count = amount * 2;
    }

    _prevUseDithering = exports.useDithering;
    _prevUseSampling = exports.useSampling;

}

// dithering
function _getDitheringAmount(width, height) {
    if((width & 1) && (height & 1)) {
        return (((width - 1) * (height - 1)) >> 1) + (width >> 1) + (height >> 1);
    } else {
        return (width * height) >> 1;
    }
}

function render(dt, renderTarget, toScreen) {

    if(_prevUseDithering !== exports.useDithering) {
        resize();
    } else if(_prevUseSampling !== exports.useSampling) {
        resize();
    }

    var useSampling = exports.useSampling;
    var fpsRatio = 1000 / (dt < 16.667 ? 16.667 : dt) / exports.targetFPS;

    var state = fboHelper.getColorState();
    effectComposer.renderer.setClearColor(0, 1);
    effectComposer.renderer.clearTarget(_motionRenderTarget, true);

    effectComposer.scene.traverseVisible(_setObjectBeforeState);
    effectComposer.renderScene(_motionRenderTarget);
    for(var i = 0, len = _visibleCache.length; i < len; i++) {
        _setObjectAfterState(_visibleCache[i]);
    }
    _visibleCache = [];

    if(!useSampling) {
        _linesMaterial.uniforms.u_maxDistance.value = exports.maxDistance;
        _linesMaterial.uniforms.u_jitter.value = exports.jitter;
        _linesMaterial.uniforms.u_fadeStrength.value = exports.fadeStrength;
        _linesMaterial.uniforms.u_motionMultiplier.value = exports.motionMultiplier * fpsRatio;
        _linesMaterial.uniforms.u_depthTest.value = exports.depthTest;
        _linesMaterial.uniforms.u_opacity.value = exports.opacity;
        _linesMaterial.uniforms.u_leaning.value = Math.max(0.001, Math.min(0.999, exports.leaning));
        _linesMaterial.uniforms.u_depthBias.value = Math.max(0.00001, exports.depthBias);
        _linesMaterial.uniforms.u_texture.value = renderTarget;

        effectComposer.renderer.setClearColor(0, 0);
        effectComposer.renderer.clearTarget(_linesRenderTarget, true);
        effectComposer.renderer.render(_linesScene, _linesCamera, _linesRenderTarget);
    }

    fboHelper.setColorState(state);

    if(useSampling) {
        _samplingMaterial.uniforms.u_maxDistance.value = exports.maxDistance;
        _samplingMaterial.uniforms.u_fadeStrength.value = exports.fadeStrength;
        _samplingMaterial.uniforms.u_motionMultiplier.value = exports.motionMultiplier * fpsRatio;
        _samplingMaterial.uniforms.u_leaning.value = Math.max(0.001, Math.min(0.999, exports.leaning));
        _samplingMaterial.uniforms.u_texture.value = renderTarget;

        effectComposer.render(_samplingMaterial, toScreen);
    } else {
        this.uniforms.u_lineAlphaMultiplier.value = 1 + exports.useDithering;
        _super.render.call(this, dt, renderTarget, toScreen);
    }

}

function _setObjectBeforeState(obj) {
    if(obj.motionMaterial) {
        obj._tmpMaterial = obj.material;
        obj.material = obj.motionMaterial;
        obj.material.uniforms.u_motionMultiplier.value = obj.material.motionMultiplier;
    } else if(obj.material) {
        obj.visible = false;
    }

    _visibleCache.push(obj);
}

function _setObjectAfterState(obj) {
    if(obj.motionMaterial) {
        obj.material = obj._tmpMaterial;
        obj._tmpMaterial = undef;
        if(!exports.skipMatrixUpdate) {
            obj.motionMaterial.uniforms.u_prevModelViewMatrix.value.copy(obj.modelViewMatrix);
        }
    } else {
        obj.visible = true;
    }
}

},{"24":24,"28":28,"30":30,"40":40}],34:[function(require,module,exports){
var effectComposer = require(30);
var fxaa = require(31);
var bloom = require(29);
var motionBlur = require(33);
var fboHelper = require(24);

var undef;

exports.init = init;
exports.resize = resize;
exports.render = render;
exports.visualizeTarget = undef;

var _renderer;
var _scene;
var _camera;

function init(renderer, scene, camera) {

    _renderer = renderer;
    _scene = scene;
    _camera = _camera;

    effectComposer.init(renderer, scene, camera);

    // for less power machine, pass true
    // fxaa.init(true);

    fxaa.init();
    effectComposer.queue.push(fxaa);

    motionBlur.init();
    effectComposer.queue.push(motionBlur);

    bloom.init();
    effectComposer.queue.push(bloom);

}

function resize(width, height) {
    effectComposer.resize(width, height);
}


function render(dt) {

    effectComposer.renderQueue(dt);

    if(exports.visualizeTarget) {
        fboHelper.copy(exports.visualizeTarget);
    }

}

},{"24":24,"29":29,"30":30,"31":31,"33":33}],35:[function(require,module,exports){
var settings = require(37);
var THREE = require(40);

var undef;


var shaderParse = require(38);

var _copyShader;
var _positionShader;
var _textureDefaultPosition;
var _positionRenderTarget;
var _positionRenderTarget2;

var _renderer;
var _mesh;
var _scene;
var _camera;
var _followPoint;
var _followPointTime = 0;

var TEXTURE_WIDTH = exports.TEXTURE_WIDTH = settings.simulatorTextureWidth;
var TEXTURE_HEIGHT = exports.TEXTURE_HEIGHT = settings.simulatorTextureHeight;
var AMOUNT = exports.AMOUNT = TEXTURE_WIDTH * TEXTURE_HEIGHT;

exports.init = init;
exports.update = update;
exports.initAnimation = 0;

exports.positionRenderTarget = undef;
exports.prevPositionRenderTarget = undef;

function init(renderer) {

    _renderer = renderer;
    _followPoint = new THREE.Vector3();

    var rawShaderPrefix = 'precision ' + renderer.capabilities.precision + ' float;\n';

    var gl = _renderer.getContext();
    if ( !gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) ) {
        alert( 'No support for vertex shader textures!' );
        return;
    }
    if ( !gl.getExtension( 'OES_texture_float' )) {
        alert( 'No OES_texture_float support for float textures!' );
        return;
    }

    _scene = new THREE.Scene();
    _camera = new THREE.Camera();
    _camera.position.z = 1;

    _copyShader = new THREE.RawShaderMaterial({
        uniforms: {
            resolution: { type: 'v2', value: new THREE.Vector2( TEXTURE_WIDTH, TEXTURE_HEIGHT ) },
            texture: { type: 't', value: undef }
        },
        vertexShader: rawShaderPrefix + shaderParse("#define GLSLIFY 1\nattribute vec3 position;\n\nvoid main() {\n    gl_Position = vec4( position, 1.0 );\n}\n"),
        fragmentShader: rawShaderPrefix + shaderParse("#define GLSLIFY 1\nuniform vec2 resolution;\nuniform sampler2D texture;\n\nvoid main() {\n    vec2 uv = gl_FragCoord.xy / resolution.xy;\n    gl_FragColor = texture2D( texture, uv );\n}\n")
    });

    _positionShader = new THREE.RawShaderMaterial({
        uniforms: {
            resolution: { type: 'v2', value: new THREE.Vector2( TEXTURE_WIDTH, TEXTURE_HEIGHT ) },
            texturePosition: { type: 't', value: undef },
            textureDefaultPosition: { type: 't', value: undef },
            mouse3d: { type: 'v3', value: new THREE.Vector3 },
            speed: { type: 'f', value: 1 },
            dieSpeed: { type: 'f', value: 0 },
            radius: { type: 'f', value: 0 },
            curlSize: { type: 'f', value: 0 },
            attraction: { type: 'f', value: 0 },
            time: { type: 'f', value: 0 },
            initAnimation: { type: 'f', value: 0 }
        },
        vertexShader: rawShaderPrefix + shaderParse("#define GLSLIFY 1\nattribute vec3 position;\n\nvoid main() {\n    gl_Position = vec4( position, 1.0 );\n}\n"),
        fragmentShader: rawShaderPrefix + shaderParse("#define GLSLIFY 1\nuniform vec2 resolution;\nuniform sampler2D texturePosition;\nuniform sampler2D textureDefaultPosition;\nuniform float time;\nuniform float speed;\nuniform float dieSpeed;\nuniform float radius;\nuniform float curlSize;\nuniform float attraction;\nuniform float initAnimation;\nuniform vec3 mouse3d;\n\nvec4 mod289(vec4 x) {\n    return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nfloat mod289(float x) {\n    return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 permute(vec4 x) {\n    return mod289(((x*34.0)+1.0)*x);\n}\n\nfloat permute(float x) {\n    return mod289(((x*34.0)+1.0)*x);\n}\n\nvec4 taylorInvSqrt(vec4 r) {\n    return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nfloat taylorInvSqrt(float r) {\n    return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nvec4 grad4(float j, vec4 ip) {\n    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);\n    vec4 p,s;\n\n    p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;\n    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);\n    s = vec4(lessThan(p, vec4(0.0)));\n    p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;\n\n    return p;\n}\n\n#define F4 0.309016994374947451\n\nvec4 simplexNoiseDerivatives (vec4 v) {\n    const vec4  C = vec4( 0.138196601125011,0.276393202250021,0.414589803375032,-0.447213595499958);\n\n    vec4 i  = floor(v + dot(v, vec4(F4)) );\n    vec4 x0 = v -   i + dot(i, C.xxxx);\n\n    vec4 i0;\n    vec3 isX = step( x0.yzw, x0.xxx );\n    vec3 isYZ = step( x0.zww, x0.yyz );\n    i0.x = isX.x + isX.y + isX.z;\n    i0.yzw = 1.0 - isX;\n    i0.y += isYZ.x + isYZ.y;\n    i0.zw += 1.0 - isYZ.xy;\n    i0.z += isYZ.z;\n    i0.w += 1.0 - isYZ.z;\n\n    vec4 i3 = clamp( i0, 0.0, 1.0 );\n    vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );\n    vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );\n\n    vec4 x1 = x0 - i1 + C.xxxx;\n    vec4 x2 = x0 - i2 + C.yyyy;\n    vec4 x3 = x0 - i3 + C.zzzz;\n    vec4 x4 = x0 + C.wwww;\n\n    i = mod289(i);\n    float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);\n    vec4 j1 = permute( permute( permute( permute (\n             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))\n           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))\n           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))\n           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));\n\n    vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;\n\n    vec4 p0 = grad4(j0,   ip);\n    vec4 p1 = grad4(j1.x, ip);\n    vec4 p2 = grad4(j1.y, ip);\n    vec4 p3 = grad4(j1.z, ip);\n    vec4 p4 = grad4(j1.w, ip);\n\n    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n    p0 *= norm.x;\n    p1 *= norm.y;\n    p2 *= norm.z;\n    p3 *= norm.w;\n    p4 *= taylorInvSqrt(dot(p4,p4));\n\n    vec3 values0 = vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2)); //value of contributions from each corner at point\n    vec2 values1 = vec2(dot(p3, x3), dot(p4, x4));\n\n    vec3 m0 = max(0.5 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0); //(0.5 - x^2) where x is the distance\n    vec2 m1 = max(0.5 - vec2(dot(x3,x3), dot(x4,x4)), 0.0);\n\n    vec3 temp0 = -6.0 * m0 * m0 * values0;\n    vec2 temp1 = -6.0 * m1 * m1 * values1;\n\n    vec3 mmm0 = m0 * m0 * m0;\n    vec2 mmm1 = m1 * m1 * m1;\n\n    float dx = temp0[0] * x0.x + temp0[1] * x1.x + temp0[2] * x2.x + temp1[0] * x3.x + temp1[1] * x4.x + mmm0[0] * p0.x + mmm0[1] * p1.x + mmm0[2] * p2.x + mmm1[0] * p3.x + mmm1[1] * p4.x;\n    float dy = temp0[0] * x0.y + temp0[1] * x1.y + temp0[2] * x2.y + temp1[0] * x3.y + temp1[1] * x4.y + mmm0[0] * p0.y + mmm0[1] * p1.y + mmm0[2] * p2.y + mmm1[0] * p3.y + mmm1[1] * p4.y;\n    float dz = temp0[0] * x0.z + temp0[1] * x1.z + temp0[2] * x2.z + temp1[0] * x3.z + temp1[1] * x4.z + mmm0[0] * p0.z + mmm0[1] * p1.z + mmm0[2] * p2.z + mmm1[0] * p3.z + mmm1[1] * p4.z;\n    float dw = temp0[0] * x0.w + temp0[1] * x1.w + temp0[2] * x2.w + temp1[0] * x3.w + temp1[1] * x4.w + mmm0[0] * p0.w + mmm0[1] * p1.w + mmm0[2] * p2.w + mmm1[0] * p3.w + mmm1[1] * p4.w;\n\n    return vec4(dx, dy, dz, dw) * 49.0;\n}\n\nvec3 curl( in vec3 p, in float noiseTime, in float persistence ) {\n\n    vec4 xNoisePotentialDerivatives = vec4(0.0);\n    vec4 yNoisePotentialDerivatives = vec4(0.0);\n    vec4 zNoisePotentialDerivatives = vec4(0.0);\n\n    for (int i = 0; i < 3; ++i) {\n\n        float twoPowI = pow(2.0, float(i));\n        float scale = 0.5 * twoPowI * pow(persistence, float(i));\n\n        xNoisePotentialDerivatives += simplexNoiseDerivatives(vec4(p * twoPowI, noiseTime)) * scale;\n        yNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((p + vec3(123.4, 129845.6, -1239.1)) * twoPowI, noiseTime)) * scale;\n        zNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((p + vec3(-9519.0, 9051.0, -123.0)) * twoPowI, noiseTime)) * scale;\n    }\n\n    return vec3(\n        zNoisePotentialDerivatives[1] - yNoisePotentialDerivatives[2],\n        xNoisePotentialDerivatives[2] - zNoisePotentialDerivatives[0],\n        yNoisePotentialDerivatives[0] - xNoisePotentialDerivatives[1]\n    );\n\n}\n\nvoid main() {\n\n    vec2 uv = gl_FragCoord.xy / resolution.xy;\n\n    vec4 positionInfo = texture2D( texturePosition, uv );\n    vec3 position = mix(vec3(0.0, -200.0, 0.0), positionInfo.xyz, smoothstep(0.0, 0.3, initAnimation));\n    float life = positionInfo.a - dieSpeed;\n\n    vec3 followPosition = mix(vec3(0.0, -(1.0 - initAnimation) * 200.0, 0.0), mouse3d, smoothstep(0.2, 0.7, initAnimation));\n\n    if(life < 0.0) {\n        positionInfo = texture2D( textureDefaultPosition, uv );\n        position = positionInfo.xyz * (1.0 + sin(time * 15.0) * 0.2 + (1.0 - initAnimation)) * 0.4 * radius;\n        position += followPosition;\n        life = 0.5 + fract(positionInfo.w * 21.4131 + time);\n    } else {\n        vec3 delta = followPosition - position;\n        position += delta * (0.005 + life * 0.01) * attraction * (1.0 - smoothstep(50.0, 350.0, length(delta))) *speed;\n        position += curl(position * curlSize, time, 0.1 + (1.0 - life) * 0.1) *speed;\n    }\n\n    gl_FragColor = vec4(position, life);\n\n}\n"),
        blending: THREE.NoBlending,
        transparent: false,
        depthWrite: false,
        depthTest: false
    });

    _mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), _copyShader );
    _scene.add( _mesh );

    _positionRenderTarget = new THREE.WebGLRenderTarget(TEXTURE_WIDTH, TEXTURE_HEIGHT, {
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        depthWrite: false,
        depthBuffer: false,
        stencilBuffer: false
    });
    _positionRenderTarget2 = _positionRenderTarget.clone();
    _copyTexture(_createPositionTexture(), _positionRenderTarget);
    _copyTexture(_positionRenderTarget, _positionRenderTarget2);

}

function _copyTexture(input, output) {
    _mesh.material = _copyShader;
    _copyShader.uniforms.texture.value = input;
    _renderer.render( _scene, _camera, output );
}

function _updatePosition(dt) {

    // swap
    var tmp = _positionRenderTarget;
    _positionRenderTarget = _positionRenderTarget2;
    _positionRenderTarget2 = tmp;

    _mesh.material = _positionShader;
    _positionShader.uniforms.textureDefaultPosition.value = _textureDefaultPosition;
    _positionShader.uniforms.texturePosition.value = _positionRenderTarget2;
    _positionShader.uniforms.time.value += dt * 0.001;
    _renderer.render( _scene, _camera, _positionRenderTarget );
}

function _createPositionTexture() {
    var positions = new Float32Array( AMOUNT * 4 );
    var i4;
    var r, phi, theta;
    for(var i = 0; i < AMOUNT; i++) {
        i4 = i * 4;
        // r = (0.5 + Math.pow(Math.random(), 0.4) * 0.5) * 50;
        r = (0.5 + Math.random() * 0.5) * 50;
        phi = (Math.random() - 0.5) * Math.PI;
        theta = Math.random() * Math.PI * 2;
        positions[i4 + 0] = r * Math.cos(theta) * Math.cos(phi);
        positions[i4 + 1] = r * Math.sin(phi);
        positions[i4 + 2] = r * Math.sin(theta) * Math.cos(phi);
        positions[i4 + 3] = Math.random();
    }
    var texture = new THREE.DataTexture( positions, TEXTURE_WIDTH, TEXTURE_HEIGHT, THREE.RGBAFormat, THREE.FloatType );
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    texture.generateMipmaps = false;
    texture.flipY = false;
    _textureDefaultPosition = texture;
    return texture;
}

function update(dt) {

    if(settings.speed || settings.dieSpeed) {
        var r = 200;
        var h = 60;
        if(settings.isMobile) {
            r = 100;
            h = 40;
        }

        var autoClearColor = _renderer.autoClearColor;
        var clearColor = _renderer.getClearColor().getHex();
        var clearAlpha = _renderer.getClearAlpha();

        _renderer.autoClearColor = false;

        var deltaRatio = dt / 16.6667;

        _positionShader.uniforms.speed.value = settings.speed * deltaRatio;
        _positionShader.uniforms.dieSpeed.value = settings.dieSpeed * deltaRatio;
        _positionShader.uniforms.radius.value = settings.radius;
        _positionShader.uniforms.curlSize.value = settings.curlSize;
        _positionShader.uniforms.attraction.value = settings.attraction;
        _positionShader.uniforms.initAnimation.value = exports.initAnimation;

        if(settings.followMouse) {
            _positionShader.uniforms.mouse3d.value.copy(settings.mouse3d);
        } else {
            _followPointTime += dt * 0.001 * settings.speed;
            _followPoint.set(
                Math.cos(_followPointTime) * r,
                Math.cos(_followPointTime * 4.0) * h,
                Math.sin(_followPointTime * 2.0) * r
            );
            _positionShader.uniforms.mouse3d.value.lerp(_followPoint, 0.2);
        }

        // _renderer.setClearColor(0, 0);
        _updatePosition(dt);

        _renderer.setClearColor(clearColor, clearAlpha);
        _renderer.autoClearColor = autoClearColor;
        exports.positionRenderTarget = _positionRenderTarget;
        exports.prevPositionRenderTarget = _positionRenderTarget2;

    }

}



},{"37":37,"38":38,"40":40}],36:[function(require,module,exports){
//var THREE = require('three');

/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */
/*global THREE, console */

// This set of controls performs orbiting, dollying (zooming), and panning. It maintains
// the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
// supported.
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finter swipe

THREE.OrbitControls = function ( object, domElement ) {

    this.object = object;
    this.domElement = ( domElement !== undefined ) ? domElement : document;

    // API

    this.rotateEaseRatio = 0.02;
    this.zoomEaseRatio = 0.05;

    // Set to false to disable this control
    this.enabled = true;

    // "target" sets the location of focus, where the control orbits around
    // and where it pans with respect to.
    this.target = new THREE.Vector3();

    // center is old, deprecated; use "target" instead
    this.center = this.target;

    // This option actually enables dollying in and out; left as "zoom" for
    // backwards compatibility
    this.noZoom = false;
    this.zoomSpeed = 1.0;

    // Limits to how far you can dolly in and out ( PerspectiveCamera only )
    this.minDistance = 0;
    this.maxDistance = Infinity;

    // Limits to how far you can zoom in and out ( OrthographicCamera only )
    this.minZoom = 0;
    this.maxZoom = Infinity;

    // Set to true to disable this control
    this.noRotate = false;
    this.rotateSpeed = 1.0;

    // Set to true to disable this control
    this.noPan = false;
    this.keyPanSpeed = 7.0; // pixels moved per arrow key push

    // Set to true to automatically rotate around the target
    this.autoRotate = false;
    this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

    // How far you can orbit vertically, upper and lower limits.
    // Range is 0 to Math.PI radians.
    this.minPolarAngle = 0; // radians
    this.maxPolarAngle = Math.PI; // radians

    // How far you can orbit horizontally, upper and lower limits.
    // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
    this.minAzimuthAngle = - Infinity; // radians
    this.maxAzimuthAngle = Infinity; // radians

    // Set to true to disable use of the keys
    this.noKeys = false;

    // The four arrow keys
    this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

    // Mouse buttons
    this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };

    ////////////
    // internals

    var scope = this;

    var EPS = 0.000001;

    var rotateStart = new THREE.Vector2();
    var rotateEnd = new THREE.Vector2();
    var rotateDelta = new THREE.Vector2();

    var panStart = new THREE.Vector2();
    var panEnd = new THREE.Vector2();
    var panDelta = new THREE.Vector2();
    var panOffset = new THREE.Vector3();

    var offset = new THREE.Vector3();

    var dollyStart = new THREE.Vector2();
    var dollyEnd = new THREE.Vector2();
    var dollyDelta = new THREE.Vector2();

    var theta;
    var phi;
    var phiDelta = 0;
    var thetaDelta = 0;
    var scale = 1;
    var pan = new THREE.Vector3();

    var lastPosition = new THREE.Vector3();
    var lastQuaternion = new THREE.Quaternion();

    var STATE = { NONE : -1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

    var state = STATE.NONE;

    // for reset

    this.target0 = this.target.clone();
    this.position0 = this.object.position.clone();
    this.zoom0 = this.object.zoom;

    // so camera.up is the orbit axis

    var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
    var quatInverse = quat.clone().inverse();

    // events

    var changeEvent = { type: 'change' };
    var startEvent = { type: 'start' };
    var endEvent = { type: 'end' };

    this.rotateLeft = function ( angle ) {

        if ( angle === undefined ) {

            angle = getAutoRotationAngle();

        }

        thetaDelta -= angle;

    };

    this.rotateUp = function ( angle ) {

        if ( angle === undefined ) {

            angle = getAutoRotationAngle();

        }

        phiDelta -= angle;

    };

    // pass in distance in world space to move left
    this.panLeft = function ( distance ) {

        var te = this.object.matrix.elements;

        // get X column of matrix
        panOffset.set( te[ 0 ], te[ 1 ], te[ 2 ] );
        panOffset.multiplyScalar( - distance );

        pan.add( panOffset );

    };

    // pass in distance in world space to move up
    this.panUp = function ( distance ) {

        var te = this.object.matrix.elements;

        // get Y column of matrix
        panOffset.set( te[ 4 ], te[ 5 ], te[ 6 ] );
        panOffset.multiplyScalar( distance );

        pan.add( panOffset );

    };

    // pass in x,y of change desired in pixel space,
    // right and down are positive
    this.pan = function ( deltaX, deltaY ) {

        var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

        if ( scope.object instanceof THREE.PerspectiveCamera ) {

            // perspective
            var position = scope.object.position;
            var offset = position.clone().sub( scope.target );
            var targetDistance = offset.length();

            // half of the fov is center to top of screen
            targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

            // we actually don't use screenWidth, since perspective camera is fixed to screen height
            scope.panLeft( 2 * deltaX * targetDistance / element.clientHeight );
            scope.panUp( 2 * deltaY * targetDistance / element.clientHeight );

        } else if ( scope.object instanceof THREE.OrthographicCamera ) {

            // orthographic
            scope.panLeft( deltaX * (scope.object.right - scope.object.left) / element.clientWidth );
            scope.panUp( deltaY * (scope.object.top - scope.object.bottom) / element.clientHeight );

        } else {

            // camera neither orthographic or perspective
            console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );

        }

    };

    this.dollyIn = function ( dollyScale ) {

        if ( dollyScale === undefined ) {

            dollyScale = getZoomScale();

        }

        if ( scope.object instanceof THREE.PerspectiveCamera ) {

            scale /= dollyScale;

        } else if ( scope.object instanceof THREE.OrthographicCamera ) {

            scope.object.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.object.zoom * dollyScale ) );
            scope.object.updateProjectionMatrix();
            scope.dispatchEvent( changeEvent );

        } else {

            console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );

        }

    };

    this.dollyOut = function ( dollyScale ) {

        if ( dollyScale === undefined ) {

            dollyScale = getZoomScale();

        }

        if ( scope.object instanceof THREE.PerspectiveCamera ) {

            scale *= dollyScale;

        } else if ( scope.object instanceof THREE.OrthographicCamera ) {

            scope.object.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.object.zoom / dollyScale ) );
            scope.object.updateProjectionMatrix();
            scope.dispatchEvent( changeEvent );

        } else {

            console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );

        }

    };

    this.update = function () {

        var position = this.object.position;

        offset.copy( position ).sub( this.target );

        // rotate offset to "y-axis-is-up" space
        offset.applyQuaternion( quat );

        // angle from z-axis around y-axis

        theta = Math.atan2( offset.x, offset.z );

        // angle from y-axis

        phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y );

        if ( this.autoRotate && state === STATE.NONE ) {

            this.rotateLeft( getAutoRotationAngle() );

        }

        var thetaDeltaBit = thetaDelta * this.rotateEaseRatio;
        var phiDeltaBit = phiDelta * this.rotateEaseRatio;
        var scaleBit = (scale - 1) * this.zoomEaseRatio;
        theta += thetaDeltaBit;
        phi += phiDeltaBit;

        // restrict theta to be between desired limits
        theta = Math.max( this.minAzimuthAngle, Math.min( this.maxAzimuthAngle, theta ) );

        // restrict phi to be between desired limits
        phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, phi ) );

        // restrict phi to be betwee EPS and PI-EPS
        phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

        var radius = offset.length() * (1 + scaleBit);

        // restrict radius to be between desired limits
        radius = Math.max( this.minDistance, Math.min( this.maxDistance, radius ) );

        // move target to panned location
        this.target.add( pan );

        offset.x = radius * Math.sin( phi ) * Math.sin( theta );
        offset.y = radius * Math.cos( phi );
        offset.z = radius * Math.sin( phi ) * Math.cos( theta );

        // rotate offset back to "camera-up-vector-is-up" space
        offset.applyQuaternion( quatInverse );

        position.copy( this.target ).add( offset );

        this.object.lookAt( this.target );

        thetaDelta -= thetaDeltaBit;
        phiDelta -= phiDeltaBit;
        scale = scale / (1 + scaleBit);
        pan.set( 0, 0, 0 );

        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8

        if ( lastPosition.distanceToSquared( this.object.position ) > EPS
            || 8 * (1 - lastQuaternion.dot(this.object.quaternion)) > EPS ) {

            this.dispatchEvent( changeEvent );

            lastPosition.copy( this.object.position );
            lastQuaternion.copy (this.object.quaternion );

        }

    };


    this.reset = function () {

        state = STATE.NONE;

        this.target.copy( this.target0 );
        this.object.position.copy( this.position0 );
        this.object.zoom = this.zoom0;

        this.object.updateProjectionMatrix();
        this.dispatchEvent( changeEvent );

        this.update();

    };

    this.getPolarAngle = function () {

        return phi;

    };

    this.getAzimuthalAngle = function () {

        return theta

    };

    function getAutoRotationAngle() {

        return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

    }

    function getZoomScale() {

        return Math.pow( 0.95, scope.zoomSpeed );

    }

    function onMouseDown( event ) {

        if ( scope.enabled === false ) return;
        event.preventDefault();

        if ( event.button === scope.mouseButtons.ORBIT ) {
            if ( scope.noRotate === true ) return;

            state = STATE.ROTATE;

            rotateStart.set( event.clientX, event.clientY );

        } else if ( event.button === scope.mouseButtons.ZOOM ) {
            if ( scope.noZoom === true ) return;

            state = STATE.DOLLY;

            dollyStart.set( event.clientX, event.clientY );

        } else if ( event.button === scope.mouseButtons.PAN ) {
            if ( scope.noPan === true ) return;

            state = STATE.PAN;

            panStart.set( event.clientX, event.clientY );

        }

        if ( state !== STATE.NONE ) {
            document.addEventListener( 'mousemove', onMouseMove, false );
            document.addEventListener( 'mouseup', onMouseUp, false );
            scope.dispatchEvent( startEvent );
        }

    }

    function onMouseMove( event ) {

        if ( scope.enabled === false ) return;

        event.preventDefault();

        var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

        if ( state === STATE.ROTATE ) {

            if ( scope.noRotate === true ) return;

            rotateEnd.set( event.clientX, event.clientY );
            rotateDelta.subVectors( rotateEnd, rotateStart );

            // rotating across whole screen goes 360 degrees around
            scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

            // rotating up and down along whole screen attempts to go 360, but limited to 180
            scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

            rotateStart.copy( rotateEnd );

        } else if ( state === STATE.DOLLY ) {

            if ( scope.noZoom === true ) return;

            dollyEnd.set( event.clientX, event.clientY );
            dollyDelta.subVectors( dollyEnd, dollyStart );

            if ( dollyDelta.y > 0 ) {

                scope.dollyIn();

            } else if ( dollyDelta.y < 0 ) {

                scope.dollyOut();

            }

            dollyStart.copy( dollyEnd );

        } else if ( state === STATE.PAN ) {

            if ( scope.noPan === true ) return;

            panEnd.set( event.clientX, event.clientY );
            panDelta.subVectors( panEnd, panStart );

            scope.pan( panDelta.x, panDelta.y );

            panStart.copy( panEnd );

        }

        if ( state !== STATE.NONE ) scope.update();

    }

    function onMouseUp( /* event */ ) {

        if ( scope.enabled === false ) return;

        document.removeEventListener( 'mousemove', onMouseMove, false );
        document.removeEventListener( 'mouseup', onMouseUp, false );
        scope.dispatchEvent( endEvent );
        state = STATE.NONE;

    }

    function onMouseWheel( event ) {

        if ( scope.enabled === false || scope.noZoom === true || state !== STATE.NONE ) return;

        event.preventDefault();
        event.stopPropagation();

        var delta = 0;

        if ( event.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9

            delta = event.wheelDelta;

        } else if ( event.detail !== undefined ) { // Firefox

            delta = - event.detail;

        }

        if ( delta > 0 ) {

            scope.dollyOut();

        } else if ( delta < 0 ) {

            scope.dollyIn();

        }

        scope.update();
        scope.dispatchEvent( startEvent );
        scope.dispatchEvent( endEvent );

    }

    function onKeyDown( event ) {

        if ( scope.enabled === false || scope.noKeys === true || scope.noPan === true ) return;

        switch ( event.keyCode ) {

            case scope.keys.UP:
                scope.pan( 0, scope.keyPanSpeed );
                scope.update();
                break;

            case scope.keys.BOTTOM:
                scope.pan( 0, - scope.keyPanSpeed );
                scope.update();
                break;

            case scope.keys.LEFT:
                scope.pan( scope.keyPanSpeed, 0 );
                scope.update();
                break;

            case scope.keys.RIGHT:
                scope.pan( - scope.keyPanSpeed, 0 );
                scope.update();
                break;

        }

    }

    function touchstart( event ) {

        if ( scope.enabled === false ) return;

        switch ( event.touches.length ) {

            case 1: // one-fingered touch: rotate

                if ( scope.noRotate === true ) return;

                state = STATE.TOUCH_ROTATE;

                rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
                break;

            case 2: // two-fingered touch: dolly

                if ( scope.noZoom === true ) return;

                state = STATE.TOUCH_DOLLY;

                var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
                var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
                var distance = Math.sqrt( dx * dx + dy * dy );
                dollyStart.set( 0, distance );
                break;

            case 3: // three-fingered touch: pan

                if ( scope.noPan === true ) return;

                state = STATE.TOUCH_PAN;

                panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
                break;

            default:

                state = STATE.NONE;

        }

        if ( state !== STATE.NONE ) scope.dispatchEvent( startEvent );

    }

    function touchmove( event ) {

        if ( scope.enabled === false ) return;

        event.preventDefault();
        event.stopPropagation();

        var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

        switch ( event.touches.length ) {

            case 1: // one-fingered touch: rotate

                if ( scope.noRotate === true ) return;
                if ( state !== STATE.TOUCH_ROTATE ) return;

                rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
                rotateDelta.subVectors( rotateEnd, rotateStart );

                // rotating across whole screen goes 360 degrees around
                scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );
                // rotating up and down along whole screen attempts to go 360, but limited to 180
                scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

                rotateStart.copy( rotateEnd );

                scope.update();
                break;

            case 2: // two-fingered touch: dolly

                if ( scope.noZoom === true ) return;
                if ( state !== STATE.TOUCH_DOLLY ) return;

                var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
                var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
                var distance = Math.sqrt( dx * dx + dy * dy );

                dollyEnd.set( 0, distance );
                dollyDelta.subVectors( dollyEnd, dollyStart );

                if ( dollyDelta.y > 0 ) {

                    scope.dollyOut();

                } else if ( dollyDelta.y < 0 ) {

                    scope.dollyIn();

                }

                dollyStart.copy( dollyEnd );

                scope.update();
                break;

            case 3: // three-fingered touch: pan

                if ( scope.noPan === true ) return;
                if ( state !== STATE.TOUCH_PAN ) return;

                panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
                panDelta.subVectors( panEnd, panStart );

                scope.pan( panDelta.x, panDelta.y );

                panStart.copy( panEnd );

                scope.update();
                break;

            default:

                state = STATE.NONE;

        }

    }

    function touchend( /* event */ ) {

        if ( scope.enabled === false ) return;

        scope.dispatchEvent( endEvent );
        state = STATE.NONE;

    }

    this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
    this.domElement.addEventListener( 'mousedown', onMouseDown, false );
    this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
    this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox

    this.domElement.addEventListener( 'touchstart', touchstart, false );
    this.domElement.addEventListener( 'touchend', touchend, false );
    this.domElement.addEventListener( 'touchmove', touchmove, false );

    window.addEventListener( 'keydown', onKeyDown, false );

    // force an update at start
    this.update();

};

THREE.OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );
THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;


module.exports = THREE.OrbitControls;

},{}],37:[function(require,module,exports){
var parse = require(19);
var keys = require(14);
var query = exports.query = parse(window.location.href.replace('#','?'));

exports.useStats = false;
exports.isMobile = /(iPad|iPhone|Android)/i.test(navigator.userAgent);

var amountMap = {
    '4k' : [64, 64, 0.29],
    '8k' : [128, 64, 0.42],
    '16k' : [128, 128, 0.48],
    '32k' : [256, 128, 0.55],
    '65k' : [256, 256, 0.6],
    '131k' : [512, 256, 0.85],
    '252k' : [512, 512, 1.2],
    '524k' : [1024, 512, 1.4],
    '1m' : [1024, 1024, 1.6],
    '2m' : [2048, 1024, 2],
    '4m' : [2048, 2048, 2.5]
};

exports.amountList = keys(amountMap);
query.amount = amountMap[query.amount] ? query.amount : '65k';
var amountInfo = amountMap[query.amount];
exports.simulatorTextureWidth = amountInfo[0];
exports.simulatorTextureHeight = amountInfo[1];

exports.useTriangleParticles = true;
exports.followMouse = true;

exports.speed = 1;
exports.dieSpeed = 0.015;
exports.radius = amountInfo[2];
exports.curlSize = 0.02;
exports.attraction = 1;
exports.shadowDarkness = 0.45;

exports.bgColor = '#343434';
exports.color1 = '#ffffff';
exports.color2 = '#ffffff';

exports.fxaa = false;
var motionBlurQualityMap = exports.motionBlurQualityMap = {
    best: 1,
    high: 0.5,
    medium: 1 / 3,
    low: 0.25
};
exports.motionBlurQualityList = keys(motionBlurQualityMap);
query.motionBlurQuality = motionBlurQualityMap[query.motionBlurQuality] ? query.motionBlurQuality : 'medium';
exports.motionBlur = true;
exports.motionBlurPause = false;
exports.bloom = true;

},{"14":14,"19":19}],38:[function(require,module,exports){
var THREE = require(40);

var threeChunkReplaceRegExp = /\/\/\s?chunk_replace\s(.+)([\d\D]+)\/\/\s?end_chunk_replace/gm;
var threeChunkRegExp = /\/\/\s?chunk\(\s?(\w+)\s?\);/g;
// var glslifyBugFixRegExp = /(_\d+_\d+)(_\d+_\d+)+/g;
// var glslifyGlobalRegExp = /GLOBAL_VAR_([^_\.\)\;\,\s]+)(_\d+_\d+)?/g;
var glslifyGlobalRegExp = /GLOBAL_VAR_([^_\.\)\;\,\s]+)(_\d+)?/g;

var _chunkReplaceObj;

function _storeChunkReplaceParse(shader) {
    _chunkReplaceObj = {};
    return shader.replace(threeChunkReplaceRegExp, _storeChunkReplaceFunc);
}

function _threeChunkParse(shader) {
    return shader.replace(threeChunkRegExp, _replaceThreeChunkFunc);
}

// function _glslifyBugFixParse(shader) {
//     return shader.replace(glslifyBugFixRegExp, _returnFirst);
// }

function _glslifyGlobalParse(shader) {
    return shader.replace(glslifyGlobalRegExp, _returnFirst);
}

function _storeChunkReplaceFunc(a, b, c) {
    _chunkReplaceObj[b.trim()] = c;
    return '';
}

function _replaceThreeChunkFunc(a, b) {
    var str = THREE.ShaderChunk[b] + '\n';
    for(var id in _chunkReplaceObj) {
        str = str.replace(id, _chunkReplaceObj[id]);
    }
    return str;
}

function _returnFirst(a, b) {
    return b;
}

function parse(shader) {
    shader = _storeChunkReplaceParse(shader);
    shader = _threeChunkParse(shader);
    // shader = _glslifyBugFixParse(shader);
    return _glslifyGlobalParse(shader);
}

module.exports = parse;

},{"40":40}],39:[function(require,module,exports){
var raf = require(23);

var THREE = require(40);

var OrbitControls = require(36);
var settings = require(37);

var math = require(42);
var ease = require(41);

var postprocessing = require(34);
var motionBlur = require(33);
var fxaa = require(31);
var bloom = require(29);
var fboHelper = require(24);
var simulator = require(35);
var particles = require(27);
var lights = require(26);
var floor = require(25);


var undef;

var _width = 0;
var _height = 0;

var _control;
var _camera;
var _scene;
var _renderer;

var _time = 0;
var _ray = new THREE.Ray();

var _initAnimation = 0;

var _bgColor;

// 挂载相关（同文档挂载约定，参考 model-morph-32s-embed.js）：
// 不再假定拥有整个 document.body，而是挂到调用方传入的容器里；
// 保留一份 touchmove 处理器引用以便 dispose() 时能正确移除。
var _container;
var _onMouseMoveParent;
var _touchMoveHandler;
var _rafId = 0;

function init(container, onMouseMoveParent) {

    _container = container || document.body;
    _onMouseMoveParent = onMouseMoveParent;

    _bgColor = new THREE.Color(settings.bgColor);
    settings.mouse = new THREE.Vector2(0, 0);
    settings.mouse3d = _ray.origin;

    _renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    _renderer.setClearColor(settings.bgColor);
    _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    _renderer.shadowMap.enabled = true;
    _container.appendChild(_renderer.domElement);

    _scene = new THREE.Scene();
    _scene.fog = new THREE.FogExp2(settings.bgColor, 0.001);

    _camera = new THREE.PerspectiveCamera(45, 1, 10, 3000);
    _camera.position.set(300, 60, 300).normalize().multiplyScalar(1000);
    settings.camera = _camera;
    settings.cameraPosition = _camera.position;

    fboHelper.init(_renderer);
    postprocessing.init(_renderer, _scene, _camera);

    simulator.init(_renderer);
    particles.init(_renderer);
    _scene.add(particles.container);

    lights.init(_renderer);
    _scene.add(lights.mesh);

    floor.init(_renderer);
    floor.mesh.position.y = -100;
    _scene.add(floor.mesh);

    _control = new OrbitControls(_camera, _renderer.domElement);
    _control.target.y = 50;
    _control.maxDistance = 1000;
    _control.minPolarAngle = 0.3;
    _control.maxPolarAngle = Math.PI / 2 - 0.1;
    _control.noPan = true;
    _control.update();

    // Mobile: disable orbit controls
    if (settings.isMobile) {
        _control.enabled = false;
    }

    _touchMoveHandler = _bindTouch(_onMove);

    window.addEventListener('resize', _onResize);
    window.addEventListener('mousemove', _onMove);
    window.addEventListener('touchmove', _touchMoveHandler);
    window.addEventListener('keyup', _onKeyUp);

    _time = Date.now();
    _onResize();
    _loop();

}

function _onKeyUp(evt) {
    if (evt.keyCode === 32) {
        settings.speed = settings.speed === 0 ? 1 : 0;
        settings.dieSpeed = settings.dieSpeed === 0 ? 0.015 : 0;
    }
}

function _bindTouch(func) {
    return function (evt) {
        if (settings.isMobile && evt.preventDefault) {
            evt.preventDefault();
        }
        func(evt.changedTouches[0]);
    };
}

function _onMove(evt) {
    settings.mouse.x = (evt.pageX / _width) * 2 - 1;
    settings.mouse.y = -(evt.pageY / _height) * 2 + 1;
    if (_onMouseMoveParent) {
        try { _onMouseMoveParent(evt.pageX, evt.pageY); } catch (err) {}
    }
}

function _onResize() {
    _width = window.innerWidth;
    _height = window.innerHeight;
    postprocessing.resize(_width, _height);
}

function _loop() {
    var newTime = Date.now();
    _rafId = raf(_loop);
    _render(newTime - _time, newTime);
    _time = newTime;
}

function _render(dt, newTime) {

    motionBlur.skipMatrixUpdate = !(settings.dieSpeed || settings.speed) && settings.motionBlurPause;

    _bgColor.setStyle(settings.bgColor);
    var tmpColor = floor.mesh.material.color;
    tmpColor.lerp(_bgColor, 0.05);
    _scene.fog.color.copy(tmpColor);
    _renderer.setClearColor(tmpColor.getHex());

    _initAnimation = Math.min(_initAnimation + dt * 0.00025, 1);
    simulator.initAnimation = _initAnimation;

    _control.maxDistance = _initAnimation === 1 ? 1000 : math.lerp(1000, 450, ease.easeOutCubic(_initAnimation));
    _control.update();
    lights.update(dt, _camera);

    // update mouse3d
    _camera.updateMatrixWorld();
    _ray.origin.setFromMatrixPosition(_camera.matrixWorld);
    _ray.direction.set(settings.mouse.x, settings.mouse.y, 0.5).unproject(_camera).sub(_ray.origin).normalize();
    var distance = _ray.origin.length() / Math.cos(Math.PI - _ray.direction.angleTo(_ray.origin));
    _ray.origin.add(_ray.direction.multiplyScalar(distance * 1.0));
    simulator.update(dt);
    particles.update(dt);

    fxaa.enabled = !!settings.fxaa;
    motionBlur.enabled = !!settings.motionBlur;
    bloom.enabled = !!settings.bloom;

    postprocessing.render(dt, newTime);

}

/**
 * dispose(): 停止渲染循环、移除本模块自行添加的监听与 canvas。
 * 注意：simulator / particles / postprocessing / fboHelper / lights / floor
 * 等子模块是打包进本文件的单例闭包，本身不提供 GPU 资源释放接口（渲染目标、
 * 几何体等不会被回收），因此本效果设计为“挂载一次、随页面生命周期结束”，
 * 和 model-morph-32s-embed.js 里 mountModelMorph32s 的现有限制一致，
 * 不建议在同一个页面里反复 mount/dispose。
 */
function dispose() {
    if (_rafId) {
        raf.cancel(_rafId);
        _rafId = 0;
    }
    window.removeEventListener('resize', _onResize);
    window.removeEventListener('mousemove', _onMove);
    if (_touchMoveHandler) {
        window.removeEventListener('touchmove', _touchMoveHandler);
    }
    window.removeEventListener('keyup', _onKeyUp);
    if (_renderer) {
        try {
            _renderer.dispose();
            // 主动丢弃 WebGL 上下文：这个效果内部（simulator/particles/postprocessing/
            // fboHelper 等）会创建多个 WebGLRenderTarget，自身不提供释放接口；
            // 如果同一页面里会反复进出这个阶段（比如六道可反复重看），
            // 不主动释放上下文容易在多次来回后逼近浏览器 WebGL 上下文数量上限，
            // 进而让页面其他正在渲染的 3D 内容意外花屏/丢失上下文。
            if (typeof _renderer.forceContextLoss === 'function') {
                _renderer.forceContextLoss();
            }
            if (_renderer.domElement && _renderer.domElement.parentNode) {
                _renderer.domElement.parentNode.removeChild(_renderer.domElement);
            }
        } catch (e) {}
    }
}

/**
 * 挂载到父页同一文档内（约定与 js/model-morph-32s-embed.js 一致），不使用 iframe。
 *
 * !!! 版本隔离要求（务必遵守，否则每帧报错且画面全黑） !!!
 * three.r74.min.js 是老式单文件构建，内部（WebGLRenderer.render 等方法）用
 * `instanceof THREE.Camera` 这类写法做类型检查，这里的 THREE 是「调用那一刻」
 * 的全局 window.THREE，不是被冻结的私有引用。也就是说：
 *   1. mountTheSpirit() 调用时，window.THREE 必须是本文件配套的 three.r74.min.js；
 *   2. 在本效果的渲染循环还在跑的整个过程中，window.THREE 必须一直保持为 r74，
 *      中途切回主项目的 r128 会导致 renderer.render() 每帧报
 *      "camera is not an instance of THREE.Camera" 且不渲染任何内容；
 *   3. 只有在调用 dispose()（停止渲染循环）之后，才可以把 window.THREE 切回主项目版本。
 * 推荐的加载/切换顺序：
 *   var savedTHREE = window.THREE;               // 记下主项目当前用的 r128
 *   <script src=".../three.r74.min.js">           // 覆盖 window.THREE 为 r74
 *   <script src=".../the-spirit-embed.js">
 *   var handle = window.mountTheSpirit({ container });   // 此刻 window.THREE 仍是 r74
 *   // ……展示阶段，不要在此期间改动 window.THREE ……
 *   handle.dispose();                              // 离开该阶段前先停止渲染循环
 *   window.THREE = savedTHREE;                     // 再还原成 r128，供后续阶段使用
 *
 * opts: {
 *   container: HTMLElement,        必填，承载 canvas 的容器（建议全屏定位）
 *   onMouseMove?: function(x, y)   可选，转发鼠标位置（页面坐标系），用于同步自定义光标等
 * }
 * 返回: { dispose: function }
 */
window.mountTheSpirit = function (opts) {
    opts = opts || {};
    if (!opts.container) {
        console.error('mountTheSpirit: opts.container required');
        return { dispose: function () {} };
    }
    init(opts.container, opts.onMouseMove);
    return { dispose: dispose };
};

},{"23":23,"24":24,"25":25,"26":26,"27":27,"29":29,"31":31,"33":33,"34":34,"35":35,"36":36,"37":37,"40":40,"41":41,"42":42}],40:[function(require,module,exports){
module.exports = window.THREE;

},{}],41:[function(require,module,exports){
// from https://github.com/kaelzhang/easing-functions/
var basic = {
    Linear: {
        None: function(e) {
            return e;
        }
    },
    Quad: {
        In: function(e) {
            return e * e;
        },
        Out: function(e) {
            return e * (2 - e);
        },
        InOut: function(e) {
            if ((e *= 2) < 1) return 0.5 * e * e;
            return - 0.5 * (--e * (e - 2) - 1);
        }
    },
    Cubic: {
        In: function(e) {
            return e * e * e;
        },
        Out: function(e) {
            return --e * e * e + 1;
        },
        InOut: function(e) {
            if ((e *= 2) < 1) return 0.5 * e * e * e;
            return 0.5 * ((e -= 2) * e * e + 2);
        }
    },
    Quart: {
        In: function(e) {
            return e * e * e * e;
        },
        Out: function(e) {
            return 1 - --e * e * e * e;
        },
        InOut: function(e) {
            if ((e *= 2) < 1) return 0.5 * e * e * e * e;
            return - 0.5 * ((e -= 2) * e * e * e - 2);
        }
    },
    Quint: {
        In: function(e) {
            return e * e * e * e * e;
        },
        Out: function(e) {
            return --e * e * e * e * e + 1;
        },
        InOut: function(e) {
            if ((e *= 2) < 1) return 0.5 * e * e * e * e * e;
            return 0.5 * ((e -= 2) * e * e * e * e + 2);
        }
    },
    Sine: {
        In: function(e) {
            return 1 - Math.cos(e * Math.PI / 2);
        },
        Out: function(e) {
            return Math.sin(e * Math.PI / 2);
        },
        InOut: function(e) {
            return 0.5 * (1 - Math.cos(Math.PI * e));
        }
    },
    Expo: {
        In: function(e) {
            return e === 0 ? 0 : Math.pow(1024, e - 1);
        },
        Out: function(e) {
            return e === 1 ? 1 : 1 - Math.pow(2, -10 * e);
        },
        InOut: function(e) {
            if (e === 0) return 0;
            if (e === 1) return 1;
            if ((e *= 2) < 1) return 0.5 * Math.pow(1024, e - 1);
            return 0.5 * (-Math.pow(2, -10 * (e - 1)) + 2);
        }
    },
    Circ: {
        In: function(e) {
            return 1 - Math.sqrt(1 - e * e);
        },
        Out: function(e) {
            return Math.sqrt(1 - --e * e);
        },
        InOut: function(e) {
            if ((e *= 2) < 1) return - 0.5 * (Math.sqrt(1 - e * e) - 1);
            return 0.5 * (Math.sqrt(1 - (e -= 2) * e) + 1);
        }
    },
    Elastic: {
        In: function(e) {
            var t, n =0.1,
                r =0.4;
            if (e === 0) return 0;
            if (e === 1) return 1;
            if (!n || n < 1) {
                n = 1;
                t = r / 4;
            } else t = r * Math.asin(1 / n) / (2 * Math.PI);
            return -(n * Math.pow(2, 10 * (e -= 1)) * Math.sin((e - t) * 2 * Math.PI / r));
        },
        Out: function(e) {
            var t, n =0.1,
                r =0.4;
            if (e === 0) return 0;
            if (e === 1) return 1;
            if (!n || n < 1) {
                n = 1;
                t = r / 4;
            } else t = r * Math.asin(1 / n) / (2 * Math.PI);
            return n * Math.pow(2, -10 * e) * Math.sin((e - t) * 2 * Math.PI / r) + 1;
        },
        InOut: function(e) {
            var t, n =0.1,
                r =0.4;
            if (e === 0) return 0;
            if (e === 1) return 1;
            if (!n || n < 1) {
                n = 1;
                t = r / 4;
            } else {
                t = r * Math.asin(1 / n) / (2 * Math.PI);
            }
            if ((e *= 2) < 1) return - 0.5 * n * Math.pow(2, 10 * (e -= 1)) * Math.sin((e - t) * 2 * Math.PI / r);
            return n * Math.pow(2, -10 * (e -= 1)) * Math.sin((e - t) * 2 * Math.PI / r) *0.5 + 1;
        }
    },
    Back: {
        In: function(e) {
            var t = 1.70158;
            return e * e * ((t + 1) * e - t);
        },
        Out: function(e) {
            var t = 1.70158;
            return --e * e * ((t + 1) * e + t) + 1;
        },
        InOut: function(e) {
            var t = 1.70158 * 1.525;
            if ((e *= 2) < 1) return 0.5 * e * e * ((t + 1) * e - t);
            return 0.5 * ((e -= 2) * e * ((t + 1) * e + t) + 2);
        }
    },
    Bounce: {
        In: function(e) {
            return 1 - basic.Bounce.Out(1 - e);
        },
        Out: function(e) {
            if (e < 1 / 2.75) {
                return 7.5625 * e * e;
            } else if (e < 2 / 2.75) {
                return 7.5625 * (e -= 1.5 / 2.75) * e +0.75;
            } else if (e < 2.5 / 2.75) {
                return 7.5625 * (e -= 2.25 / 2.75) * e +0.9375;
            } else {
                return 7.5625 * (e -= 2.625 / 2.75) * e +0.984375;
            }
        },
        InOut: function(e) {
            if (e <0.5) return basic.Bounce.In(e * 2) *0.5;
            return basic.Bounce.Out(e * 2 - 1) *0.5 +0.5;
        }
    }
};

exports.basic = basic;
exports.linear = basic.Linear;

var id, list;
for(id in basic) {
    if(id !== 'Linear') {
        list = basic[id];
        exports['easeIn' + id] = list.In;
        exports['easeOut' + id] = list.Out;
        exports['easeInOut' + id] = list.InOut;
    }
}

},{}],42:[function(require,module,exports){
for(var id in Math) {
    exports[id] = Math[id];
}

exports.step = step;
exports.smoothstep = smoothstep;
exports.clamp = clamp;
exports.mix = exports.lerp = mix;
exports.unMix = exports.unLerp = unMix;
exports.unClampedMix = exports.unClampedLerp = unClampedMix;
exports.upClampedUnMix = exports.unClampedUnLerp = upClampedUnMix;
exports.fract = fract;
exports.hash = hash;
exports.hash2 = hash2;
exports.sign = sign;

var PI = Math.PI;
var TAU = exports.TAU = PI * 2;

function step ( edge, val ) {
    return val < edge ? 0 : 1;
}

function smoothstep ( edge0, edge1, val ) {
    val = unMix( edge0, edge1, val );
    return val * val ( 3 - val * 2 );
}

function clamp ( val, min, max ) {
    return val < min ? min : val > max ? max : val;
}

function mix ( min, max, val ) {
    return val <= 0 ? min : val >= 1 ? max : min + ( max - min ) * val;
}

function unMix ( min, max, val ) {
    return val <= min ? 0 : val >= max ? 1 : ( val - min ) / ( max - min );
}

function unClampedMix ( min, max, val ) {
    return min + ( max - min ) * val;
}

function upClampedUnMix ( min, max, val ) {
    return ( val - min ) / ( max - min );
}

function fract ( val ) {
    return val - Math.floor( val );
}

function hash (val) {
    return fract( Math.sin( val ) * 43758.5453123 );
}

function hash2 (val1, val2) {
    return fract( Math.sin( val1 * 12.9898 + val2 * 4.1414 ) * 43758.5453 );
}

function sign (val) {
    return val ? val < 0 ? - 1 : 1 : 0;
}

},{}]},{},[39]);
