var fs            = require('fs');
var path          = require('path');
var mime          = require('mime');
var util          = require('util');
var streamServlet = require('./streamServlet.js'); // streamServlet will handle requests for Twitter's public stream API.
var restServlet   = require('./restServlet.js'); // restServlet will will handle requests for Twitter's application-only REST API search.

// Check the address of a request, send it to the appropriate function. Like a forward controller, in an MVC design. 
this.dispatch = function(request, response, wordBank) { // Note: The wordBank is received here, to be sent to the servlets. 

	if (request.url == "/" || request.url == "/home") { // First, check if the user only wants to see the home page. If so, serve the home view.
		viewPage('./public/index.html');			    // If not, let the switch statement figure out where the request needs to go. 
	} else {											
		var parts = request.url.split('/'); // The next 3 lines pull out the action of the request -- "action" being the indicator of where to 
		var action = parts[1];				// send the request's data. "argument" contains any additional arguments that will define actions, wherever the query ends up. 
		var argument = parts.slice(2, parts.length).join("/");
		switch(action){ // The switch statement cases control the flow of non-home requests.
			case 'resource': // If the request is for a resource, call the openPage function, feed in the local path (./public/) plus the file name (argument).
				openPage('./public/' + argument); 
				break;
			case 'streamTweets': // Pull the data out from the request, convert it from a url-encoded string to JSON, pass it to streamServlet.makeQuery.
				request.on('data', function(data){
					var dataJson = jsonifyRequest(data.toString());
					streamServlet.makeQuery(dataJson, response, request, wordBank); // Connects to the Twitter public streaming API endpoint.
				});
				break;
			case 'getTweets': // Pull the data from the request, convert it from a url-encoded string to JSON, pass it to restServlet.makeQuery.
				request.on('data', function(data){			
					var dataJson = jsonifyRequest(data.toString()); 
					restServlet.makeQuery(dataJson, response, request, wordBank); // Queries Twitter, gets a batch of parameterized Tweets in reply.
				});
				break;				
			case 'pauseStream': // Cut off the current request. Note: requests to the Twitter streaming API are held open on Twitter's end until this is called.
				pauseStream();
				break;	
			default: // In case the request action doesn't match any of my cases, give a 404 error view. 
				serverError(404, '404 Error: Resource not found.');
		}
	}

	function serverError(code, content) { // A wrapper for serving an error view, will take any error code (like 404) and message.
		response.writeHead(code,{'Content-Type': 'text/plain'});
		response.end(content);
	}

	function openPage(filePath) { // Makes sure a file exists, has no error when it is read, and then renders a view. 
		fs.exists(filePath, function(exists){ // If a file exists, continue to read it; if not, show a 404 error. 
			if (exists){
				fs.readFile(filePath, function(err, data){ // If there is an error, show a 404 error.
					if (err){
						serverError(404, "Resource not found.")
					} else {
						useFile(filePath, data); // The file definitely exists and there was no error in reading it. Use it. 
					}
				}); 
			} else {
				serverError(404, "Resource not found.")
			}
		})
		function useFile(filePath, fileContents) {
			response.writeHead(200, {'Content-Type': mime.lookup(path.basename(filePath))}); // The mime.lookup grants flexibility, so any file can be passed through
			response.end(fileContents);														 // the preceding error checks, and will then have their contents read.
		}																					 // I use this both for HTML views and .js scripts. 
	}

	function jsonifyRequest(req){ // Take url-encodded key-value pairs (like 'pet=cat&name=Fluffy'), return a JSON object (json = {pet: 'cat', name: 'Fluffy'};)
		var json = {};
		req.split("&").forEach(function(pair){ // After the split, you'll have an array of key-value strings (['pet=cat', 'name=Fluffy'])
			pair = pair.split('='); // The forEach splits each key-value string by its '=' ('pet','cat')
			json[pair[0]] = pair[1]; // Dynamically allocate the key-value pair into a json object (json['pet'] = 'cat', on the first iteration.)
		});
		return json; // Return that fully-formed json object.
	}

	function pauseStream (){ // End the request that Twitter has been holding open. Respond with the appropriate message. 
		request.end();	
		response.writeHead(200,{'Content-Type': 'text/plain; charset=UTF-8'});
		response.end("All connections closed.");
		console.log("Streaming paused.")
	}
}