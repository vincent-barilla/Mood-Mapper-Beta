var fs            = require('fs');
var path          = require('path');
var mime          = require('mime');
var util          = require('util');
var streamServlet = require('./streamServlet.js');
var restServlet   = require('./restServlet.js');

this.dispatch = function(request, response, stream, wordBank) {

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
			case 'streamTweets':
				request.on('data', function(data){
					var dataJson = jsonifyRequest(data.toString());
					streamServlet.makeQuery(dataJson, response, request, stream, wordBank);
				});
				break;
			case 'getTweets':
				request.on('data', function(data){			
					var dataJson = jsonifyRequest(data.toString());
					restServlet.makeQuery(dataJson, response, request, wordBank);
				});
				break;				
			case 'pauseStream':
				pauseStream();
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

	function jsonifyRequest(req){
		var json = {};
		req.split("&").forEach(function(pair){
			pair = pair.split("=");
			json[pair[0]] = pair[1];
		});
		return json;
	}

	function pauseStream (){
		if (stream){
			request.end();	
			response.writeHead(200,{'Content-Type': 'text/plain; charset=UTF-8'});
			response.end("All connections closed.");
			console.log("Streaming paused.")
		}
	}
}