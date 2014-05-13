var gulp = require('gulp'),
    rev  = require('gulp-rev');

var configuration = require('../configuration.js');

gulp.task('cdn', function () {
  return gulp.src([
      configuration.target.styles + '/*.min.css',
      configuration.target.scripts + '/*.min.js'])
    .pipe(rev())
    .pipe(gulp.dest(configuration.target.root + '/cdn'));
});