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

gulp.task('test', function() {
  browserify(configuration.test.source + '/test.js').bundle()
    .pipe(gulp.dest(configuration.test.target));

  gulp.src(configuration.test.source + '/test.html')
    .pipe(gulp.dest(configuration.test.target))
    .pipe(phantomJS());

});
