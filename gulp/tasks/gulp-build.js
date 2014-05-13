var gulp = require('gulp');

gulp.task('build', ['copy', 'uglify', 'html', 'browserify', 'sass', 'images']);
