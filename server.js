
var util = require('util');
var http = require('http');
var url = require ('url');
var WebSocketServer = require('websocket').server;
var Twitter = require('twitter');

// Environment variables (twitter keys)
require('./env.js');

// Custom-built dispatcher
var dispatcher = require('./dispatcher.js');



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
		// Wrapping server functionality in try/catch
		try {
			dispatcher.dispatch(request, response);
		} catch (err) {
			util.puts(err);
			response.writeHead(500);
			response.end('Internal Server Error');
		}
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
	    return true;
	}


	socketServer.on('request', function(request){

	    if (!originIsAllowed(request.origin)){
	        request.reject();
	        console.log((new Date()) + 'Connection from origin ' + request.origin + ' rejected.')
	        return;
	    }

	    var connection = request.accept('echo-protocol', request.origin);

	    console.log((new Date()) + ' Connection accepted.');
	    
	    connection.on('message', function(message){


	        var params = JSON.parse(message.utf8Data);
	       
	        console.log('Received Message. Parameters are: ');
			console.log(params);
			console.log("\n");   

		    twitterClient.stream('statuses/filter', {track: params["subject"]}, function(stream){
				
				stream.on('data', function(tweet) {
			        connection.sendUTF(tweet.text);

				});

				stream.on('error', function(error){
					console.log("oops! Error.")
					throw error;
				});	

 			});

	    });

	    connection.on('close', function(reasonCode, description) {
	        console.log((new Date()) + ' Peer ' + connection.remoteAddress + " disconnected.");
 			console.log("\n");        
	    });
	});

/* ==================================================================================

	TWITTER PUBLIC STREAMING API CONNECTIVITY: 

	- This server handles requests from the HTTP dispatcher to the twitter streaming 
	  API. 

   ================================================================================== */

/*
   var twitterClient = new Twitter({
   	consumer_key : process.env.TWITTER_CONSUMER_KEY,
   	consumer_secret : process.env.TWITTEr_CONSUMER_SECRET,
   	access_token_key : process.env.TWITTER_ACCESS_TOKEN_KEY,
   	access_toke_secret : process.env.TWITTER_ACCESS_TOKEN_SECRET
   });

   twitterClient.stream('statuses/filter', {track: 'DonaldTrump'}, function(data){
		
		stream.on('data',function(tweet) {
			console.log(tweet.text);
		});

		stream.on('error', function(error){
			console.log("oops! Error.")
			throw error;
		});		
   });
*/

