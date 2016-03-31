
var util             = require('util');
var https            = require('https');
var http             = require('http');
var url              = require('url');
var fs               = require('fs');
var Dispatcher       = require('./dispatcher.js');
var TweetAnalyzer    = require('./tweetAnalyzer.js');
var globalStream     = null;
var globalConnection = null;
var wordBank         = {};
var WebSocketServer  = require('websocket').server;
var Twitter          = require('ntwitter');
var HttpsAgent       = require('agentkeepalive').HttpsAgent;

// Environment variables (twitter keys)
require('./env.js');

console.log('Starting server @ localhost:3000/')


/*................................. Main Server .................................*/

var mainServer = http.createServer(function (request, response){
	try {
		Dispatcher.dispatch(request, response, globalConnection, globalStream);
			} catch (err) {
		util.puts(err);
		response.writeHead(500);
		response.end('Internal Server Error');
	}
	request.on('close', function(){
		console.log('Client requested the streaming stop.')
		if (globalStream){
			globalStream.destroy();
		}
		globalConnection.close();
	})
}).listen(process.env.PORT || 3000 , function(){
	console.log('Server running at ' + process.env.PORT || 3000);
});

// Load the database of words, contained in a local file.		
mainServer.on('listening', function(){
	fs.readFile('./public/AFINN/JSON/MasterList.json','utf-8', function(err,data){
		if (err){
			throw err;
		}
		fileContents = JSON.parse(data);
		setWordBank();
		function setWordBank(){
			for (var key in fileContents){
				wordBank[key] = {};
				var list = fileContents[key];
				list.forEach(function(wordJson){
					wordBank[key][wordJson['word']] = wordJson['score'];
				})
			}
		}
	})
})
/*............ Twitter Init............*/

var agent = new HttpsAgent({
    maxSockets: 10,
    maxKeepAliveRequests: 0,
    maxKeepAliveTime: 240000000
});

var twitterClient = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});	

/*................................ Socket Server Init ................................*/

var handShakeServer = http.createServer(function(request, response) {
	console.log((new Date()) + ' Received request for ' + request.url);
	response.writeHead(404);
	response.end();
});

handShakeServer.listen(8080, function() {
	console.log((new Date()) + ' Socket server is listening on port 8080');
});

var socketServer = new WebSocketServer({
	httpServer: handShakeServer,
	autoAcceptConnections: false,
	keepalive: true,
	keepaliveInterval: 19000,
	keepaliveGracePeriod: 10000,
	dropConnectionOnKeepaliveTimeout: false	    
});

function originIsAllowed(origin){
	if (origin == "twitterQuery"){
   	 	return true;
   	}
	return false;
}

/*..........................Socket Server Request Handling ...........................*/

socketServer.on('request', function(request){

	console.log("REQUEST RECEIVED")

	if (!originIsAllowed(request.origin)){
        request.reject();
        console.log((new Date()) + 'Connection from origin ' + request.origin + ' rejected.')
        return;
    }

	var connection = request.accept('echo-protocol', request.origin);
	globalConnection = connection;
	
	console.log((new Date()) + ' Connection accepted.');

	connection.on('error', function(error){
	    console.log('Error: ' + error);
	})
	    
	connection.on('ping', function(data){
 		console.log('Server: ping received at: ' + (new Date()))		
	})

	connection.on('message', function(message){
		console.log(message);
		var params = JSON.parse(message.utf8Data);
		params.mode == 'GET' ? twitGet(params) : twitStream(params);			
	})

	connection.on('close', function(reasonCode, description) {
		if (globalStream){
    		globalStream.destroy();
    	}	
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + " disconnected.");
		console.log("\n");        
    });

	/*.............................Twitter HTTPS GET function ........................*/
	function twitGet(params){
		
		// Sample: '/1.1/search/tweets.json?q=DonaldTrump%20since%3A2016-03-25%20until%3A2016-03-28&count=3',
		var queryString = '/1.1/search/tweets.json?q=' + params.subject 
		                + '%20since%3A' + parseDate(params.start) 
		                + '%20until%3A' + parseDate(params.end)
		                + '&count=5';

		console.log("GET MODE")
		var options = {
			'path'	   : queryString,
			'hostname' : 'api.twitter.com',
			'method'   : 'GET',
			'headers'  : {'Authorization': ('Bearer ' + process.env.BEARER_ACCESS_TOKEN)},
			'agent'	   : agent,
			'port'     : 443,		
		};

		var req = new https.request(options, function(res){
			console.log("Request made at: " + (new Date()));

			var responseString = "";

			res.on('data', function(tweet){
				responseString += tweet;
			})

			res.on('end', function(){
				var twe = JSON.parse(responseString).statuses;
				for (var i = 0; i < twe.length; i++){
					(function intervalClosure(i){
						setTimeout(function(){
							var result = TweetAnalyzer.analyze(twe[i], wordBank);
							if (result){
								connection.sendUTF(JSON.stringify(result));
							}
						}, i * 1000);
					})(i);
				};	
			});

			res.on('error', function(error){
				console.log("Error in twitGet: " + error);
				throw error;
			})

		})
		req.end();

		function parseDate(date){
			date = date.split('%2F');
			return (date[2] + '-' + checkSingle(date[0]) + '-' + checkSingle(date[1]));
			function checkSingle(digit){
				if (Number(date[0])){
					digit = '0' + digit;
				}
				return digit;
			}
		}			
	}

	/*.....................Twitter Stream function.................*/
	function twitStream(params){

		console.log("STREAMING MODE")
		twitterClient.stream('statuses/filter', {track: params["subject"]}, function(stream){

			globalStream = stream;

			connection.on('close', function(){
				console.log('The connection was closed. Destroying twitter stream.')
				stream.destroy();
			})

			stream.on('data', function(tweet) {
				var result = TweetAnalyzer.analyze(tweet, wordBank);
				if (result){
					connection.sendUTF(JSON.stringify(result));
				}
			});

			stream.on('destroy', function(event){
				console.log("Stream destroyed.");
			})

			stream.on('error', function(error){
				console.log("oops! Error.")
				throw error;
			});	

	 	});
	}	
})



