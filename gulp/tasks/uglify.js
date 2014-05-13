var gulp   = require('gulp'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify');

var configuration = require('../configuration.js');

gulp.task('uglify', function() {
  gulp.src(configuration.vendor.scripts + '/*.js')
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(gulp.dest(configuration.target.scripts));
});