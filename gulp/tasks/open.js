var gulp   = require('gulp'),
    launch = require('gulp-open');

var config = require('../configuration.js');

gulp.task('open', ['build'], function () {

  var options = {
    url: 'http://localhost:' + config.port,
    app: 'google chrome'
  };

  return gulp.src(config.target.root + '/index.html').pipe(launch('', options));
});
