var path = require('path');

module.exports = {
  port: '8000',
  source: {
    root: path.resolve('./app'),
    images: path.resolve('./app/images'),
    styles: path.resolve('./app/styles'),
    scripts: path.resolve('./app/scripts'),
  },
  vendor: {
    scripts: path.resolve('./vendor/scripts'),
  },
  test: {
    source: path.resolve('./test/'),
    target: path.resolve('./build/')
  },
  target: {
    root: path.resolve('./public/'),
    images: path.resolve('./app/img'),
    styles: path.resolve('./public/css'),
    scripts: path.resolve('./public/js'),
  }
};
