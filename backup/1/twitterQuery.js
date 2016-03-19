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

this.makeQuery = function(data){

	console.log("The processing has successfully reached the twitterQuery.js function")
	console.log(data);

	var client = new WebSocketClient();



 	client.on('connectFailed', function(error){
 		console.log('Connect error: ' + error.toString());
 	});



 	client.on('connect', function(connection){

 		console.log('Websocket Client Connected');


 		connection.on('error',function(error){
 			console.log("Connection error: " + error.toString());
 		});


 		connection.on('close', function () {
 			console.log("Connection closed.");
 		});


 		connection.on('message', function(message) {
 			if (message.type === 'utf8') {
 				console.log("Received: '" + message.utf8Data + "'")
 			}
 		});


 		function sendNumber(){
 			if (connection.connected) {
 				var number = Math.round(Math.random() * 0xFFFFFF);
 				connection.sendUTF(number.toString());
 				setTimeout(sendNumber,1000);
 			}
 		}

 		sendNumber();
 	});
	

	client.connect('ws://localhost:8080/', 'echo-protocol');


};
 
