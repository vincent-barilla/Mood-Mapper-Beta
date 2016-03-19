var fs = require('fs');
var path = require ('path');
var mime = require ('mime');
var util = require ('util');

var twitterQuery = require('./twitterQuery.js');

var actions = {
	'twitterQuery' : twitterQuery.makeQuery
};


function jsonifyRequest(request){
	var json = {};
	request.split("&").forEach(function(pair){
		pair = pair.split("=");
		json[pair[0]] = pair[1];
	});
	return json;
}


this.dispatch = function(request, response) {

	var serverError = function(code, content) {
		response.writeHead(code,{'Content-Type': 'text/plain'});
		response.end(content);
	};

	var sendPage = function(filePath, fileContents) {
		response.writeHead(200, {'Content-Type': mime.lookup(path.basename(filePath))});
		response.end(fileContents);
	};

	var sendFile = function(filePath) {
		fs.exists(filePath, function(exists){
			if (exists){
				fs.readFile(filePath, function(err, data){
					if (err){
						serverError(404, "Resource not found.")
					} else {
						sendPage(filePath, data);
					}
				}); 
			} else {
				serverError(404, "Resource not found.")
			}
		})
	};

	if (request.url == "/" || request.url == "/home") {

		sendFile('./public/index.html');

	} else {

		var parts = request.url.split('/');
		var action = parts[1];
		var argument = parts.slice(2, parts.length).join("/");

		if (action == "resource"){

			sendFile('./public/' + argument);

		} else if (typeof actions[action] == 'function') {

			var body = '';

			request.on('data', function(data){

				body += data;
				var newBody = jsonifyRequest(body);
				var content = actions[action](newBody,response);
				
				//response.writeHead(200,{'Content-Type': 'application/json'});
				//response.end(JSON.stringify(newBody));
				console.log("Flag2: The asynch response has executed.");

			});

			//verifyFile(content);
		} else {

			serverError(404, '404 Error: Resource not found.');

		}
	}
}