var gulp   = require('gulp');

var configuration = require('../configuration.js');

gulp.task('copy', function() {
  gulp.src(configuration.source.root + '/assets/**')
    .pipe(gulp.dest(configuration.target.root + '/assets'));
});