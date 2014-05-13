var gulp       = require('gulp');
var livereload = require('gulp-livereload');

var configuration  = require('../configuration.js');

gulp.task('watch', function() {
  var server = livereload();

  var reload = function(file) {
    server.changed(file.path);
  };

  gulp.watch(configuration.vendor.scripts + '/**', ['uglify']);
  gulp.watch(configuration.source.root + '/assets/**', ['copy']);
  gulp.watch(configuration.source.root + '/*.html', ['html']);
  gulp.watch(configuration.source.scripts + '/**', ['browserify']);
  gulp.watch(configuration.source.styles + '/**', ['sass']);
  gulp.watch(configuration.source.images + '/**', ['images']);
  gulp.watch([configuration.target.root + '/**']).on('change', reload);
});
