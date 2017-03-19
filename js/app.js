(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var apollo     = require('apollo'),
    async      = require('async'),
    california = require('california'),
    functions  = require('california-functions');

var forEach = require('async-foreach').forEach;

var FALLBACK_NAMES = [ 'Academy Engraved LET', 'Al Nile', 'American Typewriter',
  'Apple Color Emoji', 'Apple SD Gothic Neo', 'Arial',
  'Arial Rounded MT Bold', 'Avenir', 'Avenir Next', 'Avenir Next Condensed',
  'Baskerville', 'Bodoni 72', 'Bodoni 72 Oldstyle', 'Bodoni Ornaments',
  'Bradley Hand', 'Chalkboard SE', 'Chalkduster', 'Cochin', 'Copperplate',
  'Courier', 'Courier New', 'DIN Alternate', 'DIN Condensed',
  'Damascus', 'Didot', 'Futura', 'Geeza Pro', 'Georgia', 'Gill Sans',
  'Helvetica', 'Helvetica Neue', 'Hoefler Text', 'Iowan Old Style',
  'Marion', 'Marker Felt', 'Menlo', 'Noteworthy', 'Optima', 'Palatino',
  'Papyrus', 'Party LET', 'Snell Roundhand', 'Superclarendon', 'Symbol',
  'Times New Roman', 'Trebuchet MS', 'Verdana', 'Zapf Dingbats', 'Zapfino' ];

(function() {
  'use strict';

  // Polyfill the console.
  window.console = window.console || { log: function () {} };

  // Detect the environment.
  apollo.removeClass(document.documentElement, 'no-js');
  apollo.addClass(document.documentElement, 'js');

  var isModern = ('querySelector' in document && 'addEventListener' in window && Array.prototype.forEach);
  apollo.addClass(document.documentElement, isModern ? 'mustard' : 'no-mustard');

  var readyStates = [ 'complete', 'loaded', 'interactive' ];

  // Create an asynchronous task to wait for the DOM.
  var readyTask = function(next) {
    if (readyStates.indexOf(document.readyState) >= 0) {
      next();
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        next();
      });
    }
  };

  // Create an asynchronous task to wait for the fonts.
  var flashFontsTask = function(next) {

    // This window-global is a callback for the Dugonjić-Rantakari font
    // enumeration technique (i.e., using Macromedia Flash/Adobe Flex).
    window.populateFontList = function(array) {
      var names = [];
      for (var key in array) {
        names.push(array[key].replace(/^\s+|\s+$/g, ''));
      }
      next(null, names);
    };

    // TODO: Detect support and ignore this DOM creation.
    document.body.appendChild(functions.element('object', {
      'id'    : 'ampersand-flash-helper',
      'class' : 'ampersand-ui',
      'type'  : 'application/x-shockwave-flash',
      'data'  : 'assets/fonts.swf',
      'width' : 1,
      'height': 1
     }));

    // A content-loaded listener to pick up the font listing
    // using the Windows-provided dialog helper control.
    var resolveWithDialogHelper = function() {

      var helper = document.getElementById('ampersand-dialog-helper');
      if (!helper || !helper.fonts || !helper.fonts.count) {
        return;
      }
      // The 'fonts' property is one-indexed.
      var names = [];
      for(var i = 1; i <= helper.fonts.count; i++) {
        names.push(helper.fonts(i));
      }
      next(null, names);
    };

    if (readyStates.indexOf(document.readyState) >= 0) {
      resolveWithDialogHelper();
    } else {
      document.addEventListener('DOMContentLoaded', resolveWithDialogHelper);
    }

    var isControlUnavailable = (!window.ActiveXObject ||
      (new window.ActiveXObject('ShockwaveFlash.ShockwaveFlash')) === false);
    var isPluginUnavailable = (typeof navigator.plugins === 'undefined' ||
      typeof navigator.plugins['Shockwave Flash'] !== 'object');

    // Assume that Flash is unavailable if there's no way to play it. (This
    // does not check for Flash blocking tools, but many of those allow
    // small or invisible Flash scripts. If unavailable, pick a list of
    // common fonts, which will be checked individually.
    if(isPluginUnavailable && isControlUnavailable) {
      next(null, FALLBACK_NAMES);
    }
  };

  var fallbackFontsTask = function(next) {
    setTimeout(function() {
      next(null, FALLBACK_NAMES);
    }, 1000);
  };

  var fontsTask = function(next) {
      async.race([ flashFontsTask, fallbackFontsTask ], next);
  };

  // Run the tasks in parallel and handle the results coming back.
  async.parallel([ readyTask, fontsTask ], function(err, results) {
    if (err) {
      apollo.addClass(document.documentElement, 'error-no-fonts-loaded');
      console.log('There was a problem while expecting the page load with a list of system fonts.', results);
      return;
    }

    var glyph = '&',
    fontsWithGlyph = results[1].map(function(name) {
      return california.fontWithName(name);
    }).filter(function(font) {
      return font.containsGlyph(glyph);
    });

    console.log('Showing ' + fontsWithGlyph.length + ' fonts.');

    var widthInPixels = 16;
    var canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.width = canvas.height = widthInPixels;

    canvas.getContext = canvas.getContext || function() { return {}; };
    var context = canvas.getContext('2d');
    context.textBaseline = 'top';
    context.fillStyle = context.strokeStyle = 'black';

    var dictionary = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var divs = [];

    forEach(fontsWithGlyph, function(font) {
      var done = this.async();

      var hash = [],
          weight = 0;

      // Use the canvas to create a hash for this glyph.
      context.font = widthInPixels + 'px \'' + font.name + '\'';
      context.fillText(glyph, 0, 0);

      var data = context.getImageData(0, 0, widthInPixels, widthInPixels).data;

      // Collect alpha data in six-bit chunks to get ranges from 0 to 63.
      // The image data is RGBARGBARGBA, so pre-set the alpha positions
      // for each step in the loop for cleaner formatting.
      var positions = [ 3, 7, 11, 15, 19, 23 ];
      for (var i = 0; i < data.length; i += 24) {
        // We want to know only when the alpha for
        // the current pixel is fully opaque.
        var bits = positions.map(function(position) {
          return (data[i + position] === 255);
        });

        // Add the number of opaque pixels.
        weight += bits.filter(function(bit) {
          return bit === true;
        }).length;

        var number = 0;
        number |= (bits[0] ? 1 : 0) << 5;
        number |= (bits[1] ? 1 : 0) << 4;
        number |= (bits[2] ? 1 : 0) << 3;
        number |= (bits[3] ? 1 : 0) << 2;
        number |= (bits[4] ? 1 : 0) << 1;
        number |= (bits[5] ? 1 : 0);

        // Add a alphanumeric character from our 64-character
        // dictionary to represent our 0-63 number.
        hash.push(dictionary[number]);
      }

      // Create the HTML markup from the font and glyph information.
      var dt = document.createElement('dt');
      dt.setAttribute('style', 'font-family: \'' + font.name + '\', AdobeBlank');
      dt.textContent = glyph;

      var dd = document.createElement('dd');
      dd.textContent = font.name;

      var div = document.createElement('div');
      div.setAttribute('title', font.name);
      div.appendChild(dt);
      div.appendChild(dd);

      var elements = [
        ('000' + weight).slice(-3),
        (font.containsGlyph('A') ? 1 : 0),
        hash.join('')
      ];
      div.setAttribute('data-image-hash', elements.join('-'));

      // Add a CSS class to identify wider-than-normal glyphs.
      var metrics = font.measureText(glyph);
      if (metrics.width > 42) {
        apollo.addClass(div, 'wide');
      }
      apollo.addClass(div, font.name.replace(/\s+/g, '-').toLowerCase());

      divs.push(div);

      // Clear the drawing context for the next iteration.
      context.clearRect(0, 0, widthInPixels, widthInPixels);
      done();
    });

    // Sort the DIVs by the computed sort
    // string and append to the fragment.
    divs.sort(function(a, b) {
      return b.getAttribute('data-image-hash').localeCompare(a.getAttribute('data-image-hash'));
    });

    var fragment = document.createDocumentFragment();
    divs.forEach(function(div) {
      fragment.appendChild(div);
    });

    apollo.removeClass(document.documentElement, 'no-ampersands');
    var container = document.getElementById('main');
    container.appendChild(fragment);

    // Use CommonsJS-averse Masonry to manage the item layout, which should be
    // available when this fires (we depend on the DOMContentLoaded event).
    new window.Masonry(container, {
      columnWidth: 100,
      itemSelector: 'div',
      isFitWidth: true
    });
  });
}());

},{"apollo":5,"async":3,"async-foreach":2,"california":7,"california-functions":6}],2:[function(require,module,exports){
/*!
 * Sync/Async forEach
 * https://github.com/cowboy/javascript-sync-async-foreach
 *
 * Copyright (c) 2012 "Cowboy" Ben Alman
 * Licensed under the MIT license.
 * http://benalman.com/about/license/
 */

(function(exports) {

  // Iterate synchronously or asynchronously.
  exports.forEach = function(arr, eachFn, doneFn) {
    var i = -1;
    // Resolve array length to a valid (ToUint32) number.
    var len = arr.length >>> 0;

    // This IIFE is called once now, and then again, by name, for each loop
    // iteration.
    (function next(result) {
      // This flag will be set to true if `this.async` is called inside the
      // eachFn` callback.
      var async;
      // Was false returned from the `eachFn` callback or passed to the
      // `this.async` done function?
      var abort = result === false;

      // Increment counter variable and skip any indices that don't exist. This
      // allows sparse arrays to be iterated.
      do { ++i; } while (!(i in arr) && i !== len);

      // Exit if result passed to `this.async` done function or returned from
      // the `eachFn` callback was false, or when done iterating.
      if (abort || i === len) {
        // If a `doneFn` callback was specified, invoke that now. Pass in a
        // boolean value representing "not aborted" state along with the array.
        if (doneFn) {
          doneFn(!abort, arr);
        }
        return;
      }

      // Invoke the `eachFn` callback, setting `this` inside the callback to a
      // custom object that contains one method, and passing in the array item,
      // index, and the array.
      result = eachFn.call({
        // If `this.async` is called inside the `eachFn` callback, set the async
        // flag and return a function that can be used to continue iterating.
        async: function() {
          async = true;
          return next;
        }
      }, arr[i], i, arr);

      // If the async flag wasn't set, continue by calling `next` synchronously,
      // passing in the result of the `eachFn` callback.
      if (!async) {
        next(result);
      }
    }());
  };

}(typeof exports === "object" && exports || this));
},{}],3:[function(require,module,exports){
(function (process,global){
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.async = global.async || {})));
}(this, (function (exports) { 'use strict';

/**
 * A faster alternative to `Function#apply`, this function invokes `func`
 * with the `this` binding of `thisArg` and the arguments of `args`.
 *
 * @private
 * @param {Function} func The function to invoke.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {Array} args The arguments to invoke `func` with.
 * @returns {*} Returns the result of `func`.
 */
function apply(func, thisArg, args) {
  switch (args.length) {
    case 0: return func.call(thisArg);
    case 1: return func.call(thisArg, args[0]);
    case 2: return func.call(thisArg, args[0], args[1]);
    case 3: return func.call(thisArg, args[0], args[1], args[2]);
  }
  return func.apply(thisArg, args);
}

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * A specialized version of `baseRest` which transforms the rest array.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @param {Function} transform The rest array transform.
 * @returns {Function} Returns the new function.
 */
function overRest$1(func, start, transform) {
  start = nativeMax(start === undefined ? (func.length - 1) : start, 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        array = Array(length);

    while (++index < length) {
      array[index] = args[start + index];
    }
    index = -1;
    var otherArgs = Array(start + 1);
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = transform(array);
    return apply(func, this, otherArgs);
  };
}

/**
 * This method returns the first argument it receives.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Util
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'a': 1 };
 *
 * console.log(_.identity(object) === object);
 * // => true
 */
function identity(value) {
  return value;
}

// Lodash rest function without function.toString()
// remappings
function rest(func, start) {
    return overRest$1(func, start, identity);
}

var initialParams = function (fn) {
    return rest(function (args /*..., callback*/) {
        var callback = args.pop();
        fn.call(this, args, callback);
    });
};

function applyEach$1(eachfn) {
    return rest(function (fns, args) {
        var go = initialParams(function (args, callback) {
            var that = this;
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat(cb));
            }, callback);
        });
        if (args.length) {
            return go.apply(this, args);
        } else {
            return go;
        }
    });
}

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Built-in value references. */
var Symbol$1 = root.Symbol;

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/** Built-in value references. */
var symToStringTag$1 = Symbol$1 ? Symbol$1.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag$1),
      tag = value[symToStringTag$1];

  try {
    value[symToStringTag$1] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag$1] = tag;
    } else {
      delete value[symToStringTag$1];
    }
  }
  return result;
}

/** Used for built-in method references. */
var objectProto$1 = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString$1 = objectProto$1.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString$1.call(value);
}

/** `Object#toString` result references. */
var nullTag = '[object Null]';
var undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = Symbol$1 ? Symbol$1.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

/** `Object#toString` result references. */
var asyncTag = '[object AsyncFunction]';
var funcTag = '[object Function]';
var genTag = '[object GeneratorFunction]';
var proxyTag = '[object Proxy]';

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  if (!isObject(value)) {
    return false;
  }
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 9 which returns 'object' for typed arrays and other constructors.
  var tag = baseGetTag(value);
  return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
}

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

// A temporary value used to identify if the loop should be broken.
// See #1064, #1293
var breakLoop = {};

/**
 * This method returns `undefined`.
 *
 * @static
 * @memberOf _
 * @since 2.3.0
 * @category Util
 * @example
 *
 * _.times(2, _.noop);
 * // => [undefined, undefined]
 */
function noop() {
  // No operation performed.
}

function once(fn) {
    return function () {
        if (fn === null) return;
        var callFn = fn;
        fn = null;
        callFn.apply(this, arguments);
    };
}

var iteratorSymbol = typeof Symbol === 'function' && Symbol.iterator;

var getIterator = function (coll) {
    return iteratorSymbol && coll[iteratorSymbol] && coll[iteratorSymbol]();
};

/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

/** `Object#toString` result references. */
var argsTag = '[object Arguments]';

/**
 * The base implementation of `_.isArguments`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 */
function baseIsArguments(value) {
  return isObjectLike(value) && baseGetTag(value) == argsTag;
}

/** Used for built-in method references. */
var objectProto$3 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$2 = objectProto$3.hasOwnProperty;

/** Built-in value references. */
var propertyIsEnumerable = objectProto$3.propertyIsEnumerable;

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
var isArguments = baseIsArguments(function() { return arguments; }()) ? baseIsArguments : function(value) {
  return isObjectLike(value) && hasOwnProperty$2.call(value, 'callee') &&
    !propertyIsEnumerable.call(value, 'callee');
};

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

/**
 * This method returns `false`.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {boolean} Returns `false`.
 * @example
 *
 * _.times(2, _.stubFalse);
 * // => [false, false]
 */
function stubFalse() {
  return false;
}

/** Detect free variable `exports`. */
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Built-in value references. */
var Buffer = moduleExports ? root.Buffer : undefined;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

/**
 * Checks if `value` is a buffer.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
 * @example
 *
 * _.isBuffer(new Buffer(2));
 * // => true
 *
 * _.isBuffer(new Uint8Array(2));
 * // => false
 */
var isBuffer = nativeIsBuffer || stubFalse;

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER$1 = 9007199254740991;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  length = length == null ? MAX_SAFE_INTEGER$1 : length;
  return !!length &&
    (typeof value == 'number' || reIsUint.test(value)) &&
    (value > -1 && value % 1 == 0 && value < length);
}

/** `Object#toString` result references. */
var argsTag$1 = '[object Arguments]';
var arrayTag = '[object Array]';
var boolTag = '[object Boolean]';
var dateTag = '[object Date]';
var errorTag = '[object Error]';
var funcTag$1 = '[object Function]';
var mapTag = '[object Map]';
var numberTag = '[object Number]';
var objectTag = '[object Object]';
var regexpTag = '[object RegExp]';
var setTag = '[object Set]';
var stringTag = '[object String]';
var weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]';
var dataViewTag = '[object DataView]';
var float32Tag = '[object Float32Array]';
var float64Tag = '[object Float64Array]';
var int8Tag = '[object Int8Array]';
var int16Tag = '[object Int16Array]';
var int32Tag = '[object Int32Array]';
var uint8Tag = '[object Uint8Array]';
var uint8ClampedTag = '[object Uint8ClampedArray]';
var uint16Tag = '[object Uint16Array]';
var uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag$1] = typedArrayTags[arrayTag] =
typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
typedArrayTags[dataViewTag] = typedArrayTags[dateTag] =
typedArrayTags[errorTag] = typedArrayTags[funcTag$1] =
typedArrayTags[mapTag] = typedArrayTags[numberTag] =
typedArrayTags[objectTag] = typedArrayTags[regexpTag] =
typedArrayTags[setTag] = typedArrayTags[stringTag] =
typedArrayTags[weakMapTag] = false;

/**
 * The base implementation of `_.isTypedArray` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 */
function baseIsTypedArray(value) {
  return isObjectLike(value) &&
    isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
}

/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

/** Detect free variable `exports`. */
var freeExports$1 = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule$1 = freeExports$1 && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports$1 = freeModule$1 && freeModule$1.exports === freeExports$1;

/** Detect free variable `process` from Node.js. */
var freeProcess = moduleExports$1 && freeGlobal.process;

/** Used to access faster Node.js helpers. */
var nodeUtil = (function() {
  try {
    return freeProcess && freeProcess.binding && freeProcess.binding('util');
  } catch (e) {}
}());

/* Node.js helper references. */
var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;

/** Used for built-in method references. */
var objectProto$2 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$1 = objectProto$2.hasOwnProperty;

/**
 * Creates an array of the enumerable property names of the array-like `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @param {boolean} inherited Specify returning inherited property names.
 * @returns {Array} Returns the array of property names.
 */
function arrayLikeKeys(value, inherited) {
  var isArr = isArray(value),
      isArg = !isArr && isArguments(value),
      isBuff = !isArr && !isArg && isBuffer(value),
      isType = !isArr && !isArg && !isBuff && isTypedArray(value),
      skipIndexes = isArr || isArg || isBuff || isType,
      result = skipIndexes ? baseTimes(value.length, String) : [],
      length = result.length;

  for (var key in value) {
    if ((inherited || hasOwnProperty$1.call(value, key)) &&
        !(skipIndexes && (
           // Safari 9 has enumerable `arguments.length` in strict mode.
           key == 'length' ||
           // Node.js 0.10 has enumerable non-index properties on buffers.
           (isBuff && (key == 'offset' || key == 'parent')) ||
           // PhantomJS 2 has enumerable non-index properties on typed arrays.
           (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
           // Skip index properties.
           isIndex(key, length)
        ))) {
      result.push(key);
    }
  }
  return result;
}

/** Used for built-in method references. */
var objectProto$5 = Object.prototype;

/**
 * Checks if `value` is likely a prototype object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
 */
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto$5;

  return value === proto;
}

/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeKeys = overArg(Object.keys, Object);

/** Used for built-in method references. */
var objectProto$4 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$3 = objectProto$4.hasOwnProperty;

/**
 * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeys(object) {
  if (!isPrototype(object)) {
    return nativeKeys(object);
  }
  var result = [];
  for (var key in Object(object)) {
    if (hasOwnProperty$3.call(object, key) && key != 'constructor') {
      result.push(key);
    }
  }
  return result;
}

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
function keys(object) {
  return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
}

function createArrayIterator(coll) {
    var i = -1;
    var len = coll.length;
    return function next() {
        return ++i < len ? { value: coll[i], key: i } : null;
    };
}

function createES2015Iterator(iterator) {
    var i = -1;
    return function next() {
        var item = iterator.next();
        if (item.done) return null;
        i++;
        return { value: item.value, key: i };
    };
}

function createObjectIterator(obj) {
    var okeys = keys(obj);
    var i = -1;
    var len = okeys.length;
    return function next() {
        var key = okeys[++i];
        return i < len ? { value: obj[key], key: key } : null;
    };
}

function iterator(coll) {
    if (isArrayLike(coll)) {
        return createArrayIterator(coll);
    }

    var iterator = getIterator(coll);
    return iterator ? createES2015Iterator(iterator) : createObjectIterator(coll);
}

function onlyOnce(fn) {
    return function () {
        if (fn === null) throw new Error("Callback was already called.");
        var callFn = fn;
        fn = null;
        callFn.apply(this, arguments);
    };
}

function _eachOfLimit(limit) {
    return function (obj, iteratee, callback) {
        callback = once(callback || noop);
        if (limit <= 0 || !obj) {
            return callback(null);
        }
        var nextElem = iterator(obj);
        var done = false;
        var running = 0;

        function iterateeCallback(err, value) {
            running -= 1;
            if (err) {
                done = true;
                callback(err);
            } else if (value === breakLoop || done && running <= 0) {
                done = true;
                return callback(null);
            } else {
                replenish();
            }
        }

        function replenish() {
            while (running < limit && !done) {
                var elem = nextElem();
                if (elem === null) {
                    done = true;
                    if (running <= 0) {
                        callback(null);
                    }
                    return;
                }
                running += 1;
                iteratee(elem.value, elem.key, onlyOnce(iterateeCallback));
            }
        }

        replenish();
    };
}

/**
 * The same as [`eachOf`]{@link module:Collections.eachOf} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name eachOfLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.eachOf]{@link module:Collections.eachOf}
 * @alias forEachOfLimit
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A function to apply to each
 * item in `coll`. The `key` is the item's key, or index in the case of an
 * array. The iteratee is passed a `callback(err)` which must be called once it
 * has completed. If no error has occurred, the callback should be run without
 * arguments or with an explicit `null` argument. Invoked with
 * (item, key, callback).
 * @param {Function} [callback] - A callback which is called when all
 * `iteratee` functions have finished, or an error occurs. Invoked with (err).
 */
function eachOfLimit(coll, limit, iteratee, callback) {
  _eachOfLimit(limit)(coll, iteratee, callback);
}

function doLimit(fn, limit) {
    return function (iterable, iteratee, callback) {
        return fn(iterable, limit, iteratee, callback);
    };
}

// eachOf implementation optimized for array-likes
function eachOfArrayLike(coll, iteratee, callback) {
    callback = once(callback || noop);
    var index = 0,
        completed = 0,
        length = coll.length;
    if (length === 0) {
        callback(null);
    }

    function iteratorCallback(err, value) {
        if (err) {
            callback(err);
        } else if (++completed === length || value === breakLoop) {
            callback(null);
        }
    }

    for (; index < length; index++) {
        iteratee(coll[index], index, onlyOnce(iteratorCallback));
    }
}

// a generic version of eachOf which can handle array, object, and iterator cases.
var eachOfGeneric = doLimit(eachOfLimit, Infinity);

/**
 * Like [`each`]{@link module:Collections.each}, except that it passes the key (or index) as the second argument
 * to the iteratee.
 *
 * @name eachOf
 * @static
 * @memberOf module:Collections
 * @method
 * @alias forEachOf
 * @category Collection
 * @see [async.each]{@link module:Collections.each}
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each
 * item in `coll`. The `key` is the item's key, or index in the case of an
 * array. The iteratee is passed a `callback(err)` which must be called once it
 * has completed. If no error has occurred, the callback should be run without
 * arguments or with an explicit `null` argument. Invoked with
 * (item, key, callback).
 * @param {Function} [callback] - A callback which is called when all
 * `iteratee` functions have finished, or an error occurs. Invoked with (err).
 * @example
 *
 * var obj = {dev: "/dev.json", test: "/test.json", prod: "/prod.json"};
 * var configs = {};
 *
 * async.forEachOf(obj, function (value, key, callback) {
 *     fs.readFile(__dirname + value, "utf8", function (err, data) {
 *         if (err) return callback(err);
 *         try {
 *             configs[key] = JSON.parse(data);
 *         } catch (e) {
 *             return callback(e);
 *         }
 *         callback();
 *     });
 * }, function (err) {
 *     if (err) console.error(err.message);
 *     // configs is now a map of JSON data
 *     doSomethingWith(configs);
 * });
 */
var eachOf = function (coll, iteratee, callback) {
    var eachOfImplementation = isArrayLike(coll) ? eachOfArrayLike : eachOfGeneric;
    eachOfImplementation(coll, iteratee, callback);
};

function doParallel(fn) {
    return function (obj, iteratee, callback) {
        return fn(eachOf, obj, iteratee, callback);
    };
}

function _asyncMap(eachfn, arr, iteratee, callback) {
    callback = callback || noop;
    arr = arr || [];
    var results = [];
    var counter = 0;

    eachfn(arr, function (value, _, callback) {
        var index = counter++;
        iteratee(value, function (err, v) {
            results[index] = v;
            callback(err);
        });
    }, function (err) {
        callback(err, results);
    });
}

/**
 * Produces a new collection of values by mapping each value in `coll` through
 * the `iteratee` function. The `iteratee` is called with an item from `coll`
 * and a callback for when it has finished processing. Each of these callback
 * takes 2 arguments: an `error`, and the transformed item from `coll`. If
 * `iteratee` passes an error to its callback, the main `callback` (for the
 * `map` function) is immediately called with the error.
 *
 * Note, that since this function applies the `iteratee` to each item in
 * parallel, there is no guarantee that the `iteratee` functions will complete
 * in order. However, the results array will be in the same order as the
 * original `coll`.
 *
 * If `map` is passed an Object, the results will be an Array.  The results
 * will roughly be in the order of the original Objects' keys (but this can
 * vary across JavaScript engines)
 *
 * @name map
 * @static
 * @memberOf module:Collections
 * @method
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each item in `coll`.
 * The iteratee is passed a `callback(err, transformed)` which must be called
 * once it has completed with an error (which can be `null`) and a
 * transformed item. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. Results is an Array of the
 * transformed items from the `coll`. Invoked with (err, results).
 * @example
 *
 * async.map(['file1','file2','file3'], fs.stat, function(err, results) {
 *     // results is now an array of stats for each file
 * });
 */
var map = doParallel(_asyncMap);

/**
 * Applies the provided arguments to each function in the array, calling
 * `callback` after all functions have completed. If you only provide the first
 * argument, `fns`, then it will return a function which lets you pass in the
 * arguments as if it were a single function call. If more arguments are
 * provided, `callback` is required while `args` is still optional.
 *
 * @name applyEach
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Array|Iterable|Object} fns - A collection of asynchronous functions
 * to all call with the same arguments
 * @param {...*} [args] - any number of separate arguments to pass to the
 * function.
 * @param {Function} [callback] - the final argument should be the callback,
 * called when all functions have completed processing.
 * @returns {Function} - If only the first argument, `fns`, is provided, it will
 * return a function which lets you pass in the arguments as if it were a single
 * function call. The signature is `(..args, callback)`. If invoked with any
 * arguments, `callback` is required.
 * @example
 *
 * async.applyEach([enableSearch, updateSchema], 'bucket', callback);
 *
 * // partial application example:
 * async.each(
 *     buckets,
 *     async.applyEach([enableSearch, updateSchema]),
 *     callback
 * );
 */
var applyEach = applyEach$1(map);

function doParallelLimit(fn) {
    return function (obj, limit, iteratee, callback) {
        return fn(_eachOfLimit(limit), obj, iteratee, callback);
    };
}

/**
 * The same as [`map`]{@link module:Collections.map} but runs a maximum of `limit` async operations at a time.
 *
 * @name mapLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.map]{@link module:Collections.map}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A function to apply to each item in `coll`.
 * The iteratee is passed a `callback(err, transformed)` which must be called
 * once it has completed with an error (which can be `null`) and a transformed
 * item. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. Results is an array of the
 * transformed items from the `coll`. Invoked with (err, results).
 */
var mapLimit = doParallelLimit(_asyncMap);

/**
 * The same as [`map`]{@link module:Collections.map} but runs only a single async operation at a time.
 *
 * @name mapSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.map]{@link module:Collections.map}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each item in `coll`.
 * The iteratee is passed a `callback(err, transformed)` which must be called
 * once it has completed with an error (which can be `null`) and a
 * transformed item. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. Results is an array of the
 * transformed items from the `coll`. Invoked with (err, results).
 */
var mapSeries = doLimit(mapLimit, 1);

/**
 * The same as [`applyEach`]{@link module:ControlFlow.applyEach} but runs only a single async operation at a time.
 *
 * @name applyEachSeries
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.applyEach]{@link module:ControlFlow.applyEach}
 * @category Control Flow
 * @param {Array|Iterable|Object} fns - A collection of asynchronous functions to all
 * call with the same arguments
 * @param {...*} [args] - any number of separate arguments to pass to the
 * function.
 * @param {Function} [callback] - the final argument should be the callback,
 * called when all functions have completed processing.
 * @returns {Function} - If only the first argument is provided, it will return
 * a function which lets you pass in the arguments as if it were a single
 * function call.
 */
var applyEachSeries = applyEach$1(mapSeries);

/**
 * Creates a continuation function with some arguments already applied.
 *
 * Useful as a shorthand when combined with other control flow functions. Any
 * arguments passed to the returned function are added to the arguments
 * originally passed to apply.
 *
 * @name apply
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {Function} function - The function you want to eventually apply all
 * arguments to. Invokes with (arguments...).
 * @param {...*} arguments... - Any number of arguments to automatically apply
 * when the continuation is called.
 * @example
 *
 * // using apply
 * async.parallel([
 *     async.apply(fs.writeFile, 'testfile1', 'test1'),
 *     async.apply(fs.writeFile, 'testfile2', 'test2')
 * ]);
 *
 *
 * // the same process without using apply
 * async.parallel([
 *     function(callback) {
 *         fs.writeFile('testfile1', 'test1', callback);
 *     },
 *     function(callback) {
 *         fs.writeFile('testfile2', 'test2', callback);
 *     }
 * ]);
 *
 * // It's possible to pass any number of additional arguments when calling the
 * // continuation:
 *
 * node> var fn = async.apply(sys.puts, 'one');
 * node> fn('two', 'three');
 * one
 * two
 * three
 */
var apply$2 = rest(function (fn, args) {
    return rest(function (callArgs) {
        return fn.apply(null, args.concat(callArgs));
    });
});

/**
 * Take a sync function and make it async, passing its return value to a
 * callback. This is useful for plugging sync functions into a waterfall,
 * series, or other async functions. Any arguments passed to the generated
 * function will be passed to the wrapped function (except for the final
 * callback argument). Errors thrown will be passed to the callback.
 *
 * If the function passed to `asyncify` returns a Promise, that promises's
 * resolved/rejected state will be used to call the callback, rather than simply
 * the synchronous return value.
 *
 * This also means you can asyncify ES2016 `async` functions.
 *
 * @name asyncify
 * @static
 * @memberOf module:Utils
 * @method
 * @alias wrapSync
 * @category Util
 * @param {Function} func - The synchronous function to convert to an
 * asynchronous function.
 * @returns {Function} An asynchronous wrapper of the `func`. To be invoked with
 * (callback).
 * @example
 *
 * // passing a regular synchronous function
 * async.waterfall([
 *     async.apply(fs.readFile, filename, "utf8"),
 *     async.asyncify(JSON.parse),
 *     function (data, next) {
 *         // data is the result of parsing the text.
 *         // If there was a parsing error, it would have been caught.
 *     }
 * ], callback);
 *
 * // passing a function returning a promise
 * async.waterfall([
 *     async.apply(fs.readFile, filename, "utf8"),
 *     async.asyncify(function (contents) {
 *         return db.model.create(contents);
 *     }),
 *     function (model, next) {
 *         // `model` is the instantiated model object.
 *         // If there was an error, this function would be skipped.
 *     }
 * ], callback);
 *
 * // es6 example
 * var q = async.queue(async.asyncify(async function(file) {
 *     var intermediateStep = await processFile(file);
 *     return await somePromise(intermediateStep)
 * }));
 *
 * q.push(files);
 */
function asyncify(func) {
    return initialParams(function (args, callback) {
        var result;
        try {
            result = func.apply(this, args);
        } catch (e) {
            return callback(e);
        }
        // if result is Promise object
        if (isObject(result) && typeof result.then === 'function') {
            result.then(function (value) {
                callback(null, value);
            }, function (err) {
                callback(err.message ? err : new Error(err));
            });
        } else {
            callback(null, result);
        }
    });
}

/**
 * A specialized version of `_.forEach` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns `array`.
 */
function arrayEach(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (iteratee(array[index], index, array) === false) {
      break;
    }
  }
  return array;
}

/**
 * Creates a base function for methods like `_.forIn` and `_.forOwn`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var index = -1,
        iterable = Object(object),
        props = keysFunc(object),
        length = props.length;

    while (length--) {
      var key = props[fromRight ? length : ++index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

/**
 * The base implementation of `baseForOwn` which iterates over `object`
 * properties returned by `keysFunc` and invokes `iteratee` for each property.
 * Iteratee functions may exit iteration early by explicitly returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

/**
 * The base implementation of `_.forOwn` without support for iteratee shorthands.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForOwn(object, iteratee) {
  return object && baseFor(object, iteratee, keys);
}

/**
 * The base implementation of `_.findIndex` and `_.findLastIndex` without
 * support for iteratee shorthands.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {Function} predicate The function invoked per iteration.
 * @param {number} fromIndex The index to search from.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseFindIndex(array, predicate, fromIndex, fromRight) {
  var length = array.length,
      index = fromIndex + (fromRight ? 1 : -1);

  while ((fromRight ? index-- : ++index < length)) {
    if (predicate(array[index], index, array)) {
      return index;
    }
  }
  return -1;
}

/**
 * The base implementation of `_.isNaN` without support for number objects.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
 */
function baseIsNaN(value) {
  return value !== value;
}

/**
 * A specialized version of `_.indexOf` which performs strict equality
 * comparisons of values, i.e. `===`.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function strictIndexOf(array, value, fromIndex) {
  var index = fromIndex - 1,
      length = array.length;

  while (++index < length) {
    if (array[index] === value) {
      return index;
    }
  }
  return -1;
}

/**
 * The base implementation of `_.indexOf` without `fromIndex` bounds checks.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseIndexOf(array, value, fromIndex) {
  return value === value
    ? strictIndexOf(array, value, fromIndex)
    : baseFindIndex(array, baseIsNaN, fromIndex);
}

/**
 * Determines the best order for running the functions in `tasks`, based on
 * their requirements. Each function can optionally depend on other functions
 * being completed first, and each function is run as soon as its requirements
 * are satisfied.
 *
 * If any of the functions pass an error to their callback, the `auto` sequence
 * will stop. Further tasks will not execute (so any other functions depending
 * on it will not run), and the main `callback` is immediately called with the
 * error.
 *
 * Functions also receive an object containing the results of functions which
 * have completed so far as the first argument, if they have dependencies. If a
 * task function has no dependencies, it will only be passed a callback.
 *
 * @name auto
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Object} tasks - An object. Each of its properties is either a
 * function or an array of requirements, with the function itself the last item
 * in the array. The object's key of a property serves as the name of the task
 * defined by that property, i.e. can be used when specifying requirements for
 * other tasks. The function receives one or two arguments:
 * * a `results` object, containing the results of the previously executed
 *   functions, only passed if the task has any dependencies,
 * * a `callback(err, result)` function, which must be called when finished,
 *   passing an `error` (which can be `null`) and the result of the function's
 *   execution.
 * @param {number} [concurrency=Infinity] - An optional `integer` for
 * determining the maximum number of tasks that can be run in parallel. By
 * default, as many as possible.
 * @param {Function} [callback] - An optional callback which is called when all
 * the tasks have been completed. It receives the `err` argument if any `tasks`
 * pass an error to their callback. Results are always returned; however, if an
 * error occurs, no further `tasks` will be performed, and the results object
 * will only contain partial results. Invoked with (err, results).
 * @returns undefined
 * @example
 *
 * async.auto({
 *     // this function will just be passed a callback
 *     readData: async.apply(fs.readFile, 'data.txt', 'utf-8'),
 *     showData: ['readData', function(results, cb) {
 *         // results.readData is the file's contents
 *         // ...
 *     }]
 * }, callback);
 *
 * async.auto({
 *     get_data: function(callback) {
 *         console.log('in get_data');
 *         // async code to get some data
 *         callback(null, 'data', 'converted to array');
 *     },
 *     make_folder: function(callback) {
 *         console.log('in make_folder');
 *         // async code to create a directory to store a file in
 *         // this is run at the same time as getting the data
 *         callback(null, 'folder');
 *     },
 *     write_file: ['get_data', 'make_folder', function(results, callback) {
 *         console.log('in write_file', JSON.stringify(results));
 *         // once there is some data and the directory exists,
 *         // write the data to a file in the directory
 *         callback(null, 'filename');
 *     }],
 *     email_link: ['write_file', function(results, callback) {
 *         console.log('in email_link', JSON.stringify(results));
 *         // once the file is written let's email a link to it...
 *         // results.write_file contains the filename returned by write_file.
 *         callback(null, {'file':results.write_file, 'email':'user@example.com'});
 *     }]
 * }, function(err, results) {
 *     console.log('err = ', err);
 *     console.log('results = ', results);
 * });
 */
var auto = function (tasks, concurrency, callback) {
    if (typeof concurrency === 'function') {
        // concurrency is optional, shift the args.
        callback = concurrency;
        concurrency = null;
    }
    callback = once(callback || noop);
    var keys$$1 = keys(tasks);
    var numTasks = keys$$1.length;
    if (!numTasks) {
        return callback(null);
    }
    if (!concurrency) {
        concurrency = numTasks;
    }

    var results = {};
    var runningTasks = 0;
    var hasError = false;

    var listeners = Object.create(null);

    var readyTasks = [];

    // for cycle detection:
    var readyToCheck = []; // tasks that have been identified as reachable
    // without the possibility of returning to an ancestor task
    var uncheckedDependencies = {};

    baseForOwn(tasks, function (task, key) {
        if (!isArray(task)) {
            // no dependencies
            enqueueTask(key, [task]);
            readyToCheck.push(key);
            return;
        }

        var dependencies = task.slice(0, task.length - 1);
        var remainingDependencies = dependencies.length;
        if (remainingDependencies === 0) {
            enqueueTask(key, task);
            readyToCheck.push(key);
            return;
        }
        uncheckedDependencies[key] = remainingDependencies;

        arrayEach(dependencies, function (dependencyName) {
            if (!tasks[dependencyName]) {
                throw new Error('async.auto task `' + key + '` has a non-existent dependency `' + dependencyName + '` in ' + dependencies.join(', '));
            }
            addListener(dependencyName, function () {
                remainingDependencies--;
                if (remainingDependencies === 0) {
                    enqueueTask(key, task);
                }
            });
        });
    });

    checkForDeadlocks();
    processQueue();

    function enqueueTask(key, task) {
        readyTasks.push(function () {
            runTask(key, task);
        });
    }

    function processQueue() {
        if (readyTasks.length === 0 && runningTasks === 0) {
            return callback(null, results);
        }
        while (readyTasks.length && runningTasks < concurrency) {
            var run = readyTasks.shift();
            run();
        }
    }

    function addListener(taskName, fn) {
        var taskListeners = listeners[taskName];
        if (!taskListeners) {
            taskListeners = listeners[taskName] = [];
        }

        taskListeners.push(fn);
    }

    function taskComplete(taskName) {
        var taskListeners = listeners[taskName] || [];
        arrayEach(taskListeners, function (fn) {
            fn();
        });
        processQueue();
    }

    function runTask(key, task) {
        if (hasError) return;

        var taskCallback = onlyOnce(rest(function (err, args) {
            runningTasks--;
            if (args.length <= 1) {
                args = args[0];
            }
            if (err) {
                var safeResults = {};
                baseForOwn(results, function (val, rkey) {
                    safeResults[rkey] = val;
                });
                safeResults[key] = args;
                hasError = true;
                listeners = Object.create(null);

                callback(err, safeResults);
            } else {
                results[key] = args;
                taskComplete(key);
            }
        }));

        runningTasks++;
        var taskFn = task[task.length - 1];
        if (task.length > 1) {
            taskFn(results, taskCallback);
        } else {
            taskFn(taskCallback);
        }
    }

    function checkForDeadlocks() {
        // Kahn's algorithm
        // https://en.wikipedia.org/wiki/Topological_sorting#Kahn.27s_algorithm
        // http://connalle.blogspot.com/2013/10/topological-sortingkahn-algorithm.html
        var currentTask;
        var counter = 0;
        while (readyToCheck.length) {
            currentTask = readyToCheck.pop();
            counter++;
            arrayEach(getDependents(currentTask), function (dependent) {
                if (--uncheckedDependencies[dependent] === 0) {
                    readyToCheck.push(dependent);
                }
            });
        }

        if (counter !== numTasks) {
            throw new Error('async.auto cannot execute tasks due to a recursive dependency');
        }
    }

    function getDependents(taskName) {
        var result = [];
        baseForOwn(tasks, function (task, key) {
            if (isArray(task) && baseIndexOf(task, taskName, 0) >= 0) {
                result.push(key);
            }
        });
        return result;
    }
};

/**
 * A specialized version of `_.map` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function arrayMap(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && baseGetTag(value) == symbolTag);
}

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol$1 ? Symbol$1.prototype : undefined;
var symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isArray(value)) {
    // Recursively convert values (susceptible to call stack limits).
    return arrayMap(value, baseToString) + '';
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * The base implementation of `_.slice` without an iteratee call guard.
 *
 * @private
 * @param {Array} array The array to slice.
 * @param {number} [start=0] The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the slice of `array`.
 */
function baseSlice(array, start, end) {
  var index = -1,
      length = array.length;

  if (start < 0) {
    start = -start > length ? 0 : (length + start);
  }
  end = end > length ? length : end;
  if (end < 0) {
    end += length;
  }
  length = start > end ? 0 : ((end - start) >>> 0);
  start >>>= 0;

  var result = Array(length);
  while (++index < length) {
    result[index] = array[index + start];
  }
  return result;
}

/**
 * Casts `array` to a slice if it's needed.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {number} start The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the cast slice.
 */
function castSlice(array, start, end) {
  var length = array.length;
  end = end === undefined ? length : end;
  return (!start && end >= length) ? array : baseSlice(array, start, end);
}

/**
 * Used by `_.trim` and `_.trimEnd` to get the index of the last string symbol
 * that is not found in the character symbols.
 *
 * @private
 * @param {Array} strSymbols The string symbols to inspect.
 * @param {Array} chrSymbols The character symbols to find.
 * @returns {number} Returns the index of the last unmatched string symbol.
 */
function charsEndIndex(strSymbols, chrSymbols) {
  var index = strSymbols.length;

  while (index-- && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {}
  return index;
}

/**
 * Used by `_.trim` and `_.trimStart` to get the index of the first string symbol
 * that is not found in the character symbols.
 *
 * @private
 * @param {Array} strSymbols The string symbols to inspect.
 * @param {Array} chrSymbols The character symbols to find.
 * @returns {number} Returns the index of the first unmatched string symbol.
 */
function charsStartIndex(strSymbols, chrSymbols) {
  var index = -1,
      length = strSymbols.length;

  while (++index < length && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {}
  return index;
}

/**
 * Converts an ASCII `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function asciiToArray(string) {
  return string.split('');
}

/** Used to compose unicode character classes. */
var rsAstralRange = '\\ud800-\\udfff';
var rsComboMarksRange = '\\u0300-\\u036f';
var reComboHalfMarksRange = '\\ufe20-\\ufe2f';
var rsComboSymbolsRange = '\\u20d0-\\u20ff';
var rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange;
var rsVarRange = '\\ufe0e\\ufe0f';

/** Used to compose unicode capture groups. */
var rsZWJ = '\\u200d';

/** Used to detect strings with [zero-width joiners or code points from the astral planes](http://eev.ee/blog/2015/09/12/dark-corners-of-unicode/). */
var reHasUnicode = RegExp('[' + rsZWJ + rsAstralRange  + rsComboRange + rsVarRange + ']');

/**
 * Checks if `string` contains Unicode symbols.
 *
 * @private
 * @param {string} string The string to inspect.
 * @returns {boolean} Returns `true` if a symbol is found, else `false`.
 */
function hasUnicode(string) {
  return reHasUnicode.test(string);
}

/** Used to compose unicode character classes. */
var rsAstralRange$1 = '\\ud800-\\udfff';
var rsComboMarksRange$1 = '\\u0300-\\u036f';
var reComboHalfMarksRange$1 = '\\ufe20-\\ufe2f';
var rsComboSymbolsRange$1 = '\\u20d0-\\u20ff';
var rsComboRange$1 = rsComboMarksRange$1 + reComboHalfMarksRange$1 + rsComboSymbolsRange$1;
var rsVarRange$1 = '\\ufe0e\\ufe0f';

/** Used to compose unicode capture groups. */
var rsAstral = '[' + rsAstralRange$1 + ']';
var rsCombo = '[' + rsComboRange$1 + ']';
var rsFitz = '\\ud83c[\\udffb-\\udfff]';
var rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')';
var rsNonAstral = '[^' + rsAstralRange$1 + ']';
var rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}';
var rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]';
var rsZWJ$1 = '\\u200d';

/** Used to compose unicode regexes. */
var reOptMod = rsModifier + '?';
var rsOptVar = '[' + rsVarRange$1 + ']?';
var rsOptJoin = '(?:' + rsZWJ$1 + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*';
var rsSeq = rsOptVar + reOptMod + rsOptJoin;
var rsSymbol = '(?:' + [rsNonAstral + rsCombo + '?', rsCombo, rsRegional, rsSurrPair, rsAstral].join('|') + ')';

/** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */
var reUnicode = RegExp(rsFitz + '(?=' + rsFitz + ')|' + rsSymbol + rsSeq, 'g');

/**
 * Converts a Unicode `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function unicodeToArray(string) {
  return string.match(reUnicode) || [];
}

/**
 * Converts `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function stringToArray(string) {
  return hasUnicode(string)
    ? unicodeToArray(string)
    : asciiToArray(string);
}

/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : baseToString(value);
}

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/**
 * Removes leading and trailing whitespace or specified characters from `string`.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category String
 * @param {string} [string=''] The string to trim.
 * @param {string} [chars=whitespace] The characters to trim.
 * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
 * @returns {string} Returns the trimmed string.
 * @example
 *
 * _.trim('  abc  ');
 * // => 'abc'
 *
 * _.trim('-_-abc-_-', '_-');
 * // => 'abc'
 *
 * _.map(['  foo  ', '  bar  '], _.trim);
 * // => ['foo', 'bar']
 */
function trim(string, chars, guard) {
  string = toString(string);
  if (string && (guard || chars === undefined)) {
    return string.replace(reTrim, '');
  }
  if (!string || !(chars = baseToString(chars))) {
    return string;
  }
  var strSymbols = stringToArray(string),
      chrSymbols = stringToArray(chars),
      start = charsStartIndex(strSymbols, chrSymbols),
      end = charsEndIndex(strSymbols, chrSymbols) + 1;

  return castSlice(strSymbols, start, end).join('');
}

var FN_ARGS = /^(function)?\s*[^\(]*\(\s*([^\)]*)\)/m;
var FN_ARG_SPLIT = /,/;
var FN_ARG = /(=.+)?(\s*)$/;
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

function parseParams(func) {
    func = func.toString().replace(STRIP_COMMENTS, '');
    func = func.match(FN_ARGS)[2].replace(' ', '');
    func = func ? func.split(FN_ARG_SPLIT) : [];
    func = func.map(function (arg) {
        return trim(arg.replace(FN_ARG, ''));
    });
    return func;
}

/**
 * A dependency-injected version of the [async.auto]{@link module:ControlFlow.auto} function. Dependent
 * tasks are specified as parameters to the function, after the usual callback
 * parameter, with the parameter names matching the names of the tasks it
 * depends on. This can provide even more readable task graphs which can be
 * easier to maintain.
 *
 * If a final callback is specified, the task results are similarly injected,
 * specified as named parameters after the initial error parameter.
 *
 * The autoInject function is purely syntactic sugar and its semantics are
 * otherwise equivalent to [async.auto]{@link module:ControlFlow.auto}.
 *
 * @name autoInject
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.auto]{@link module:ControlFlow.auto}
 * @category Control Flow
 * @param {Object} tasks - An object, each of whose properties is a function of
 * the form 'func([dependencies...], callback). The object's key of a property
 * serves as the name of the task defined by that property, i.e. can be used
 * when specifying requirements for other tasks.
 * * The `callback` parameter is a `callback(err, result)` which must be called
 *   when finished, passing an `error` (which can be `null`) and the result of
 *   the function's execution. The remaining parameters name other tasks on
 *   which the task is dependent, and the results from those tasks are the
 *   arguments of those parameters.
 * @param {Function} [callback] - An optional callback which is called when all
 * the tasks have been completed. It receives the `err` argument if any `tasks`
 * pass an error to their callback, and a `results` object with any completed
 * task results, similar to `auto`.
 * @example
 *
 * //  The example from `auto` can be rewritten as follows:
 * async.autoInject({
 *     get_data: function(callback) {
 *         // async code to get some data
 *         callback(null, 'data', 'converted to array');
 *     },
 *     make_folder: function(callback) {
 *         // async code to create a directory to store a file in
 *         // this is run at the same time as getting the data
 *         callback(null, 'folder');
 *     },
 *     write_file: function(get_data, make_folder, callback) {
 *         // once there is some data and the directory exists,
 *         // write the data to a file in the directory
 *         callback(null, 'filename');
 *     },
 *     email_link: function(write_file, callback) {
 *         // once the file is written let's email a link to it...
 *         // write_file contains the filename returned by write_file.
 *         callback(null, {'file':write_file, 'email':'user@example.com'});
 *     }
 * }, function(err, results) {
 *     console.log('err = ', err);
 *     console.log('email_link = ', results.email_link);
 * });
 *
 * // If you are using a JS minifier that mangles parameter names, `autoInject`
 * // will not work with plain functions, since the parameter names will be
 * // collapsed to a single letter identifier.  To work around this, you can
 * // explicitly specify the names of the parameters your task function needs
 * // in an array, similar to Angular.js dependency injection.
 *
 * // This still has an advantage over plain `auto`, since the results a task
 * // depends on are still spread into arguments.
 * async.autoInject({
 *     //...
 *     write_file: ['get_data', 'make_folder', function(get_data, make_folder, callback) {
 *         callback(null, 'filename');
 *     }],
 *     email_link: ['write_file', function(write_file, callback) {
 *         callback(null, {'file':write_file, 'email':'user@example.com'});
 *     }]
 *     //...
 * }, function(err, results) {
 *     console.log('err = ', err);
 *     console.log('email_link = ', results.email_link);
 * });
 */
function autoInject(tasks, callback) {
    var newTasks = {};

    baseForOwn(tasks, function (taskFn, key) {
        var params;

        if (isArray(taskFn)) {
            params = taskFn.slice(0, -1);
            taskFn = taskFn[taskFn.length - 1];

            newTasks[key] = params.concat(params.length > 0 ? newTask : taskFn);
        } else if (taskFn.length === 1) {
            // no dependencies, use the function as-is
            newTasks[key] = taskFn;
        } else {
            params = parseParams(taskFn);
            if (taskFn.length === 0 && params.length === 0) {
                throw new Error("autoInject task functions require explicit parameters.");
            }

            params.pop();

            newTasks[key] = params.concat(newTask);
        }

        function newTask(results, taskCb) {
            var newArgs = arrayMap(params, function (name) {
                return results[name];
            });
            newArgs.push(taskCb);
            taskFn.apply(null, newArgs);
        }
    });

    auto(newTasks, callback);
}

var hasSetImmediate = typeof setImmediate === 'function' && setImmediate;
var hasNextTick = typeof process === 'object' && typeof process.nextTick === 'function';

function fallback(fn) {
    setTimeout(fn, 0);
}

function wrap(defer) {
    return rest(function (fn, args) {
        defer(function () {
            fn.apply(null, args);
        });
    });
}

var _defer;

if (hasSetImmediate) {
    _defer = setImmediate;
} else if (hasNextTick) {
    _defer = process.nextTick;
} else {
    _defer = fallback;
}

var setImmediate$1 = wrap(_defer);

// Simple doubly linked list (https://en.wikipedia.org/wiki/Doubly_linked_list) implementation
// used for queues. This implementation assumes that the node provided by the user can be modified
// to adjust the next and last properties. We implement only the minimal functionality
// for queue support.
function DLL() {
    this.head = this.tail = null;
    this.length = 0;
}

function setInitial(dll, node) {
    dll.length = 1;
    dll.head = dll.tail = node;
}

DLL.prototype.removeLink = function (node) {
    if (node.prev) node.prev.next = node.next;else this.head = node.next;
    if (node.next) node.next.prev = node.prev;else this.tail = node.prev;

    node.prev = node.next = null;
    this.length -= 1;
    return node;
};

DLL.prototype.empty = DLL;

DLL.prototype.insertAfter = function (node, newNode) {
    newNode.prev = node;
    newNode.next = node.next;
    if (node.next) node.next.prev = newNode;else this.tail = newNode;
    node.next = newNode;
    this.length += 1;
};

DLL.prototype.insertBefore = function (node, newNode) {
    newNode.prev = node.prev;
    newNode.next = node;
    if (node.prev) node.prev.next = newNode;else this.head = newNode;
    node.prev = newNode;
    this.length += 1;
};

DLL.prototype.unshift = function (node) {
    if (this.head) this.insertBefore(this.head, node);else setInitial(this, node);
};

DLL.prototype.push = function (node) {
    if (this.tail) this.insertAfter(this.tail, node);else setInitial(this, node);
};

DLL.prototype.shift = function () {
    return this.head && this.removeLink(this.head);
};

DLL.prototype.pop = function () {
    return this.tail && this.removeLink(this.tail);
};

function queue(worker, concurrency, payload) {
    if (concurrency == null) {
        concurrency = 1;
    } else if (concurrency === 0) {
        throw new Error('Concurrency must not be zero');
    }

    function _insert(data, insertAtFront, callback) {
        if (callback != null && typeof callback !== 'function') {
            throw new Error('task callback must be a function');
        }
        q.started = true;
        if (!isArray(data)) {
            data = [data];
        }
        if (data.length === 0 && q.idle()) {
            // call drain immediately if there are no tasks
            return setImmediate$1(function () {
                q.drain();
            });
        }

        for (var i = 0, l = data.length; i < l; i++) {
            var item = {
                data: data[i],
                callback: callback || noop
            };

            if (insertAtFront) {
                q._tasks.unshift(item);
            } else {
                q._tasks.push(item);
            }
        }
        setImmediate$1(q.process);
    }

    function _next(tasks) {
        return rest(function (args) {
            workers -= 1;

            for (var i = 0, l = tasks.length; i < l; i++) {
                var task = tasks[i];
                var index = baseIndexOf(workersList, task, 0);
                if (index >= 0) {
                    workersList.splice(index);
                }

                task.callback.apply(task, args);

                if (args[0] != null) {
                    q.error(args[0], task.data);
                }
            }

            if (workers <= q.concurrency - q.buffer) {
                q.unsaturated();
            }

            if (q.idle()) {
                q.drain();
            }
            q.process();
        });
    }

    var workers = 0;
    var workersList = [];
    var isProcessing = false;
    var q = {
        _tasks: new DLL(),
        concurrency: concurrency,
        payload: payload,
        saturated: noop,
        unsaturated: noop,
        buffer: concurrency / 4,
        empty: noop,
        drain: noop,
        error: noop,
        started: false,
        paused: false,
        push: function (data, callback) {
            _insert(data, false, callback);
        },
        kill: function () {
            q.drain = noop;
            q._tasks.empty();
        },
        unshift: function (data, callback) {
            _insert(data, true, callback);
        },
        process: function () {
            // Avoid trying to start too many processing operations. This can occur
            // when callbacks resolve synchronously (#1267).
            if (isProcessing) {
                return;
            }
            isProcessing = true;
            while (!q.paused && workers < q.concurrency && q._tasks.length) {
                var tasks = [],
                    data = [];
                var l = q._tasks.length;
                if (q.payload) l = Math.min(l, q.payload);
                for (var i = 0; i < l; i++) {
                    var node = q._tasks.shift();
                    tasks.push(node);
                    data.push(node.data);
                }

                if (q._tasks.length === 0) {
                    q.empty();
                }
                workers += 1;
                workersList.push(tasks[0]);

                if (workers === q.concurrency) {
                    q.saturated();
                }

                var cb = onlyOnce(_next(tasks));
                worker(data, cb);
            }
            isProcessing = false;
        },
        length: function () {
            return q._tasks.length;
        },
        running: function () {
            return workers;
        },
        workersList: function () {
            return workersList;
        },
        idle: function () {
            return q._tasks.length + workers === 0;
        },
        pause: function () {
            q.paused = true;
        },
        resume: function () {
            if (q.paused === false) {
                return;
            }
            q.paused = false;
            setImmediate$1(q.process);
        }
    };
    return q;
}

/**
 * A cargo of tasks for the worker function to complete. Cargo inherits all of
 * the same methods and event callbacks as [`queue`]{@link module:ControlFlow.queue}.
 * @typedef {Object} CargoObject
 * @memberOf module:ControlFlow
 * @property {Function} length - A function returning the number of items
 * waiting to be processed. Invoke like `cargo.length()`.
 * @property {number} payload - An `integer` for determining how many tasks
 * should be process per round. This property can be changed after a `cargo` is
 * created to alter the payload on-the-fly.
 * @property {Function} push - Adds `task` to the `queue`. The callback is
 * called once the `worker` has finished processing the task. Instead of a
 * single task, an array of `tasks` can be submitted. The respective callback is
 * used for every task in the list. Invoke like `cargo.push(task, [callback])`.
 * @property {Function} saturated - A callback that is called when the
 * `queue.length()` hits the concurrency and further tasks will be queued.
 * @property {Function} empty - A callback that is called when the last item
 * from the `queue` is given to a `worker`.
 * @property {Function} drain - A callback that is called when the last item
 * from the `queue` has returned from the `worker`.
 * @property {Function} idle - a function returning false if there are items
 * waiting or being processed, or true if not. Invoke like `cargo.idle()`.
 * @property {Function} pause - a function that pauses the processing of tasks
 * until `resume()` is called. Invoke like `cargo.pause()`.
 * @property {Function} resume - a function that resumes the processing of
 * queued tasks when the queue is paused. Invoke like `cargo.resume()`.
 * @property {Function} kill - a function that removes the `drain` callback and
 * empties remaining tasks from the queue forcing it to go idle. Invoke like `cargo.kill()`.
 */

/**
 * Creates a `cargo` object with the specified payload. Tasks added to the
 * cargo will be processed altogether (up to the `payload` limit). If the
 * `worker` is in progress, the task is queued until it becomes available. Once
 * the `worker` has completed some tasks, each callback of those tasks is
 * called. Check out [these](https://camo.githubusercontent.com/6bbd36f4cf5b35a0f11a96dcd2e97711ffc2fb37/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130382f62626330636662302d356632392d313165322d393734662d3333393763363464633835382e676966) [animations](https://camo.githubusercontent.com/f4810e00e1c5f5f8addbe3e9f49064fd5d102699/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130312f38346339323036362d356632392d313165322d383134662d3964336430323431336266642e676966)
 * for how `cargo` and `queue` work.
 *
 * While [`queue`]{@link module:ControlFlow.queue} passes only one task to one of a group of workers
 * at a time, cargo passes an array of tasks to a single worker, repeating
 * when the worker is finished.
 *
 * @name cargo
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.queue]{@link module:ControlFlow.queue}
 * @category Control Flow
 * @param {Function} worker - An asynchronous function for processing an array
 * of queued tasks, which must call its `callback(err)` argument when finished,
 * with an optional `err` argument. Invoked with `(tasks, callback)`.
 * @param {number} [payload=Infinity] - An optional `integer` for determining
 * how many tasks should be processed per round; if omitted, the default is
 * unlimited.
 * @returns {module:ControlFlow.CargoObject} A cargo object to manage the tasks. Callbacks can
 * attached as certain properties to listen for specific events during the
 * lifecycle of the cargo and inner queue.
 * @example
 *
 * // create a cargo object with payload 2
 * var cargo = async.cargo(function(tasks, callback) {
 *     for (var i=0; i<tasks.length; i++) {
 *         console.log('hello ' + tasks[i].name);
 *     }
 *     callback();
 * }, 2);
 *
 * // add some items
 * cargo.push({name: 'foo'}, function(err) {
 *     console.log('finished processing foo');
 * });
 * cargo.push({name: 'bar'}, function(err) {
 *     console.log('finished processing bar');
 * });
 * cargo.push({name: 'baz'}, function(err) {
 *     console.log('finished processing baz');
 * });
 */
function cargo(worker, payload) {
  return queue(worker, 1, payload);
}

/**
 * The same as [`eachOf`]{@link module:Collections.eachOf} but runs only a single async operation at a time.
 *
 * @name eachOfSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.eachOf]{@link module:Collections.eachOf}
 * @alias forEachOfSeries
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each item in `coll`. The
 * `key` is the item's key, or index in the case of an array. The iteratee is
 * passed a `callback(err)` which must be called once it has completed. If no
 * error has occurred, the callback should be run without arguments or with an
 * explicit `null` argument. Invoked with (item, key, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. Invoked with (err).
 */
var eachOfSeries = doLimit(eachOfLimit, 1);

/**
 * Reduces `coll` into a single value using an async `iteratee` to return each
 * successive step. `memo` is the initial state of the reduction. This function
 * only operates in series.
 *
 * For performance reasons, it may make sense to split a call to this function
 * into a parallel map, and then use the normal `Array.prototype.reduce` on the
 * results. This function is for situations where each step in the reduction
 * needs to be async; if you can get the data before reducing it, then it's
 * probably a good idea to do so.
 *
 * @name reduce
 * @static
 * @memberOf module:Collections
 * @method
 * @alias inject
 * @alias foldl
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {*} memo - The initial state of the reduction.
 * @param {Function} iteratee - A function applied to each item in the
 * array to produce the next step in the reduction. The `iteratee` is passed a
 * `callback(err, reduction)` which accepts an optional error as its first
 * argument, and the state of the reduction as the second. If an error is
 * passed to the callback, the reduction is stopped and the main `callback` is
 * immediately called with the error. Invoked with (memo, item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result is the reduced value. Invoked with
 * (err, result).
 * @example
 *
 * async.reduce([1,2,3], 0, function(memo, item, callback) {
 *     // pointless async:
 *     process.nextTick(function() {
 *         callback(null, memo + item)
 *     });
 * }, function(err, result) {
 *     // result is now equal to the last value of memo, which is 6
 * });
 */
function reduce(coll, memo, iteratee, callback) {
    callback = once(callback || noop);
    eachOfSeries(coll, function (x, i, callback) {
        iteratee(memo, x, function (err, v) {
            memo = v;
            callback(err);
        });
    }, function (err) {
        callback(err, memo);
    });
}

/**
 * Version of the compose function that is more natural to read. Each function
 * consumes the return value of the previous function. It is the equivalent of
 * [compose]{@link module:ControlFlow.compose} with the arguments reversed.
 *
 * Each function is executed with the `this` binding of the composed function.
 *
 * @name seq
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.compose]{@link module:ControlFlow.compose}
 * @category Control Flow
 * @param {...Function} functions - the asynchronous functions to compose
 * @returns {Function} a function that composes the `functions` in order
 * @example
 *
 * // Requires lodash (or underscore), express3 and dresende's orm2.
 * // Part of an app, that fetches cats of the logged user.
 * // This example uses `seq` function to avoid overnesting and error
 * // handling clutter.
 * app.get('/cats', function(request, response) {
 *     var User = request.models.User;
 *     async.seq(
 *         _.bind(User.get, User),  // 'User.get' has signature (id, callback(err, data))
 *         function(user, fn) {
 *             user.getCats(fn);      // 'getCats' has signature (callback(err, data))
 *         }
 *     )(req.session.user_id, function (err, cats) {
 *         if (err) {
 *             console.error(err);
 *             response.json({ status: 'error', message: err.message });
 *         } else {
 *             response.json({ status: 'ok', message: 'Cats found', data: cats });
 *         }
 *     });
 * });
 */
var seq$1 = rest(function seq(functions) {
    return rest(function (args) {
        var that = this;

        var cb = args[args.length - 1];
        if (typeof cb == 'function') {
            args.pop();
        } else {
            cb = noop;
        }

        reduce(functions, args, function (newargs, fn, cb) {
            fn.apply(that, newargs.concat(rest(function (err, nextargs) {
                cb(err, nextargs);
            })));
        }, function (err, results) {
            cb.apply(that, [err].concat(results));
        });
    });
});

/**
 * Creates a function which is a composition of the passed asynchronous
 * functions. Each function consumes the return value of the function that
 * follows. Composing functions `f()`, `g()`, and `h()` would produce the result
 * of `f(g(h()))`, only this version uses callbacks to obtain the return values.
 *
 * Each function is executed with the `this` binding of the composed function.
 *
 * @name compose
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {...Function} functions - the asynchronous functions to compose
 * @returns {Function} an asynchronous function that is the composed
 * asynchronous `functions`
 * @example
 *
 * function add1(n, callback) {
 *     setTimeout(function () {
 *         callback(null, n + 1);
 *     }, 10);
 * }
 *
 * function mul3(n, callback) {
 *     setTimeout(function () {
 *         callback(null, n * 3);
 *     }, 10);
 * }
 *
 * var add1mul3 = async.compose(mul3, add1);
 * add1mul3(4, function (err, result) {
 *     // result now equals 15
 * });
 */
var compose = rest(function (args) {
  return seq$1.apply(null, args.reverse());
});

function concat$1(eachfn, arr, fn, callback) {
    var result = [];
    eachfn(arr, function (x, index, cb) {
        fn(x, function (err, y) {
            result = result.concat(y || []);
            cb(err);
        });
    }, function (err) {
        callback(err, result);
    });
}

/**
 * Applies `iteratee` to each item in `coll`, concatenating the results. Returns
 * the concatenated list. The `iteratee`s are called in parallel, and the
 * results are concatenated as they return. There is no guarantee that the
 * results array will be returned in the original order of `coll` passed to the
 * `iteratee` function.
 *
 * @name concat
 * @static
 * @memberOf module:Collections
 * @method
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each item in `coll`.
 * The iteratee is passed a `callback(err, results)` which must be called once
 * it has completed with an error (which can be `null`) and an array of results.
 * Invoked with (item, callback).
 * @param {Function} [callback(err)] - A callback which is called after all the
 * `iteratee` functions have finished, or an error occurs. Results is an array
 * containing the concatenated results of the `iteratee` function. Invoked with
 * (err, results).
 * @example
 *
 * async.concat(['dir1','dir2','dir3'], fs.readdir, function(err, files) {
 *     // files is now a list of filenames that exist in the 3 directories
 * });
 */
var concat = doParallel(concat$1);

function doSeries(fn) {
    return function (obj, iteratee, callback) {
        return fn(eachOfSeries, obj, iteratee, callback);
    };
}

/**
 * The same as [`concat`]{@link module:Collections.concat} but runs only a single async operation at a time.
 *
 * @name concatSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.concat]{@link module:Collections.concat}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each item in `coll`.
 * The iteratee is passed a `callback(err, results)` which must be called once
 * it has completed with an error (which can be `null`) and an array of results.
 * Invoked with (item, callback).
 * @param {Function} [callback(err)] - A callback which is called after all the
 * `iteratee` functions have finished, or an error occurs. Results is an array
 * containing the concatenated results of the `iteratee` function. Invoked with
 * (err, results).
 */
var concatSeries = doSeries(concat$1);

/**
 * Returns a function that when called, calls-back with the values provided.
 * Useful as the first function in a [`waterfall`]{@link module:ControlFlow.waterfall}, or for plugging values in to
 * [`auto`]{@link module:ControlFlow.auto}.
 *
 * @name constant
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {...*} arguments... - Any number of arguments to automatically invoke
 * callback with.
 * @returns {Function} Returns a function that when invoked, automatically
 * invokes the callback with the previous given arguments.
 * @example
 *
 * async.waterfall([
 *     async.constant(42),
 *     function (value, next) {
 *         // value === 42
 *     },
 *     //...
 * ], callback);
 *
 * async.waterfall([
 *     async.constant(filename, "utf8"),
 *     fs.readFile,
 *     function (fileData, next) {
 *         //...
 *     }
 *     //...
 * ], callback);
 *
 * async.auto({
 *     hostname: async.constant("https://server.net/"),
 *     port: findFreePort,
 *     launchServer: ["hostname", "port", function (options, cb) {
 *         startServer(options, cb);
 *     }],
 *     //...
 * }, callback);
 */
var constant = rest(function (values) {
    var args = [null].concat(values);
    return initialParams(function (ignoredArgs, callback) {
        return callback.apply(this, args);
    });
});

function _createTester(check, getResult) {
    return function (eachfn, arr, iteratee, cb) {
        cb = cb || noop;
        var testPassed = false;
        var testResult;
        eachfn(arr, function (value, _, callback) {
            iteratee(value, function (err, result) {
                if (err) {
                    callback(err);
                } else if (check(result) && !testResult) {
                    testPassed = true;
                    testResult = getResult(true, value);
                    callback(null, breakLoop);
                } else {
                    callback();
                }
            });
        }, function (err) {
            if (err) {
                cb(err);
            } else {
                cb(null, testPassed ? testResult : getResult(false));
            }
        });
    };
}

function _findGetResult(v, x) {
    return x;
}

/**
 * Returns the first value in `coll` that passes an async truth test. The
 * `iteratee` is applied in parallel, meaning the first iteratee to return
 * `true` will fire the detect `callback` with that result. That means the
 * result might not be the first item in the original `coll` (in terms of order)
 * that passes the test.

 * If order within the original `coll` is important, then look at
 * [`detectSeries`]{@link module:Collections.detectSeries}.
 *
 * @name detect
 * @static
 * @memberOf module:Collections
 * @method
 * @alias find
 * @category Collections
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The iteratee is passed a `callback(err, truthValue)` which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called as soon as any
 * iteratee returns `true`, or after all the `iteratee` functions have finished.
 * Result will be the first item in the array that passes the truth test
 * (iteratee) or the value `undefined` if none passed. Invoked with
 * (err, result).
 * @example
 *
 * async.detect(['file1','file2','file3'], function(filePath, callback) {
 *     fs.access(filePath, function(err) {
 *         callback(null, !err)
 *     });
 * }, function(err, result) {
 *     // result now equals the first file in the list that exists
 * });
 */
var detect = doParallel(_createTester(identity, _findGetResult));

/**
 * The same as [`detect`]{@link module:Collections.detect} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name detectLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.detect]{@link module:Collections.detect}
 * @alias findLimit
 * @category Collections
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The iteratee is passed a `callback(err, truthValue)` which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called as soon as any
 * iteratee returns `true`, or after all the `iteratee` functions have finished.
 * Result will be the first item in the array that passes the truth test
 * (iteratee) or the value `undefined` if none passed. Invoked with
 * (err, result).
 */
var detectLimit = doParallelLimit(_createTester(identity, _findGetResult));

/**
 * The same as [`detect`]{@link module:Collections.detect} but runs only a single async operation at a time.
 *
 * @name detectSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.detect]{@link module:Collections.detect}
 * @alias findSeries
 * @category Collections
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The iteratee is passed a `callback(err, truthValue)` which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called as soon as any
 * iteratee returns `true`, or after all the `iteratee` functions have finished.
 * Result will be the first item in the array that passes the truth test
 * (iteratee) or the value `undefined` if none passed. Invoked with
 * (err, result).
 */
var detectSeries = doLimit(detectLimit, 1);

function consoleFunc(name) {
    return rest(function (fn, args) {
        fn.apply(null, args.concat(rest(function (err, args) {
            if (typeof console === 'object') {
                if (err) {
                    if (console.error) {
                        console.error(err);
                    }
                } else if (console[name]) {
                    arrayEach(args, function (x) {
                        console[name](x);
                    });
                }
            }
        })));
    });
}

/**
 * Logs the result of an `async` function to the `console` using `console.dir`
 * to display the properties of the resulting object. Only works in Node.js or
 * in browsers that support `console.dir` and `console.error` (such as FF and
 * Chrome). If multiple arguments are returned from the async function,
 * `console.dir` is called on each argument in order.
 *
 * @name dir
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {Function} function - The function you want to eventually apply all
 * arguments to.
 * @param {...*} arguments... - Any number of arguments to apply to the function.
 * @example
 *
 * // in a module
 * var hello = function(name, callback) {
 *     setTimeout(function() {
 *         callback(null, {hello: name});
 *     }, 1000);
 * };
 *
 * // in the node repl
 * node> async.dir(hello, 'world');
 * {hello: 'world'}
 */
var dir = consoleFunc('dir');

/**
 * The post-check version of [`during`]{@link module:ControlFlow.during}. To reflect the difference in
 * the order of operations, the arguments `test` and `fn` are switched.
 *
 * Also a version of [`doWhilst`]{@link module:ControlFlow.doWhilst} with asynchronous `test` function.
 * @name doDuring
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.during]{@link module:ControlFlow.during}
 * @category Control Flow
 * @param {Function} fn - A function which is called each time `test` passes.
 * The function is passed a `callback(err)`, which must be called once it has
 * completed with an optional `err` argument. Invoked with (callback).
 * @param {Function} test - asynchronous truth test to perform before each
 * execution of `fn`. Invoked with (...args, callback), where `...args` are the
 * non-error args from the previous callback of `fn`.
 * @param {Function} [callback] - A callback which is called after the test
 * function has failed and repeated execution of `fn` has stopped. `callback`
 * will be passed an error if one occured, otherwise `null`.
 */
function doDuring(fn, test, callback) {
    callback = onlyOnce(callback || noop);

    var next = rest(function (err, args) {
        if (err) return callback(err);
        args.push(check);
        test.apply(this, args);
    });

    function check(err, truth) {
        if (err) return callback(err);
        if (!truth) return callback(null);
        fn(next);
    }

    check(null, true);
}

/**
 * The post-check version of [`whilst`]{@link module:ControlFlow.whilst}. To reflect the difference in
 * the order of operations, the arguments `test` and `iteratee` are switched.
 *
 * `doWhilst` is to `whilst` as `do while` is to `while` in plain JavaScript.
 *
 * @name doWhilst
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.whilst]{@link module:ControlFlow.whilst}
 * @category Control Flow
 * @param {Function} iteratee - A function which is called each time `test`
 * passes. The function is passed a `callback(err)`, which must be called once
 * it has completed with an optional `err` argument. Invoked with (callback).
 * @param {Function} test - synchronous truth test to perform after each
 * execution of `iteratee`. Invoked with the non-error callback results of 
 * `iteratee`.
 * @param {Function} [callback] - A callback which is called after the test
 * function has failed and repeated execution of `iteratee` has stopped.
 * `callback` will be passed an error and any arguments passed to the final
 * `iteratee`'s callback. Invoked with (err, [results]);
 */
function doWhilst(iteratee, test, callback) {
    callback = onlyOnce(callback || noop);
    var next = rest(function (err, args) {
        if (err) return callback(err);
        if (test.apply(this, args)) return iteratee(next);
        callback.apply(null, [null].concat(args));
    });
    iteratee(next);
}

/**
 * Like ['doWhilst']{@link module:ControlFlow.doWhilst}, except the `test` is inverted. Note the
 * argument ordering differs from `until`.
 *
 * @name doUntil
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.doWhilst]{@link module:ControlFlow.doWhilst}
 * @category Control Flow
 * @param {Function} fn - A function which is called each time `test` fails.
 * The function is passed a `callback(err)`, which must be called once it has
 * completed with an optional `err` argument. Invoked with (callback).
 * @param {Function} test - synchronous truth test to perform after each
 * execution of `fn`. Invoked with the non-error callback results of `fn`.
 * @param {Function} [callback] - A callback which is called after the test
 * function has passed and repeated execution of `fn` has stopped. `callback`
 * will be passed an error and any arguments passed to the final `fn`'s
 * callback. Invoked with (err, [results]);
 */
function doUntil(fn, test, callback) {
    doWhilst(fn, function () {
        return !test.apply(this, arguments);
    }, callback);
}

/**
 * Like [`whilst`]{@link module:ControlFlow.whilst}, except the `test` is an asynchronous function that
 * is passed a callback in the form of `function (err, truth)`. If error is
 * passed to `test` or `fn`, the main callback is immediately called with the
 * value of the error.
 *
 * @name during
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.whilst]{@link module:ControlFlow.whilst}
 * @category Control Flow
 * @param {Function} test - asynchronous truth test to perform before each
 * execution of `fn`. Invoked with (callback).
 * @param {Function} fn - A function which is called each time `test` passes.
 * The function is passed a `callback(err)`, which must be called once it has
 * completed with an optional `err` argument. Invoked with (callback).
 * @param {Function} [callback] - A callback which is called after the test
 * function has failed and repeated execution of `fn` has stopped. `callback`
 * will be passed an error, if one occured, otherwise `null`.
 * @example
 *
 * var count = 0;
 *
 * async.during(
 *     function (callback) {
 *         return callback(null, count < 5);
 *     },
 *     function (callback) {
 *         count++;
 *         setTimeout(callback, 1000);
 *     },
 *     function (err) {
 *         // 5 seconds have passed
 *     }
 * );
 */
function during(test, fn, callback) {
    callback = onlyOnce(callback || noop);

    function next(err) {
        if (err) return callback(err);
        test(check);
    }

    function check(err, truth) {
        if (err) return callback(err);
        if (!truth) return callback(null);
        fn(next);
    }

    test(check);
}

function _withoutIndex(iteratee) {
    return function (value, index, callback) {
        return iteratee(value, callback);
    };
}

/**
 * Applies the function `iteratee` to each item in `coll`, in parallel.
 * The `iteratee` is called with an item from the list, and a callback for when
 * it has finished. If the `iteratee` passes an error to its `callback`, the
 * main `callback` (for the `each` function) is immediately called with the
 * error.
 *
 * Note, that since this function applies `iteratee` to each item in parallel,
 * there is no guarantee that the iteratee functions will complete in order.
 *
 * @name each
 * @static
 * @memberOf module:Collections
 * @method
 * @alias forEach
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each item
 * in `coll`. The iteratee is passed a `callback(err)` which must be called once
 * it has completed. If no error has occurred, the `callback` should be run
 * without arguments or with an explicit `null` argument. The array index is not
 * passed to the iteratee. Invoked with (item, callback). If you need the index,
 * use `eachOf`.
 * @param {Function} [callback] - A callback which is called when all
 * `iteratee` functions have finished, or an error occurs. Invoked with (err).
 * @example
 *
 * // assuming openFiles is an array of file names and saveFile is a function
 * // to save the modified contents of that file:
 *
 * async.each(openFiles, saveFile, function(err){
 *   // if any of the saves produced an error, err would equal that error
 * });
 *
 * // assuming openFiles is an array of file names
 * async.each(openFiles, function(file, callback) {
 *
 *     // Perform operation on file here.
 *     console.log('Processing file ' + file);
 *
 *     if( file.length > 32 ) {
 *       console.log('This file name is too long');
 *       callback('File name too long');
 *     } else {
 *       // Do work to process file here
 *       console.log('File processed');
 *       callback();
 *     }
 * }, function(err) {
 *     // if any of the file processing produced an error, err would equal that error
 *     if( err ) {
 *       // One of the iterations produced an error.
 *       // All processing will now stop.
 *       console.log('A file failed to process');
 *     } else {
 *       console.log('All files have been processed successfully');
 *     }
 * });
 */
function eachLimit(coll, iteratee, callback) {
  eachOf(coll, _withoutIndex(iteratee), callback);
}

/**
 * The same as [`each`]{@link module:Collections.each} but runs a maximum of `limit` async operations at a time.
 *
 * @name eachLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.each]{@link module:Collections.each}
 * @alias forEachLimit
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A function to apply to each item in `coll`. The
 * iteratee is passed a `callback(err)` which must be called once it has
 * completed. If no error has occurred, the `callback` should be run without
 * arguments or with an explicit `null` argument. The array index is not passed
 * to the iteratee. Invoked with (item, callback). If you need the index, use
 * `eachOfLimit`.
 * @param {Function} [callback] - A callback which is called when all
 * `iteratee` functions have finished, or an error occurs. Invoked with (err).
 */
function eachLimit$1(coll, limit, iteratee, callback) {
  _eachOfLimit(limit)(coll, _withoutIndex(iteratee), callback);
}

/**
 * The same as [`each`]{@link module:Collections.each} but runs only a single async operation at a time.
 *
 * @name eachSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.each]{@link module:Collections.each}
 * @alias forEachSeries
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each
 * item in `coll`. The iteratee is passed a `callback(err)` which must be called
 * once it has completed. If no error has occurred, the `callback` should be run
 * without arguments or with an explicit `null` argument. The array index is
 * not passed to the iteratee. Invoked with (item, callback). If you need the
 * index, use `eachOfSeries`.
 * @param {Function} [callback] - A callback which is called when all
 * `iteratee` functions have finished, or an error occurs. Invoked with (err).
 */
var eachSeries = doLimit(eachLimit$1, 1);

/**
 * Wrap an async function and ensure it calls its callback on a later tick of
 * the event loop.  If the function already calls its callback on a next tick,
 * no extra deferral is added. This is useful for preventing stack overflows
 * (`RangeError: Maximum call stack size exceeded`) and generally keeping
 * [Zalgo](http://blog.izs.me/post/59142742143/designing-apis-for-asynchrony)
 * contained.
 *
 * @name ensureAsync
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {Function} fn - an async function, one that expects a node-style
 * callback as its last argument.
 * @returns {Function} Returns a wrapped function with the exact same call
 * signature as the function passed in.
 * @example
 *
 * function sometimesAsync(arg, callback) {
 *     if (cache[arg]) {
 *         return callback(null, cache[arg]); // this would be synchronous!!
 *     } else {
 *         doSomeIO(arg, callback); // this IO would be asynchronous
 *     }
 * }
 *
 * // this has a risk of stack overflows if many results are cached in a row
 * async.mapSeries(args, sometimesAsync, done);
 *
 * // this will defer sometimesAsync's callback if necessary,
 * // preventing stack overflows
 * async.mapSeries(args, async.ensureAsync(sometimesAsync), done);
 */
function ensureAsync(fn) {
    return initialParams(function (args, callback) {
        var sync = true;
        args.push(function () {
            var innerArgs = arguments;
            if (sync) {
                setImmediate$1(function () {
                    callback.apply(null, innerArgs);
                });
            } else {
                callback.apply(null, innerArgs);
            }
        });
        fn.apply(this, args);
        sync = false;
    });
}

function notId(v) {
    return !v;
}

/**
 * Returns `true` if every element in `coll` satisfies an async test. If any
 * iteratee call returns `false`, the main `callback` is immediately called.
 *
 * @name every
 * @static
 * @memberOf module:Collections
 * @method
 * @alias all
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in the
 * collection in parallel. The iteratee is passed a `callback(err, truthValue)`
 * which must be called with a  boolean argument once it has completed. Invoked
 * with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result will be either `true` or `false`
 * depending on the values of the async tests. Invoked with (err, result).
 * @example
 *
 * async.every(['file1','file2','file3'], function(filePath, callback) {
 *     fs.access(filePath, function(err) {
 *         callback(null, !err)
 *     });
 * }, function(err, result) {
 *     // if result is true then every file exists
 * });
 */
var every = doParallel(_createTester(notId, notId));

/**
 * The same as [`every`]{@link module:Collections.every} but runs a maximum of `limit` async operations at a time.
 *
 * @name everyLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.every]{@link module:Collections.every}
 * @alias allLimit
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A truth test to apply to each item in the
 * collection in parallel. The iteratee is passed a `callback(err, truthValue)`
 * which must be called with a  boolean argument once it has completed. Invoked
 * with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result will be either `true` or `false`
 * depending on the values of the async tests. Invoked with (err, result).
 */
var everyLimit = doParallelLimit(_createTester(notId, notId));

/**
 * The same as [`every`]{@link module:Collections.every} but runs only a single async operation at a time.
 *
 * @name everySeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.every]{@link module:Collections.every}
 * @alias allSeries
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in the
 * collection in parallel. The iteratee is passed a `callback(err, truthValue)`
 * which must be called with a  boolean argument once it has completed. Invoked
 * with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result will be either `true` or `false`
 * depending on the values of the async tests. Invoked with (err, result).
 */
var everySeries = doLimit(everyLimit, 1);

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new accessor function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

function filterArray(eachfn, arr, iteratee, callback) {
    var truthValues = new Array(arr.length);
    eachfn(arr, function (x, index, callback) {
        iteratee(x, function (err, v) {
            truthValues[index] = !!v;
            callback(err);
        });
    }, function (err) {
        if (err) return callback(err);
        var results = [];
        for (var i = 0; i < arr.length; i++) {
            if (truthValues[i]) results.push(arr[i]);
        }
        callback(null, results);
    });
}

function filterGeneric(eachfn, coll, iteratee, callback) {
    var results = [];
    eachfn(coll, function (x, index, callback) {
        iteratee(x, function (err, v) {
            if (err) {
                callback(err);
            } else {
                if (v) {
                    results.push({ index: index, value: x });
                }
                callback();
            }
        });
    }, function (err) {
        if (err) {
            callback(err);
        } else {
            callback(null, arrayMap(results.sort(function (a, b) {
                return a.index - b.index;
            }), baseProperty('value')));
        }
    });
}

function _filter(eachfn, coll, iteratee, callback) {
    var filter = isArrayLike(coll) ? filterArray : filterGeneric;
    filter(eachfn, coll, iteratee, callback || noop);
}

/**
 * Returns a new array of all the values in `coll` which pass an async truth
 * test. This operation is performed in parallel, but the results array will be
 * in the same order as the original.
 *
 * @name filter
 * @static
 * @memberOf module:Collections
 * @method
 * @alias select
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results).
 * @example
 *
 * async.filter(['file1','file2','file3'], function(filePath, callback) {
 *     fs.access(filePath, function(err) {
 *         callback(null, !err)
 *     });
 * }, function(err, results) {
 *     // results now equals an array of the existing files
 * });
 */
var filter = doParallel(_filter);

/**
 * The same as [`filter`]{@link module:Collections.filter} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name filterLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.filter]{@link module:Collections.filter}
 * @alias selectLimit
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results).
 */
var filterLimit = doParallelLimit(_filter);

/**
 * The same as [`filter`]{@link module:Collections.filter} but runs only a single async operation at a time.
 *
 * @name filterSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.filter]{@link module:Collections.filter}
 * @alias selectSeries
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results)
 */
var filterSeries = doLimit(filterLimit, 1);

/**
 * Calls the asynchronous function `fn` with a callback parameter that allows it
 * to call itself again, in series, indefinitely.

 * If an error is passed to the
 * callback then `errback` is called with the error, and execution stops,
 * otherwise it will never be called.
 *
 * @name forever
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Function} fn - a function to call repeatedly. Invoked with (next).
 * @param {Function} [errback] - when `fn` passes an error to it's callback,
 * this function will be called, and execution stops. Invoked with (err).
 * @example
 *
 * async.forever(
 *     function(next) {
 *         // next is suitable for passing to things that need a callback(err [, whatever]);
 *         // it will result in this function being called again.
 *     },
 *     function(err) {
 *         // if next is called with a value in its first parameter, it will appear
 *         // in here as 'err', and execution will stop.
 *     }
 * );
 */
function forever(fn, errback) {
    var done = onlyOnce(errback || noop);
    var task = ensureAsync(fn);

    function next(err) {
        if (err) return done(err);
        task(next);
    }
    next();
}

/**
 * Logs the result of an `async` function to the `console`. Only works in
 * Node.js or in browsers that support `console.log` and `console.error` (such
 * as FF and Chrome). If multiple arguments are returned from the async
 * function, `console.log` is called on each argument in order.
 *
 * @name log
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {Function} function - The function you want to eventually apply all
 * arguments to.
 * @param {...*} arguments... - Any number of arguments to apply to the function.
 * @example
 *
 * // in a module
 * var hello = function(name, callback) {
 *     setTimeout(function() {
 *         callback(null, 'hello ' + name);
 *     }, 1000);
 * };
 *
 * // in the node repl
 * node> async.log(hello, 'world');
 * 'hello world'
 */
var log = consoleFunc('log');

/**
 * The same as [`mapValues`]{@link module:Collections.mapValues} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name mapValuesLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.mapValues]{@link module:Collections.mapValues}
 * @category Collection
 * @param {Object} obj - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A function to apply to each value in `obj`.
 * The iteratee is passed a `callback(err, transformed)` which must be called
 * once it has completed with an error (which can be `null`) and a
 * transformed value. Invoked with (value, key, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. `result` is a new object consisting
 * of each key from `obj`, with each transformed value on the right-hand side.
 * Invoked with (err, result).
 */
function mapValuesLimit(obj, limit, iteratee, callback) {
    callback = once(callback || noop);
    var newObj = {};
    eachOfLimit(obj, limit, function (val, key, next) {
        iteratee(val, key, function (err, result) {
            if (err) return next(err);
            newObj[key] = result;
            next();
        });
    }, function (err) {
        callback(err, newObj);
    });
}

/**
 * A relative of [`map`]{@link module:Collections.map}, designed for use with objects.
 *
 * Produces a new Object by mapping each value of `obj` through the `iteratee`
 * function. The `iteratee` is called each `value` and `key` from `obj` and a
 * callback for when it has finished processing. Each of these callbacks takes
 * two arguments: an `error`, and the transformed item from `obj`. If `iteratee`
 * passes an error to its callback, the main `callback` (for the `mapValues`
 * function) is immediately called with the error.
 *
 * Note, the order of the keys in the result is not guaranteed.  The keys will
 * be roughly in the order they complete, (but this is very engine-specific)
 *
 * @name mapValues
 * @static
 * @memberOf module:Collections
 * @method
 * @category Collection
 * @param {Object} obj - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each value and key in
 * `coll`. The iteratee is passed a `callback(err, transformed)` which must be
 * called once it has completed with an error (which can be `null`) and a
 * transformed value. Invoked with (value, key, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. `result` is a new object consisting
 * of each key from `obj`, with each transformed value on the right-hand side.
 * Invoked with (err, result).
 * @example
 *
 * async.mapValues({
 *     f1: 'file1',
 *     f2: 'file2',
 *     f3: 'file3'
 * }, function (file, key, callback) {
 *   fs.stat(file, callback);
 * }, function(err, result) {
 *     // result is now a map of stats for each file, e.g.
 *     // {
 *     //     f1: [stats for file1],
 *     //     f2: [stats for file2],
 *     //     f3: [stats for file3]
 *     // }
 * });
 */

var mapValues = doLimit(mapValuesLimit, Infinity);

/**
 * The same as [`mapValues`]{@link module:Collections.mapValues} but runs only a single async operation at a time.
 *
 * @name mapValuesSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.mapValues]{@link module:Collections.mapValues}
 * @category Collection
 * @param {Object} obj - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each value in `obj`.
 * The iteratee is passed a `callback(err, transformed)` which must be called
 * once it has completed with an error (which can be `null`) and a
 * transformed value. Invoked with (value, key, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. `result` is a new object consisting
 * of each key from `obj`, with each transformed value on the right-hand side.
 * Invoked with (err, result).
 */
var mapValuesSeries = doLimit(mapValuesLimit, 1);

function has(obj, key) {
    return key in obj;
}

/**
 * Caches the results of an `async` function. When creating a hash to store
 * function results against, the callback is omitted from the hash and an
 * optional hash function can be used.
 *
 * If no hash function is specified, the first argument is used as a hash key,
 * which may work reasonably if it is a string or a data type that converts to a
 * distinct string. Note that objects and arrays will not behave reasonably.
 * Neither will cases where the other arguments are significant. In such cases,
 * specify your own hash function.
 *
 * The cache of results is exposed as the `memo` property of the function
 * returned by `memoize`.
 *
 * @name memoize
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {Function} fn - The function to proxy and cache results from.
 * @param {Function} hasher - An optional function for generating a custom hash
 * for storing results. It has all the arguments applied to it apart from the
 * callback, and must be synchronous.
 * @returns {Function} a memoized version of `fn`
 * @example
 *
 * var slow_fn = function(name, callback) {
 *     // do something
 *     callback(null, result);
 * };
 * var fn = async.memoize(slow_fn);
 *
 * // fn can now be used as if it were slow_fn
 * fn('some name', function() {
 *     // callback
 * });
 */
function memoize(fn, hasher) {
    var memo = Object.create(null);
    var queues = Object.create(null);
    hasher = hasher || identity;
    var memoized = initialParams(function memoized(args, callback) {
        var key = hasher.apply(null, args);
        if (has(memo, key)) {
            setImmediate$1(function () {
                callback.apply(null, memo[key]);
            });
        } else if (has(queues, key)) {
            queues[key].push(callback);
        } else {
            queues[key] = [callback];
            fn.apply(null, args.concat(rest(function (args) {
                memo[key] = args;
                var q = queues[key];
                delete queues[key];
                for (var i = 0, l = q.length; i < l; i++) {
                    q[i].apply(null, args);
                }
            })));
        }
    });
    memoized.memo = memo;
    memoized.unmemoized = fn;
    return memoized;
}

/**
 * Calls `callback` on a later loop around the event loop. In Node.js this just
 * calls `setImmediate`.  In the browser it will use `setImmediate` if
 * available, otherwise `setTimeout(callback, 0)`, which means other higher
 * priority events may precede the execution of `callback`.
 *
 * This is used internally for browser-compatibility purposes.
 *
 * @name nextTick
 * @static
 * @memberOf module:Utils
 * @method
 * @alias setImmediate
 * @category Util
 * @param {Function} callback - The function to call on a later loop around
 * the event loop. Invoked with (args...).
 * @param {...*} args... - any number of additional arguments to pass to the
 * callback on the next tick.
 * @example
 *
 * var call_order = [];
 * async.nextTick(function() {
 *     call_order.push('two');
 *     // call_order now equals ['one','two']
 * });
 * call_order.push('one');
 *
 * async.setImmediate(function (a, b, c) {
 *     // a, b, and c equal 1, 2, and 3
 * }, 1, 2, 3);
 */
var _defer$1;

if (hasNextTick) {
    _defer$1 = process.nextTick;
} else if (hasSetImmediate) {
    _defer$1 = setImmediate;
} else {
    _defer$1 = fallback;
}

var nextTick = wrap(_defer$1);

function _parallel(eachfn, tasks, callback) {
    callback = callback || noop;
    var results = isArrayLike(tasks) ? [] : {};

    eachfn(tasks, function (task, key, callback) {
        task(rest(function (err, args) {
            if (args.length <= 1) {
                args = args[0];
            }
            results[key] = args;
            callback(err);
        }));
    }, function (err) {
        callback(err, results);
    });
}

/**
 * Run the `tasks` collection of functions in parallel, without waiting until
 * the previous function has completed. If any of the functions pass an error to
 * its callback, the main `callback` is immediately called with the value of the
 * error. Once the `tasks` have completed, the results are passed to the final
 * `callback` as an array.
 *
 * **Note:** `parallel` is about kicking-off I/O tasks in parallel, not about
 * parallel execution of code.  If your tasks do not use any timers or perform
 * any I/O, they will actually be executed in series.  Any synchronous setup
 * sections for each task will happen one after the other.  JavaScript remains
 * single-threaded.
 *
 * It is also possible to use an object instead of an array. Each property will
 * be run as a function and the results will be passed to the final `callback`
 * as an object instead of an array. This can be a more readable way of handling
 * results from {@link async.parallel}.
 *
 * @name parallel
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Array|Iterable|Object} tasks - A collection containing functions to run.
 * Each function is passed a `callback(err, result)` which it must call on
 * completion with an error `err` (which can be `null`) and an optional `result`
 * value.
 * @param {Function} [callback] - An optional callback to run once all the
 * functions have completed successfully. This function gets a results array
 * (or object) containing all the result arguments passed to the task callbacks.
 * Invoked with (err, results).
 * @example
 * async.parallel([
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'one');
 *         }, 200);
 *     },
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'two');
 *         }, 100);
 *     }
 * ],
 * // optional callback
 * function(err, results) {
 *     // the results array will equal ['one','two'] even though
 *     // the second function had a shorter timeout.
 * });
 *
 * // an example using an object instead of an array
 * async.parallel({
 *     one: function(callback) {
 *         setTimeout(function() {
 *             callback(null, 1);
 *         }, 200);
 *     },
 *     two: function(callback) {
 *         setTimeout(function() {
 *             callback(null, 2);
 *         }, 100);
 *     }
 * }, function(err, results) {
 *     // results is now equals to: {one: 1, two: 2}
 * });
 */
function parallelLimit(tasks, callback) {
  _parallel(eachOf, tasks, callback);
}

/**
 * The same as [`parallel`]{@link module:ControlFlow.parallel} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name parallelLimit
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.parallel]{@link module:ControlFlow.parallel}
 * @category Control Flow
 * @param {Array|Collection} tasks - A collection containing functions to run.
 * Each function is passed a `callback(err, result)` which it must call on
 * completion with an error `err` (which can be `null`) and an optional `result`
 * value.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} [callback] - An optional callback to run once all the
 * functions have completed successfully. This function gets a results array
 * (or object) containing all the result arguments passed to the task callbacks.
 * Invoked with (err, results).
 */
function parallelLimit$1(tasks, limit, callback) {
  _parallel(_eachOfLimit(limit), tasks, callback);
}

/**
 * A queue of tasks for the worker function to complete.
 * @typedef {Object} QueueObject
 * @memberOf module:ControlFlow
 * @property {Function} length - a function returning the number of items
 * waiting to be processed. Invoke with `queue.length()`.
 * @property {boolean} started - a boolean indicating whether or not any
 * items have been pushed and processed by the queue.
 * @property {Function} running - a function returning the number of items
 * currently being processed. Invoke with `queue.running()`.
 * @property {Function} workersList - a function returning the array of items
 * currently being processed. Invoke with `queue.workersList()`.
 * @property {Function} idle - a function returning false if there are items
 * waiting or being processed, or true if not. Invoke with `queue.idle()`.
 * @property {number} concurrency - an integer for determining how many `worker`
 * functions should be run in parallel. This property can be changed after a
 * `queue` is created to alter the concurrency on-the-fly.
 * @property {Function} push - add a new task to the `queue`. Calls `callback`
 * once the `worker` has finished processing the task. Instead of a single task,
 * a `tasks` array can be submitted. The respective callback is used for every
 * task in the list. Invoke with `queue.push(task, [callback])`,
 * @property {Function} unshift - add a new task to the front of the `queue`.
 * Invoke with `queue.unshift(task, [callback])`.
 * @property {Function} saturated - a callback that is called when the number of
 * running workers hits the `concurrency` limit, and further tasks will be
 * queued.
 * @property {Function} unsaturated - a callback that is called when the number
 * of running workers is less than the `concurrency` & `buffer` limits, and
 * further tasks will not be queued.
 * @property {number} buffer - A minimum threshold buffer in order to say that
 * the `queue` is `unsaturated`.
 * @property {Function} empty - a callback that is called when the last item
 * from the `queue` is given to a `worker`.
 * @property {Function} drain - a callback that is called when the last item
 * from the `queue` has returned from the `worker`.
 * @property {Function} error - a callback that is called when a task errors.
 * Has the signature `function(error, task)`.
 * @property {boolean} paused - a boolean for determining whether the queue is
 * in a paused state.
 * @property {Function} pause - a function that pauses the processing of tasks
 * until `resume()` is called. Invoke with `queue.pause()`.
 * @property {Function} resume - a function that resumes the processing of
 * queued tasks when the queue is paused. Invoke with `queue.resume()`.
 * @property {Function} kill - a function that removes the `drain` callback and
 * empties remaining tasks from the queue forcing it to go idle. Invoke with `queue.kill()`.
 */

/**
 * Creates a `queue` object with the specified `concurrency`. Tasks added to the
 * `queue` are processed in parallel (up to the `concurrency` limit). If all
 * `worker`s are in progress, the task is queued until one becomes available.
 * Once a `worker` completes a `task`, that `task`'s callback is called.
 *
 * @name queue
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Function} worker - An asynchronous function for processing a queued
 * task, which must call its `callback(err)` argument when finished, with an
 * optional `error` as an argument.  If you want to handle errors from an
 * individual task, pass a callback to `q.push()`. Invoked with
 * (task, callback).
 * @param {number} [concurrency=1] - An `integer` for determining how many
 * `worker` functions should be run in parallel.  If omitted, the concurrency
 * defaults to `1`.  If the concurrency is `0`, an error is thrown.
 * @returns {module:ControlFlow.QueueObject} A queue object to manage the tasks. Callbacks can
 * attached as certain properties to listen for specific events during the
 * lifecycle of the queue.
 * @example
 *
 * // create a queue object with concurrency 2
 * var q = async.queue(function(task, callback) {
 *     console.log('hello ' + task.name);
 *     callback();
 * }, 2);
 *
 * // assign a callback
 * q.drain = function() {
 *     console.log('all items have been processed');
 * };
 *
 * // add some items to the queue
 * q.push({name: 'foo'}, function(err) {
 *     console.log('finished processing foo');
 * });
 * q.push({name: 'bar'}, function (err) {
 *     console.log('finished processing bar');
 * });
 *
 * // add some items to the queue (batch-wise)
 * q.push([{name: 'baz'},{name: 'bay'},{name: 'bax'}], function(err) {
 *     console.log('finished processing item');
 * });
 *
 * // add some items to the front of the queue
 * q.unshift({name: 'bar'}, function (err) {
 *     console.log('finished processing bar');
 * });
 */
var queue$1 = function (worker, concurrency) {
  return queue(function (items, cb) {
    worker(items[0], cb);
  }, concurrency, 1);
};

/**
 * The same as [async.queue]{@link module:ControlFlow.queue} only tasks are assigned a priority and
 * completed in ascending priority order.
 *
 * @name priorityQueue
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.queue]{@link module:ControlFlow.queue}
 * @category Control Flow
 * @param {Function} worker - An asynchronous function for processing a queued
 * task, which must call its `callback(err)` argument when finished, with an
 * optional `error` as an argument.  If you want to handle errors from an
 * individual task, pass a callback to `q.push()`. Invoked with
 * (task, callback).
 * @param {number} concurrency - An `integer` for determining how many `worker`
 * functions should be run in parallel.  If omitted, the concurrency defaults to
 * `1`.  If the concurrency is `0`, an error is thrown.
 * @returns {module:ControlFlow.QueueObject} A priorityQueue object to manage the tasks. There are two
 * differences between `queue` and `priorityQueue` objects:
 * * `push(task, priority, [callback])` - `priority` should be a number. If an
 *   array of `tasks` is given, all tasks will be assigned the same priority.
 * * The `unshift` method was removed.
 */
var priorityQueue = function (worker, concurrency) {
    // Start with a normal queue
    var q = queue$1(worker, concurrency);

    // Override push to accept second parameter representing priority
    q.push = function (data, priority, callback) {
        if (callback == null) callback = noop;
        if (typeof callback !== 'function') {
            throw new Error('task callback must be a function');
        }
        q.started = true;
        if (!isArray(data)) {
            data = [data];
        }
        if (data.length === 0) {
            // call drain immediately if there are no tasks
            return setImmediate$1(function () {
                q.drain();
            });
        }

        priority = priority || 0;
        var nextNode = q._tasks.head;
        while (nextNode && priority >= nextNode.priority) {
            nextNode = nextNode.next;
        }

        for (var i = 0, l = data.length; i < l; i++) {
            var item = {
                data: data[i],
                priority: priority,
                callback: callback
            };

            if (nextNode) {
                q._tasks.insertBefore(nextNode, item);
            } else {
                q._tasks.push(item);
            }
        }
        setImmediate$1(q.process);
    };

    // Remove unshift function
    delete q.unshift;

    return q;
};

/**
 * Runs the `tasks` array of functions in parallel, without waiting until the
 * previous function has completed. Once any of the `tasks` complete or pass an
 * error to its callback, the main `callback` is immediately called. It's
 * equivalent to `Promise.race()`.
 *
 * @name race
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Array} tasks - An array containing functions to run. Each function
 * is passed a `callback(err, result)` which it must call on completion with an
 * error `err` (which can be `null`) and an optional `result` value.
 * @param {Function} callback - A callback to run once any of the functions have
 * completed. This function gets an error or result from the first function that
 * completed. Invoked with (err, result).
 * @returns undefined
 * @example
 *
 * async.race([
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'one');
 *         }, 200);
 *     },
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'two');
 *         }, 100);
 *     }
 * ],
 * // main callback
 * function(err, result) {
 *     // the result will be equal to 'two' as it finishes earlier
 * });
 */
function race(tasks, callback) {
    callback = once(callback || noop);
    if (!isArray(tasks)) return callback(new TypeError('First argument to race must be an array of functions'));
    if (!tasks.length) return callback();
    for (var i = 0, l = tasks.length; i < l; i++) {
        tasks[i](callback);
    }
}

var slice = Array.prototype.slice;

/**
 * Same as [`reduce`]{@link module:Collections.reduce}, only operates on `array` in reverse order.
 *
 * @name reduceRight
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.reduce]{@link module:Collections.reduce}
 * @alias foldr
 * @category Collection
 * @param {Array} array - A collection to iterate over.
 * @param {*} memo - The initial state of the reduction.
 * @param {Function} iteratee - A function applied to each item in the
 * array to produce the next step in the reduction. The `iteratee` is passed a
 * `callback(err, reduction)` which accepts an optional error as its first
 * argument, and the state of the reduction as the second. If an error is
 * passed to the callback, the reduction is stopped and the main `callback` is
 * immediately called with the error. Invoked with (memo, item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result is the reduced value. Invoked with
 * (err, result).
 */
function reduceRight(array, memo, iteratee, callback) {
  var reversed = slice.call(array).reverse();
  reduce(reversed, memo, iteratee, callback);
}

/**
 * Wraps the function in another function that always returns data even when it
 * errors.
 *
 * The object returned has either the property `error` or `value`.
 *
 * @name reflect
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {Function} fn - The function you want to wrap
 * @returns {Function} - A function that always passes null to it's callback as
 * the error. The second argument to the callback will be an `object` with
 * either an `error` or a `value` property.
 * @example
 *
 * async.parallel([
 *     async.reflect(function(callback) {
 *         // do some stuff ...
 *         callback(null, 'one');
 *     }),
 *     async.reflect(function(callback) {
 *         // do some more stuff but error ...
 *         callback('bad stuff happened');
 *     }),
 *     async.reflect(function(callback) {
 *         // do some more stuff ...
 *         callback(null, 'two');
 *     })
 * ],
 * // optional callback
 * function(err, results) {
 *     // values
 *     // results[0].value = 'one'
 *     // results[1].error = 'bad stuff happened'
 *     // results[2].value = 'two'
 * });
 */
function reflect(fn) {
    return initialParams(function reflectOn(args, reflectCallback) {
        args.push(rest(function callback(err, cbArgs) {
            if (err) {
                reflectCallback(null, {
                    error: err
                });
            } else {
                var value = null;
                if (cbArgs.length === 1) {
                    value = cbArgs[0];
                } else if (cbArgs.length > 1) {
                    value = cbArgs;
                }
                reflectCallback(null, {
                    value: value
                });
            }
        }));

        return fn.apply(this, args);
    });
}

function reject$1(eachfn, arr, iteratee, callback) {
    _filter(eachfn, arr, function (value, cb) {
        iteratee(value, function (err, v) {
            cb(err, !v);
        });
    }, callback);
}

/**
 * The opposite of [`filter`]{@link module:Collections.filter}. Removes values that pass an `async` truth test.
 *
 * @name reject
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.filter]{@link module:Collections.filter}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results).
 * @example
 *
 * async.reject(['file1','file2','file3'], function(filePath, callback) {
 *     fs.access(filePath, function(err) {
 *         callback(null, !err)
 *     });
 * }, function(err, results) {
 *     // results now equals an array of missing files
 *     createFiles(results);
 * });
 */
var reject = doParallel(reject$1);

/**
 * A helper function that wraps an array or an object of functions with reflect.
 *
 * @name reflectAll
 * @static
 * @memberOf module:Utils
 * @method
 * @see [async.reflect]{@link module:Utils.reflect}
 * @category Util
 * @param {Array} tasks - The array of functions to wrap in `async.reflect`.
 * @returns {Array} Returns an array of functions, each function wrapped in
 * `async.reflect`
 * @example
 *
 * let tasks = [
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'one');
 *         }, 200);
 *     },
 *     function(callback) {
 *         // do some more stuff but error ...
 *         callback(new Error('bad stuff happened'));
 *     },
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'two');
 *         }, 100);
 *     }
 * ];
 *
 * async.parallel(async.reflectAll(tasks),
 * // optional callback
 * function(err, results) {
 *     // values
 *     // results[0].value = 'one'
 *     // results[1].error = Error('bad stuff happened')
 *     // results[2].value = 'two'
 * });
 *
 * // an example using an object instead of an array
 * let tasks = {
 *     one: function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'one');
 *         }, 200);
 *     },
 *     two: function(callback) {
 *         callback('two');
 *     },
 *     three: function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'three');
 *         }, 100);
 *     }
 * };
 *
 * async.parallel(async.reflectAll(tasks),
 * // optional callback
 * function(err, results) {
 *     // values
 *     // results.one.value = 'one'
 *     // results.two.error = 'two'
 *     // results.three.value = 'three'
 * });
 */
function reflectAll(tasks) {
    var results;
    if (isArray(tasks)) {
        results = arrayMap(tasks, reflect);
    } else {
        results = {};
        baseForOwn(tasks, function (task, key) {
            results[key] = reflect.call(this, task);
        });
    }
    return results;
}

/**
 * The same as [`reject`]{@link module:Collections.reject} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name rejectLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.reject]{@link module:Collections.reject}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results).
 */
var rejectLimit = doParallelLimit(reject$1);

/**
 * The same as [`reject`]{@link module:Collections.reject} but runs only a single async operation at a time.
 *
 * @name rejectSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.reject]{@link module:Collections.reject}
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results).
 */
var rejectSeries = doLimit(rejectLimit, 1);

/**
 * Creates a function that returns `value`.
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Util
 * @param {*} value The value to return from the new function.
 * @returns {Function} Returns the new constant function.
 * @example
 *
 * var objects = _.times(2, _.constant({ 'a': 1 }));
 *
 * console.log(objects);
 * // => [{ 'a': 1 }, { 'a': 1 }]
 *
 * console.log(objects[0] === objects[1]);
 * // => true
 */
function constant$1(value) {
  return function() {
    return value;
  };
}

/**
 * Attempts to get a successful response from `task` no more than `times` times
 * before returning an error. If the task is successful, the `callback` will be
 * passed the result of the successful task. If all attempts fail, the callback
 * will be passed the error and result (if any) of the final attempt.
 *
 * @name retry
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Object|number} [opts = {times: 5, interval: 0}| 5] - Can be either an
 * object with `times` and `interval` or a number.
 * * `times` - The number of attempts to make before giving up.  The default
 *   is `5`.
 * * `interval` - The time to wait between retries, in milliseconds.  The
 *   default is `0`. The interval may also be specified as a function of the
 *   retry count (see example).
 * * `errorFilter` - An optional synchronous function that is invoked on
 *   erroneous result. If it returns `true` the retry attempts will continue;
 *   if the function returns `false` the retry flow is aborted with the current
 *   attempt's error and result being returned to the final callback.
 *   Invoked with (err).
 * * If `opts` is a number, the number specifies the number of times to retry,
 *   with the default interval of `0`.
 * @param {Function} task - A function which receives two arguments: (1) a
 * `callback(err, result)` which must be called when finished, passing `err`
 * (which can be `null`) and the `result` of the function's execution, and (2)
 * a `results` object, containing the results of the previously executed
 * functions (if nested inside another control flow). Invoked with
 * (callback, results).
 * @param {Function} [callback] - An optional callback which is called when the
 * task has succeeded, or after the final failed attempt. It receives the `err`
 * and `result` arguments of the last attempt at completing the `task`. Invoked
 * with (err, results).
 * @example
 *
 * // The `retry` function can be used as a stand-alone control flow by passing
 * // a callback, as shown below:
 *
 * // try calling apiMethod 3 times
 * async.retry(3, apiMethod, function(err, result) {
 *     // do something with the result
 * });
 *
 * // try calling apiMethod 3 times, waiting 200 ms between each retry
 * async.retry({times: 3, interval: 200}, apiMethod, function(err, result) {
 *     // do something with the result
 * });
 *
 * // try calling apiMethod 10 times with exponential backoff
 * // (i.e. intervals of 100, 200, 400, 800, 1600, ... milliseconds)
 * async.retry({
 *   times: 10,
 *   interval: function(retryCount) {
 *     return 50 * Math.pow(2, retryCount);
 *   }
 * }, apiMethod, function(err, result) {
 *     // do something with the result
 * });
 *
 * // try calling apiMethod the default 5 times no delay between each retry
 * async.retry(apiMethod, function(err, result) {
 *     // do something with the result
 * });
 *
 * // try calling apiMethod only when error condition satisfies, all other
 * // errors will abort the retry control flow and return to final callback
 * async.retry({
 *   errorFilter: function(err) {
 *     return err.message === 'Temporary error'; // only retry on a specific error
 *   }
 * }, apiMethod, function(err, result) {
 *     // do something with the result
 * });
 *
 * // It can also be embedded within other control flow functions to retry
 * // individual methods that are not as reliable, like this:
 * async.auto({
 *     users: api.getUsers.bind(api),
 *     payments: async.retry(3, api.getPayments.bind(api))
 * }, function(err, results) {
 *     // do something with the results
 * });
 *
 */
function retry(opts, task, callback) {
    var DEFAULT_TIMES = 5;
    var DEFAULT_INTERVAL = 0;

    var options = {
        times: DEFAULT_TIMES,
        intervalFunc: constant$1(DEFAULT_INTERVAL)
    };

    function parseTimes(acc, t) {
        if (typeof t === 'object') {
            acc.times = +t.times || DEFAULT_TIMES;

            acc.intervalFunc = typeof t.interval === 'function' ? t.interval : constant$1(+t.interval || DEFAULT_INTERVAL);

            acc.errorFilter = t.errorFilter;
        } else if (typeof t === 'number' || typeof t === 'string') {
            acc.times = +t || DEFAULT_TIMES;
        } else {
            throw new Error("Invalid arguments for async.retry");
        }
    }

    if (arguments.length < 3 && typeof opts === 'function') {
        callback = task || noop;
        task = opts;
    } else {
        parseTimes(options, opts);
        callback = callback || noop;
    }

    if (typeof task !== 'function') {
        throw new Error("Invalid arguments for async.retry");
    }

    var attempt = 1;
    function retryAttempt() {
        task(function (err) {
            if (err && attempt++ < options.times && (typeof options.errorFilter != 'function' || options.errorFilter(err))) {
                setTimeout(retryAttempt, options.intervalFunc(attempt));
            } else {
                callback.apply(null, arguments);
            }
        });
    }

    retryAttempt();
}

/**
 * A close relative of [`retry`]{@link module:ControlFlow.retry}.  This method wraps a task and makes it
 * retryable, rather than immediately calling it with retries.
 *
 * @name retryable
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.retry]{@link module:ControlFlow.retry}
 * @category Control Flow
 * @param {Object|number} [opts = {times: 5, interval: 0}| 5] - optional
 * options, exactly the same as from `retry`
 * @param {Function} task - the asynchronous function to wrap
 * @returns {Functions} The wrapped function, which when invoked, will retry on
 * an error, based on the parameters specified in `opts`.
 * @example
 *
 * async.auto({
 *     dep1: async.retryable(3, getFromFlakyService),
 *     process: ["dep1", async.retryable(3, function (results, cb) {
 *         maybeProcessData(results.dep1, cb);
 *     })]
 * }, callback);
 */
var retryable = function (opts, task) {
    if (!task) {
        task = opts;
        opts = null;
    }
    return initialParams(function (args, callback) {
        function taskFn(cb) {
            task.apply(null, args.concat(cb));
        }

        if (opts) retry(opts, taskFn, callback);else retry(taskFn, callback);
    });
};

/**
 * Run the functions in the `tasks` collection in series, each one running once
 * the previous function has completed. If any functions in the series pass an
 * error to its callback, no more functions are run, and `callback` is
 * immediately called with the value of the error. Otherwise, `callback`
 * receives an array of results when `tasks` have completed.
 *
 * It is also possible to use an object instead of an array. Each property will
 * be run as a function, and the results will be passed to the final `callback`
 * as an object instead of an array. This can be a more readable way of handling
 *  results from {@link async.series}.
 *
 * **Note** that while many implementations preserve the order of object
 * properties, the [ECMAScript Language Specification](http://www.ecma-international.org/ecma-262/5.1/#sec-8.6)
 * explicitly states that
 *
 * > The mechanics and order of enumerating the properties is not specified.
 *
 * So if you rely on the order in which your series of functions are executed,
 * and want this to work on all platforms, consider using an array.
 *
 * @name series
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Array|Iterable|Object} tasks - A collection containing functions to run, each
 * function is passed a `callback(err, result)` it must call on completion with
 * an error `err` (which can be `null`) and an optional `result` value.
 * @param {Function} [callback] - An optional callback to run once all the
 * functions have completed. This function gets a results array (or object)
 * containing all the result arguments passed to the `task` callbacks. Invoked
 * with (err, result).
 * @example
 * async.series([
 *     function(callback) {
 *         // do some stuff ...
 *         callback(null, 'one');
 *     },
 *     function(callback) {
 *         // do some more stuff ...
 *         callback(null, 'two');
 *     }
 * ],
 * // optional callback
 * function(err, results) {
 *     // results is now equal to ['one', 'two']
 * });
 *
 * async.series({
 *     one: function(callback) {
 *         setTimeout(function() {
 *             callback(null, 1);
 *         }, 200);
 *     },
 *     two: function(callback){
 *         setTimeout(function() {
 *             callback(null, 2);
 *         }, 100);
 *     }
 * }, function(err, results) {
 *     // results is now equal to: {one: 1, two: 2}
 * });
 */
function series(tasks, callback) {
  _parallel(eachOfSeries, tasks, callback);
}

/**
 * Returns `true` if at least one element in the `coll` satisfies an async test.
 * If any iteratee call returns `true`, the main `callback` is immediately
 * called.
 *
 * @name some
 * @static
 * @memberOf module:Collections
 * @method
 * @alias any
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in the array
 * in parallel. The iteratee is passed a `callback(err, truthValue)` which must
 * be called with a boolean argument once it has completed. Invoked with
 * (item, callback).
 * @param {Function} [callback] - A callback which is called as soon as any
 * iteratee returns `true`, or after all the iteratee functions have finished.
 * Result will be either `true` or `false` depending on the values of the async
 * tests. Invoked with (err, result).
 * @example
 *
 * async.some(['file1','file2','file3'], function(filePath, callback) {
 *     fs.access(filePath, function(err) {
 *         callback(null, !err)
 *     });
 * }, function(err, result) {
 *     // if result is true then at least one of the files exists
 * });
 */
var some = doParallel(_createTester(Boolean, identity));

/**
 * The same as [`some`]{@link module:Collections.some} but runs a maximum of `limit` async operations at a time.
 *
 * @name someLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.some]{@link module:Collections.some}
 * @alias anyLimit
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A truth test to apply to each item in the array
 * in parallel. The iteratee is passed a `callback(err, truthValue)` which must
 * be called with a boolean argument once it has completed. Invoked with
 * (item, callback).
 * @param {Function} [callback] - A callback which is called as soon as any
 * iteratee returns `true`, or after all the iteratee functions have finished.
 * Result will be either `true` or `false` depending on the values of the async
 * tests. Invoked with (err, result).
 */
var someLimit = doParallelLimit(_createTester(Boolean, identity));

/**
 * The same as [`some`]{@link module:Collections.some} but runs only a single async operation at a time.
 *
 * @name someSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.some]{@link module:Collections.some}
 * @alias anySeries
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in the array
 * in parallel. The iteratee is passed a `callback(err, truthValue)` which must
 * be called with a boolean argument once it has completed. Invoked with
 * (item, callback).
 * @param {Function} [callback] - A callback which is called as soon as any
 * iteratee returns `true`, or after all the iteratee functions have finished.
 * Result will be either `true` or `false` depending on the values of the async
 * tests. Invoked with (err, result).
 */
var someSeries = doLimit(someLimit, 1);

/**
 * Sorts a list by the results of running each `coll` value through an async
 * `iteratee`.
 *
 * @name sortBy
 * @static
 * @memberOf module:Collections
 * @method
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each item in `coll`.
 * The iteratee is passed a `callback(err, sortValue)` which must be called once
 * it has completed with an error (which can be `null`) and a value to use as
 * the sort criteria. Invoked with (item, callback).
 * @param {Function} callback - A callback which is called after all the
 * `iteratee` functions have finished, or an error occurs. Results is the items
 * from the original `coll` sorted by the values returned by the `iteratee`
 * calls. Invoked with (err, results).
 * @example
 *
 * async.sortBy(['file1','file2','file3'], function(file, callback) {
 *     fs.stat(file, function(err, stats) {
 *         callback(err, stats.mtime);
 *     });
 * }, function(err, results) {
 *     // results is now the original array of files sorted by
 *     // modified date
 * });
 *
 * // By modifying the callback parameter the
 * // sorting order can be influenced:
 *
 * // ascending order
 * async.sortBy([1,9,3,5], function(x, callback) {
 *     callback(null, x);
 * }, function(err,result) {
 *     // result callback
 * });
 *
 * // descending order
 * async.sortBy([1,9,3,5], function(x, callback) {
 *     callback(null, x*-1);    //<- x*-1 instead of x, turns the order around
 * }, function(err,result) {
 *     // result callback
 * });
 */
function sortBy(coll, iteratee, callback) {
    map(coll, function (x, callback) {
        iteratee(x, function (err, criteria) {
            if (err) return callback(err);
            callback(null, { value: x, criteria: criteria });
        });
    }, function (err, results) {
        if (err) return callback(err);
        callback(null, arrayMap(results.sort(comparator), baseProperty('value')));
    });

    function comparator(left, right) {
        var a = left.criteria,
            b = right.criteria;
        return a < b ? -1 : a > b ? 1 : 0;
    }
}

/**
 * Sets a time limit on an asynchronous function. If the function does not call
 * its callback within the specified milliseconds, it will be called with a
 * timeout error. The code property for the error object will be `'ETIMEDOUT'`.
 *
 * @name timeout
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {Function} asyncFn - The asynchronous function you want to set the
 * time limit.
 * @param {number} milliseconds - The specified time limit.
 * @param {*} [info] - Any variable you want attached (`string`, `object`, etc)
 * to timeout Error for more information..
 * @returns {Function} Returns a wrapped function that can be used with any of
 * the control flow functions. Invoke this function with the same
 * parameters as you would `asyncFunc`.
 * @example
 *
 * function myFunction(foo, callback) {
 *     doAsyncTask(foo, function(err, data) {
 *         // handle errors
 *         if (err) return callback(err);
 *
 *         // do some stuff ...
 *
 *         // return processed data
 *         return callback(null, data);
 *     });
 * }
 *
 * var wrapped = async.timeout(myFunction, 1000);
 *
 * // call `wrapped` as you would `myFunction`
 * wrapped({ bar: 'bar' }, function(err, data) {
 *     // if `myFunction` takes < 1000 ms to execute, `err`
 *     // and `data` will have their expected values
 *
 *     // else `err` will be an Error with the code 'ETIMEDOUT'
 * });
 */
function timeout(asyncFn, milliseconds, info) {
    var originalCallback, timer;
    var timedOut = false;

    function injectedCallback() {
        if (!timedOut) {
            originalCallback.apply(null, arguments);
            clearTimeout(timer);
        }
    }

    function timeoutCallback() {
        var name = asyncFn.name || 'anonymous';
        var error = new Error('Callback function "' + name + '" timed out.');
        error.code = 'ETIMEDOUT';
        if (info) {
            error.info = info;
        }
        timedOut = true;
        originalCallback(error);
    }

    return initialParams(function (args, origCallback) {
        originalCallback = origCallback;
        // setup timer and call original function
        timer = setTimeout(timeoutCallback, milliseconds);
        asyncFn.apply(null, args.concat(injectedCallback));
    });
}

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeCeil = Math.ceil;
var nativeMax$1 = Math.max;

/**
 * The base implementation of `_.range` and `_.rangeRight` which doesn't
 * coerce arguments.
 *
 * @private
 * @param {number} start The start of the range.
 * @param {number} end The end of the range.
 * @param {number} step The value to increment or decrement by.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Array} Returns the range of numbers.
 */
function baseRange(start, end, step, fromRight) {
  var index = -1,
      length = nativeMax$1(nativeCeil((end - start) / (step || 1)), 0),
      result = Array(length);

  while (length--) {
    result[fromRight ? length : ++index] = start;
    start += step;
  }
  return result;
}

/**
 * The same as [times]{@link module:ControlFlow.times} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name timesLimit
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.times]{@link module:ControlFlow.times}
 * @category Control Flow
 * @param {number} count - The number of times to run the function.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - The function to call `n` times. Invoked with the
 * iteration index and a callback (n, next).
 * @param {Function} callback - see [async.map]{@link module:Collections.map}.
 */
function timeLimit(count, limit, iteratee, callback) {
  mapLimit(baseRange(0, count, 1), limit, iteratee, callback);
}

/**
 * Calls the `iteratee` function `n` times, and accumulates results in the same
 * manner you would use with [map]{@link module:Collections.map}.
 *
 * @name times
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.map]{@link module:Collections.map}
 * @category Control Flow
 * @param {number} n - The number of times to run the function.
 * @param {Function} iteratee - The function to call `n` times. Invoked with the
 * iteration index and a callback (n, next).
 * @param {Function} callback - see {@link module:Collections.map}.
 * @example
 *
 * // Pretend this is some complicated async factory
 * var createUser = function(id, callback) {
 *     callback(null, {
 *         id: 'user' + id
 *     });
 * };
 *
 * // generate 5 users
 * async.times(5, function(n, next) {
 *     createUser(n, function(err, user) {
 *         next(err, user);
 *     });
 * }, function(err, users) {
 *     // we should now have 5 users
 * });
 */
var times = doLimit(timeLimit, Infinity);

/**
 * The same as [times]{@link module:ControlFlow.times} but runs only a single async operation at a time.
 *
 * @name timesSeries
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.times]{@link module:ControlFlow.times}
 * @category Control Flow
 * @param {number} n - The number of times to run the function.
 * @param {Function} iteratee - The function to call `n` times. Invoked with the
 * iteration index and a callback (n, next).
 * @param {Function} callback - see {@link module:Collections.map}.
 */
var timesSeries = doLimit(timeLimit, 1);

/**
 * A relative of `reduce`.  Takes an Object or Array, and iterates over each
 * element in series, each step potentially mutating an `accumulator` value.
 * The type of the accumulator defaults to the type of collection passed in.
 *
 * @name transform
 * @static
 * @memberOf module:Collections
 * @method
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {*} [accumulator] - The initial state of the transform.  If omitted,
 * it will default to an empty Object or Array, depending on the type of `coll`
 * @param {Function} iteratee - A function applied to each item in the
 * collection that potentially modifies the accumulator. The `iteratee` is
 * passed a `callback(err)` which accepts an optional error as its first
 * argument. If an error is passed to the callback, the transform is stopped
 * and the main `callback` is immediately called with the error.
 * Invoked with (accumulator, item, key, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result is the transformed accumulator.
 * Invoked with (err, result).
 * @example
 *
 * async.transform([1,2,3], function(acc, item, index, callback) {
 *     // pointless async:
 *     process.nextTick(function() {
 *         acc.push(item * 2)
 *         callback(null)
 *     });
 * }, function(err, result) {
 *     // result is now equal to [2, 4, 6]
 * });
 *
 * @example
 *
 * async.transform({a: 1, b: 2, c: 3}, function (obj, val, key, callback) {
 *     setImmediate(function () {
 *         obj[key] = val * 2;
 *         callback();
 *     })
 * }, function (err, result) {
 *     // result is equal to {a: 2, b: 4, c: 6}
 * })
 */
function transform(coll, accumulator, iteratee, callback) {
    if (arguments.length === 3) {
        callback = iteratee;
        iteratee = accumulator;
        accumulator = isArray(coll) ? [] : {};
    }
    callback = once(callback || noop);

    eachOf(coll, function (v, k, cb) {
        iteratee(accumulator, v, k, cb);
    }, function (err) {
        callback(err, accumulator);
    });
}

/**
 * Undoes a [memoize]{@link module:Utils.memoize}d function, reverting it to the original,
 * unmemoized form. Handy for testing.
 *
 * @name unmemoize
 * @static
 * @memberOf module:Utils
 * @method
 * @see [async.memoize]{@link module:Utils.memoize}
 * @category Util
 * @param {Function} fn - the memoized function
 * @returns {Function} a function that calls the original unmemoized function
 */
function unmemoize(fn) {
    return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
    };
}

/**
 * Repeatedly call `iteratee`, while `test` returns `true`. Calls `callback` when
 * stopped, or an error occurs.
 *
 * @name whilst
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Function} test - synchronous truth test to perform before each
 * execution of `iteratee`. Invoked with ().
 * @param {Function} iteratee - A function which is called each time `test` passes.
 * The function is passed a `callback(err)`, which must be called once it has
 * completed with an optional `err` argument. Invoked with (callback).
 * @param {Function} [callback] - A callback which is called after the test
 * function has failed and repeated execution of `iteratee` has stopped. `callback`
 * will be passed an error and any arguments passed to the final `iteratee`'s
 * callback. Invoked with (err, [results]);
 * @returns undefined
 * @example
 *
 * var count = 0;
 * async.whilst(
 *     function() { return count < 5; },
 *     function(callback) {
 *         count++;
 *         setTimeout(function() {
 *             callback(null, count);
 *         }, 1000);
 *     },
 *     function (err, n) {
 *         // 5 seconds have passed, n = 5
 *     }
 * );
 */
function whilst(test, iteratee, callback) {
    callback = onlyOnce(callback || noop);
    if (!test()) return callback(null);
    var next = rest(function (err, args) {
        if (err) return callback(err);
        if (test()) return iteratee(next);
        callback.apply(null, [null].concat(args));
    });
    iteratee(next);
}

/**
 * Repeatedly call `fn` until `test` returns `true`. Calls `callback` when
 * stopped, or an error occurs. `callback` will be passed an error and any
 * arguments passed to the final `fn`'s callback.
 *
 * The inverse of [whilst]{@link module:ControlFlow.whilst}.
 *
 * @name until
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.whilst]{@link module:ControlFlow.whilst}
 * @category Control Flow
 * @param {Function} test - synchronous truth test to perform before each
 * execution of `fn`. Invoked with ().
 * @param {Function} fn - A function which is called each time `test` fails.
 * The function is passed a `callback(err)`, which must be called once it has
 * completed with an optional `err` argument. Invoked with (callback).
 * @param {Function} [callback] - A callback which is called after the test
 * function has passed and repeated execution of `fn` has stopped. `callback`
 * will be passed an error and any arguments passed to the final `fn`'s
 * callback. Invoked with (err, [results]);
 */
function until(test, fn, callback) {
    whilst(function () {
        return !test.apply(this, arguments);
    }, fn, callback);
}

/**
 * Runs the `tasks` array of functions in series, each passing their results to
 * the next in the array. However, if any of the `tasks` pass an error to their
 * own callback, the next function is not executed, and the main `callback` is
 * immediately called with the error.
 *
 * @name waterfall
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Array} tasks - An array of functions to run, each function is passed
 * a `callback(err, result1, result2, ...)` it must call on completion. The
 * first argument is an error (which can be `null`) and any further arguments
 * will be passed as arguments in order to the next task.
 * @param {Function} [callback] - An optional callback to run once all the
 * functions have completed. This will be passed the results of the last task's
 * callback. Invoked with (err, [results]).
 * @returns undefined
 * @example
 *
 * async.waterfall([
 *     function(callback) {
 *         callback(null, 'one', 'two');
 *     },
 *     function(arg1, arg2, callback) {
 *         // arg1 now equals 'one' and arg2 now equals 'two'
 *         callback(null, 'three');
 *     },
 *     function(arg1, callback) {
 *         // arg1 now equals 'three'
 *         callback(null, 'done');
 *     }
 * ], function (err, result) {
 *     // result now equals 'done'
 * });
 *
 * // Or, with named functions:
 * async.waterfall([
 *     myFirstFunction,
 *     mySecondFunction,
 *     myLastFunction,
 * ], function (err, result) {
 *     // result now equals 'done'
 * });
 * function myFirstFunction(callback) {
 *     callback(null, 'one', 'two');
 * }
 * function mySecondFunction(arg1, arg2, callback) {
 *     // arg1 now equals 'one' and arg2 now equals 'two'
 *     callback(null, 'three');
 * }
 * function myLastFunction(arg1, callback) {
 *     // arg1 now equals 'three'
 *     callback(null, 'done');
 * }
 */
var waterfall = function (tasks, callback) {
    callback = once(callback || noop);
    if (!isArray(tasks)) return callback(new Error('First argument to waterfall must be an array of functions'));
    if (!tasks.length) return callback();
    var taskIndex = 0;

    function nextTask(args) {
        if (taskIndex === tasks.length) {
            return callback.apply(null, [null].concat(args));
        }

        var taskCallback = onlyOnce(rest(function (err, args) {
            if (err) {
                return callback.apply(null, [err].concat(args));
            }
            nextTask(args);
        }));

        args.push(taskCallback);

        var task = tasks[taskIndex++];
        task.apply(null, args);
    }

    nextTask([]);
};

/**
 * Async is a utility module which provides straight-forward, powerful functions
 * for working with asynchronous JavaScript. Although originally designed for
 * use with [Node.js](http://nodejs.org) and installable via
 * `npm install --save async`, it can also be used directly in the browser.
 * @module async
 */

/**
 * A collection of `async` functions for manipulating collections, such as
 * arrays and objects.
 * @module Collections
 */

/**
 * A collection of `async` functions for controlling the flow through a script.
 * @module ControlFlow
 */

/**
 * A collection of `async` utility functions.
 * @module Utils
 */
var index = {
  applyEach: applyEach,
  applyEachSeries: applyEachSeries,
  apply: apply$2,
  asyncify: asyncify,
  auto: auto,
  autoInject: autoInject,
  cargo: cargo,
  compose: compose,
  concat: concat,
  concatSeries: concatSeries,
  constant: constant,
  detect: detect,
  detectLimit: detectLimit,
  detectSeries: detectSeries,
  dir: dir,
  doDuring: doDuring,
  doUntil: doUntil,
  doWhilst: doWhilst,
  during: during,
  each: eachLimit,
  eachLimit: eachLimit$1,
  eachOf: eachOf,
  eachOfLimit: eachOfLimit,
  eachOfSeries: eachOfSeries,
  eachSeries: eachSeries,
  ensureAsync: ensureAsync,
  every: every,
  everyLimit: everyLimit,
  everySeries: everySeries,
  filter: filter,
  filterLimit: filterLimit,
  filterSeries: filterSeries,
  forever: forever,
  log: log,
  map: map,
  mapLimit: mapLimit,
  mapSeries: mapSeries,
  mapValues: mapValues,
  mapValuesLimit: mapValuesLimit,
  mapValuesSeries: mapValuesSeries,
  memoize: memoize,
  nextTick: nextTick,
  parallel: parallelLimit,
  parallelLimit: parallelLimit$1,
  priorityQueue: priorityQueue,
  queue: queue$1,
  race: race,
  reduce: reduce,
  reduceRight: reduceRight,
  reflect: reflect,
  reflectAll: reflectAll,
  reject: reject,
  rejectLimit: rejectLimit,
  rejectSeries: rejectSeries,
  retry: retry,
  retryable: retryable,
  seq: seq$1,
  series: series,
  setImmediate: setImmediate$1,
  some: some,
  someLimit: someLimit,
  someSeries: someSeries,
  sortBy: sortBy,
  timeout: timeout,
  times: times,
  timesLimit: timeLimit,
  timesSeries: timesSeries,
  transform: transform,
  unmemoize: unmemoize,
  until: until,
  waterfall: waterfall,
  whilst: whilst,

  // aliases
  all: every,
  any: some,
  forEach: eachLimit,
  forEachSeries: eachSeries,
  forEachLimit: eachLimit$1,
  forEachOf: eachOf,
  forEachOfSeries: eachOfSeries,
  forEachOfLimit: eachOfLimit,
  inject: reduce,
  foldl: reduce,
  foldr: reduceRight,
  select: filter,
  selectLimit: filterLimit,
  selectSeries: filterSeries,
  wrapSync: asyncify
};

exports['default'] = index;
exports.applyEach = applyEach;
exports.applyEachSeries = applyEachSeries;
exports.apply = apply$2;
exports.asyncify = asyncify;
exports.auto = auto;
exports.autoInject = autoInject;
exports.cargo = cargo;
exports.compose = compose;
exports.concat = concat;
exports.concatSeries = concatSeries;
exports.constant = constant;
exports.detect = detect;
exports.detectLimit = detectLimit;
exports.detectSeries = detectSeries;
exports.dir = dir;
exports.doDuring = doDuring;
exports.doUntil = doUntil;
exports.doWhilst = doWhilst;
exports.during = during;
exports.each = eachLimit;
exports.eachLimit = eachLimit$1;
exports.eachOf = eachOf;
exports.eachOfLimit = eachOfLimit;
exports.eachOfSeries = eachOfSeries;
exports.eachSeries = eachSeries;
exports.ensureAsync = ensureAsync;
exports.every = every;
exports.everyLimit = everyLimit;
exports.everySeries = everySeries;
exports.filter = filter;
exports.filterLimit = filterLimit;
exports.filterSeries = filterSeries;
exports.forever = forever;
exports.log = log;
exports.map = map;
exports.mapLimit = mapLimit;
exports.mapSeries = mapSeries;
exports.mapValues = mapValues;
exports.mapValuesLimit = mapValuesLimit;
exports.mapValuesSeries = mapValuesSeries;
exports.memoize = memoize;
exports.nextTick = nextTick;
exports.parallel = parallelLimit;
exports.parallelLimit = parallelLimit$1;
exports.priorityQueue = priorityQueue;
exports.queue = queue$1;
exports.race = race;
exports.reduce = reduce;
exports.reduceRight = reduceRight;
exports.reflect = reflect;
exports.reflectAll = reflectAll;
exports.reject = reject;
exports.rejectLimit = rejectLimit;
exports.rejectSeries = rejectSeries;
exports.retry = retry;
exports.retryable = retryable;
exports.seq = seq$1;
exports.series = series;
exports.setImmediate = setImmediate$1;
exports.some = some;
exports.someLimit = someLimit;
exports.someSeries = someSeries;
exports.sortBy = sortBy;
exports.timeout = timeout;
exports.times = times;
exports.timesLimit = timeLimit;
exports.timesSeries = timesSeries;
exports.transform = transform;
exports.unmemoize = unmemoize;
exports.until = until;
exports.waterfall = waterfall;
exports.whilst = whilst;
exports.all = every;
exports.allLimit = everyLimit;
exports.allSeries = everySeries;
exports.any = some;
exports.anyLimit = someLimit;
exports.anySeries = someSeries;
exports.find = detect;
exports.findLimit = detectLimit;
exports.findSeries = detectSeries;
exports.forEach = eachLimit;
exports.forEachSeries = eachSeries;
exports.forEachLimit = eachLimit$1;
exports.forEachOf = eachOf;
exports.forEachOfSeries = eachOfSeries;
exports.forEachOfLimit = eachOfLimit;
exports.inject = reduce;
exports.foldl = reduce;
exports.foldr = reduceRight;
exports.select = filter;
exports.selectLimit = filterLimit;
exports.selectSeries = filterSeries;
exports.wrapSync = asyncify;

Object.defineProperty(exports, '__esModule', { value: true });

})));

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":4}],4:[function(require,module,exports){
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

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(require,module,exports){
/*! Apollo v1.6.0 | (c) 2014 @toddmotto | github.com/toddmotto/apollo */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require, exports, module);
  } else {
    root.Apollo = factory();
  }
})(this, function (require, exports, module) {

  'use strict';

  var exports = {}, _hasClass, _addClass, _removeClass, _toggleClass;

  var _forEach = function (classes, callback) {
    if (Object.prototype.toString.call(classes) !== '[object Array]') {
      classes = classes.split(' ');
    }
    for (var i = 0; i < classes.length; i++) {
      callback(classes[i], i);
    }
  };

  if (document.documentElement.classList) {
    _hasClass = function (elem, className) {
      return elem.classList.contains(className);
    };
    _addClass = function (elem, className) {
      elem.classList.add(className);
    };
    _removeClass = function (elem, className) {
      elem.classList.remove(className);
    };
    _toggleClass = function (elem, className) {
      elem.classList.toggle(className);
    };
  } else {
    _hasClass = function (elem, className) {
      return new RegExp('(^|\\s)' + className + '(\\s|$)').test(elem.className);
    };
    _addClass = function (elem, className) {
      if (!exports.hasClass(elem, className)) {
        elem.className += (elem.className ? ' ' : '') + className;
      }
    };
    _removeClass = function (elem, className) {
      if (exports.hasClass(elem, className)) {
        elem.className = elem.className.replace(new RegExp('(^|\\s)*' + className + '(\\s|$)*', 'g'), '');
      }
    };
    _toggleClass = function (elem, className) {
      var toggle = exports.hasClass(elem, className) ? exports.removeClass : exports.addClass;
      toggle(elem, className);
    };
  }

  exports.hasClass = function (elem, className) {
    return _hasClass(elem, className);
  };

  exports.addClass = function (elem, classes) {
    _forEach(classes, function (className) {
      _addClass(elem, className);
    });
  };

  exports.removeClass = function (elem, classes) {
    _forEach(classes, function (className) {
      _removeClass(elem, className);
    });
  };

  exports.toggleClass = function (elem, classes) {
    _forEach(classes, function (className) {
      _toggleClass(elem, className);
    });
  };

  return exports;

});
},{}],6:[function(require,module,exports){
(function() {
  'use strict';

  var _isArray = function (array) {
    return array && (typeof array === 'object') && isFinite(array.length);
  };

  /**
   * Iterate through all items in an indexable Array to support the
   * forEach-less NodeList, and a fair alternative to something like
   * Array.prototype.forEach.call.
   * @param self an array-like object
   * @param fn the callback function that receives each item (and index)
   * @param context an optional context for the function call
   */
  var _each = function (self, fn, context) {
    if (_isArray(self)) {
      for (var i = 0; i < self.length; i++) {
        fn.call(context, self[i], i);
      }
      return;
    }
    for (var key in self) {
      if (self.hasOwnProperty(key)) {
        fn.call(context, key, self[key], self);
      }
    }
  };

  /**
   * Create a new DOM element with the given tag
   * and optional attributes and text.
   * @param tag the node name of the new DOM element.
   * @param attributes an array of attributes, like 'id' or 'class'
   * @param value optional text to append as a text node
   * @return the new DOM element
   */
  var _element = function (tag, attributes, value) {
    var el = document.createElement(tag);
    _each(attributes, function (key, value) {
      el.setAttribute(key, value);
    });
    if (value) {
      el.appendChild(document.createTextNode(value));
    }
    return el;
  };

  module.exports = {
    element: _element,
    each: _each,
    isArray: _isArray
  };

}());
},{}],7:[function(require,module,exports){
/* California.js v0.1
 * Copyright (c) 2014 Joe Liversedge (@jliverse)
 * MIT License
 *****************************************************************************/
module.exports = (function (require, exports, module) {
  'use strict';

  var functions = require('california-functions');

  var forEach = require('async-foreach').forEach;

  /**
   * Optionally map all the values in the given Array using a provided map
   * function and determine if all the values in the array are strictly equal.
   * @param self an array-like object
   * @param fn the callback function to map each value in the array
   */
  var _arrayValuesAreEqual = function (array, fn) {
    var mapped = (fn) ? array.map(fn) : array;
    if (mapped.length === 0) {
      return true;
    }

    for (var i = 1; i < mapped.length; i++) {
      if (mapped[i] !== mapped[0]) {
        return false;
      }
    }
    return true;
  };

  /**
   * A factory for Fonts.
   */
  var FontFactory = function () {

    var namesAndInstances = {};

    /**
     * A simple representation of a font.
     * @param the name of the font, e.g., 'Comic Sans MS'
     */
    function Font(name) {
      this.name = name;
    }

    /**
     * Get the width of the given text with the font name.
     * This is provided by Font instances generated by the FontFactory.
     */
    Font.prototype.measureText = function () {
      return 0;
    };

    return {

      /**
       * A Font factory method that caches font instances by name.
       */
      fontWithName: function (name) {

        var instance = namesAndInstances[name];
        if (instance) {
          return instance;
        }

        // TODO: Check that the Canvas is supported.
        // Create a canvas (not attached to the DOM).
        var canvas = functions.element('canvas', {
          width: 320,
          height: 320
        });

        // Set the font and associate the canvas' drawing
        // context with the name of the font.
        canvas.getContext = canvas.getContext || function() { return {}; };
        var context2d = canvas.getContext('2d');
        context2d.font = '36px "' + name + '", AdobeBlank, monospace';

        // Create the new Font and override its measureText function to use
        // a new closure using the canvas and context we created.
        instance = new Font(name);
        instance.measureText = function (text) {
          return context2d.measureText(text);
        };
        instance.containsGlyph = function (text) {
          return this.measureText(text).width !== baseFont.measureText(text).width;
        };
        instance.containsCodePoint = function (codePoint) {
          return this.containsGlyph(String.fromCharCode(codePoint));
        };
        instance.allGlyphs = function () {
          var glyph,
              glyphs = [];

          for (var codePoint = 32; codePoint < 65536; codePoint++) {
            glyph = String.fromCharCode(codePoint);
            if (this.containsGlyph(glyph)) {
              glyphs.push(glyph);
            }
          }
          return glyphs;
        };

        namesAndInstances[name] = instance;
        return instance;
      }
    };
  };

  /**
   * Get the metrics for the given glyph using the provided array of Fonts.
   * @param glyph a glyph to use when calculating the font widths
   * @param fonts an array of Fonts
   */
  var _glyphMetricsWithFonts = function (glyph, fonts) {
    var widths = [];
    forEach(fonts, function (font) {
      var done = this.async();
      widths.push(font.measureText(glyph));
      done();
    });
    return widths;
  };

  /**
   * Determine if the widths of the glyph are
   * identical for all the provided Fonts.
   * @param glyph a glyph to use in the comparison
   * @param fonts an array of Fonts to compare
   */
  var _isWidthEqualWithGlyphAndFonts = function (glyph, fonts) {
    return _arrayValuesAreEqual(_glyphMetricsWithFonts(32, fonts), function (item) {
      return item.width;
    });
  };

  // Instance variables.
  ////////////////////////////////////////////////////////////////////////////

  var fontFactory = new FontFactory(),
         baseFont = fontFactory.fontWithName('AdobeBlank');

  /**
   * Expose the factory method.
   */
  module.exports.fontWithName = fontFactory.fontWithName;

  /**
   * Determine whether the browser environment has glyphs for the given font name.
   * @param name the name of the font
   * @return true, if the browser environment has glyphs for the given font name.
   */
  module.exports.hasFont = function (name) {

    // Compare our base font (Adobe Blank) with the given font name.
    var fonts = [ baseFont, fontFactory.fontWithName('monospace'), fontFactory.fontWithName(name) ];

    // A font could have only one glyph at 0x19, but the repertoire
    // starts (by convention) at the Unicode 'SPACE' (hex 0x20, decimal 32).
    for (var codePoint = 32; codePoint < 65536; codePoint++) {
      if (!_isWidthEqualWithGlyphAndFonts(String.fromCharCode(codePoint), fonts)) {
        return true;
      }
    }

    return false;
  };

  return exports;
}(require, exports, module));

},{"async-foreach":2,"california-functions":6}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvc2NyaXB0cy9hcHAuanMiLCJub2RlX21vZHVsZXMvYXN5bmMtZm9yZWFjaC9saWIvZm9yZWFjaC5qcyIsIm5vZGVfbW9kdWxlcy9hc3luYy9kaXN0L2FzeW5jLmpzIiwibm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsInZlbmRvci9zY3JpcHRzL2Fwb2xsby0xLjYuMC5qcyIsInZlbmRvci9zY3JpcHRzL2NhbGlmb3JuaWEtZnVuY3Rpb25zLmpzIiwidmVuZG9yL3NjcmlwdHMvY2FsaWZvcm5pYS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25QQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3pxS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGFwb2xsbyAgICAgPSByZXF1aXJlKCdhcG9sbG8nKSxcbiAgICBhc3luYyAgICAgID0gcmVxdWlyZSgnYXN5bmMnKSxcbiAgICBjYWxpZm9ybmlhID0gcmVxdWlyZSgnY2FsaWZvcm5pYScpLFxuICAgIGZ1bmN0aW9ucyAgPSByZXF1aXJlKCdjYWxpZm9ybmlhLWZ1bmN0aW9ucycpO1xuXG52YXIgZm9yRWFjaCA9IHJlcXVpcmUoJ2FzeW5jLWZvcmVhY2gnKS5mb3JFYWNoO1xuXG52YXIgRkFMTEJBQ0tfTkFNRVMgPSBbICdBY2FkZW15IEVuZ3JhdmVkIExFVCcsICdBbCBOaWxlJywgJ0FtZXJpY2FuIFR5cGV3cml0ZXInLFxuICAnQXBwbGUgQ29sb3IgRW1vamknLCAnQXBwbGUgU0QgR290aGljIE5lbycsICdBcmlhbCcsXG4gICdBcmlhbCBSb3VuZGVkIE1UIEJvbGQnLCAnQXZlbmlyJywgJ0F2ZW5pciBOZXh0JywgJ0F2ZW5pciBOZXh0IENvbmRlbnNlZCcsXG4gICdCYXNrZXJ2aWxsZScsICdCb2RvbmkgNzInLCAnQm9kb25pIDcyIE9sZHN0eWxlJywgJ0JvZG9uaSBPcm5hbWVudHMnLFxuICAnQnJhZGxleSBIYW5kJywgJ0NoYWxrYm9hcmQgU0UnLCAnQ2hhbGtkdXN0ZXInLCAnQ29jaGluJywgJ0NvcHBlcnBsYXRlJyxcbiAgJ0NvdXJpZXInLCAnQ291cmllciBOZXcnLCAnRElOIEFsdGVybmF0ZScsICdESU4gQ29uZGVuc2VkJyxcbiAgJ0RhbWFzY3VzJywgJ0RpZG90JywgJ0Z1dHVyYScsICdHZWV6YSBQcm8nLCAnR2VvcmdpYScsICdHaWxsIFNhbnMnLFxuICAnSGVsdmV0aWNhJywgJ0hlbHZldGljYSBOZXVlJywgJ0hvZWZsZXIgVGV4dCcsICdJb3dhbiBPbGQgU3R5bGUnLFxuICAnTWFyaW9uJywgJ01hcmtlciBGZWx0JywgJ01lbmxvJywgJ05vdGV3b3J0aHknLCAnT3B0aW1hJywgJ1BhbGF0aW5vJyxcbiAgJ1BhcHlydXMnLCAnUGFydHkgTEVUJywgJ1NuZWxsIFJvdW5kaGFuZCcsICdTdXBlcmNsYXJlbmRvbicsICdTeW1ib2wnLFxuICAnVGltZXMgTmV3IFJvbWFuJywgJ1RyZWJ1Y2hldCBNUycsICdWZXJkYW5hJywgJ1phcGYgRGluZ2JhdHMnLCAnWmFwZmlubycgXTtcblxuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gUG9seWZpbGwgdGhlIGNvbnNvbGUuXG4gIHdpbmRvdy5jb25zb2xlID0gd2luZG93LmNvbnNvbGUgfHwgeyBsb2c6IGZ1bmN0aW9uICgpIHt9IH07XG5cbiAgLy8gRGV0ZWN0IHRoZSBlbnZpcm9ubWVudC5cbiAgYXBvbGxvLnJlbW92ZUNsYXNzKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCwgJ25vLWpzJyk7XG4gIGFwb2xsby5hZGRDbGFzcyhkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsICdqcycpO1xuXG4gIHZhciBpc01vZGVybiA9ICgncXVlcnlTZWxlY3RvcicgaW4gZG9jdW1lbnQgJiYgJ2FkZEV2ZW50TGlzdGVuZXInIGluIHdpbmRvdyAmJiBBcnJheS5wcm90b3R5cGUuZm9yRWFjaCk7XG4gIGFwb2xsby5hZGRDbGFzcyhkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsIGlzTW9kZXJuID8gJ211c3RhcmQnIDogJ25vLW11c3RhcmQnKTtcblxuICB2YXIgcmVhZHlTdGF0ZXMgPSBbICdjb21wbGV0ZScsICdsb2FkZWQnLCAnaW50ZXJhY3RpdmUnIF07XG5cbiAgLy8gQ3JlYXRlIGFuIGFzeW5jaHJvbm91cyB0YXNrIHRvIHdhaXQgZm9yIHRoZSBET00uXG4gIHZhciByZWFkeVRhc2sgPSBmdW5jdGlvbihuZXh0KSB7XG4gICAgaWYgKHJlYWR5U3RhdGVzLmluZGV4T2YoZG9jdW1lbnQucmVhZHlTdGF0ZSkgPj0gMCkge1xuICAgICAgbmV4dCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICAvLyBDcmVhdGUgYW4gYXN5bmNocm9ub3VzIHRhc2sgdG8gd2FpdCBmb3IgdGhlIGZvbnRzLlxuICB2YXIgZmxhc2hGb250c1Rhc2sgPSBmdW5jdGlvbihuZXh0KSB7XG5cbiAgICAvLyBUaGlzIHdpbmRvdy1nbG9iYWwgaXMgYSBjYWxsYmFjayBmb3IgdGhlIER1Z29uamnEhy1SYW50YWthcmkgZm9udFxuICAgIC8vIGVudW1lcmF0aW9uIHRlY2huaXF1ZSAoaS5lLiwgdXNpbmcgTWFjcm9tZWRpYSBGbGFzaC9BZG9iZSBGbGV4KS5cbiAgICB3aW5kb3cucG9wdWxhdGVGb250TGlzdCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgICB2YXIgbmFtZXMgPSBbXTtcbiAgICAgIGZvciAodmFyIGtleSBpbiBhcnJheSkge1xuICAgICAgICBuYW1lcy5wdXNoKGFycmF5W2tleV0ucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpKTtcbiAgICAgIH1cbiAgICAgIG5leHQobnVsbCwgbmFtZXMpO1xuICAgIH07XG5cbiAgICAvLyBUT0RPOiBEZXRlY3Qgc3VwcG9ydCBhbmQgaWdub3JlIHRoaXMgRE9NIGNyZWF0aW9uLlxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZnVuY3Rpb25zLmVsZW1lbnQoJ29iamVjdCcsIHtcbiAgICAgICdpZCcgICAgOiAnYW1wZXJzYW5kLWZsYXNoLWhlbHBlcicsXG4gICAgICAnY2xhc3MnIDogJ2FtcGVyc2FuZC11aScsXG4gICAgICAndHlwZScgIDogJ2FwcGxpY2F0aW9uL3gtc2hvY2t3YXZlLWZsYXNoJyxcbiAgICAgICdkYXRhJyAgOiAnYXNzZXRzL2ZvbnRzLnN3ZicsXG4gICAgICAnd2lkdGgnIDogMSxcbiAgICAgICdoZWlnaHQnOiAxXG4gICAgIH0pKTtcblxuICAgIC8vIEEgY29udGVudC1sb2FkZWQgbGlzdGVuZXIgdG8gcGljayB1cCB0aGUgZm9udCBsaXN0aW5nXG4gICAgLy8gdXNpbmcgdGhlIFdpbmRvd3MtcHJvdmlkZWQgZGlhbG9nIGhlbHBlciBjb250cm9sLlxuICAgIHZhciByZXNvbHZlV2l0aERpYWxvZ0hlbHBlciA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICB2YXIgaGVscGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FtcGVyc2FuZC1kaWFsb2ctaGVscGVyJyk7XG4gICAgICBpZiAoIWhlbHBlciB8fCAhaGVscGVyLmZvbnRzIHx8ICFoZWxwZXIuZm9udHMuY291bnQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgLy8gVGhlICdmb250cycgcHJvcGVydHkgaXMgb25lLWluZGV4ZWQuXG4gICAgICB2YXIgbmFtZXMgPSBbXTtcbiAgICAgIGZvcih2YXIgaSA9IDE7IGkgPD0gaGVscGVyLmZvbnRzLmNvdW50OyBpKyspIHtcbiAgICAgICAgbmFtZXMucHVzaChoZWxwZXIuZm9udHMoaSkpO1xuICAgICAgfVxuICAgICAgbmV4dChudWxsLCBuYW1lcyk7XG4gICAgfTtcblxuICAgIGlmIChyZWFkeVN0YXRlcy5pbmRleE9mKGRvY3VtZW50LnJlYWR5U3RhdGUpID49IDApIHtcbiAgICAgIHJlc29sdmVXaXRoRGlhbG9nSGVscGVyKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCByZXNvbHZlV2l0aERpYWxvZ0hlbHBlcik7XG4gICAgfVxuXG4gICAgdmFyIGlzQ29udHJvbFVuYXZhaWxhYmxlID0gKCF3aW5kb3cuQWN0aXZlWE9iamVjdCB8fFxuICAgICAgKG5ldyB3aW5kb3cuQWN0aXZlWE9iamVjdCgnU2hvY2t3YXZlRmxhc2guU2hvY2t3YXZlRmxhc2gnKSkgPT09IGZhbHNlKTtcbiAgICB2YXIgaXNQbHVnaW5VbmF2YWlsYWJsZSA9ICh0eXBlb2YgbmF2aWdhdG9yLnBsdWdpbnMgPT09ICd1bmRlZmluZWQnIHx8XG4gICAgICB0eXBlb2YgbmF2aWdhdG9yLnBsdWdpbnNbJ1Nob2Nrd2F2ZSBGbGFzaCddICE9PSAnb2JqZWN0Jyk7XG5cbiAgICAvLyBBc3N1bWUgdGhhdCBGbGFzaCBpcyB1bmF2YWlsYWJsZSBpZiB0aGVyZSdzIG5vIHdheSB0byBwbGF5IGl0LiAoVGhpc1xuICAgIC8vIGRvZXMgbm90IGNoZWNrIGZvciBGbGFzaCBibG9ja2luZyB0b29scywgYnV0IG1hbnkgb2YgdGhvc2UgYWxsb3dcbiAgICAvLyBzbWFsbCBvciBpbnZpc2libGUgRmxhc2ggc2NyaXB0cy4gSWYgdW5hdmFpbGFibGUsIHBpY2sgYSBsaXN0IG9mXG4gICAgLy8gY29tbW9uIGZvbnRzLCB3aGljaCB3aWxsIGJlIGNoZWNrZWQgaW5kaXZpZHVhbGx5LlxuICAgIGlmKGlzUGx1Z2luVW5hdmFpbGFibGUgJiYgaXNDb250cm9sVW5hdmFpbGFibGUpIHtcbiAgICAgIG5leHQobnVsbCwgRkFMTEJBQ0tfTkFNRVMpO1xuICAgIH1cbiAgfTtcblxuICB2YXIgZmFsbGJhY2tGb250c1Rhc2sgPSBmdW5jdGlvbihuZXh0KSB7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIG5leHQobnVsbCwgRkFMTEJBQ0tfTkFNRVMpO1xuICAgIH0sIDEwMDApO1xuICB9O1xuXG4gIHZhciBmb250c1Rhc2sgPSBmdW5jdGlvbihuZXh0KSB7XG4gICAgICBhc3luYy5yYWNlKFsgZmxhc2hGb250c1Rhc2ssIGZhbGxiYWNrRm9udHNUYXNrIF0sIG5leHQpO1xuICB9O1xuXG4gIC8vIFJ1biB0aGUgdGFza3MgaW4gcGFyYWxsZWwgYW5kIGhhbmRsZSB0aGUgcmVzdWx0cyBjb21pbmcgYmFjay5cbiAgYXN5bmMucGFyYWxsZWwoWyByZWFkeVRhc2ssIGZvbnRzVGFzayBdLCBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICBhcG9sbG8uYWRkQ2xhc3MoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LCAnZXJyb3Itbm8tZm9udHMtbG9hZGVkJyk7XG4gICAgICBjb25zb2xlLmxvZygnVGhlcmUgd2FzIGEgcHJvYmxlbSB3aGlsZSBleHBlY3RpbmcgdGhlIHBhZ2UgbG9hZCB3aXRoIGEgbGlzdCBvZiBzeXN0ZW0gZm9udHMuJywgcmVzdWx0cyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGdseXBoID0gJyYnLFxuICAgIGZvbnRzV2l0aEdseXBoID0gcmVzdWx0c1sxXS5tYXAoZnVuY3Rpb24obmFtZSkge1xuICAgICAgcmV0dXJuIGNhbGlmb3JuaWEuZm9udFdpdGhOYW1lKG5hbWUpO1xuICAgIH0pLmZpbHRlcihmdW5jdGlvbihmb250KSB7XG4gICAgICByZXR1cm4gZm9udC5jb250YWluc0dseXBoKGdseXBoKTtcbiAgICB9KTtcblxuICAgIGNvbnNvbGUubG9nKCdTaG93aW5nICcgKyBmb250c1dpdGhHbHlwaC5sZW5ndGggKyAnIGZvbnRzLicpO1xuXG4gICAgdmFyIHdpZHRoSW5QaXhlbHMgPSAxNjtcbiAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChjYW52YXMpO1xuICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5oZWlnaHQgPSB3aWR0aEluUGl4ZWxzO1xuXG4gICAgY2FudmFzLmdldENvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCB8fCBmdW5jdGlvbigpIHsgcmV0dXJuIHt9OyB9O1xuICAgIHZhciBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgY29udGV4dC50ZXh0QmFzZWxpbmUgPSAndG9wJztcbiAgICBjb250ZXh0LmZpbGxTdHlsZSA9IGNvbnRleHQuc3Ryb2tlU3R5bGUgPSAnYmxhY2snO1xuXG4gICAgdmFyIGRpY3Rpb25hcnkgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyc7XG4gICAgdmFyIGRpdnMgPSBbXTtcblxuICAgIGZvckVhY2goZm9udHNXaXRoR2x5cGgsIGZ1bmN0aW9uKGZvbnQpIHtcbiAgICAgIHZhciBkb25lID0gdGhpcy5hc3luYygpO1xuXG4gICAgICB2YXIgaGFzaCA9IFtdLFxuICAgICAgICAgIHdlaWdodCA9IDA7XG5cbiAgICAgIC8vIFVzZSB0aGUgY2FudmFzIHRvIGNyZWF0ZSBhIGhhc2ggZm9yIHRoaXMgZ2x5cGguXG4gICAgICBjb250ZXh0LmZvbnQgPSB3aWR0aEluUGl4ZWxzICsgJ3B4IFxcJycgKyBmb250Lm5hbWUgKyAnXFwnJztcbiAgICAgIGNvbnRleHQuZmlsbFRleHQoZ2x5cGgsIDAsIDApO1xuXG4gICAgICB2YXIgZGF0YSA9IGNvbnRleHQuZ2V0SW1hZ2VEYXRhKDAsIDAsIHdpZHRoSW5QaXhlbHMsIHdpZHRoSW5QaXhlbHMpLmRhdGE7XG5cbiAgICAgIC8vIENvbGxlY3QgYWxwaGEgZGF0YSBpbiBzaXgtYml0IGNodW5rcyB0byBnZXQgcmFuZ2VzIGZyb20gMCB0byA2My5cbiAgICAgIC8vIFRoZSBpbWFnZSBkYXRhIGlzIFJHQkFSR0JBUkdCQSwgc28gcHJlLXNldCB0aGUgYWxwaGEgcG9zaXRpb25zXG4gICAgICAvLyBmb3IgZWFjaCBzdGVwIGluIHRoZSBsb29wIGZvciBjbGVhbmVyIGZvcm1hdHRpbmcuXG4gICAgICB2YXIgcG9zaXRpb25zID0gWyAzLCA3LCAxMSwgMTUsIDE5LCAyMyBdO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSArPSAyNCkge1xuICAgICAgICAvLyBXZSB3YW50IHRvIGtub3cgb25seSB3aGVuIHRoZSBhbHBoYSBmb3JcbiAgICAgICAgLy8gdGhlIGN1cnJlbnQgcGl4ZWwgaXMgZnVsbHkgb3BhcXVlLlxuICAgICAgICB2YXIgYml0cyA9IHBvc2l0aW9ucy5tYXAoZnVuY3Rpb24ocG9zaXRpb24pIHtcbiAgICAgICAgICByZXR1cm4gKGRhdGFbaSArIHBvc2l0aW9uXSA9PT0gMjU1KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIHRoZSBudW1iZXIgb2Ygb3BhcXVlIHBpeGVscy5cbiAgICAgICAgd2VpZ2h0ICs9IGJpdHMuZmlsdGVyKGZ1bmN0aW9uKGJpdCkge1xuICAgICAgICAgIHJldHVybiBiaXQgPT09IHRydWU7XG4gICAgICAgIH0pLmxlbmd0aDtcblxuICAgICAgICB2YXIgbnVtYmVyID0gMDtcbiAgICAgICAgbnVtYmVyIHw9IChiaXRzWzBdID8gMSA6IDApIDw8IDU7XG4gICAgICAgIG51bWJlciB8PSAoYml0c1sxXSA/IDEgOiAwKSA8PCA0O1xuICAgICAgICBudW1iZXIgfD0gKGJpdHNbMl0gPyAxIDogMCkgPDwgMztcbiAgICAgICAgbnVtYmVyIHw9IChiaXRzWzNdID8gMSA6IDApIDw8IDI7XG4gICAgICAgIG51bWJlciB8PSAoYml0c1s0XSA/IDEgOiAwKSA8PCAxO1xuICAgICAgICBudW1iZXIgfD0gKGJpdHNbNV0gPyAxIDogMCk7XG5cbiAgICAgICAgLy8gQWRkIGEgYWxwaGFudW1lcmljIGNoYXJhY3RlciBmcm9tIG91ciA2NC1jaGFyYWN0ZXJcbiAgICAgICAgLy8gZGljdGlvbmFyeSB0byByZXByZXNlbnQgb3VyIDAtNjMgbnVtYmVyLlxuICAgICAgICBoYXNoLnB1c2goZGljdGlvbmFyeVtudW1iZXJdKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ3JlYXRlIHRoZSBIVE1MIG1hcmt1cCBmcm9tIHRoZSBmb250IGFuZCBnbHlwaCBpbmZvcm1hdGlvbi5cbiAgICAgIHZhciBkdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2R0Jyk7XG4gICAgICBkdC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ2ZvbnQtZmFtaWx5OiBcXCcnICsgZm9udC5uYW1lICsgJ1xcJywgQWRvYmVCbGFuaycpO1xuICAgICAgZHQudGV4dENvbnRlbnQgPSBnbHlwaDtcblxuICAgICAgdmFyIGRkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGQnKTtcbiAgICAgIGRkLnRleHRDb250ZW50ID0gZm9udC5uYW1lO1xuXG4gICAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBkaXYuc2V0QXR0cmlidXRlKCd0aXRsZScsIGZvbnQubmFtZSk7XG4gICAgICBkaXYuYXBwZW5kQ2hpbGQoZHQpO1xuICAgICAgZGl2LmFwcGVuZENoaWxkKGRkKTtcblxuICAgICAgdmFyIGVsZW1lbnRzID0gW1xuICAgICAgICAoJzAwMCcgKyB3ZWlnaHQpLnNsaWNlKC0zKSxcbiAgICAgICAgKGZvbnQuY29udGFpbnNHbHlwaCgnQScpID8gMSA6IDApLFxuICAgICAgICBoYXNoLmpvaW4oJycpXG4gICAgICBdO1xuICAgICAgZGl2LnNldEF0dHJpYnV0ZSgnZGF0YS1pbWFnZS1oYXNoJywgZWxlbWVudHMuam9pbignLScpKTtcblxuICAgICAgLy8gQWRkIGEgQ1NTIGNsYXNzIHRvIGlkZW50aWZ5IHdpZGVyLXRoYW4tbm9ybWFsIGdseXBocy5cbiAgICAgIHZhciBtZXRyaWNzID0gZm9udC5tZWFzdXJlVGV4dChnbHlwaCk7XG4gICAgICBpZiAobWV0cmljcy53aWR0aCA+IDQyKSB7XG4gICAgICAgIGFwb2xsby5hZGRDbGFzcyhkaXYsICd3aWRlJyk7XG4gICAgICB9XG4gICAgICBhcG9sbG8uYWRkQ2xhc3MoZGl2LCBmb250Lm5hbWUucmVwbGFjZSgvXFxzKy9nLCAnLScpLnRvTG93ZXJDYXNlKCkpO1xuXG4gICAgICBkaXZzLnB1c2goZGl2KTtcblxuICAgICAgLy8gQ2xlYXIgdGhlIGRyYXdpbmcgY29udGV4dCBmb3IgdGhlIG5leHQgaXRlcmF0aW9uLlxuICAgICAgY29udGV4dC5jbGVhclJlY3QoMCwgMCwgd2lkdGhJblBpeGVscywgd2lkdGhJblBpeGVscyk7XG4gICAgICBkb25lKCk7XG4gICAgfSk7XG5cbiAgICAvLyBTb3J0IHRoZSBESVZzIGJ5IHRoZSBjb21wdXRlZCBzb3J0XG4gICAgLy8gc3RyaW5nIGFuZCBhcHBlbmQgdG8gdGhlIGZyYWdtZW50LlxuICAgIGRpdnMuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICByZXR1cm4gYi5nZXRBdHRyaWJ1dGUoJ2RhdGEtaW1hZ2UtaGFzaCcpLmxvY2FsZUNvbXBhcmUoYS5nZXRBdHRyaWJ1dGUoJ2RhdGEtaW1hZ2UtaGFzaCcpKTtcbiAgICB9KTtcblxuICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBkaXZzLmZvckVhY2goZnVuY3Rpb24oZGl2KSB7XG4gICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChkaXYpO1xuICAgIH0pO1xuXG4gICAgYXBvbGxvLnJlbW92ZUNsYXNzKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCwgJ25vLWFtcGVyc2FuZHMnKTtcbiAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21haW4nKTtcbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpO1xuXG4gICAgLy8gVXNlIENvbW1vbnNKUy1hdmVyc2UgTWFzb25yeSB0byBtYW5hZ2UgdGhlIGl0ZW0gbGF5b3V0LCB3aGljaCBzaG91bGQgYmVcbiAgICAvLyBhdmFpbGFibGUgd2hlbiB0aGlzIGZpcmVzICh3ZSBkZXBlbmQgb24gdGhlIERPTUNvbnRlbnRMb2FkZWQgZXZlbnQpLlxuICAgIG5ldyB3aW5kb3cuTWFzb25yeShjb250YWluZXIsIHtcbiAgICAgIGNvbHVtbldpZHRoOiAxMDAsXG4gICAgICBpdGVtU2VsZWN0b3I6ICdkaXYnLFxuICAgICAgaXNGaXRXaWR0aDogdHJ1ZVxuICAgIH0pO1xuICB9KTtcbn0oKSk7XG4iLCIvKiFcbiAqIFN5bmMvQXN5bmMgZm9yRWFjaFxuICogaHR0cHM6Ly9naXRodWIuY29tL2Nvd2JveS9qYXZhc2NyaXB0LXN5bmMtYXN5bmMtZm9yZWFjaFxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMiBcIkNvd2JveVwiIEJlbiBBbG1hblxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuICogaHR0cDovL2JlbmFsbWFuLmNvbS9hYm91dC9saWNlbnNlL1xuICovXG5cbihmdW5jdGlvbihleHBvcnRzKSB7XG5cbiAgLy8gSXRlcmF0ZSBzeW5jaHJvbm91c2x5IG9yIGFzeW5jaHJvbm91c2x5LlxuICBleHBvcnRzLmZvckVhY2ggPSBmdW5jdGlvbihhcnIsIGVhY2hGbiwgZG9uZUZuKSB7XG4gICAgdmFyIGkgPSAtMTtcbiAgICAvLyBSZXNvbHZlIGFycmF5IGxlbmd0aCB0byBhIHZhbGlkIChUb1VpbnQzMikgbnVtYmVyLlxuICAgIHZhciBsZW4gPSBhcnIubGVuZ3RoID4+PiAwO1xuXG4gICAgLy8gVGhpcyBJSUZFIGlzIGNhbGxlZCBvbmNlIG5vdywgYW5kIHRoZW4gYWdhaW4sIGJ5IG5hbWUsIGZvciBlYWNoIGxvb3BcbiAgICAvLyBpdGVyYXRpb24uXG4gICAgKGZ1bmN0aW9uIG5leHQocmVzdWx0KSB7XG4gICAgICAvLyBUaGlzIGZsYWcgd2lsbCBiZSBzZXQgdG8gdHJ1ZSBpZiBgdGhpcy5hc3luY2AgaXMgY2FsbGVkIGluc2lkZSB0aGVcbiAgICAgIC8vIGVhY2hGbmAgY2FsbGJhY2suXG4gICAgICB2YXIgYXN5bmM7XG4gICAgICAvLyBXYXMgZmFsc2UgcmV0dXJuZWQgZnJvbSB0aGUgYGVhY2hGbmAgY2FsbGJhY2sgb3IgcGFzc2VkIHRvIHRoZVxuICAgICAgLy8gYHRoaXMuYXN5bmNgIGRvbmUgZnVuY3Rpb24/XG4gICAgICB2YXIgYWJvcnQgPSByZXN1bHQgPT09IGZhbHNlO1xuXG4gICAgICAvLyBJbmNyZW1lbnQgY291bnRlciB2YXJpYWJsZSBhbmQgc2tpcCBhbnkgaW5kaWNlcyB0aGF0IGRvbid0IGV4aXN0LiBUaGlzXG4gICAgICAvLyBhbGxvd3Mgc3BhcnNlIGFycmF5cyB0byBiZSBpdGVyYXRlZC5cbiAgICAgIGRvIHsgKytpOyB9IHdoaWxlICghKGkgaW4gYXJyKSAmJiBpICE9PSBsZW4pO1xuXG4gICAgICAvLyBFeGl0IGlmIHJlc3VsdCBwYXNzZWQgdG8gYHRoaXMuYXN5bmNgIGRvbmUgZnVuY3Rpb24gb3IgcmV0dXJuZWQgZnJvbVxuICAgICAgLy8gdGhlIGBlYWNoRm5gIGNhbGxiYWNrIHdhcyBmYWxzZSwgb3Igd2hlbiBkb25lIGl0ZXJhdGluZy5cbiAgICAgIGlmIChhYm9ydCB8fCBpID09PSBsZW4pIHtcbiAgICAgICAgLy8gSWYgYSBgZG9uZUZuYCBjYWxsYmFjayB3YXMgc3BlY2lmaWVkLCBpbnZva2UgdGhhdCBub3cuIFBhc3MgaW4gYVxuICAgICAgICAvLyBib29sZWFuIHZhbHVlIHJlcHJlc2VudGluZyBcIm5vdCBhYm9ydGVkXCIgc3RhdGUgYWxvbmcgd2l0aCB0aGUgYXJyYXkuXG4gICAgICAgIGlmIChkb25lRm4pIHtcbiAgICAgICAgICBkb25lRm4oIWFib3J0LCBhcnIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gSW52b2tlIHRoZSBgZWFjaEZuYCBjYWxsYmFjaywgc2V0dGluZyBgdGhpc2AgaW5zaWRlIHRoZSBjYWxsYmFjayB0byBhXG4gICAgICAvLyBjdXN0b20gb2JqZWN0IHRoYXQgY29udGFpbnMgb25lIG1ldGhvZCwgYW5kIHBhc3NpbmcgaW4gdGhlIGFycmF5IGl0ZW0sXG4gICAgICAvLyBpbmRleCwgYW5kIHRoZSBhcnJheS5cbiAgICAgIHJlc3VsdCA9IGVhY2hGbi5jYWxsKHtcbiAgICAgICAgLy8gSWYgYHRoaXMuYXN5bmNgIGlzIGNhbGxlZCBpbnNpZGUgdGhlIGBlYWNoRm5gIGNhbGxiYWNrLCBzZXQgdGhlIGFzeW5jXG4gICAgICAgIC8vIGZsYWcgYW5kIHJldHVybiBhIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIHVzZWQgdG8gY29udGludWUgaXRlcmF0aW5nLlxuICAgICAgICBhc3luYzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgYXN5bmMgPSB0cnVlO1xuICAgICAgICAgIHJldHVybiBuZXh0O1xuICAgICAgICB9XG4gICAgICB9LCBhcnJbaV0sIGksIGFycik7XG5cbiAgICAgIC8vIElmIHRoZSBhc3luYyBmbGFnIHdhc24ndCBzZXQsIGNvbnRpbnVlIGJ5IGNhbGxpbmcgYG5leHRgIHN5bmNocm9ub3VzbHksXG4gICAgICAvLyBwYXNzaW5nIGluIHRoZSByZXN1bHQgb2YgdGhlIGBlYWNoRm5gIGNhbGxiYWNrLlxuICAgICAgaWYgKCFhc3luYykge1xuICAgICAgICBuZXh0KHJlc3VsdCk7XG4gICAgICB9XG4gICAgfSgpKTtcbiAgfTtcblxufSh0eXBlb2YgZXhwb3J0cyA9PT0gXCJvYmplY3RcIiAmJiBleHBvcnRzIHx8IHRoaXMpKTsiLCIoZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuICAgIHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cykgOlxuICAgIHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSkgOlxuICAgIChmYWN0b3J5KChnbG9iYWwuYXN5bmMgPSBnbG9iYWwuYXN5bmMgfHwge30pKSk7XG59KHRoaXMsIChmdW5jdGlvbiAoZXhwb3J0cykgeyAndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQSBmYXN0ZXIgYWx0ZXJuYXRpdmUgdG8gYEZ1bmN0aW9uI2FwcGx5YCwgdGhpcyBmdW5jdGlvbiBpbnZva2VzIGBmdW5jYFxuICogd2l0aCB0aGUgYHRoaXNgIGJpbmRpbmcgb2YgYHRoaXNBcmdgIGFuZCB0aGUgYXJndW1lbnRzIG9mIGBhcmdzYC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gaW52b2tlLlxuICogQHBhcmFtIHsqfSB0aGlzQXJnIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgZnVuY2AuXG4gKiBAcGFyYW0ge0FycmF5fSBhcmdzIFRoZSBhcmd1bWVudHMgdG8gaW52b2tlIGBmdW5jYCB3aXRoLlxuICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIHJlc3VsdCBvZiBgZnVuY2AuXG4gKi9cbmZ1bmN0aW9uIGFwcGx5KGZ1bmMsIHRoaXNBcmcsIGFyZ3MpIHtcbiAgc3dpdGNoIChhcmdzLmxlbmd0aCkge1xuICAgIGNhc2UgMDogcmV0dXJuIGZ1bmMuY2FsbCh0aGlzQXJnKTtcbiAgICBjYXNlIDE6IHJldHVybiBmdW5jLmNhbGwodGhpc0FyZywgYXJnc1swXSk7XG4gICAgY2FzZSAyOiByZXR1cm4gZnVuYy5jYWxsKHRoaXNBcmcsIGFyZ3NbMF0sIGFyZ3NbMV0pO1xuICAgIGNhc2UgMzogcmV0dXJuIGZ1bmMuY2FsbCh0aGlzQXJnLCBhcmdzWzBdLCBhcmdzWzFdLCBhcmdzWzJdKTtcbiAgfVxuICByZXR1cm4gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbn1cblxuLyogQnVpbHQtaW4gbWV0aG9kIHJlZmVyZW5jZXMgZm9yIHRob3NlIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBvdGhlciBgbG9kYXNoYCBtZXRob2RzLiAqL1xudmFyIG5hdGl2ZU1heCA9IE1hdGgubWF4O1xuXG4vKipcbiAqIEEgc3BlY2lhbGl6ZWQgdmVyc2lvbiBvZiBgYmFzZVJlc3RgIHdoaWNoIHRyYW5zZm9ybXMgdGhlIHJlc3QgYXJyYXkuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGFwcGx5IGEgcmVzdCBwYXJhbWV0ZXIgdG8uXG4gKiBAcGFyYW0ge251bWJlcn0gW3N0YXJ0PWZ1bmMubGVuZ3RoLTFdIFRoZSBzdGFydCBwb3NpdGlvbiBvZiB0aGUgcmVzdCBwYXJhbWV0ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB0cmFuc2Zvcm0gVGhlIHJlc3QgYXJyYXkgdHJhbnNmb3JtLlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIG92ZXJSZXN0JDEoZnVuYywgc3RhcnQsIHRyYW5zZm9ybSkge1xuICBzdGFydCA9IG5hdGl2ZU1heChzdGFydCA9PT0gdW5kZWZpbmVkID8gKGZ1bmMubGVuZ3RoIC0gMSkgOiBzdGFydCwgMCk7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJncyA9IGFyZ3VtZW50cyxcbiAgICAgICAgaW5kZXggPSAtMSxcbiAgICAgICAgbGVuZ3RoID0gbmF0aXZlTWF4KGFyZ3MubGVuZ3RoIC0gc3RhcnQsIDApLFxuICAgICAgICBhcnJheSA9IEFycmF5KGxlbmd0aCk7XG5cbiAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgYXJyYXlbaW5kZXhdID0gYXJnc1tzdGFydCArIGluZGV4XTtcbiAgICB9XG4gICAgaW5kZXggPSAtMTtcbiAgICB2YXIgb3RoZXJBcmdzID0gQXJyYXkoc3RhcnQgKyAxKTtcbiAgICB3aGlsZSAoKytpbmRleCA8IHN0YXJ0KSB7XG4gICAgICBvdGhlckFyZ3NbaW5kZXhdID0gYXJnc1tpbmRleF07XG4gICAgfVxuICAgIG90aGVyQXJnc1tzdGFydF0gPSB0cmFuc2Zvcm0oYXJyYXkpO1xuICAgIHJldHVybiBhcHBseShmdW5jLCB0aGlzLCBvdGhlckFyZ3MpO1xuICB9O1xufVxuXG4vKipcbiAqIFRoaXMgbWV0aG9kIHJldHVybnMgdGhlIGZpcnN0IGFyZ3VtZW50IGl0IHJlY2VpdmVzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBzaW5jZSAwLjEuMFxuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBVdGlsXG4gKiBAcGFyYW0geyp9IHZhbHVlIEFueSB2YWx1ZS5cbiAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIGB2YWx1ZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBvYmplY3QgPSB7ICdhJzogMSB9O1xuICpcbiAqIGNvbnNvbGUubG9nKF8uaWRlbnRpdHkob2JqZWN0KSA9PT0gb2JqZWN0KTtcbiAqIC8vID0+IHRydWVcbiAqL1xuZnVuY3Rpb24gaWRlbnRpdHkodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vLyBMb2Rhc2ggcmVzdCBmdW5jdGlvbiB3aXRob3V0IGZ1bmN0aW9uLnRvU3RyaW5nKClcbi8vIHJlbWFwcGluZ3NcbmZ1bmN0aW9uIHJlc3QoZnVuYywgc3RhcnQpIHtcbiAgICByZXR1cm4gb3ZlclJlc3QkMShmdW5jLCBzdGFydCwgaWRlbnRpdHkpO1xufVxuXG52YXIgaW5pdGlhbFBhcmFtcyA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiByZXN0KGZ1bmN0aW9uIChhcmdzIC8qLi4uLCBjYWxsYmFjayovKSB7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3MucG9wKCk7XG4gICAgICAgIGZuLmNhbGwodGhpcywgYXJncywgY2FsbGJhY2spO1xuICAgIH0pO1xufTtcblxuZnVuY3Rpb24gYXBwbHlFYWNoJDEoZWFjaGZuKSB7XG4gICAgcmV0dXJuIHJlc3QoZnVuY3Rpb24gKGZucywgYXJncykge1xuICAgICAgICB2YXIgZ28gPSBpbml0aWFsUGFyYW1zKGZ1bmN0aW9uIChhcmdzLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgcmV0dXJuIGVhY2hmbihmbnMsIGZ1bmN0aW9uIChmbiwgY2IpIHtcbiAgICAgICAgICAgICAgICBmbi5hcHBseSh0aGF0LCBhcmdzLmNvbmNhdChjYikpO1xuICAgICAgICAgICAgfSwgY2FsbGJhY2spO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGFyZ3MubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gZ28uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZ287XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBnbG9iYWxgIGZyb20gTm9kZS5qcy4gKi9cbnZhciBmcmVlR2xvYmFsID0gdHlwZW9mIGdsb2JhbCA9PSAnb2JqZWN0JyAmJiBnbG9iYWwgJiYgZ2xvYmFsLk9iamVjdCA9PT0gT2JqZWN0ICYmIGdsb2JhbDtcblxuLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBzZWxmYC4gKi9cbnZhciBmcmVlU2VsZiA9IHR5cGVvZiBzZWxmID09ICdvYmplY3QnICYmIHNlbGYgJiYgc2VsZi5PYmplY3QgPT09IE9iamVjdCAmJiBzZWxmO1xuXG4vKiogVXNlZCBhcyBhIHJlZmVyZW5jZSB0byB0aGUgZ2xvYmFsIG9iamVjdC4gKi9cbnZhciByb290ID0gZnJlZUdsb2JhbCB8fCBmcmVlU2VsZiB8fCBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuXG4vKiogQnVpbHQtaW4gdmFsdWUgcmVmZXJlbmNlcy4gKi9cbnZhciBTeW1ib2wkMSA9IHJvb3QuU3ltYm9sO1xuXG4vKiogVXNlZCBmb3IgYnVpbHQtaW4gbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKiogVXNlZCB0byBjaGVjayBvYmplY3RzIGZvciBvd24gcHJvcGVydGllcy4gKi9cbnZhciBoYXNPd25Qcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5O1xuXG4vKipcbiAqIFVzZWQgdG8gcmVzb2x2ZSB0aGVcbiAqIFtgdG9TdHJpbmdUYWdgXShodHRwOi8vZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi83LjAvI3NlYy1vYmplY3QucHJvdG90eXBlLnRvc3RyaW5nKVxuICogb2YgdmFsdWVzLlxuICovXG52YXIgbmF0aXZlT2JqZWN0VG9TdHJpbmcgPSBvYmplY3RQcm90by50b1N0cmluZztcblxuLyoqIEJ1aWx0LWluIHZhbHVlIHJlZmVyZW5jZXMuICovXG52YXIgc3ltVG9TdHJpbmdUYWckMSA9IFN5bWJvbCQxID8gU3ltYm9sJDEudG9TdHJpbmdUYWcgOiB1bmRlZmluZWQ7XG5cbi8qKlxuICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBiYXNlR2V0VGFnYCB3aGljaCBpZ25vcmVzIGBTeW1ib2wudG9TdHJpbmdUYWdgIHZhbHVlcy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcXVlcnkuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSByYXcgYHRvU3RyaW5nVGFnYC5cbiAqL1xuZnVuY3Rpb24gZ2V0UmF3VGFnKHZhbHVlKSB7XG4gIHZhciBpc093biA9IGhhc093blByb3BlcnR5LmNhbGwodmFsdWUsIHN5bVRvU3RyaW5nVGFnJDEpLFxuICAgICAgdGFnID0gdmFsdWVbc3ltVG9TdHJpbmdUYWckMV07XG5cbiAgdHJ5IHtcbiAgICB2YWx1ZVtzeW1Ub1N0cmluZ1RhZyQxXSA9IHVuZGVmaW5lZDtcbiAgICB2YXIgdW5tYXNrZWQgPSB0cnVlO1xuICB9IGNhdGNoIChlKSB7fVxuXG4gIHZhciByZXN1bHQgPSBuYXRpdmVPYmplY3RUb1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgaWYgKHVubWFza2VkKSB7XG4gICAgaWYgKGlzT3duKSB7XG4gICAgICB2YWx1ZVtzeW1Ub1N0cmluZ1RhZyQxXSA9IHRhZztcbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlIHZhbHVlW3N5bVRvU3RyaW5nVGFnJDFdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKiogVXNlZCBmb3IgYnVpbHQtaW4gbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0UHJvdG8kMSA9IE9iamVjdC5wcm90b3R5cGU7XG5cbi8qKlxuICogVXNlZCB0byByZXNvbHZlIHRoZVxuICogW2B0b1N0cmluZ1RhZ2BdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzcuMC8jc2VjLW9iamVjdC5wcm90b3R5cGUudG9zdHJpbmcpXG4gKiBvZiB2YWx1ZXMuXG4gKi9cbnZhciBuYXRpdmVPYmplY3RUb1N0cmluZyQxID0gb2JqZWN0UHJvdG8kMS50b1N0cmluZztcblxuLyoqXG4gKiBDb252ZXJ0cyBgdmFsdWVgIHRvIGEgc3RyaW5nIHVzaW5nIGBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nYC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY29udmVydC5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIGNvbnZlcnRlZCBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiBuYXRpdmVPYmplY3RUb1N0cmluZyQxLmNhbGwodmFsdWUpO1xufVxuXG4vKiogYE9iamVjdCN0b1N0cmluZ2AgcmVzdWx0IHJlZmVyZW5jZXMuICovXG52YXIgbnVsbFRhZyA9ICdbb2JqZWN0IE51bGxdJztcbnZhciB1bmRlZmluZWRUYWcgPSAnW29iamVjdCBVbmRlZmluZWRdJztcblxuLyoqIEJ1aWx0LWluIHZhbHVlIHJlZmVyZW5jZXMuICovXG52YXIgc3ltVG9TdHJpbmdUYWcgPSBTeW1ib2wkMSA/IFN5bWJvbCQxLnRvU3RyaW5nVGFnIDogdW5kZWZpbmVkO1xuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBnZXRUYWdgIHdpdGhvdXQgZmFsbGJhY2tzIGZvciBidWdneSBlbnZpcm9ubWVudHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHF1ZXJ5LlxuICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgYHRvU3RyaW5nVGFnYC5cbiAqL1xuZnVuY3Rpb24gYmFzZUdldFRhZyh2YWx1ZSkge1xuICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgIHJldHVybiB2YWx1ZSA9PT0gdW5kZWZpbmVkID8gdW5kZWZpbmVkVGFnIDogbnVsbFRhZztcbiAgfVxuICByZXR1cm4gKHN5bVRvU3RyaW5nVGFnICYmIHN5bVRvU3RyaW5nVGFnIGluIE9iamVjdCh2YWx1ZSkpXG4gICAgPyBnZXRSYXdUYWcodmFsdWUpXG4gICAgOiBvYmplY3RUb1N0cmluZyh2YWx1ZSk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlXG4gKiBbbGFuZ3VhZ2UgdHlwZV0oaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzcuMC8jc2VjLWVjbWFzY3JpcHQtbGFuZ3VhZ2UtdHlwZXMpXG4gKiBvZiBgT2JqZWN0YC4gKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAwLjEuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3Qoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KF8ubm9vcCk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdChudWxsKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xuICByZXR1cm4gdmFsdWUgIT0gbnVsbCAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xufVxuXG4vKiogYE9iamVjdCN0b1N0cmluZ2AgcmVzdWx0IHJlZmVyZW5jZXMuICovXG52YXIgYXN5bmNUYWcgPSAnW29iamVjdCBBc3luY0Z1bmN0aW9uXSc7XG52YXIgZnVuY1RhZyA9ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG52YXIgZ2VuVGFnID0gJ1tvYmplY3QgR2VuZXJhdG9yRnVuY3Rpb25dJztcbnZhciBwcm94eVRhZyA9ICdbb2JqZWN0IFByb3h5XSc7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgY2xhc3NpZmllZCBhcyBhIGBGdW5jdGlvbmAgb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgZnVuY3Rpb24sIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc0Z1bmN0aW9uKF8pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNGdW5jdGlvbigvYWJjLyk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICghaXNPYmplY3QodmFsdWUpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vIFRoZSB1c2Ugb2YgYE9iamVjdCN0b1N0cmluZ2AgYXZvaWRzIGlzc3VlcyB3aXRoIHRoZSBgdHlwZW9mYCBvcGVyYXRvclxuICAvLyBpbiBTYWZhcmkgOSB3aGljaCByZXR1cm5zICdvYmplY3QnIGZvciB0eXBlZCBhcnJheXMgYW5kIG90aGVyIGNvbnN0cnVjdG9ycy5cbiAgdmFyIHRhZyA9IGJhc2VHZXRUYWcodmFsdWUpO1xuICByZXR1cm4gdGFnID09IGZ1bmNUYWcgfHwgdGFnID09IGdlblRhZyB8fCB0YWcgPT0gYXN5bmNUYWcgfHwgdGFnID09IHByb3h5VGFnO1xufVxuXG4vKiogVXNlZCBhcyByZWZlcmVuY2VzIGZvciB2YXJpb3VzIGBOdW1iZXJgIGNvbnN0YW50cy4gKi9cbnZhciBNQVhfU0FGRV9JTlRFR0VSID0gOTAwNzE5OTI1NDc0MDk5MTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhIHZhbGlkIGFycmF5LWxpa2UgbGVuZ3RoLlxuICpcbiAqICoqTm90ZToqKiBUaGlzIG1ldGhvZCBpcyBsb29zZWx5IGJhc2VkIG9uXG4gKiBbYFRvTGVuZ3RoYF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNy4wLyNzZWMtdG9sZW5ndGgpLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4wLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgdmFsaWQgbGVuZ3RoLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNMZW5ndGgoMyk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc0xlbmd0aChOdW1iZXIuTUlOX1ZBTFVFKTtcbiAqIC8vID0+IGZhbHNlXG4gKlxuICogXy5pc0xlbmd0aChJbmZpbml0eSk7XG4gKiAvLyA9PiBmYWxzZVxuICpcbiAqIF8uaXNMZW5ndGgoJzMnKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzTGVuZ3RoKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ251bWJlcicgJiZcbiAgICB2YWx1ZSA+IC0xICYmIHZhbHVlICUgMSA9PSAwICYmIHZhbHVlIDw9IE1BWF9TQUZFX0lOVEVHRVI7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYXJyYXktbGlrZS4gQSB2YWx1ZSBpcyBjb25zaWRlcmVkIGFycmF5LWxpa2UgaWYgaXQnc1xuICogbm90IGEgZnVuY3Rpb24gYW5kIGhhcyBhIGB2YWx1ZS5sZW5ndGhgIHRoYXQncyBhbiBpbnRlZ2VyIGdyZWF0ZXIgdGhhbiBvclxuICogZXF1YWwgdG8gYDBgIGFuZCBsZXNzIHRoYW4gb3IgZXF1YWwgdG8gYE51bWJlci5NQVhfU0FGRV9JTlRFR0VSYC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDQuMC4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhcnJheS1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNBcnJheUxpa2UoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzQXJyYXlMaWtlKGRvY3VtZW50LmJvZHkuY2hpbGRyZW4pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNBcnJheUxpa2UoJ2FiYycpO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNBcnJheUxpa2UoXy5ub29wKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlMaWtlKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAhPSBudWxsICYmIGlzTGVuZ3RoKHZhbHVlLmxlbmd0aCkgJiYgIWlzRnVuY3Rpb24odmFsdWUpO1xufVxuXG4vLyBBIHRlbXBvcmFyeSB2YWx1ZSB1c2VkIHRvIGlkZW50aWZ5IGlmIHRoZSBsb29wIHNob3VsZCBiZSBicm9rZW4uXG4vLyBTZWUgIzEwNjQsICMxMjkzXG52YXIgYnJlYWtMb29wID0ge307XG5cbi8qKlxuICogVGhpcyBtZXRob2QgcmV0dXJucyBgdW5kZWZpbmVkYC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDIuMy4wXG4gKiBAY2F0ZWdvcnkgVXRpbFxuICogQGV4YW1wbGVcbiAqXG4gKiBfLnRpbWVzKDIsIF8ubm9vcCk7XG4gKiAvLyA9PiBbdW5kZWZpbmVkLCB1bmRlZmluZWRdXG4gKi9cbmZ1bmN0aW9uIG5vb3AoKSB7XG4gIC8vIE5vIG9wZXJhdGlvbiBwZXJmb3JtZWQuXG59XG5cbmZ1bmN0aW9uIG9uY2UoZm4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoZm4gPT09IG51bGwpIHJldHVybjtcbiAgICAgICAgdmFyIGNhbGxGbiA9IGZuO1xuICAgICAgICBmbiA9IG51bGw7XG4gICAgICAgIGNhbGxGbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG59XG5cbnZhciBpdGVyYXRvclN5bWJvbCA9IHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgU3ltYm9sLml0ZXJhdG9yO1xuXG52YXIgZ2V0SXRlcmF0b3IgPSBmdW5jdGlvbiAoY29sbCkge1xuICAgIHJldHVybiBpdGVyYXRvclN5bWJvbCAmJiBjb2xsW2l0ZXJhdG9yU3ltYm9sXSAmJiBjb2xsW2l0ZXJhdG9yU3ltYm9sXSgpO1xufTtcblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy50aW1lc2Agd2l0aG91dCBzdXBwb3J0IGZvciBpdGVyYXRlZSBzaG9ydGhhbmRzXG4gKiBvciBtYXggYXJyYXkgbGVuZ3RoIGNoZWNrcy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtudW1iZXJ9IG4gVGhlIG51bWJlciBvZiB0aW1lcyB0byBpbnZva2UgYGl0ZXJhdGVlYC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIGFycmF5IG9mIHJlc3VsdHMuXG4gKi9cbmZ1bmN0aW9uIGJhc2VUaW1lcyhuLCBpdGVyYXRlZSkge1xuICB2YXIgaW5kZXggPSAtMSxcbiAgICAgIHJlc3VsdCA9IEFycmF5KG4pO1xuXG4gIHdoaWxlICgrK2luZGV4IDwgbikge1xuICAgIHJlc3VsdFtpbmRleF0gPSBpdGVyYXRlZShpbmRleCk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBvYmplY3QtbGlrZS4gQSB2YWx1ZSBpcyBvYmplY3QtbGlrZSBpZiBpdCdzIG5vdCBgbnVsbGBcbiAqIGFuZCBoYXMgYSBgdHlwZW9mYCByZXN1bHQgb2YgXCJvYmplY3RcIi5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDQuMC4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBvYmplY3QtbGlrZSwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzT2JqZWN0TGlrZSh7fSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdExpa2UoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0TGlrZShfLm5vb3ApO1xuICogLy8gPT4gZmFsc2VcbiAqXG4gKiBfLmlzT2JqZWN0TGlrZShudWxsKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0TGlrZSh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgIT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCc7XG59XG5cbi8qKiBgT2JqZWN0I3RvU3RyaW5nYCByZXN1bHQgcmVmZXJlbmNlcy4gKi9cbnZhciBhcmdzVGFnID0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uaXNBcmd1bWVudHNgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIGBhcmd1bWVudHNgIG9iamVjdCxcbiAqL1xuZnVuY3Rpb24gYmFzZUlzQXJndW1lbnRzKHZhbHVlKSB7XG4gIHJldHVybiBpc09iamVjdExpa2UodmFsdWUpICYmIGJhc2VHZXRUYWcodmFsdWUpID09IGFyZ3NUYWc7XG59XG5cbi8qKiBVc2VkIGZvciBidWlsdC1pbiBtZXRob2QgcmVmZXJlbmNlcy4gKi9cbnZhciBvYmplY3RQcm90byQzID0gT2JqZWN0LnByb3RvdHlwZTtcblxuLyoqIFVzZWQgdG8gY2hlY2sgb2JqZWN0cyBmb3Igb3duIHByb3BlcnRpZXMuICovXG52YXIgaGFzT3duUHJvcGVydHkkMiA9IG9iamVjdFByb3RvJDMuaGFzT3duUHJvcGVydHk7XG5cbi8qKiBCdWlsdC1pbiB2YWx1ZSByZWZlcmVuY2VzLiAqL1xudmFyIHByb3BlcnR5SXNFbnVtZXJhYmxlID0gb2JqZWN0UHJvdG8kMy5wcm9wZXJ0eUlzRW51bWVyYWJsZTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBsaWtlbHkgYW4gYGFyZ3VtZW50c2Agb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIGBhcmd1bWVudHNgIG9iamVjdCxcbiAqICBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNBcmd1bWVudHMoZnVuY3Rpb24oKSB7IHJldHVybiBhcmd1bWVudHM7IH0oKSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc0FyZ3VtZW50cyhbMSwgMiwgM10pO1xuICogLy8gPT4gZmFsc2VcbiAqL1xudmFyIGlzQXJndW1lbnRzID0gYmFzZUlzQXJndW1lbnRzKGZ1bmN0aW9uKCkgeyByZXR1cm4gYXJndW1lbnRzOyB9KCkpID8gYmFzZUlzQXJndW1lbnRzIDogZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgaGFzT3duUHJvcGVydHkkMi5jYWxsKHZhbHVlLCAnY2FsbGVlJykgJiZcbiAgICAhcHJvcGVydHlJc0VudW1lcmFibGUuY2FsbCh2YWx1ZSwgJ2NhbGxlZScpO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGFuIGBBcnJheWAgb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIGFycmF5LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNBcnJheShbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNBcnJheShkb2N1bWVudC5ib2R5LmNoaWxkcmVuKTtcbiAqIC8vID0+IGZhbHNlXG4gKlxuICogXy5pc0FycmF5KCdhYmMnKTtcbiAqIC8vID0+IGZhbHNlXG4gKlxuICogXy5pc0FycmF5KF8ubm9vcCk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cbi8qKlxuICogVGhpcyBtZXRob2QgcmV0dXJucyBgZmFsc2VgLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4xMy4wXG4gKiBAY2F0ZWdvcnkgVXRpbFxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy50aW1lcygyLCBfLnN0dWJGYWxzZSk7XG4gKiAvLyA9PiBbZmFsc2UsIGZhbHNlXVxuICovXG5mdW5jdGlvbiBzdHViRmFsc2UoKSB7XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBleHBvcnRzYC4gKi9cbnZhciBmcmVlRXhwb3J0cyA9IHR5cGVvZiBleHBvcnRzID09ICdvYmplY3QnICYmIGV4cG9ydHMgJiYgIWV4cG9ydHMubm9kZVR5cGUgJiYgZXhwb3J0cztcblxuLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBtb2R1bGVgLiAqL1xudmFyIGZyZWVNb2R1bGUgPSBmcmVlRXhwb3J0cyAmJiB0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZSAmJiAhbW9kdWxlLm5vZGVUeXBlICYmIG1vZHVsZTtcblxuLyoqIERldGVjdCB0aGUgcG9wdWxhciBDb21tb25KUyBleHRlbnNpb24gYG1vZHVsZS5leHBvcnRzYC4gKi9cbnZhciBtb2R1bGVFeHBvcnRzID0gZnJlZU1vZHVsZSAmJiBmcmVlTW9kdWxlLmV4cG9ydHMgPT09IGZyZWVFeHBvcnRzO1xuXG4vKiogQnVpbHQtaW4gdmFsdWUgcmVmZXJlbmNlcy4gKi9cbnZhciBCdWZmZXIgPSBtb2R1bGVFeHBvcnRzID8gcm9vdC5CdWZmZXIgOiB1bmRlZmluZWQ7XG5cbi8qIEJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cbnZhciBuYXRpdmVJc0J1ZmZlciA9IEJ1ZmZlciA/IEJ1ZmZlci5pc0J1ZmZlciA6IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhIGJ1ZmZlci5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDQuMy4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIGJ1ZmZlciwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzQnVmZmVyKG5ldyBCdWZmZXIoMikpO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNCdWZmZXIobmV3IFVpbnQ4QXJyYXkoMikpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xudmFyIGlzQnVmZmVyID0gbmF0aXZlSXNCdWZmZXIgfHwgc3R1YkZhbHNlO1xuXG4vKiogVXNlZCBhcyByZWZlcmVuY2VzIGZvciB2YXJpb3VzIGBOdW1iZXJgIGNvbnN0YW50cy4gKi9cbnZhciBNQVhfU0FGRV9JTlRFR0VSJDEgPSA5MDA3MTk5MjU0NzQwOTkxO1xuXG4vKiogVXNlZCB0byBkZXRlY3QgdW5zaWduZWQgaW50ZWdlciB2YWx1ZXMuICovXG52YXIgcmVJc1VpbnQgPSAvXig/OjB8WzEtOV1cXGQqKSQvO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgdmFsaWQgYXJyYXktbGlrZSBpbmRleC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aD1NQVhfU0FGRV9JTlRFR0VSXSBUaGUgdXBwZXIgYm91bmRzIG9mIGEgdmFsaWQgaW5kZXguXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIHZhbGlkIGluZGV4LCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzSW5kZXgodmFsdWUsIGxlbmd0aCkge1xuICBsZW5ndGggPSBsZW5ndGggPT0gbnVsbCA/IE1BWF9TQUZFX0lOVEVHRVIkMSA6IGxlbmd0aDtcbiAgcmV0dXJuICEhbGVuZ3RoICYmXG4gICAgKHR5cGVvZiB2YWx1ZSA9PSAnbnVtYmVyJyB8fCByZUlzVWludC50ZXN0KHZhbHVlKSkgJiZcbiAgICAodmFsdWUgPiAtMSAmJiB2YWx1ZSAlIDEgPT0gMCAmJiB2YWx1ZSA8IGxlbmd0aCk7XG59XG5cbi8qKiBgT2JqZWN0I3RvU3RyaW5nYCByZXN1bHQgcmVmZXJlbmNlcy4gKi9cbnZhciBhcmdzVGFnJDEgPSAnW29iamVjdCBBcmd1bWVudHNdJztcbnZhciBhcnJheVRhZyA9ICdbb2JqZWN0IEFycmF5XSc7XG52YXIgYm9vbFRhZyA9ICdbb2JqZWN0IEJvb2xlYW5dJztcbnZhciBkYXRlVGFnID0gJ1tvYmplY3QgRGF0ZV0nO1xudmFyIGVycm9yVGFnID0gJ1tvYmplY3QgRXJyb3JdJztcbnZhciBmdW5jVGFnJDEgPSAnW29iamVjdCBGdW5jdGlvbl0nO1xudmFyIG1hcFRhZyA9ICdbb2JqZWN0IE1hcF0nO1xudmFyIG51bWJlclRhZyA9ICdbb2JqZWN0IE51bWJlcl0nO1xudmFyIG9iamVjdFRhZyA9ICdbb2JqZWN0IE9iamVjdF0nO1xudmFyIHJlZ2V4cFRhZyA9ICdbb2JqZWN0IFJlZ0V4cF0nO1xudmFyIHNldFRhZyA9ICdbb2JqZWN0IFNldF0nO1xudmFyIHN0cmluZ1RhZyA9ICdbb2JqZWN0IFN0cmluZ10nO1xudmFyIHdlYWtNYXBUYWcgPSAnW29iamVjdCBXZWFrTWFwXSc7XG5cbnZhciBhcnJheUJ1ZmZlclRhZyA9ICdbb2JqZWN0IEFycmF5QnVmZmVyXSc7XG52YXIgZGF0YVZpZXdUYWcgPSAnW29iamVjdCBEYXRhVmlld10nO1xudmFyIGZsb2F0MzJUYWcgPSAnW29iamVjdCBGbG9hdDMyQXJyYXldJztcbnZhciBmbG9hdDY0VGFnID0gJ1tvYmplY3QgRmxvYXQ2NEFycmF5XSc7XG52YXIgaW50OFRhZyA9ICdbb2JqZWN0IEludDhBcnJheV0nO1xudmFyIGludDE2VGFnID0gJ1tvYmplY3QgSW50MTZBcnJheV0nO1xudmFyIGludDMyVGFnID0gJ1tvYmplY3QgSW50MzJBcnJheV0nO1xudmFyIHVpbnQ4VGFnID0gJ1tvYmplY3QgVWludDhBcnJheV0nO1xudmFyIHVpbnQ4Q2xhbXBlZFRhZyA9ICdbb2JqZWN0IFVpbnQ4Q2xhbXBlZEFycmF5XSc7XG52YXIgdWludDE2VGFnID0gJ1tvYmplY3QgVWludDE2QXJyYXldJztcbnZhciB1aW50MzJUYWcgPSAnW29iamVjdCBVaW50MzJBcnJheV0nO1xuXG4vKiogVXNlZCB0byBpZGVudGlmeSBgdG9TdHJpbmdUYWdgIHZhbHVlcyBvZiB0eXBlZCBhcnJheXMuICovXG52YXIgdHlwZWRBcnJheVRhZ3MgPSB7fTtcbnR5cGVkQXJyYXlUYWdzW2Zsb2F0MzJUYWddID0gdHlwZWRBcnJheVRhZ3NbZmxvYXQ2NFRhZ10gPVxudHlwZWRBcnJheVRhZ3NbaW50OFRhZ10gPSB0eXBlZEFycmF5VGFnc1tpbnQxNlRhZ10gPVxudHlwZWRBcnJheVRhZ3NbaW50MzJUYWddID0gdHlwZWRBcnJheVRhZ3NbdWludDhUYWddID1cbnR5cGVkQXJyYXlUYWdzW3VpbnQ4Q2xhbXBlZFRhZ10gPSB0eXBlZEFycmF5VGFnc1t1aW50MTZUYWddID1cbnR5cGVkQXJyYXlUYWdzW3VpbnQzMlRhZ10gPSB0cnVlO1xudHlwZWRBcnJheVRhZ3NbYXJnc1RhZyQxXSA9IHR5cGVkQXJyYXlUYWdzW2FycmF5VGFnXSA9XG50eXBlZEFycmF5VGFnc1thcnJheUJ1ZmZlclRhZ10gPSB0eXBlZEFycmF5VGFnc1tib29sVGFnXSA9XG50eXBlZEFycmF5VGFnc1tkYXRhVmlld1RhZ10gPSB0eXBlZEFycmF5VGFnc1tkYXRlVGFnXSA9XG50eXBlZEFycmF5VGFnc1tlcnJvclRhZ10gPSB0eXBlZEFycmF5VGFnc1tmdW5jVGFnJDFdID1cbnR5cGVkQXJyYXlUYWdzW21hcFRhZ10gPSB0eXBlZEFycmF5VGFnc1tudW1iZXJUYWddID1cbnR5cGVkQXJyYXlUYWdzW29iamVjdFRhZ10gPSB0eXBlZEFycmF5VGFnc1tyZWdleHBUYWddID1cbnR5cGVkQXJyYXlUYWdzW3NldFRhZ10gPSB0eXBlZEFycmF5VGFnc1tzdHJpbmdUYWddID1cbnR5cGVkQXJyYXlUYWdzW3dlYWtNYXBUYWddID0gZmFsc2U7XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uaXNUeXBlZEFycmF5YCB3aXRob3V0IE5vZGUuanMgb3B0aW1pemF0aW9ucy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIHR5cGVkIGFycmF5LCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGJhc2VJc1R5cGVkQXJyYXkodmFsdWUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0TGlrZSh2YWx1ZSkgJiZcbiAgICBpc0xlbmd0aCh2YWx1ZS5sZW5ndGgpICYmICEhdHlwZWRBcnJheVRhZ3NbYmFzZUdldFRhZyh2YWx1ZSldO1xufVxuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLnVuYXJ5YCB3aXRob3V0IHN1cHBvcnQgZm9yIHN0b3JpbmcgbWV0YWRhdGEuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGNhcCBhcmd1bWVudHMgZm9yLlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgY2FwcGVkIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiBiYXNlVW5hcnkoZnVuYykge1xuICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gZnVuYyh2YWx1ZSk7XG4gIH07XG59XG5cbi8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgZXhwb3J0c2AuICovXG52YXIgZnJlZUV4cG9ydHMkMSA9IHR5cGVvZiBleHBvcnRzID09ICdvYmplY3QnICYmIGV4cG9ydHMgJiYgIWV4cG9ydHMubm9kZVR5cGUgJiYgZXhwb3J0cztcblxuLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBtb2R1bGVgLiAqL1xudmFyIGZyZWVNb2R1bGUkMSA9IGZyZWVFeHBvcnRzJDEgJiYgdHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUgJiYgIW1vZHVsZS5ub2RlVHlwZSAmJiBtb2R1bGU7XG5cbi8qKiBEZXRlY3QgdGhlIHBvcHVsYXIgQ29tbW9uSlMgZXh0ZW5zaW9uIGBtb2R1bGUuZXhwb3J0c2AuICovXG52YXIgbW9kdWxlRXhwb3J0cyQxID0gZnJlZU1vZHVsZSQxICYmIGZyZWVNb2R1bGUkMS5leHBvcnRzID09PSBmcmVlRXhwb3J0cyQxO1xuXG4vKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYHByb2Nlc3NgIGZyb20gTm9kZS5qcy4gKi9cbnZhciBmcmVlUHJvY2VzcyA9IG1vZHVsZUV4cG9ydHMkMSAmJiBmcmVlR2xvYmFsLnByb2Nlc3M7XG5cbi8qKiBVc2VkIHRvIGFjY2VzcyBmYXN0ZXIgTm9kZS5qcyBoZWxwZXJzLiAqL1xudmFyIG5vZGVVdGlsID0gKGZ1bmN0aW9uKCkge1xuICB0cnkge1xuICAgIHJldHVybiBmcmVlUHJvY2VzcyAmJiBmcmVlUHJvY2Vzcy5iaW5kaW5nICYmIGZyZWVQcm9jZXNzLmJpbmRpbmcoJ3V0aWwnKTtcbiAgfSBjYXRjaCAoZSkge31cbn0oKSk7XG5cbi8qIE5vZGUuanMgaGVscGVyIHJlZmVyZW5jZXMuICovXG52YXIgbm9kZUlzVHlwZWRBcnJheSA9IG5vZGVVdGlsICYmIG5vZGVVdGlsLmlzVHlwZWRBcnJheTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGEgdHlwZWQgYXJyYXkuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAzLjAuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSB0eXBlZCBhcnJheSwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzVHlwZWRBcnJheShuZXcgVWludDhBcnJheSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc1R5cGVkQXJyYXkoW10pO1xuICogLy8gPT4gZmFsc2VcbiAqL1xudmFyIGlzVHlwZWRBcnJheSA9IG5vZGVJc1R5cGVkQXJyYXkgPyBiYXNlVW5hcnkobm9kZUlzVHlwZWRBcnJheSkgOiBiYXNlSXNUeXBlZEFycmF5O1xuXG4vKiogVXNlZCBmb3IgYnVpbHQtaW4gbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0UHJvdG8kMiA9IE9iamVjdC5wcm90b3R5cGU7XG5cbi8qKiBVc2VkIHRvIGNoZWNrIG9iamVjdHMgZm9yIG93biBwcm9wZXJ0aWVzLiAqL1xudmFyIGhhc093blByb3BlcnR5JDEgPSBvYmplY3RQcm90byQyLmhhc093blByb3BlcnR5O1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gYXJyYXkgb2YgdGhlIGVudW1lcmFibGUgcHJvcGVydHkgbmFtZXMgb2YgdGhlIGFycmF5LWxpa2UgYHZhbHVlYC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcXVlcnkuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGluaGVyaXRlZCBTcGVjaWZ5IHJldHVybmluZyBpbmhlcml0ZWQgcHJvcGVydHkgbmFtZXMuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIGFycmF5IG9mIHByb3BlcnR5IG5hbWVzLlxuICovXG5mdW5jdGlvbiBhcnJheUxpa2VLZXlzKHZhbHVlLCBpbmhlcml0ZWQpIHtcbiAgdmFyIGlzQXJyID0gaXNBcnJheSh2YWx1ZSksXG4gICAgICBpc0FyZyA9ICFpc0FyciAmJiBpc0FyZ3VtZW50cyh2YWx1ZSksXG4gICAgICBpc0J1ZmYgPSAhaXNBcnIgJiYgIWlzQXJnICYmIGlzQnVmZmVyKHZhbHVlKSxcbiAgICAgIGlzVHlwZSA9ICFpc0FyciAmJiAhaXNBcmcgJiYgIWlzQnVmZiAmJiBpc1R5cGVkQXJyYXkodmFsdWUpLFxuICAgICAgc2tpcEluZGV4ZXMgPSBpc0FyciB8fCBpc0FyZyB8fCBpc0J1ZmYgfHwgaXNUeXBlLFxuICAgICAgcmVzdWx0ID0gc2tpcEluZGV4ZXMgPyBiYXNlVGltZXModmFsdWUubGVuZ3RoLCBTdHJpbmcpIDogW10sXG4gICAgICBsZW5ndGggPSByZXN1bHQubGVuZ3RoO1xuXG4gIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgIGlmICgoaW5oZXJpdGVkIHx8IGhhc093blByb3BlcnR5JDEuY2FsbCh2YWx1ZSwga2V5KSkgJiZcbiAgICAgICAgIShza2lwSW5kZXhlcyAmJiAoXG4gICAgICAgICAgIC8vIFNhZmFyaSA5IGhhcyBlbnVtZXJhYmxlIGBhcmd1bWVudHMubGVuZ3RoYCBpbiBzdHJpY3QgbW9kZS5cbiAgICAgICAgICAga2V5ID09ICdsZW5ndGgnIHx8XG4gICAgICAgICAgIC8vIE5vZGUuanMgMC4xMCBoYXMgZW51bWVyYWJsZSBub24taW5kZXggcHJvcGVydGllcyBvbiBidWZmZXJzLlxuICAgICAgICAgICAoaXNCdWZmICYmIChrZXkgPT0gJ29mZnNldCcgfHwga2V5ID09ICdwYXJlbnQnKSkgfHxcbiAgICAgICAgICAgLy8gUGhhbnRvbUpTIDIgaGFzIGVudW1lcmFibGUgbm9uLWluZGV4IHByb3BlcnRpZXMgb24gdHlwZWQgYXJyYXlzLlxuICAgICAgICAgICAoaXNUeXBlICYmIChrZXkgPT0gJ2J1ZmZlcicgfHwga2V5ID09ICdieXRlTGVuZ3RoJyB8fCBrZXkgPT0gJ2J5dGVPZmZzZXQnKSkgfHxcbiAgICAgICAgICAgLy8gU2tpcCBpbmRleCBwcm9wZXJ0aWVzLlxuICAgICAgICAgICBpc0luZGV4KGtleSwgbGVuZ3RoKVxuICAgICAgICApKSkge1xuICAgICAgcmVzdWx0LnB1c2goa2V5KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIFVzZWQgZm9yIGJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzLiAqL1xudmFyIG9iamVjdFByb3RvJDUgPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGxpa2VseSBhIHByb3RvdHlwZSBvYmplY3QuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSBwcm90b3R5cGUsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNQcm90b3R5cGUodmFsdWUpIHtcbiAgdmFyIEN0b3IgPSB2YWx1ZSAmJiB2YWx1ZS5jb25zdHJ1Y3RvcixcbiAgICAgIHByb3RvID0gKHR5cGVvZiBDdG9yID09ICdmdW5jdGlvbicgJiYgQ3Rvci5wcm90b3R5cGUpIHx8IG9iamVjdFByb3RvJDU7XG5cbiAgcmV0dXJuIHZhbHVlID09PSBwcm90bztcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgdW5hcnkgZnVuY3Rpb24gdGhhdCBpbnZva2VzIGBmdW5jYCB3aXRoIGl0cyBhcmd1bWVudCB0cmFuc2Zvcm1lZC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gd3JhcC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IHRyYW5zZm9ybSBUaGUgYXJndW1lbnQgdHJhbnNmb3JtLlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIG92ZXJBcmcoZnVuYywgdHJhbnNmb3JtKSB7XG4gIHJldHVybiBmdW5jdGlvbihhcmcpIHtcbiAgICByZXR1cm4gZnVuYyh0cmFuc2Zvcm0oYXJnKSk7XG4gIH07XG59XG5cbi8qIEJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cbnZhciBuYXRpdmVLZXlzID0gb3ZlckFyZyhPYmplY3Qua2V5cywgT2JqZWN0KTtcblxuLyoqIFVzZWQgZm9yIGJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzLiAqL1xudmFyIG9iamVjdFByb3RvJDQgPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKiogVXNlZCB0byBjaGVjayBvYmplY3RzIGZvciBvd24gcHJvcGVydGllcy4gKi9cbnZhciBoYXNPd25Qcm9wZXJ0eSQzID0gb2JqZWN0UHJvdG8kNC5oYXNPd25Qcm9wZXJ0eTtcblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5rZXlzYCB3aGljaCBkb2Vzbid0IHRyZWF0IHNwYXJzZSBhcnJheXMgYXMgZGVuc2UuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBxdWVyeS5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgYXJyYXkgb2YgcHJvcGVydHkgbmFtZXMuXG4gKi9cbmZ1bmN0aW9uIGJhc2VLZXlzKG9iamVjdCkge1xuICBpZiAoIWlzUHJvdG90eXBlKG9iamVjdCkpIHtcbiAgICByZXR1cm4gbmF0aXZlS2V5cyhvYmplY3QpO1xuICB9XG4gIHZhciByZXN1bHQgPSBbXTtcbiAgZm9yICh2YXIga2V5IGluIE9iamVjdChvYmplY3QpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5JDMuY2FsbChvYmplY3QsIGtleSkgJiYga2V5ICE9ICdjb25zdHJ1Y3RvcicpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGtleSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBhcnJheSBvZiB0aGUgb3duIGVudW1lcmFibGUgcHJvcGVydHkgbmFtZXMgb2YgYG9iamVjdGAuXG4gKlxuICogKipOb3RlOioqIE5vbi1vYmplY3QgdmFsdWVzIGFyZSBjb2VyY2VkIHRvIG9iamVjdHMuIFNlZSB0aGVcbiAqIFtFUyBzcGVjXShodHRwOi8vZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi83LjAvI3NlYy1vYmplY3Qua2V5cylcbiAqIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogQHN0YXRpY1xuICogQHNpbmNlIDAuMS4wXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IE9iamVjdFxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIHF1ZXJ5LlxuICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBhcnJheSBvZiBwcm9wZXJ0eSBuYW1lcy5cbiAqIEBleGFtcGxlXG4gKlxuICogZnVuY3Rpb24gRm9vKCkge1xuICogICB0aGlzLmEgPSAxO1xuICogICB0aGlzLmIgPSAyO1xuICogfVxuICpcbiAqIEZvby5wcm90b3R5cGUuYyA9IDM7XG4gKlxuICogXy5rZXlzKG5ldyBGb28pO1xuICogLy8gPT4gWydhJywgJ2InXSAoaXRlcmF0aW9uIG9yZGVyIGlzIG5vdCBndWFyYW50ZWVkKVxuICpcbiAqIF8ua2V5cygnaGknKTtcbiAqIC8vID0+IFsnMCcsICcxJ11cbiAqL1xuZnVuY3Rpb24ga2V5cyhvYmplY3QpIHtcbiAgcmV0dXJuIGlzQXJyYXlMaWtlKG9iamVjdCkgPyBhcnJheUxpa2VLZXlzKG9iamVjdCkgOiBiYXNlS2V5cyhvYmplY3QpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVBcnJheUl0ZXJhdG9yKGNvbGwpIHtcbiAgICB2YXIgaSA9IC0xO1xuICAgIHZhciBsZW4gPSBjb2xsLmxlbmd0aDtcbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgICAgcmV0dXJuICsraSA8IGxlbiA/IHsgdmFsdWU6IGNvbGxbaV0sIGtleTogaSB9IDogbnVsbDtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVFUzIwMTVJdGVyYXRvcihpdGVyYXRvcikge1xuICAgIHZhciBpID0gLTE7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgICAgIHZhciBpdGVtID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICBpZiAoaXRlbS5kb25lKSByZXR1cm4gbnVsbDtcbiAgICAgICAgaSsrO1xuICAgICAgICByZXR1cm4geyB2YWx1ZTogaXRlbS52YWx1ZSwga2V5OiBpIH07XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlT2JqZWN0SXRlcmF0b3Iob2JqKSB7XG4gICAgdmFyIG9rZXlzID0ga2V5cyhvYmopO1xuICAgIHZhciBpID0gLTE7XG4gICAgdmFyIGxlbiA9IG9rZXlzLmxlbmd0aDtcbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgICAgdmFyIGtleSA9IG9rZXlzWysraV07XG4gICAgICAgIHJldHVybiBpIDwgbGVuID8geyB2YWx1ZTogb2JqW2tleV0sIGtleToga2V5IH0gOiBudWxsO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGl0ZXJhdG9yKGNvbGwpIHtcbiAgICBpZiAoaXNBcnJheUxpa2UoY29sbCkpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUFycmF5SXRlcmF0b3IoY29sbCk7XG4gICAgfVxuXG4gICAgdmFyIGl0ZXJhdG9yID0gZ2V0SXRlcmF0b3IoY29sbCk7XG4gICAgcmV0dXJuIGl0ZXJhdG9yID8gY3JlYXRlRVMyMDE1SXRlcmF0b3IoaXRlcmF0b3IpIDogY3JlYXRlT2JqZWN0SXRlcmF0b3IoY29sbCk7XG59XG5cbmZ1bmN0aW9uIG9ubHlPbmNlKGZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGZuID09PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoXCJDYWxsYmFjayB3YXMgYWxyZWFkeSBjYWxsZWQuXCIpO1xuICAgICAgICB2YXIgY2FsbEZuID0gZm47XG4gICAgICAgIGZuID0gbnVsbDtcbiAgICAgICAgY2FsbEZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gX2VhY2hPZkxpbWl0KGxpbWl0KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChvYmosIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IG9uY2UoY2FsbGJhY2sgfHwgbm9vcCk7XG4gICAgICAgIGlmIChsaW1pdCA8PSAwIHx8ICFvYmopIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbmV4dEVsZW0gPSBpdGVyYXRvcihvYmopO1xuICAgICAgICB2YXIgZG9uZSA9IGZhbHNlO1xuICAgICAgICB2YXIgcnVubmluZyA9IDA7XG5cbiAgICAgICAgZnVuY3Rpb24gaXRlcmF0ZWVDYWxsYmFjayhlcnIsIHZhbHVlKSB7XG4gICAgICAgICAgICBydW5uaW5nIC09IDE7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgZG9uZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgPT09IGJyZWFrTG9vcCB8fCBkb25lICYmIHJ1bm5pbmcgPD0gMCkge1xuICAgICAgICAgICAgICAgIGRvbmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVwbGVuaXNoKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByZXBsZW5pc2goKSB7XG4gICAgICAgICAgICB3aGlsZSAocnVubmluZyA8IGxpbWl0ICYmICFkb25lKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVsZW0gPSBuZXh0RWxlbSgpO1xuICAgICAgICAgICAgICAgIGlmIChlbGVtID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAocnVubmluZyA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJ1bm5pbmcgKz0gMTtcbiAgICAgICAgICAgICAgICBpdGVyYXRlZShlbGVtLnZhbHVlLCBlbGVtLmtleSwgb25seU9uY2UoaXRlcmF0ZWVDYWxsYmFjaykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmVwbGVuaXNoKCk7XG4gICAgfTtcbn1cblxuLyoqXG4gKiBUaGUgc2FtZSBhcyBbYGVhY2hPZmBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5lYWNoT2Z9IGJ1dCBydW5zIGEgbWF4aW11bSBvZiBgbGltaXRgIGFzeW5jIG9wZXJhdGlvbnMgYXQgYVxuICogdGltZS5cbiAqXG4gKiBAbmFtZSBlYWNoT2ZMaW1pdFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMuZWFjaE9mXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZWFjaE9mfVxuICogQGFsaWFzIGZvckVhY2hPZkxpbWl0XG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtudW1iZXJ9IGxpbWl0IC0gVGhlIG1heGltdW0gbnVtYmVyIG9mIGFzeW5jIG9wZXJhdGlvbnMgYXQgYSB0aW1lLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIGVhY2hcbiAqIGl0ZW0gaW4gYGNvbGxgLiBUaGUgYGtleWAgaXMgdGhlIGl0ZW0ncyBrZXksIG9yIGluZGV4IGluIHRoZSBjYXNlIG9mIGFuXG4gKiBhcnJheS4gVGhlIGl0ZXJhdGVlIGlzIHBhc3NlZCBhIGBjYWxsYmFjayhlcnIpYCB3aGljaCBtdXN0IGJlIGNhbGxlZCBvbmNlIGl0XG4gKiBoYXMgY29tcGxldGVkLiBJZiBubyBlcnJvciBoYXMgb2NjdXJyZWQsIHRoZSBjYWxsYmFjayBzaG91bGQgYmUgcnVuIHdpdGhvdXRcbiAqIGFyZ3VtZW50cyBvciB3aXRoIGFuIGV4cGxpY2l0IGBudWxsYCBhcmd1bWVudC4gSW52b2tlZCB3aXRoXG4gKiAoaXRlbSwga2V5LCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgd2hlbiBhbGxcbiAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gSW52b2tlZCB3aXRoIChlcnIpLlxuICovXG5mdW5jdGlvbiBlYWNoT2ZMaW1pdChjb2xsLCBsaW1pdCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gIF9lYWNoT2ZMaW1pdChsaW1pdCkoY29sbCwgaXRlcmF0ZWUsIGNhbGxiYWNrKTtcbn1cblxuZnVuY3Rpb24gZG9MaW1pdChmbiwgbGltaXQpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGl0ZXJhYmxlLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIGZuKGl0ZXJhYmxlLCBsaW1pdCwgaXRlcmF0ZWUsIGNhbGxiYWNrKTtcbiAgICB9O1xufVxuXG4vLyBlYWNoT2YgaW1wbGVtZW50YXRpb24gb3B0aW1pemVkIGZvciBhcnJheS1saWtlc1xuZnVuY3Rpb24gZWFjaE9mQXJyYXlMaWtlKGNvbGwsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgIGNhbGxiYWNrID0gb25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICB2YXIgaW5kZXggPSAwLFxuICAgICAgICBjb21wbGV0ZWQgPSAwLFxuICAgICAgICBsZW5ndGggPSBjb2xsLmxlbmd0aDtcbiAgICBpZiAobGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGl0ZXJhdG9yQ2FsbGJhY2soZXJyLCB2YWx1ZSkge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9IGVsc2UgaWYgKCsrY29tcGxldGVkID09PSBsZW5ndGggfHwgdmFsdWUgPT09IGJyZWFrTG9vcCkge1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgaXRlcmF0ZWUoY29sbFtpbmRleF0sIGluZGV4LCBvbmx5T25jZShpdGVyYXRvckNhbGxiYWNrKSk7XG4gICAgfVxufVxuXG4vLyBhIGdlbmVyaWMgdmVyc2lvbiBvZiBlYWNoT2Ygd2hpY2ggY2FuIGhhbmRsZSBhcnJheSwgb2JqZWN0LCBhbmQgaXRlcmF0b3IgY2FzZXMuXG52YXIgZWFjaE9mR2VuZXJpYyA9IGRvTGltaXQoZWFjaE9mTGltaXQsIEluZmluaXR5KTtcblxuLyoqXG4gKiBMaWtlIFtgZWFjaGBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5lYWNofSwgZXhjZXB0IHRoYXQgaXQgcGFzc2VzIHRoZSBrZXkgKG9yIGluZGV4KSBhcyB0aGUgc2Vjb25kIGFyZ3VtZW50XG4gKiB0byB0aGUgaXRlcmF0ZWUuXG4gKlxuICogQG5hbWUgZWFjaE9mXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAYWxpYXMgZm9yRWFjaE9mXG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHNlZSBbYXN5bmMuZWFjaF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmVhY2h9XG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEEgZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaFxuICogaXRlbSBpbiBgY29sbGAuIFRoZSBga2V5YCBpcyB0aGUgaXRlbSdzIGtleSwgb3IgaW5kZXggaW4gdGhlIGNhc2Ugb2YgYW5cbiAqIGFycmF5LiBUaGUgaXRlcmF0ZWUgaXMgcGFzc2VkIGEgYGNhbGxiYWNrKGVycilgIHdoaWNoIG11c3QgYmUgY2FsbGVkIG9uY2UgaXRcbiAqIGhhcyBjb21wbGV0ZWQuIElmIG5vIGVycm9yIGhhcyBvY2N1cnJlZCwgdGhlIGNhbGxiYWNrIHNob3VsZCBiZSBydW4gd2l0aG91dFxuICogYXJndW1lbnRzIG9yIHdpdGggYW4gZXhwbGljaXQgYG51bGxgIGFyZ3VtZW50LiBJbnZva2VkIHdpdGhcbiAqIChpdGVtLCBrZXksIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIGFsbFxuICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZCwgb3IgYW4gZXJyb3Igb2NjdXJzLiBJbnZva2VkIHdpdGggKGVycikuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBvYmogPSB7ZGV2OiBcIi9kZXYuanNvblwiLCB0ZXN0OiBcIi90ZXN0Lmpzb25cIiwgcHJvZDogXCIvcHJvZC5qc29uXCJ9O1xuICogdmFyIGNvbmZpZ3MgPSB7fTtcbiAqXG4gKiBhc3luYy5mb3JFYWNoT2Yob2JqLCBmdW5jdGlvbiAodmFsdWUsIGtleSwgY2FsbGJhY2spIHtcbiAqICAgICBmcy5yZWFkRmlsZShfX2Rpcm5hbWUgKyB2YWx1ZSwgXCJ1dGY4XCIsIGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAqICAgICAgICAgaWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gKiAgICAgICAgIHRyeSB7XG4gKiAgICAgICAgICAgICBjb25maWdzW2tleV0gPSBKU09OLnBhcnNlKGRhdGEpO1xuICogICAgICAgICB9IGNhdGNoIChlKSB7XG4gKiAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZSk7XG4gKiAgICAgICAgIH1cbiAqICAgICAgICAgY2FsbGJhY2soKTtcbiAqICAgICB9KTtcbiAqIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICBpZiAoZXJyKSBjb25zb2xlLmVycm9yKGVyci5tZXNzYWdlKTtcbiAqICAgICAvLyBjb25maWdzIGlzIG5vdyBhIG1hcCBvZiBKU09OIGRhdGFcbiAqICAgICBkb1NvbWV0aGluZ1dpdGgoY29uZmlncyk7XG4gKiB9KTtcbiAqL1xudmFyIGVhY2hPZiA9IGZ1bmN0aW9uIChjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgZWFjaE9mSW1wbGVtZW50YXRpb24gPSBpc0FycmF5TGlrZShjb2xsKSA/IGVhY2hPZkFycmF5TGlrZSA6IGVhY2hPZkdlbmVyaWM7XG4gICAgZWFjaE9mSW1wbGVtZW50YXRpb24oY29sbCwgaXRlcmF0ZWUsIGNhbGxiYWNrKTtcbn07XG5cbmZ1bmN0aW9uIGRvUGFyYWxsZWwoZm4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKG9iaiwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBmbihlYWNoT2YsIG9iaiwgaXRlcmF0ZWUsIGNhbGxiYWNrKTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBfYXN5bmNNYXAoZWFjaGZuLCBhcnIsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgbm9vcDtcbiAgICBhcnIgPSBhcnIgfHwgW107XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICB2YXIgY291bnRlciA9IDA7XG5cbiAgICBlYWNoZm4oYXJyLCBmdW5jdGlvbiAodmFsdWUsIF8sIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBpbmRleCA9IGNvdW50ZXIrKztcbiAgICAgICAgaXRlcmF0ZWUodmFsdWUsIGZ1bmN0aW9uIChlcnIsIHYpIHtcbiAgICAgICAgICAgIHJlc3VsdHNbaW5kZXhdID0gdjtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH0pO1xuICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHRzKTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBQcm9kdWNlcyBhIG5ldyBjb2xsZWN0aW9uIG9mIHZhbHVlcyBieSBtYXBwaW5nIGVhY2ggdmFsdWUgaW4gYGNvbGxgIHRocm91Z2hcbiAqIHRoZSBgaXRlcmF0ZWVgIGZ1bmN0aW9uLiBUaGUgYGl0ZXJhdGVlYCBpcyBjYWxsZWQgd2l0aCBhbiBpdGVtIGZyb20gYGNvbGxgXG4gKiBhbmQgYSBjYWxsYmFjayBmb3Igd2hlbiBpdCBoYXMgZmluaXNoZWQgcHJvY2Vzc2luZy4gRWFjaCBvZiB0aGVzZSBjYWxsYmFja1xuICogdGFrZXMgMiBhcmd1bWVudHM6IGFuIGBlcnJvcmAsIGFuZCB0aGUgdHJhbnNmb3JtZWQgaXRlbSBmcm9tIGBjb2xsYC4gSWZcbiAqIGBpdGVyYXRlZWAgcGFzc2VzIGFuIGVycm9yIHRvIGl0cyBjYWxsYmFjaywgdGhlIG1haW4gYGNhbGxiYWNrYCAoZm9yIHRoZVxuICogYG1hcGAgZnVuY3Rpb24pIGlzIGltbWVkaWF0ZWx5IGNhbGxlZCB3aXRoIHRoZSBlcnJvci5cbiAqXG4gKiBOb3RlLCB0aGF0IHNpbmNlIHRoaXMgZnVuY3Rpb24gYXBwbGllcyB0aGUgYGl0ZXJhdGVlYCB0byBlYWNoIGl0ZW0gaW5cbiAqIHBhcmFsbGVsLCB0aGVyZSBpcyBubyBndWFyYW50ZWUgdGhhdCB0aGUgYGl0ZXJhdGVlYCBmdW5jdGlvbnMgd2lsbCBjb21wbGV0ZVxuICogaW4gb3JkZXIuIEhvd2V2ZXIsIHRoZSByZXN1bHRzIGFycmF5IHdpbGwgYmUgaW4gdGhlIHNhbWUgb3JkZXIgYXMgdGhlXG4gKiBvcmlnaW5hbCBgY29sbGAuXG4gKlxuICogSWYgYG1hcGAgaXMgcGFzc2VkIGFuIE9iamVjdCwgdGhlIHJlc3VsdHMgd2lsbCBiZSBhbiBBcnJheS4gIFRoZSByZXN1bHRzXG4gKiB3aWxsIHJvdWdobHkgYmUgaW4gdGhlIG9yZGVyIG9mIHRoZSBvcmlnaW5hbCBPYmplY3RzJyBrZXlzIChidXQgdGhpcyBjYW5cbiAqIHZhcnkgYWNyb3NzIEphdmFTY3JpcHQgZW5naW5lcylcbiAqXG4gKiBAbmFtZSBtYXBcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAqIEBtZXRob2RcbiAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEEgZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaCBpdGVtIGluIGBjb2xsYC5cbiAqIFRoZSBpdGVyYXRlZSBpcyBwYXNzZWQgYSBgY2FsbGJhY2soZXJyLCB0cmFuc2Zvcm1lZClgIHdoaWNoIG11c3QgYmUgY2FsbGVkXG4gKiBvbmNlIGl0IGhhcyBjb21wbGV0ZWQgd2l0aCBhbiBlcnJvciAod2hpY2ggY2FuIGJlIGBudWxsYCkgYW5kIGFcbiAqIHRyYW5zZm9ybWVkIGl0ZW0uIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gYWxsIGBpdGVyYXRlZWBcbiAqIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLCBvciBhbiBlcnJvciBvY2N1cnMuIFJlc3VsdHMgaXMgYW4gQXJyYXkgb2YgdGhlXG4gKiB0cmFuc2Zvcm1lZCBpdGVtcyBmcm9tIHRoZSBgY29sbGAuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHRzKS5cbiAqIEBleGFtcGxlXG4gKlxuICogYXN5bmMubWFwKFsnZmlsZTEnLCdmaWxlMicsJ2ZpbGUzJ10sIGZzLnN0YXQsIGZ1bmN0aW9uKGVyciwgcmVzdWx0cykge1xuICogICAgIC8vIHJlc3VsdHMgaXMgbm93IGFuIGFycmF5IG9mIHN0YXRzIGZvciBlYWNoIGZpbGVcbiAqIH0pO1xuICovXG52YXIgbWFwID0gZG9QYXJhbGxlbChfYXN5bmNNYXApO1xuXG4vKipcbiAqIEFwcGxpZXMgdGhlIHByb3ZpZGVkIGFyZ3VtZW50cyB0byBlYWNoIGZ1bmN0aW9uIGluIHRoZSBhcnJheSwgY2FsbGluZ1xuICogYGNhbGxiYWNrYCBhZnRlciBhbGwgZnVuY3Rpb25zIGhhdmUgY29tcGxldGVkLiBJZiB5b3Ugb25seSBwcm92aWRlIHRoZSBmaXJzdFxuICogYXJndW1lbnQsIGBmbnNgLCB0aGVuIGl0IHdpbGwgcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggbGV0cyB5b3UgcGFzcyBpbiB0aGVcbiAqIGFyZ3VtZW50cyBhcyBpZiBpdCB3ZXJlIGEgc2luZ2xlIGZ1bmN0aW9uIGNhbGwuIElmIG1vcmUgYXJndW1lbnRzIGFyZVxuICogcHJvdmlkZWQsIGBjYWxsYmFja2AgaXMgcmVxdWlyZWQgd2hpbGUgYGFyZ3NgIGlzIHN0aWxsIG9wdGlvbmFsLlxuICpcbiAqIEBuYW1lIGFwcGx5RWFjaFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQG1ldGhvZFxuICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxPYmplY3R9IGZucyAtIEEgY29sbGVjdGlvbiBvZiBhc3luY2hyb25vdXMgZnVuY3Rpb25zXG4gKiB0byBhbGwgY2FsbCB3aXRoIHRoZSBzYW1lIGFyZ3VtZW50c1xuICogQHBhcmFtIHsuLi4qfSBbYXJnc10gLSBhbnkgbnVtYmVyIG9mIHNlcGFyYXRlIGFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZVxuICogZnVuY3Rpb24uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gdGhlIGZpbmFsIGFyZ3VtZW50IHNob3VsZCBiZSB0aGUgY2FsbGJhY2ssXG4gKiBjYWxsZWQgd2hlbiBhbGwgZnVuY3Rpb25zIGhhdmUgY29tcGxldGVkIHByb2Nlc3NpbmcuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IC0gSWYgb25seSB0aGUgZmlyc3QgYXJndW1lbnQsIGBmbnNgLCBpcyBwcm92aWRlZCwgaXQgd2lsbFxuICogcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggbGV0cyB5b3UgcGFzcyBpbiB0aGUgYXJndW1lbnRzIGFzIGlmIGl0IHdlcmUgYSBzaW5nbGVcbiAqIGZ1bmN0aW9uIGNhbGwuIFRoZSBzaWduYXR1cmUgaXMgYCguLmFyZ3MsIGNhbGxiYWNrKWAuIElmIGludm9rZWQgd2l0aCBhbnlcbiAqIGFyZ3VtZW50cywgYGNhbGxiYWNrYCBpcyByZXF1aXJlZC5cbiAqIEBleGFtcGxlXG4gKlxuICogYXN5bmMuYXBwbHlFYWNoKFtlbmFibGVTZWFyY2gsIHVwZGF0ZVNjaGVtYV0sICdidWNrZXQnLCBjYWxsYmFjayk7XG4gKlxuICogLy8gcGFydGlhbCBhcHBsaWNhdGlvbiBleGFtcGxlOlxuICogYXN5bmMuZWFjaChcbiAqICAgICBidWNrZXRzLFxuICogICAgIGFzeW5jLmFwcGx5RWFjaChbZW5hYmxlU2VhcmNoLCB1cGRhdGVTY2hlbWFdKSxcbiAqICAgICBjYWxsYmFja1xuICogKTtcbiAqL1xudmFyIGFwcGx5RWFjaCA9IGFwcGx5RWFjaCQxKG1hcCk7XG5cbmZ1bmN0aW9uIGRvUGFyYWxsZWxMaW1pdChmbikge1xuICAgIHJldHVybiBmdW5jdGlvbiAob2JqLCBsaW1pdCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBmbihfZWFjaE9mTGltaXQobGltaXQpLCBvYmosIGl0ZXJhdGVlLCBjYWxsYmFjayk7XG4gICAgfTtcbn1cblxuLyoqXG4gKiBUaGUgc2FtZSBhcyBbYG1hcGBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5tYXB9IGJ1dCBydW5zIGEgbWF4aW11bSBvZiBgbGltaXRgIGFzeW5jIG9wZXJhdGlvbnMgYXQgYSB0aW1lLlxuICpcbiAqIEBuYW1lIG1hcExpbWl0XG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5tYXBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5tYXB9XG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtudW1iZXJ9IGxpbWl0IC0gVGhlIG1heGltdW0gbnVtYmVyIG9mIGFzeW5jIG9wZXJhdGlvbnMgYXQgYSB0aW1lLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiBgY29sbGAuXG4gKiBUaGUgaXRlcmF0ZWUgaXMgcGFzc2VkIGEgYGNhbGxiYWNrKGVyciwgdHJhbnNmb3JtZWQpYCB3aGljaCBtdXN0IGJlIGNhbGxlZFxuICogb25jZSBpdCBoYXMgY29tcGxldGVkIHdpdGggYW4gZXJyb3IgKHdoaWNoIGNhbiBiZSBgbnVsbGApIGFuZCBhIHRyYW5zZm9ybWVkXG4gKiBpdGVtLiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIGFsbCBgaXRlcmF0ZWVgXG4gKiBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZCwgb3IgYW4gZXJyb3Igb2NjdXJzLiBSZXN1bHRzIGlzIGFuIGFycmF5IG9mIHRoZVxuICogdHJhbnNmb3JtZWQgaXRlbXMgZnJvbSB0aGUgYGNvbGxgLiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0cykuXG4gKi9cbnZhciBtYXBMaW1pdCA9IGRvUGFyYWxsZWxMaW1pdChfYXN5bmNNYXApO1xuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFtgbWFwYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLm1hcH0gYnV0IHJ1bnMgb25seSBhIHNpbmdsZSBhc3luYyBvcGVyYXRpb24gYXQgYSB0aW1lLlxuICpcbiAqIEBuYW1lIG1hcFNlcmllc1xuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMubWFwXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMubWFwfVxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIC0gQSBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW4gYGNvbGxgLlxuICogVGhlIGl0ZXJhdGVlIGlzIHBhc3NlZCBhIGBjYWxsYmFjayhlcnIsIHRyYW5zZm9ybWVkKWAgd2hpY2ggbXVzdCBiZSBjYWxsZWRcbiAqIG9uY2UgaXQgaGFzIGNvbXBsZXRlZCB3aXRoIGFuIGVycm9yICh3aGljaCBjYW4gYmUgYG51bGxgKSBhbmQgYVxuICogdHJhbnNmb3JtZWQgaXRlbS4gSW52b2tlZCB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgd2hlbiBhbGwgYGl0ZXJhdGVlYFxuICogZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gUmVzdWx0cyBpcyBhbiBhcnJheSBvZiB0aGVcbiAqIHRyYW5zZm9ybWVkIGl0ZW1zIGZyb20gdGhlIGBjb2xsYC4gSW52b2tlZCB3aXRoIChlcnIsIHJlc3VsdHMpLlxuICovXG52YXIgbWFwU2VyaWVzID0gZG9MaW1pdChtYXBMaW1pdCwgMSk7XG5cbi8qKlxuICogVGhlIHNhbWUgYXMgW2BhcHBseUVhY2hgXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cuYXBwbHlFYWNofSBidXQgcnVucyBvbmx5IGEgc2luZ2xlIGFzeW5jIG9wZXJhdGlvbiBhdCBhIHRpbWUuXG4gKlxuICogQG5hbWUgYXBwbHlFYWNoU2VyaWVzXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5hcHBseUVhY2hde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5hcHBseUVhY2h9XG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gZm5zIC0gQSBjb2xsZWN0aW9uIG9mIGFzeW5jaHJvbm91cyBmdW5jdGlvbnMgdG8gYWxsXG4gKiBjYWxsIHdpdGggdGhlIHNhbWUgYXJndW1lbnRzXG4gKiBAcGFyYW0gey4uLip9IFthcmdzXSAtIGFueSBudW1iZXIgb2Ygc2VwYXJhdGUgYXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlXG4gKiBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSB0aGUgZmluYWwgYXJndW1lbnQgc2hvdWxkIGJlIHRoZSBjYWxsYmFjayxcbiAqIGNhbGxlZCB3aGVuIGFsbCBmdW5jdGlvbnMgaGF2ZSBjb21wbGV0ZWQgcHJvY2Vzc2luZy5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gLSBJZiBvbmx5IHRoZSBmaXJzdCBhcmd1bWVudCBpcyBwcm92aWRlZCwgaXQgd2lsbCByZXR1cm5cbiAqIGEgZnVuY3Rpb24gd2hpY2ggbGV0cyB5b3UgcGFzcyBpbiB0aGUgYXJndW1lbnRzIGFzIGlmIGl0IHdlcmUgYSBzaW5nbGVcbiAqIGZ1bmN0aW9uIGNhbGwuXG4gKi9cbnZhciBhcHBseUVhY2hTZXJpZXMgPSBhcHBseUVhY2gkMShtYXBTZXJpZXMpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBjb250aW51YXRpb24gZnVuY3Rpb24gd2l0aCBzb21lIGFyZ3VtZW50cyBhbHJlYWR5IGFwcGxpZWQuXG4gKlxuICogVXNlZnVsIGFzIGEgc2hvcnRoYW5kIHdoZW4gY29tYmluZWQgd2l0aCBvdGhlciBjb250cm9sIGZsb3cgZnVuY3Rpb25zLiBBbnlcbiAqIGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIHJldHVybmVkIGZ1bmN0aW9uIGFyZSBhZGRlZCB0byB0aGUgYXJndW1lbnRzXG4gKiBvcmlnaW5hbGx5IHBhc3NlZCB0byBhcHBseS5cbiAqXG4gKiBAbmFtZSBhcHBseVxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpVdGlsc1xuICogQG1ldGhvZFxuICogQGNhdGVnb3J5IFV0aWxcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmN0aW9uIC0gVGhlIGZ1bmN0aW9uIHlvdSB3YW50IHRvIGV2ZW50dWFsbHkgYXBwbHkgYWxsXG4gKiBhcmd1bWVudHMgdG8uIEludm9rZXMgd2l0aCAoYXJndW1lbnRzLi4uKS5cbiAqIEBwYXJhbSB7Li4uKn0gYXJndW1lbnRzLi4uIC0gQW55IG51bWJlciBvZiBhcmd1bWVudHMgdG8gYXV0b21hdGljYWxseSBhcHBseVxuICogd2hlbiB0aGUgY29udGludWF0aW9uIGlzIGNhbGxlZC5cbiAqIEBleGFtcGxlXG4gKlxuICogLy8gdXNpbmcgYXBwbHlcbiAqIGFzeW5jLnBhcmFsbGVsKFtcbiAqICAgICBhc3luYy5hcHBseShmcy53cml0ZUZpbGUsICd0ZXN0ZmlsZTEnLCAndGVzdDEnKSxcbiAqICAgICBhc3luYy5hcHBseShmcy53cml0ZUZpbGUsICd0ZXN0ZmlsZTInLCAndGVzdDInKVxuICogXSk7XG4gKlxuICpcbiAqIC8vIHRoZSBzYW1lIHByb2Nlc3Mgd2l0aG91dCB1c2luZyBhcHBseVxuICogYXN5bmMucGFyYWxsZWwoW1xuICogICAgIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIGZzLndyaXRlRmlsZSgndGVzdGZpbGUxJywgJ3Rlc3QxJywgY2FsbGJhY2spO1xuICogICAgIH0sXG4gKiAgICAgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgZnMud3JpdGVGaWxlKCd0ZXN0ZmlsZTInLCAndGVzdDInLCBjYWxsYmFjayk7XG4gKiAgICAgfVxuICogXSk7XG4gKlxuICogLy8gSXQncyBwb3NzaWJsZSB0byBwYXNzIGFueSBudW1iZXIgb2YgYWRkaXRpb25hbCBhcmd1bWVudHMgd2hlbiBjYWxsaW5nIHRoZVxuICogLy8gY29udGludWF0aW9uOlxuICpcbiAqIG5vZGU+IHZhciBmbiA9IGFzeW5jLmFwcGx5KHN5cy5wdXRzLCAnb25lJyk7XG4gKiBub2RlPiBmbigndHdvJywgJ3RocmVlJyk7XG4gKiBvbmVcbiAqIHR3b1xuICogdGhyZWVcbiAqL1xudmFyIGFwcGx5JDIgPSByZXN0KGZ1bmN0aW9uIChmbiwgYXJncykge1xuICAgIHJldHVybiByZXN0KGZ1bmN0aW9uIChjYWxsQXJncykge1xuICAgICAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgYXJncy5jb25jYXQoY2FsbEFyZ3MpKTtcbiAgICB9KTtcbn0pO1xuXG4vKipcbiAqIFRha2UgYSBzeW5jIGZ1bmN0aW9uIGFuZCBtYWtlIGl0IGFzeW5jLCBwYXNzaW5nIGl0cyByZXR1cm4gdmFsdWUgdG8gYVxuICogY2FsbGJhY2suIFRoaXMgaXMgdXNlZnVsIGZvciBwbHVnZ2luZyBzeW5jIGZ1bmN0aW9ucyBpbnRvIGEgd2F0ZXJmYWxsLFxuICogc2VyaWVzLCBvciBvdGhlciBhc3luYyBmdW5jdGlvbnMuIEFueSBhcmd1bWVudHMgcGFzc2VkIHRvIHRoZSBnZW5lcmF0ZWRcbiAqIGZ1bmN0aW9uIHdpbGwgYmUgcGFzc2VkIHRvIHRoZSB3cmFwcGVkIGZ1bmN0aW9uIChleGNlcHQgZm9yIHRoZSBmaW5hbFxuICogY2FsbGJhY2sgYXJndW1lbnQpLiBFcnJvcnMgdGhyb3duIHdpbGwgYmUgcGFzc2VkIHRvIHRoZSBjYWxsYmFjay5cbiAqXG4gKiBJZiB0aGUgZnVuY3Rpb24gcGFzc2VkIHRvIGBhc3luY2lmeWAgcmV0dXJucyBhIFByb21pc2UsIHRoYXQgcHJvbWlzZXMnc1xuICogcmVzb2x2ZWQvcmVqZWN0ZWQgc3RhdGUgd2lsbCBiZSB1c2VkIHRvIGNhbGwgdGhlIGNhbGxiYWNrLCByYXRoZXIgdGhhbiBzaW1wbHlcbiAqIHRoZSBzeW5jaHJvbm91cyByZXR1cm4gdmFsdWUuXG4gKlxuICogVGhpcyBhbHNvIG1lYW5zIHlvdSBjYW4gYXN5bmNpZnkgRVMyMDE2IGBhc3luY2AgZnVuY3Rpb25zLlxuICpcbiAqIEBuYW1lIGFzeW5jaWZ5XG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOlV0aWxzXG4gKiBAbWV0aG9kXG4gKiBAYWxpYXMgd3JhcFN5bmNcbiAqIEBjYXRlZ29yeSBVdGlsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIC0gVGhlIHN5bmNocm9ub3VzIGZ1bmN0aW9uIHRvIGNvbnZlcnQgdG8gYW5cbiAqIGFzeW5jaHJvbm91cyBmdW5jdGlvbi5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gQW4gYXN5bmNocm9ub3VzIHdyYXBwZXIgb2YgdGhlIGBmdW5jYC4gVG8gYmUgaW52b2tlZCB3aXRoXG4gKiAoY2FsbGJhY2spLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBwYXNzaW5nIGEgcmVndWxhciBzeW5jaHJvbm91cyBmdW5jdGlvblxuICogYXN5bmMud2F0ZXJmYWxsKFtcbiAqICAgICBhc3luYy5hcHBseShmcy5yZWFkRmlsZSwgZmlsZW5hbWUsIFwidXRmOFwiKSxcbiAqICAgICBhc3luYy5hc3luY2lmeShKU09OLnBhcnNlKSxcbiAqICAgICBmdW5jdGlvbiAoZGF0YSwgbmV4dCkge1xuICogICAgICAgICAvLyBkYXRhIGlzIHRoZSByZXN1bHQgb2YgcGFyc2luZyB0aGUgdGV4dC5cbiAqICAgICAgICAgLy8gSWYgdGhlcmUgd2FzIGEgcGFyc2luZyBlcnJvciwgaXQgd291bGQgaGF2ZSBiZWVuIGNhdWdodC5cbiAqICAgICB9XG4gKiBdLCBjYWxsYmFjayk7XG4gKlxuICogLy8gcGFzc2luZyBhIGZ1bmN0aW9uIHJldHVybmluZyBhIHByb21pc2VcbiAqIGFzeW5jLndhdGVyZmFsbChbXG4gKiAgICAgYXN5bmMuYXBwbHkoZnMucmVhZEZpbGUsIGZpbGVuYW1lLCBcInV0ZjhcIiksXG4gKiAgICAgYXN5bmMuYXN5bmNpZnkoZnVuY3Rpb24gKGNvbnRlbnRzKSB7XG4gKiAgICAgICAgIHJldHVybiBkYi5tb2RlbC5jcmVhdGUoY29udGVudHMpO1xuICogICAgIH0pLFxuICogICAgIGZ1bmN0aW9uIChtb2RlbCwgbmV4dCkge1xuICogICAgICAgICAvLyBgbW9kZWxgIGlzIHRoZSBpbnN0YW50aWF0ZWQgbW9kZWwgb2JqZWN0LlxuICogICAgICAgICAvLyBJZiB0aGVyZSB3YXMgYW4gZXJyb3IsIHRoaXMgZnVuY3Rpb24gd291bGQgYmUgc2tpcHBlZC5cbiAqICAgICB9XG4gKiBdLCBjYWxsYmFjayk7XG4gKlxuICogLy8gZXM2IGV4YW1wbGVcbiAqIHZhciBxID0gYXN5bmMucXVldWUoYXN5bmMuYXN5bmNpZnkoYXN5bmMgZnVuY3Rpb24oZmlsZSkge1xuICogICAgIHZhciBpbnRlcm1lZGlhdGVTdGVwID0gYXdhaXQgcHJvY2Vzc0ZpbGUoZmlsZSk7XG4gKiAgICAgcmV0dXJuIGF3YWl0IHNvbWVQcm9taXNlKGludGVybWVkaWF0ZVN0ZXApXG4gKiB9KSk7XG4gKlxuICogcS5wdXNoKGZpbGVzKTtcbiAqL1xuZnVuY3Rpb24gYXN5bmNpZnkoZnVuYykge1xuICAgIHJldHVybiBpbml0aWFsUGFyYW1zKGZ1bmN0aW9uIChhcmdzLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGUpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGlmIHJlc3VsdCBpcyBQcm9taXNlIG9iamVjdFxuICAgICAgICBpZiAoaXNPYmplY3QocmVzdWx0KSAmJiB0eXBlb2YgcmVzdWx0LnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJlc3VsdC50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHZhbHVlKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIubWVzc2FnZSA/IGVyciA6IG5ldyBFcnJvcihlcnIpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG4vKipcbiAqIEEgc3BlY2lhbGl6ZWQgdmVyc2lvbiBvZiBgXy5mb3JFYWNoYCBmb3IgYXJyYXlzIHdpdGhvdXQgc3VwcG9ydCBmb3JcbiAqIGl0ZXJhdGVlIHNob3J0aGFuZHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QXJyYXl9IFthcnJheV0gVGhlIGFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYGFycmF5YC5cbiAqL1xuZnVuY3Rpb24gYXJyYXlFYWNoKGFycmF5LCBpdGVyYXRlZSkge1xuICB2YXIgaW5kZXggPSAtMSxcbiAgICAgIGxlbmd0aCA9IGFycmF5ID09IG51bGwgPyAwIDogYXJyYXkubGVuZ3RoO1xuXG4gIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgaWYgKGl0ZXJhdGVlKGFycmF5W2luZGV4XSwgaW5kZXgsIGFycmF5KSA9PT0gZmFsc2UpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYXJyYXk7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGJhc2UgZnVuY3Rpb24gZm9yIG1ldGhvZHMgbGlrZSBgXy5mb3JJbmAgYW5kIGBfLmZvck93bmAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2Zyb21SaWdodF0gU3BlY2lmeSBpdGVyYXRpbmcgZnJvbSByaWdodCB0byBsZWZ0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgYmFzZSBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlQmFzZUZvcihmcm9tUmlnaHQpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iamVjdCwgaXRlcmF0ZWUsIGtleXNGdW5jKSB7XG4gICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgIGl0ZXJhYmxlID0gT2JqZWN0KG9iamVjdCksXG4gICAgICAgIHByb3BzID0ga2V5c0Z1bmMob2JqZWN0KSxcbiAgICAgICAgbGVuZ3RoID0gcHJvcHMubGVuZ3RoO1xuXG4gICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICB2YXIga2V5ID0gcHJvcHNbZnJvbVJpZ2h0ID8gbGVuZ3RoIDogKytpbmRleF07XG4gICAgICBpZiAoaXRlcmF0ZWUoaXRlcmFibGVba2V5XSwga2V5LCBpdGVyYWJsZSkgPT09IGZhbHNlKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0O1xuICB9O1xufVxuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBiYXNlRm9yT3duYCB3aGljaCBpdGVyYXRlcyBvdmVyIGBvYmplY3RgXG4gKiBwcm9wZXJ0aWVzIHJldHVybmVkIGJ5IGBrZXlzRnVuY2AgYW5kIGludm9rZXMgYGl0ZXJhdGVlYCBmb3IgZWFjaCBwcm9wZXJ0eS5cbiAqIEl0ZXJhdGVlIGZ1bmN0aW9ucyBtYXkgZXhpdCBpdGVyYXRpb24gZWFybHkgYnkgZXhwbGljaXRseSByZXR1cm5pbmcgYGZhbHNlYC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBrZXlzRnVuYyBUaGUgZnVuY3Rpb24gdG8gZ2V0IHRoZSBrZXlzIG9mIGBvYmplY3RgLlxuICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBgb2JqZWN0YC5cbiAqL1xudmFyIGJhc2VGb3IgPSBjcmVhdGVCYXNlRm9yKCk7XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uZm9yT3duYCB3aXRob3V0IHN1cHBvcnQgZm9yIGl0ZXJhdGVlIHNob3J0aGFuZHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBgb2JqZWN0YC5cbiAqL1xuZnVuY3Rpb24gYmFzZUZvck93bihvYmplY3QsIGl0ZXJhdGVlKSB7XG4gIHJldHVybiBvYmplY3QgJiYgYmFzZUZvcihvYmplY3QsIGl0ZXJhdGVlLCBrZXlzKTtcbn1cblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5maW5kSW5kZXhgIGFuZCBgXy5maW5kTGFzdEluZGV4YCB3aXRob3V0XG4gKiBzdXBwb3J0IGZvciBpdGVyYXRlZSBzaG9ydGhhbmRzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gaW5zcGVjdC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IHByZWRpY2F0ZSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICogQHBhcmFtIHtudW1iZXJ9IGZyb21JbmRleCBUaGUgaW5kZXggdG8gc2VhcmNoIGZyb20uXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtmcm9tUmlnaHRdIFNwZWNpZnkgaXRlcmF0aW5nIGZyb20gcmlnaHQgdG8gbGVmdC5cbiAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBtYXRjaGVkIHZhbHVlLCBlbHNlIGAtMWAuXG4gKi9cbmZ1bmN0aW9uIGJhc2VGaW5kSW5kZXgoYXJyYXksIHByZWRpY2F0ZSwgZnJvbUluZGV4LCBmcm9tUmlnaHQpIHtcbiAgdmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aCxcbiAgICAgIGluZGV4ID0gZnJvbUluZGV4ICsgKGZyb21SaWdodCA/IDEgOiAtMSk7XG5cbiAgd2hpbGUgKChmcm9tUmlnaHQgPyBpbmRleC0tIDogKytpbmRleCA8IGxlbmd0aCkpIHtcbiAgICBpZiAocHJlZGljYXRlKGFycmF5W2luZGV4XSwgaW5kZXgsIGFycmF5KSkge1xuICAgICAgcmV0dXJuIGluZGV4O1xuICAgIH1cbiAgfVxuICByZXR1cm4gLTE7XG59XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uaXNOYU5gIHdpdGhvdXQgc3VwcG9ydCBmb3IgbnVtYmVyIG9iamVjdHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYE5hTmAsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gYmFzZUlzTmFOKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAhPT0gdmFsdWU7XG59XG5cbi8qKlxuICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBfLmluZGV4T2ZgIHdoaWNoIHBlcmZvcm1zIHN0cmljdCBlcXVhbGl0eVxuICogY29tcGFyaXNvbnMgb2YgdmFsdWVzLCBpLmUuIGA9PT1gLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gaW5zcGVjdC5cbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHNlYXJjaCBmb3IuXG4gKiBAcGFyYW0ge251bWJlcn0gZnJvbUluZGV4IFRoZSBpbmRleCB0byBzZWFyY2ggZnJvbS5cbiAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBtYXRjaGVkIHZhbHVlLCBlbHNlIGAtMWAuXG4gKi9cbmZ1bmN0aW9uIHN0cmljdEluZGV4T2YoYXJyYXksIHZhbHVlLCBmcm9tSW5kZXgpIHtcbiAgdmFyIGluZGV4ID0gZnJvbUluZGV4IC0gMSxcbiAgICAgIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcblxuICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgIGlmIChhcnJheVtpbmRleF0gPT09IHZhbHVlKSB7XG4gICAgICByZXR1cm4gaW5kZXg7XG4gICAgfVxuICB9XG4gIHJldHVybiAtMTtcbn1cblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5pbmRleE9mYCB3aXRob3V0IGBmcm9tSW5kZXhgIGJvdW5kcyBjaGVja3MuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBpbnNwZWN0LlxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gc2VhcmNoIGZvci5cbiAqIEBwYXJhbSB7bnVtYmVyfSBmcm9tSW5kZXggVGhlIGluZGV4IHRvIHNlYXJjaCBmcm9tLlxuICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIG1hdGNoZWQgdmFsdWUsIGVsc2UgYC0xYC5cbiAqL1xuZnVuY3Rpb24gYmFzZUluZGV4T2YoYXJyYXksIHZhbHVlLCBmcm9tSW5kZXgpIHtcbiAgcmV0dXJuIHZhbHVlID09PSB2YWx1ZVxuICAgID8gc3RyaWN0SW5kZXhPZihhcnJheSwgdmFsdWUsIGZyb21JbmRleClcbiAgICA6IGJhc2VGaW5kSW5kZXgoYXJyYXksIGJhc2VJc05hTiwgZnJvbUluZGV4KTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHRoZSBiZXN0IG9yZGVyIGZvciBydW5uaW5nIHRoZSBmdW5jdGlvbnMgaW4gYHRhc2tzYCwgYmFzZWQgb25cbiAqIHRoZWlyIHJlcXVpcmVtZW50cy4gRWFjaCBmdW5jdGlvbiBjYW4gb3B0aW9uYWxseSBkZXBlbmQgb24gb3RoZXIgZnVuY3Rpb25zXG4gKiBiZWluZyBjb21wbGV0ZWQgZmlyc3QsIGFuZCBlYWNoIGZ1bmN0aW9uIGlzIHJ1biBhcyBzb29uIGFzIGl0cyByZXF1aXJlbWVudHNcbiAqIGFyZSBzYXRpc2ZpZWQuXG4gKlxuICogSWYgYW55IG9mIHRoZSBmdW5jdGlvbnMgcGFzcyBhbiBlcnJvciB0byB0aGVpciBjYWxsYmFjaywgdGhlIGBhdXRvYCBzZXF1ZW5jZVxuICogd2lsbCBzdG9wLiBGdXJ0aGVyIHRhc2tzIHdpbGwgbm90IGV4ZWN1dGUgKHNvIGFueSBvdGhlciBmdW5jdGlvbnMgZGVwZW5kaW5nXG4gKiBvbiBpdCB3aWxsIG5vdCBydW4pLCBhbmQgdGhlIG1haW4gYGNhbGxiYWNrYCBpcyBpbW1lZGlhdGVseSBjYWxsZWQgd2l0aCB0aGVcbiAqIGVycm9yLlxuICpcbiAqIEZ1bmN0aW9ucyBhbHNvIHJlY2VpdmUgYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHJlc3VsdHMgb2YgZnVuY3Rpb25zIHdoaWNoXG4gKiBoYXZlIGNvbXBsZXRlZCBzbyBmYXIgYXMgdGhlIGZpcnN0IGFyZ3VtZW50LCBpZiB0aGV5IGhhdmUgZGVwZW5kZW5jaWVzLiBJZiBhXG4gKiB0YXNrIGZ1bmN0aW9uIGhhcyBubyBkZXBlbmRlbmNpZXMsIGl0IHdpbGwgb25seSBiZSBwYXNzZWQgYSBjYWxsYmFjay5cbiAqXG4gKiBAbmFtZSBhdXRvXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge09iamVjdH0gdGFza3MgLSBBbiBvYmplY3QuIEVhY2ggb2YgaXRzIHByb3BlcnRpZXMgaXMgZWl0aGVyIGFcbiAqIGZ1bmN0aW9uIG9yIGFuIGFycmF5IG9mIHJlcXVpcmVtZW50cywgd2l0aCB0aGUgZnVuY3Rpb24gaXRzZWxmIHRoZSBsYXN0IGl0ZW1cbiAqIGluIHRoZSBhcnJheS4gVGhlIG9iamVjdCdzIGtleSBvZiBhIHByb3BlcnR5IHNlcnZlcyBhcyB0aGUgbmFtZSBvZiB0aGUgdGFza1xuICogZGVmaW5lZCBieSB0aGF0IHByb3BlcnR5LCBpLmUuIGNhbiBiZSB1c2VkIHdoZW4gc3BlY2lmeWluZyByZXF1aXJlbWVudHMgZm9yXG4gKiBvdGhlciB0YXNrcy4gVGhlIGZ1bmN0aW9uIHJlY2VpdmVzIG9uZSBvciB0d28gYXJndW1lbnRzOlxuICogKiBhIGByZXN1bHRzYCBvYmplY3QsIGNvbnRhaW5pbmcgdGhlIHJlc3VsdHMgb2YgdGhlIHByZXZpb3VzbHkgZXhlY3V0ZWRcbiAqICAgZnVuY3Rpb25zLCBvbmx5IHBhc3NlZCBpZiB0aGUgdGFzayBoYXMgYW55IGRlcGVuZGVuY2llcyxcbiAqICogYSBgY2FsbGJhY2soZXJyLCByZXN1bHQpYCBmdW5jdGlvbiwgd2hpY2ggbXVzdCBiZSBjYWxsZWQgd2hlbiBmaW5pc2hlZCxcbiAqICAgcGFzc2luZyBhbiBgZXJyb3JgICh3aGljaCBjYW4gYmUgYG51bGxgKSBhbmQgdGhlIHJlc3VsdCBvZiB0aGUgZnVuY3Rpb24nc1xuICogICBleGVjdXRpb24uXG4gKiBAcGFyYW0ge251bWJlcn0gW2NvbmN1cnJlbmN5PUluZmluaXR5XSAtIEFuIG9wdGlvbmFsIGBpbnRlZ2VyYCBmb3JcbiAqIGRldGVybWluaW5nIHRoZSBtYXhpbXVtIG51bWJlciBvZiB0YXNrcyB0aGF0IGNhbiBiZSBydW4gaW4gcGFyYWxsZWwuIEJ5XG4gKiBkZWZhdWx0LCBhcyBtYW55IGFzIHBvc3NpYmxlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEFuIG9wdGlvbmFsIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIGFsbFxuICogdGhlIHRhc2tzIGhhdmUgYmVlbiBjb21wbGV0ZWQuIEl0IHJlY2VpdmVzIHRoZSBgZXJyYCBhcmd1bWVudCBpZiBhbnkgYHRhc2tzYFxuICogcGFzcyBhbiBlcnJvciB0byB0aGVpciBjYWxsYmFjay4gUmVzdWx0cyBhcmUgYWx3YXlzIHJldHVybmVkOyBob3dldmVyLCBpZiBhblxuICogZXJyb3Igb2NjdXJzLCBubyBmdXJ0aGVyIGB0YXNrc2Agd2lsbCBiZSBwZXJmb3JtZWQsIGFuZCB0aGUgcmVzdWx0cyBvYmplY3RcbiAqIHdpbGwgb25seSBjb250YWluIHBhcnRpYWwgcmVzdWx0cy4gSW52b2tlZCB3aXRoIChlcnIsIHJlc3VsdHMpLlxuICogQHJldHVybnMgdW5kZWZpbmVkXG4gKiBAZXhhbXBsZVxuICpcbiAqIGFzeW5jLmF1dG8oe1xuICogICAgIC8vIHRoaXMgZnVuY3Rpb24gd2lsbCBqdXN0IGJlIHBhc3NlZCBhIGNhbGxiYWNrXG4gKiAgICAgcmVhZERhdGE6IGFzeW5jLmFwcGx5KGZzLnJlYWRGaWxlLCAnZGF0YS50eHQnLCAndXRmLTgnKSxcbiAqICAgICBzaG93RGF0YTogWydyZWFkRGF0YScsIGZ1bmN0aW9uKHJlc3VsdHMsIGNiKSB7XG4gKiAgICAgICAgIC8vIHJlc3VsdHMucmVhZERhdGEgaXMgdGhlIGZpbGUncyBjb250ZW50c1xuICogICAgICAgICAvLyAuLi5cbiAqICAgICB9XVxuICogfSwgY2FsbGJhY2spO1xuICpcbiAqIGFzeW5jLmF1dG8oe1xuICogICAgIGdldF9kYXRhOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICogICAgICAgICBjb25zb2xlLmxvZygnaW4gZ2V0X2RhdGEnKTtcbiAqICAgICAgICAgLy8gYXN5bmMgY29kZSB0byBnZXQgc29tZSBkYXRhXG4gKiAgICAgICAgIGNhbGxiYWNrKG51bGwsICdkYXRhJywgJ2NvbnZlcnRlZCB0byBhcnJheScpO1xuICogICAgIH0sXG4gKiAgICAgbWFrZV9mb2xkZXI6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIGNvbnNvbGUubG9nKCdpbiBtYWtlX2ZvbGRlcicpO1xuICogICAgICAgICAvLyBhc3luYyBjb2RlIHRvIGNyZWF0ZSBhIGRpcmVjdG9yeSB0byBzdG9yZSBhIGZpbGUgaW5cbiAqICAgICAgICAgLy8gdGhpcyBpcyBydW4gYXQgdGhlIHNhbWUgdGltZSBhcyBnZXR0aW5nIHRoZSBkYXRhXG4gKiAgICAgICAgIGNhbGxiYWNrKG51bGwsICdmb2xkZXInKTtcbiAqICAgICB9LFxuICogICAgIHdyaXRlX2ZpbGU6IFsnZ2V0X2RhdGEnLCAnbWFrZV9mb2xkZXInLCBmdW5jdGlvbihyZXN1bHRzLCBjYWxsYmFjaykge1xuICogICAgICAgICBjb25zb2xlLmxvZygnaW4gd3JpdGVfZmlsZScsIEpTT04uc3RyaW5naWZ5KHJlc3VsdHMpKTtcbiAqICAgICAgICAgLy8gb25jZSB0aGVyZSBpcyBzb21lIGRhdGEgYW5kIHRoZSBkaXJlY3RvcnkgZXhpc3RzLFxuICogICAgICAgICAvLyB3cml0ZSB0aGUgZGF0YSB0byBhIGZpbGUgaW4gdGhlIGRpcmVjdG9yeVxuICogICAgICAgICBjYWxsYmFjayhudWxsLCAnZmlsZW5hbWUnKTtcbiAqICAgICB9XSxcbiAqICAgICBlbWFpbF9saW5rOiBbJ3dyaXRlX2ZpbGUnLCBmdW5jdGlvbihyZXN1bHRzLCBjYWxsYmFjaykge1xuICogICAgICAgICBjb25zb2xlLmxvZygnaW4gZW1haWxfbGluaycsIEpTT04uc3RyaW5naWZ5KHJlc3VsdHMpKTtcbiAqICAgICAgICAgLy8gb25jZSB0aGUgZmlsZSBpcyB3cml0dGVuIGxldCdzIGVtYWlsIGEgbGluayB0byBpdC4uLlxuICogICAgICAgICAvLyByZXN1bHRzLndyaXRlX2ZpbGUgY29udGFpbnMgdGhlIGZpbGVuYW1lIHJldHVybmVkIGJ5IHdyaXRlX2ZpbGUuXG4gKiAgICAgICAgIGNhbGxiYWNrKG51bGwsIHsnZmlsZSc6cmVzdWx0cy53cml0ZV9maWxlLCAnZW1haWwnOid1c2VyQGV4YW1wbGUuY29tJ30pO1xuICogICAgIH1dXG4gKiB9LCBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcbiAqICAgICBjb25zb2xlLmxvZygnZXJyID0gJywgZXJyKTtcbiAqICAgICBjb25zb2xlLmxvZygncmVzdWx0cyA9ICcsIHJlc3VsdHMpO1xuICogfSk7XG4gKi9cbnZhciBhdXRvID0gZnVuY3Rpb24gKHRhc2tzLCBjb25jdXJyZW5jeSwgY2FsbGJhY2spIHtcbiAgICBpZiAodHlwZW9mIGNvbmN1cnJlbmN5ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIGNvbmN1cnJlbmN5IGlzIG9wdGlvbmFsLCBzaGlmdCB0aGUgYXJncy5cbiAgICAgICAgY2FsbGJhY2sgPSBjb25jdXJyZW5jeTtcbiAgICAgICAgY29uY3VycmVuY3kgPSBudWxsO1xuICAgIH1cbiAgICBjYWxsYmFjayA9IG9uY2UoY2FsbGJhY2sgfHwgbm9vcCk7XG4gICAgdmFyIGtleXMkJDEgPSBrZXlzKHRhc2tzKTtcbiAgICB2YXIgbnVtVGFza3MgPSBrZXlzJCQxLmxlbmd0aDtcbiAgICBpZiAoIW51bVRhc2tzKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsKTtcbiAgICB9XG4gICAgaWYgKCFjb25jdXJyZW5jeSkge1xuICAgICAgICBjb25jdXJyZW5jeSA9IG51bVRhc2tzO1xuICAgIH1cblxuICAgIHZhciByZXN1bHRzID0ge307XG4gICAgdmFyIHJ1bm5pbmdUYXNrcyA9IDA7XG4gICAgdmFyIGhhc0Vycm9yID0gZmFsc2U7XG5cbiAgICB2YXIgbGlzdGVuZXJzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIHZhciByZWFkeVRhc2tzID0gW107XG5cbiAgICAvLyBmb3IgY3ljbGUgZGV0ZWN0aW9uOlxuICAgIHZhciByZWFkeVRvQ2hlY2sgPSBbXTsgLy8gdGFza3MgdGhhdCBoYXZlIGJlZW4gaWRlbnRpZmllZCBhcyByZWFjaGFibGVcbiAgICAvLyB3aXRob3V0IHRoZSBwb3NzaWJpbGl0eSBvZiByZXR1cm5pbmcgdG8gYW4gYW5jZXN0b3IgdGFza1xuICAgIHZhciB1bmNoZWNrZWREZXBlbmRlbmNpZXMgPSB7fTtcblxuICAgIGJhc2VGb3JPd24odGFza3MsIGZ1bmN0aW9uICh0YXNrLCBrZXkpIHtcbiAgICAgICAgaWYgKCFpc0FycmF5KHRhc2spKSB7XG4gICAgICAgICAgICAvLyBubyBkZXBlbmRlbmNpZXNcbiAgICAgICAgICAgIGVucXVldWVUYXNrKGtleSwgW3Rhc2tdKTtcbiAgICAgICAgICAgIHJlYWR5VG9DaGVjay5wdXNoKGtleSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZGVwZW5kZW5jaWVzID0gdGFzay5zbGljZSgwLCB0YXNrLmxlbmd0aCAtIDEpO1xuICAgICAgICB2YXIgcmVtYWluaW5nRGVwZW5kZW5jaWVzID0gZGVwZW5kZW5jaWVzLmxlbmd0aDtcbiAgICAgICAgaWYgKHJlbWFpbmluZ0RlcGVuZGVuY2llcyA9PT0gMCkge1xuICAgICAgICAgICAgZW5xdWV1ZVRhc2soa2V5LCB0YXNrKTtcbiAgICAgICAgICAgIHJlYWR5VG9DaGVjay5wdXNoKGtleSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdW5jaGVja2VkRGVwZW5kZW5jaWVzW2tleV0gPSByZW1haW5pbmdEZXBlbmRlbmNpZXM7XG5cbiAgICAgICAgYXJyYXlFYWNoKGRlcGVuZGVuY2llcywgZnVuY3Rpb24gKGRlcGVuZGVuY3lOYW1lKSB7XG4gICAgICAgICAgICBpZiAoIXRhc2tzW2RlcGVuZGVuY3lOYW1lXSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignYXN5bmMuYXV0byB0YXNrIGAnICsga2V5ICsgJ2AgaGFzIGEgbm9uLWV4aXN0ZW50IGRlcGVuZGVuY3kgYCcgKyBkZXBlbmRlbmN5TmFtZSArICdgIGluICcgKyBkZXBlbmRlbmNpZXMuam9pbignLCAnKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhZGRMaXN0ZW5lcihkZXBlbmRlbmN5TmFtZSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlbWFpbmluZ0RlcGVuZGVuY2llcy0tO1xuICAgICAgICAgICAgICAgIGlmIChyZW1haW5pbmdEZXBlbmRlbmNpZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZW5xdWV1ZVRhc2soa2V5LCB0YXNrKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBjaGVja0ZvckRlYWRsb2NrcygpO1xuICAgIHByb2Nlc3NRdWV1ZSgpO1xuXG4gICAgZnVuY3Rpb24gZW5xdWV1ZVRhc2soa2V5LCB0YXNrKSB7XG4gICAgICAgIHJlYWR5VGFza3MucHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBydW5UYXNrKGtleSwgdGFzayk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHByb2Nlc3NRdWV1ZSgpIHtcbiAgICAgICAgaWYgKHJlYWR5VGFza3MubGVuZ3RoID09PSAwICYmIHJ1bm5pbmdUYXNrcyA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHJlc3VsdHMpO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChyZWFkeVRhc2tzLmxlbmd0aCAmJiBydW5uaW5nVGFza3MgPCBjb25jdXJyZW5jeSkge1xuICAgICAgICAgICAgdmFyIHJ1biA9IHJlYWR5VGFza3Muc2hpZnQoKTtcbiAgICAgICAgICAgIHJ1bigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkTGlzdGVuZXIodGFza05hbWUsIGZuKSB7XG4gICAgICAgIHZhciB0YXNrTGlzdGVuZXJzID0gbGlzdGVuZXJzW3Rhc2tOYW1lXTtcbiAgICAgICAgaWYgKCF0YXNrTGlzdGVuZXJzKSB7XG4gICAgICAgICAgICB0YXNrTGlzdGVuZXJzID0gbGlzdGVuZXJzW3Rhc2tOYW1lXSA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgdGFza0xpc3RlbmVycy5wdXNoKGZuKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0YXNrQ29tcGxldGUodGFza05hbWUpIHtcbiAgICAgICAgdmFyIHRhc2tMaXN0ZW5lcnMgPSBsaXN0ZW5lcnNbdGFza05hbWVdIHx8IFtdO1xuICAgICAgICBhcnJheUVhY2godGFza0xpc3RlbmVycywgZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICBmbigpO1xuICAgICAgICB9KTtcbiAgICAgICAgcHJvY2Vzc1F1ZXVlKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcnVuVGFzayhrZXksIHRhc2spIHtcbiAgICAgICAgaWYgKGhhc0Vycm9yKSByZXR1cm47XG5cbiAgICAgICAgdmFyIHRhc2tDYWxsYmFjayA9IG9ubHlPbmNlKHJlc3QoZnVuY3Rpb24gKGVyciwgYXJncykge1xuICAgICAgICAgICAgcnVubmluZ1Rhc2tzLS07XG4gICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgIGFyZ3MgPSBhcmdzWzBdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHZhciBzYWZlUmVzdWx0cyA9IHt9O1xuICAgICAgICAgICAgICAgIGJhc2VGb3JPd24ocmVzdWx0cywgZnVuY3Rpb24gKHZhbCwgcmtleSkge1xuICAgICAgICAgICAgICAgICAgICBzYWZlUmVzdWx0c1tya2V5XSA9IHZhbDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzYWZlUmVzdWx0c1trZXldID0gYXJncztcbiAgICAgICAgICAgICAgICBoYXNFcnJvciA9IHRydWU7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgc2FmZVJlc3VsdHMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzW2tleV0gPSBhcmdzO1xuICAgICAgICAgICAgICAgIHRhc2tDb21wbGV0ZShrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSk7XG5cbiAgICAgICAgcnVubmluZ1Rhc2tzKys7XG4gICAgICAgIHZhciB0YXNrRm4gPSB0YXNrW3Rhc2subGVuZ3RoIC0gMV07XG4gICAgICAgIGlmICh0YXNrLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHRhc2tGbihyZXN1bHRzLCB0YXNrQ2FsbGJhY2spO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGFza0ZuKHRhc2tDYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja0ZvckRlYWRsb2NrcygpIHtcbiAgICAgICAgLy8gS2FobidzIGFsZ29yaXRobVxuICAgICAgICAvLyBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9Ub3BvbG9naWNhbF9zb3J0aW5nI0thaG4uMjdzX2FsZ29yaXRobVxuICAgICAgICAvLyBodHRwOi8vY29ubmFsbGUuYmxvZ3Nwb3QuY29tLzIwMTMvMTAvdG9wb2xvZ2ljYWwtc29ydGluZ2thaG4tYWxnb3JpdGhtLmh0bWxcbiAgICAgICAgdmFyIGN1cnJlbnRUYXNrO1xuICAgICAgICB2YXIgY291bnRlciA9IDA7XG4gICAgICAgIHdoaWxlIChyZWFkeVRvQ2hlY2subGVuZ3RoKSB7XG4gICAgICAgICAgICBjdXJyZW50VGFzayA9IHJlYWR5VG9DaGVjay5wb3AoKTtcbiAgICAgICAgICAgIGNvdW50ZXIrKztcbiAgICAgICAgICAgIGFycmF5RWFjaChnZXREZXBlbmRlbnRzKGN1cnJlbnRUYXNrKSwgZnVuY3Rpb24gKGRlcGVuZGVudCkge1xuICAgICAgICAgICAgICAgIGlmICgtLXVuY2hlY2tlZERlcGVuZGVuY2llc1tkZXBlbmRlbnRdID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlYWR5VG9DaGVjay5wdXNoKGRlcGVuZGVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY291bnRlciAhPT0gbnVtVGFza3MpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignYXN5bmMuYXV0byBjYW5ub3QgZXhlY3V0ZSB0YXNrcyBkdWUgdG8gYSByZWN1cnNpdmUgZGVwZW5kZW5jeScpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0RGVwZW5kZW50cyh0YXNrTmFtZSkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICAgIGJhc2VGb3JPd24odGFza3MsIGZ1bmN0aW9uICh0YXNrLCBrZXkpIHtcbiAgICAgICAgICAgIGlmIChpc0FycmF5KHRhc2spICYmIGJhc2VJbmRleE9mKHRhc2ssIHRhc2tOYW1lLCAwKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxufTtcblxuLyoqXG4gKiBBIHNwZWNpYWxpemVkIHZlcnNpb24gb2YgYF8ubWFwYCBmb3IgYXJyYXlzIHdpdGhvdXQgc3VwcG9ydCBmb3IgaXRlcmF0ZWVcbiAqIHNob3J0aGFuZHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QXJyYXl9IFthcnJheV0gVGhlIGFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIG5ldyBtYXBwZWQgYXJyYXkuXG4gKi9cbmZ1bmN0aW9uIGFycmF5TWFwKGFycmF5LCBpdGVyYXRlZSkge1xuICB2YXIgaW5kZXggPSAtMSxcbiAgICAgIGxlbmd0aCA9IGFycmF5ID09IG51bGwgPyAwIDogYXJyYXkubGVuZ3RoLFxuICAgICAgcmVzdWx0ID0gQXJyYXkobGVuZ3RoKTtcblxuICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgIHJlc3VsdFtpbmRleF0gPSBpdGVyYXRlZShhcnJheVtpbmRleF0sIGluZGV4LCBhcnJheSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIGBPYmplY3QjdG9TdHJpbmdgIHJlc3VsdCByZWZlcmVuY2VzLiAqL1xudmFyIHN5bWJvbFRhZyA9ICdbb2JqZWN0IFN5bWJvbF0nO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGNsYXNzaWZpZWQgYXMgYSBgU3ltYm9sYCBwcmltaXRpdmUgb3Igb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4wLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgc3ltYm9sLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNTeW1ib2woU3ltYm9sLml0ZXJhdG9yKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzU3ltYm9sKCdhYmMnKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzU3ltYm9sKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ3N5bWJvbCcgfHxcbiAgICAoaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBiYXNlR2V0VGFnKHZhbHVlKSA9PSBzeW1ib2xUYWcpO1xufVxuXG4vKiogVXNlZCBhcyByZWZlcmVuY2VzIGZvciB2YXJpb3VzIGBOdW1iZXJgIGNvbnN0YW50cy4gKi9cbnZhciBJTkZJTklUWSA9IDEgLyAwO1xuXG4vKiogVXNlZCB0byBjb252ZXJ0IHN5bWJvbHMgdG8gcHJpbWl0aXZlcyBhbmQgc3RyaW5ncy4gKi9cbnZhciBzeW1ib2xQcm90byA9IFN5bWJvbCQxID8gU3ltYm9sJDEucHJvdG90eXBlIDogdW5kZWZpbmVkO1xudmFyIHN5bWJvbFRvU3RyaW5nID0gc3ltYm9sUHJvdG8gPyBzeW1ib2xQcm90by50b1N0cmluZyA6IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy50b1N0cmluZ2Agd2hpY2ggZG9lc24ndCBjb252ZXJ0IG51bGxpc2hcbiAqIHZhbHVlcyB0byBlbXB0eSBzdHJpbmdzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBwcm9jZXNzLlxuICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgc3RyaW5nLlxuICovXG5mdW5jdGlvbiBiYXNlVG9TdHJpbmcodmFsdWUpIHtcbiAgLy8gRXhpdCBlYXJseSBmb3Igc3RyaW5ncyB0byBhdm9pZCBhIHBlcmZvcm1hbmNlIGhpdCBpbiBzb21lIGVudmlyb25tZW50cy5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAvLyBSZWN1cnNpdmVseSBjb252ZXJ0IHZhbHVlcyAoc3VzY2VwdGlibGUgdG8gY2FsbCBzdGFjayBsaW1pdHMpLlxuICAgIHJldHVybiBhcnJheU1hcCh2YWx1ZSwgYmFzZVRvU3RyaW5nKSArICcnO1xuICB9XG4gIGlmIChpc1N5bWJvbCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gc3ltYm9sVG9TdHJpbmcgPyBzeW1ib2xUb1N0cmluZy5jYWxsKHZhbHVlKSA6ICcnO1xuICB9XG4gIHZhciByZXN1bHQgPSAodmFsdWUgKyAnJyk7XG4gIHJldHVybiAocmVzdWx0ID09ICcwJyAmJiAoMSAvIHZhbHVlKSA9PSAtSU5GSU5JVFkpID8gJy0wJyA6IHJlc3VsdDtcbn1cblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5zbGljZWAgd2l0aG91dCBhbiBpdGVyYXRlZSBjYWxsIGd1YXJkLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gc2xpY2UuXG4gKiBAcGFyYW0ge251bWJlcn0gW3N0YXJ0PTBdIFRoZSBzdGFydCBwb3NpdGlvbi5cbiAqIEBwYXJhbSB7bnVtYmVyfSBbZW5kPWFycmF5Lmxlbmd0aF0gVGhlIGVuZCBwb3NpdGlvbi5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgc2xpY2Ugb2YgYGFycmF5YC5cbiAqL1xuZnVuY3Rpb24gYmFzZVNsaWNlKGFycmF5LCBzdGFydCwgZW5kKSB7XG4gIHZhciBpbmRleCA9IC0xLFxuICAgICAgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCA9IC1zdGFydCA+IGxlbmd0aCA/IDAgOiAobGVuZ3RoICsgc3RhcnQpO1xuICB9XG4gIGVuZCA9IGVuZCA+IGxlbmd0aCA/IGxlbmd0aCA6IGVuZDtcbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuZ3RoO1xuICB9XG4gIGxlbmd0aCA9IHN0YXJ0ID4gZW5kID8gMCA6ICgoZW5kIC0gc3RhcnQpID4+PiAwKTtcbiAgc3RhcnQgPj4+PSAwO1xuXG4gIHZhciByZXN1bHQgPSBBcnJheShsZW5ndGgpO1xuICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgIHJlc3VsdFtpbmRleF0gPSBhcnJheVtpbmRleCArIHN0YXJ0XTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIENhc3RzIGBhcnJheWAgdG8gYSBzbGljZSBpZiBpdCdzIG5lZWRlZC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGluc3BlY3QuXG4gKiBAcGFyYW0ge251bWJlcn0gc3RhcnQgVGhlIHN0YXJ0IHBvc2l0aW9uLlxuICogQHBhcmFtIHtudW1iZXJ9IFtlbmQ9YXJyYXkubGVuZ3RoXSBUaGUgZW5kIHBvc2l0aW9uLlxuICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBjYXN0IHNsaWNlLlxuICovXG5mdW5jdGlvbiBjYXN0U2xpY2UoYXJyYXksIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW5ndGggOiBlbmQ7XG4gIHJldHVybiAoIXN0YXJ0ICYmIGVuZCA+PSBsZW5ndGgpID8gYXJyYXkgOiBiYXNlU2xpY2UoYXJyYXksIHN0YXJ0LCBlbmQpO1xufVxuXG4vKipcbiAqIFVzZWQgYnkgYF8udHJpbWAgYW5kIGBfLnRyaW1FbmRgIHRvIGdldCB0aGUgaW5kZXggb2YgdGhlIGxhc3Qgc3RyaW5nIHN5bWJvbFxuICogdGhhdCBpcyBub3QgZm91bmQgaW4gdGhlIGNoYXJhY3RlciBzeW1ib2xzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fSBzdHJTeW1ib2xzIFRoZSBzdHJpbmcgc3ltYm9scyB0byBpbnNwZWN0LlxuICogQHBhcmFtIHtBcnJheX0gY2hyU3ltYm9scyBUaGUgY2hhcmFjdGVyIHN5bWJvbHMgdG8gZmluZC5cbiAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBsYXN0IHVubWF0Y2hlZCBzdHJpbmcgc3ltYm9sLlxuICovXG5mdW5jdGlvbiBjaGFyc0VuZEluZGV4KHN0clN5bWJvbHMsIGNoclN5bWJvbHMpIHtcbiAgdmFyIGluZGV4ID0gc3RyU3ltYm9scy5sZW5ndGg7XG5cbiAgd2hpbGUgKGluZGV4LS0gJiYgYmFzZUluZGV4T2YoY2hyU3ltYm9scywgc3RyU3ltYm9sc1tpbmRleF0sIDApID4gLTEpIHt9XG4gIHJldHVybiBpbmRleDtcbn1cblxuLyoqXG4gKiBVc2VkIGJ5IGBfLnRyaW1gIGFuZCBgXy50cmltU3RhcnRgIHRvIGdldCB0aGUgaW5kZXggb2YgdGhlIGZpcnN0IHN0cmluZyBzeW1ib2xcbiAqIHRoYXQgaXMgbm90IGZvdW5kIGluIHRoZSBjaGFyYWN0ZXIgc3ltYm9scy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtBcnJheX0gc3RyU3ltYm9scyBUaGUgc3RyaW5nIHN5bWJvbHMgdG8gaW5zcGVjdC5cbiAqIEBwYXJhbSB7QXJyYXl9IGNoclN5bWJvbHMgVGhlIGNoYXJhY3RlciBzeW1ib2xzIHRvIGZpbmQuXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBSZXR1cm5zIHRoZSBpbmRleCBvZiB0aGUgZmlyc3QgdW5tYXRjaGVkIHN0cmluZyBzeW1ib2wuXG4gKi9cbmZ1bmN0aW9uIGNoYXJzU3RhcnRJbmRleChzdHJTeW1ib2xzLCBjaHJTeW1ib2xzKSB7XG4gIHZhciBpbmRleCA9IC0xLFxuICAgICAgbGVuZ3RoID0gc3RyU3ltYm9scy5sZW5ndGg7XG5cbiAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGggJiYgYmFzZUluZGV4T2YoY2hyU3ltYm9scywgc3RyU3ltYm9sc1tpbmRleF0sIDApID4gLTEpIHt9XG4gIHJldHVybiBpbmRleDtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhbiBBU0NJSSBgc3RyaW5nYCB0byBhbiBhcnJheS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyBUaGUgc3RyaW5nIHRvIGNvbnZlcnQuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIGNvbnZlcnRlZCBhcnJheS5cbiAqL1xuZnVuY3Rpb24gYXNjaWlUb0FycmF5KHN0cmluZykge1xuICByZXR1cm4gc3RyaW5nLnNwbGl0KCcnKTtcbn1cblxuLyoqIFVzZWQgdG8gY29tcG9zZSB1bmljb2RlIGNoYXJhY3RlciBjbGFzc2VzLiAqL1xudmFyIHJzQXN0cmFsUmFuZ2UgPSAnXFxcXHVkODAwLVxcXFx1ZGZmZic7XG52YXIgcnNDb21ib01hcmtzUmFuZ2UgPSAnXFxcXHUwMzAwLVxcXFx1MDM2Zic7XG52YXIgcmVDb21ib0hhbGZNYXJrc1JhbmdlID0gJ1xcXFx1ZmUyMC1cXFxcdWZlMmYnO1xudmFyIHJzQ29tYm9TeW1ib2xzUmFuZ2UgPSAnXFxcXHUyMGQwLVxcXFx1MjBmZic7XG52YXIgcnNDb21ib1JhbmdlID0gcnNDb21ib01hcmtzUmFuZ2UgKyByZUNvbWJvSGFsZk1hcmtzUmFuZ2UgKyByc0NvbWJvU3ltYm9sc1JhbmdlO1xudmFyIHJzVmFyUmFuZ2UgPSAnXFxcXHVmZTBlXFxcXHVmZTBmJztcblxuLyoqIFVzZWQgdG8gY29tcG9zZSB1bmljb2RlIGNhcHR1cmUgZ3JvdXBzLiAqL1xudmFyIHJzWldKID0gJ1xcXFx1MjAwZCc7XG5cbi8qKiBVc2VkIHRvIGRldGVjdCBzdHJpbmdzIHdpdGggW3plcm8td2lkdGggam9pbmVycyBvciBjb2RlIHBvaW50cyBmcm9tIHRoZSBhc3RyYWwgcGxhbmVzXShodHRwOi8vZWV2LmVlL2Jsb2cvMjAxNS8wOS8xMi9kYXJrLWNvcm5lcnMtb2YtdW5pY29kZS8pLiAqL1xudmFyIHJlSGFzVW5pY29kZSA9IFJlZ0V4cCgnWycgKyByc1pXSiArIHJzQXN0cmFsUmFuZ2UgICsgcnNDb21ib1JhbmdlICsgcnNWYXJSYW5nZSArICddJyk7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGBzdHJpbmdgIGNvbnRhaW5zIFVuaWNvZGUgc3ltYm9scy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyBUaGUgc3RyaW5nIHRvIGluc3BlY3QuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYSBzeW1ib2wgaXMgZm91bmQsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaGFzVW5pY29kZShzdHJpbmcpIHtcbiAgcmV0dXJuIHJlSGFzVW5pY29kZS50ZXN0KHN0cmluZyk7XG59XG5cbi8qKiBVc2VkIHRvIGNvbXBvc2UgdW5pY29kZSBjaGFyYWN0ZXIgY2xhc3Nlcy4gKi9cbnZhciByc0FzdHJhbFJhbmdlJDEgPSAnXFxcXHVkODAwLVxcXFx1ZGZmZic7XG52YXIgcnNDb21ib01hcmtzUmFuZ2UkMSA9ICdcXFxcdTAzMDAtXFxcXHUwMzZmJztcbnZhciByZUNvbWJvSGFsZk1hcmtzUmFuZ2UkMSA9ICdcXFxcdWZlMjAtXFxcXHVmZTJmJztcbnZhciByc0NvbWJvU3ltYm9sc1JhbmdlJDEgPSAnXFxcXHUyMGQwLVxcXFx1MjBmZic7XG52YXIgcnNDb21ib1JhbmdlJDEgPSByc0NvbWJvTWFya3NSYW5nZSQxICsgcmVDb21ib0hhbGZNYXJrc1JhbmdlJDEgKyByc0NvbWJvU3ltYm9sc1JhbmdlJDE7XG52YXIgcnNWYXJSYW5nZSQxID0gJ1xcXFx1ZmUwZVxcXFx1ZmUwZic7XG5cbi8qKiBVc2VkIHRvIGNvbXBvc2UgdW5pY29kZSBjYXB0dXJlIGdyb3Vwcy4gKi9cbnZhciByc0FzdHJhbCA9ICdbJyArIHJzQXN0cmFsUmFuZ2UkMSArICddJztcbnZhciByc0NvbWJvID0gJ1snICsgcnNDb21ib1JhbmdlJDEgKyAnXSc7XG52YXIgcnNGaXR6ID0gJ1xcXFx1ZDgzY1tcXFxcdWRmZmItXFxcXHVkZmZmXSc7XG52YXIgcnNNb2RpZmllciA9ICcoPzonICsgcnNDb21ibyArICd8JyArIHJzRml0eiArICcpJztcbnZhciByc05vbkFzdHJhbCA9ICdbXicgKyByc0FzdHJhbFJhbmdlJDEgKyAnXSc7XG52YXIgcnNSZWdpb25hbCA9ICcoPzpcXFxcdWQ4M2NbXFxcXHVkZGU2LVxcXFx1ZGRmZl0pezJ9JztcbnZhciByc1N1cnJQYWlyID0gJ1tcXFxcdWQ4MDAtXFxcXHVkYmZmXVtcXFxcdWRjMDAtXFxcXHVkZmZmXSc7XG52YXIgcnNaV0okMSA9ICdcXFxcdTIwMGQnO1xuXG4vKiogVXNlZCB0byBjb21wb3NlIHVuaWNvZGUgcmVnZXhlcy4gKi9cbnZhciByZU9wdE1vZCA9IHJzTW9kaWZpZXIgKyAnPyc7XG52YXIgcnNPcHRWYXIgPSAnWycgKyByc1ZhclJhbmdlJDEgKyAnXT8nO1xudmFyIHJzT3B0Sm9pbiA9ICcoPzonICsgcnNaV0okMSArICcoPzonICsgW3JzTm9uQXN0cmFsLCByc1JlZ2lvbmFsLCByc1N1cnJQYWlyXS5qb2luKCd8JykgKyAnKScgKyByc09wdFZhciArIHJlT3B0TW9kICsgJykqJztcbnZhciByc1NlcSA9IHJzT3B0VmFyICsgcmVPcHRNb2QgKyByc09wdEpvaW47XG52YXIgcnNTeW1ib2wgPSAnKD86JyArIFtyc05vbkFzdHJhbCArIHJzQ29tYm8gKyAnPycsIHJzQ29tYm8sIHJzUmVnaW9uYWwsIHJzU3VyclBhaXIsIHJzQXN0cmFsXS5qb2luKCd8JykgKyAnKSc7XG5cbi8qKiBVc2VkIHRvIG1hdGNoIFtzdHJpbmcgc3ltYm9sc10oaHR0cHM6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtdW5pY29kZSkuICovXG52YXIgcmVVbmljb2RlID0gUmVnRXhwKHJzRml0eiArICcoPz0nICsgcnNGaXR6ICsgJyl8JyArIHJzU3ltYm9sICsgcnNTZXEsICdnJyk7XG5cbi8qKlxuICogQ29udmVydHMgYSBVbmljb2RlIGBzdHJpbmdgIHRvIGFuIGFycmF5LlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFRoZSBzdHJpbmcgdG8gY29udmVydC5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgY29udmVydGVkIGFycmF5LlxuICovXG5mdW5jdGlvbiB1bmljb2RlVG9BcnJheShzdHJpbmcpIHtcbiAgcmV0dXJuIHN0cmluZy5tYXRjaChyZVVuaWNvZGUpIHx8IFtdO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGBzdHJpbmdgIHRvIGFuIGFycmF5LlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFRoZSBzdHJpbmcgdG8gY29udmVydC5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgY29udmVydGVkIGFycmF5LlxuICovXG5mdW5jdGlvbiBzdHJpbmdUb0FycmF5KHN0cmluZykge1xuICByZXR1cm4gaGFzVW5pY29kZShzdHJpbmcpXG4gICAgPyB1bmljb2RlVG9BcnJheShzdHJpbmcpXG4gICAgOiBhc2NpaVRvQXJyYXkoc3RyaW5nKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBgdmFsdWVgIHRvIGEgc3RyaW5nLiBBbiBlbXB0eSBzdHJpbmcgaXMgcmV0dXJuZWQgZm9yIGBudWxsYFxuICogYW5kIGB1bmRlZmluZWRgIHZhbHVlcy4gVGhlIHNpZ24gb2YgYC0wYCBpcyBwcmVzZXJ2ZWQuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSA0LjAuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNvbnZlcnQuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBjb252ZXJ0ZWQgc3RyaW5nLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLnRvU3RyaW5nKG51bGwpO1xuICogLy8gPT4gJydcbiAqXG4gKiBfLnRvU3RyaW5nKC0wKTtcbiAqIC8vID0+ICctMCdcbiAqXG4gKiBfLnRvU3RyaW5nKFsxLCAyLCAzXSk7XG4gKiAvLyA9PiAnMSwyLDMnXG4gKi9cbmZ1bmN0aW9uIHRvU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSA9PSBudWxsID8gJycgOiBiYXNlVG9TdHJpbmcodmFsdWUpO1xufVxuXG4vKiogVXNlZCB0byBtYXRjaCBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlLiAqL1xudmFyIHJlVHJpbSA9IC9eXFxzK3xcXHMrJC9nO1xuXG4vKipcbiAqIFJlbW92ZXMgbGVhZGluZyBhbmQgdHJhaWxpbmcgd2hpdGVzcGFjZSBvciBzcGVjaWZpZWQgY2hhcmFjdGVycyBmcm9tIGBzdHJpbmdgLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMy4wLjBcbiAqIEBjYXRlZ29yeSBTdHJpbmdcbiAqIEBwYXJhbSB7c3RyaW5nfSBbc3RyaW5nPScnXSBUaGUgc3RyaW5nIHRvIHRyaW0uXG4gKiBAcGFyYW0ge3N0cmluZ30gW2NoYXJzPXdoaXRlc3BhY2VdIFRoZSBjaGFyYWN0ZXJzIHRvIHRyaW0uXG4gKiBAcGFyYW0tIHtPYmplY3R9IFtndWFyZF0gRW5hYmxlcyB1c2UgYXMgYW4gaXRlcmF0ZWUgZm9yIG1ldGhvZHMgbGlrZSBgXy5tYXBgLlxuICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgdHJpbW1lZCBzdHJpbmcuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8udHJpbSgnICBhYmMgICcpO1xuICogLy8gPT4gJ2FiYydcbiAqXG4gKiBfLnRyaW0oJy1fLWFiYy1fLScsICdfLScpO1xuICogLy8gPT4gJ2FiYydcbiAqXG4gKiBfLm1hcChbJyAgZm9vICAnLCAnICBiYXIgICddLCBfLnRyaW0pO1xuICogLy8gPT4gWydmb28nLCAnYmFyJ11cbiAqL1xuZnVuY3Rpb24gdHJpbShzdHJpbmcsIGNoYXJzLCBndWFyZCkge1xuICBzdHJpbmcgPSB0b1N0cmluZyhzdHJpbmcpO1xuICBpZiAoc3RyaW5nICYmIChndWFyZCB8fCBjaGFycyA9PT0gdW5kZWZpbmVkKSkge1xuICAgIHJldHVybiBzdHJpbmcucmVwbGFjZShyZVRyaW0sICcnKTtcbiAgfVxuICBpZiAoIXN0cmluZyB8fCAhKGNoYXJzID0gYmFzZVRvU3RyaW5nKGNoYXJzKSkpIHtcbiAgICByZXR1cm4gc3RyaW5nO1xuICB9XG4gIHZhciBzdHJTeW1ib2xzID0gc3RyaW5nVG9BcnJheShzdHJpbmcpLFxuICAgICAgY2hyU3ltYm9scyA9IHN0cmluZ1RvQXJyYXkoY2hhcnMpLFxuICAgICAgc3RhcnQgPSBjaGFyc1N0YXJ0SW5kZXgoc3RyU3ltYm9scywgY2hyU3ltYm9scyksXG4gICAgICBlbmQgPSBjaGFyc0VuZEluZGV4KHN0clN5bWJvbHMsIGNoclN5bWJvbHMpICsgMTtcblxuICByZXR1cm4gY2FzdFNsaWNlKHN0clN5bWJvbHMsIHN0YXJ0LCBlbmQpLmpvaW4oJycpO1xufVxuXG52YXIgRk5fQVJHUyA9IC9eKGZ1bmN0aW9uKT9cXHMqW15cXChdKlxcKFxccyooW15cXCldKilcXCkvbTtcbnZhciBGTl9BUkdfU1BMSVQgPSAvLC87XG52YXIgRk5fQVJHID0gLyg9LispPyhcXHMqKSQvO1xudmFyIFNUUklQX0NPTU1FTlRTID0gLygoXFwvXFwvLiokKXwoXFwvXFwqW1xcc1xcU10qP1xcKlxcLykpL21nO1xuXG5mdW5jdGlvbiBwYXJzZVBhcmFtcyhmdW5jKSB7XG4gICAgZnVuYyA9IGZ1bmMudG9TdHJpbmcoKS5yZXBsYWNlKFNUUklQX0NPTU1FTlRTLCAnJyk7XG4gICAgZnVuYyA9IGZ1bmMubWF0Y2goRk5fQVJHUylbMl0ucmVwbGFjZSgnICcsICcnKTtcbiAgICBmdW5jID0gZnVuYyA/IGZ1bmMuc3BsaXQoRk5fQVJHX1NQTElUKSA6IFtdO1xuICAgIGZ1bmMgPSBmdW5jLm1hcChmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgIHJldHVybiB0cmltKGFyZy5yZXBsYWNlKEZOX0FSRywgJycpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gZnVuYztcbn1cblxuLyoqXG4gKiBBIGRlcGVuZGVuY3ktaW5qZWN0ZWQgdmVyc2lvbiBvZiB0aGUgW2FzeW5jLmF1dG9de0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5hdXRvfSBmdW5jdGlvbi4gRGVwZW5kZW50XG4gKiB0YXNrcyBhcmUgc3BlY2lmaWVkIGFzIHBhcmFtZXRlcnMgdG8gdGhlIGZ1bmN0aW9uLCBhZnRlciB0aGUgdXN1YWwgY2FsbGJhY2tcbiAqIHBhcmFtZXRlciwgd2l0aCB0aGUgcGFyYW1ldGVyIG5hbWVzIG1hdGNoaW5nIHRoZSBuYW1lcyBvZiB0aGUgdGFza3MgaXRcbiAqIGRlcGVuZHMgb24uIFRoaXMgY2FuIHByb3ZpZGUgZXZlbiBtb3JlIHJlYWRhYmxlIHRhc2sgZ3JhcGhzIHdoaWNoIGNhbiBiZVxuICogZWFzaWVyIHRvIG1haW50YWluLlxuICpcbiAqIElmIGEgZmluYWwgY2FsbGJhY2sgaXMgc3BlY2lmaWVkLCB0aGUgdGFzayByZXN1bHRzIGFyZSBzaW1pbGFybHkgaW5qZWN0ZWQsXG4gKiBzcGVjaWZpZWQgYXMgbmFtZWQgcGFyYW1ldGVycyBhZnRlciB0aGUgaW5pdGlhbCBlcnJvciBwYXJhbWV0ZXIuXG4gKlxuICogVGhlIGF1dG9JbmplY3QgZnVuY3Rpb24gaXMgcHVyZWx5IHN5bnRhY3RpYyBzdWdhciBhbmQgaXRzIHNlbWFudGljcyBhcmVcbiAqIG90aGVyd2lzZSBlcXVpdmFsZW50IHRvIFthc3luYy5hdXRvXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cuYXV0b30uXG4gKlxuICogQG5hbWUgYXV0b0luamVjdFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMuYXV0b117QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LmF1dG99XG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge09iamVjdH0gdGFza3MgLSBBbiBvYmplY3QsIGVhY2ggb2Ygd2hvc2UgcHJvcGVydGllcyBpcyBhIGZ1bmN0aW9uIG9mXG4gKiB0aGUgZm9ybSAnZnVuYyhbZGVwZW5kZW5jaWVzLi4uXSwgY2FsbGJhY2spLiBUaGUgb2JqZWN0J3Mga2V5IG9mIGEgcHJvcGVydHlcbiAqIHNlcnZlcyBhcyB0aGUgbmFtZSBvZiB0aGUgdGFzayBkZWZpbmVkIGJ5IHRoYXQgcHJvcGVydHksIGkuZS4gY2FuIGJlIHVzZWRcbiAqIHdoZW4gc3BlY2lmeWluZyByZXF1aXJlbWVudHMgZm9yIG90aGVyIHRhc2tzLlxuICogKiBUaGUgYGNhbGxiYWNrYCBwYXJhbWV0ZXIgaXMgYSBgY2FsbGJhY2soZXJyLCByZXN1bHQpYCB3aGljaCBtdXN0IGJlIGNhbGxlZFxuICogICB3aGVuIGZpbmlzaGVkLCBwYXNzaW5nIGFuIGBlcnJvcmAgKHdoaWNoIGNhbiBiZSBgbnVsbGApIGFuZCB0aGUgcmVzdWx0IG9mXG4gKiAgIHRoZSBmdW5jdGlvbidzIGV4ZWN1dGlvbi4gVGhlIHJlbWFpbmluZyBwYXJhbWV0ZXJzIG5hbWUgb3RoZXIgdGFza3Mgb25cbiAqICAgd2hpY2ggdGhlIHRhc2sgaXMgZGVwZW5kZW50LCBhbmQgdGhlIHJlc3VsdHMgZnJvbSB0aG9zZSB0YXNrcyBhcmUgdGhlXG4gKiAgIGFyZ3VtZW50cyBvZiB0aG9zZSBwYXJhbWV0ZXJzLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEFuIG9wdGlvbmFsIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIGFsbFxuICogdGhlIHRhc2tzIGhhdmUgYmVlbiBjb21wbGV0ZWQuIEl0IHJlY2VpdmVzIHRoZSBgZXJyYCBhcmd1bWVudCBpZiBhbnkgYHRhc2tzYFxuICogcGFzcyBhbiBlcnJvciB0byB0aGVpciBjYWxsYmFjaywgYW5kIGEgYHJlc3VsdHNgIG9iamVjdCB3aXRoIGFueSBjb21wbGV0ZWRcbiAqIHRhc2sgcmVzdWx0cywgc2ltaWxhciB0byBgYXV0b2AuXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vICBUaGUgZXhhbXBsZSBmcm9tIGBhdXRvYCBjYW4gYmUgcmV3cml0dGVuIGFzIGZvbGxvd3M6XG4gKiBhc3luYy5hdXRvSW5qZWN0KHtcbiAqICAgICBnZXRfZGF0YTogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgLy8gYXN5bmMgY29kZSB0byBnZXQgc29tZSBkYXRhXG4gKiAgICAgICAgIGNhbGxiYWNrKG51bGwsICdkYXRhJywgJ2NvbnZlcnRlZCB0byBhcnJheScpO1xuICogICAgIH0sXG4gKiAgICAgbWFrZV9mb2xkZXI6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIC8vIGFzeW5jIGNvZGUgdG8gY3JlYXRlIGEgZGlyZWN0b3J5IHRvIHN0b3JlIGEgZmlsZSBpblxuICogICAgICAgICAvLyB0aGlzIGlzIHJ1biBhdCB0aGUgc2FtZSB0aW1lIGFzIGdldHRpbmcgdGhlIGRhdGFcbiAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ2ZvbGRlcicpO1xuICogICAgIH0sXG4gKiAgICAgd3JpdGVfZmlsZTogZnVuY3Rpb24oZ2V0X2RhdGEsIG1ha2VfZm9sZGVyLCBjYWxsYmFjaykge1xuICogICAgICAgICAvLyBvbmNlIHRoZXJlIGlzIHNvbWUgZGF0YSBhbmQgdGhlIGRpcmVjdG9yeSBleGlzdHMsXG4gKiAgICAgICAgIC8vIHdyaXRlIHRoZSBkYXRhIHRvIGEgZmlsZSBpbiB0aGUgZGlyZWN0b3J5XG4gKiAgICAgICAgIGNhbGxiYWNrKG51bGwsICdmaWxlbmFtZScpO1xuICogICAgIH0sXG4gKiAgICAgZW1haWxfbGluazogZnVuY3Rpb24od3JpdGVfZmlsZSwgY2FsbGJhY2spIHtcbiAqICAgICAgICAgLy8gb25jZSB0aGUgZmlsZSBpcyB3cml0dGVuIGxldCdzIGVtYWlsIGEgbGluayB0byBpdC4uLlxuICogICAgICAgICAvLyB3cml0ZV9maWxlIGNvbnRhaW5zIHRoZSBmaWxlbmFtZSByZXR1cm5lZCBieSB3cml0ZV9maWxlLlxuICogICAgICAgICBjYWxsYmFjayhudWxsLCB7J2ZpbGUnOndyaXRlX2ZpbGUsICdlbWFpbCc6J3VzZXJAZXhhbXBsZS5jb20nfSk7XG4gKiAgICAgfVxuICogfSwgZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gKiAgICAgY29uc29sZS5sb2coJ2VyciA9ICcsIGVycik7XG4gKiAgICAgY29uc29sZS5sb2coJ2VtYWlsX2xpbmsgPSAnLCByZXN1bHRzLmVtYWlsX2xpbmspO1xuICogfSk7XG4gKlxuICogLy8gSWYgeW91IGFyZSB1c2luZyBhIEpTIG1pbmlmaWVyIHRoYXQgbWFuZ2xlcyBwYXJhbWV0ZXIgbmFtZXMsIGBhdXRvSW5qZWN0YFxuICogLy8gd2lsbCBub3Qgd29yayB3aXRoIHBsYWluIGZ1bmN0aW9ucywgc2luY2UgdGhlIHBhcmFtZXRlciBuYW1lcyB3aWxsIGJlXG4gKiAvLyBjb2xsYXBzZWQgdG8gYSBzaW5nbGUgbGV0dGVyIGlkZW50aWZpZXIuICBUbyB3b3JrIGFyb3VuZCB0aGlzLCB5b3UgY2FuXG4gKiAvLyBleHBsaWNpdGx5IHNwZWNpZnkgdGhlIG5hbWVzIG9mIHRoZSBwYXJhbWV0ZXJzIHlvdXIgdGFzayBmdW5jdGlvbiBuZWVkc1xuICogLy8gaW4gYW4gYXJyYXksIHNpbWlsYXIgdG8gQW5ndWxhci5qcyBkZXBlbmRlbmN5IGluamVjdGlvbi5cbiAqXG4gKiAvLyBUaGlzIHN0aWxsIGhhcyBhbiBhZHZhbnRhZ2Ugb3ZlciBwbGFpbiBgYXV0b2AsIHNpbmNlIHRoZSByZXN1bHRzIGEgdGFza1xuICogLy8gZGVwZW5kcyBvbiBhcmUgc3RpbGwgc3ByZWFkIGludG8gYXJndW1lbnRzLlxuICogYXN5bmMuYXV0b0luamVjdCh7XG4gKiAgICAgLy8uLi5cbiAqICAgICB3cml0ZV9maWxlOiBbJ2dldF9kYXRhJywgJ21ha2VfZm9sZGVyJywgZnVuY3Rpb24oZ2V0X2RhdGEsIG1ha2VfZm9sZGVyLCBjYWxsYmFjaykge1xuICogICAgICAgICBjYWxsYmFjayhudWxsLCAnZmlsZW5hbWUnKTtcbiAqICAgICB9XSxcbiAqICAgICBlbWFpbF9saW5rOiBbJ3dyaXRlX2ZpbGUnLCBmdW5jdGlvbih3cml0ZV9maWxlLCBjYWxsYmFjaykge1xuICogICAgICAgICBjYWxsYmFjayhudWxsLCB7J2ZpbGUnOndyaXRlX2ZpbGUsICdlbWFpbCc6J3VzZXJAZXhhbXBsZS5jb20nfSk7XG4gKiAgICAgfV1cbiAqICAgICAvLy4uLlxuICogfSwgZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gKiAgICAgY29uc29sZS5sb2coJ2VyciA9ICcsIGVycik7XG4gKiAgICAgY29uc29sZS5sb2coJ2VtYWlsX2xpbmsgPSAnLCByZXN1bHRzLmVtYWlsX2xpbmspO1xuICogfSk7XG4gKi9cbmZ1bmN0aW9uIGF1dG9JbmplY3QodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgdmFyIG5ld1Rhc2tzID0ge307XG5cbiAgICBiYXNlRm9yT3duKHRhc2tzLCBmdW5jdGlvbiAodGFza0ZuLCBrZXkpIHtcbiAgICAgICAgdmFyIHBhcmFtcztcblxuICAgICAgICBpZiAoaXNBcnJheSh0YXNrRm4pKSB7XG4gICAgICAgICAgICBwYXJhbXMgPSB0YXNrRm4uc2xpY2UoMCwgLTEpO1xuICAgICAgICAgICAgdGFza0ZuID0gdGFza0ZuW3Rhc2tGbi5sZW5ndGggLSAxXTtcblxuICAgICAgICAgICAgbmV3VGFza3Nba2V5XSA9IHBhcmFtcy5jb25jYXQocGFyYW1zLmxlbmd0aCA+IDAgPyBuZXdUYXNrIDogdGFza0ZuKTtcbiAgICAgICAgfSBlbHNlIGlmICh0YXNrRm4ubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAvLyBubyBkZXBlbmRlbmNpZXMsIHVzZSB0aGUgZnVuY3Rpb24gYXMtaXNcbiAgICAgICAgICAgIG5ld1Rhc2tzW2tleV0gPSB0YXNrRm47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwYXJhbXMgPSBwYXJzZVBhcmFtcyh0YXNrRm4pO1xuICAgICAgICAgICAgaWYgKHRhc2tGbi5sZW5ndGggPT09IDAgJiYgcGFyYW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImF1dG9JbmplY3QgdGFzayBmdW5jdGlvbnMgcmVxdWlyZSBleHBsaWNpdCBwYXJhbWV0ZXJzLlwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcGFyYW1zLnBvcCgpO1xuXG4gICAgICAgICAgICBuZXdUYXNrc1trZXldID0gcGFyYW1zLmNvbmNhdChuZXdUYXNrKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG5ld1Rhc2socmVzdWx0cywgdGFza0NiKSB7XG4gICAgICAgICAgICB2YXIgbmV3QXJncyA9IGFycmF5TWFwKHBhcmFtcywgZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0c1tuYW1lXTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbmV3QXJncy5wdXNoKHRhc2tDYik7XG4gICAgICAgICAgICB0YXNrRm4uYXBwbHkobnVsbCwgbmV3QXJncyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGF1dG8obmV3VGFza3MsIGNhbGxiYWNrKTtcbn1cblxudmFyIGhhc1NldEltbWVkaWF0ZSA9IHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09ICdmdW5jdGlvbicgJiYgc2V0SW1tZWRpYXRlO1xudmFyIGhhc05leHRUaWNrID0gdHlwZW9mIHByb2Nlc3MgPT09ICdvYmplY3QnICYmIHR5cGVvZiBwcm9jZXNzLm5leHRUaWNrID09PSAnZnVuY3Rpb24nO1xuXG5mdW5jdGlvbiBmYWxsYmFjayhmbikge1xuICAgIHNldFRpbWVvdXQoZm4sIDApO1xufVxuXG5mdW5jdGlvbiB3cmFwKGRlZmVyKSB7XG4gICAgcmV0dXJuIHJlc3QoZnVuY3Rpb24gKGZuLCBhcmdzKSB7XG4gICAgICAgIGRlZmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxudmFyIF9kZWZlcjtcblxuaWYgKGhhc1NldEltbWVkaWF0ZSkge1xuICAgIF9kZWZlciA9IHNldEltbWVkaWF0ZTtcbn0gZWxzZSBpZiAoaGFzTmV4dFRpY2spIHtcbiAgICBfZGVmZXIgPSBwcm9jZXNzLm5leHRUaWNrO1xufSBlbHNlIHtcbiAgICBfZGVmZXIgPSBmYWxsYmFjaztcbn1cblxudmFyIHNldEltbWVkaWF0ZSQxID0gd3JhcChfZGVmZXIpO1xuXG4vLyBTaW1wbGUgZG91Ymx5IGxpbmtlZCBsaXN0IChodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9Eb3VibHlfbGlua2VkX2xpc3QpIGltcGxlbWVudGF0aW9uXG4vLyB1c2VkIGZvciBxdWV1ZXMuIFRoaXMgaW1wbGVtZW50YXRpb24gYXNzdW1lcyB0aGF0IHRoZSBub2RlIHByb3ZpZGVkIGJ5IHRoZSB1c2VyIGNhbiBiZSBtb2RpZmllZFxuLy8gdG8gYWRqdXN0IHRoZSBuZXh0IGFuZCBsYXN0IHByb3BlcnRpZXMuIFdlIGltcGxlbWVudCBvbmx5IHRoZSBtaW5pbWFsIGZ1bmN0aW9uYWxpdHlcbi8vIGZvciBxdWV1ZSBzdXBwb3J0LlxuZnVuY3Rpb24gRExMKCkge1xuICAgIHRoaXMuaGVhZCA9IHRoaXMudGFpbCA9IG51bGw7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xufVxuXG5mdW5jdGlvbiBzZXRJbml0aWFsKGRsbCwgbm9kZSkge1xuICAgIGRsbC5sZW5ndGggPSAxO1xuICAgIGRsbC5oZWFkID0gZGxsLnRhaWwgPSBub2RlO1xufVxuXG5ETEwucHJvdG90eXBlLnJlbW92ZUxpbmsgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIGlmIChub2RlLnByZXYpIG5vZGUucHJldi5uZXh0ID0gbm9kZS5uZXh0O2Vsc2UgdGhpcy5oZWFkID0gbm9kZS5uZXh0O1xuICAgIGlmIChub2RlLm5leHQpIG5vZGUubmV4dC5wcmV2ID0gbm9kZS5wcmV2O2Vsc2UgdGhpcy50YWlsID0gbm9kZS5wcmV2O1xuXG4gICAgbm9kZS5wcmV2ID0gbm9kZS5uZXh0ID0gbnVsbDtcbiAgICB0aGlzLmxlbmd0aCAtPSAxO1xuICAgIHJldHVybiBub2RlO1xufTtcblxuRExMLnByb3RvdHlwZS5lbXB0eSA9IERMTDtcblxuRExMLnByb3RvdHlwZS5pbnNlcnRBZnRlciA9IGZ1bmN0aW9uIChub2RlLCBuZXdOb2RlKSB7XG4gICAgbmV3Tm9kZS5wcmV2ID0gbm9kZTtcbiAgICBuZXdOb2RlLm5leHQgPSBub2RlLm5leHQ7XG4gICAgaWYgKG5vZGUubmV4dCkgbm9kZS5uZXh0LnByZXYgPSBuZXdOb2RlO2Vsc2UgdGhpcy50YWlsID0gbmV3Tm9kZTtcbiAgICBub2RlLm5leHQgPSBuZXdOb2RlO1xuICAgIHRoaXMubGVuZ3RoICs9IDE7XG59O1xuXG5ETEwucHJvdG90eXBlLmluc2VydEJlZm9yZSA9IGZ1bmN0aW9uIChub2RlLCBuZXdOb2RlKSB7XG4gICAgbmV3Tm9kZS5wcmV2ID0gbm9kZS5wcmV2O1xuICAgIG5ld05vZGUubmV4dCA9IG5vZGU7XG4gICAgaWYgKG5vZGUucHJldikgbm9kZS5wcmV2Lm5leHQgPSBuZXdOb2RlO2Vsc2UgdGhpcy5oZWFkID0gbmV3Tm9kZTtcbiAgICBub2RlLnByZXYgPSBuZXdOb2RlO1xuICAgIHRoaXMubGVuZ3RoICs9IDE7XG59O1xuXG5ETEwucHJvdG90eXBlLnVuc2hpZnQgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIGlmICh0aGlzLmhlYWQpIHRoaXMuaW5zZXJ0QmVmb3JlKHRoaXMuaGVhZCwgbm9kZSk7ZWxzZSBzZXRJbml0aWFsKHRoaXMsIG5vZGUpO1xufTtcblxuRExMLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICBpZiAodGhpcy50YWlsKSB0aGlzLmluc2VydEFmdGVyKHRoaXMudGFpbCwgbm9kZSk7ZWxzZSBzZXRJbml0aWFsKHRoaXMsIG5vZGUpO1xufTtcblxuRExMLnByb3RvdHlwZS5zaGlmdCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5oZWFkICYmIHRoaXMucmVtb3ZlTGluayh0aGlzLmhlYWQpO1xufTtcblxuRExMLnByb3RvdHlwZS5wb3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMudGFpbCAmJiB0aGlzLnJlbW92ZUxpbmsodGhpcy50YWlsKTtcbn07XG5cbmZ1bmN0aW9uIHF1ZXVlKHdvcmtlciwgY29uY3VycmVuY3ksIHBheWxvYWQpIHtcbiAgICBpZiAoY29uY3VycmVuY3kgPT0gbnVsbCkge1xuICAgICAgICBjb25jdXJyZW5jeSA9IDE7XG4gICAgfSBlbHNlIGlmIChjb25jdXJyZW5jeSA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmN1cnJlbmN5IG11c3Qgbm90IGJlIHplcm8nKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfaW5zZXJ0KGRhdGEsIGluc2VydEF0RnJvbnQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChjYWxsYmFjayAhPSBudWxsICYmIHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd0YXNrIGNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICB9XG4gICAgICAgIHEuc3RhcnRlZCA9IHRydWU7XG4gICAgICAgIGlmICghaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgZGF0YSA9IFtkYXRhXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5sZW5ndGggPT09IDAgJiYgcS5pZGxlKCkpIHtcbiAgICAgICAgICAgIC8vIGNhbGwgZHJhaW4gaW1tZWRpYXRlbHkgaWYgdGhlcmUgYXJlIG5vIHRhc2tzXG4gICAgICAgICAgICByZXR1cm4gc2V0SW1tZWRpYXRlJDEoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHEuZHJhaW4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBkYXRhLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgdmFyIGl0ZW0gPSB7XG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVtpXSxcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogY2FsbGJhY2sgfHwgbm9vcFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKGluc2VydEF0RnJvbnQpIHtcbiAgICAgICAgICAgICAgICBxLl90YXNrcy51bnNoaWZ0KGl0ZW0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBxLl90YXNrcy5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHNldEltbWVkaWF0ZSQxKHEucHJvY2Vzcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX25leHQodGFza3MpIHtcbiAgICAgICAgcmV0dXJuIHJlc3QoZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgICAgIHdvcmtlcnMgLT0gMTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0YXNrcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFzayA9IHRhc2tzW2ldO1xuICAgICAgICAgICAgICAgIHZhciBpbmRleCA9IGJhc2VJbmRleE9mKHdvcmtlcnNMaXN0LCB0YXNrLCAwKTtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICB3b3JrZXJzTGlzdC5zcGxpY2UoaW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRhc2suY2FsbGJhY2suYXBwbHkodGFzaywgYXJncyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoYXJnc1swXSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHEuZXJyb3IoYXJnc1swXSwgdGFzay5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh3b3JrZXJzIDw9IHEuY29uY3VycmVuY3kgLSBxLmJ1ZmZlcikge1xuICAgICAgICAgICAgICAgIHEudW5zYXR1cmF0ZWQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHEuaWRsZSgpKSB7XG4gICAgICAgICAgICAgICAgcS5kcmFpbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcS5wcm9jZXNzKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHZhciB3b3JrZXJzID0gMDtcbiAgICB2YXIgd29ya2Vyc0xpc3QgPSBbXTtcbiAgICB2YXIgaXNQcm9jZXNzaW5nID0gZmFsc2U7XG4gICAgdmFyIHEgPSB7XG4gICAgICAgIF90YXNrczogbmV3IERMTCgpLFxuICAgICAgICBjb25jdXJyZW5jeTogY29uY3VycmVuY3ksXG4gICAgICAgIHBheWxvYWQ6IHBheWxvYWQsXG4gICAgICAgIHNhdHVyYXRlZDogbm9vcCxcbiAgICAgICAgdW5zYXR1cmF0ZWQ6IG5vb3AsXG4gICAgICAgIGJ1ZmZlcjogY29uY3VycmVuY3kgLyA0LFxuICAgICAgICBlbXB0eTogbm9vcCxcbiAgICAgICAgZHJhaW46IG5vb3AsXG4gICAgICAgIGVycm9yOiBub29wLFxuICAgICAgICBzdGFydGVkOiBmYWxzZSxcbiAgICAgICAgcGF1c2VkOiBmYWxzZSxcbiAgICAgICAgcHVzaDogZnVuY3Rpb24gKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBfaW5zZXJ0KGRhdGEsIGZhbHNlLCBjYWxsYmFjayk7XG4gICAgICAgIH0sXG4gICAgICAgIGtpbGw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHEuZHJhaW4gPSBub29wO1xuICAgICAgICAgICAgcS5fdGFza3MuZW1wdHkoKTtcbiAgICAgICAgfSxcbiAgICAgICAgdW5zaGlmdDogZnVuY3Rpb24gKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBfaW5zZXJ0KGRhdGEsIHRydWUsIGNhbGxiYWNrKTtcbiAgICAgICAgfSxcbiAgICAgICAgcHJvY2VzczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gQXZvaWQgdHJ5aW5nIHRvIHN0YXJ0IHRvbyBtYW55IHByb2Nlc3Npbmcgb3BlcmF0aW9ucy4gVGhpcyBjYW4gb2NjdXJcbiAgICAgICAgICAgIC8vIHdoZW4gY2FsbGJhY2tzIHJlc29sdmUgc3luY2hyb25vdXNseSAoIzEyNjcpLlxuICAgICAgICAgICAgaWYgKGlzUHJvY2Vzc2luZykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlzUHJvY2Vzc2luZyA9IHRydWU7XG4gICAgICAgICAgICB3aGlsZSAoIXEucGF1c2VkICYmIHdvcmtlcnMgPCBxLmNvbmN1cnJlbmN5ICYmIHEuX3Rhc2tzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHZhciB0YXNrcyA9IFtdLFxuICAgICAgICAgICAgICAgICAgICBkYXRhID0gW107XG4gICAgICAgICAgICAgICAgdmFyIGwgPSBxLl90YXNrcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgaWYgKHEucGF5bG9hZCkgbCA9IE1hdGgubWluKGwsIHEucGF5bG9hZCk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5vZGUgPSBxLl90YXNrcy5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICB0YXNrcy5wdXNoKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICBkYXRhLnB1c2gobm9kZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocS5fdGFza3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHEuZW1wdHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgd29ya2VycyArPSAxO1xuICAgICAgICAgICAgICAgIHdvcmtlcnNMaXN0LnB1c2godGFza3NbMF0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHdvcmtlcnMgPT09IHEuY29uY3VycmVuY3kpIHtcbiAgICAgICAgICAgICAgICAgICAgcS5zYXR1cmF0ZWQoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgY2IgPSBvbmx5T25jZShfbmV4dCh0YXNrcykpO1xuICAgICAgICAgICAgICAgIHdvcmtlcihkYXRhLCBjYik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpc1Byb2Nlc3NpbmcgPSBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgbGVuZ3RoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gcS5fdGFza3MubGVuZ3RoO1xuICAgICAgICB9LFxuICAgICAgICBydW5uaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gd29ya2VycztcbiAgICAgICAgfSxcbiAgICAgICAgd29ya2Vyc0xpc3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB3b3JrZXJzTGlzdDtcbiAgICAgICAgfSxcbiAgICAgICAgaWRsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHEuX3Rhc2tzLmxlbmd0aCArIHdvcmtlcnMgPT09IDA7XG4gICAgICAgIH0sXG4gICAgICAgIHBhdXNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBxLnBhdXNlZCA9IHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VtZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHEucGF1c2VkID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHEucGF1c2VkID0gZmFsc2U7XG4gICAgICAgICAgICBzZXRJbW1lZGlhdGUkMShxLnByb2Nlc3MpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gcTtcbn1cblxuLyoqXG4gKiBBIGNhcmdvIG9mIHRhc2tzIGZvciB0aGUgd29ya2VyIGZ1bmN0aW9uIHRvIGNvbXBsZXRlLiBDYXJnbyBpbmhlcml0cyBhbGwgb2ZcbiAqIHRoZSBzYW1lIG1ldGhvZHMgYW5kIGV2ZW50IGNhbGxiYWNrcyBhcyBbYHF1ZXVlYF17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LnF1ZXVlfS5cbiAqIEB0eXBlZGVmIHtPYmplY3R9IENhcmdvT2JqZWN0XG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBsZW5ndGggLSBBIGZ1bmN0aW9uIHJldHVybmluZyB0aGUgbnVtYmVyIG9mIGl0ZW1zXG4gKiB3YWl0aW5nIHRvIGJlIHByb2Nlc3NlZC4gSW52b2tlIGxpa2UgYGNhcmdvLmxlbmd0aCgpYC5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBwYXlsb2FkIC0gQW4gYGludGVnZXJgIGZvciBkZXRlcm1pbmluZyBob3cgbWFueSB0YXNrc1xuICogc2hvdWxkIGJlIHByb2Nlc3MgcGVyIHJvdW5kLiBUaGlzIHByb3BlcnR5IGNhbiBiZSBjaGFuZ2VkIGFmdGVyIGEgYGNhcmdvYCBpc1xuICogY3JlYXRlZCB0byBhbHRlciB0aGUgcGF5bG9hZCBvbi10aGUtZmx5LlxuICogQHByb3BlcnR5IHtGdW5jdGlvbn0gcHVzaCAtIEFkZHMgYHRhc2tgIHRvIHRoZSBgcXVldWVgLiBUaGUgY2FsbGJhY2sgaXNcbiAqIGNhbGxlZCBvbmNlIHRoZSBgd29ya2VyYCBoYXMgZmluaXNoZWQgcHJvY2Vzc2luZyB0aGUgdGFzay4gSW5zdGVhZCBvZiBhXG4gKiBzaW5nbGUgdGFzaywgYW4gYXJyYXkgb2YgYHRhc2tzYCBjYW4gYmUgc3VibWl0dGVkLiBUaGUgcmVzcGVjdGl2ZSBjYWxsYmFjayBpc1xuICogdXNlZCBmb3IgZXZlcnkgdGFzayBpbiB0aGUgbGlzdC4gSW52b2tlIGxpa2UgYGNhcmdvLnB1c2godGFzaywgW2NhbGxiYWNrXSlgLlxuICogQHByb3BlcnR5IHtGdW5jdGlvbn0gc2F0dXJhdGVkIC0gQSBjYWxsYmFjayB0aGF0IGlzIGNhbGxlZCB3aGVuIHRoZVxuICogYHF1ZXVlLmxlbmd0aCgpYCBoaXRzIHRoZSBjb25jdXJyZW5jeSBhbmQgZnVydGhlciB0YXNrcyB3aWxsIGJlIHF1ZXVlZC5cbiAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGVtcHR5IC0gQSBjYWxsYmFjayB0aGF0IGlzIGNhbGxlZCB3aGVuIHRoZSBsYXN0IGl0ZW1cbiAqIGZyb20gdGhlIGBxdWV1ZWAgaXMgZ2l2ZW4gdG8gYSBgd29ya2VyYC5cbiAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGRyYWluIC0gQSBjYWxsYmFjayB0aGF0IGlzIGNhbGxlZCB3aGVuIHRoZSBsYXN0IGl0ZW1cbiAqIGZyb20gdGhlIGBxdWV1ZWAgaGFzIHJldHVybmVkIGZyb20gdGhlIGB3b3JrZXJgLlxuICogQHByb3BlcnR5IHtGdW5jdGlvbn0gaWRsZSAtIGEgZnVuY3Rpb24gcmV0dXJuaW5nIGZhbHNlIGlmIHRoZXJlIGFyZSBpdGVtc1xuICogd2FpdGluZyBvciBiZWluZyBwcm9jZXNzZWQsIG9yIHRydWUgaWYgbm90LiBJbnZva2UgbGlrZSBgY2FyZ28uaWRsZSgpYC5cbiAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IHBhdXNlIC0gYSBmdW5jdGlvbiB0aGF0IHBhdXNlcyB0aGUgcHJvY2Vzc2luZyBvZiB0YXNrc1xuICogdW50aWwgYHJlc3VtZSgpYCBpcyBjYWxsZWQuIEludm9rZSBsaWtlIGBjYXJnby5wYXVzZSgpYC5cbiAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IHJlc3VtZSAtIGEgZnVuY3Rpb24gdGhhdCByZXN1bWVzIHRoZSBwcm9jZXNzaW5nIG9mXG4gKiBxdWV1ZWQgdGFza3Mgd2hlbiB0aGUgcXVldWUgaXMgcGF1c2VkLiBJbnZva2UgbGlrZSBgY2FyZ28ucmVzdW1lKClgLlxuICogQHByb3BlcnR5IHtGdW5jdGlvbn0ga2lsbCAtIGEgZnVuY3Rpb24gdGhhdCByZW1vdmVzIHRoZSBgZHJhaW5gIGNhbGxiYWNrIGFuZFxuICogZW1wdGllcyByZW1haW5pbmcgdGFza3MgZnJvbSB0aGUgcXVldWUgZm9yY2luZyBpdCB0byBnbyBpZGxlLiBJbnZva2UgbGlrZSBgY2FyZ28ua2lsbCgpYC5cbiAqL1xuXG4vKipcbiAqIENyZWF0ZXMgYSBgY2FyZ29gIG9iamVjdCB3aXRoIHRoZSBzcGVjaWZpZWQgcGF5bG9hZC4gVGFza3MgYWRkZWQgdG8gdGhlXG4gKiBjYXJnbyB3aWxsIGJlIHByb2Nlc3NlZCBhbHRvZ2V0aGVyICh1cCB0byB0aGUgYHBheWxvYWRgIGxpbWl0KS4gSWYgdGhlXG4gKiBgd29ya2VyYCBpcyBpbiBwcm9ncmVzcywgdGhlIHRhc2sgaXMgcXVldWVkIHVudGlsIGl0IGJlY29tZXMgYXZhaWxhYmxlLiBPbmNlXG4gKiB0aGUgYHdvcmtlcmAgaGFzIGNvbXBsZXRlZCBzb21lIHRhc2tzLCBlYWNoIGNhbGxiYWNrIG9mIHRob3NlIHRhc2tzIGlzXG4gKiBjYWxsZWQuIENoZWNrIG91dCBbdGhlc2VdKGh0dHBzOi8vY2Ftby5naXRodWJ1c2VyY29udGVudC5jb20vNmJiZDM2ZjRjZjViMzVhMGYxMWE5NmRjZDJlOTc3MTFmZmMyZmIzNy82ODc0NzQ3MDczM2EyZjJmNjYyZTYzNmM2Zjc1NjQyZTY3Njk3NDY4NzU2MjJlNjM2ZjZkMmY2MTczNzM2NTc0NzMyZjMxMzYzNzM2MzgzNzMxMmYzNjM4MzEzMDM4MmY2MjYyNjMzMDYzNjY2MjMwMmQzNTY2MzIzOTJkMzEzMTY1MzIyZDM5MzczNDY2MmQzMzMzMzkzNzYzMzYzNDY0NjMzODM1MzgyZTY3Njk2NikgW2FuaW1hdGlvbnNdKGh0dHBzOi8vY2Ftby5naXRodWJ1c2VyY29udGVudC5jb20vZjQ4MTBlMDBlMWM1ZjVmOGFkZGJlM2U5ZjQ5MDY0ZmQ1ZDEwMjY5OS82ODc0NzQ3MDczM2EyZjJmNjYyZTYzNmM2Zjc1NjQyZTY3Njk3NDY4NzU2MjJlNjM2ZjZkMmY2MTczNzM2NTc0NzMyZjMxMzYzNzM2MzgzNzMxMmYzNjM4MzEzMDMxMmYzODM0NjMzOTMyMzAzNjM2MmQzNTY2MzIzOTJkMzEzMTY1MzIyZDM4MzEzNDY2MmQzOTY0MzM2NDMwMzIzNDMxMzM2MjY2NjQyZTY3Njk2NilcbiAqIGZvciBob3cgYGNhcmdvYCBhbmQgYHF1ZXVlYCB3b3JrLlxuICpcbiAqIFdoaWxlIFtgcXVldWVgXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cucXVldWV9IHBhc3NlcyBvbmx5IG9uZSB0YXNrIHRvIG9uZSBvZiBhIGdyb3VwIG9mIHdvcmtlcnNcbiAqIGF0IGEgdGltZSwgY2FyZ28gcGFzc2VzIGFuIGFycmF5IG9mIHRhc2tzIHRvIGEgc2luZ2xlIHdvcmtlciwgcmVwZWF0aW5nXG4gKiB3aGVuIHRoZSB3b3JrZXIgaXMgZmluaXNoZWQuXG4gKlxuICogQG5hbWUgY2FyZ29cbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAqIEBtZXRob2RcbiAqIEBzZWUgW2FzeW5jLnF1ZXVlXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cucXVldWV9XG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB3b3JrZXIgLSBBbiBhc3luY2hyb25vdXMgZnVuY3Rpb24gZm9yIHByb2Nlc3NpbmcgYW4gYXJyYXlcbiAqIG9mIHF1ZXVlZCB0YXNrcywgd2hpY2ggbXVzdCBjYWxsIGl0cyBgY2FsbGJhY2soZXJyKWAgYXJndW1lbnQgd2hlbiBmaW5pc2hlZCxcbiAqIHdpdGggYW4gb3B0aW9uYWwgYGVycmAgYXJndW1lbnQuIEludm9rZWQgd2l0aCBgKHRhc2tzLCBjYWxsYmFjaylgLlxuICogQHBhcmFtIHtudW1iZXJ9IFtwYXlsb2FkPUluZmluaXR5XSAtIEFuIG9wdGlvbmFsIGBpbnRlZ2VyYCBmb3IgZGV0ZXJtaW5pbmdcbiAqIGhvdyBtYW55IHRhc2tzIHNob3VsZCBiZSBwcm9jZXNzZWQgcGVyIHJvdW5kOyBpZiBvbWl0dGVkLCB0aGUgZGVmYXVsdCBpc1xuICogdW5saW1pdGVkLlxuICogQHJldHVybnMge21vZHVsZTpDb250cm9sRmxvdy5DYXJnb09iamVjdH0gQSBjYXJnbyBvYmplY3QgdG8gbWFuYWdlIHRoZSB0YXNrcy4gQ2FsbGJhY2tzIGNhblxuICogYXR0YWNoZWQgYXMgY2VydGFpbiBwcm9wZXJ0aWVzIHRvIGxpc3RlbiBmb3Igc3BlY2lmaWMgZXZlbnRzIGR1cmluZyB0aGVcbiAqIGxpZmVjeWNsZSBvZiB0aGUgY2FyZ28gYW5kIGlubmVyIHF1ZXVlLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBjcmVhdGUgYSBjYXJnbyBvYmplY3Qgd2l0aCBwYXlsb2FkIDJcbiAqIHZhciBjYXJnbyA9IGFzeW5jLmNhcmdvKGZ1bmN0aW9uKHRhc2tzLCBjYWxsYmFjaykge1xuICogICAgIGZvciAodmFyIGk9MDsgaTx0YXNrcy5sZW5ndGg7IGkrKykge1xuICogICAgICAgICBjb25zb2xlLmxvZygnaGVsbG8gJyArIHRhc2tzW2ldLm5hbWUpO1xuICogICAgIH1cbiAqICAgICBjYWxsYmFjaygpO1xuICogfSwgMik7XG4gKlxuICogLy8gYWRkIHNvbWUgaXRlbXNcbiAqIGNhcmdvLnB1c2goe25hbWU6ICdmb28nfSwgZnVuY3Rpb24oZXJyKSB7XG4gKiAgICAgY29uc29sZS5sb2coJ2ZpbmlzaGVkIHByb2Nlc3NpbmcgZm9vJyk7XG4gKiB9KTtcbiAqIGNhcmdvLnB1c2goe25hbWU6ICdiYXInfSwgZnVuY3Rpb24oZXJyKSB7XG4gKiAgICAgY29uc29sZS5sb2coJ2ZpbmlzaGVkIHByb2Nlc3NpbmcgYmFyJyk7XG4gKiB9KTtcbiAqIGNhcmdvLnB1c2goe25hbWU6ICdiYXonfSwgZnVuY3Rpb24oZXJyKSB7XG4gKiAgICAgY29uc29sZS5sb2coJ2ZpbmlzaGVkIHByb2Nlc3NpbmcgYmF6Jyk7XG4gKiB9KTtcbiAqL1xuZnVuY3Rpb24gY2FyZ28od29ya2VyLCBwYXlsb2FkKSB7XG4gIHJldHVybiBxdWV1ZSh3b3JrZXIsIDEsIHBheWxvYWQpO1xufVxuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFtgZWFjaE9mYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmVhY2hPZn0gYnV0IHJ1bnMgb25seSBhIHNpbmdsZSBhc3luYyBvcGVyYXRpb24gYXQgYSB0aW1lLlxuICpcbiAqIEBuYW1lIGVhY2hPZlNlcmllc1xuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMuZWFjaE9mXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZWFjaE9mfVxuICogQGFsaWFzIGZvckVhY2hPZlNlcmllc1xuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIC0gQSBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW4gYGNvbGxgLiBUaGVcbiAqIGBrZXlgIGlzIHRoZSBpdGVtJ3Mga2V5LCBvciBpbmRleCBpbiB0aGUgY2FzZSBvZiBhbiBhcnJheS4gVGhlIGl0ZXJhdGVlIGlzXG4gKiBwYXNzZWQgYSBgY2FsbGJhY2soZXJyKWAgd2hpY2ggbXVzdCBiZSBjYWxsZWQgb25jZSBpdCBoYXMgY29tcGxldGVkLiBJZiBub1xuICogZXJyb3IgaGFzIG9jY3VycmVkLCB0aGUgY2FsbGJhY2sgc2hvdWxkIGJlIHJ1biB3aXRob3V0IGFyZ3VtZW50cyBvciB3aXRoIGFuXG4gKiBleHBsaWNpdCBgbnVsbGAgYXJndW1lbnQuIEludm9rZWQgd2l0aCAoaXRlbSwga2V5LCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgd2hlbiBhbGwgYGl0ZXJhdGVlYFxuICogZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gSW52b2tlZCB3aXRoIChlcnIpLlxuICovXG52YXIgZWFjaE9mU2VyaWVzID0gZG9MaW1pdChlYWNoT2ZMaW1pdCwgMSk7XG5cbi8qKlxuICogUmVkdWNlcyBgY29sbGAgaW50byBhIHNpbmdsZSB2YWx1ZSB1c2luZyBhbiBhc3luYyBgaXRlcmF0ZWVgIHRvIHJldHVybiBlYWNoXG4gKiBzdWNjZXNzaXZlIHN0ZXAuIGBtZW1vYCBpcyB0aGUgaW5pdGlhbCBzdGF0ZSBvZiB0aGUgcmVkdWN0aW9uLiBUaGlzIGZ1bmN0aW9uXG4gKiBvbmx5IG9wZXJhdGVzIGluIHNlcmllcy5cbiAqXG4gKiBGb3IgcGVyZm9ybWFuY2UgcmVhc29ucywgaXQgbWF5IG1ha2Ugc2Vuc2UgdG8gc3BsaXQgYSBjYWxsIHRvIHRoaXMgZnVuY3Rpb25cbiAqIGludG8gYSBwYXJhbGxlbCBtYXAsIGFuZCB0aGVuIHVzZSB0aGUgbm9ybWFsIGBBcnJheS5wcm90b3R5cGUucmVkdWNlYCBvbiB0aGVcbiAqIHJlc3VsdHMuIFRoaXMgZnVuY3Rpb24gaXMgZm9yIHNpdHVhdGlvbnMgd2hlcmUgZWFjaCBzdGVwIGluIHRoZSByZWR1Y3Rpb25cbiAqIG5lZWRzIHRvIGJlIGFzeW5jOyBpZiB5b3UgY2FuIGdldCB0aGUgZGF0YSBiZWZvcmUgcmVkdWNpbmcgaXQsIHRoZW4gaXQnc1xuICogcHJvYmFibHkgYSBnb29kIGlkZWEgdG8gZG8gc28uXG4gKlxuICogQG5hbWUgcmVkdWNlXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAYWxpYXMgaW5qZWN0XG4gKiBAYWxpYXMgZm9sZGxcbiAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0geyp9IG1lbW8gLSBUaGUgaW5pdGlhbCBzdGF0ZSBvZiB0aGUgcmVkdWN0aW9uLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIGZ1bmN0aW9uIGFwcGxpZWQgdG8gZWFjaCBpdGVtIGluIHRoZVxuICogYXJyYXkgdG8gcHJvZHVjZSB0aGUgbmV4dCBzdGVwIGluIHRoZSByZWR1Y3Rpb24uIFRoZSBgaXRlcmF0ZWVgIGlzIHBhc3NlZCBhXG4gKiBgY2FsbGJhY2soZXJyLCByZWR1Y3Rpb24pYCB3aGljaCBhY2NlcHRzIGFuIG9wdGlvbmFsIGVycm9yIGFzIGl0cyBmaXJzdFxuICogYXJndW1lbnQsIGFuZCB0aGUgc3RhdGUgb2YgdGhlIHJlZHVjdGlvbiBhcyB0aGUgc2Vjb25kLiBJZiBhbiBlcnJvciBpc1xuICogcGFzc2VkIHRvIHRoZSBjYWxsYmFjaywgdGhlIHJlZHVjdGlvbiBpcyBzdG9wcGVkIGFuZCB0aGUgbWFpbiBgY2FsbGJhY2tgIGlzXG4gKiBpbW1lZGlhdGVseSBjYWxsZWQgd2l0aCB0aGUgZXJyb3IuIEludm9rZWQgd2l0aCAobWVtbywgaXRlbSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIGFsbCB0aGVcbiAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQuIFJlc3VsdCBpcyB0aGUgcmVkdWNlZCB2YWx1ZS4gSW52b2tlZCB3aXRoXG4gKiAoZXJyLCByZXN1bHQpLlxuICogQGV4YW1wbGVcbiAqXG4gKiBhc3luYy5yZWR1Y2UoWzEsMiwzXSwgMCwgZnVuY3Rpb24obWVtbywgaXRlbSwgY2FsbGJhY2spIHtcbiAqICAgICAvLyBwb2ludGxlc3MgYXN5bmM6XG4gKiAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgbWVtbyArIGl0ZW0pXG4gKiAgICAgfSk7XG4gKiB9LCBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICogICAgIC8vIHJlc3VsdCBpcyBub3cgZXF1YWwgdG8gdGhlIGxhc3QgdmFsdWUgb2YgbWVtbywgd2hpY2ggaXMgNlxuICogfSk7XG4gKi9cbmZ1bmN0aW9uIHJlZHVjZShjb2xsLCBtZW1vLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICBjYWxsYmFjayA9IG9uY2UoY2FsbGJhY2sgfHwgbm9vcCk7XG4gICAgZWFjaE9mU2VyaWVzKGNvbGwsIGZ1bmN0aW9uICh4LCBpLCBjYWxsYmFjaykge1xuICAgICAgICBpdGVyYXRlZShtZW1vLCB4LCBmdW5jdGlvbiAoZXJyLCB2KSB7XG4gICAgICAgICAgICBtZW1vID0gdjtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH0pO1xuICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgY2FsbGJhY2soZXJyLCBtZW1vKTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBWZXJzaW9uIG9mIHRoZSBjb21wb3NlIGZ1bmN0aW9uIHRoYXQgaXMgbW9yZSBuYXR1cmFsIHRvIHJlYWQuIEVhY2ggZnVuY3Rpb25cbiAqIGNvbnN1bWVzIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIHByZXZpb3VzIGZ1bmN0aW9uLiBJdCBpcyB0aGUgZXF1aXZhbGVudCBvZlxuICogW2NvbXBvc2Vde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5jb21wb3NlfSB3aXRoIHRoZSBhcmd1bWVudHMgcmV2ZXJzZWQuXG4gKlxuICogRWFjaCBmdW5jdGlvbiBpcyBleGVjdXRlZCB3aXRoIHRoZSBgdGhpc2AgYmluZGluZyBvZiB0aGUgY29tcG9zZWQgZnVuY3Rpb24uXG4gKlxuICogQG5hbWUgc2VxXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5jb21wb3NlXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cuY29tcG9zZX1cbiAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAqIEBwYXJhbSB7Li4uRnVuY3Rpb259IGZ1bmN0aW9ucyAtIHRoZSBhc3luY2hyb25vdXMgZnVuY3Rpb25zIHRvIGNvbXBvc2VcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gYSBmdW5jdGlvbiB0aGF0IGNvbXBvc2VzIHRoZSBgZnVuY3Rpb25zYCBpbiBvcmRlclxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBSZXF1aXJlcyBsb2Rhc2ggKG9yIHVuZGVyc2NvcmUpLCBleHByZXNzMyBhbmQgZHJlc2VuZGUncyBvcm0yLlxuICogLy8gUGFydCBvZiBhbiBhcHAsIHRoYXQgZmV0Y2hlcyBjYXRzIG9mIHRoZSBsb2dnZWQgdXNlci5cbiAqIC8vIFRoaXMgZXhhbXBsZSB1c2VzIGBzZXFgIGZ1bmN0aW9uIHRvIGF2b2lkIG92ZXJuZXN0aW5nIGFuZCBlcnJvclxuICogLy8gaGFuZGxpbmcgY2x1dHRlci5cbiAqIGFwcC5nZXQoJy9jYXRzJywgZnVuY3Rpb24ocmVxdWVzdCwgcmVzcG9uc2UpIHtcbiAqICAgICB2YXIgVXNlciA9IHJlcXVlc3QubW9kZWxzLlVzZXI7XG4gKiAgICAgYXN5bmMuc2VxKFxuICogICAgICAgICBfLmJpbmQoVXNlci5nZXQsIFVzZXIpLCAgLy8gJ1VzZXIuZ2V0JyBoYXMgc2lnbmF0dXJlIChpZCwgY2FsbGJhY2soZXJyLCBkYXRhKSlcbiAqICAgICAgICAgZnVuY3Rpb24odXNlciwgZm4pIHtcbiAqICAgICAgICAgICAgIHVzZXIuZ2V0Q2F0cyhmbik7ICAgICAgLy8gJ2dldENhdHMnIGhhcyBzaWduYXR1cmUgKGNhbGxiYWNrKGVyciwgZGF0YSkpXG4gKiAgICAgICAgIH1cbiAqICAgICApKHJlcS5zZXNzaW9uLnVzZXJfaWQsIGZ1bmN0aW9uIChlcnIsIGNhdHMpIHtcbiAqICAgICAgICAgaWYgKGVycikge1xuICogICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICogICAgICAgICAgICAgcmVzcG9uc2UuanNvbih7IHN0YXR1czogJ2Vycm9yJywgbWVzc2FnZTogZXJyLm1lc3NhZ2UgfSk7XG4gKiAgICAgICAgIH0gZWxzZSB7XG4gKiAgICAgICAgICAgICByZXNwb25zZS5qc29uKHsgc3RhdHVzOiAnb2snLCBtZXNzYWdlOiAnQ2F0cyBmb3VuZCcsIGRhdGE6IGNhdHMgfSk7XG4gKiAgICAgICAgIH1cbiAqICAgICB9KTtcbiAqIH0pO1xuICovXG52YXIgc2VxJDEgPSByZXN0KGZ1bmN0aW9uIHNlcShmdW5jdGlvbnMpIHtcbiAgICByZXR1cm4gcmVzdChmdW5jdGlvbiAoYXJncykge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgdmFyIGNiID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAodHlwZW9mIGNiID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFyZ3MucG9wKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYiA9IG5vb3A7XG4gICAgICAgIH1cblxuICAgICAgICByZWR1Y2UoZnVuY3Rpb25zLCBhcmdzLCBmdW5jdGlvbiAobmV3YXJncywgZm4sIGNiKSB7XG4gICAgICAgICAgICBmbi5hcHBseSh0aGF0LCBuZXdhcmdzLmNvbmNhdChyZXN0KGZ1bmN0aW9uIChlcnIsIG5leHRhcmdzKSB7XG4gICAgICAgICAgICAgICAgY2IoZXJyLCBuZXh0YXJncyk7XG4gICAgICAgICAgICB9KSkpO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyLCByZXN1bHRzKSB7XG4gICAgICAgICAgICBjYi5hcHBseSh0aGF0LCBbZXJyXS5jb25jYXQocmVzdWx0cykpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBmdW5jdGlvbiB3aGljaCBpcyBhIGNvbXBvc2l0aW9uIG9mIHRoZSBwYXNzZWQgYXN5bmNocm9ub3VzXG4gKiBmdW5jdGlvbnMuIEVhY2ggZnVuY3Rpb24gY29uc3VtZXMgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZnVuY3Rpb24gdGhhdFxuICogZm9sbG93cy4gQ29tcG9zaW5nIGZ1bmN0aW9ucyBgZigpYCwgYGcoKWAsIGFuZCBgaCgpYCB3b3VsZCBwcm9kdWNlIHRoZSByZXN1bHRcbiAqIG9mIGBmKGcoaCgpKSlgLCBvbmx5IHRoaXMgdmVyc2lvbiB1c2VzIGNhbGxiYWNrcyB0byBvYnRhaW4gdGhlIHJldHVybiB2YWx1ZXMuXG4gKlxuICogRWFjaCBmdW5jdGlvbiBpcyBleGVjdXRlZCB3aXRoIHRoZSBgdGhpc2AgYmluZGluZyBvZiB0aGUgY29tcG9zZWQgZnVuY3Rpb24uXG4gKlxuICogQG5hbWUgY29tcG9zZVxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQG1ldGhvZFxuICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICogQHBhcmFtIHsuLi5GdW5jdGlvbn0gZnVuY3Rpb25zIC0gdGhlIGFzeW5jaHJvbm91cyBmdW5jdGlvbnMgdG8gY29tcG9zZVxuICogQHJldHVybnMge0Z1bmN0aW9ufSBhbiBhc3luY2hyb25vdXMgZnVuY3Rpb24gdGhhdCBpcyB0aGUgY29tcG9zZWRcbiAqIGFzeW5jaHJvbm91cyBgZnVuY3Rpb25zYFxuICogQGV4YW1wbGVcbiAqXG4gKiBmdW5jdGlvbiBhZGQxKG4sIGNhbGxiYWNrKSB7XG4gKiAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gKiAgICAgICAgIGNhbGxiYWNrKG51bGwsIG4gKyAxKTtcbiAqICAgICB9LCAxMCk7XG4gKiB9XG4gKlxuICogZnVuY3Rpb24gbXVsMyhuLCBjYWxsYmFjaykge1xuICogICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICogICAgICAgICBjYWxsYmFjayhudWxsLCBuICogMyk7XG4gKiAgICAgfSwgMTApO1xuICogfVxuICpcbiAqIHZhciBhZGQxbXVsMyA9IGFzeW5jLmNvbXBvc2UobXVsMywgYWRkMSk7XG4gKiBhZGQxbXVsMyg0LCBmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcbiAqICAgICAvLyByZXN1bHQgbm93IGVxdWFscyAxNVxuICogfSk7XG4gKi9cbnZhciBjb21wb3NlID0gcmVzdChmdW5jdGlvbiAoYXJncykge1xuICByZXR1cm4gc2VxJDEuYXBwbHkobnVsbCwgYXJncy5yZXZlcnNlKCkpO1xufSk7XG5cbmZ1bmN0aW9uIGNvbmNhdCQxKGVhY2hmbiwgYXJyLCBmbiwgY2FsbGJhY2spIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGluZGV4LCBjYikge1xuICAgICAgICBmbih4LCBmdW5jdGlvbiAoZXJyLCB5KSB7XG4gICAgICAgICAgICByZXN1bHQgPSByZXN1bHQuY29uY2F0KHkgfHwgW10pO1xuICAgICAgICAgICAgY2IoZXJyKTtcbiAgICAgICAgfSk7XG4gICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICBjYWxsYmFjayhlcnIsIHJlc3VsdCk7XG4gICAgfSk7XG59XG5cbi8qKlxuICogQXBwbGllcyBgaXRlcmF0ZWVgIHRvIGVhY2ggaXRlbSBpbiBgY29sbGAsIGNvbmNhdGVuYXRpbmcgdGhlIHJlc3VsdHMuIFJldHVybnNcbiAqIHRoZSBjb25jYXRlbmF0ZWQgbGlzdC4gVGhlIGBpdGVyYXRlZWBzIGFyZSBjYWxsZWQgaW4gcGFyYWxsZWwsIGFuZCB0aGVcbiAqIHJlc3VsdHMgYXJlIGNvbmNhdGVuYXRlZCBhcyB0aGV5IHJldHVybi4gVGhlcmUgaXMgbm8gZ3VhcmFudGVlIHRoYXQgdGhlXG4gKiByZXN1bHRzIGFycmF5IHdpbGwgYmUgcmV0dXJuZWQgaW4gdGhlIG9yaWdpbmFsIG9yZGVyIG9mIGBjb2xsYCBwYXNzZWQgdG8gdGhlXG4gKiBgaXRlcmF0ZWVgIGZ1bmN0aW9uLlxuICpcbiAqIEBuYW1lIGNvbmNhdFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIC0gQSBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW4gYGNvbGxgLlxuICogVGhlIGl0ZXJhdGVlIGlzIHBhc3NlZCBhIGBjYWxsYmFjayhlcnIsIHJlc3VsdHMpYCB3aGljaCBtdXN0IGJlIGNhbGxlZCBvbmNlXG4gKiBpdCBoYXMgY29tcGxldGVkIHdpdGggYW4gZXJyb3IgKHdoaWNoIGNhbiBiZSBgbnVsbGApIGFuZCBhbiBhcnJheSBvZiByZXN1bHRzLlxuICogSW52b2tlZCB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2soZXJyKV0gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhZnRlciBhbGwgdGhlXG4gKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLCBvciBhbiBlcnJvciBvY2N1cnMuIFJlc3VsdHMgaXMgYW4gYXJyYXlcbiAqIGNvbnRhaW5pbmcgdGhlIGNvbmNhdGVuYXRlZCByZXN1bHRzIG9mIHRoZSBgaXRlcmF0ZWVgIGZ1bmN0aW9uLiBJbnZva2VkIHdpdGhcbiAqIChlcnIsIHJlc3VsdHMpLlxuICogQGV4YW1wbGVcbiAqXG4gKiBhc3luYy5jb25jYXQoWydkaXIxJywnZGlyMicsJ2RpcjMnXSwgZnMucmVhZGRpciwgZnVuY3Rpb24oZXJyLCBmaWxlcykge1xuICogICAgIC8vIGZpbGVzIGlzIG5vdyBhIGxpc3Qgb2YgZmlsZW5hbWVzIHRoYXQgZXhpc3QgaW4gdGhlIDMgZGlyZWN0b3JpZXNcbiAqIH0pO1xuICovXG52YXIgY29uY2F0ID0gZG9QYXJhbGxlbChjb25jYXQkMSk7XG5cbmZ1bmN0aW9uIGRvU2VyaWVzKGZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChvYmosIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gZm4oZWFjaE9mU2VyaWVzLCBvYmosIGl0ZXJhdGVlLCBjYWxsYmFjayk7XG4gICAgfTtcbn1cblxuLyoqXG4gKiBUaGUgc2FtZSBhcyBbYGNvbmNhdGBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5jb25jYXR9IGJ1dCBydW5zIG9ubHkgYSBzaW5nbGUgYXN5bmMgb3BlcmF0aW9uIGF0IGEgdGltZS5cbiAqXG4gKiBAbmFtZSBjb25jYXRTZXJpZXNcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAqIEBtZXRob2RcbiAqIEBzZWUgW2FzeW5jLmNvbmNhdF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmNvbmNhdH1cbiAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEEgZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaCBpdGVtIGluIGBjb2xsYC5cbiAqIFRoZSBpdGVyYXRlZSBpcyBwYXNzZWQgYSBgY2FsbGJhY2soZXJyLCByZXN1bHRzKWAgd2hpY2ggbXVzdCBiZSBjYWxsZWQgb25jZVxuICogaXQgaGFzIGNvbXBsZXRlZCB3aXRoIGFuIGVycm9yICh3aGljaCBjYW4gYmUgYG51bGxgKSBhbmQgYW4gYXJyYXkgb2YgcmVzdWx0cy5cbiAqIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrKGVycildIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgYWxsIHRoZVxuICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZCwgb3IgYW4gZXJyb3Igb2NjdXJzLiBSZXN1bHRzIGlzIGFuIGFycmF5XG4gKiBjb250YWluaW5nIHRoZSBjb25jYXRlbmF0ZWQgcmVzdWx0cyBvZiB0aGUgYGl0ZXJhdGVlYCBmdW5jdGlvbi4gSW52b2tlZCB3aXRoXG4gKiAoZXJyLCByZXN1bHRzKS5cbiAqL1xudmFyIGNvbmNhdFNlcmllcyA9IGRvU2VyaWVzKGNvbmNhdCQxKTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aGVuIGNhbGxlZCwgY2FsbHMtYmFjayB3aXRoIHRoZSB2YWx1ZXMgcHJvdmlkZWQuXG4gKiBVc2VmdWwgYXMgdGhlIGZpcnN0IGZ1bmN0aW9uIGluIGEgW2B3YXRlcmZhbGxgXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cud2F0ZXJmYWxsfSwgb3IgZm9yIHBsdWdnaW5nIHZhbHVlcyBpbiB0b1xuICogW2BhdXRvYF17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LmF1dG99LlxuICpcbiAqIEBuYW1lIGNvbnN0YW50XG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOlV0aWxzXG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgVXRpbFxuICogQHBhcmFtIHsuLi4qfSBhcmd1bWVudHMuLi4gLSBBbnkgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBhdXRvbWF0aWNhbGx5IGludm9rZVxuICogY2FsbGJhY2sgd2l0aC5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2hlbiBpbnZva2VkLCBhdXRvbWF0aWNhbGx5XG4gKiBpbnZva2VzIHRoZSBjYWxsYmFjayB3aXRoIHRoZSBwcmV2aW91cyBnaXZlbiBhcmd1bWVudHMuXG4gKiBAZXhhbXBsZVxuICpcbiAqIGFzeW5jLndhdGVyZmFsbChbXG4gKiAgICAgYXN5bmMuY29uc3RhbnQoNDIpLFxuICogICAgIGZ1bmN0aW9uICh2YWx1ZSwgbmV4dCkge1xuICogICAgICAgICAvLyB2YWx1ZSA9PT0gNDJcbiAqICAgICB9LFxuICogICAgIC8vLi4uXG4gKiBdLCBjYWxsYmFjayk7XG4gKlxuICogYXN5bmMud2F0ZXJmYWxsKFtcbiAqICAgICBhc3luYy5jb25zdGFudChmaWxlbmFtZSwgXCJ1dGY4XCIpLFxuICogICAgIGZzLnJlYWRGaWxlLFxuICogICAgIGZ1bmN0aW9uIChmaWxlRGF0YSwgbmV4dCkge1xuICogICAgICAgICAvLy4uLlxuICogICAgIH1cbiAqICAgICAvLy4uLlxuICogXSwgY2FsbGJhY2spO1xuICpcbiAqIGFzeW5jLmF1dG8oe1xuICogICAgIGhvc3RuYW1lOiBhc3luYy5jb25zdGFudChcImh0dHBzOi8vc2VydmVyLm5ldC9cIiksXG4gKiAgICAgcG9ydDogZmluZEZyZWVQb3J0LFxuICogICAgIGxhdW5jaFNlcnZlcjogW1wiaG9zdG5hbWVcIiwgXCJwb3J0XCIsIGZ1bmN0aW9uIChvcHRpb25zLCBjYikge1xuICogICAgICAgICBzdGFydFNlcnZlcihvcHRpb25zLCBjYik7XG4gKiAgICAgfV0sXG4gKiAgICAgLy8uLi5cbiAqIH0sIGNhbGxiYWNrKTtcbiAqL1xudmFyIGNvbnN0YW50ID0gcmVzdChmdW5jdGlvbiAodmFsdWVzKSB7XG4gICAgdmFyIGFyZ3MgPSBbbnVsbF0uY29uY2F0KHZhbHVlcyk7XG4gICAgcmV0dXJuIGluaXRpYWxQYXJhbXMoZnVuY3Rpb24gKGlnbm9yZWRBcmdzLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2suYXBwbHkodGhpcywgYXJncyk7XG4gICAgfSk7XG59KTtcblxuZnVuY3Rpb24gX2NyZWF0ZVRlc3RlcihjaGVjaywgZ2V0UmVzdWx0KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChlYWNoZm4sIGFyciwgaXRlcmF0ZWUsIGNiKSB7XG4gICAgICAgIGNiID0gY2IgfHwgbm9vcDtcbiAgICAgICAgdmFyIHRlc3RQYXNzZWQgPSBmYWxzZTtcbiAgICAgICAgdmFyIHRlc3RSZXN1bHQ7XG4gICAgICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh2YWx1ZSwgXywgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdGVlKHZhbHVlLCBmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaGVjayhyZXN1bHQpICYmICF0ZXN0UmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRlc3RQYXNzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0ZXN0UmVzdWx0ID0gZ2V0UmVzdWx0KHRydWUsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgYnJlYWtMb29wKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY2IoZXJyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2IobnVsbCwgdGVzdFBhc3NlZCA/IHRlc3RSZXN1bHQgOiBnZXRSZXN1bHQoZmFsc2UpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gX2ZpbmRHZXRSZXN1bHQodiwgeCkge1xuICAgIHJldHVybiB4O1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGZpcnN0IHZhbHVlIGluIGBjb2xsYCB0aGF0IHBhc3NlcyBhbiBhc3luYyB0cnV0aCB0ZXN0LiBUaGVcbiAqIGBpdGVyYXRlZWAgaXMgYXBwbGllZCBpbiBwYXJhbGxlbCwgbWVhbmluZyB0aGUgZmlyc3QgaXRlcmF0ZWUgdG8gcmV0dXJuXG4gKiBgdHJ1ZWAgd2lsbCBmaXJlIHRoZSBkZXRlY3QgYGNhbGxiYWNrYCB3aXRoIHRoYXQgcmVzdWx0LiBUaGF0IG1lYW5zIHRoZVxuICogcmVzdWx0IG1pZ2h0IG5vdCBiZSB0aGUgZmlyc3QgaXRlbSBpbiB0aGUgb3JpZ2luYWwgYGNvbGxgIChpbiB0ZXJtcyBvZiBvcmRlcilcbiAqIHRoYXQgcGFzc2VzIHRoZSB0ZXN0LlxuXG4gKiBJZiBvcmRlciB3aXRoaW4gdGhlIG9yaWdpbmFsIGBjb2xsYCBpcyBpbXBvcnRhbnQsIHRoZW4gbG9vayBhdFxuICogW2BkZXRlY3RTZXJpZXNgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZGV0ZWN0U2VyaWVzfS5cbiAqXG4gKiBAbmFtZSBkZXRlY3RcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAqIEBtZXRob2RcbiAqIEBhbGlhcyBmaW5kXG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIC0gQSB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiBgY29sbGAuXG4gKiBUaGUgaXRlcmF0ZWUgaXMgcGFzc2VkIGEgYGNhbGxiYWNrKGVyciwgdHJ1dGhWYWx1ZSlgIHdoaWNoIG11c3QgYmUgY2FsbGVkXG4gKiB3aXRoIGEgYm9vbGVhbiBhcmd1bWVudCBvbmNlIGl0IGhhcyBjb21wbGV0ZWQuIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFzIHNvb24gYXMgYW55XG4gKiBpdGVyYXRlZSByZXR1cm5zIGB0cnVlYCwgb3IgYWZ0ZXIgYWxsIHRoZSBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLlxuICogUmVzdWx0IHdpbGwgYmUgdGhlIGZpcnN0IGl0ZW0gaW4gdGhlIGFycmF5IHRoYXQgcGFzc2VzIHRoZSB0cnV0aCB0ZXN0XG4gKiAoaXRlcmF0ZWUpIG9yIHRoZSB2YWx1ZSBgdW5kZWZpbmVkYCBpZiBub25lIHBhc3NlZC4gSW52b2tlZCB3aXRoXG4gKiAoZXJyLCByZXN1bHQpLlxuICogQGV4YW1wbGVcbiAqXG4gKiBhc3luYy5kZXRlY3QoWydmaWxlMScsJ2ZpbGUyJywnZmlsZTMnXSwgZnVuY3Rpb24oZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG4gKiAgICAgZnMuYWNjZXNzKGZpbGVQYXRoLCBmdW5jdGlvbihlcnIpIHtcbiAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgIWVycilcbiAqICAgICB9KTtcbiAqIH0sIGZ1bmN0aW9uKGVyciwgcmVzdWx0KSB7XG4gKiAgICAgLy8gcmVzdWx0IG5vdyBlcXVhbHMgdGhlIGZpcnN0IGZpbGUgaW4gdGhlIGxpc3QgdGhhdCBleGlzdHNcbiAqIH0pO1xuICovXG52YXIgZGV0ZWN0ID0gZG9QYXJhbGxlbChfY3JlYXRlVGVzdGVyKGlkZW50aXR5LCBfZmluZEdldFJlc3VsdCkpO1xuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFtgZGV0ZWN0YF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmRldGVjdH0gYnV0IHJ1bnMgYSBtYXhpbXVtIG9mIGBsaW1pdGAgYXN5bmMgb3BlcmF0aW9ucyBhdCBhXG4gKiB0aW1lLlxuICpcbiAqIEBuYW1lIGRldGVjdExpbWl0XG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5kZXRlY3Rde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5kZXRlY3R9XG4gKiBAYWxpYXMgZmluZExpbWl0XG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7bnVtYmVyfSBsaW1pdCAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIC0gQSB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiBgY29sbGAuXG4gKiBUaGUgaXRlcmF0ZWUgaXMgcGFzc2VkIGEgYGNhbGxiYWNrKGVyciwgdHJ1dGhWYWx1ZSlgIHdoaWNoIG11c3QgYmUgY2FsbGVkXG4gKiB3aXRoIGEgYm9vbGVhbiBhcmd1bWVudCBvbmNlIGl0IGhhcyBjb21wbGV0ZWQuIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFzIHNvb24gYXMgYW55XG4gKiBpdGVyYXRlZSByZXR1cm5zIGB0cnVlYCwgb3IgYWZ0ZXIgYWxsIHRoZSBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLlxuICogUmVzdWx0IHdpbGwgYmUgdGhlIGZpcnN0IGl0ZW0gaW4gdGhlIGFycmF5IHRoYXQgcGFzc2VzIHRoZSB0cnV0aCB0ZXN0XG4gKiAoaXRlcmF0ZWUpIG9yIHRoZSB2YWx1ZSBgdW5kZWZpbmVkYCBpZiBub25lIHBhc3NlZC4gSW52b2tlZCB3aXRoXG4gKiAoZXJyLCByZXN1bHQpLlxuICovXG52YXIgZGV0ZWN0TGltaXQgPSBkb1BhcmFsbGVsTGltaXQoX2NyZWF0ZVRlc3RlcihpZGVudGl0eSwgX2ZpbmRHZXRSZXN1bHQpKTtcblxuLyoqXG4gKiBUaGUgc2FtZSBhcyBbYGRldGVjdGBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5kZXRlY3R9IGJ1dCBydW5zIG9ubHkgYSBzaW5nbGUgYXN5bmMgb3BlcmF0aW9uIGF0IGEgdGltZS5cbiAqXG4gKiBAbmFtZSBkZXRlY3RTZXJpZXNcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAqIEBtZXRob2RcbiAqIEBzZWUgW2FzeW5jLmRldGVjdF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmRldGVjdH1cbiAqIEBhbGlhcyBmaW5kU2VyaWVzXG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIC0gQSB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiBgY29sbGAuXG4gKiBUaGUgaXRlcmF0ZWUgaXMgcGFzc2VkIGEgYGNhbGxiYWNrKGVyciwgdHJ1dGhWYWx1ZSlgIHdoaWNoIG11c3QgYmUgY2FsbGVkXG4gKiB3aXRoIGEgYm9vbGVhbiBhcmd1bWVudCBvbmNlIGl0IGhhcyBjb21wbGV0ZWQuIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFzIHNvb24gYXMgYW55XG4gKiBpdGVyYXRlZSByZXR1cm5zIGB0cnVlYCwgb3IgYWZ0ZXIgYWxsIHRoZSBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLlxuICogUmVzdWx0IHdpbGwgYmUgdGhlIGZpcnN0IGl0ZW0gaW4gdGhlIGFycmF5IHRoYXQgcGFzc2VzIHRoZSB0cnV0aCB0ZXN0XG4gKiAoaXRlcmF0ZWUpIG9yIHRoZSB2YWx1ZSBgdW5kZWZpbmVkYCBpZiBub25lIHBhc3NlZC4gSW52b2tlZCB3aXRoXG4gKiAoZXJyLCByZXN1bHQpLlxuICovXG52YXIgZGV0ZWN0U2VyaWVzID0gZG9MaW1pdChkZXRlY3RMaW1pdCwgMSk7XG5cbmZ1bmN0aW9uIGNvbnNvbGVGdW5jKG5hbWUpIHtcbiAgICByZXR1cm4gcmVzdChmdW5jdGlvbiAoZm4sIGFyZ3MpIHtcbiAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJncy5jb25jYXQocmVzdChmdW5jdGlvbiAoZXJyLCBhcmdzKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29uc29sZS5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjb25zb2xlW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgIGFycmF5RWFjaChhcmdzLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZVtuYW1lXSh4KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KSkpO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIExvZ3MgdGhlIHJlc3VsdCBvZiBhbiBgYXN5bmNgIGZ1bmN0aW9uIHRvIHRoZSBgY29uc29sZWAgdXNpbmcgYGNvbnNvbGUuZGlyYFxuICogdG8gZGlzcGxheSB0aGUgcHJvcGVydGllcyBvZiB0aGUgcmVzdWx0aW5nIG9iamVjdC4gT25seSB3b3JrcyBpbiBOb2RlLmpzIG9yXG4gKiBpbiBicm93c2VycyB0aGF0IHN1cHBvcnQgYGNvbnNvbGUuZGlyYCBhbmQgYGNvbnNvbGUuZXJyb3JgIChzdWNoIGFzIEZGIGFuZFxuICogQ2hyb21lKS4gSWYgbXVsdGlwbGUgYXJndW1lbnRzIGFyZSByZXR1cm5lZCBmcm9tIHRoZSBhc3luYyBmdW5jdGlvbixcbiAqIGBjb25zb2xlLmRpcmAgaXMgY2FsbGVkIG9uIGVhY2ggYXJndW1lbnQgaW4gb3JkZXIuXG4gKlxuICogQG5hbWUgZGlyXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOlV0aWxzXG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgVXRpbFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuY3Rpb24gLSBUaGUgZnVuY3Rpb24geW91IHdhbnQgdG8gZXZlbnR1YWxseSBhcHBseSBhbGxcbiAqIGFyZ3VtZW50cyB0by5cbiAqIEBwYXJhbSB7Li4uKn0gYXJndW1lbnRzLi4uIC0gQW55IG51bWJlciBvZiBhcmd1bWVudHMgdG8gYXBwbHkgdG8gdGhlIGZ1bmN0aW9uLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBpbiBhIG1vZHVsZVxuICogdmFyIGhlbGxvID0gZnVuY3Rpb24obmFtZSwgY2FsbGJhY2spIHtcbiAqICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICogICAgICAgICBjYWxsYmFjayhudWxsLCB7aGVsbG86IG5hbWV9KTtcbiAqICAgICB9LCAxMDAwKTtcbiAqIH07XG4gKlxuICogLy8gaW4gdGhlIG5vZGUgcmVwbFxuICogbm9kZT4gYXN5bmMuZGlyKGhlbGxvLCAnd29ybGQnKTtcbiAqIHtoZWxsbzogJ3dvcmxkJ31cbiAqL1xudmFyIGRpciA9IGNvbnNvbGVGdW5jKCdkaXInKTtcblxuLyoqXG4gKiBUaGUgcG9zdC1jaGVjayB2ZXJzaW9uIG9mIFtgZHVyaW5nYF17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LmR1cmluZ30uIFRvIHJlZmxlY3QgdGhlIGRpZmZlcmVuY2UgaW5cbiAqIHRoZSBvcmRlciBvZiBvcGVyYXRpb25zLCB0aGUgYXJndW1lbnRzIGB0ZXN0YCBhbmQgYGZuYCBhcmUgc3dpdGNoZWQuXG4gKlxuICogQWxzbyBhIHZlcnNpb24gb2YgW2Bkb1doaWxzdGBde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5kb1doaWxzdH0gd2l0aCBhc3luY2hyb25vdXMgYHRlc3RgIGZ1bmN0aW9uLlxuICogQG5hbWUgZG9EdXJpbmdcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAqIEBtZXRob2RcbiAqIEBzZWUgW2FzeW5jLmR1cmluZ117QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LmR1cmluZ31cbiAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIC0gQSBmdW5jdGlvbiB3aGljaCBpcyBjYWxsZWQgZWFjaCB0aW1lIGB0ZXN0YCBwYXNzZXMuXG4gKiBUaGUgZnVuY3Rpb24gaXMgcGFzc2VkIGEgYGNhbGxiYWNrKGVycilgLCB3aGljaCBtdXN0IGJlIGNhbGxlZCBvbmNlIGl0IGhhc1xuICogY29tcGxldGVkIHdpdGggYW4gb3B0aW9uYWwgYGVycmAgYXJndW1lbnQuIEludm9rZWQgd2l0aCAoY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gdGVzdCAtIGFzeW5jaHJvbm91cyB0cnV0aCB0ZXN0IHRvIHBlcmZvcm0gYmVmb3JlIGVhY2hcbiAqIGV4ZWN1dGlvbiBvZiBgZm5gLiBJbnZva2VkIHdpdGggKC4uLmFyZ3MsIGNhbGxiYWNrKSwgd2hlcmUgYC4uLmFyZ3NgIGFyZSB0aGVcbiAqIG5vbi1lcnJvciBhcmdzIGZyb20gdGhlIHByZXZpb3VzIGNhbGxiYWNrIG9mIGBmbmAuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgdGhlIHRlc3RcbiAqIGZ1bmN0aW9uIGhhcyBmYWlsZWQgYW5kIHJlcGVhdGVkIGV4ZWN1dGlvbiBvZiBgZm5gIGhhcyBzdG9wcGVkLiBgY2FsbGJhY2tgXG4gKiB3aWxsIGJlIHBhc3NlZCBhbiBlcnJvciBpZiBvbmUgb2NjdXJlZCwgb3RoZXJ3aXNlIGBudWxsYC5cbiAqL1xuZnVuY3Rpb24gZG9EdXJpbmcoZm4sIHRlc3QsIGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sgPSBvbmx5T25jZShjYWxsYmFjayB8fCBub29wKTtcblxuICAgIHZhciBuZXh0ID0gcmVzdChmdW5jdGlvbiAoZXJyLCBhcmdzKSB7XG4gICAgICAgIGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICBhcmdzLnB1c2goY2hlY2spO1xuICAgICAgICB0ZXN0LmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gY2hlY2soZXJyLCB0cnV0aCkge1xuICAgICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgaWYgKCF0cnV0aCkgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICBmbihuZXh0KTtcbiAgICB9XG5cbiAgICBjaGVjayhudWxsLCB0cnVlKTtcbn1cblxuLyoqXG4gKiBUaGUgcG9zdC1jaGVjayB2ZXJzaW9uIG9mIFtgd2hpbHN0YF17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LndoaWxzdH0uIFRvIHJlZmxlY3QgdGhlIGRpZmZlcmVuY2UgaW5cbiAqIHRoZSBvcmRlciBvZiBvcGVyYXRpb25zLCB0aGUgYXJndW1lbnRzIGB0ZXN0YCBhbmQgYGl0ZXJhdGVlYCBhcmUgc3dpdGNoZWQuXG4gKlxuICogYGRvV2hpbHN0YCBpcyB0byBgd2hpbHN0YCBhcyBgZG8gd2hpbGVgIGlzIHRvIGB3aGlsZWAgaW4gcGxhaW4gSmF2YVNjcmlwdC5cbiAqXG4gKiBAbmFtZSBkb1doaWxzdFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMud2hpbHN0XXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cud2hpbHN0fVxuICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIGZ1bmN0aW9uIHdoaWNoIGlzIGNhbGxlZCBlYWNoIHRpbWUgYHRlc3RgXG4gKiBwYXNzZXMuIFRoZSBmdW5jdGlvbiBpcyBwYXNzZWQgYSBgY2FsbGJhY2soZXJyKWAsIHdoaWNoIG11c3QgYmUgY2FsbGVkIG9uY2VcbiAqIGl0IGhhcyBjb21wbGV0ZWQgd2l0aCBhbiBvcHRpb25hbCBgZXJyYCBhcmd1bWVudC4gSW52b2tlZCB3aXRoIChjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB0ZXN0IC0gc3luY2hyb25vdXMgdHJ1dGggdGVzdCB0byBwZXJmb3JtIGFmdGVyIGVhY2hcbiAqIGV4ZWN1dGlvbiBvZiBgaXRlcmF0ZWVgLiBJbnZva2VkIHdpdGggdGhlIG5vbi1lcnJvciBjYWxsYmFjayByZXN1bHRzIG9mIFxuICogYGl0ZXJhdGVlYC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhZnRlciB0aGUgdGVzdFxuICogZnVuY3Rpb24gaGFzIGZhaWxlZCBhbmQgcmVwZWF0ZWQgZXhlY3V0aW9uIG9mIGBpdGVyYXRlZWAgaGFzIHN0b3BwZWQuXG4gKiBgY2FsbGJhY2tgIHdpbGwgYmUgcGFzc2VkIGFuIGVycm9yIGFuZCBhbnkgYXJndW1lbnRzIHBhc3NlZCB0byB0aGUgZmluYWxcbiAqIGBpdGVyYXRlZWAncyBjYWxsYmFjay4gSW52b2tlZCB3aXRoIChlcnIsIFtyZXN1bHRzXSk7XG4gKi9cbmZ1bmN0aW9uIGRvV2hpbHN0KGl0ZXJhdGVlLCB0ZXN0LCBjYWxsYmFjaykge1xuICAgIGNhbGxiYWNrID0gb25seU9uY2UoY2FsbGJhY2sgfHwgbm9vcCk7XG4gICAgdmFyIG5leHQgPSByZXN0KGZ1bmN0aW9uIChlcnIsIGFyZ3MpIHtcbiAgICAgICAgaWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgIGlmICh0ZXN0LmFwcGx5KHRoaXMsIGFyZ3MpKSByZXR1cm4gaXRlcmF0ZWUobmV4dCk7XG4gICAgICAgIGNhbGxiYWNrLmFwcGx5KG51bGwsIFtudWxsXS5jb25jYXQoYXJncykpO1xuICAgIH0pO1xuICAgIGl0ZXJhdGVlKG5leHQpO1xufVxuXG4vKipcbiAqIExpa2UgWydkb1doaWxzdCdde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5kb1doaWxzdH0sIGV4Y2VwdCB0aGUgYHRlc3RgIGlzIGludmVydGVkLiBOb3RlIHRoZVxuICogYXJndW1lbnQgb3JkZXJpbmcgZGlmZmVycyBmcm9tIGB1bnRpbGAuXG4gKlxuICogQG5hbWUgZG9VbnRpbFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMuZG9XaGlsc3Rde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy5kb1doaWxzdH1cbiAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIC0gQSBmdW5jdGlvbiB3aGljaCBpcyBjYWxsZWQgZWFjaCB0aW1lIGB0ZXN0YCBmYWlscy5cbiAqIFRoZSBmdW5jdGlvbiBpcyBwYXNzZWQgYSBgY2FsbGJhY2soZXJyKWAsIHdoaWNoIG11c3QgYmUgY2FsbGVkIG9uY2UgaXQgaGFzXG4gKiBjb21wbGV0ZWQgd2l0aCBhbiBvcHRpb25hbCBgZXJyYCBhcmd1bWVudC4gSW52b2tlZCB3aXRoIChjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB0ZXN0IC0gc3luY2hyb25vdXMgdHJ1dGggdGVzdCB0byBwZXJmb3JtIGFmdGVyIGVhY2hcbiAqIGV4ZWN1dGlvbiBvZiBgZm5gLiBJbnZva2VkIHdpdGggdGhlIG5vbi1lcnJvciBjYWxsYmFjayByZXN1bHRzIG9mIGBmbmAuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgdGhlIHRlc3RcbiAqIGZ1bmN0aW9uIGhhcyBwYXNzZWQgYW5kIHJlcGVhdGVkIGV4ZWN1dGlvbiBvZiBgZm5gIGhhcyBzdG9wcGVkLiBgY2FsbGJhY2tgXG4gKiB3aWxsIGJlIHBhc3NlZCBhbiBlcnJvciBhbmQgYW55IGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIGZpbmFsIGBmbmAnc1xuICogY2FsbGJhY2suIEludm9rZWQgd2l0aCAoZXJyLCBbcmVzdWx0c10pO1xuICovXG5mdW5jdGlvbiBkb1VudGlsKGZuLCB0ZXN0LCBjYWxsYmFjaykge1xuICAgIGRvV2hpbHN0KGZuLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAhdGVzdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH0sIGNhbGxiYWNrKTtcbn1cblxuLyoqXG4gKiBMaWtlIFtgd2hpbHN0YF17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LndoaWxzdH0sIGV4Y2VwdCB0aGUgYHRlc3RgIGlzIGFuIGFzeW5jaHJvbm91cyBmdW5jdGlvbiB0aGF0XG4gKiBpcyBwYXNzZWQgYSBjYWxsYmFjayBpbiB0aGUgZm9ybSBvZiBgZnVuY3Rpb24gKGVyciwgdHJ1dGgpYC4gSWYgZXJyb3IgaXNcbiAqIHBhc3NlZCB0byBgdGVzdGAgb3IgYGZuYCwgdGhlIG1haW4gY2FsbGJhY2sgaXMgaW1tZWRpYXRlbHkgY2FsbGVkIHdpdGggdGhlXG4gKiB2YWx1ZSBvZiB0aGUgZXJyb3IuXG4gKlxuICogQG5hbWUgZHVyaW5nXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy53aGlsc3Rde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy53aGlsc3R9XG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB0ZXN0IC0gYXN5bmNocm9ub3VzIHRydXRoIHRlc3QgdG8gcGVyZm9ybSBiZWZvcmUgZWFjaFxuICogZXhlY3V0aW9uIG9mIGBmbmAuIEludm9rZWQgd2l0aCAoY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gLSBBIGZ1bmN0aW9uIHdoaWNoIGlzIGNhbGxlZCBlYWNoIHRpbWUgYHRlc3RgIHBhc3Nlcy5cbiAqIFRoZSBmdW5jdGlvbiBpcyBwYXNzZWQgYSBgY2FsbGJhY2soZXJyKWAsIHdoaWNoIG11c3QgYmUgY2FsbGVkIG9uY2UgaXQgaGFzXG4gKiBjb21wbGV0ZWQgd2l0aCBhbiBvcHRpb25hbCBgZXJyYCBhcmd1bWVudC4gSW52b2tlZCB3aXRoIChjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgdGhlIHRlc3RcbiAqIGZ1bmN0aW9uIGhhcyBmYWlsZWQgYW5kIHJlcGVhdGVkIGV4ZWN1dGlvbiBvZiBgZm5gIGhhcyBzdG9wcGVkLiBgY2FsbGJhY2tgXG4gKiB3aWxsIGJlIHBhc3NlZCBhbiBlcnJvciwgaWYgb25lIG9jY3VyZWQsIG90aGVyd2lzZSBgbnVsbGAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBjb3VudCA9IDA7XG4gKlxuICogYXN5bmMuZHVyaW5nKFxuICogICAgIGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICogICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgY291bnQgPCA1KTtcbiAqICAgICB9LFxuICogICAgIGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICogICAgICAgICBjb3VudCsrO1xuICogICAgICAgICBzZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwKTtcbiAqICAgICB9LFxuICogICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgICAgLy8gNSBzZWNvbmRzIGhhdmUgcGFzc2VkXG4gKiAgICAgfVxuICogKTtcbiAqL1xuZnVuY3Rpb24gZHVyaW5nKHRlc3QsIGZuLCBjYWxsYmFjaykge1xuICAgIGNhbGxiYWNrID0gb25seU9uY2UoY2FsbGJhY2sgfHwgbm9vcCk7XG5cbiAgICBmdW5jdGlvbiBuZXh0KGVycikge1xuICAgICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgdGVzdChjaGVjayk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2soZXJyLCB0cnV0aCkge1xuICAgICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgaWYgKCF0cnV0aCkgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICBmbihuZXh0KTtcbiAgICB9XG5cbiAgICB0ZXN0KGNoZWNrKTtcbn1cblxuZnVuY3Rpb24gX3dpdGhvdXRJbmRleChpdGVyYXRlZSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAodmFsdWUsIGluZGV4LCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gaXRlcmF0ZWUodmFsdWUsIGNhbGxiYWNrKTtcbiAgICB9O1xufVxuXG4vKipcbiAqIEFwcGxpZXMgdGhlIGZ1bmN0aW9uIGBpdGVyYXRlZWAgdG8gZWFjaCBpdGVtIGluIGBjb2xsYCwgaW4gcGFyYWxsZWwuXG4gKiBUaGUgYGl0ZXJhdGVlYCBpcyBjYWxsZWQgd2l0aCBhbiBpdGVtIGZyb20gdGhlIGxpc3QsIGFuZCBhIGNhbGxiYWNrIGZvciB3aGVuXG4gKiBpdCBoYXMgZmluaXNoZWQuIElmIHRoZSBgaXRlcmF0ZWVgIHBhc3NlcyBhbiBlcnJvciB0byBpdHMgYGNhbGxiYWNrYCwgdGhlXG4gKiBtYWluIGBjYWxsYmFja2AgKGZvciB0aGUgYGVhY2hgIGZ1bmN0aW9uKSBpcyBpbW1lZGlhdGVseSBjYWxsZWQgd2l0aCB0aGVcbiAqIGVycm9yLlxuICpcbiAqIE5vdGUsIHRoYXQgc2luY2UgdGhpcyBmdW5jdGlvbiBhcHBsaWVzIGBpdGVyYXRlZWAgdG8gZWFjaCBpdGVtIGluIHBhcmFsbGVsLFxuICogdGhlcmUgaXMgbm8gZ3VhcmFudGVlIHRoYXQgdGhlIGl0ZXJhdGVlIGZ1bmN0aW9ucyB3aWxsIGNvbXBsZXRlIGluIG9yZGVyLlxuICpcbiAqIEBuYW1lIGVhY2hcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAqIEBtZXRob2RcbiAqIEBhbGlhcyBmb3JFYWNoXG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIGVhY2ggaXRlbVxuICogaW4gYGNvbGxgLiBUaGUgaXRlcmF0ZWUgaXMgcGFzc2VkIGEgYGNhbGxiYWNrKGVycilgIHdoaWNoIG11c3QgYmUgY2FsbGVkIG9uY2VcbiAqIGl0IGhhcyBjb21wbGV0ZWQuIElmIG5vIGVycm9yIGhhcyBvY2N1cnJlZCwgdGhlIGBjYWxsYmFja2Agc2hvdWxkIGJlIHJ1blxuICogd2l0aG91dCBhcmd1bWVudHMgb3Igd2l0aCBhbiBleHBsaWNpdCBgbnVsbGAgYXJndW1lbnQuIFRoZSBhcnJheSBpbmRleCBpcyBub3RcbiAqIHBhc3NlZCB0byB0aGUgaXRlcmF0ZWUuIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLiBJZiB5b3UgbmVlZCB0aGUgaW5kZXgsXG4gKiB1c2UgYGVhY2hPZmAuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgd2hlbiBhbGxcbiAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gSW52b2tlZCB3aXRoIChlcnIpLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBhc3N1bWluZyBvcGVuRmlsZXMgaXMgYW4gYXJyYXkgb2YgZmlsZSBuYW1lcyBhbmQgc2F2ZUZpbGUgaXMgYSBmdW5jdGlvblxuICogLy8gdG8gc2F2ZSB0aGUgbW9kaWZpZWQgY29udGVudHMgb2YgdGhhdCBmaWxlOlxuICpcbiAqIGFzeW5jLmVhY2gob3BlbkZpbGVzLCBzYXZlRmlsZSwgZnVuY3Rpb24oZXJyKXtcbiAqICAgLy8gaWYgYW55IG9mIHRoZSBzYXZlcyBwcm9kdWNlZCBhbiBlcnJvciwgZXJyIHdvdWxkIGVxdWFsIHRoYXQgZXJyb3JcbiAqIH0pO1xuICpcbiAqIC8vIGFzc3VtaW5nIG9wZW5GaWxlcyBpcyBhbiBhcnJheSBvZiBmaWxlIG5hbWVzXG4gKiBhc3luYy5lYWNoKG9wZW5GaWxlcywgZnVuY3Rpb24oZmlsZSwgY2FsbGJhY2spIHtcbiAqXG4gKiAgICAgLy8gUGVyZm9ybSBvcGVyYXRpb24gb24gZmlsZSBoZXJlLlxuICogICAgIGNvbnNvbGUubG9nKCdQcm9jZXNzaW5nIGZpbGUgJyArIGZpbGUpO1xuICpcbiAqICAgICBpZiggZmlsZS5sZW5ndGggPiAzMiApIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKCdUaGlzIGZpbGUgbmFtZSBpcyB0b28gbG9uZycpO1xuICogICAgICAgY2FsbGJhY2soJ0ZpbGUgbmFtZSB0b28gbG9uZycpO1xuICogICAgIH0gZWxzZSB7XG4gKiAgICAgICAvLyBEbyB3b3JrIHRvIHByb2Nlc3MgZmlsZSBoZXJlXG4gKiAgICAgICBjb25zb2xlLmxvZygnRmlsZSBwcm9jZXNzZWQnKTtcbiAqICAgICAgIGNhbGxiYWNrKCk7XG4gKiAgICAgfVxuICogfSwgZnVuY3Rpb24oZXJyKSB7XG4gKiAgICAgLy8gaWYgYW55IG9mIHRoZSBmaWxlIHByb2Nlc3NpbmcgcHJvZHVjZWQgYW4gZXJyb3IsIGVyciB3b3VsZCBlcXVhbCB0aGF0IGVycm9yXG4gKiAgICAgaWYoIGVyciApIHtcbiAqICAgICAgIC8vIE9uZSBvZiB0aGUgaXRlcmF0aW9ucyBwcm9kdWNlZCBhbiBlcnJvci5cbiAqICAgICAgIC8vIEFsbCBwcm9jZXNzaW5nIHdpbGwgbm93IHN0b3AuXG4gKiAgICAgICBjb25zb2xlLmxvZygnQSBmaWxlIGZhaWxlZCB0byBwcm9jZXNzJyk7XG4gKiAgICAgfSBlbHNlIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKCdBbGwgZmlsZXMgaGF2ZSBiZWVuIHByb2Nlc3NlZCBzdWNjZXNzZnVsbHknKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuZnVuY3Rpb24gZWFjaExpbWl0KGNvbGwsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICBlYWNoT2YoY29sbCwgX3dpdGhvdXRJbmRleChpdGVyYXRlZSksIGNhbGxiYWNrKTtcbn1cblxuLyoqXG4gKiBUaGUgc2FtZSBhcyBbYGVhY2hgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZWFjaH0gYnV0IHJ1bnMgYSBtYXhpbXVtIG9mIGBsaW1pdGAgYXN5bmMgb3BlcmF0aW9ucyBhdCBhIHRpbWUuXG4gKlxuICogQG5hbWUgZWFjaExpbWl0XG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5lYWNoXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZWFjaH1cbiAqIEBhbGlhcyBmb3JFYWNoTGltaXRcbiAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge251bWJlcn0gbGltaXQgLSBUaGUgbWF4aW11bSBudW1iZXIgb2YgYXN5bmMgb3BlcmF0aW9ucyBhdCBhIHRpbWUuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEEgZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaCBpdGVtIGluIGBjb2xsYC4gVGhlXG4gKiBpdGVyYXRlZSBpcyBwYXNzZWQgYSBgY2FsbGJhY2soZXJyKWAgd2hpY2ggbXVzdCBiZSBjYWxsZWQgb25jZSBpdCBoYXNcbiAqIGNvbXBsZXRlZC4gSWYgbm8gZXJyb3IgaGFzIG9jY3VycmVkLCB0aGUgYGNhbGxiYWNrYCBzaG91bGQgYmUgcnVuIHdpdGhvdXRcbiAqIGFyZ3VtZW50cyBvciB3aXRoIGFuIGV4cGxpY2l0IGBudWxsYCBhcmd1bWVudC4gVGhlIGFycmF5IGluZGV4IGlzIG5vdCBwYXNzZWRcbiAqIHRvIHRoZSBpdGVyYXRlZS4gSW52b2tlZCB3aXRoIChpdGVtLCBjYWxsYmFjaykuIElmIHlvdSBuZWVkIHRoZSBpbmRleCwgdXNlXG4gKiBgZWFjaE9mTGltaXRgLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gYWxsXG4gKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLCBvciBhbiBlcnJvciBvY2N1cnMuIEludm9rZWQgd2l0aCAoZXJyKS5cbiAqL1xuZnVuY3Rpb24gZWFjaExpbWl0JDEoY29sbCwgbGltaXQsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICBfZWFjaE9mTGltaXQobGltaXQpKGNvbGwsIF93aXRob3V0SW5kZXgoaXRlcmF0ZWUpLCBjYWxsYmFjayk7XG59XG5cbi8qKlxuICogVGhlIHNhbWUgYXMgW2BlYWNoYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmVhY2h9IGJ1dCBydW5zIG9ubHkgYSBzaW5nbGUgYXN5bmMgb3BlcmF0aW9uIGF0IGEgdGltZS5cbiAqXG4gKiBAbmFtZSBlYWNoU2VyaWVzXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5lYWNoXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZWFjaH1cbiAqIEBhbGlhcyBmb3JFYWNoU2VyaWVzXG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIGVhY2hcbiAqIGl0ZW0gaW4gYGNvbGxgLiBUaGUgaXRlcmF0ZWUgaXMgcGFzc2VkIGEgYGNhbGxiYWNrKGVycilgIHdoaWNoIG11c3QgYmUgY2FsbGVkXG4gKiBvbmNlIGl0IGhhcyBjb21wbGV0ZWQuIElmIG5vIGVycm9yIGhhcyBvY2N1cnJlZCwgdGhlIGBjYWxsYmFja2Agc2hvdWxkIGJlIHJ1blxuICogd2l0aG91dCBhcmd1bWVudHMgb3Igd2l0aCBhbiBleHBsaWNpdCBgbnVsbGAgYXJndW1lbnQuIFRoZSBhcnJheSBpbmRleCBpc1xuICogbm90IHBhc3NlZCB0byB0aGUgaXRlcmF0ZWUuIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLiBJZiB5b3UgbmVlZCB0aGVcbiAqIGluZGV4LCB1c2UgYGVhY2hPZlNlcmllc2AuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgd2hlbiBhbGxcbiAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQsIG9yIGFuIGVycm9yIG9jY3Vycy4gSW52b2tlZCB3aXRoIChlcnIpLlxuICovXG52YXIgZWFjaFNlcmllcyA9IGRvTGltaXQoZWFjaExpbWl0JDEsIDEpO1xuXG4vKipcbiAqIFdyYXAgYW4gYXN5bmMgZnVuY3Rpb24gYW5kIGVuc3VyZSBpdCBjYWxscyBpdHMgY2FsbGJhY2sgb24gYSBsYXRlciB0aWNrIG9mXG4gKiB0aGUgZXZlbnQgbG9vcC4gIElmIHRoZSBmdW5jdGlvbiBhbHJlYWR5IGNhbGxzIGl0cyBjYWxsYmFjayBvbiBhIG5leHQgdGljayxcbiAqIG5vIGV4dHJhIGRlZmVycmFsIGlzIGFkZGVkLiBUaGlzIGlzIHVzZWZ1bCBmb3IgcHJldmVudGluZyBzdGFjayBvdmVyZmxvd3NcbiAqIChgUmFuZ2VFcnJvcjogTWF4aW11bSBjYWxsIHN0YWNrIHNpemUgZXhjZWVkZWRgKSBhbmQgZ2VuZXJhbGx5IGtlZXBpbmdcbiAqIFtaYWxnb10oaHR0cDovL2Jsb2cuaXpzLm1lL3Bvc3QvNTkxNDI3NDIxNDMvZGVzaWduaW5nLWFwaXMtZm9yLWFzeW5jaHJvbnkpXG4gKiBjb250YWluZWQuXG4gKlxuICogQG5hbWUgZW5zdXJlQXN5bmNcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6VXRpbHNcbiAqIEBtZXRob2RcbiAqIEBjYXRlZ29yeSBVdGlsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiAtIGFuIGFzeW5jIGZ1bmN0aW9uLCBvbmUgdGhhdCBleHBlY3RzIGEgbm9kZS1zdHlsZVxuICogY2FsbGJhY2sgYXMgaXRzIGxhc3QgYXJndW1lbnQuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgYSB3cmFwcGVkIGZ1bmN0aW9uIHdpdGggdGhlIGV4YWN0IHNhbWUgY2FsbFxuICogc2lnbmF0dXJlIGFzIHRoZSBmdW5jdGlvbiBwYXNzZWQgaW4uXG4gKiBAZXhhbXBsZVxuICpcbiAqIGZ1bmN0aW9uIHNvbWV0aW1lc0FzeW5jKGFyZywgY2FsbGJhY2spIHtcbiAqICAgICBpZiAoY2FjaGVbYXJnXSkge1xuICogICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgY2FjaGVbYXJnXSk7IC8vIHRoaXMgd291bGQgYmUgc3luY2hyb25vdXMhIVxuICogICAgIH0gZWxzZSB7XG4gKiAgICAgICAgIGRvU29tZUlPKGFyZywgY2FsbGJhY2spOyAvLyB0aGlzIElPIHdvdWxkIGJlIGFzeW5jaHJvbm91c1xuICogICAgIH1cbiAqIH1cbiAqXG4gKiAvLyB0aGlzIGhhcyBhIHJpc2sgb2Ygc3RhY2sgb3ZlcmZsb3dzIGlmIG1hbnkgcmVzdWx0cyBhcmUgY2FjaGVkIGluIGEgcm93XG4gKiBhc3luYy5tYXBTZXJpZXMoYXJncywgc29tZXRpbWVzQXN5bmMsIGRvbmUpO1xuICpcbiAqIC8vIHRoaXMgd2lsbCBkZWZlciBzb21ldGltZXNBc3luYydzIGNhbGxiYWNrIGlmIG5lY2Vzc2FyeSxcbiAqIC8vIHByZXZlbnRpbmcgc3RhY2sgb3ZlcmZsb3dzXG4gKiBhc3luYy5tYXBTZXJpZXMoYXJncywgYXN5bmMuZW5zdXJlQXN5bmMoc29tZXRpbWVzQXN5bmMpLCBkb25lKTtcbiAqL1xuZnVuY3Rpb24gZW5zdXJlQXN5bmMoZm4pIHtcbiAgICByZXR1cm4gaW5pdGlhbFBhcmFtcyhmdW5jdGlvbiAoYXJncywgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHN5bmMgPSB0cnVlO1xuICAgICAgICBhcmdzLnB1c2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGlubmVyQXJncyA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgIGlmIChzeW5jKSB7XG4gICAgICAgICAgICAgICAgc2V0SW1tZWRpYXRlJDEoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBpbm5lckFyZ3MpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBpbm5lckFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgZm4uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIHN5bmMgPSBmYWxzZTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gbm90SWQodikge1xuICAgIHJldHVybiAhdjtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGB0cnVlYCBpZiBldmVyeSBlbGVtZW50IGluIGBjb2xsYCBzYXRpc2ZpZXMgYW4gYXN5bmMgdGVzdC4gSWYgYW55XG4gKiBpdGVyYXRlZSBjYWxsIHJldHVybnMgYGZhbHNlYCwgdGhlIG1haW4gYGNhbGxiYWNrYCBpcyBpbW1lZGlhdGVseSBjYWxsZWQuXG4gKlxuICogQG5hbWUgZXZlcnlcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAqIEBtZXRob2RcbiAqIEBhbGlhcyBhbGxcbiAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEEgdHJ1dGggdGVzdCB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW4gdGhlXG4gKiBjb2xsZWN0aW9uIGluIHBhcmFsbGVsLiBUaGUgaXRlcmF0ZWUgaXMgcGFzc2VkIGEgYGNhbGxiYWNrKGVyciwgdHJ1dGhWYWx1ZSlgXG4gKiB3aGljaCBtdXN0IGJlIGNhbGxlZCB3aXRoIGEgIGJvb2xlYW4gYXJndW1lbnQgb25jZSBpdCBoYXMgY29tcGxldGVkLiBJbnZva2VkXG4gKiB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgYWxsIHRoZVxuICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZC4gUmVzdWx0IHdpbGwgYmUgZWl0aGVyIGB0cnVlYCBvciBgZmFsc2VgXG4gKiBkZXBlbmRpbmcgb24gdGhlIHZhbHVlcyBvZiB0aGUgYXN5bmMgdGVzdHMuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHQpLlxuICogQGV4YW1wbGVcbiAqXG4gKiBhc3luYy5ldmVyeShbJ2ZpbGUxJywnZmlsZTInLCdmaWxlMyddLCBmdW5jdGlvbihmaWxlUGF0aCwgY2FsbGJhY2spIHtcbiAqICAgICBmcy5hY2Nlc3MoZmlsZVBhdGgsIGZ1bmN0aW9uKGVycikge1xuICogICAgICAgICBjYWxsYmFjayhudWxsLCAhZXJyKVxuICogICAgIH0pO1xuICogfSwgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAqICAgICAvLyBpZiByZXN1bHQgaXMgdHJ1ZSB0aGVuIGV2ZXJ5IGZpbGUgZXhpc3RzXG4gKiB9KTtcbiAqL1xudmFyIGV2ZXJ5ID0gZG9QYXJhbGxlbChfY3JlYXRlVGVzdGVyKG5vdElkLCBub3RJZCkpO1xuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFtgZXZlcnlgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZXZlcnl9IGJ1dCBydW5zIGEgbWF4aW11bSBvZiBgbGltaXRgIGFzeW5jIG9wZXJhdGlvbnMgYXQgYSB0aW1lLlxuICpcbiAqIEBuYW1lIGV2ZXJ5TGltaXRcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAqIEBtZXRob2RcbiAqIEBzZWUgW2FzeW5jLmV2ZXJ5XXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZXZlcnl9XG4gKiBAYWxpYXMgYWxsTGltaXRcbiAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge251bWJlcn0gbGltaXQgLSBUaGUgbWF4aW11bSBudW1iZXIgb2YgYXN5bmMgb3BlcmF0aW9ucyBhdCBhIHRpbWUuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEEgdHJ1dGggdGVzdCB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW4gdGhlXG4gKiBjb2xsZWN0aW9uIGluIHBhcmFsbGVsLiBUaGUgaXRlcmF0ZWUgaXMgcGFzc2VkIGEgYGNhbGxiYWNrKGVyciwgdHJ1dGhWYWx1ZSlgXG4gKiB3aGljaCBtdXN0IGJlIGNhbGxlZCB3aXRoIGEgIGJvb2xlYW4gYXJndW1lbnQgb25jZSBpdCBoYXMgY29tcGxldGVkLiBJbnZva2VkXG4gKiB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgYWxsIHRoZVxuICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZC4gUmVzdWx0IHdpbGwgYmUgZWl0aGVyIGB0cnVlYCBvciBgZmFsc2VgXG4gKiBkZXBlbmRpbmcgb24gdGhlIHZhbHVlcyBvZiB0aGUgYXN5bmMgdGVzdHMuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHQpLlxuICovXG52YXIgZXZlcnlMaW1pdCA9IGRvUGFyYWxsZWxMaW1pdChfY3JlYXRlVGVzdGVyKG5vdElkLCBub3RJZCkpO1xuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFtgZXZlcnlgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZXZlcnl9IGJ1dCBydW5zIG9ubHkgYSBzaW5nbGUgYXN5bmMgb3BlcmF0aW9uIGF0IGEgdGltZS5cbiAqXG4gKiBAbmFtZSBldmVyeVNlcmllc1xuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMuZXZlcnlde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5ldmVyeX1cbiAqIEBhbGlhcyBhbGxTZXJpZXNcbiAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEEgdHJ1dGggdGVzdCB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW4gdGhlXG4gKiBjb2xsZWN0aW9uIGluIHBhcmFsbGVsLiBUaGUgaXRlcmF0ZWUgaXMgcGFzc2VkIGEgYGNhbGxiYWNrKGVyciwgdHJ1dGhWYWx1ZSlgXG4gKiB3aGljaCBtdXN0IGJlIGNhbGxlZCB3aXRoIGEgIGJvb2xlYW4gYXJndW1lbnQgb25jZSBpdCBoYXMgY29tcGxldGVkLiBJbnZva2VkXG4gKiB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgYWxsIHRoZVxuICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZC4gUmVzdWx0IHdpbGwgYmUgZWl0aGVyIGB0cnVlYCBvciBgZmFsc2VgXG4gKiBkZXBlbmRpbmcgb24gdGhlIHZhbHVlcyBvZiB0aGUgYXN5bmMgdGVzdHMuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHQpLlxuICovXG52YXIgZXZlcnlTZXJpZXMgPSBkb0xpbWl0KGV2ZXJ5TGltaXQsIDEpO1xuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLnByb3BlcnR5YCB3aXRob3V0IHN1cHBvcnQgZm9yIGRlZXAgcGF0aHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgcHJvcGVydHkgdG8gZ2V0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgYWNjZXNzb3IgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGJhc2VQcm9wZXJ0eShrZXkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iamVjdCkge1xuICAgIHJldHVybiBvYmplY3QgPT0gbnVsbCA/IHVuZGVmaW5lZCA6IG9iamVjdFtrZXldO1xuICB9O1xufVxuXG5mdW5jdGlvbiBmaWx0ZXJBcnJheShlYWNoZm4sIGFyciwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHRydXRoVmFsdWVzID0gbmV3IEFycmF5KGFyci5sZW5ndGgpO1xuICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh4LCBpbmRleCwgY2FsbGJhY2spIHtcbiAgICAgICAgaXRlcmF0ZWUoeCwgZnVuY3Rpb24gKGVyciwgdikge1xuICAgICAgICAgICAgdHJ1dGhWYWx1ZXNbaW5kZXhdID0gISF2O1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfSk7XG4gICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0cnV0aFZhbHVlc1tpXSkgcmVzdWx0cy5wdXNoKGFycltpXSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0cyk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGZpbHRlckdlbmVyaWMoZWFjaGZuLCBjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIGVhY2hmbihjb2xsLCBmdW5jdGlvbiAoeCwgaW5kZXgsIGNhbGxiYWNrKSB7XG4gICAgICAgIGl0ZXJhdGVlKHgsIGZ1bmN0aW9uIChlcnIsIHYpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeyBpbmRleDogaW5kZXgsIHZhbHVlOiB4IH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCBhcnJheU1hcChyZXN1bHRzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYS5pbmRleCAtIGIuaW5kZXg7XG4gICAgICAgICAgICB9KSwgYmFzZVByb3BlcnR5KCd2YWx1ZScpKSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gX2ZpbHRlcihlYWNoZm4sIGNvbGwsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICAgIHZhciBmaWx0ZXIgPSBpc0FycmF5TGlrZShjb2xsKSA/IGZpbHRlckFycmF5IDogZmlsdGVyR2VuZXJpYztcbiAgICBmaWx0ZXIoZWFjaGZuLCBjb2xsLCBpdGVyYXRlZSwgY2FsbGJhY2sgfHwgbm9vcCk7XG59XG5cbi8qKlxuICogUmV0dXJucyBhIG5ldyBhcnJheSBvZiBhbGwgdGhlIHZhbHVlcyBpbiBgY29sbGAgd2hpY2ggcGFzcyBhbiBhc3luYyB0cnV0aFxuICogdGVzdC4gVGhpcyBvcGVyYXRpb24gaXMgcGVyZm9ybWVkIGluIHBhcmFsbGVsLCBidXQgdGhlIHJlc3VsdHMgYXJyYXkgd2lsbCBiZVxuICogaW4gdGhlIHNhbWUgb3JkZXIgYXMgdGhlIG9yaWdpbmFsLlxuICpcbiAqIEBuYW1lIGZpbHRlclxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQGFsaWFzIHNlbGVjdFxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIC0gQSB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiBgY29sbGAuXG4gKiBUaGUgYGl0ZXJhdGVlYCBpcyBwYXNzZWQgYSBgY2FsbGJhY2soZXJyLCB0cnV0aFZhbHVlKWAsIHdoaWNoIG11c3QgYmUgY2FsbGVkXG4gKiB3aXRoIGEgYm9vbGVhbiBhcmd1bWVudCBvbmNlIGl0IGhhcyBjb21wbGV0ZWQuIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIGFsbCB0aGVcbiAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHRzKS5cbiAqIEBleGFtcGxlXG4gKlxuICogYXN5bmMuZmlsdGVyKFsnZmlsZTEnLCdmaWxlMicsJ2ZpbGUzJ10sIGZ1bmN0aW9uKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuICogICAgIGZzLmFjY2VzcyhmaWxlUGF0aCwgZnVuY3Rpb24oZXJyKSB7XG4gKiAgICAgICAgIGNhbGxiYWNrKG51bGwsICFlcnIpXG4gKiAgICAgfSk7XG4gKiB9LCBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcbiAqICAgICAvLyByZXN1bHRzIG5vdyBlcXVhbHMgYW4gYXJyYXkgb2YgdGhlIGV4aXN0aW5nIGZpbGVzXG4gKiB9KTtcbiAqL1xudmFyIGZpbHRlciA9IGRvUGFyYWxsZWwoX2ZpbHRlcik7XG5cbi8qKlxuICogVGhlIHNhbWUgYXMgW2BmaWx0ZXJgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZmlsdGVyfSBidXQgcnVucyBhIG1heGltdW0gb2YgYGxpbWl0YCBhc3luYyBvcGVyYXRpb25zIGF0IGFcbiAqIHRpbWUuXG4gKlxuICogQG5hbWUgZmlsdGVyTGltaXRcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAqIEBtZXRob2RcbiAqIEBzZWUgW2FzeW5jLmZpbHRlcl17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmZpbHRlcn1cbiAqIEBhbGlhcyBzZWxlY3RMaW1pdFxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7bnVtYmVyfSBsaW1pdCAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIC0gQSB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiBgY29sbGAuXG4gKiBUaGUgYGl0ZXJhdGVlYCBpcyBwYXNzZWQgYSBgY2FsbGJhY2soZXJyLCB0cnV0aFZhbHVlKWAsIHdoaWNoIG11c3QgYmUgY2FsbGVkXG4gKiB3aXRoIGEgYm9vbGVhbiBhcmd1bWVudCBvbmNlIGl0IGhhcyBjb21wbGV0ZWQuIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIGFsbCB0aGVcbiAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHRzKS5cbiAqL1xudmFyIGZpbHRlckxpbWl0ID0gZG9QYXJhbGxlbExpbWl0KF9maWx0ZXIpO1xuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFtgZmlsdGVyYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmZpbHRlcn0gYnV0IHJ1bnMgb25seSBhIHNpbmdsZSBhc3luYyBvcGVyYXRpb24gYXQgYSB0aW1lLlxuICpcbiAqIEBuYW1lIGZpbHRlclNlcmllc1xuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMuZmlsdGVyXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZmlsdGVyfVxuICogQGFsaWFzIHNlbGVjdFNlcmllc1xuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIC0gQSB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiBgY29sbGAuXG4gKiBUaGUgYGl0ZXJhdGVlYCBpcyBwYXNzZWQgYSBgY2FsbGJhY2soZXJyLCB0cnV0aFZhbHVlKWAsIHdoaWNoIG11c3QgYmUgY2FsbGVkXG4gKiB3aXRoIGEgYm9vbGVhbiBhcmd1bWVudCBvbmNlIGl0IGhhcyBjb21wbGV0ZWQuIEludm9rZWQgd2l0aCAoaXRlbSwgY2FsbGJhY2spLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIGFmdGVyIGFsbCB0aGVcbiAqIGBpdGVyYXRlZWAgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHRzKVxuICovXG52YXIgZmlsdGVyU2VyaWVzID0gZG9MaW1pdChmaWx0ZXJMaW1pdCwgMSk7XG5cbi8qKlxuICogQ2FsbHMgdGhlIGFzeW5jaHJvbm91cyBmdW5jdGlvbiBgZm5gIHdpdGggYSBjYWxsYmFjayBwYXJhbWV0ZXIgdGhhdCBhbGxvd3MgaXRcbiAqIHRvIGNhbGwgaXRzZWxmIGFnYWluLCBpbiBzZXJpZXMsIGluZGVmaW5pdGVseS5cblxuICogSWYgYW4gZXJyb3IgaXMgcGFzc2VkIHRvIHRoZVxuICogY2FsbGJhY2sgdGhlbiBgZXJyYmFja2AgaXMgY2FsbGVkIHdpdGggdGhlIGVycm9yLCBhbmQgZXhlY3V0aW9uIHN0b3BzLFxuICogb3RoZXJ3aXNlIGl0IHdpbGwgbmV2ZXIgYmUgY2FsbGVkLlxuICpcbiAqIEBuYW1lIGZvcmV2ZXJcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAqIEBtZXRob2RcbiAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIC0gYSBmdW5jdGlvbiB0byBjYWxsIHJlcGVhdGVkbHkuIEludm9rZWQgd2l0aCAobmV4dCkuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZXJyYmFja10gLSB3aGVuIGBmbmAgcGFzc2VzIGFuIGVycm9yIHRvIGl0J3MgY2FsbGJhY2ssXG4gKiB0aGlzIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkLCBhbmQgZXhlY3V0aW9uIHN0b3BzLiBJbnZva2VkIHdpdGggKGVycikuXG4gKiBAZXhhbXBsZVxuICpcbiAqIGFzeW5jLmZvcmV2ZXIoXG4gKiAgICAgZnVuY3Rpb24obmV4dCkge1xuICogICAgICAgICAvLyBuZXh0IGlzIHN1aXRhYmxlIGZvciBwYXNzaW5nIHRvIHRoaW5ncyB0aGF0IG5lZWQgYSBjYWxsYmFjayhlcnIgWywgd2hhdGV2ZXJdKTtcbiAqICAgICAgICAgLy8gaXQgd2lsbCByZXN1bHQgaW4gdGhpcyBmdW5jdGlvbiBiZWluZyBjYWxsZWQgYWdhaW4uXG4gKiAgICAgfSxcbiAqICAgICBmdW5jdGlvbihlcnIpIHtcbiAqICAgICAgICAgLy8gaWYgbmV4dCBpcyBjYWxsZWQgd2l0aCBhIHZhbHVlIGluIGl0cyBmaXJzdCBwYXJhbWV0ZXIsIGl0IHdpbGwgYXBwZWFyXG4gKiAgICAgICAgIC8vIGluIGhlcmUgYXMgJ2VycicsIGFuZCBleGVjdXRpb24gd2lsbCBzdG9wLlxuICogICAgIH1cbiAqICk7XG4gKi9cbmZ1bmN0aW9uIGZvcmV2ZXIoZm4sIGVycmJhY2spIHtcbiAgICB2YXIgZG9uZSA9IG9ubHlPbmNlKGVycmJhY2sgfHwgbm9vcCk7XG4gICAgdmFyIHRhc2sgPSBlbnN1cmVBc3luYyhmbik7XG5cbiAgICBmdW5jdGlvbiBuZXh0KGVycikge1xuICAgICAgICBpZiAoZXJyKSByZXR1cm4gZG9uZShlcnIpO1xuICAgICAgICB0YXNrKG5leHQpO1xuICAgIH1cbiAgICBuZXh0KCk7XG59XG5cbi8qKlxuICogTG9ncyB0aGUgcmVzdWx0IG9mIGFuIGBhc3luY2AgZnVuY3Rpb24gdG8gdGhlIGBjb25zb2xlYC4gT25seSB3b3JrcyBpblxuICogTm9kZS5qcyBvciBpbiBicm93c2VycyB0aGF0IHN1cHBvcnQgYGNvbnNvbGUubG9nYCBhbmQgYGNvbnNvbGUuZXJyb3JgIChzdWNoXG4gKiBhcyBGRiBhbmQgQ2hyb21lKS4gSWYgbXVsdGlwbGUgYXJndW1lbnRzIGFyZSByZXR1cm5lZCBmcm9tIHRoZSBhc3luY1xuICogZnVuY3Rpb24sIGBjb25zb2xlLmxvZ2AgaXMgY2FsbGVkIG9uIGVhY2ggYXJndW1lbnQgaW4gb3JkZXIuXG4gKlxuICogQG5hbWUgbG9nXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOlV0aWxzXG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgVXRpbFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuY3Rpb24gLSBUaGUgZnVuY3Rpb24geW91IHdhbnQgdG8gZXZlbnR1YWxseSBhcHBseSBhbGxcbiAqIGFyZ3VtZW50cyB0by5cbiAqIEBwYXJhbSB7Li4uKn0gYXJndW1lbnRzLi4uIC0gQW55IG51bWJlciBvZiBhcmd1bWVudHMgdG8gYXBwbHkgdG8gdGhlIGZ1bmN0aW9uLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBpbiBhIG1vZHVsZVxuICogdmFyIGhlbGxvID0gZnVuY3Rpb24obmFtZSwgY2FsbGJhY2spIHtcbiAqICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICogICAgICAgICBjYWxsYmFjayhudWxsLCAnaGVsbG8gJyArIG5hbWUpO1xuICogICAgIH0sIDEwMDApO1xuICogfTtcbiAqXG4gKiAvLyBpbiB0aGUgbm9kZSByZXBsXG4gKiBub2RlPiBhc3luYy5sb2coaGVsbG8sICd3b3JsZCcpO1xuICogJ2hlbGxvIHdvcmxkJ1xuICovXG52YXIgbG9nID0gY29uc29sZUZ1bmMoJ2xvZycpO1xuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFtgbWFwVmFsdWVzYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLm1hcFZhbHVlc30gYnV0IHJ1bnMgYSBtYXhpbXVtIG9mIGBsaW1pdGAgYXN5bmMgb3BlcmF0aW9ucyBhdCBhXG4gKiB0aW1lLlxuICpcbiAqIEBuYW1lIG1hcFZhbHVlc0xpbWl0XG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5tYXBWYWx1ZXNde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5tYXBWYWx1ZXN9XG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge251bWJlcn0gbGltaXQgLSBUaGUgbWF4aW11bSBudW1iZXIgb2YgYXN5bmMgb3BlcmF0aW9ucyBhdCBhIHRpbWUuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEEgZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaCB2YWx1ZSBpbiBgb2JqYC5cbiAqIFRoZSBpdGVyYXRlZSBpcyBwYXNzZWQgYSBgY2FsbGJhY2soZXJyLCB0cmFuc2Zvcm1lZClgIHdoaWNoIG11c3QgYmUgY2FsbGVkXG4gKiBvbmNlIGl0IGhhcyBjb21wbGV0ZWQgd2l0aCBhbiBlcnJvciAod2hpY2ggY2FuIGJlIGBudWxsYCkgYW5kIGFcbiAqIHRyYW5zZm9ybWVkIHZhbHVlLiBJbnZva2VkIHdpdGggKHZhbHVlLCBrZXksIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIGFsbCBgaXRlcmF0ZWVgXG4gKiBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZCwgb3IgYW4gZXJyb3Igb2NjdXJzLiBgcmVzdWx0YCBpcyBhIG5ldyBvYmplY3QgY29uc2lzdGluZ1xuICogb2YgZWFjaCBrZXkgZnJvbSBgb2JqYCwgd2l0aCBlYWNoIHRyYW5zZm9ybWVkIHZhbHVlIG9uIHRoZSByaWdodC1oYW5kIHNpZGUuXG4gKiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0KS5cbiAqL1xuZnVuY3Rpb24gbWFwVmFsdWVzTGltaXQob2JqLCBsaW1pdCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sgPSBvbmNlKGNhbGxiYWNrIHx8IG5vb3ApO1xuICAgIHZhciBuZXdPYmogPSB7fTtcbiAgICBlYWNoT2ZMaW1pdChvYmosIGxpbWl0LCBmdW5jdGlvbiAodmFsLCBrZXksIG5leHQpIHtcbiAgICAgICAgaXRlcmF0ZWUodmFsLCBrZXksIGZ1bmN0aW9uIChlcnIsIHJlc3VsdCkge1xuICAgICAgICAgICAgaWYgKGVycikgcmV0dXJuIG5leHQoZXJyKTtcbiAgICAgICAgICAgIG5ld09ialtrZXldID0gcmVzdWx0O1xuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9KTtcbiAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGNhbGxiYWNrKGVyciwgbmV3T2JqKTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBBIHJlbGF0aXZlIG9mIFtgbWFwYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLm1hcH0sIGRlc2lnbmVkIGZvciB1c2Ugd2l0aCBvYmplY3RzLlxuICpcbiAqIFByb2R1Y2VzIGEgbmV3IE9iamVjdCBieSBtYXBwaW5nIGVhY2ggdmFsdWUgb2YgYG9iamAgdGhyb3VnaCB0aGUgYGl0ZXJhdGVlYFxuICogZnVuY3Rpb24uIFRoZSBgaXRlcmF0ZWVgIGlzIGNhbGxlZCBlYWNoIGB2YWx1ZWAgYW5kIGBrZXlgIGZyb20gYG9iamAgYW5kIGFcbiAqIGNhbGxiYWNrIGZvciB3aGVuIGl0IGhhcyBmaW5pc2hlZCBwcm9jZXNzaW5nLiBFYWNoIG9mIHRoZXNlIGNhbGxiYWNrcyB0YWtlc1xuICogdHdvIGFyZ3VtZW50czogYW4gYGVycm9yYCwgYW5kIHRoZSB0cmFuc2Zvcm1lZCBpdGVtIGZyb20gYG9iamAuIElmIGBpdGVyYXRlZWBcbiAqIHBhc3NlcyBhbiBlcnJvciB0byBpdHMgY2FsbGJhY2ssIHRoZSBtYWluIGBjYWxsYmFja2AgKGZvciB0aGUgYG1hcFZhbHVlc2BcbiAqIGZ1bmN0aW9uKSBpcyBpbW1lZGlhdGVseSBjYWxsZWQgd2l0aCB0aGUgZXJyb3IuXG4gKlxuICogTm90ZSwgdGhlIG9yZGVyIG9mIHRoZSBrZXlzIGluIHRoZSByZXN1bHQgaXMgbm90IGd1YXJhbnRlZWQuICBUaGUga2V5cyB3aWxsXG4gKiBiZSByb3VnaGx5IGluIHRoZSBvcmRlciB0aGV5IGNvbXBsZXRlLCAoYnV0IHRoaXMgaXMgdmVyeSBlbmdpbmUtc3BlY2lmaWMpXG4gKlxuICogQG5hbWUgbWFwVmFsdWVzXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEEgZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaCB2YWx1ZSBhbmQga2V5IGluXG4gKiBgY29sbGAuIFRoZSBpdGVyYXRlZSBpcyBwYXNzZWQgYSBgY2FsbGJhY2soZXJyLCB0cmFuc2Zvcm1lZClgIHdoaWNoIG11c3QgYmVcbiAqIGNhbGxlZCBvbmNlIGl0IGhhcyBjb21wbGV0ZWQgd2l0aCBhbiBlcnJvciAod2hpY2ggY2FuIGJlIGBudWxsYCkgYW5kIGFcbiAqIHRyYW5zZm9ybWVkIHZhbHVlLiBJbnZva2VkIHdpdGggKHZhbHVlLCBrZXksIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIGFsbCBgaXRlcmF0ZWVgXG4gKiBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZCwgb3IgYW4gZXJyb3Igb2NjdXJzLiBgcmVzdWx0YCBpcyBhIG5ldyBvYmplY3QgY29uc2lzdGluZ1xuICogb2YgZWFjaCBrZXkgZnJvbSBgb2JqYCwgd2l0aCBlYWNoIHRyYW5zZm9ybWVkIHZhbHVlIG9uIHRoZSByaWdodC1oYW5kIHNpZGUuXG4gKiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0KS5cbiAqIEBleGFtcGxlXG4gKlxuICogYXN5bmMubWFwVmFsdWVzKHtcbiAqICAgICBmMTogJ2ZpbGUxJyxcbiAqICAgICBmMjogJ2ZpbGUyJyxcbiAqICAgICBmMzogJ2ZpbGUzJ1xuICogfSwgZnVuY3Rpb24gKGZpbGUsIGtleSwgY2FsbGJhY2spIHtcbiAqICAgZnMuc3RhdChmaWxlLCBjYWxsYmFjayk7XG4gKiB9LCBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICogICAgIC8vIHJlc3VsdCBpcyBub3cgYSBtYXAgb2Ygc3RhdHMgZm9yIGVhY2ggZmlsZSwgZS5nLlxuICogICAgIC8vIHtcbiAqICAgICAvLyAgICAgZjE6IFtzdGF0cyBmb3IgZmlsZTFdLFxuICogICAgIC8vICAgICBmMjogW3N0YXRzIGZvciBmaWxlMl0sXG4gKiAgICAgLy8gICAgIGYzOiBbc3RhdHMgZm9yIGZpbGUzXVxuICogICAgIC8vIH1cbiAqIH0pO1xuICovXG5cbnZhciBtYXBWYWx1ZXMgPSBkb0xpbWl0KG1hcFZhbHVlc0xpbWl0LCBJbmZpbml0eSk7XG5cbi8qKlxuICogVGhlIHNhbWUgYXMgW2BtYXBWYWx1ZXNgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMubWFwVmFsdWVzfSBidXQgcnVucyBvbmx5IGEgc2luZ2xlIGFzeW5jIG9wZXJhdGlvbiBhdCBhIHRpbWUuXG4gKlxuICogQG5hbWUgbWFwVmFsdWVzU2VyaWVzXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5tYXBWYWx1ZXNde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5tYXBWYWx1ZXN9XG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEEgZnVuY3Rpb24gdG8gYXBwbHkgdG8gZWFjaCB2YWx1ZSBpbiBgb2JqYC5cbiAqIFRoZSBpdGVyYXRlZSBpcyBwYXNzZWQgYSBgY2FsbGJhY2soZXJyLCB0cmFuc2Zvcm1lZClgIHdoaWNoIG11c3QgYmUgY2FsbGVkXG4gKiBvbmNlIGl0IGhhcyBjb21wbGV0ZWQgd2l0aCBhbiBlcnJvciAod2hpY2ggY2FuIGJlIGBudWxsYCkgYW5kIGFcbiAqIHRyYW5zZm9ybWVkIHZhbHVlLiBJbnZva2VkIHdpdGggKHZhbHVlLCBrZXksIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIGFsbCBgaXRlcmF0ZWVgXG4gKiBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZCwgb3IgYW4gZXJyb3Igb2NjdXJzLiBgcmVzdWx0YCBpcyBhIG5ldyBvYmplY3QgY29uc2lzdGluZ1xuICogb2YgZWFjaCBrZXkgZnJvbSBgb2JqYCwgd2l0aCBlYWNoIHRyYW5zZm9ybWVkIHZhbHVlIG9uIHRoZSByaWdodC1oYW5kIHNpZGUuXG4gKiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0KS5cbiAqL1xudmFyIG1hcFZhbHVlc1NlcmllcyA9IGRvTGltaXQobWFwVmFsdWVzTGltaXQsIDEpO1xuXG5mdW5jdGlvbiBoYXMob2JqLCBrZXkpIHtcbiAgICByZXR1cm4ga2V5IGluIG9iajtcbn1cblxuLyoqXG4gKiBDYWNoZXMgdGhlIHJlc3VsdHMgb2YgYW4gYGFzeW5jYCBmdW5jdGlvbi4gV2hlbiBjcmVhdGluZyBhIGhhc2ggdG8gc3RvcmVcbiAqIGZ1bmN0aW9uIHJlc3VsdHMgYWdhaW5zdCwgdGhlIGNhbGxiYWNrIGlzIG9taXR0ZWQgZnJvbSB0aGUgaGFzaCBhbmQgYW5cbiAqIG9wdGlvbmFsIGhhc2ggZnVuY3Rpb24gY2FuIGJlIHVzZWQuXG4gKlxuICogSWYgbm8gaGFzaCBmdW5jdGlvbiBpcyBzcGVjaWZpZWQsIHRoZSBmaXJzdCBhcmd1bWVudCBpcyB1c2VkIGFzIGEgaGFzaCBrZXksXG4gKiB3aGljaCBtYXkgd29yayByZWFzb25hYmx5IGlmIGl0IGlzIGEgc3RyaW5nIG9yIGEgZGF0YSB0eXBlIHRoYXQgY29udmVydHMgdG8gYVxuICogZGlzdGluY3Qgc3RyaW5nLiBOb3RlIHRoYXQgb2JqZWN0cyBhbmQgYXJyYXlzIHdpbGwgbm90IGJlaGF2ZSByZWFzb25hYmx5LlxuICogTmVpdGhlciB3aWxsIGNhc2VzIHdoZXJlIHRoZSBvdGhlciBhcmd1bWVudHMgYXJlIHNpZ25pZmljYW50LiBJbiBzdWNoIGNhc2VzLFxuICogc3BlY2lmeSB5b3VyIG93biBoYXNoIGZ1bmN0aW9uLlxuICpcbiAqIFRoZSBjYWNoZSBvZiByZXN1bHRzIGlzIGV4cG9zZWQgYXMgdGhlIGBtZW1vYCBwcm9wZXJ0eSBvZiB0aGUgZnVuY3Rpb25cbiAqIHJldHVybmVkIGJ5IGBtZW1vaXplYC5cbiAqXG4gKiBAbmFtZSBtZW1vaXplXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOlV0aWxzXG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgVXRpbFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gLSBUaGUgZnVuY3Rpb24gdG8gcHJveHkgYW5kIGNhY2hlIHJlc3VsdHMgZnJvbS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGhhc2hlciAtIEFuIG9wdGlvbmFsIGZ1bmN0aW9uIGZvciBnZW5lcmF0aW5nIGEgY3VzdG9tIGhhc2hcbiAqIGZvciBzdG9yaW5nIHJlc3VsdHMuIEl0IGhhcyBhbGwgdGhlIGFyZ3VtZW50cyBhcHBsaWVkIHRvIGl0IGFwYXJ0IGZyb20gdGhlXG4gKiBjYWxsYmFjaywgYW5kIG11c3QgYmUgc3luY2hyb25vdXMuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IGEgbWVtb2l6ZWQgdmVyc2lvbiBvZiBgZm5gXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBzbG93X2ZuID0gZnVuY3Rpb24obmFtZSwgY2FsbGJhY2spIHtcbiAqICAgICAvLyBkbyBzb21ldGhpbmdcbiAqICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuICogfTtcbiAqIHZhciBmbiA9IGFzeW5jLm1lbW9pemUoc2xvd19mbik7XG4gKlxuICogLy8gZm4gY2FuIG5vdyBiZSB1c2VkIGFzIGlmIGl0IHdlcmUgc2xvd19mblxuICogZm4oJ3NvbWUgbmFtZScsIGZ1bmN0aW9uKCkge1xuICogICAgIC8vIGNhbGxiYWNrXG4gKiB9KTtcbiAqL1xuZnVuY3Rpb24gbWVtb2l6ZShmbiwgaGFzaGVyKSB7XG4gICAgdmFyIG1lbW8gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIHZhciBxdWV1ZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIGhhc2hlciA9IGhhc2hlciB8fCBpZGVudGl0eTtcbiAgICB2YXIgbWVtb2l6ZWQgPSBpbml0aWFsUGFyYW1zKGZ1bmN0aW9uIG1lbW9pemVkKGFyZ3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBrZXkgPSBoYXNoZXIuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgIGlmIChoYXMobWVtbywga2V5KSkge1xuICAgICAgICAgICAgc2V0SW1tZWRpYXRlJDEoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KG51bGwsIG1lbW9ba2V5XSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmIChoYXMocXVldWVzLCBrZXkpKSB7XG4gICAgICAgICAgICBxdWV1ZXNba2V5XS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHF1ZXVlc1trZXldID0gW2NhbGxiYWNrXTtcbiAgICAgICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MuY29uY2F0KHJlc3QoZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBtZW1vW2tleV0gPSBhcmdzO1xuICAgICAgICAgICAgICAgIHZhciBxID0gcXVldWVzW2tleV07XG4gICAgICAgICAgICAgICAgZGVsZXRlIHF1ZXVlc1trZXldO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gcS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgcVtpXS5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSkpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgbWVtb2l6ZWQubWVtbyA9IG1lbW87XG4gICAgbWVtb2l6ZWQudW5tZW1vaXplZCA9IGZuO1xuICAgIHJldHVybiBtZW1vaXplZDtcbn1cblxuLyoqXG4gKiBDYWxscyBgY2FsbGJhY2tgIG9uIGEgbGF0ZXIgbG9vcCBhcm91bmQgdGhlIGV2ZW50IGxvb3AuIEluIE5vZGUuanMgdGhpcyBqdXN0XG4gKiBjYWxscyBgc2V0SW1tZWRpYXRlYC4gIEluIHRoZSBicm93c2VyIGl0IHdpbGwgdXNlIGBzZXRJbW1lZGlhdGVgIGlmXG4gKiBhdmFpbGFibGUsIG90aGVyd2lzZSBgc2V0VGltZW91dChjYWxsYmFjaywgMClgLCB3aGljaCBtZWFucyBvdGhlciBoaWdoZXJcbiAqIHByaW9yaXR5IGV2ZW50cyBtYXkgcHJlY2VkZSB0aGUgZXhlY3V0aW9uIG9mIGBjYWxsYmFja2AuXG4gKlxuICogVGhpcyBpcyB1c2VkIGludGVybmFsbHkgZm9yIGJyb3dzZXItY29tcGF0aWJpbGl0eSBwdXJwb3Nlcy5cbiAqXG4gKiBAbmFtZSBuZXh0VGlja1xuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpVdGlsc1xuICogQG1ldGhvZFxuICogQGFsaWFzIHNldEltbWVkaWF0ZVxuICogQGNhdGVnb3J5IFV0aWxcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgb24gYSBsYXRlciBsb29wIGFyb3VuZFxuICogdGhlIGV2ZW50IGxvb3AuIEludm9rZWQgd2l0aCAoYXJncy4uLikuXG4gKiBAcGFyYW0gey4uLip9IGFyZ3MuLi4gLSBhbnkgbnVtYmVyIG9mIGFkZGl0aW9uYWwgYXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlXG4gKiBjYWxsYmFjayBvbiB0aGUgbmV4dCB0aWNrLlxuICogQGV4YW1wbGVcbiAqXG4gKiB2YXIgY2FsbF9vcmRlciA9IFtdO1xuICogYXN5bmMubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gKiAgICAgY2FsbF9vcmRlci5wdXNoKCd0d28nKTtcbiAqICAgICAvLyBjYWxsX29yZGVyIG5vdyBlcXVhbHMgWydvbmUnLCd0d28nXVxuICogfSk7XG4gKiBjYWxsX29yZGVyLnB1c2goJ29uZScpO1xuICpcbiAqIGFzeW5jLnNldEltbWVkaWF0ZShmdW5jdGlvbiAoYSwgYiwgYykge1xuICogICAgIC8vIGEsIGIsIGFuZCBjIGVxdWFsIDEsIDIsIGFuZCAzXG4gKiB9LCAxLCAyLCAzKTtcbiAqL1xudmFyIF9kZWZlciQxO1xuXG5pZiAoaGFzTmV4dFRpY2spIHtcbiAgICBfZGVmZXIkMSA9IHByb2Nlc3MubmV4dFRpY2s7XG59IGVsc2UgaWYgKGhhc1NldEltbWVkaWF0ZSkge1xuICAgIF9kZWZlciQxID0gc2V0SW1tZWRpYXRlO1xufSBlbHNlIHtcbiAgICBfZGVmZXIkMSA9IGZhbGxiYWNrO1xufVxuXG52YXIgbmV4dFRpY2sgPSB3cmFwKF9kZWZlciQxKTtcblxuZnVuY3Rpb24gX3BhcmFsbGVsKGVhY2hmbiwgdGFza3MsIGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBub29wO1xuICAgIHZhciByZXN1bHRzID0gaXNBcnJheUxpa2UodGFza3MpID8gW10gOiB7fTtcblxuICAgIGVhY2hmbih0YXNrcywgZnVuY3Rpb24gKHRhc2ssIGtleSwgY2FsbGJhY2spIHtcbiAgICAgICAgdGFzayhyZXN0KGZ1bmN0aW9uIChlcnIsIGFyZ3MpIHtcbiAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgYXJncyA9IGFyZ3NbMF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN1bHRzW2tleV0gPSBhcmdzO1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfSkpO1xuICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHRzKTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBSdW4gdGhlIGB0YXNrc2AgY29sbGVjdGlvbiBvZiBmdW5jdGlvbnMgaW4gcGFyYWxsZWwsIHdpdGhvdXQgd2FpdGluZyB1bnRpbFxuICogdGhlIHByZXZpb3VzIGZ1bmN0aW9uIGhhcyBjb21wbGV0ZWQuIElmIGFueSBvZiB0aGUgZnVuY3Rpb25zIHBhc3MgYW4gZXJyb3IgdG9cbiAqIGl0cyBjYWxsYmFjaywgdGhlIG1haW4gYGNhbGxiYWNrYCBpcyBpbW1lZGlhdGVseSBjYWxsZWQgd2l0aCB0aGUgdmFsdWUgb2YgdGhlXG4gKiBlcnJvci4gT25jZSB0aGUgYHRhc2tzYCBoYXZlIGNvbXBsZXRlZCwgdGhlIHJlc3VsdHMgYXJlIHBhc3NlZCB0byB0aGUgZmluYWxcbiAqIGBjYWxsYmFja2AgYXMgYW4gYXJyYXkuXG4gKlxuICogKipOb3RlOioqIGBwYXJhbGxlbGAgaXMgYWJvdXQga2lja2luZy1vZmYgSS9PIHRhc2tzIGluIHBhcmFsbGVsLCBub3QgYWJvdXRcbiAqIHBhcmFsbGVsIGV4ZWN1dGlvbiBvZiBjb2RlLiAgSWYgeW91ciB0YXNrcyBkbyBub3QgdXNlIGFueSB0aW1lcnMgb3IgcGVyZm9ybVxuICogYW55IEkvTywgdGhleSB3aWxsIGFjdHVhbGx5IGJlIGV4ZWN1dGVkIGluIHNlcmllcy4gIEFueSBzeW5jaHJvbm91cyBzZXR1cFxuICogc2VjdGlvbnMgZm9yIGVhY2ggdGFzayB3aWxsIGhhcHBlbiBvbmUgYWZ0ZXIgdGhlIG90aGVyLiAgSmF2YVNjcmlwdCByZW1haW5zXG4gKiBzaW5nbGUtdGhyZWFkZWQuXG4gKlxuICogSXQgaXMgYWxzbyBwb3NzaWJsZSB0byB1c2UgYW4gb2JqZWN0IGluc3RlYWQgb2YgYW4gYXJyYXkuIEVhY2ggcHJvcGVydHkgd2lsbFxuICogYmUgcnVuIGFzIGEgZnVuY3Rpb24gYW5kIHRoZSByZXN1bHRzIHdpbGwgYmUgcGFzc2VkIHRvIHRoZSBmaW5hbCBgY2FsbGJhY2tgXG4gKiBhcyBhbiBvYmplY3QgaW5zdGVhZCBvZiBhbiBhcnJheS4gVGhpcyBjYW4gYmUgYSBtb3JlIHJlYWRhYmxlIHdheSBvZiBoYW5kbGluZ1xuICogcmVzdWx0cyBmcm9tIHtAbGluayBhc3luYy5wYXJhbGxlbH0uXG4gKlxuICogQG5hbWUgcGFyYWxsZWxcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAqIEBtZXRob2RcbiAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSB0YXNrcyAtIEEgY29sbGVjdGlvbiBjb250YWluaW5nIGZ1bmN0aW9ucyB0byBydW4uXG4gKiBFYWNoIGZ1bmN0aW9uIGlzIHBhc3NlZCBhIGBjYWxsYmFjayhlcnIsIHJlc3VsdClgIHdoaWNoIGl0IG11c3QgY2FsbCBvblxuICogY29tcGxldGlvbiB3aXRoIGFuIGVycm9yIGBlcnJgICh3aGljaCBjYW4gYmUgYG51bGxgKSBhbmQgYW4gb3B0aW9uYWwgYHJlc3VsdGBcbiAqIHZhbHVlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEFuIG9wdGlvbmFsIGNhbGxiYWNrIHRvIHJ1biBvbmNlIGFsbCB0aGVcbiAqIGZ1bmN0aW9ucyBoYXZlIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuIFRoaXMgZnVuY3Rpb24gZ2V0cyBhIHJlc3VsdHMgYXJyYXlcbiAqIChvciBvYmplY3QpIGNvbnRhaW5pbmcgYWxsIHRoZSByZXN1bHQgYXJndW1lbnRzIHBhc3NlZCB0byB0aGUgdGFzayBjYWxsYmFja3MuXG4gKiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0cykuXG4gKiBAZXhhbXBsZVxuICogYXN5bmMucGFyYWxsZWwoW1xuICogICAgIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gKiAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCAnb25lJyk7XG4gKiAgICAgICAgIH0sIDIwMCk7XG4gKiAgICAgfSxcbiAqICAgICBmdW5jdGlvbihjYWxsYmFjaykge1xuICogICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICogICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ3R3bycpO1xuICogICAgICAgICB9LCAxMDApO1xuICogICAgIH1cbiAqIF0sXG4gKiAvLyBvcHRpb25hbCBjYWxsYmFja1xuICogZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gKiAgICAgLy8gdGhlIHJlc3VsdHMgYXJyYXkgd2lsbCBlcXVhbCBbJ29uZScsJ3R3byddIGV2ZW4gdGhvdWdoXG4gKiAgICAgLy8gdGhlIHNlY29uZCBmdW5jdGlvbiBoYWQgYSBzaG9ydGVyIHRpbWVvdXQuXG4gKiB9KTtcbiAqXG4gKiAvLyBhbiBleGFtcGxlIHVzaW5nIGFuIG9iamVjdCBpbnN0ZWFkIG9mIGFuIGFycmF5XG4gKiBhc3luYy5wYXJhbGxlbCh7XG4gKiAgICAgb25lOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICogICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICogICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgMSk7XG4gKiAgICAgICAgIH0sIDIwMCk7XG4gKiAgICAgfSxcbiAqICAgICB0d286IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gKiAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCAyKTtcbiAqICAgICAgICAgfSwgMTAwKTtcbiAqICAgICB9XG4gKiB9LCBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcbiAqICAgICAvLyByZXN1bHRzIGlzIG5vdyBlcXVhbHMgdG86IHtvbmU6IDEsIHR3bzogMn1cbiAqIH0pO1xuICovXG5mdW5jdGlvbiBwYXJhbGxlbExpbWl0KHRhc2tzLCBjYWxsYmFjaykge1xuICBfcGFyYWxsZWwoZWFjaE9mLCB0YXNrcywgY2FsbGJhY2spO1xufVxuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFtgcGFyYWxsZWxgXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cucGFyYWxsZWx9IGJ1dCBydW5zIGEgbWF4aW11bSBvZiBgbGltaXRgIGFzeW5jIG9wZXJhdGlvbnMgYXQgYVxuICogdGltZS5cbiAqXG4gKiBAbmFtZSBwYXJhbGxlbExpbWl0XG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5wYXJhbGxlbF17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LnBhcmFsbGVsfVxuICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICogQHBhcmFtIHtBcnJheXxDb2xsZWN0aW9ufSB0YXNrcyAtIEEgY29sbGVjdGlvbiBjb250YWluaW5nIGZ1bmN0aW9ucyB0byBydW4uXG4gKiBFYWNoIGZ1bmN0aW9uIGlzIHBhc3NlZCBhIGBjYWxsYmFjayhlcnIsIHJlc3VsdClgIHdoaWNoIGl0IG11c3QgY2FsbCBvblxuICogY29tcGxldGlvbiB3aXRoIGFuIGVycm9yIGBlcnJgICh3aGljaCBjYW4gYmUgYG51bGxgKSBhbmQgYW4gb3B0aW9uYWwgYHJlc3VsdGBcbiAqIHZhbHVlLlxuICogQHBhcmFtIHtudW1iZXJ9IGxpbWl0IC0gVGhlIG1heGltdW0gbnVtYmVyIG9mIGFzeW5jIG9wZXJhdGlvbnMgYXQgYSB0aW1lLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIEFuIG9wdGlvbmFsIGNhbGxiYWNrIHRvIHJ1biBvbmNlIGFsbCB0aGVcbiAqIGZ1bmN0aW9ucyBoYXZlIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuIFRoaXMgZnVuY3Rpb24gZ2V0cyBhIHJlc3VsdHMgYXJyYXlcbiAqIChvciBvYmplY3QpIGNvbnRhaW5pbmcgYWxsIHRoZSByZXN1bHQgYXJndW1lbnRzIHBhc3NlZCB0byB0aGUgdGFzayBjYWxsYmFja3MuXG4gKiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0cykuXG4gKi9cbmZ1bmN0aW9uIHBhcmFsbGVsTGltaXQkMSh0YXNrcywgbGltaXQsIGNhbGxiYWNrKSB7XG4gIF9wYXJhbGxlbChfZWFjaE9mTGltaXQobGltaXQpLCB0YXNrcywgY2FsbGJhY2spO1xufVxuXG4vKipcbiAqIEEgcXVldWUgb2YgdGFza3MgZm9yIHRoZSB3b3JrZXIgZnVuY3Rpb24gdG8gY29tcGxldGUuXG4gKiBAdHlwZWRlZiB7T2JqZWN0fSBRdWV1ZU9iamVjdFxuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQHByb3BlcnR5IHtGdW5jdGlvbn0gbGVuZ3RoIC0gYSBmdW5jdGlvbiByZXR1cm5pbmcgdGhlIG51bWJlciBvZiBpdGVtc1xuICogd2FpdGluZyB0byBiZSBwcm9jZXNzZWQuIEludm9rZSB3aXRoIGBxdWV1ZS5sZW5ndGgoKWAuXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IHN0YXJ0ZWQgLSBhIGJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIG9yIG5vdCBhbnlcbiAqIGl0ZW1zIGhhdmUgYmVlbiBwdXNoZWQgYW5kIHByb2Nlc3NlZCBieSB0aGUgcXVldWUuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBydW5uaW5nIC0gYSBmdW5jdGlvbiByZXR1cm5pbmcgdGhlIG51bWJlciBvZiBpdGVtc1xuICogY3VycmVudGx5IGJlaW5nIHByb2Nlc3NlZC4gSW52b2tlIHdpdGggYHF1ZXVlLnJ1bm5pbmcoKWAuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSB3b3JrZXJzTGlzdCAtIGEgZnVuY3Rpb24gcmV0dXJuaW5nIHRoZSBhcnJheSBvZiBpdGVtc1xuICogY3VycmVudGx5IGJlaW5nIHByb2Nlc3NlZC4gSW52b2tlIHdpdGggYHF1ZXVlLndvcmtlcnNMaXN0KClgLlxuICogQHByb3BlcnR5IHtGdW5jdGlvbn0gaWRsZSAtIGEgZnVuY3Rpb24gcmV0dXJuaW5nIGZhbHNlIGlmIHRoZXJlIGFyZSBpdGVtc1xuICogd2FpdGluZyBvciBiZWluZyBwcm9jZXNzZWQsIG9yIHRydWUgaWYgbm90LiBJbnZva2Ugd2l0aCBgcXVldWUuaWRsZSgpYC5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBjb25jdXJyZW5jeSAtIGFuIGludGVnZXIgZm9yIGRldGVybWluaW5nIGhvdyBtYW55IGB3b3JrZXJgXG4gKiBmdW5jdGlvbnMgc2hvdWxkIGJlIHJ1biBpbiBwYXJhbGxlbC4gVGhpcyBwcm9wZXJ0eSBjYW4gYmUgY2hhbmdlZCBhZnRlciBhXG4gKiBgcXVldWVgIGlzIGNyZWF0ZWQgdG8gYWx0ZXIgdGhlIGNvbmN1cnJlbmN5IG9uLXRoZS1mbHkuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBwdXNoIC0gYWRkIGEgbmV3IHRhc2sgdG8gdGhlIGBxdWV1ZWAuIENhbGxzIGBjYWxsYmFja2BcbiAqIG9uY2UgdGhlIGB3b3JrZXJgIGhhcyBmaW5pc2hlZCBwcm9jZXNzaW5nIHRoZSB0YXNrLiBJbnN0ZWFkIG9mIGEgc2luZ2xlIHRhc2ssXG4gKiBhIGB0YXNrc2AgYXJyYXkgY2FuIGJlIHN1Ym1pdHRlZC4gVGhlIHJlc3BlY3RpdmUgY2FsbGJhY2sgaXMgdXNlZCBmb3IgZXZlcnlcbiAqIHRhc2sgaW4gdGhlIGxpc3QuIEludm9rZSB3aXRoIGBxdWV1ZS5wdXNoKHRhc2ssIFtjYWxsYmFja10pYCxcbiAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IHVuc2hpZnQgLSBhZGQgYSBuZXcgdGFzayB0byB0aGUgZnJvbnQgb2YgdGhlIGBxdWV1ZWAuXG4gKiBJbnZva2Ugd2l0aCBgcXVldWUudW5zaGlmdCh0YXNrLCBbY2FsbGJhY2tdKWAuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBzYXR1cmF0ZWQgLSBhIGNhbGxiYWNrIHRoYXQgaXMgY2FsbGVkIHdoZW4gdGhlIG51bWJlciBvZlxuICogcnVubmluZyB3b3JrZXJzIGhpdHMgdGhlIGBjb25jdXJyZW5jeWAgbGltaXQsIGFuZCBmdXJ0aGVyIHRhc2tzIHdpbGwgYmVcbiAqIHF1ZXVlZC5cbiAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IHVuc2F0dXJhdGVkIC0gYSBjYWxsYmFjayB0aGF0IGlzIGNhbGxlZCB3aGVuIHRoZSBudW1iZXJcbiAqIG9mIHJ1bm5pbmcgd29ya2VycyBpcyBsZXNzIHRoYW4gdGhlIGBjb25jdXJyZW5jeWAgJiBgYnVmZmVyYCBsaW1pdHMsIGFuZFxuICogZnVydGhlciB0YXNrcyB3aWxsIG5vdCBiZSBxdWV1ZWQuXG4gKiBAcHJvcGVydHkge251bWJlcn0gYnVmZmVyIC0gQSBtaW5pbXVtIHRocmVzaG9sZCBidWZmZXIgaW4gb3JkZXIgdG8gc2F5IHRoYXRcbiAqIHRoZSBgcXVldWVgIGlzIGB1bnNhdHVyYXRlZGAuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBlbXB0eSAtIGEgY2FsbGJhY2sgdGhhdCBpcyBjYWxsZWQgd2hlbiB0aGUgbGFzdCBpdGVtXG4gKiBmcm9tIHRoZSBgcXVldWVgIGlzIGdpdmVuIHRvIGEgYHdvcmtlcmAuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBkcmFpbiAtIGEgY2FsbGJhY2sgdGhhdCBpcyBjYWxsZWQgd2hlbiB0aGUgbGFzdCBpdGVtXG4gKiBmcm9tIHRoZSBgcXVldWVgIGhhcyByZXR1cm5lZCBmcm9tIHRoZSBgd29ya2VyYC5cbiAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGVycm9yIC0gYSBjYWxsYmFjayB0aGF0IGlzIGNhbGxlZCB3aGVuIGEgdGFzayBlcnJvcnMuXG4gKiBIYXMgdGhlIHNpZ25hdHVyZSBgZnVuY3Rpb24oZXJyb3IsIHRhc2spYC5cbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gcGF1c2VkIC0gYSBib29sZWFuIGZvciBkZXRlcm1pbmluZyB3aGV0aGVyIHRoZSBxdWV1ZSBpc1xuICogaW4gYSBwYXVzZWQgc3RhdGUuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBwYXVzZSAtIGEgZnVuY3Rpb24gdGhhdCBwYXVzZXMgdGhlIHByb2Nlc3Npbmcgb2YgdGFza3NcbiAqIHVudGlsIGByZXN1bWUoKWAgaXMgY2FsbGVkLiBJbnZva2Ugd2l0aCBgcXVldWUucGF1c2UoKWAuXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSByZXN1bWUgLSBhIGZ1bmN0aW9uIHRoYXQgcmVzdW1lcyB0aGUgcHJvY2Vzc2luZyBvZlxuICogcXVldWVkIHRhc2tzIHdoZW4gdGhlIHF1ZXVlIGlzIHBhdXNlZC4gSW52b2tlIHdpdGggYHF1ZXVlLnJlc3VtZSgpYC5cbiAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGtpbGwgLSBhIGZ1bmN0aW9uIHRoYXQgcmVtb3ZlcyB0aGUgYGRyYWluYCBjYWxsYmFjayBhbmRcbiAqIGVtcHRpZXMgcmVtYWluaW5nIHRhc2tzIGZyb20gdGhlIHF1ZXVlIGZvcmNpbmcgaXQgdG8gZ28gaWRsZS4gSW52b2tlIHdpdGggYHF1ZXVlLmtpbGwoKWAuXG4gKi9cblxuLyoqXG4gKiBDcmVhdGVzIGEgYHF1ZXVlYCBvYmplY3Qgd2l0aCB0aGUgc3BlY2lmaWVkIGBjb25jdXJyZW5jeWAuIFRhc2tzIGFkZGVkIHRvIHRoZVxuICogYHF1ZXVlYCBhcmUgcHJvY2Vzc2VkIGluIHBhcmFsbGVsICh1cCB0byB0aGUgYGNvbmN1cnJlbmN5YCBsaW1pdCkuIElmIGFsbFxuICogYHdvcmtlcmBzIGFyZSBpbiBwcm9ncmVzcywgdGhlIHRhc2sgaXMgcXVldWVkIHVudGlsIG9uZSBiZWNvbWVzIGF2YWlsYWJsZS5cbiAqIE9uY2UgYSBgd29ya2VyYCBjb21wbGV0ZXMgYSBgdGFza2AsIHRoYXQgYHRhc2tgJ3MgY2FsbGJhY2sgaXMgY2FsbGVkLlxuICpcbiAqIEBuYW1lIHF1ZXVlXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB3b3JrZXIgLSBBbiBhc3luY2hyb25vdXMgZnVuY3Rpb24gZm9yIHByb2Nlc3NpbmcgYSBxdWV1ZWRcbiAqIHRhc2ssIHdoaWNoIG11c3QgY2FsbCBpdHMgYGNhbGxiYWNrKGVycilgIGFyZ3VtZW50IHdoZW4gZmluaXNoZWQsIHdpdGggYW5cbiAqIG9wdGlvbmFsIGBlcnJvcmAgYXMgYW4gYXJndW1lbnQuICBJZiB5b3Ugd2FudCB0byBoYW5kbGUgZXJyb3JzIGZyb20gYW5cbiAqIGluZGl2aWR1YWwgdGFzaywgcGFzcyBhIGNhbGxiYWNrIHRvIGBxLnB1c2goKWAuIEludm9rZWQgd2l0aFxuICogKHRhc2ssIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7bnVtYmVyfSBbY29uY3VycmVuY3k9MV0gLSBBbiBgaW50ZWdlcmAgZm9yIGRldGVybWluaW5nIGhvdyBtYW55XG4gKiBgd29ya2VyYCBmdW5jdGlvbnMgc2hvdWxkIGJlIHJ1biBpbiBwYXJhbGxlbC4gIElmIG9taXR0ZWQsIHRoZSBjb25jdXJyZW5jeVxuICogZGVmYXVsdHMgdG8gYDFgLiAgSWYgdGhlIGNvbmN1cnJlbmN5IGlzIGAwYCwgYW4gZXJyb3IgaXMgdGhyb3duLlxuICogQHJldHVybnMge21vZHVsZTpDb250cm9sRmxvdy5RdWV1ZU9iamVjdH0gQSBxdWV1ZSBvYmplY3QgdG8gbWFuYWdlIHRoZSB0YXNrcy4gQ2FsbGJhY2tzIGNhblxuICogYXR0YWNoZWQgYXMgY2VydGFpbiBwcm9wZXJ0aWVzIHRvIGxpc3RlbiBmb3Igc3BlY2lmaWMgZXZlbnRzIGR1cmluZyB0aGVcbiAqIGxpZmVjeWNsZSBvZiB0aGUgcXVldWUuXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIGNyZWF0ZSBhIHF1ZXVlIG9iamVjdCB3aXRoIGNvbmN1cnJlbmN5IDJcbiAqIHZhciBxID0gYXN5bmMucXVldWUoZnVuY3Rpb24odGFzaywgY2FsbGJhY2spIHtcbiAqICAgICBjb25zb2xlLmxvZygnaGVsbG8gJyArIHRhc2submFtZSk7XG4gKiAgICAgY2FsbGJhY2soKTtcbiAqIH0sIDIpO1xuICpcbiAqIC8vIGFzc2lnbiBhIGNhbGxiYWNrXG4gKiBxLmRyYWluID0gZnVuY3Rpb24oKSB7XG4gKiAgICAgY29uc29sZS5sb2coJ2FsbCBpdGVtcyBoYXZlIGJlZW4gcHJvY2Vzc2VkJyk7XG4gKiB9O1xuICpcbiAqIC8vIGFkZCBzb21lIGl0ZW1zIHRvIHRoZSBxdWV1ZVxuICogcS5wdXNoKHtuYW1lOiAnZm9vJ30sIGZ1bmN0aW9uKGVycikge1xuICogICAgIGNvbnNvbGUubG9nKCdmaW5pc2hlZCBwcm9jZXNzaW5nIGZvbycpO1xuICogfSk7XG4gKiBxLnB1c2goe25hbWU6ICdiYXInfSwgZnVuY3Rpb24gKGVycikge1xuICogICAgIGNvbnNvbGUubG9nKCdmaW5pc2hlZCBwcm9jZXNzaW5nIGJhcicpO1xuICogfSk7XG4gKlxuICogLy8gYWRkIHNvbWUgaXRlbXMgdG8gdGhlIHF1ZXVlIChiYXRjaC13aXNlKVxuICogcS5wdXNoKFt7bmFtZTogJ2Jheid9LHtuYW1lOiAnYmF5J30se25hbWU6ICdiYXgnfV0sIGZ1bmN0aW9uKGVycikge1xuICogICAgIGNvbnNvbGUubG9nKCdmaW5pc2hlZCBwcm9jZXNzaW5nIGl0ZW0nKTtcbiAqIH0pO1xuICpcbiAqIC8vIGFkZCBzb21lIGl0ZW1zIHRvIHRoZSBmcm9udCBvZiB0aGUgcXVldWVcbiAqIHEudW5zaGlmdCh7bmFtZTogJ2Jhcid9LCBmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgY29uc29sZS5sb2coJ2ZpbmlzaGVkIHByb2Nlc3NpbmcgYmFyJyk7XG4gKiB9KTtcbiAqL1xudmFyIHF1ZXVlJDEgPSBmdW5jdGlvbiAod29ya2VyLCBjb25jdXJyZW5jeSkge1xuICByZXR1cm4gcXVldWUoZnVuY3Rpb24gKGl0ZW1zLCBjYikge1xuICAgIHdvcmtlcihpdGVtc1swXSwgY2IpO1xuICB9LCBjb25jdXJyZW5jeSwgMSk7XG59O1xuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFthc3luYy5xdWV1ZV17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LnF1ZXVlfSBvbmx5IHRhc2tzIGFyZSBhc3NpZ25lZCBhIHByaW9yaXR5IGFuZFxuICogY29tcGxldGVkIGluIGFzY2VuZGluZyBwcmlvcml0eSBvcmRlci5cbiAqXG4gKiBAbmFtZSBwcmlvcml0eVF1ZXVlXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5xdWV1ZV17QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LnF1ZXVlfVxuICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICogQHBhcmFtIHtGdW5jdGlvbn0gd29ya2VyIC0gQW4gYXN5bmNocm9ub3VzIGZ1bmN0aW9uIGZvciBwcm9jZXNzaW5nIGEgcXVldWVkXG4gKiB0YXNrLCB3aGljaCBtdXN0IGNhbGwgaXRzIGBjYWxsYmFjayhlcnIpYCBhcmd1bWVudCB3aGVuIGZpbmlzaGVkLCB3aXRoIGFuXG4gKiBvcHRpb25hbCBgZXJyb3JgIGFzIGFuIGFyZ3VtZW50LiAgSWYgeW91IHdhbnQgdG8gaGFuZGxlIGVycm9ycyBmcm9tIGFuXG4gKiBpbmRpdmlkdWFsIHRhc2ssIHBhc3MgYSBjYWxsYmFjayB0byBgcS5wdXNoKClgLiBJbnZva2VkIHdpdGhcbiAqICh0YXNrLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge251bWJlcn0gY29uY3VycmVuY3kgLSBBbiBgaW50ZWdlcmAgZm9yIGRldGVybWluaW5nIGhvdyBtYW55IGB3b3JrZXJgXG4gKiBmdW5jdGlvbnMgc2hvdWxkIGJlIHJ1biBpbiBwYXJhbGxlbC4gIElmIG9taXR0ZWQsIHRoZSBjb25jdXJyZW5jeSBkZWZhdWx0cyB0b1xuICogYDFgLiAgSWYgdGhlIGNvbmN1cnJlbmN5IGlzIGAwYCwgYW4gZXJyb3IgaXMgdGhyb3duLlxuICogQHJldHVybnMge21vZHVsZTpDb250cm9sRmxvdy5RdWV1ZU9iamVjdH0gQSBwcmlvcml0eVF1ZXVlIG9iamVjdCB0byBtYW5hZ2UgdGhlIHRhc2tzLiBUaGVyZSBhcmUgdHdvXG4gKiBkaWZmZXJlbmNlcyBiZXR3ZWVuIGBxdWV1ZWAgYW5kIGBwcmlvcml0eVF1ZXVlYCBvYmplY3RzOlxuICogKiBgcHVzaCh0YXNrLCBwcmlvcml0eSwgW2NhbGxiYWNrXSlgIC0gYHByaW9yaXR5YCBzaG91bGQgYmUgYSBudW1iZXIuIElmIGFuXG4gKiAgIGFycmF5IG9mIGB0YXNrc2AgaXMgZ2l2ZW4sIGFsbCB0YXNrcyB3aWxsIGJlIGFzc2lnbmVkIHRoZSBzYW1lIHByaW9yaXR5LlxuICogKiBUaGUgYHVuc2hpZnRgIG1ldGhvZCB3YXMgcmVtb3ZlZC5cbiAqL1xudmFyIHByaW9yaXR5UXVldWUgPSBmdW5jdGlvbiAod29ya2VyLCBjb25jdXJyZW5jeSkge1xuICAgIC8vIFN0YXJ0IHdpdGggYSBub3JtYWwgcXVldWVcbiAgICB2YXIgcSA9IHF1ZXVlJDEod29ya2VyLCBjb25jdXJyZW5jeSk7XG5cbiAgICAvLyBPdmVycmlkZSBwdXNoIHRvIGFjY2VwdCBzZWNvbmQgcGFyYW1ldGVyIHJlcHJlc2VudGluZyBwcmlvcml0eVxuICAgIHEucHVzaCA9IGZ1bmN0aW9uIChkYXRhLCBwcmlvcml0eSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrID09IG51bGwpIGNhbGxiYWNrID0gbm9vcDtcbiAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd0YXNrIGNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICB9XG4gICAgICAgIHEuc3RhcnRlZCA9IHRydWU7XG4gICAgICAgIGlmICghaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgZGF0YSA9IFtkYXRhXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIC8vIGNhbGwgZHJhaW4gaW1tZWRpYXRlbHkgaWYgdGhlcmUgYXJlIG5vIHRhc2tzXG4gICAgICAgICAgICByZXR1cm4gc2V0SW1tZWRpYXRlJDEoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHEuZHJhaW4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJpb3JpdHkgPSBwcmlvcml0eSB8fCAwO1xuICAgICAgICB2YXIgbmV4dE5vZGUgPSBxLl90YXNrcy5oZWFkO1xuICAgICAgICB3aGlsZSAobmV4dE5vZGUgJiYgcHJpb3JpdHkgPj0gbmV4dE5vZGUucHJpb3JpdHkpIHtcbiAgICAgICAgICAgIG5leHROb2RlID0gbmV4dE5vZGUubmV4dDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gZGF0YS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBpdGVtID0ge1xuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFbaV0sXG4gICAgICAgICAgICAgICAgcHJpb3JpdHk6IHByaW9yaXR5LFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKG5leHROb2RlKSB7XG4gICAgICAgICAgICAgICAgcS5fdGFza3MuaW5zZXJ0QmVmb3JlKG5leHROb2RlLCBpdGVtKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcS5fdGFza3MucHVzaChpdGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzZXRJbW1lZGlhdGUkMShxLnByb2Nlc3MpO1xuICAgIH07XG5cbiAgICAvLyBSZW1vdmUgdW5zaGlmdCBmdW5jdGlvblxuICAgIGRlbGV0ZSBxLnVuc2hpZnQ7XG5cbiAgICByZXR1cm4gcTtcbn07XG5cbi8qKlxuICogUnVucyB0aGUgYHRhc2tzYCBhcnJheSBvZiBmdW5jdGlvbnMgaW4gcGFyYWxsZWwsIHdpdGhvdXQgd2FpdGluZyB1bnRpbCB0aGVcbiAqIHByZXZpb3VzIGZ1bmN0aW9uIGhhcyBjb21wbGV0ZWQuIE9uY2UgYW55IG9mIHRoZSBgdGFza3NgIGNvbXBsZXRlIG9yIHBhc3MgYW5cbiAqIGVycm9yIHRvIGl0cyBjYWxsYmFjaywgdGhlIG1haW4gYGNhbGxiYWNrYCBpcyBpbW1lZGlhdGVseSBjYWxsZWQuIEl0J3NcbiAqIGVxdWl2YWxlbnQgdG8gYFByb21pc2UucmFjZSgpYC5cbiAqXG4gKiBAbmFtZSByYWNlXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge0FycmF5fSB0YXNrcyAtIEFuIGFycmF5IGNvbnRhaW5pbmcgZnVuY3Rpb25zIHRvIHJ1bi4gRWFjaCBmdW5jdGlvblxuICogaXMgcGFzc2VkIGEgYGNhbGxiYWNrKGVyciwgcmVzdWx0KWAgd2hpY2ggaXQgbXVzdCBjYWxsIG9uIGNvbXBsZXRpb24gd2l0aCBhblxuICogZXJyb3IgYGVycmAgKHdoaWNoIGNhbiBiZSBgbnVsbGApIGFuZCBhbiBvcHRpb25hbCBgcmVzdWx0YCB2YWx1ZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gQSBjYWxsYmFjayB0byBydW4gb25jZSBhbnkgb2YgdGhlIGZ1bmN0aW9ucyBoYXZlXG4gKiBjb21wbGV0ZWQuIFRoaXMgZnVuY3Rpb24gZ2V0cyBhbiBlcnJvciBvciByZXN1bHQgZnJvbSB0aGUgZmlyc3QgZnVuY3Rpb24gdGhhdFxuICogY29tcGxldGVkLiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0KS5cbiAqIEByZXR1cm5zIHVuZGVmaW5lZFxuICogQGV4YW1wbGVcbiAqXG4gKiBhc3luYy5yYWNlKFtcbiAqICAgICBmdW5jdGlvbihjYWxsYmFjaykge1xuICogICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICogICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ29uZScpO1xuICogICAgICAgICB9LCAyMDApO1xuICogICAgIH0sXG4gKiAgICAgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAqICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsICd0d28nKTtcbiAqICAgICAgICAgfSwgMTAwKTtcbiAqICAgICB9XG4gKiBdLFxuICogLy8gbWFpbiBjYWxsYmFja1xuICogZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAqICAgICAvLyB0aGUgcmVzdWx0IHdpbGwgYmUgZXF1YWwgdG8gJ3R3bycgYXMgaXQgZmluaXNoZXMgZWFybGllclxuICogfSk7XG4gKi9cbmZ1bmN0aW9uIHJhY2UodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sgPSBvbmNlKGNhbGxiYWNrIHx8IG5vb3ApO1xuICAgIGlmICghaXNBcnJheSh0YXNrcykpIHJldHVybiBjYWxsYmFjayhuZXcgVHlwZUVycm9yKCdGaXJzdCBhcmd1bWVudCB0byByYWNlIG11c3QgYmUgYW4gYXJyYXkgb2YgZnVuY3Rpb25zJykpO1xuICAgIGlmICghdGFza3MubGVuZ3RoKSByZXR1cm4gY2FsbGJhY2soKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRhc2tzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0YXNrc1tpXShjYWxsYmFjayk7XG4gICAgfVxufVxuXG52YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cbi8qKlxuICogU2FtZSBhcyBbYHJlZHVjZWBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5yZWR1Y2V9LCBvbmx5IG9wZXJhdGVzIG9uIGBhcnJheWAgaW4gcmV2ZXJzZSBvcmRlci5cbiAqXG4gKiBAbmFtZSByZWR1Y2VSaWdodFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMucmVkdWNlXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMucmVkdWNlfVxuICogQGFsaWFzIGZvbGRyXG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtBcnJheX0gYXJyYXkgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHsqfSBtZW1vIC0gVGhlIGluaXRpYWwgc3RhdGUgb2YgdGhlIHJlZHVjdGlvbi5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIC0gQSBmdW5jdGlvbiBhcHBsaWVkIHRvIGVhY2ggaXRlbSBpbiB0aGVcbiAqIGFycmF5IHRvIHByb2R1Y2UgdGhlIG5leHQgc3RlcCBpbiB0aGUgcmVkdWN0aW9uLiBUaGUgYGl0ZXJhdGVlYCBpcyBwYXNzZWQgYVxuICogYGNhbGxiYWNrKGVyciwgcmVkdWN0aW9uKWAgd2hpY2ggYWNjZXB0cyBhbiBvcHRpb25hbCBlcnJvciBhcyBpdHMgZmlyc3RcbiAqIGFyZ3VtZW50LCBhbmQgdGhlIHN0YXRlIG9mIHRoZSByZWR1Y3Rpb24gYXMgdGhlIHNlY29uZC4gSWYgYW4gZXJyb3IgaXNcbiAqIHBhc3NlZCB0byB0aGUgY2FsbGJhY2ssIHRoZSByZWR1Y3Rpb24gaXMgc3RvcHBlZCBhbmQgdGhlIG1haW4gYGNhbGxiYWNrYCBpc1xuICogaW1tZWRpYXRlbHkgY2FsbGVkIHdpdGggdGhlIGVycm9yLiBJbnZva2VkIHdpdGggKG1lbW8sIGl0ZW0sIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhZnRlciBhbGwgdGhlXG4gKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLiBSZXN1bHQgaXMgdGhlIHJlZHVjZWQgdmFsdWUuIEludm9rZWQgd2l0aFxuICogKGVyciwgcmVzdWx0KS5cbiAqL1xuZnVuY3Rpb24gcmVkdWNlUmlnaHQoYXJyYXksIG1lbW8sIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICB2YXIgcmV2ZXJzZWQgPSBzbGljZS5jYWxsKGFycmF5KS5yZXZlcnNlKCk7XG4gIHJlZHVjZShyZXZlcnNlZCwgbWVtbywgaXRlcmF0ZWUsIGNhbGxiYWNrKTtcbn1cblxuLyoqXG4gKiBXcmFwcyB0aGUgZnVuY3Rpb24gaW4gYW5vdGhlciBmdW5jdGlvbiB0aGF0IGFsd2F5cyByZXR1cm5zIGRhdGEgZXZlbiB3aGVuIGl0XG4gKiBlcnJvcnMuXG4gKlxuICogVGhlIG9iamVjdCByZXR1cm5lZCBoYXMgZWl0aGVyIHRoZSBwcm9wZXJ0eSBgZXJyb3JgIG9yIGB2YWx1ZWAuXG4gKlxuICogQG5hbWUgcmVmbGVjdFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpVdGlsc1xuICogQG1ldGhvZFxuICogQGNhdGVnb3J5IFV0aWxcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIC0gVGhlIGZ1bmN0aW9uIHlvdSB3YW50IHRvIHdyYXBcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gLSBBIGZ1bmN0aW9uIHRoYXQgYWx3YXlzIHBhc3NlcyBudWxsIHRvIGl0J3MgY2FsbGJhY2sgYXNcbiAqIHRoZSBlcnJvci4gVGhlIHNlY29uZCBhcmd1bWVudCB0byB0aGUgY2FsbGJhY2sgd2lsbCBiZSBhbiBgb2JqZWN0YCB3aXRoXG4gKiBlaXRoZXIgYW4gYGVycm9yYCBvciBhIGB2YWx1ZWAgcHJvcGVydHkuXG4gKiBAZXhhbXBsZVxuICpcbiAqIGFzeW5jLnBhcmFsbGVsKFtcbiAqICAgICBhc3luYy5yZWZsZWN0KGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIC8vIGRvIHNvbWUgc3R1ZmYgLi4uXG4gKiAgICAgICAgIGNhbGxiYWNrKG51bGwsICdvbmUnKTtcbiAqICAgICB9KSxcbiAqICAgICBhc3luYy5yZWZsZWN0KGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIC8vIGRvIHNvbWUgbW9yZSBzdHVmZiBidXQgZXJyb3IgLi4uXG4gKiAgICAgICAgIGNhbGxiYWNrKCdiYWQgc3R1ZmYgaGFwcGVuZWQnKTtcbiAqICAgICB9KSxcbiAqICAgICBhc3luYy5yZWZsZWN0KGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIC8vIGRvIHNvbWUgbW9yZSBzdHVmZiAuLi5cbiAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ3R3bycpO1xuICogICAgIH0pXG4gKiBdLFxuICogLy8gb3B0aW9uYWwgY2FsbGJhY2tcbiAqIGZ1bmN0aW9uKGVyciwgcmVzdWx0cykge1xuICogICAgIC8vIHZhbHVlc1xuICogICAgIC8vIHJlc3VsdHNbMF0udmFsdWUgPSAnb25lJ1xuICogICAgIC8vIHJlc3VsdHNbMV0uZXJyb3IgPSAnYmFkIHN0dWZmIGhhcHBlbmVkJ1xuICogICAgIC8vIHJlc3VsdHNbMl0udmFsdWUgPSAndHdvJ1xuICogfSk7XG4gKi9cbmZ1bmN0aW9uIHJlZmxlY3QoZm4pIHtcbiAgICByZXR1cm4gaW5pdGlhbFBhcmFtcyhmdW5jdGlvbiByZWZsZWN0T24oYXJncywgcmVmbGVjdENhbGxiYWNrKSB7XG4gICAgICAgIGFyZ3MucHVzaChyZXN0KGZ1bmN0aW9uIGNhbGxiYWNrKGVyciwgY2JBcmdzKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVmbGVjdENhbGxiYWNrKG51bGwsIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGVyclxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBudWxsO1xuICAgICAgICAgICAgICAgIGlmIChjYkFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gY2JBcmdzWzBdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2JBcmdzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBjYkFyZ3M7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlZmxlY3RDYWxsYmFjayhudWxsLCB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSk7XG5cbiAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiByZWplY3QkMShlYWNoZm4sIGFyciwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgX2ZpbHRlcihlYWNoZm4sIGFyciwgZnVuY3Rpb24gKHZhbHVlLCBjYikge1xuICAgICAgICBpdGVyYXRlZSh2YWx1ZSwgZnVuY3Rpb24gKGVyciwgdikge1xuICAgICAgICAgICAgY2IoZXJyLCAhdik7XG4gICAgICAgIH0pO1xuICAgIH0sIGNhbGxiYWNrKTtcbn1cblxuLyoqXG4gKiBUaGUgb3Bwb3NpdGUgb2YgW2BmaWx0ZXJgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuZmlsdGVyfS4gUmVtb3ZlcyB2YWx1ZXMgdGhhdCBwYXNzIGFuIGBhc3luY2AgdHJ1dGggdGVzdC5cbiAqXG4gKiBAbmFtZSByZWplY3RcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAqIEBtZXRob2RcbiAqIEBzZWUgW2FzeW5jLmZpbHRlcl17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLmZpbHRlcn1cbiAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEEgdHJ1dGggdGVzdCB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW4gYGNvbGxgLlxuICogVGhlIGBpdGVyYXRlZWAgaXMgcGFzc2VkIGEgYGNhbGxiYWNrKGVyciwgdHJ1dGhWYWx1ZSlgLCB3aGljaCBtdXN0IGJlIGNhbGxlZFxuICogd2l0aCBhIGJvb2xlYW4gYXJndW1lbnQgb25jZSBpdCBoYXMgY29tcGxldGVkLiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhZnRlciBhbGwgdGhlXG4gKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0cykuXG4gKiBAZXhhbXBsZVxuICpcbiAqIGFzeW5jLnJlamVjdChbJ2ZpbGUxJywnZmlsZTInLCdmaWxlMyddLCBmdW5jdGlvbihmaWxlUGF0aCwgY2FsbGJhY2spIHtcbiAqICAgICBmcy5hY2Nlc3MoZmlsZVBhdGgsIGZ1bmN0aW9uKGVycikge1xuICogICAgICAgICBjYWxsYmFjayhudWxsLCAhZXJyKVxuICogICAgIH0pO1xuICogfSwgZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gKiAgICAgLy8gcmVzdWx0cyBub3cgZXF1YWxzIGFuIGFycmF5IG9mIG1pc3NpbmcgZmlsZXNcbiAqICAgICBjcmVhdGVGaWxlcyhyZXN1bHRzKTtcbiAqIH0pO1xuICovXG52YXIgcmVqZWN0ID0gZG9QYXJhbGxlbChyZWplY3QkMSk7XG5cbi8qKlxuICogQSBoZWxwZXIgZnVuY3Rpb24gdGhhdCB3cmFwcyBhbiBhcnJheSBvciBhbiBvYmplY3Qgb2YgZnVuY3Rpb25zIHdpdGggcmVmbGVjdC5cbiAqXG4gKiBAbmFtZSByZWZsZWN0QWxsXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOlV0aWxzXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5yZWZsZWN0XXtAbGluayBtb2R1bGU6VXRpbHMucmVmbGVjdH1cbiAqIEBjYXRlZ29yeSBVdGlsXG4gKiBAcGFyYW0ge0FycmF5fSB0YXNrcyAtIFRoZSBhcnJheSBvZiBmdW5jdGlvbnMgdG8gd3JhcCBpbiBgYXN5bmMucmVmbGVjdGAuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYW4gYXJyYXkgb2YgZnVuY3Rpb25zLCBlYWNoIGZ1bmN0aW9uIHdyYXBwZWQgaW5cbiAqIGBhc3luYy5yZWZsZWN0YFxuICogQGV4YW1wbGVcbiAqXG4gKiBsZXQgdGFza3MgPSBbXG4gKiAgICAgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAqICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsICdvbmUnKTtcbiAqICAgICAgICAgfSwgMjAwKTtcbiAqICAgICB9LFxuICogICAgIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIC8vIGRvIHNvbWUgbW9yZSBzdHVmZiBidXQgZXJyb3IgLi4uXG4gKiAgICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcignYmFkIHN0dWZmIGhhcHBlbmVkJykpO1xuICogICAgIH0sXG4gKiAgICAgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAqICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsICd0d28nKTtcbiAqICAgICAgICAgfSwgMTAwKTtcbiAqICAgICB9XG4gKiBdO1xuICpcbiAqIGFzeW5jLnBhcmFsbGVsKGFzeW5jLnJlZmxlY3RBbGwodGFza3MpLFxuICogLy8gb3B0aW9uYWwgY2FsbGJhY2tcbiAqIGZ1bmN0aW9uKGVyciwgcmVzdWx0cykge1xuICogICAgIC8vIHZhbHVlc1xuICogICAgIC8vIHJlc3VsdHNbMF0udmFsdWUgPSAnb25lJ1xuICogICAgIC8vIHJlc3VsdHNbMV0uZXJyb3IgPSBFcnJvcignYmFkIHN0dWZmIGhhcHBlbmVkJylcbiAqICAgICAvLyByZXN1bHRzWzJdLnZhbHVlID0gJ3R3bydcbiAqIH0pO1xuICpcbiAqIC8vIGFuIGV4YW1wbGUgdXNpbmcgYW4gb2JqZWN0IGluc3RlYWQgb2YgYW4gYXJyYXlcbiAqIGxldCB0YXNrcyA9IHtcbiAqICAgICBvbmU6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gKiAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCAnb25lJyk7XG4gKiAgICAgICAgIH0sIDIwMCk7XG4gKiAgICAgfSxcbiAqICAgICB0d286IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIGNhbGxiYWNrKCd0d28nKTtcbiAqICAgICB9LFxuICogICAgIHRocmVlOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICogICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICogICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ3RocmVlJyk7XG4gKiAgICAgICAgIH0sIDEwMCk7XG4gKiAgICAgfVxuICogfTtcbiAqXG4gKiBhc3luYy5wYXJhbGxlbChhc3luYy5yZWZsZWN0QWxsKHRhc2tzKSxcbiAqIC8vIG9wdGlvbmFsIGNhbGxiYWNrXG4gKiBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcbiAqICAgICAvLyB2YWx1ZXNcbiAqICAgICAvLyByZXN1bHRzLm9uZS52YWx1ZSA9ICdvbmUnXG4gKiAgICAgLy8gcmVzdWx0cy50d28uZXJyb3IgPSAndHdvJ1xuICogICAgIC8vIHJlc3VsdHMudGhyZWUudmFsdWUgPSAndGhyZWUnXG4gKiB9KTtcbiAqL1xuZnVuY3Rpb24gcmVmbGVjdEFsbCh0YXNrcykge1xuICAgIHZhciByZXN1bHRzO1xuICAgIGlmIChpc0FycmF5KHRhc2tzKSkge1xuICAgICAgICByZXN1bHRzID0gYXJyYXlNYXAodGFza3MsIHJlZmxlY3QpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdHMgPSB7fTtcbiAgICAgICAgYmFzZUZvck93bih0YXNrcywgZnVuY3Rpb24gKHRhc2ssIGtleSkge1xuICAgICAgICAgICAgcmVzdWx0c1trZXldID0gcmVmbGVjdC5jYWxsKHRoaXMsIHRhc2spO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbi8qKlxuICogVGhlIHNhbWUgYXMgW2ByZWplY3RgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMucmVqZWN0fSBidXQgcnVucyBhIG1heGltdW0gb2YgYGxpbWl0YCBhc3luYyBvcGVyYXRpb25zIGF0IGFcbiAqIHRpbWUuXG4gKlxuICogQG5hbWUgcmVqZWN0TGltaXRcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAqIEBtZXRob2RcbiAqIEBzZWUgW2FzeW5jLnJlamVjdF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLnJlamVjdH1cbiAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge251bWJlcn0gbGltaXQgLSBUaGUgbWF4aW11bSBudW1iZXIgb2YgYXN5bmMgb3BlcmF0aW9ucyBhdCBhIHRpbWUuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEEgdHJ1dGggdGVzdCB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW4gYGNvbGxgLlxuICogVGhlIGBpdGVyYXRlZWAgaXMgcGFzc2VkIGEgYGNhbGxiYWNrKGVyciwgdHJ1dGhWYWx1ZSlgLCB3aGljaCBtdXN0IGJlIGNhbGxlZFxuICogd2l0aCBhIGJvb2xlYW4gYXJndW1lbnQgb25jZSBpdCBoYXMgY29tcGxldGVkLiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhZnRlciBhbGwgdGhlXG4gKiBgaXRlcmF0ZWVgIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLiBJbnZva2VkIHdpdGggKGVyciwgcmVzdWx0cykuXG4gKi9cbnZhciByZWplY3RMaW1pdCA9IGRvUGFyYWxsZWxMaW1pdChyZWplY3QkMSk7XG5cbi8qKlxuICogVGhlIHNhbWUgYXMgW2ByZWplY3RgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMucmVqZWN0fSBidXQgcnVucyBvbmx5IGEgc2luZ2xlIGFzeW5jIG9wZXJhdGlvbiBhdCBhIHRpbWUuXG4gKlxuICogQG5hbWUgcmVqZWN0U2VyaWVzXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5yZWplY3Rde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5yZWplY3R9XG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIHRydXRoIHRlc3QgdG8gYXBwbHkgdG8gZWFjaCBpdGVtIGluIGBjb2xsYC5cbiAqIFRoZSBgaXRlcmF0ZWVgIGlzIHBhc3NlZCBhIGBjYWxsYmFjayhlcnIsIHRydXRoVmFsdWUpYCwgd2hpY2ggbXVzdCBiZSBjYWxsZWRcbiAqIHdpdGggYSBib29sZWFuIGFyZ3VtZW50IG9uY2UgaXQgaGFzIGNvbXBsZXRlZC4gSW52b2tlZCB3aXRoIChpdGVtLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgYWxsIHRoZVxuICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZC4gSW52b2tlZCB3aXRoIChlcnIsIHJlc3VsdHMpLlxuICovXG52YXIgcmVqZWN0U2VyaWVzID0gZG9MaW1pdChyZWplY3RMaW1pdCwgMSk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBgdmFsdWVgLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMi40LjBcbiAqIEBjYXRlZ29yeSBVdGlsXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byByZXR1cm4gZnJvbSB0aGUgbmV3IGZ1bmN0aW9uLlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgY29uc3RhbnQgZnVuY3Rpb24uXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBvYmplY3RzID0gXy50aW1lcygyLCBfLmNvbnN0YW50KHsgJ2EnOiAxIH0pKTtcbiAqXG4gKiBjb25zb2xlLmxvZyhvYmplY3RzKTtcbiAqIC8vID0+IFt7ICdhJzogMSB9LCB7ICdhJzogMSB9XVxuICpcbiAqIGNvbnNvbGUubG9nKG9iamVjdHNbMF0gPT09IG9iamVjdHNbMV0pO1xuICogLy8gPT4gdHJ1ZVxuICovXG5mdW5jdGlvbiBjb25zdGFudCQxKHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG59XG5cbi8qKlxuICogQXR0ZW1wdHMgdG8gZ2V0IGEgc3VjY2Vzc2Z1bCByZXNwb25zZSBmcm9tIGB0YXNrYCBubyBtb3JlIHRoYW4gYHRpbWVzYCB0aW1lc1xuICogYmVmb3JlIHJldHVybmluZyBhbiBlcnJvci4gSWYgdGhlIHRhc2sgaXMgc3VjY2Vzc2Z1bCwgdGhlIGBjYWxsYmFja2Agd2lsbCBiZVxuICogcGFzc2VkIHRoZSByZXN1bHQgb2YgdGhlIHN1Y2Nlc3NmdWwgdGFzay4gSWYgYWxsIGF0dGVtcHRzIGZhaWwsIHRoZSBjYWxsYmFja1xuICogd2lsbCBiZSBwYXNzZWQgdGhlIGVycm9yIGFuZCByZXN1bHQgKGlmIGFueSkgb2YgdGhlIGZpbmFsIGF0dGVtcHQuXG4gKlxuICogQG5hbWUgcmV0cnlcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAqIEBtZXRob2RcbiAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAqIEBwYXJhbSB7T2JqZWN0fG51bWJlcn0gW29wdHMgPSB7dGltZXM6IDUsIGludGVydmFsOiAwfXwgNV0gLSBDYW4gYmUgZWl0aGVyIGFuXG4gKiBvYmplY3Qgd2l0aCBgdGltZXNgIGFuZCBgaW50ZXJ2YWxgIG9yIGEgbnVtYmVyLlxuICogKiBgdGltZXNgIC0gVGhlIG51bWJlciBvZiBhdHRlbXB0cyB0byBtYWtlIGJlZm9yZSBnaXZpbmcgdXAuICBUaGUgZGVmYXVsdFxuICogICBpcyBgNWAuXG4gKiAqIGBpbnRlcnZhbGAgLSBUaGUgdGltZSB0byB3YWl0IGJldHdlZW4gcmV0cmllcywgaW4gbWlsbGlzZWNvbmRzLiAgVGhlXG4gKiAgIGRlZmF1bHQgaXMgYDBgLiBUaGUgaW50ZXJ2YWwgbWF5IGFsc28gYmUgc3BlY2lmaWVkIGFzIGEgZnVuY3Rpb24gb2YgdGhlXG4gKiAgIHJldHJ5IGNvdW50IChzZWUgZXhhbXBsZSkuXG4gKiAqIGBlcnJvckZpbHRlcmAgLSBBbiBvcHRpb25hbCBzeW5jaHJvbm91cyBmdW5jdGlvbiB0aGF0IGlzIGludm9rZWQgb25cbiAqICAgZXJyb25lb3VzIHJlc3VsdC4gSWYgaXQgcmV0dXJucyBgdHJ1ZWAgdGhlIHJldHJ5IGF0dGVtcHRzIHdpbGwgY29udGludWU7XG4gKiAgIGlmIHRoZSBmdW5jdGlvbiByZXR1cm5zIGBmYWxzZWAgdGhlIHJldHJ5IGZsb3cgaXMgYWJvcnRlZCB3aXRoIHRoZSBjdXJyZW50XG4gKiAgIGF0dGVtcHQncyBlcnJvciBhbmQgcmVzdWx0IGJlaW5nIHJldHVybmVkIHRvIHRoZSBmaW5hbCBjYWxsYmFjay5cbiAqICAgSW52b2tlZCB3aXRoIChlcnIpLlxuICogKiBJZiBgb3B0c2AgaXMgYSBudW1iZXIsIHRoZSBudW1iZXIgc3BlY2lmaWVzIHRoZSBudW1iZXIgb2YgdGltZXMgdG8gcmV0cnksXG4gKiAgIHdpdGggdGhlIGRlZmF1bHQgaW50ZXJ2YWwgb2YgYDBgLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gdGFzayAtIEEgZnVuY3Rpb24gd2hpY2ggcmVjZWl2ZXMgdHdvIGFyZ3VtZW50czogKDEpIGFcbiAqIGBjYWxsYmFjayhlcnIsIHJlc3VsdClgIHdoaWNoIG11c3QgYmUgY2FsbGVkIHdoZW4gZmluaXNoZWQsIHBhc3NpbmcgYGVycmBcbiAqICh3aGljaCBjYW4gYmUgYG51bGxgKSBhbmQgdGhlIGByZXN1bHRgIG9mIHRoZSBmdW5jdGlvbidzIGV4ZWN1dGlvbiwgYW5kICgyKVxuICogYSBgcmVzdWx0c2Agb2JqZWN0LCBjb250YWluaW5nIHRoZSByZXN1bHRzIG9mIHRoZSBwcmV2aW91c2x5IGV4ZWN1dGVkXG4gKiBmdW5jdGlvbnMgKGlmIG5lc3RlZCBpbnNpZGUgYW5vdGhlciBjb250cm9sIGZsb3cpLiBJbnZva2VkIHdpdGhcbiAqIChjYWxsYmFjaywgcmVzdWx0cykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQW4gb3B0aW9uYWwgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gdGhlXG4gKiB0YXNrIGhhcyBzdWNjZWVkZWQsIG9yIGFmdGVyIHRoZSBmaW5hbCBmYWlsZWQgYXR0ZW1wdC4gSXQgcmVjZWl2ZXMgdGhlIGBlcnJgXG4gKiBhbmQgYHJlc3VsdGAgYXJndW1lbnRzIG9mIHRoZSBsYXN0IGF0dGVtcHQgYXQgY29tcGxldGluZyB0aGUgYHRhc2tgLiBJbnZva2VkXG4gKiB3aXRoIChlcnIsIHJlc3VsdHMpLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBUaGUgYHJldHJ5YCBmdW5jdGlvbiBjYW4gYmUgdXNlZCBhcyBhIHN0YW5kLWFsb25lIGNvbnRyb2wgZmxvdyBieSBwYXNzaW5nXG4gKiAvLyBhIGNhbGxiYWNrLCBhcyBzaG93biBiZWxvdzpcbiAqXG4gKiAvLyB0cnkgY2FsbGluZyBhcGlNZXRob2QgMyB0aW1lc1xuICogYXN5bmMucmV0cnkoMywgYXBpTWV0aG9kLCBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICogICAgIC8vIGRvIHNvbWV0aGluZyB3aXRoIHRoZSByZXN1bHRcbiAqIH0pO1xuICpcbiAqIC8vIHRyeSBjYWxsaW5nIGFwaU1ldGhvZCAzIHRpbWVzLCB3YWl0aW5nIDIwMCBtcyBiZXR3ZWVuIGVhY2ggcmV0cnlcbiAqIGFzeW5jLnJldHJ5KHt0aW1lczogMywgaW50ZXJ2YWw6IDIwMH0sIGFwaU1ldGhvZCwgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAqICAgICAvLyBkbyBzb21ldGhpbmcgd2l0aCB0aGUgcmVzdWx0XG4gKiB9KTtcbiAqXG4gKiAvLyB0cnkgY2FsbGluZyBhcGlNZXRob2QgMTAgdGltZXMgd2l0aCBleHBvbmVudGlhbCBiYWNrb2ZmXG4gKiAvLyAoaS5lLiBpbnRlcnZhbHMgb2YgMTAwLCAyMDAsIDQwMCwgODAwLCAxNjAwLCAuLi4gbWlsbGlzZWNvbmRzKVxuICogYXN5bmMucmV0cnkoe1xuICogICB0aW1lczogMTAsXG4gKiAgIGludGVydmFsOiBmdW5jdGlvbihyZXRyeUNvdW50KSB7XG4gKiAgICAgcmV0dXJuIDUwICogTWF0aC5wb3coMiwgcmV0cnlDb3VudCk7XG4gKiAgIH1cbiAqIH0sIGFwaU1ldGhvZCwgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAqICAgICAvLyBkbyBzb21ldGhpbmcgd2l0aCB0aGUgcmVzdWx0XG4gKiB9KTtcbiAqXG4gKiAvLyB0cnkgY2FsbGluZyBhcGlNZXRob2QgdGhlIGRlZmF1bHQgNSB0aW1lcyBubyBkZWxheSBiZXR3ZWVuIGVhY2ggcmV0cnlcbiAqIGFzeW5jLnJldHJ5KGFwaU1ldGhvZCwgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAqICAgICAvLyBkbyBzb21ldGhpbmcgd2l0aCB0aGUgcmVzdWx0XG4gKiB9KTtcbiAqXG4gKiAvLyB0cnkgY2FsbGluZyBhcGlNZXRob2Qgb25seSB3aGVuIGVycm9yIGNvbmRpdGlvbiBzYXRpc2ZpZXMsIGFsbCBvdGhlclxuICogLy8gZXJyb3JzIHdpbGwgYWJvcnQgdGhlIHJldHJ5IGNvbnRyb2wgZmxvdyBhbmQgcmV0dXJuIHRvIGZpbmFsIGNhbGxiYWNrXG4gKiBhc3luYy5yZXRyeSh7XG4gKiAgIGVycm9yRmlsdGVyOiBmdW5jdGlvbihlcnIpIHtcbiAqICAgICByZXR1cm4gZXJyLm1lc3NhZ2UgPT09ICdUZW1wb3JhcnkgZXJyb3InOyAvLyBvbmx5IHJldHJ5IG9uIGEgc3BlY2lmaWMgZXJyb3JcbiAqICAgfVxuICogfSwgYXBpTWV0aG9kLCBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICogICAgIC8vIGRvIHNvbWV0aGluZyB3aXRoIHRoZSByZXN1bHRcbiAqIH0pO1xuICpcbiAqIC8vIEl0IGNhbiBhbHNvIGJlIGVtYmVkZGVkIHdpdGhpbiBvdGhlciBjb250cm9sIGZsb3cgZnVuY3Rpb25zIHRvIHJldHJ5XG4gKiAvLyBpbmRpdmlkdWFsIG1ldGhvZHMgdGhhdCBhcmUgbm90IGFzIHJlbGlhYmxlLCBsaWtlIHRoaXM6XG4gKiBhc3luYy5hdXRvKHtcbiAqICAgICB1c2VyczogYXBpLmdldFVzZXJzLmJpbmQoYXBpKSxcbiAqICAgICBwYXltZW50czogYXN5bmMucmV0cnkoMywgYXBpLmdldFBheW1lbnRzLmJpbmQoYXBpKSlcbiAqIH0sIGZ1bmN0aW9uKGVyciwgcmVzdWx0cykge1xuICogICAgIC8vIGRvIHNvbWV0aGluZyB3aXRoIHRoZSByZXN1bHRzXG4gKiB9KTtcbiAqXG4gKi9cbmZ1bmN0aW9uIHJldHJ5KG9wdHMsIHRhc2ssIGNhbGxiYWNrKSB7XG4gICAgdmFyIERFRkFVTFRfVElNRVMgPSA1O1xuICAgIHZhciBERUZBVUxUX0lOVEVSVkFMID0gMDtcblxuICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICB0aW1lczogREVGQVVMVF9USU1FUyxcbiAgICAgICAgaW50ZXJ2YWxGdW5jOiBjb25zdGFudCQxKERFRkFVTFRfSU5URVJWQUwpXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHBhcnNlVGltZXMoYWNjLCB0KSB7XG4gICAgICAgIGlmICh0eXBlb2YgdCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGFjYy50aW1lcyA9ICt0LnRpbWVzIHx8IERFRkFVTFRfVElNRVM7XG5cbiAgICAgICAgICAgIGFjYy5pbnRlcnZhbEZ1bmMgPSB0eXBlb2YgdC5pbnRlcnZhbCA9PT0gJ2Z1bmN0aW9uJyA/IHQuaW50ZXJ2YWwgOiBjb25zdGFudCQxKCt0LmludGVydmFsIHx8IERFRkFVTFRfSU5URVJWQUwpO1xuXG4gICAgICAgICAgICBhY2MuZXJyb3JGaWx0ZXIgPSB0LmVycm9yRmlsdGVyO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB0ID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGFjYy50aW1lcyA9ICt0IHx8IERFRkFVTFRfVElNRVM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIGFyZ3VtZW50cyBmb3IgYXN5bmMucmV0cnlcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMgJiYgdHlwZW9mIG9wdHMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY2FsbGJhY2sgPSB0YXNrIHx8IG5vb3A7XG4gICAgICAgIHRhc2sgPSBvcHRzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcnNlVGltZXMob3B0aW9ucywgb3B0cyk7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgbm9vcDtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHRhc2sgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBhcmd1bWVudHMgZm9yIGFzeW5jLnJldHJ5XCIpO1xuICAgIH1cblxuICAgIHZhciBhdHRlbXB0ID0gMTtcbiAgICBmdW5jdGlvbiByZXRyeUF0dGVtcHQoKSB7XG4gICAgICAgIHRhc2soZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgaWYgKGVyciAmJiBhdHRlbXB0KysgPCBvcHRpb25zLnRpbWVzICYmICh0eXBlb2Ygb3B0aW9ucy5lcnJvckZpbHRlciAhPSAnZnVuY3Rpb24nIHx8IG9wdGlvbnMuZXJyb3JGaWx0ZXIoZXJyKSkpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHJldHJ5QXR0ZW1wdCwgb3B0aW9ucy5pbnRlcnZhbEZ1bmMoYXR0ZW1wdCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICByZXRyeUF0dGVtcHQoKTtcbn1cblxuLyoqXG4gKiBBIGNsb3NlIHJlbGF0aXZlIG9mIFtgcmV0cnlgXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cucmV0cnl9LiAgVGhpcyBtZXRob2Qgd3JhcHMgYSB0YXNrIGFuZCBtYWtlcyBpdFxuICogcmV0cnlhYmxlLCByYXRoZXIgdGhhbiBpbW1lZGlhdGVseSBjYWxsaW5nIGl0IHdpdGggcmV0cmllcy5cbiAqXG4gKiBAbmFtZSByZXRyeWFibGVcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAqIEBtZXRob2RcbiAqIEBzZWUgW2FzeW5jLnJldHJ5XXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cucmV0cnl9XG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge09iamVjdHxudW1iZXJ9IFtvcHRzID0ge3RpbWVzOiA1LCBpbnRlcnZhbDogMH18IDVdIC0gb3B0aW9uYWxcbiAqIG9wdGlvbnMsIGV4YWN0bHkgdGhlIHNhbWUgYXMgZnJvbSBgcmV0cnlgXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB0YXNrIC0gdGhlIGFzeW5jaHJvbm91cyBmdW5jdGlvbiB0byB3cmFwXG4gKiBAcmV0dXJucyB7RnVuY3Rpb25zfSBUaGUgd3JhcHBlZCBmdW5jdGlvbiwgd2hpY2ggd2hlbiBpbnZva2VkLCB3aWxsIHJldHJ5IG9uXG4gKiBhbiBlcnJvciwgYmFzZWQgb24gdGhlIHBhcmFtZXRlcnMgc3BlY2lmaWVkIGluIGBvcHRzYC5cbiAqIEBleGFtcGxlXG4gKlxuICogYXN5bmMuYXV0byh7XG4gKiAgICAgZGVwMTogYXN5bmMucmV0cnlhYmxlKDMsIGdldEZyb21GbGFreVNlcnZpY2UpLFxuICogICAgIHByb2Nlc3M6IFtcImRlcDFcIiwgYXN5bmMucmV0cnlhYmxlKDMsIGZ1bmN0aW9uIChyZXN1bHRzLCBjYikge1xuICogICAgICAgICBtYXliZVByb2Nlc3NEYXRhKHJlc3VsdHMuZGVwMSwgY2IpO1xuICogICAgIH0pXVxuICogfSwgY2FsbGJhY2spO1xuICovXG52YXIgcmV0cnlhYmxlID0gZnVuY3Rpb24gKG9wdHMsIHRhc2spIHtcbiAgICBpZiAoIXRhc2spIHtcbiAgICAgICAgdGFzayA9IG9wdHM7XG4gICAgICAgIG9wdHMgPSBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gaW5pdGlhbFBhcmFtcyhmdW5jdGlvbiAoYXJncywgY2FsbGJhY2spIHtcbiAgICAgICAgZnVuY3Rpb24gdGFza0ZuKGNiKSB7XG4gICAgICAgICAgICB0YXNrLmFwcGx5KG51bGwsIGFyZ3MuY29uY2F0KGNiKSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0cykgcmV0cnkob3B0cywgdGFza0ZuLCBjYWxsYmFjayk7ZWxzZSByZXRyeSh0YXNrRm4sIGNhbGxiYWNrKTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogUnVuIHRoZSBmdW5jdGlvbnMgaW4gdGhlIGB0YXNrc2AgY29sbGVjdGlvbiBpbiBzZXJpZXMsIGVhY2ggb25lIHJ1bm5pbmcgb25jZVxuICogdGhlIHByZXZpb3VzIGZ1bmN0aW9uIGhhcyBjb21wbGV0ZWQuIElmIGFueSBmdW5jdGlvbnMgaW4gdGhlIHNlcmllcyBwYXNzIGFuXG4gKiBlcnJvciB0byBpdHMgY2FsbGJhY2ssIG5vIG1vcmUgZnVuY3Rpb25zIGFyZSBydW4sIGFuZCBgY2FsbGJhY2tgIGlzXG4gKiBpbW1lZGlhdGVseSBjYWxsZWQgd2l0aCB0aGUgdmFsdWUgb2YgdGhlIGVycm9yLiBPdGhlcndpc2UsIGBjYWxsYmFja2BcbiAqIHJlY2VpdmVzIGFuIGFycmF5IG9mIHJlc3VsdHMgd2hlbiBgdGFza3NgIGhhdmUgY29tcGxldGVkLlxuICpcbiAqIEl0IGlzIGFsc28gcG9zc2libGUgdG8gdXNlIGFuIG9iamVjdCBpbnN0ZWFkIG9mIGFuIGFycmF5LiBFYWNoIHByb3BlcnR5IHdpbGxcbiAqIGJlIHJ1biBhcyBhIGZ1bmN0aW9uLCBhbmQgdGhlIHJlc3VsdHMgd2lsbCBiZSBwYXNzZWQgdG8gdGhlIGZpbmFsIGBjYWxsYmFja2BcbiAqIGFzIGFuIG9iamVjdCBpbnN0ZWFkIG9mIGFuIGFycmF5LiBUaGlzIGNhbiBiZSBhIG1vcmUgcmVhZGFibGUgd2F5IG9mIGhhbmRsaW5nXG4gKiAgcmVzdWx0cyBmcm9tIHtAbGluayBhc3luYy5zZXJpZXN9LlxuICpcbiAqICoqTm90ZSoqIHRoYXQgd2hpbGUgbWFueSBpbXBsZW1lbnRhdGlvbnMgcHJlc2VydmUgdGhlIG9yZGVyIG9mIG9iamVjdFxuICogcHJvcGVydGllcywgdGhlIFtFQ01BU2NyaXB0IExhbmd1YWdlIFNwZWNpZmljYXRpb25dKGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi81LjEvI3NlYy04LjYpXG4gKiBleHBsaWNpdGx5IHN0YXRlcyB0aGF0XG4gKlxuICogPiBUaGUgbWVjaGFuaWNzIGFuZCBvcmRlciBvZiBlbnVtZXJhdGluZyB0aGUgcHJvcGVydGllcyBpcyBub3Qgc3BlY2lmaWVkLlxuICpcbiAqIFNvIGlmIHlvdSByZWx5IG9uIHRoZSBvcmRlciBpbiB3aGljaCB5b3VyIHNlcmllcyBvZiBmdW5jdGlvbnMgYXJlIGV4ZWN1dGVkLFxuICogYW5kIHdhbnQgdGhpcyB0byB3b3JrIG9uIGFsbCBwbGF0Zm9ybXMsIGNvbnNpZGVyIHVzaW5nIGFuIGFycmF5LlxuICpcbiAqIEBuYW1lIHNlcmllc1xuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQG1ldGhvZFxuICogQGNhdGVnb3J5IENvbnRyb2wgRmxvd1xuICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxPYmplY3R9IHRhc2tzIC0gQSBjb2xsZWN0aW9uIGNvbnRhaW5pbmcgZnVuY3Rpb25zIHRvIHJ1biwgZWFjaFxuICogZnVuY3Rpb24gaXMgcGFzc2VkIGEgYGNhbGxiYWNrKGVyciwgcmVzdWx0KWAgaXQgbXVzdCBjYWxsIG9uIGNvbXBsZXRpb24gd2l0aFxuICogYW4gZXJyb3IgYGVycmAgKHdoaWNoIGNhbiBiZSBgbnVsbGApIGFuZCBhbiBvcHRpb25hbCBgcmVzdWx0YCB2YWx1ZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBbiBvcHRpb25hbCBjYWxsYmFjayB0byBydW4gb25jZSBhbGwgdGhlXG4gKiBmdW5jdGlvbnMgaGF2ZSBjb21wbGV0ZWQuIFRoaXMgZnVuY3Rpb24gZ2V0cyBhIHJlc3VsdHMgYXJyYXkgKG9yIG9iamVjdClcbiAqIGNvbnRhaW5pbmcgYWxsIHRoZSByZXN1bHQgYXJndW1lbnRzIHBhc3NlZCB0byB0aGUgYHRhc2tgIGNhbGxiYWNrcy4gSW52b2tlZFxuICogd2l0aCAoZXJyLCByZXN1bHQpLlxuICogQGV4YW1wbGVcbiAqIGFzeW5jLnNlcmllcyhbXG4gKiAgICAgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgLy8gZG8gc29tZSBzdHVmZiAuLi5cbiAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ29uZScpO1xuICogICAgIH0sXG4gKiAgICAgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgLy8gZG8gc29tZSBtb3JlIHN0dWZmIC4uLlxuICogICAgICAgICBjYWxsYmFjayhudWxsLCAndHdvJyk7XG4gKiAgICAgfVxuICogXSxcbiAqIC8vIG9wdGlvbmFsIGNhbGxiYWNrXG4gKiBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcbiAqICAgICAvLyByZXN1bHRzIGlzIG5vdyBlcXVhbCB0byBbJ29uZScsICd0d28nXVxuICogfSk7XG4gKlxuICogYXN5bmMuc2VyaWVzKHtcbiAqICAgICBvbmU6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gKiAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gKiAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCAxKTtcbiAqICAgICAgICAgfSwgMjAwKTtcbiAqICAgICB9LFxuICogICAgIHR3bzogZnVuY3Rpb24oY2FsbGJhY2spe1xuICogICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICogICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgMik7XG4gKiAgICAgICAgIH0sIDEwMCk7XG4gKiAgICAgfVxuICogfSwgZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gKiAgICAgLy8gcmVzdWx0cyBpcyBub3cgZXF1YWwgdG86IHtvbmU6IDEsIHR3bzogMn1cbiAqIH0pO1xuICovXG5mdW5jdGlvbiBzZXJpZXModGFza3MsIGNhbGxiYWNrKSB7XG4gIF9wYXJhbGxlbChlYWNoT2ZTZXJpZXMsIHRhc2tzLCBjYWxsYmFjayk7XG59XG5cbi8qKlxuICogUmV0dXJucyBgdHJ1ZWAgaWYgYXQgbGVhc3Qgb25lIGVsZW1lbnQgaW4gdGhlIGBjb2xsYCBzYXRpc2ZpZXMgYW4gYXN5bmMgdGVzdC5cbiAqIElmIGFueSBpdGVyYXRlZSBjYWxsIHJldHVybnMgYHRydWVgLCB0aGUgbWFpbiBgY2FsbGJhY2tgIGlzIGltbWVkaWF0ZWx5XG4gKiBjYWxsZWQuXG4gKlxuICogQG5hbWUgc29tZVxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQGFsaWFzIGFueVxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIC0gQSB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiB0aGUgYXJyYXlcbiAqIGluIHBhcmFsbGVsLiBUaGUgaXRlcmF0ZWUgaXMgcGFzc2VkIGEgYGNhbGxiYWNrKGVyciwgdHJ1dGhWYWx1ZSlgIHdoaWNoIG11c3RcbiAqIGJlIGNhbGxlZCB3aXRoIGEgYm9vbGVhbiBhcmd1bWVudCBvbmNlIGl0IGhhcyBjb21wbGV0ZWQuIEludm9rZWQgd2l0aFxuICogKGl0ZW0sIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhcyBzb29uIGFzIGFueVxuICogaXRlcmF0ZWUgcmV0dXJucyBgdHJ1ZWAsIG9yIGFmdGVyIGFsbCB0aGUgaXRlcmF0ZWUgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQuXG4gKiBSZXN1bHQgd2lsbCBiZSBlaXRoZXIgYHRydWVgIG9yIGBmYWxzZWAgZGVwZW5kaW5nIG9uIHRoZSB2YWx1ZXMgb2YgdGhlIGFzeW5jXG4gKiB0ZXN0cy4gSW52b2tlZCB3aXRoIChlcnIsIHJlc3VsdCkuXG4gKiBAZXhhbXBsZVxuICpcbiAqIGFzeW5jLnNvbWUoWydmaWxlMScsJ2ZpbGUyJywnZmlsZTMnXSwgZnVuY3Rpb24oZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG4gKiAgICAgZnMuYWNjZXNzKGZpbGVQYXRoLCBmdW5jdGlvbihlcnIpIHtcbiAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgIWVycilcbiAqICAgICB9KTtcbiAqIH0sIGZ1bmN0aW9uKGVyciwgcmVzdWx0KSB7XG4gKiAgICAgLy8gaWYgcmVzdWx0IGlzIHRydWUgdGhlbiBhdCBsZWFzdCBvbmUgb2YgdGhlIGZpbGVzIGV4aXN0c1xuICogfSk7XG4gKi9cbnZhciBzb21lID0gZG9QYXJhbGxlbChfY3JlYXRlVGVzdGVyKEJvb2xlYW4sIGlkZW50aXR5KSk7XG5cbi8qKlxuICogVGhlIHNhbWUgYXMgW2Bzb21lYF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLnNvbWV9IGJ1dCBydW5zIGEgbWF4aW11bSBvZiBgbGltaXRgIGFzeW5jIG9wZXJhdGlvbnMgYXQgYSB0aW1lLlxuICpcbiAqIEBuYW1lIHNvbWVMaW1pdFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMuc29tZV17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLnNvbWV9XG4gKiBAYWxpYXMgYW55TGltaXRcbiAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gKiBAcGFyYW0ge0FycmF5fEl0ZXJhYmxlfE9iamVjdH0gY29sbCAtIEEgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge251bWJlcn0gbGltaXQgLSBUaGUgbWF4aW11bSBudW1iZXIgb2YgYXN5bmMgb3BlcmF0aW9ucyBhdCBhIHRpbWUuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSAtIEEgdHJ1dGggdGVzdCB0byBhcHBseSB0byBlYWNoIGl0ZW0gaW4gdGhlIGFycmF5XG4gKiBpbiBwYXJhbGxlbC4gVGhlIGl0ZXJhdGVlIGlzIHBhc3NlZCBhIGBjYWxsYmFjayhlcnIsIHRydXRoVmFsdWUpYCB3aGljaCBtdXN0XG4gKiBiZSBjYWxsZWQgd2l0aCBhIGJvb2xlYW4gYXJndW1lbnQgb25jZSBpdCBoYXMgY29tcGxldGVkLiBJbnZva2VkIHdpdGhcbiAqIChpdGVtLCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYXMgc29vbiBhcyBhbnlcbiAqIGl0ZXJhdGVlIHJldHVybnMgYHRydWVgLCBvciBhZnRlciBhbGwgdGhlIGl0ZXJhdGVlIGZ1bmN0aW9ucyBoYXZlIGZpbmlzaGVkLlxuICogUmVzdWx0IHdpbGwgYmUgZWl0aGVyIGB0cnVlYCBvciBgZmFsc2VgIGRlcGVuZGluZyBvbiB0aGUgdmFsdWVzIG9mIHRoZSBhc3luY1xuICogdGVzdHMuIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHQpLlxuICovXG52YXIgc29tZUxpbWl0ID0gZG9QYXJhbGxlbExpbWl0KF9jcmVhdGVUZXN0ZXIoQm9vbGVhbiwgaWRlbnRpdHkpKTtcblxuLyoqXG4gKiBUaGUgc2FtZSBhcyBbYHNvbWVgXXtAbGluayBtb2R1bGU6Q29sbGVjdGlvbnMuc29tZX0gYnV0IHJ1bnMgb25seSBhIHNpbmdsZSBhc3luYyBvcGVyYXRpb24gYXQgYSB0aW1lLlxuICpcbiAqIEBuYW1lIHNvbWVTZXJpZXNcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29sbGVjdGlvbnNcbiAqIEBtZXRob2RcbiAqIEBzZWUgW2FzeW5jLnNvbWVde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5zb21lfVxuICogQGFsaWFzIGFueVNlcmllc1xuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIC0gQSB0cnV0aCB0ZXN0IHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiB0aGUgYXJyYXlcbiAqIGluIHBhcmFsbGVsLiBUaGUgaXRlcmF0ZWUgaXMgcGFzc2VkIGEgYGNhbGxiYWNrKGVyciwgdHJ1dGhWYWx1ZSlgIHdoaWNoIG11c3RcbiAqIGJlIGNhbGxlZCB3aXRoIGEgYm9vbGVhbiBhcmd1bWVudCBvbmNlIGl0IGhhcyBjb21wbGV0ZWQuIEludm9rZWQgd2l0aFxuICogKGl0ZW0sIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhcyBzb29uIGFzIGFueVxuICogaXRlcmF0ZWUgcmV0dXJucyBgdHJ1ZWAsIG9yIGFmdGVyIGFsbCB0aGUgaXRlcmF0ZWUgZnVuY3Rpb25zIGhhdmUgZmluaXNoZWQuXG4gKiBSZXN1bHQgd2lsbCBiZSBlaXRoZXIgYHRydWVgIG9yIGBmYWxzZWAgZGVwZW5kaW5nIG9uIHRoZSB2YWx1ZXMgb2YgdGhlIGFzeW5jXG4gKiB0ZXN0cy4gSW52b2tlZCB3aXRoIChlcnIsIHJlc3VsdCkuXG4gKi9cbnZhciBzb21lU2VyaWVzID0gZG9MaW1pdChzb21lTGltaXQsIDEpO1xuXG4vKipcbiAqIFNvcnRzIGEgbGlzdCBieSB0aGUgcmVzdWx0cyBvZiBydW5uaW5nIGVhY2ggYGNvbGxgIHZhbHVlIHRocm91Z2ggYW4gYXN5bmNcbiAqIGBpdGVyYXRlZWAuXG4gKlxuICogQG5hbWUgc29ydEJ5XG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbGxlY3Rpb25zXG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICogQHBhcmFtIHtBcnJheXxJdGVyYWJsZXxPYmplY3R9IGNvbGwgLSBBIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIGVhY2ggaXRlbSBpbiBgY29sbGAuXG4gKiBUaGUgaXRlcmF0ZWUgaXMgcGFzc2VkIGEgYGNhbGxiYWNrKGVyciwgc29ydFZhbHVlKWAgd2hpY2ggbXVzdCBiZSBjYWxsZWQgb25jZVxuICogaXQgaGFzIGNvbXBsZXRlZCB3aXRoIGFuIGVycm9yICh3aGljaCBjYW4gYmUgYG51bGxgKSBhbmQgYSB2YWx1ZSB0byB1c2UgYXNcbiAqIHRoZSBzb3J0IGNyaXRlcmlhLiBJbnZva2VkIHdpdGggKGl0ZW0sIGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgYWxsIHRoZVxuICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZCwgb3IgYW4gZXJyb3Igb2NjdXJzLiBSZXN1bHRzIGlzIHRoZSBpdGVtc1xuICogZnJvbSB0aGUgb3JpZ2luYWwgYGNvbGxgIHNvcnRlZCBieSB0aGUgdmFsdWVzIHJldHVybmVkIGJ5IHRoZSBgaXRlcmF0ZWVgXG4gKiBjYWxscy4gSW52b2tlZCB3aXRoIChlcnIsIHJlc3VsdHMpLlxuICogQGV4YW1wbGVcbiAqXG4gKiBhc3luYy5zb3J0QnkoWydmaWxlMScsJ2ZpbGUyJywnZmlsZTMnXSwgZnVuY3Rpb24oZmlsZSwgY2FsbGJhY2spIHtcbiAqICAgICBmcy5zdGF0KGZpbGUsIGZ1bmN0aW9uKGVyciwgc3RhdHMpIHtcbiAqICAgICAgICAgY2FsbGJhY2soZXJyLCBzdGF0cy5tdGltZSk7XG4gKiAgICAgfSk7XG4gKiB9LCBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcbiAqICAgICAvLyByZXN1bHRzIGlzIG5vdyB0aGUgb3JpZ2luYWwgYXJyYXkgb2YgZmlsZXMgc29ydGVkIGJ5XG4gKiAgICAgLy8gbW9kaWZpZWQgZGF0ZVxuICogfSk7XG4gKlxuICogLy8gQnkgbW9kaWZ5aW5nIHRoZSBjYWxsYmFjayBwYXJhbWV0ZXIgdGhlXG4gKiAvLyBzb3J0aW5nIG9yZGVyIGNhbiBiZSBpbmZsdWVuY2VkOlxuICpcbiAqIC8vIGFzY2VuZGluZyBvcmRlclxuICogYXN5bmMuc29ydEJ5KFsxLDksMyw1XSwgZnVuY3Rpb24oeCwgY2FsbGJhY2spIHtcbiAqICAgICBjYWxsYmFjayhudWxsLCB4KTtcbiAqIH0sIGZ1bmN0aW9uKGVycixyZXN1bHQpIHtcbiAqICAgICAvLyByZXN1bHQgY2FsbGJhY2tcbiAqIH0pO1xuICpcbiAqIC8vIGRlc2NlbmRpbmcgb3JkZXJcbiAqIGFzeW5jLnNvcnRCeShbMSw5LDMsNV0sIGZ1bmN0aW9uKHgsIGNhbGxiYWNrKSB7XG4gKiAgICAgY2FsbGJhY2sobnVsbCwgeCotMSk7ICAgIC8vPC0geCotMSBpbnN0ZWFkIG9mIHgsIHR1cm5zIHRoZSBvcmRlciBhcm91bmRcbiAqIH0sIGZ1bmN0aW9uKGVycixyZXN1bHQpIHtcbiAqICAgICAvLyByZXN1bHQgY2FsbGJhY2tcbiAqIH0pO1xuICovXG5mdW5jdGlvbiBzb3J0QnkoY29sbCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgbWFwKGNvbGwsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICBpdGVyYXRlZSh4LCBmdW5jdGlvbiAoZXJyLCBjcml0ZXJpYSkge1xuICAgICAgICAgICAgaWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7IHZhbHVlOiB4LCBjcml0ZXJpYTogY3JpdGVyaWEgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sIGZ1bmN0aW9uIChlcnIsIHJlc3VsdHMpIHtcbiAgICAgICAgaWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIGFycmF5TWFwKHJlc3VsdHMuc29ydChjb21wYXJhdG9yKSwgYmFzZVByb3BlcnR5KCd2YWx1ZScpKSk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBjb21wYXJhdG9yKGxlZnQsIHJpZ2h0KSB7XG4gICAgICAgIHZhciBhID0gbGVmdC5jcml0ZXJpYSxcbiAgICAgICAgICAgIGIgPSByaWdodC5jcml0ZXJpYTtcbiAgICAgICAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiAwO1xuICAgIH1cbn1cblxuLyoqXG4gKiBTZXRzIGEgdGltZSBsaW1pdCBvbiBhbiBhc3luY2hyb25vdXMgZnVuY3Rpb24uIElmIHRoZSBmdW5jdGlvbiBkb2VzIG5vdCBjYWxsXG4gKiBpdHMgY2FsbGJhY2sgd2l0aGluIHRoZSBzcGVjaWZpZWQgbWlsbGlzZWNvbmRzLCBpdCB3aWxsIGJlIGNhbGxlZCB3aXRoIGFcbiAqIHRpbWVvdXQgZXJyb3IuIFRoZSBjb2RlIHByb3BlcnR5IGZvciB0aGUgZXJyb3Igb2JqZWN0IHdpbGwgYmUgYCdFVElNRURPVVQnYC5cbiAqXG4gKiBAbmFtZSB0aW1lb3V0XG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOlV0aWxzXG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgVXRpbFxuICogQHBhcmFtIHtGdW5jdGlvbn0gYXN5bmNGbiAtIFRoZSBhc3luY2hyb25vdXMgZnVuY3Rpb24geW91IHdhbnQgdG8gc2V0IHRoZVxuICogdGltZSBsaW1pdC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBtaWxsaXNlY29uZHMgLSBUaGUgc3BlY2lmaWVkIHRpbWUgbGltaXQuXG4gKiBAcGFyYW0geyp9IFtpbmZvXSAtIEFueSB2YXJpYWJsZSB5b3Ugd2FudCBhdHRhY2hlZCAoYHN0cmluZ2AsIGBvYmplY3RgLCBldGMpXG4gKiB0byB0aW1lb3V0IEVycm9yIGZvciBtb3JlIGluZm9ybWF0aW9uLi5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyBhIHdyYXBwZWQgZnVuY3Rpb24gdGhhdCBjYW4gYmUgdXNlZCB3aXRoIGFueSBvZlxuICogdGhlIGNvbnRyb2wgZmxvdyBmdW5jdGlvbnMuIEludm9rZSB0aGlzIGZ1bmN0aW9uIHdpdGggdGhlIHNhbWVcbiAqIHBhcmFtZXRlcnMgYXMgeW91IHdvdWxkIGBhc3luY0Z1bmNgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBmdW5jdGlvbiBteUZ1bmN0aW9uKGZvbywgY2FsbGJhY2spIHtcbiAqICAgICBkb0FzeW5jVGFzayhmb28sIGZ1bmN0aW9uKGVyciwgZGF0YSkge1xuICogICAgICAgICAvLyBoYW5kbGUgZXJyb3JzXG4gKiAgICAgICAgIGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICpcbiAqICAgICAgICAgLy8gZG8gc29tZSBzdHVmZiAuLi5cbiAqXG4gKiAgICAgICAgIC8vIHJldHVybiBwcm9jZXNzZWQgZGF0YVxuICogICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgZGF0YSk7XG4gKiAgICAgfSk7XG4gKiB9XG4gKlxuICogdmFyIHdyYXBwZWQgPSBhc3luYy50aW1lb3V0KG15RnVuY3Rpb24sIDEwMDApO1xuICpcbiAqIC8vIGNhbGwgYHdyYXBwZWRgIGFzIHlvdSB3b3VsZCBgbXlGdW5jdGlvbmBcbiAqIHdyYXBwZWQoeyBiYXI6ICdiYXInIH0sIGZ1bmN0aW9uKGVyciwgZGF0YSkge1xuICogICAgIC8vIGlmIGBteUZ1bmN0aW9uYCB0YWtlcyA8IDEwMDAgbXMgdG8gZXhlY3V0ZSwgYGVycmBcbiAqICAgICAvLyBhbmQgYGRhdGFgIHdpbGwgaGF2ZSB0aGVpciBleHBlY3RlZCB2YWx1ZXNcbiAqXG4gKiAgICAgLy8gZWxzZSBgZXJyYCB3aWxsIGJlIGFuIEVycm9yIHdpdGggdGhlIGNvZGUgJ0VUSU1FRE9VVCdcbiAqIH0pO1xuICovXG5mdW5jdGlvbiB0aW1lb3V0KGFzeW5jRm4sIG1pbGxpc2Vjb25kcywgaW5mbykge1xuICAgIHZhciBvcmlnaW5hbENhbGxiYWNrLCB0aW1lcjtcbiAgICB2YXIgdGltZWRPdXQgPSBmYWxzZTtcblxuICAgIGZ1bmN0aW9uIGluamVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIGlmICghdGltZWRPdXQpIHtcbiAgICAgICAgICAgIG9yaWdpbmFsQ2FsbGJhY2suYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0aW1lb3V0Q2FsbGJhY2soKSB7XG4gICAgICAgIHZhciBuYW1lID0gYXN5bmNGbi5uYW1lIHx8ICdhbm9ueW1vdXMnO1xuICAgICAgICB2YXIgZXJyb3IgPSBuZXcgRXJyb3IoJ0NhbGxiYWNrIGZ1bmN0aW9uIFwiJyArIG5hbWUgKyAnXCIgdGltZWQgb3V0LicpO1xuICAgICAgICBlcnJvci5jb2RlID0gJ0VUSU1FRE9VVCc7XG4gICAgICAgIGlmIChpbmZvKSB7XG4gICAgICAgICAgICBlcnJvci5pbmZvID0gaW5mbztcbiAgICAgICAgfVxuICAgICAgICB0aW1lZE91dCA9IHRydWU7XG4gICAgICAgIG9yaWdpbmFsQ2FsbGJhY2soZXJyb3IpO1xuICAgIH1cblxuICAgIHJldHVybiBpbml0aWFsUGFyYW1zKGZ1bmN0aW9uIChhcmdzLCBvcmlnQ2FsbGJhY2spIHtcbiAgICAgICAgb3JpZ2luYWxDYWxsYmFjayA9IG9yaWdDYWxsYmFjaztcbiAgICAgICAgLy8gc2V0dXAgdGltZXIgYW5kIGNhbGwgb3JpZ2luYWwgZnVuY3Rpb25cbiAgICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KHRpbWVvdXRDYWxsYmFjaywgbWlsbGlzZWNvbmRzKTtcbiAgICAgICAgYXN5bmNGbi5hcHBseShudWxsLCBhcmdzLmNvbmNhdChpbmplY3RlZENhbGxiYWNrKSk7XG4gICAgfSk7XG59XG5cbi8qIEJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cbnZhciBuYXRpdmVDZWlsID0gTWF0aC5jZWlsO1xudmFyIG5hdGl2ZU1heCQxID0gTWF0aC5tYXg7XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8ucmFuZ2VgIGFuZCBgXy5yYW5nZVJpZ2h0YCB3aGljaCBkb2Vzbid0XG4gKiBjb2VyY2UgYXJndW1lbnRzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge251bWJlcn0gc3RhcnQgVGhlIHN0YXJ0IG9mIHRoZSByYW5nZS5cbiAqIEBwYXJhbSB7bnVtYmVyfSBlbmQgVGhlIGVuZCBvZiB0aGUgcmFuZ2UuXG4gKiBAcGFyYW0ge251bWJlcn0gc3RlcCBUaGUgdmFsdWUgdG8gaW5jcmVtZW50IG9yIGRlY3JlbWVudCBieS5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2Zyb21SaWdodF0gU3BlY2lmeSBpdGVyYXRpbmcgZnJvbSByaWdodCB0byBsZWZ0LlxuICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSByYW5nZSBvZiBudW1iZXJzLlxuICovXG5mdW5jdGlvbiBiYXNlUmFuZ2Uoc3RhcnQsIGVuZCwgc3RlcCwgZnJvbVJpZ2h0KSB7XG4gIHZhciBpbmRleCA9IC0xLFxuICAgICAgbGVuZ3RoID0gbmF0aXZlTWF4JDEobmF0aXZlQ2VpbCgoZW5kIC0gc3RhcnQpIC8gKHN0ZXAgfHwgMSkpLCAwKSxcbiAgICAgIHJlc3VsdCA9IEFycmF5KGxlbmd0aCk7XG5cbiAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgcmVzdWx0W2Zyb21SaWdodCA/IGxlbmd0aCA6ICsraW5kZXhdID0gc3RhcnQ7XG4gICAgc3RhcnQgKz0gc3RlcDtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFt0aW1lc117QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LnRpbWVzfSBidXQgcnVucyBhIG1heGltdW0gb2YgYGxpbWl0YCBhc3luYyBvcGVyYXRpb25zIGF0IGFcbiAqIHRpbWUuXG4gKlxuICogQG5hbWUgdGltZXNMaW1pdFxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb250cm9sRmxvd1xuICogQG1ldGhvZFxuICogQHNlZSBbYXN5bmMudGltZXNde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy50aW1lc31cbiAqIEBjYXRlZ29yeSBDb250cm9sIEZsb3dcbiAqIEBwYXJhbSB7bnVtYmVyfSBjb3VudCAtIFRoZSBudW1iZXIgb2YgdGltZXMgdG8gcnVuIHRoZSBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7bnVtYmVyfSBsaW1pdCAtIFRoZSBtYXhpbXVtIG51bWJlciBvZiBhc3luYyBvcGVyYXRpb25zIGF0IGEgdGltZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgYG5gIHRpbWVzLiBJbnZva2VkIHdpdGggdGhlXG4gKiBpdGVyYXRpb24gaW5kZXggYW5kIGEgY2FsbGJhY2sgKG4sIG5leHQpLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBzZWUgW2FzeW5jLm1hcF17QGxpbmsgbW9kdWxlOkNvbGxlY3Rpb25zLm1hcH0uXG4gKi9cbmZ1bmN0aW9uIHRpbWVMaW1pdChjb3VudCwgbGltaXQsIGl0ZXJhdGVlLCBjYWxsYmFjaykge1xuICBtYXBMaW1pdChiYXNlUmFuZ2UoMCwgY291bnQsIDEpLCBsaW1pdCwgaXRlcmF0ZWUsIGNhbGxiYWNrKTtcbn1cblxuLyoqXG4gKiBDYWxscyB0aGUgYGl0ZXJhdGVlYCBmdW5jdGlvbiBgbmAgdGltZXMsIGFuZCBhY2N1bXVsYXRlcyByZXN1bHRzIGluIHRoZSBzYW1lXG4gKiBtYW5uZXIgeW91IHdvdWxkIHVzZSB3aXRoIFttYXBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5tYXB9LlxuICpcbiAqIEBuYW1lIHRpbWVzXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5tYXBde0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5tYXB9XG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge251bWJlcn0gbiAtIFRoZSBudW1iZXIgb2YgdGltZXMgdG8gcnVuIHRoZSBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgYG5gIHRpbWVzLiBJbnZva2VkIHdpdGggdGhlXG4gKiBpdGVyYXRpb24gaW5kZXggYW5kIGEgY2FsbGJhY2sgKG4sIG5leHQpLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBzZWUge0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5tYXB9LlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBQcmV0ZW5kIHRoaXMgaXMgc29tZSBjb21wbGljYXRlZCBhc3luYyBmYWN0b3J5XG4gKiB2YXIgY3JlYXRlVXNlciA9IGZ1bmN0aW9uKGlkLCBjYWxsYmFjaykge1xuICogICAgIGNhbGxiYWNrKG51bGwsIHtcbiAqICAgICAgICAgaWQ6ICd1c2VyJyArIGlkXG4gKiAgICAgfSk7XG4gKiB9O1xuICpcbiAqIC8vIGdlbmVyYXRlIDUgdXNlcnNcbiAqIGFzeW5jLnRpbWVzKDUsIGZ1bmN0aW9uKG4sIG5leHQpIHtcbiAqICAgICBjcmVhdGVVc2VyKG4sIGZ1bmN0aW9uKGVyciwgdXNlcikge1xuICogICAgICAgICBuZXh0KGVyciwgdXNlcik7XG4gKiAgICAgfSk7XG4gKiB9LCBmdW5jdGlvbihlcnIsIHVzZXJzKSB7XG4gKiAgICAgLy8gd2Ugc2hvdWxkIG5vdyBoYXZlIDUgdXNlcnNcbiAqIH0pO1xuICovXG52YXIgdGltZXMgPSBkb0xpbWl0KHRpbWVMaW1pdCwgSW5maW5pdHkpO1xuXG4vKipcbiAqIFRoZSBzYW1lIGFzIFt0aW1lc117QGxpbmsgbW9kdWxlOkNvbnRyb2xGbG93LnRpbWVzfSBidXQgcnVucyBvbmx5IGEgc2luZ2xlIGFzeW5jIG9wZXJhdGlvbiBhdCBhIHRpbWUuXG4gKlxuICogQG5hbWUgdGltZXNTZXJpZXNcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBtb2R1bGU6Q29udHJvbEZsb3dcbiAqIEBtZXRob2RcbiAqIEBzZWUgW2FzeW5jLnRpbWVzXXtAbGluayBtb2R1bGU6Q29udHJvbEZsb3cudGltZXN9XG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge251bWJlcn0gbiAtIFRoZSBudW1iZXIgb2YgdGltZXMgdG8gcnVuIHRoZSBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgYG5gIHRpbWVzLiBJbnZva2VkIHdpdGggdGhlXG4gKiBpdGVyYXRpb24gaW5kZXggYW5kIGEgY2FsbGJhY2sgKG4sIG5leHQpLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBzZWUge0BsaW5rIG1vZHVsZTpDb2xsZWN0aW9ucy5tYXB9LlxuICovXG52YXIgdGltZXNTZXJpZXMgPSBkb0xpbWl0KHRpbWVMaW1pdCwgMSk7XG5cbi8qKlxuICogQSByZWxhdGl2ZSBvZiBgcmVkdWNlYC4gIFRha2VzIGFuIE9iamVjdCBvciBBcnJheSwgYW5kIGl0ZXJhdGVzIG92ZXIgZWFjaFxuICogZWxlbWVudCBpbiBzZXJpZXMsIGVhY2ggc3RlcCBwb3RlbnRpYWxseSBtdXRhdGluZyBhbiBgYWNjdW11bGF0b3JgIHZhbHVlLlxuICogVGhlIHR5cGUgb2YgdGhlIGFjY3VtdWxhdG9yIGRlZmF1bHRzIHRvIHRoZSB0eXBlIG9mIGNvbGxlY3Rpb24gcGFzc2VkIGluLlxuICpcbiAqIEBuYW1lIHRyYW5zZm9ybVxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIG1vZHVsZTpDb2xsZWN0aW9uc1xuICogQG1ldGhvZFxuICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAqIEBwYXJhbSB7QXJyYXl8SXRlcmFibGV8T2JqZWN0fSBjb2xsIC0gQSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7Kn0gW2FjY3VtdWxhdG9yXSAtIFRoZSBpbml0aWFsIHN0YXRlIG9mIHRoZSB0cmFuc2Zvcm0uICBJZiBvbWl0dGVkLFxuICogaXQgd2lsbCBkZWZhdWx0IHRvIGFuIGVtcHR5IE9iamVjdCBvciBBcnJheSwgZGVwZW5kaW5nIG9uIHRoZSB0eXBlIG9mIGBjb2xsYFxuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIGZ1bmN0aW9uIGFwcGxpZWQgdG8gZWFjaCBpdGVtIGluIHRoZVxuICogY29sbGVjdGlvbiB0aGF0IHBvdGVudGlhbGx5IG1vZGlmaWVzIHRoZSBhY2N1bXVsYXRvci4gVGhlIGBpdGVyYXRlZWAgaXNcbiAqIHBhc3NlZCBhIGBjYWxsYmFjayhlcnIpYCB3aGljaCBhY2NlcHRzIGFuIG9wdGlvbmFsIGVycm9yIGFzIGl0cyBmaXJzdFxuICogYXJndW1lbnQuIElmIGFuIGVycm9yIGlzIHBhc3NlZCB0byB0aGUgY2FsbGJhY2ssIHRoZSB0cmFuc2Zvcm0gaXMgc3RvcHBlZFxuICogYW5kIHRoZSBtYWluIGBjYWxsYmFja2AgaXMgaW1tZWRpYXRlbHkgY2FsbGVkIHdpdGggdGhlIGVycm9yLlxuICogSW52b2tlZCB3aXRoIChhY2N1bXVsYXRvciwgaXRlbSwga2V5LCBjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgYWxsIHRoZVxuICogYGl0ZXJhdGVlYCBmdW5jdGlvbnMgaGF2ZSBmaW5pc2hlZC4gUmVzdWx0IGlzIHRoZSB0cmFuc2Zvcm1lZCBhY2N1bXVsYXRvci5cbiAqIEludm9rZWQgd2l0aCAoZXJyLCByZXN1bHQpLlxuICogQGV4YW1wbGVcbiAqXG4gKiBhc3luYy50cmFuc2Zvcm0oWzEsMiwzXSwgZnVuY3Rpb24oYWNjLCBpdGVtLCBpbmRleCwgY2FsbGJhY2spIHtcbiAqICAgICAvLyBwb2ludGxlc3MgYXN5bmM6XG4gKiAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAqICAgICAgICAgYWNjLnB1c2goaXRlbSAqIDIpXG4gKiAgICAgICAgIGNhbGxiYWNrKG51bGwpXG4gKiAgICAgfSk7XG4gKiB9LCBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICogICAgIC8vIHJlc3VsdCBpcyBub3cgZXF1YWwgdG8gWzIsIDQsIDZdXG4gKiB9KTtcbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGFzeW5jLnRyYW5zZm9ybSh7YTogMSwgYjogMiwgYzogM30sIGZ1bmN0aW9uIChvYmosIHZhbCwga2V5LCBjYWxsYmFjaykge1xuICogICAgIHNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG4gKiAgICAgICAgIG9ialtrZXldID0gdmFsICogMjtcbiAqICAgICAgICAgY2FsbGJhY2soKTtcbiAqICAgICB9KVxuICogfSwgZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG4gKiAgICAgLy8gcmVzdWx0IGlzIGVxdWFsIHRvIHthOiAyLCBiOiA0LCBjOiA2fVxuICogfSlcbiAqL1xuZnVuY3Rpb24gdHJhbnNmb3JtKGNvbGwsIGFjY3VtdWxhdG9yLCBpdGVyYXRlZSwgY2FsbGJhY2spIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMykge1xuICAgICAgICBjYWxsYmFjayA9IGl0ZXJhdGVlO1xuICAgICAgICBpdGVyYXRlZSA9IGFjY3VtdWxhdG9yO1xuICAgICAgICBhY2N1bXVsYXRvciA9IGlzQXJyYXkoY29sbCkgPyBbXSA6IHt9O1xuICAgIH1cbiAgICBjYWxsYmFjayA9IG9uY2UoY2FsbGJhY2sgfHwgbm9vcCk7XG5cbiAgICBlYWNoT2YoY29sbCwgZnVuY3Rpb24gKHYsIGssIGNiKSB7XG4gICAgICAgIGl0ZXJhdGVlKGFjY3VtdWxhdG9yLCB2LCBrLCBjYik7XG4gICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICBjYWxsYmFjayhlcnIsIGFjY3VtdWxhdG9yKTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBVbmRvZXMgYSBbbWVtb2l6ZV17QGxpbmsgbW9kdWxlOlV0aWxzLm1lbW9pemV9ZCBmdW5jdGlvbiwgcmV2ZXJ0aW5nIGl0IHRvIHRoZSBvcmlnaW5hbCxcbiAqIHVubWVtb2l6ZWQgZm9ybS4gSGFuZHkgZm9yIHRlc3RpbmcuXG4gKlxuICogQG5hbWUgdW5tZW1vaXplXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOlV0aWxzXG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy5tZW1vaXplXXtAbGluayBtb2R1bGU6VXRpbHMubWVtb2l6ZX1cbiAqIEBjYXRlZ29yeSBVdGlsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiAtIHRoZSBtZW1vaXplZCBmdW5jdGlvblxuICogQHJldHVybnMge0Z1bmN0aW9ufSBhIGZ1bmN0aW9uIHRoYXQgY2FsbHMgdGhlIG9yaWdpbmFsIHVubWVtb2l6ZWQgZnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gdW5tZW1vaXplKGZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIChmbi51bm1lbW9pemVkIHx8IGZuKS5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgIH07XG59XG5cbi8qKlxuICogUmVwZWF0ZWRseSBjYWxsIGBpdGVyYXRlZWAsIHdoaWxlIGB0ZXN0YCByZXR1cm5zIGB0cnVlYC4gQ2FsbHMgYGNhbGxiYWNrYCB3aGVuXG4gKiBzdG9wcGVkLCBvciBhbiBlcnJvciBvY2N1cnMuXG4gKlxuICogQG5hbWUgd2hpbHN0XG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB0ZXN0IC0gc3luY2hyb25vdXMgdHJ1dGggdGVzdCB0byBwZXJmb3JtIGJlZm9yZSBlYWNoXG4gKiBleGVjdXRpb24gb2YgYGl0ZXJhdGVlYC4gSW52b2tlZCB3aXRoICgpLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgLSBBIGZ1bmN0aW9uIHdoaWNoIGlzIGNhbGxlZCBlYWNoIHRpbWUgYHRlc3RgIHBhc3Nlcy5cbiAqIFRoZSBmdW5jdGlvbiBpcyBwYXNzZWQgYSBgY2FsbGJhY2soZXJyKWAsIHdoaWNoIG11c3QgYmUgY2FsbGVkIG9uY2UgaXQgaGFzXG4gKiBjb21wbGV0ZWQgd2l0aCBhbiBvcHRpb25hbCBgZXJyYCBhcmd1bWVudC4gSW52b2tlZCB3aXRoIChjYWxsYmFjaykuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gQSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgYWZ0ZXIgdGhlIHRlc3RcbiAqIGZ1bmN0aW9uIGhhcyBmYWlsZWQgYW5kIHJlcGVhdGVkIGV4ZWN1dGlvbiBvZiBgaXRlcmF0ZWVgIGhhcyBzdG9wcGVkLiBgY2FsbGJhY2tgXG4gKiB3aWxsIGJlIHBhc3NlZCBhbiBlcnJvciBhbmQgYW55IGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIGZpbmFsIGBpdGVyYXRlZWAnc1xuICogY2FsbGJhY2suIEludm9rZWQgd2l0aCAoZXJyLCBbcmVzdWx0c10pO1xuICogQHJldHVybnMgdW5kZWZpbmVkXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBjb3VudCA9IDA7XG4gKiBhc3luYy53aGlsc3QoXG4gKiAgICAgZnVuY3Rpb24oKSB7IHJldHVybiBjb3VudCA8IDU7IH0sXG4gKiAgICAgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICAgICAgY291bnQrKztcbiAqICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAqICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGNvdW50KTtcbiAqICAgICAgICAgfSwgMTAwMCk7XG4gKiAgICAgfSxcbiAqICAgICBmdW5jdGlvbiAoZXJyLCBuKSB7XG4gKiAgICAgICAgIC8vIDUgc2Vjb25kcyBoYXZlIHBhc3NlZCwgbiA9IDVcbiAqICAgICB9XG4gKiApO1xuICovXG5mdW5jdGlvbiB3aGlsc3QodGVzdCwgaXRlcmF0ZWUsIGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sgPSBvbmx5T25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICBpZiAoIXRlc3QoKSkgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuICAgIHZhciBuZXh0ID0gcmVzdChmdW5jdGlvbiAoZXJyLCBhcmdzKSB7XG4gICAgICAgIGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICBpZiAodGVzdCgpKSByZXR1cm4gaXRlcmF0ZWUobmV4dCk7XG4gICAgICAgIGNhbGxiYWNrLmFwcGx5KG51bGwsIFtudWxsXS5jb25jYXQoYXJncykpO1xuICAgIH0pO1xuICAgIGl0ZXJhdGVlKG5leHQpO1xufVxuXG4vKipcbiAqIFJlcGVhdGVkbHkgY2FsbCBgZm5gIHVudGlsIGB0ZXN0YCByZXR1cm5zIGB0cnVlYC4gQ2FsbHMgYGNhbGxiYWNrYCB3aGVuXG4gKiBzdG9wcGVkLCBvciBhbiBlcnJvciBvY2N1cnMuIGBjYWxsYmFja2Agd2lsbCBiZSBwYXNzZWQgYW4gZXJyb3IgYW5kIGFueVxuICogYXJndW1lbnRzIHBhc3NlZCB0byB0aGUgZmluYWwgYGZuYCdzIGNhbGxiYWNrLlxuICpcbiAqIFRoZSBpbnZlcnNlIG9mIFt3aGlsc3Rde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy53aGlsc3R9LlxuICpcbiAqIEBuYW1lIHVudGlsXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAc2VlIFthc3luYy53aGlsc3Rde0BsaW5rIG1vZHVsZTpDb250cm9sRmxvdy53aGlsc3R9XG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB0ZXN0IC0gc3luY2hyb25vdXMgdHJ1dGggdGVzdCB0byBwZXJmb3JtIGJlZm9yZSBlYWNoXG4gKiBleGVjdXRpb24gb2YgYGZuYC4gSW52b2tlZCB3aXRoICgpLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gLSBBIGZ1bmN0aW9uIHdoaWNoIGlzIGNhbGxlZCBlYWNoIHRpbWUgYHRlc3RgIGZhaWxzLlxuICogVGhlIGZ1bmN0aW9uIGlzIHBhc3NlZCBhIGBjYWxsYmFjayhlcnIpYCwgd2hpY2ggbXVzdCBiZSBjYWxsZWQgb25jZSBpdCBoYXNcbiAqIGNvbXBsZXRlZCB3aXRoIGFuIG9wdGlvbmFsIGBlcnJgIGFyZ3VtZW50LiBJbnZva2VkIHdpdGggKGNhbGxiYWNrKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCBhZnRlciB0aGUgdGVzdFxuICogZnVuY3Rpb24gaGFzIHBhc3NlZCBhbmQgcmVwZWF0ZWQgZXhlY3V0aW9uIG9mIGBmbmAgaGFzIHN0b3BwZWQuIGBjYWxsYmFja2BcbiAqIHdpbGwgYmUgcGFzc2VkIGFuIGVycm9yIGFuZCBhbnkgYXJndW1lbnRzIHBhc3NlZCB0byB0aGUgZmluYWwgYGZuYCdzXG4gKiBjYWxsYmFjay4gSW52b2tlZCB3aXRoIChlcnIsIFtyZXN1bHRzXSk7XG4gKi9cbmZ1bmN0aW9uIHVudGlsKHRlc3QsIGZuLCBjYWxsYmFjaykge1xuICAgIHdoaWxzdChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAhdGVzdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH0sIGZuLCBjYWxsYmFjayk7XG59XG5cbi8qKlxuICogUnVucyB0aGUgYHRhc2tzYCBhcnJheSBvZiBmdW5jdGlvbnMgaW4gc2VyaWVzLCBlYWNoIHBhc3NpbmcgdGhlaXIgcmVzdWx0cyB0b1xuICogdGhlIG5leHQgaW4gdGhlIGFycmF5LiBIb3dldmVyLCBpZiBhbnkgb2YgdGhlIGB0YXNrc2AgcGFzcyBhbiBlcnJvciB0byB0aGVpclxuICogb3duIGNhbGxiYWNrLCB0aGUgbmV4dCBmdW5jdGlvbiBpcyBub3QgZXhlY3V0ZWQsIGFuZCB0aGUgbWFpbiBgY2FsbGJhY2tgIGlzXG4gKiBpbW1lZGlhdGVseSBjYWxsZWQgd2l0aCB0aGUgZXJyb3IuXG4gKlxuICogQG5hbWUgd2F0ZXJmYWxsXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgbW9kdWxlOkNvbnRyb2xGbG93XG4gKiBAbWV0aG9kXG4gKiBAY2F0ZWdvcnkgQ29udHJvbCBGbG93XG4gKiBAcGFyYW0ge0FycmF5fSB0YXNrcyAtIEFuIGFycmF5IG9mIGZ1bmN0aW9ucyB0byBydW4sIGVhY2ggZnVuY3Rpb24gaXMgcGFzc2VkXG4gKiBhIGBjYWxsYmFjayhlcnIsIHJlc3VsdDEsIHJlc3VsdDIsIC4uLilgIGl0IG11c3QgY2FsbCBvbiBjb21wbGV0aW9uLiBUaGVcbiAqIGZpcnN0IGFyZ3VtZW50IGlzIGFuIGVycm9yICh3aGljaCBjYW4gYmUgYG51bGxgKSBhbmQgYW55IGZ1cnRoZXIgYXJndW1lbnRzXG4gKiB3aWxsIGJlIHBhc3NlZCBhcyBhcmd1bWVudHMgaW4gb3JkZXIgdG8gdGhlIG5leHQgdGFzay5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBBbiBvcHRpb25hbCBjYWxsYmFjayB0byBydW4gb25jZSBhbGwgdGhlXG4gKiBmdW5jdGlvbnMgaGF2ZSBjb21wbGV0ZWQuIFRoaXMgd2lsbCBiZSBwYXNzZWQgdGhlIHJlc3VsdHMgb2YgdGhlIGxhc3QgdGFzaydzXG4gKiBjYWxsYmFjay4gSW52b2tlZCB3aXRoIChlcnIsIFtyZXN1bHRzXSkuXG4gKiBAcmV0dXJucyB1bmRlZmluZWRcbiAqIEBleGFtcGxlXG4gKlxuICogYXN5bmMud2F0ZXJmYWxsKFtcbiAqICAgICBmdW5jdGlvbihjYWxsYmFjaykge1xuICogICAgICAgICBjYWxsYmFjayhudWxsLCAnb25lJywgJ3R3bycpO1xuICogICAgIH0sXG4gKiAgICAgZnVuY3Rpb24oYXJnMSwgYXJnMiwgY2FsbGJhY2spIHtcbiAqICAgICAgICAgLy8gYXJnMSBub3cgZXF1YWxzICdvbmUnIGFuZCBhcmcyIG5vdyBlcXVhbHMgJ3R3bydcbiAqICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ3RocmVlJyk7XG4gKiAgICAgfSxcbiAqICAgICBmdW5jdGlvbihhcmcxLCBjYWxsYmFjaykge1xuICogICAgICAgICAvLyBhcmcxIG5vdyBlcXVhbHMgJ3RocmVlJ1xuICogICAgICAgICBjYWxsYmFjayhudWxsLCAnZG9uZScpO1xuICogICAgIH1cbiAqIF0sIGZ1bmN0aW9uIChlcnIsIHJlc3VsdCkge1xuICogICAgIC8vIHJlc3VsdCBub3cgZXF1YWxzICdkb25lJ1xuICogfSk7XG4gKlxuICogLy8gT3IsIHdpdGggbmFtZWQgZnVuY3Rpb25zOlxuICogYXN5bmMud2F0ZXJmYWxsKFtcbiAqICAgICBteUZpcnN0RnVuY3Rpb24sXG4gKiAgICAgbXlTZWNvbmRGdW5jdGlvbixcbiAqICAgICBteUxhc3RGdW5jdGlvbixcbiAqIF0sIGZ1bmN0aW9uIChlcnIsIHJlc3VsdCkge1xuICogICAgIC8vIHJlc3VsdCBub3cgZXF1YWxzICdkb25lJ1xuICogfSk7XG4gKiBmdW5jdGlvbiBteUZpcnN0RnVuY3Rpb24oY2FsbGJhY2spIHtcbiAqICAgICBjYWxsYmFjayhudWxsLCAnb25lJywgJ3R3bycpO1xuICogfVxuICogZnVuY3Rpb24gbXlTZWNvbmRGdW5jdGlvbihhcmcxLCBhcmcyLCBjYWxsYmFjaykge1xuICogICAgIC8vIGFyZzEgbm93IGVxdWFscyAnb25lJyBhbmQgYXJnMiBub3cgZXF1YWxzICd0d28nXG4gKiAgICAgY2FsbGJhY2sobnVsbCwgJ3RocmVlJyk7XG4gKiB9XG4gKiBmdW5jdGlvbiBteUxhc3RGdW5jdGlvbihhcmcxLCBjYWxsYmFjaykge1xuICogICAgIC8vIGFyZzEgbm93IGVxdWFscyAndGhyZWUnXG4gKiAgICAgY2FsbGJhY2sobnVsbCwgJ2RvbmUnKTtcbiAqIH1cbiAqL1xudmFyIHdhdGVyZmFsbCA9IGZ1bmN0aW9uICh0YXNrcywgY2FsbGJhY2spIHtcbiAgICBjYWxsYmFjayA9IG9uY2UoY2FsbGJhY2sgfHwgbm9vcCk7XG4gICAgaWYgKCFpc0FycmF5KHRhc2tzKSkgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignRmlyc3QgYXJndW1lbnQgdG8gd2F0ZXJmYWxsIG11c3QgYmUgYW4gYXJyYXkgb2YgZnVuY3Rpb25zJykpO1xuICAgIGlmICghdGFza3MubGVuZ3RoKSByZXR1cm4gY2FsbGJhY2soKTtcbiAgICB2YXIgdGFza0luZGV4ID0gMDtcblxuICAgIGZ1bmN0aW9uIG5leHRUYXNrKGFyZ3MpIHtcbiAgICAgICAgaWYgKHRhc2tJbmRleCA9PT0gdGFza3MubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2suYXBwbHkobnVsbCwgW251bGxdLmNvbmNhdChhcmdzKSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdGFza0NhbGxiYWNrID0gb25seU9uY2UocmVzdChmdW5jdGlvbiAoZXJyLCBhcmdzKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KG51bGwsIFtlcnJdLmNvbmNhdChhcmdzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXh0VGFzayhhcmdzKTtcbiAgICAgICAgfSkpO1xuXG4gICAgICAgIGFyZ3MucHVzaCh0YXNrQ2FsbGJhY2spO1xuXG4gICAgICAgIHZhciB0YXNrID0gdGFza3NbdGFza0luZGV4KytdO1xuICAgICAgICB0YXNrLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgIH1cblxuICAgIG5leHRUYXNrKFtdKTtcbn07XG5cbi8qKlxuICogQXN5bmMgaXMgYSB1dGlsaXR5IG1vZHVsZSB3aGljaCBwcm92aWRlcyBzdHJhaWdodC1mb3J3YXJkLCBwb3dlcmZ1bCBmdW5jdGlvbnNcbiAqIGZvciB3b3JraW5nIHdpdGggYXN5bmNocm9ub3VzIEphdmFTY3JpcHQuIEFsdGhvdWdoIG9yaWdpbmFsbHkgZGVzaWduZWQgZm9yXG4gKiB1c2Ugd2l0aCBbTm9kZS5qc10oaHR0cDovL25vZGVqcy5vcmcpIGFuZCBpbnN0YWxsYWJsZSB2aWFcbiAqIGBucG0gaW5zdGFsbCAtLXNhdmUgYXN5bmNgLCBpdCBjYW4gYWxzbyBiZSB1c2VkIGRpcmVjdGx5IGluIHRoZSBicm93c2VyLlxuICogQG1vZHVsZSBhc3luY1xuICovXG5cbi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIGBhc3luY2AgZnVuY3Rpb25zIGZvciBtYW5pcHVsYXRpbmcgY29sbGVjdGlvbnMsIHN1Y2ggYXNcbiAqIGFycmF5cyBhbmQgb2JqZWN0cy5cbiAqIEBtb2R1bGUgQ29sbGVjdGlvbnNcbiAqL1xuXG4vKipcbiAqIEEgY29sbGVjdGlvbiBvZiBgYXN5bmNgIGZ1bmN0aW9ucyBmb3IgY29udHJvbGxpbmcgdGhlIGZsb3cgdGhyb3VnaCBhIHNjcmlwdC5cbiAqIEBtb2R1bGUgQ29udHJvbEZsb3dcbiAqL1xuXG4vKipcbiAqIEEgY29sbGVjdGlvbiBvZiBgYXN5bmNgIHV0aWxpdHkgZnVuY3Rpb25zLlxuICogQG1vZHVsZSBVdGlsc1xuICovXG52YXIgaW5kZXggPSB7XG4gIGFwcGx5RWFjaDogYXBwbHlFYWNoLFxuICBhcHBseUVhY2hTZXJpZXM6IGFwcGx5RWFjaFNlcmllcyxcbiAgYXBwbHk6IGFwcGx5JDIsXG4gIGFzeW5jaWZ5OiBhc3luY2lmeSxcbiAgYXV0bzogYXV0byxcbiAgYXV0b0luamVjdDogYXV0b0luamVjdCxcbiAgY2FyZ286IGNhcmdvLFxuICBjb21wb3NlOiBjb21wb3NlLFxuICBjb25jYXQ6IGNvbmNhdCxcbiAgY29uY2F0U2VyaWVzOiBjb25jYXRTZXJpZXMsXG4gIGNvbnN0YW50OiBjb25zdGFudCxcbiAgZGV0ZWN0OiBkZXRlY3QsXG4gIGRldGVjdExpbWl0OiBkZXRlY3RMaW1pdCxcbiAgZGV0ZWN0U2VyaWVzOiBkZXRlY3RTZXJpZXMsXG4gIGRpcjogZGlyLFxuICBkb0R1cmluZzogZG9EdXJpbmcsXG4gIGRvVW50aWw6IGRvVW50aWwsXG4gIGRvV2hpbHN0OiBkb1doaWxzdCxcbiAgZHVyaW5nOiBkdXJpbmcsXG4gIGVhY2g6IGVhY2hMaW1pdCxcbiAgZWFjaExpbWl0OiBlYWNoTGltaXQkMSxcbiAgZWFjaE9mOiBlYWNoT2YsXG4gIGVhY2hPZkxpbWl0OiBlYWNoT2ZMaW1pdCxcbiAgZWFjaE9mU2VyaWVzOiBlYWNoT2ZTZXJpZXMsXG4gIGVhY2hTZXJpZXM6IGVhY2hTZXJpZXMsXG4gIGVuc3VyZUFzeW5jOiBlbnN1cmVBc3luYyxcbiAgZXZlcnk6IGV2ZXJ5LFxuICBldmVyeUxpbWl0OiBldmVyeUxpbWl0LFxuICBldmVyeVNlcmllczogZXZlcnlTZXJpZXMsXG4gIGZpbHRlcjogZmlsdGVyLFxuICBmaWx0ZXJMaW1pdDogZmlsdGVyTGltaXQsXG4gIGZpbHRlclNlcmllczogZmlsdGVyU2VyaWVzLFxuICBmb3JldmVyOiBmb3JldmVyLFxuICBsb2c6IGxvZyxcbiAgbWFwOiBtYXAsXG4gIG1hcExpbWl0OiBtYXBMaW1pdCxcbiAgbWFwU2VyaWVzOiBtYXBTZXJpZXMsXG4gIG1hcFZhbHVlczogbWFwVmFsdWVzLFxuICBtYXBWYWx1ZXNMaW1pdDogbWFwVmFsdWVzTGltaXQsXG4gIG1hcFZhbHVlc1NlcmllczogbWFwVmFsdWVzU2VyaWVzLFxuICBtZW1vaXplOiBtZW1vaXplLFxuICBuZXh0VGljazogbmV4dFRpY2ssXG4gIHBhcmFsbGVsOiBwYXJhbGxlbExpbWl0LFxuICBwYXJhbGxlbExpbWl0OiBwYXJhbGxlbExpbWl0JDEsXG4gIHByaW9yaXR5UXVldWU6IHByaW9yaXR5UXVldWUsXG4gIHF1ZXVlOiBxdWV1ZSQxLFxuICByYWNlOiByYWNlLFxuICByZWR1Y2U6IHJlZHVjZSxcbiAgcmVkdWNlUmlnaHQ6IHJlZHVjZVJpZ2h0LFxuICByZWZsZWN0OiByZWZsZWN0LFxuICByZWZsZWN0QWxsOiByZWZsZWN0QWxsLFxuICByZWplY3Q6IHJlamVjdCxcbiAgcmVqZWN0TGltaXQ6IHJlamVjdExpbWl0LFxuICByZWplY3RTZXJpZXM6IHJlamVjdFNlcmllcyxcbiAgcmV0cnk6IHJldHJ5LFxuICByZXRyeWFibGU6IHJldHJ5YWJsZSxcbiAgc2VxOiBzZXEkMSxcbiAgc2VyaWVzOiBzZXJpZXMsXG4gIHNldEltbWVkaWF0ZTogc2V0SW1tZWRpYXRlJDEsXG4gIHNvbWU6IHNvbWUsXG4gIHNvbWVMaW1pdDogc29tZUxpbWl0LFxuICBzb21lU2VyaWVzOiBzb21lU2VyaWVzLFxuICBzb3J0Qnk6IHNvcnRCeSxcbiAgdGltZW91dDogdGltZW91dCxcbiAgdGltZXM6IHRpbWVzLFxuICB0aW1lc0xpbWl0OiB0aW1lTGltaXQsXG4gIHRpbWVzU2VyaWVzOiB0aW1lc1NlcmllcyxcbiAgdHJhbnNmb3JtOiB0cmFuc2Zvcm0sXG4gIHVubWVtb2l6ZTogdW5tZW1vaXplLFxuICB1bnRpbDogdW50aWwsXG4gIHdhdGVyZmFsbDogd2F0ZXJmYWxsLFxuICB3aGlsc3Q6IHdoaWxzdCxcblxuICAvLyBhbGlhc2VzXG4gIGFsbDogZXZlcnksXG4gIGFueTogc29tZSxcbiAgZm9yRWFjaDogZWFjaExpbWl0LFxuICBmb3JFYWNoU2VyaWVzOiBlYWNoU2VyaWVzLFxuICBmb3JFYWNoTGltaXQ6IGVhY2hMaW1pdCQxLFxuICBmb3JFYWNoT2Y6IGVhY2hPZixcbiAgZm9yRWFjaE9mU2VyaWVzOiBlYWNoT2ZTZXJpZXMsXG4gIGZvckVhY2hPZkxpbWl0OiBlYWNoT2ZMaW1pdCxcbiAgaW5qZWN0OiByZWR1Y2UsXG4gIGZvbGRsOiByZWR1Y2UsXG4gIGZvbGRyOiByZWR1Y2VSaWdodCxcbiAgc2VsZWN0OiBmaWx0ZXIsXG4gIHNlbGVjdExpbWl0OiBmaWx0ZXJMaW1pdCxcbiAgc2VsZWN0U2VyaWVzOiBmaWx0ZXJTZXJpZXMsXG4gIHdyYXBTeW5jOiBhc3luY2lmeVxufTtcblxuZXhwb3J0c1snZGVmYXVsdCddID0gaW5kZXg7XG5leHBvcnRzLmFwcGx5RWFjaCA9IGFwcGx5RWFjaDtcbmV4cG9ydHMuYXBwbHlFYWNoU2VyaWVzID0gYXBwbHlFYWNoU2VyaWVzO1xuZXhwb3J0cy5hcHBseSA9IGFwcGx5JDI7XG5leHBvcnRzLmFzeW5jaWZ5ID0gYXN5bmNpZnk7XG5leHBvcnRzLmF1dG8gPSBhdXRvO1xuZXhwb3J0cy5hdXRvSW5qZWN0ID0gYXV0b0luamVjdDtcbmV4cG9ydHMuY2FyZ28gPSBjYXJnbztcbmV4cG9ydHMuY29tcG9zZSA9IGNvbXBvc2U7XG5leHBvcnRzLmNvbmNhdCA9IGNvbmNhdDtcbmV4cG9ydHMuY29uY2F0U2VyaWVzID0gY29uY2F0U2VyaWVzO1xuZXhwb3J0cy5jb25zdGFudCA9IGNvbnN0YW50O1xuZXhwb3J0cy5kZXRlY3QgPSBkZXRlY3Q7XG5leHBvcnRzLmRldGVjdExpbWl0ID0gZGV0ZWN0TGltaXQ7XG5leHBvcnRzLmRldGVjdFNlcmllcyA9IGRldGVjdFNlcmllcztcbmV4cG9ydHMuZGlyID0gZGlyO1xuZXhwb3J0cy5kb0R1cmluZyA9IGRvRHVyaW5nO1xuZXhwb3J0cy5kb1VudGlsID0gZG9VbnRpbDtcbmV4cG9ydHMuZG9XaGlsc3QgPSBkb1doaWxzdDtcbmV4cG9ydHMuZHVyaW5nID0gZHVyaW5nO1xuZXhwb3J0cy5lYWNoID0gZWFjaExpbWl0O1xuZXhwb3J0cy5lYWNoTGltaXQgPSBlYWNoTGltaXQkMTtcbmV4cG9ydHMuZWFjaE9mID0gZWFjaE9mO1xuZXhwb3J0cy5lYWNoT2ZMaW1pdCA9IGVhY2hPZkxpbWl0O1xuZXhwb3J0cy5lYWNoT2ZTZXJpZXMgPSBlYWNoT2ZTZXJpZXM7XG5leHBvcnRzLmVhY2hTZXJpZXMgPSBlYWNoU2VyaWVzO1xuZXhwb3J0cy5lbnN1cmVBc3luYyA9IGVuc3VyZUFzeW5jO1xuZXhwb3J0cy5ldmVyeSA9IGV2ZXJ5O1xuZXhwb3J0cy5ldmVyeUxpbWl0ID0gZXZlcnlMaW1pdDtcbmV4cG9ydHMuZXZlcnlTZXJpZXMgPSBldmVyeVNlcmllcztcbmV4cG9ydHMuZmlsdGVyID0gZmlsdGVyO1xuZXhwb3J0cy5maWx0ZXJMaW1pdCA9IGZpbHRlckxpbWl0O1xuZXhwb3J0cy5maWx0ZXJTZXJpZXMgPSBmaWx0ZXJTZXJpZXM7XG5leHBvcnRzLmZvcmV2ZXIgPSBmb3JldmVyO1xuZXhwb3J0cy5sb2cgPSBsb2c7XG5leHBvcnRzLm1hcCA9IG1hcDtcbmV4cG9ydHMubWFwTGltaXQgPSBtYXBMaW1pdDtcbmV4cG9ydHMubWFwU2VyaWVzID0gbWFwU2VyaWVzO1xuZXhwb3J0cy5tYXBWYWx1ZXMgPSBtYXBWYWx1ZXM7XG5leHBvcnRzLm1hcFZhbHVlc0xpbWl0ID0gbWFwVmFsdWVzTGltaXQ7XG5leHBvcnRzLm1hcFZhbHVlc1NlcmllcyA9IG1hcFZhbHVlc1NlcmllcztcbmV4cG9ydHMubWVtb2l6ZSA9IG1lbW9pemU7XG5leHBvcnRzLm5leHRUaWNrID0gbmV4dFRpY2s7XG5leHBvcnRzLnBhcmFsbGVsID0gcGFyYWxsZWxMaW1pdDtcbmV4cG9ydHMucGFyYWxsZWxMaW1pdCA9IHBhcmFsbGVsTGltaXQkMTtcbmV4cG9ydHMucHJpb3JpdHlRdWV1ZSA9IHByaW9yaXR5UXVldWU7XG5leHBvcnRzLnF1ZXVlID0gcXVldWUkMTtcbmV4cG9ydHMucmFjZSA9IHJhY2U7XG5leHBvcnRzLnJlZHVjZSA9IHJlZHVjZTtcbmV4cG9ydHMucmVkdWNlUmlnaHQgPSByZWR1Y2VSaWdodDtcbmV4cG9ydHMucmVmbGVjdCA9IHJlZmxlY3Q7XG5leHBvcnRzLnJlZmxlY3RBbGwgPSByZWZsZWN0QWxsO1xuZXhwb3J0cy5yZWplY3QgPSByZWplY3Q7XG5leHBvcnRzLnJlamVjdExpbWl0ID0gcmVqZWN0TGltaXQ7XG5leHBvcnRzLnJlamVjdFNlcmllcyA9IHJlamVjdFNlcmllcztcbmV4cG9ydHMucmV0cnkgPSByZXRyeTtcbmV4cG9ydHMucmV0cnlhYmxlID0gcmV0cnlhYmxlO1xuZXhwb3J0cy5zZXEgPSBzZXEkMTtcbmV4cG9ydHMuc2VyaWVzID0gc2VyaWVzO1xuZXhwb3J0cy5zZXRJbW1lZGlhdGUgPSBzZXRJbW1lZGlhdGUkMTtcbmV4cG9ydHMuc29tZSA9IHNvbWU7XG5leHBvcnRzLnNvbWVMaW1pdCA9IHNvbWVMaW1pdDtcbmV4cG9ydHMuc29tZVNlcmllcyA9IHNvbWVTZXJpZXM7XG5leHBvcnRzLnNvcnRCeSA9IHNvcnRCeTtcbmV4cG9ydHMudGltZW91dCA9IHRpbWVvdXQ7XG5leHBvcnRzLnRpbWVzID0gdGltZXM7XG5leHBvcnRzLnRpbWVzTGltaXQgPSB0aW1lTGltaXQ7XG5leHBvcnRzLnRpbWVzU2VyaWVzID0gdGltZXNTZXJpZXM7XG5leHBvcnRzLnRyYW5zZm9ybSA9IHRyYW5zZm9ybTtcbmV4cG9ydHMudW5tZW1vaXplID0gdW5tZW1vaXplO1xuZXhwb3J0cy51bnRpbCA9IHVudGlsO1xuZXhwb3J0cy53YXRlcmZhbGwgPSB3YXRlcmZhbGw7XG5leHBvcnRzLndoaWxzdCA9IHdoaWxzdDtcbmV4cG9ydHMuYWxsID0gZXZlcnk7XG5leHBvcnRzLmFsbExpbWl0ID0gZXZlcnlMaW1pdDtcbmV4cG9ydHMuYWxsU2VyaWVzID0gZXZlcnlTZXJpZXM7XG5leHBvcnRzLmFueSA9IHNvbWU7XG5leHBvcnRzLmFueUxpbWl0ID0gc29tZUxpbWl0O1xuZXhwb3J0cy5hbnlTZXJpZXMgPSBzb21lU2VyaWVzO1xuZXhwb3J0cy5maW5kID0gZGV0ZWN0O1xuZXhwb3J0cy5maW5kTGltaXQgPSBkZXRlY3RMaW1pdDtcbmV4cG9ydHMuZmluZFNlcmllcyA9IGRldGVjdFNlcmllcztcbmV4cG9ydHMuZm9yRWFjaCA9IGVhY2hMaW1pdDtcbmV4cG9ydHMuZm9yRWFjaFNlcmllcyA9IGVhY2hTZXJpZXM7XG5leHBvcnRzLmZvckVhY2hMaW1pdCA9IGVhY2hMaW1pdCQxO1xuZXhwb3J0cy5mb3JFYWNoT2YgPSBlYWNoT2Y7XG5leHBvcnRzLmZvckVhY2hPZlNlcmllcyA9IGVhY2hPZlNlcmllcztcbmV4cG9ydHMuZm9yRWFjaE9mTGltaXQgPSBlYWNoT2ZMaW1pdDtcbmV4cG9ydHMuaW5qZWN0ID0gcmVkdWNlO1xuZXhwb3J0cy5mb2xkbCA9IHJlZHVjZTtcbmV4cG9ydHMuZm9sZHIgPSByZWR1Y2VSaWdodDtcbmV4cG9ydHMuc2VsZWN0ID0gZmlsdGVyO1xuZXhwb3J0cy5zZWxlY3RMaW1pdCA9IGZpbHRlckxpbWl0O1xuZXhwb3J0cy5zZWxlY3RTZXJpZXMgPSBmaWx0ZXJTZXJpZXM7XG5leHBvcnRzLndyYXBTeW5jID0gYXN5bmNpZnk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbn0pKSk7XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiLyohIEFwb2xsbyB2MS42LjAgfCAoYykgMjAxNCBAdG9kZG1vdHRvIHwgZ2l0aHViLmNvbS90b2RkbW90dG8vYXBvbGxvICovXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZShmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSwgZXhwb3J0cywgbW9kdWxlKTtcbiAgfSBlbHNlIHtcbiAgICByb290LkFwb2xsbyA9IGZhY3RvcnkoKTtcbiAgfVxufSkodGhpcywgZnVuY3Rpb24gKHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSkge1xuXG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgZXhwb3J0cyA9IHt9LCBfaGFzQ2xhc3MsIF9hZGRDbGFzcywgX3JlbW92ZUNsYXNzLCBfdG9nZ2xlQ2xhc3M7XG5cbiAgdmFyIF9mb3JFYWNoID0gZnVuY3Rpb24gKGNsYXNzZXMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChjbGFzc2VzKSAhPT0gJ1tvYmplY3QgQXJyYXldJykge1xuICAgICAgY2xhc3NlcyA9IGNsYXNzZXMuc3BsaXQoJyAnKTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjbGFzc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjYWxsYmFjayhjbGFzc2VzW2ldLCBpKTtcbiAgICB9XG4gIH07XG5cbiAgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGFzc0xpc3QpIHtcbiAgICBfaGFzQ2xhc3MgPSBmdW5jdGlvbiAoZWxlbSwgY2xhc3NOYW1lKSB7XG4gICAgICByZXR1cm4gZWxlbS5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKTtcbiAgICB9O1xuICAgIF9hZGRDbGFzcyA9IGZ1bmN0aW9uIChlbGVtLCBjbGFzc05hbWUpIHtcbiAgICAgIGVsZW0uY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpO1xuICAgIH07XG4gICAgX3JlbW92ZUNsYXNzID0gZnVuY3Rpb24gKGVsZW0sIGNsYXNzTmFtZSkge1xuICAgICAgZWxlbS5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzTmFtZSk7XG4gICAgfTtcbiAgICBfdG9nZ2xlQ2xhc3MgPSBmdW5jdGlvbiAoZWxlbSwgY2xhc3NOYW1lKSB7XG4gICAgICBlbGVtLmNsYXNzTGlzdC50b2dnbGUoY2xhc3NOYW1lKTtcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIF9oYXNDbGFzcyA9IGZ1bmN0aW9uIChlbGVtLCBjbGFzc05hbWUpIHtcbiAgICAgIHJldHVybiBuZXcgUmVnRXhwKCcoXnxcXFxccyknICsgY2xhc3NOYW1lICsgJyhcXFxcc3wkKScpLnRlc3QoZWxlbS5jbGFzc05hbWUpO1xuICAgIH07XG4gICAgX2FkZENsYXNzID0gZnVuY3Rpb24gKGVsZW0sIGNsYXNzTmFtZSkge1xuICAgICAgaWYgKCFleHBvcnRzLmhhc0NsYXNzKGVsZW0sIGNsYXNzTmFtZSkpIHtcbiAgICAgICAgZWxlbS5jbGFzc05hbWUgKz0gKGVsZW0uY2xhc3NOYW1lID8gJyAnIDogJycpICsgY2xhc3NOYW1lO1xuICAgICAgfVxuICAgIH07XG4gICAgX3JlbW92ZUNsYXNzID0gZnVuY3Rpb24gKGVsZW0sIGNsYXNzTmFtZSkge1xuICAgICAgaWYgKGV4cG9ydHMuaGFzQ2xhc3MoZWxlbSwgY2xhc3NOYW1lKSkge1xuICAgICAgICBlbGVtLmNsYXNzTmFtZSA9IGVsZW0uY2xhc3NOYW1lLnJlcGxhY2UobmV3IFJlZ0V4cCgnKF58XFxcXHMpKicgKyBjbGFzc05hbWUgKyAnKFxcXFxzfCQpKicsICdnJyksICcnKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIF90b2dnbGVDbGFzcyA9IGZ1bmN0aW9uIChlbGVtLCBjbGFzc05hbWUpIHtcbiAgICAgIHZhciB0b2dnbGUgPSBleHBvcnRzLmhhc0NsYXNzKGVsZW0sIGNsYXNzTmFtZSkgPyBleHBvcnRzLnJlbW92ZUNsYXNzIDogZXhwb3J0cy5hZGRDbGFzcztcbiAgICAgIHRvZ2dsZShlbGVtLCBjbGFzc05hbWUpO1xuICAgIH07XG4gIH1cblxuICBleHBvcnRzLmhhc0NsYXNzID0gZnVuY3Rpb24gKGVsZW0sIGNsYXNzTmFtZSkge1xuICAgIHJldHVybiBfaGFzQ2xhc3MoZWxlbSwgY2xhc3NOYW1lKTtcbiAgfTtcblxuICBleHBvcnRzLmFkZENsYXNzID0gZnVuY3Rpb24gKGVsZW0sIGNsYXNzZXMpIHtcbiAgICBfZm9yRWFjaChjbGFzc2VzLCBmdW5jdGlvbiAoY2xhc3NOYW1lKSB7XG4gICAgICBfYWRkQ2xhc3MoZWxlbSwgY2xhc3NOYW1lKTtcbiAgICB9KTtcbiAgfTtcblxuICBleHBvcnRzLnJlbW92ZUNsYXNzID0gZnVuY3Rpb24gKGVsZW0sIGNsYXNzZXMpIHtcbiAgICBfZm9yRWFjaChjbGFzc2VzLCBmdW5jdGlvbiAoY2xhc3NOYW1lKSB7XG4gICAgICBfcmVtb3ZlQ2xhc3MoZWxlbSwgY2xhc3NOYW1lKTtcbiAgICB9KTtcbiAgfTtcblxuICBleHBvcnRzLnRvZ2dsZUNsYXNzID0gZnVuY3Rpb24gKGVsZW0sIGNsYXNzZXMpIHtcbiAgICBfZm9yRWFjaChjbGFzc2VzLCBmdW5jdGlvbiAoY2xhc3NOYW1lKSB7XG4gICAgICBfdG9nZ2xlQ2xhc3MoZWxlbSwgY2xhc3NOYW1lKTtcbiAgICB9KTtcbiAgfTtcblxuICByZXR1cm4gZXhwb3J0cztcblxufSk7IiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIF9pc0FycmF5ID0gZnVuY3Rpb24gKGFycmF5KSB7XG4gICAgcmV0dXJuIGFycmF5ICYmICh0eXBlb2YgYXJyYXkgPT09ICdvYmplY3QnKSAmJiBpc0Zpbml0ZShhcnJheS5sZW5ndGgpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBJdGVyYXRlIHRocm91Z2ggYWxsIGl0ZW1zIGluIGFuIGluZGV4YWJsZSBBcnJheSB0byBzdXBwb3J0IHRoZVxuICAgKiBmb3JFYWNoLWxlc3MgTm9kZUxpc3QsIGFuZCBhIGZhaXIgYWx0ZXJuYXRpdmUgdG8gc29tZXRoaW5nIGxpa2VcbiAgICogQXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbC5cbiAgICogQHBhcmFtIHNlbGYgYW4gYXJyYXktbGlrZSBvYmplY3RcbiAgICogQHBhcmFtIGZuIHRoZSBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IHJlY2VpdmVzIGVhY2ggaXRlbSAoYW5kIGluZGV4KVxuICAgKiBAcGFyYW0gY29udGV4dCBhbiBvcHRpb25hbCBjb250ZXh0IGZvciB0aGUgZnVuY3Rpb24gY2FsbFxuICAgKi9cbiAgdmFyIF9lYWNoID0gZnVuY3Rpb24gKHNlbGYsIGZuLCBjb250ZXh0KSB7XG4gICAgaWYgKF9pc0FycmF5KHNlbGYpKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZm4uY2FsbChjb250ZXh0LCBzZWxmW2ldLCBpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yICh2YXIga2V5IGluIHNlbGYpIHtcbiAgICAgIGlmIChzZWxmLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgZm4uY2FsbChjb250ZXh0LCBrZXksIHNlbGZba2V5XSwgc2VsZik7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgRE9NIGVsZW1lbnQgd2l0aCB0aGUgZ2l2ZW4gdGFnXG4gICAqIGFuZCBvcHRpb25hbCBhdHRyaWJ1dGVzIGFuZCB0ZXh0LlxuICAgKiBAcGFyYW0gdGFnIHRoZSBub2RlIG5hbWUgb2YgdGhlIG5ldyBET00gZWxlbWVudC5cbiAgICogQHBhcmFtIGF0dHJpYnV0ZXMgYW4gYXJyYXkgb2YgYXR0cmlidXRlcywgbGlrZSAnaWQnIG9yICdjbGFzcydcbiAgICogQHBhcmFtIHZhbHVlIG9wdGlvbmFsIHRleHQgdG8gYXBwZW5kIGFzIGEgdGV4dCBub2RlXG4gICAqIEByZXR1cm4gdGhlIG5ldyBET00gZWxlbWVudFxuICAgKi9cbiAgdmFyIF9lbGVtZW50ID0gZnVuY3Rpb24gKHRhZywgYXR0cmlidXRlcywgdmFsdWUpIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZyk7XG4gICAgX2VhY2goYXR0cmlidXRlcywgZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICAgIGVsLnNldEF0dHJpYnV0ZShrZXksIHZhbHVlKTtcbiAgICB9KTtcbiAgICBpZiAodmFsdWUpIHtcbiAgICAgIGVsLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHZhbHVlKSk7XG4gICAgfVxuICAgIHJldHVybiBlbDtcbiAgfTtcblxuICBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBlbGVtZW50OiBfZWxlbWVudCxcbiAgICBlYWNoOiBfZWFjaCxcbiAgICBpc0FycmF5OiBfaXNBcnJheVxuICB9O1xuXG59KCkpOyIsIi8qIENhbGlmb3JuaWEuanMgdjAuMVxuICogQ29weXJpZ2h0IChjKSAyMDE0IEpvZSBMaXZlcnNlZGdlIChAamxpdmVyc2UpXG4gKiBNSVQgTGljZW5zZVxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gKHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIGZ1bmN0aW9ucyA9IHJlcXVpcmUoJ2NhbGlmb3JuaWEtZnVuY3Rpb25zJyk7XG5cbiAgdmFyIGZvckVhY2ggPSByZXF1aXJlKCdhc3luYy1mb3JlYWNoJykuZm9yRWFjaDtcblxuICAvKipcbiAgICogT3B0aW9uYWxseSBtYXAgYWxsIHRoZSB2YWx1ZXMgaW4gdGhlIGdpdmVuIEFycmF5IHVzaW5nIGEgcHJvdmlkZWQgbWFwXG4gICAqIGZ1bmN0aW9uIGFuZCBkZXRlcm1pbmUgaWYgYWxsIHRoZSB2YWx1ZXMgaW4gdGhlIGFycmF5IGFyZSBzdHJpY3RseSBlcXVhbC5cbiAgICogQHBhcmFtIHNlbGYgYW4gYXJyYXktbGlrZSBvYmplY3RcbiAgICogQHBhcmFtIGZuIHRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBtYXAgZWFjaCB2YWx1ZSBpbiB0aGUgYXJyYXlcbiAgICovXG4gIHZhciBfYXJyYXlWYWx1ZXNBcmVFcXVhbCA9IGZ1bmN0aW9uIChhcnJheSwgZm4pIHtcbiAgICB2YXIgbWFwcGVkID0gKGZuKSA/IGFycmF5Lm1hcChmbikgOiBhcnJheTtcbiAgICBpZiAobWFwcGVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBtYXBwZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChtYXBwZWRbaV0gIT09IG1hcHBlZFswXSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBBIGZhY3RvcnkgZm9yIEZvbnRzLlxuICAgKi9cbiAgdmFyIEZvbnRGYWN0b3J5ID0gZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIG5hbWVzQW5kSW5zdGFuY2VzID0ge307XG5cbiAgICAvKipcbiAgICAgKiBBIHNpbXBsZSByZXByZXNlbnRhdGlvbiBvZiBhIGZvbnQuXG4gICAgICogQHBhcmFtIHRoZSBuYW1lIG9mIHRoZSBmb250LCBlLmcuLCAnQ29taWMgU2FucyBNUydcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBGb250KG5hbWUpIHtcbiAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSB3aWR0aCBvZiB0aGUgZ2l2ZW4gdGV4dCB3aXRoIHRoZSBmb250IG5hbWUuXG4gICAgICogVGhpcyBpcyBwcm92aWRlZCBieSBGb250IGluc3RhbmNlcyBnZW5lcmF0ZWQgYnkgdGhlIEZvbnRGYWN0b3J5LlxuICAgICAqL1xuICAgIEZvbnQucHJvdG90eXBlLm1lYXN1cmVUZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG5cbiAgICAgIC8qKlxuICAgICAgICogQSBGb250IGZhY3RvcnkgbWV0aG9kIHRoYXQgY2FjaGVzIGZvbnQgaW5zdGFuY2VzIGJ5IG5hbWUuXG4gICAgICAgKi9cbiAgICAgIGZvbnRXaXRoTmFtZTogZnVuY3Rpb24gKG5hbWUpIHtcblxuICAgICAgICB2YXIgaW5zdGFuY2UgPSBuYW1lc0FuZEluc3RhbmNlc1tuYW1lXTtcbiAgICAgICAgaWYgKGluc3RhbmNlKSB7XG4gICAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVE9ETzogQ2hlY2sgdGhhdCB0aGUgQ2FudmFzIGlzIHN1cHBvcnRlZC5cbiAgICAgICAgLy8gQ3JlYXRlIGEgY2FudmFzIChub3QgYXR0YWNoZWQgdG8gdGhlIERPTSkuXG4gICAgICAgIHZhciBjYW52YXMgPSBmdW5jdGlvbnMuZWxlbWVudCgnY2FudmFzJywge1xuICAgICAgICAgIHdpZHRoOiAzMjAsXG4gICAgICAgICAgaGVpZ2h0OiAzMjBcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBmb250IGFuZCBhc3NvY2lhdGUgdGhlIGNhbnZhcycgZHJhd2luZ1xuICAgICAgICAvLyBjb250ZXh0IHdpdGggdGhlIG5hbWUgb2YgdGhlIGZvbnQuXG4gICAgICAgIGNhbnZhcy5nZXRDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQgfHwgZnVuY3Rpb24oKSB7IHJldHVybiB7fTsgfTtcbiAgICAgICAgdmFyIGNvbnRleHQyZCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICBjb250ZXh0MmQuZm9udCA9ICczNnB4IFwiJyArIG5hbWUgKyAnXCIsIEFkb2JlQmxhbmssIG1vbm9zcGFjZSc7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBuZXcgRm9udCBhbmQgb3ZlcnJpZGUgaXRzIG1lYXN1cmVUZXh0IGZ1bmN0aW9uIHRvIHVzZVxuICAgICAgICAvLyBhIG5ldyBjbG9zdXJlIHVzaW5nIHRoZSBjYW52YXMgYW5kIGNvbnRleHQgd2UgY3JlYXRlZC5cbiAgICAgICAgaW5zdGFuY2UgPSBuZXcgRm9udChuYW1lKTtcbiAgICAgICAgaW5zdGFuY2UubWVhc3VyZVRleHQgPSBmdW5jdGlvbiAodGV4dCkge1xuICAgICAgICAgIHJldHVybiBjb250ZXh0MmQubWVhc3VyZVRleHQodGV4dCk7XG4gICAgICAgIH07XG4gICAgICAgIGluc3RhbmNlLmNvbnRhaW5zR2x5cGggPSBmdW5jdGlvbiAodGV4dCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLm1lYXN1cmVUZXh0KHRleHQpLndpZHRoICE9PSBiYXNlRm9udC5tZWFzdXJlVGV4dCh0ZXh0KS53aWR0aDtcbiAgICAgICAgfTtcbiAgICAgICAgaW5zdGFuY2UuY29udGFpbnNDb2RlUG9pbnQgPSBmdW5jdGlvbiAoY29kZVBvaW50KSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuY29udGFpbnNHbHlwaChTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGVQb2ludCkpO1xuICAgICAgICB9O1xuICAgICAgICBpbnN0YW5jZS5hbGxHbHlwaHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIGdseXBoLFxuICAgICAgICAgICAgICBnbHlwaHMgPSBbXTtcblxuICAgICAgICAgIGZvciAodmFyIGNvZGVQb2ludCA9IDMyOyBjb2RlUG9pbnQgPCA2NTUzNjsgY29kZVBvaW50KyspIHtcbiAgICAgICAgICAgIGdseXBoID0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlUG9pbnQpO1xuICAgICAgICAgICAgaWYgKHRoaXMuY29udGFpbnNHbHlwaChnbHlwaCkpIHtcbiAgICAgICAgICAgICAgZ2x5cGhzLnB1c2goZ2x5cGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZ2x5cGhzO1xuICAgICAgICB9O1xuXG4gICAgICAgIG5hbWVzQW5kSW5zdGFuY2VzW25hbWVdID0gaW5zdGFuY2U7XG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICAgIH1cbiAgICB9O1xuICB9O1xuXG4gIC8qKlxuICAgKiBHZXQgdGhlIG1ldHJpY3MgZm9yIHRoZSBnaXZlbiBnbHlwaCB1c2luZyB0aGUgcHJvdmlkZWQgYXJyYXkgb2YgRm9udHMuXG4gICAqIEBwYXJhbSBnbHlwaCBhIGdseXBoIHRvIHVzZSB3aGVuIGNhbGN1bGF0aW5nIHRoZSBmb250IHdpZHRoc1xuICAgKiBAcGFyYW0gZm9udHMgYW4gYXJyYXkgb2YgRm9udHNcbiAgICovXG4gIHZhciBfZ2x5cGhNZXRyaWNzV2l0aEZvbnRzID0gZnVuY3Rpb24gKGdseXBoLCBmb250cykge1xuICAgIHZhciB3aWR0aHMgPSBbXTtcbiAgICBmb3JFYWNoKGZvbnRzLCBmdW5jdGlvbiAoZm9udCkge1xuICAgICAgdmFyIGRvbmUgPSB0aGlzLmFzeW5jKCk7XG4gICAgICB3aWR0aHMucHVzaChmb250Lm1lYXN1cmVUZXh0KGdseXBoKSk7XG4gICAgICBkb25lKCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHdpZHRocztcbiAgfTtcblxuICAvKipcbiAgICogRGV0ZXJtaW5lIGlmIHRoZSB3aWR0aHMgb2YgdGhlIGdseXBoIGFyZVxuICAgKiBpZGVudGljYWwgZm9yIGFsbCB0aGUgcHJvdmlkZWQgRm9udHMuXG4gICAqIEBwYXJhbSBnbHlwaCBhIGdseXBoIHRvIHVzZSBpbiB0aGUgY29tcGFyaXNvblxuICAgKiBAcGFyYW0gZm9udHMgYW4gYXJyYXkgb2YgRm9udHMgdG8gY29tcGFyZVxuICAgKi9cbiAgdmFyIF9pc1dpZHRoRXF1YWxXaXRoR2x5cGhBbmRGb250cyA9IGZ1bmN0aW9uIChnbHlwaCwgZm9udHMpIHtcbiAgICByZXR1cm4gX2FycmF5VmFsdWVzQXJlRXF1YWwoX2dseXBoTWV0cmljc1dpdGhGb250cygzMiwgZm9udHMpLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgcmV0dXJuIGl0ZW0ud2lkdGg7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gSW5zdGFuY2UgdmFyaWFibGVzLlxuICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbiAgdmFyIGZvbnRGYWN0b3J5ID0gbmV3IEZvbnRGYWN0b3J5KCksXG4gICAgICAgICBiYXNlRm9udCA9IGZvbnRGYWN0b3J5LmZvbnRXaXRoTmFtZSgnQWRvYmVCbGFuaycpO1xuXG4gIC8qKlxuICAgKiBFeHBvc2UgdGhlIGZhY3RvcnkgbWV0aG9kLlxuICAgKi9cbiAgbW9kdWxlLmV4cG9ydHMuZm9udFdpdGhOYW1lID0gZm9udEZhY3RvcnkuZm9udFdpdGhOYW1lO1xuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmUgd2hldGhlciB0aGUgYnJvd3NlciBlbnZpcm9ubWVudCBoYXMgZ2x5cGhzIGZvciB0aGUgZ2l2ZW4gZm9udCBuYW1lLlxuICAgKiBAcGFyYW0gbmFtZSB0aGUgbmFtZSBvZiB0aGUgZm9udFxuICAgKiBAcmV0dXJuIHRydWUsIGlmIHRoZSBicm93c2VyIGVudmlyb25tZW50IGhhcyBnbHlwaHMgZm9yIHRoZSBnaXZlbiBmb250IG5hbWUuXG4gICAqL1xuICBtb2R1bGUuZXhwb3J0cy5oYXNGb250ID0gZnVuY3Rpb24gKG5hbWUpIHtcblxuICAgIC8vIENvbXBhcmUgb3VyIGJhc2UgZm9udCAoQWRvYmUgQmxhbmspIHdpdGggdGhlIGdpdmVuIGZvbnQgbmFtZS5cbiAgICB2YXIgZm9udHMgPSBbIGJhc2VGb250LCBmb250RmFjdG9yeS5mb250V2l0aE5hbWUoJ21vbm9zcGFjZScpLCBmb250RmFjdG9yeS5mb250V2l0aE5hbWUobmFtZSkgXTtcblxuICAgIC8vIEEgZm9udCBjb3VsZCBoYXZlIG9ubHkgb25lIGdseXBoIGF0IDB4MTksIGJ1dCB0aGUgcmVwZXJ0b2lyZVxuICAgIC8vIHN0YXJ0cyAoYnkgY29udmVudGlvbikgYXQgdGhlIFVuaWNvZGUgJ1NQQUNFJyAoaGV4IDB4MjAsIGRlY2ltYWwgMzIpLlxuICAgIGZvciAodmFyIGNvZGVQb2ludCA9IDMyOyBjb2RlUG9pbnQgPCA2NTUzNjsgY29kZVBvaW50KyspIHtcbiAgICAgIGlmICghX2lzV2lkdGhFcXVhbFdpdGhHbHlwaEFuZEZvbnRzKFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZVBvaW50KSwgZm9udHMpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICByZXR1cm4gZXhwb3J0cztcbn0ocmVxdWlyZSwgZXhwb3J0cywgbW9kdWxlKSk7XG4iXX0=
