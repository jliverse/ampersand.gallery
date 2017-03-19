var path = require('path');

var browserify    = require('browserify'),
    gulp          = require('gulp'),
    livereload    = require('gulp-livereload'),
    rename        = require('gulp-rename'),
    replaceStream = require('replacestream'),
    streamify     = require('gulp-streamify'),
    uglify        = require('gulp-uglify'),
    source        = require('vinyl-source-stream');

var configuration = require('../configuration.js');

gulp.task('browserify', function() {

    var name = 'app';

    return browserify({
          extensions: [ '.js' ],
          debug: true,
          cache: {},
          packageCache: {},
          fullPaths: false,
          entries: configuration.source.scripts + '/app.js',
        }).bundle()
        // Browserify (insert-module-globals, really) includes the current
        // path in all output. Replace the unique path with a placeholder.
        .pipe(replaceStream(path.resolve('.'), ''))

        // Combine...
        .pipe(source(name + '.js'))
        .pipe(gulp.dest(configuration.target.scripts))

        // ... and minify...
        .pipe(streamify(uglify()))
        .pipe(rename({ extname: '.min.js' }))
        .pipe(gulp.dest(configuration.target.scripts))

        // ... and watch for changes.
        // .pipe(livereload());
});
