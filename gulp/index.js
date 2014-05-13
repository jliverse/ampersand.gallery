var fs   = require('fs'),
    path = require('path');
    
var tasks = fs.readdirSync('./gulp/tasks/').filter(function(name) {
  return /\.js$/i.test(path.extname(name));
});

tasks.forEach(function(task) {
  require('./tasks/' + task);
});
