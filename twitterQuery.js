/*
// Twitter stream processing:
	-receive the JSON data from the user's form submission on input.html
	-form a call to T\twitter's steaming API from this data
	-return the data from twitter
	-process data for inferred mood of each tweet, at its geotagged location
	-return JSON object containing: { location: geotagged coordinates, color: mood-inferred color};
//
*/


// To execut this: First, set this page up as a client to query a secondary secondary server. 

var WebSocketClient = require('websocket').client;
var util = require('util');

this.makeQuery = function(data, response, request){

	response.writeHead(200,{'Content-Type': 'application/octet-stream'});

	console.log("The processing has successfully reached the twitterQuery.js function")
	console.log(data);
	console.log("\n");
	

	// The response was passed from the dispatcher. It comes from the asynchronous call
	// from the user -- Note that the websocket connection is nested inside this 
	// client-server relationship. 

	var client = new WebSocketClient();

 	client.on('connectFailed', function(error){
 		console.log('Connect error: ' + error.toString());
 		response.end();
 	});


 	client.on('connect', function(connection){

 		connection.on('message', function(message) {

 			console.log("From server: '"); 
 			console.log(message.utf8Data + "'");
 			console.log("\n");
 			console.log("Trying parse:");
 			console.log(JSON.parse(message.utf8Data));

			response.write(message.utf8Data);

 		});

 		connection.on('close',function(){
 			response.end();
 			console.log("The connection closed.")
 		})

		request.on('close', function(){
			console.log('The user aborted its request.')
			connection.close();
		});

 		function sendParameters(){
 			if (connection.connected){
 				console.log("Sending data: " + JSON.stringify(data));
	  			console.log("\n");			
 				connection.sendUTF(JSON.stringify(data)); 
 				// Uncomment below to kee calling function.
 				//setTimeout(sendParameters,1000);
 			}
 		};

 		sendParameters();

 	});

	client.connect('ws://localhost:8080/', 'echo-protocol', 'twitterQuery');


};
 
