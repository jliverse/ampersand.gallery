var gulp     = require('gulp'),
    changed  = require('gulp-changed'),
    imagemin = require('gulp-imagemin'),
    rename   = require('gulp-rename');

var configuration = require('../configuration.js');

gulp.task('images', function() {

  gulp.src(configuration.source.root + '/favicon.png')
    .pipe(changed(configuration.target.root))
    .pipe(imagemin())
    .pipe(rename({ extname: '.ico' }))
    .pipe(gulp.dest(configuration.target.root));
  
  gulp.src(configuration.source.images + '/**')
    .pipe(changed(configuration.target.images))
    .pipe(imagemin())
    .pipe(gulp.dest(configuration.target.images));
});
