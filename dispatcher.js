var fs           = require('fs');
var path         = require ('path');
var mime         = require ('mime');
var util         = require ('util');
var socketClient = require('./socketClient.js');

this.dispatch = function(request, response, connection, stream) {

	if (request.url == "/" || request.url == "/home") {
		viewPage('./public/index.html');
	} else {

		var parts = request.url.split('/');
		var action = parts[1];
		var argument = parts.slice(2, parts.length).join("/");

		switch(action){
			case 'resource':
				viewPage('./public/' + argument);
				break;
			case 'twitterQuery':
				request.on('data', function(data){
					var dataJson = jsonifyRequest(data.toString());
					socketClient.makeQuery(dataJson, response, request);
				});
				break;
			case 'pauseStream':
				pauseStream(response,connection,stream);
				break;	
			default:
				serverError(404, '404 Error: Resource not found.');
		}
	}

	function serverError(code, content) {
		response.writeHead(code,{'Content-Type': 'text/plain'});
		response.end(content);
	}

	function viewPage(filePath) {
		fs.exists(filePath, function(exists){
			if (exists){
				fs.readFile(filePath, function(err, data){
					if (err){
						serverError(404, "Resource not found.")
					} else {
						renderView(filePath, data);
					}
				}); 
			} else {
				serverError(404, "Resource not found.")
			}
		})
		function renderView(filePath, fileContents) {
			response.writeHead(200, {'Content-Type': mime.lookup(path.basename(filePath))});
			response.end(fileContents);
		}
	}

	function jsonifyRequest(request){
		var json = {};
		request.split("&").forEach(function(pair){
			pair = pair.split("=");
			json[pair[0]] = pair[1];
		});
		return json;
	}

	function pauseStream (response,connection,stream){
		if (connection != null && stream != null){
			if (stream){
				stream.destroy();
			}	
			connection.close();
			response.writeHead(200,{'Content-Type': 'text/plain; charset=UTF-8'});
			response.end("All connections closed.");
			console.log("Streaming paused.")
		}
	}
}