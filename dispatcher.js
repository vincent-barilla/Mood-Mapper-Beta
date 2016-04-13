var fs   = require('fs');
var path = require('path');
var mime = require('mime');
var util = require('util');
// The next two custom modules will handle the streaming and RESTful requests to Twitter. 
var streamServlet = require('./streamServlet.js'); 
var restServlet   = require('./restServlet.js'); 

// Check the address of a request, send it to the appropriate function. Like a forward controller in an MVC design. 
this.dispatch = function(request, response, wordBank){
	// First, check if the user only wants to see the home page. If so, serve the home view. If not, 
	// let the switch statement below figure out where the request needs to go. 
	if (request.url == "/" || request.url == "/home") { 
		openFile('./public/index.html');			   
	} else {			
		// Initialize this to receive data from the user in ajax requests below. 
		var dataJson;
		// The next 3 lines pull out the action of the request -- "action" being where to send the request's data. 
		// "argument" contains the requests's parameters.						
		var parts = request.url.split('/'); 
		var action = parts[1];
		// Take everything left in "parts" after "action", put it back into "/folder/file" format.				
		var argument = parts.slice(2, parts.length).join('/');
		// The switch statement cases control the flow of non-home requests.
		switch(action){
			// If the request is for a resource, call the openFile function, feed in the local path 
			// ("./public/") plus the file name ("argument").
			case 'resource': 
				openFile('./public/' + argument); 
				break;
			// Pull the data out from the request, convert it from a url-encoded string to JSON, and pass it
			// to "streamServlet.query" to connect to Twitter Public Streaming API.
			case 'streamTweets': 
				request.on('data', function(data){
					dataJson = jsonifyRequest(data.toString());
					streamServlet.query(dataJson, response, request, wordBank); 
				});
				break;
			// Pull the data from the request, convert it from a url-encoded string to JSON, pass it to "restServlet.query" to 
			// form a Twitter GET request.
			case 'getTweets':
				request.on('data', function(data){			
					dataJson = jsonifyRequest(data.toString()); 
					restServlet.query(dataJson, response, request, wordBank);
				});
				break;
			// Cut off the current streaming request. Requests to the Twitter streaming API are held open on 
			// Twitter's end until this is called. 
			case 'pauseStream': 
				streamServlet.kill(response);
				break;
			// In case the request action doesn't match any of my cases, give a 404 error view.	                           
			default:  
				serverError(404, '404 Error: Resource not found.');
		}
	}
	
	// A wrapper for serving an error view, will take any error code (like 404) and error message.
	function serverError(code, content) { 
		response.writeHead(code,{'Content-Type': 'text/plain'});
		response.end(content);
	}

	// Makes sure a file exists, has no error, then writes the file back to the front end.
	function openFile(filePath) { 
		fs.exists(filePath, function(exists){ 
			if (exists){
				fs.readFile(filePath, function(err, data){
					if (err){
						serverError(404, "Resource not found.")
					} else {
						// The mime.lookup grants flexibility, so any file format can be read. 
						// I use this both for HTML-based views and .js scripts.						
						response.writeHead(200, {'Content-Type': mime.lookup(path.basename(filePath))}); 
						response.end(data);	
					}
				}); 
			} else {
				serverError(404, "Resource not found.")
			}
		})																				
	}

 	// Take url-encodded key-value pairs (like 'pet=cat&name=Fluffy'), return a JSON object (like
 	// json = {pet: 'cat', name: 'Fluffy'})
	function jsonifyRequest(req){
		var json = {};
		// Split the original string around "&" to break up each key-value pair, then loop through and separate key from value.
		req.split("&").forEach(function(pair){ 
			pair = pair.split('='); 
			json[pair[0]] = pair[1]; 
		});
		return json; 
	}
}