
var util = require('util');
var http = require('http');
var url = require ('url');
var WebSocketServer = require('websocket').server;
var Twitter = require('ntwitter');

// Environment variables (twitter keys)
require('./env.js');

// Custom-built dispatcher
var Dispatcher = require('./dispatcher.js');
var TweetAnalyzer = require('./tweetAnalyzer.js');

var globalStream = null;
var globalConnection = null;


/* ================================================================================
	
	HTTP REQUEST SERVER: 

	- Handles requests from the client, sends them to a dispatcher function 
	  (called dispatcher.js)

	- Note: When a client requests the twitter data, the request enters the dis-
	  patcher, is reformatted into JSON, is passed into twitterQuery.js, and is
	  then used to establish a WebSocketClient to query the websocket server 
	  (defined below, in this file) using the user-defined parameters from the 
	  initial request. 

   ================================================================================= */

	console.log('Starting server @ localhost:3000/')

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
			globalStream.destroy();
			globalConnection.close();
		})
	});

	mainServer.listen(process.env.PORT || 3000 , function(){
		console.log('Server running at ' + process.env.PORT || 3000);
	});

/* ==================================================================================

	WEBSOCKET SERVER:

	- This server handles requests from the HTTP dispatcher to the twitter streaming 
	  API. 

   ================================================================================== */


	var twitterClient = new Twitter({
	  consumer_key: process.env.TWITTER_CONSUMER_KEY,
	  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
	  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
	  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
	});

	//console.log("Checking twitter client : ");
	//console.log(twitterClient);

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
	    autoAcceptConnections: false
	});


	function originIsAllowed(origin){
		if (origin == "twitterQuery"){
	   	 	return true;
	   	}
		return false;
	}

	socketServer.on('request', function(request){

	    if (!originIsAllowed(request.origin)){
	        request.reject();
	        console.log((new Date()) + 'Connection from origin ' + request.origin + ' rejected.')
	        return;
	    }

	    var connection = request.accept('echo-protocol', request.origin);
	    globalConnection = connection;
	    console.log((new Date()) + ' Connection accepted.');
	    
	    connection.on('message', function(message){

	        var params = JSON.parse(message.utf8Data);
	       
	        console.log('Received Message. Parameters are: ');
			console.log(params);
			console.log("\n");   

			// subject filter.
		    twitterClient.stream('statuses/filter', {track: params["subject"]}, function(stream){
			
			//location filter, bounding box around all of continental US.	
		    //twitterClient.stream('statuses/filter', {'locations' : '-124.47,24.0,-66.56,49.3843'}, function(stream){

				globalStream = stream;

				connection.on('close', function(){
					console.log('The connection was closed. Destroying twitter stream.')
					stream.destroy();
				})

				stream.on('data', function(tweet) {

						//console.log(stream);
						//console.log(tweet.place.bounding_box["coordinates"]);
					//	console.log("\n");
						//console.log(connection);
						//console.log("\n");

						var result = TweetAnalyzer.analyze(tweet, connection);
						
						console.log(result);

						connection.sendUTF(JSON.stringify(result));

				        //var mood = InferMood.infer(tweet.text);
				        //connection.sendUTF(mood);

				});

				stream.on('destroy', function(event){
					console.log("Stream destroyed.");
				})

				stream.on('error', function(error){
					console.log("oops! Error.")
					throw error;
				});	

 			});

	    });

	    connection.on('close', function(reasonCode, description) {
	    	globalStream.destroy();
	        console.log((new Date()) + ' Peer ' + connection.remoteAddress + " disconnected.");
 			console.log("\n");        
	    });
	});

