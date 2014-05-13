var gulp       = require('gulp'),
    minifyHTML = require('gulp-minify-html');

var configuration = require('../configuration.js');

gulp.task('html', function() {
  gulp.src(configuration.source.root + '/*.html')
    .pipe(minifyHTML({  }))
    .pipe(gulp.dest(configuration.target.root));
});