var webSocketClient = require('websocket').client;
var util 			= require('util');

this.makeQuery = function(data, response, request){


	response.writeHead(200,{'Content-Type': 'application/octet-stream'});

	var client = new webSocketClient();

 	client.on('connectFailed', function(error){
 		console.log('Connect error: ' + error.toString());
 		response.end();
 	});

 	client.on('connect', function(connection){

 		connection.on('message', function(message) {
 			console.log("From server: '"); 
 			console.log(message.utf8Data + "'");
 			console.log("\n");
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
 			}
 		};


 		setInterval(function(){
 			if (connection.connected){
 				connection.ping();
 			}
 		}, 19900)

 		connection.on('pong', function(){
 			console.log('Client: pong received at: ' + (new Date()) + '\n')
 		})

		connection.on('ping', function(){
			console.log('Server just sent a keepalive ping.')
		})
 		sendParameters();	
 		
 	});

	client.connect('ws://localhost:8080/', 'echo-protocol', 'twitterQuery');
};




 
