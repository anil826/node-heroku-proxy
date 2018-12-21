/*global process */
var cluster = require('cluster');
var express = require('express');
var jsforceAjaxProxy = require('jsforce-ajax-proxy');
var cors = require('cors');

//Set cros configuration
var whitelist = ['https://app.formyoula.com', 'https://beta.formyoula.com', 'https://eu.formyoula.com', 'https://formyoula-preproduction.herokuapp.com', 'https://formyoula-dev1.herokuapp.com'];
var corsOptions = {
  origin: function (origin, callback) {
    var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
    callback(originIsWhitelisted ? null : 'Bad Request', originIsWhitelisted);
  }
};
if (cluster.isMaster) {
  var _cpus = process.argv[3] || require('os').cpus().length;
  // create a worker for each CPU
  for (var i = 0; i < _cpus; i += 1) {
      cluster.fork();
  }
  // When a worker dies create another one
  cluster.on('exit', function(worker) {
    console.log('worker ' + worker.id +  ' died');
    cluster.fork();
  });
} else {
  // Create a new Express application
  var app = express();
  //Set Port
  app.set('port', process.env.PORT || 3123);
  //Get proxy request
  app.all('/proxy/?*', cors(corsOptions), jsforceAjaxProxy({ enableCORS: true }));
  //Test APi
  app.get('/', function(req, res) {
    res.send('JSforce AJAX Proxy');
  });

  // bind to a port and start server
  app.listen(app.get('port'), function () {
    console.log("Express server listening on port " + app.get('port'));
  });
}
