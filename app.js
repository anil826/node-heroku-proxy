/*global process */
var cluster = require('cluster');
var express = require('express');
var jsforceAjaxProxy = require('jsforce-ajax-proxy');
var cors = require('cors');
var bodyParser = require('body-parser')
var { createProxyMiddleware } = require('http-proxy-middleware');

//Get white list form env varaiable
var whitelist = process.env.WHITE_LIST ? process.env.WHITE_LIST.split(",") : '';
//Set cros configuration
whitelist = whitelist || ['https://app.formyoula.com', 'https://survey.formyoula.com', 'https://beta.formyoula.com', 'https://eu.formyoula.com', 'https://formyoula-preproduction.herokuapp.com', 'https://formyoula-dev1.herokuapp.com'];
//Enable local testing
if ( process.env.ENABLE_LOCAL_TESTING ) {
  whitelist.push('http://localhost:8080');
}
//Create CORS logic
var corsOptions = {
  origin: function (origin, callback) {
    var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
    callback( originIsWhitelisted ? null : 'Bad Request', originIsWhitelisted );
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
  //Parse application/x-www-form-urlencoded
  // create application/json parser
  var jsonParser = bodyParser.json()
  // create application/x-www-form-urlencoded parser
  var urlencodedParser = bodyParser.urlencoded({ extended: false })
  //Set Port
  app.set('port', process.env.PORT || 3123);
  //Get proxy request
  app.all('/proxy/?*', cors(corsOptions), jsforceAjaxProxy({ enableCORS: true }));
  //Add proxy for api call other then salesforce
  app.use('/api/?*', cors(corsOptions), createProxyMiddleware({
    target: 'http://example.com', changeOrigin: true, 
    router : function(req) {
      //Get target form parameters with query string
      var newTarget = req.url.replace("/api/", "");
      return newTarget;
    },
   ignorePath: true,
   onError: function onError(err, req, res) {
      res.writeHead(500, {
        'Content-Type': 'text/plain'
      });
      res.end('Something went wrong. Please pass a valid URL with required parameters.');
    }
  }), jsonParser, urlencodedParser);
  
  //Parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: true, limit: '10mb', parameterLimit: 1000000}))


  // bind to a port and start server
  app.listen(app.get('port'), function () {
    console.log("Express server listening on port " + app.get('port'));
  });
}
