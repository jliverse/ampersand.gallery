var path = require('path');

var browserify    = require('browserify'),
    gulp          = require('gulp'),
    phantomJS     = require('gulp-mocha-phantomjs'),
    livereload    = require('gulp-livereload'),
    rename        = require('gulp-rename'),
    replaceStream = require('replacestream'),
    streamify     = require('gulp-streamify'),
    uglify        = require('gulp-uglify'),
    source        = require('vinyl-source-stream');

var configuration = require('../configuration.js');

gulp.task('browserify-tests', function() {
    browserify({
      extensions: [ '.js' ],
      debug: true,
      cache: {},
      packageCache: {},
      fullPaths: false,
      entries: configuration.test.source + '/test-phantomjs.js',
    })
    .bundle()
    .pipe(replaceStream(path.resolve('.'), ''))
    .pipe(source('test-phantomjs.js'))
    .pipe(gulp.dest(configuration.test.target));

  gulp.src(configuration.test.source + '/test-phantomjs.html')
    .pipe(gulp.dest(configuration.test.target))
    .pipe(phantomJS());

});
