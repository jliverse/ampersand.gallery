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