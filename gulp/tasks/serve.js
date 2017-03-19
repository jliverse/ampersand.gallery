var connect = require('connect'),
    gulp    = require('gulp'),
    http    = require('http'),
    serveStatic  = require('serve-static'),
    morgan  = require('morgan');

var configuration  = require('../configuration.js');

gulp.task('serve', function () {
  var app = connect()
    .use(morgan('dev'))
    .use(serveStatic(configuration.target.root));

  http.createServer(app).listen(configuration.port);
});
