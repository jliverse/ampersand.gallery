var connect = require('connect'),
    gulp    = require("gulp"),
    http    = require('http');

var configuration  = require('../configuration.js');

gulp.task('serve', function () {
  var app = connect()
    .use(connect.logger('dev'))
    .use(connect.static(configuration.target.root));

  http.createServer(app).listen(configuration.port);
});
