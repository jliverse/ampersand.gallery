var apollo     = require('apollo'),
    async      = require('async'),  
    california = require('california'),
    functions  = require('california-functions');

var forEach = require('async-foreach').forEach;

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
  var fontsTask = function(next) {

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
      next(null, [ 'Academy Engraved LET', 'Al Nile', 'American Typewriter',
        'Apple Color Emoji', 'Apple SD Gothic Neo', 'Arial',
        'Arial Hebrew', 'Arial Rounded MT Bold', 'Avenir',
        'Avenir Next', 'Avenir Next Condensed', 'Bangla Sangam MN',
        'Baskerville', 'Bodoni 72', 'Bodoni 72 Oldstyle',
        'Bodoni 72 Smallcaps', 'Bodoni Ornaments', 'Bradley Hand',
        'Chalkboard SE', 'Chalkduster', 'Cochin', 'Copperplate',
        'Courier', 'Courier New', 'DIN Alternate', 'DIN Condensed',
        'Damascus', 'Devanagari Sangam MN', 'Didot', 'Euphemia UCAS',
        'Farah', 'Futura', 'Geeza Pro', 'Georgia', 'Gill Sans',
        'Gujarati Sangam MN', 'Gurmukhi MN', 'Heiti SC', 'Heiti TC',
        'Helvetica', 'Helvetica Neue', 'Hiragino Kaku Gothic ProN',
        'Hiragino Mincho ProN', 'Hoefler Text', 'Iowan Old Style',
        'Kailasa', 'Kannada Sangam MN', 'Malayalam Sangam MN',
        'Marion', 'Marker Felt', 'Menlo', 'Mishafi', 'Noteworthy',
        'Optima', 'Oriya Sangam MN', 'Palatino', 'Papyrus',
        'Party LET', 'Savoye LET', 'Sinhala Sangam MN',
        'Snell Roundhand', 'Superclarendon', 'Symbol',
        'Tamil Sangam MN', 'Telugu Sangam MN', 'Thonburi',
        'Times New Roman', 'Trebuchet MS', 'Verdana', 'Zapf Dingbats',
        'Zapfino' ]);
    }
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
