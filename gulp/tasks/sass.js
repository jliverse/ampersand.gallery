var gulp       = require('gulp'),
    prefix     = require('gulp-autoprefixer'),
    minifyCss  = require('gulp-minify-css'),
    notify     = require('gulp-notify'),
    rename     = require('gulp-rename'),
    sass       = require('gulp-sass');


var configuration = require('../configuration.js');

gulp.task('sass', function () {
  return gulp.src(configuration.source.styles + '/*.scss')
          .pipe(sass())
          .pipe(prefix('last 2 versions', 'BlackBerry 10', 'Android 4', { cascade: false }))
          .pipe(gulp.dest(configuration.target.styles))
          .pipe(rename({ extname: '.min.css' }))
          .pipe(minifyCss({ noAdvanced: false }))
          .pipe(gulp.dest(configuration.target.styles));
});
