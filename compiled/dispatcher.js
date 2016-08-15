'use strict';

var fs = require('fs');
var path = require('path');
var mime = require('mime');
var util = require('util');
// The next two custom modules will handle the streaming and RESTful requests to Twitter. 
var streamServlet = require('./streamServlet.js');
var restServlet = require('./restServlet.js');

// Check the address of a request, send it to the appropriate function. Like a forward controller in an MVC design. 
undefined.dispatch = function (request, response, wordBank) {
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
		switch (action) {
			// If the request is for a resource, call the openFile function, feed in the local path 
			// ("./public/") plus the file name ("argument").
			case 'resource':
				openFile('./public/' + argument);
				break;
			// Pull the data out from the request, convert it from a url-encoded string to JSON, and pass it
			// to "streamServlet.query" to connect to Twitter Public Streaming API.
			case 'streamTweets':
				request.on('data', function (data) {
					dataJson = jsonifyRequest(data.toString());
					streamServlet.query(dataJson, response, request, wordBank);
				});
				break;
			// Pull the data from the request, convert it from a url-encoded string to JSON, pass it to "restServlet.query" to 
			// form a Twitter GET request.
			case 'getTweets':
				request.on('data', function (data) {
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
		response.writeHead(code, { 'Content-Type': 'text/plain' });
		response.end(content);
	}

	// Makes sure a file exists, has no error, then writes the file back to the front end.
	function openFile(filePath) {
		fs.exists(filePath, function (exists) {
			if (exists) {
				fs.readFile(filePath, function (err, data) {
					if (err) {
						serverError(404, "Resource not found.");
					} else {
						// The mime.lookup grants flexibility, so any file format can be read. 
						// I use this both for HTML-based views and .js scripts.						
						response.writeHead(200, { 'Content-Type': mime.lookup(path.basename(filePath)) });
						response.end(data);
					}
				});
			} else {
				serverError(404, "Resource not found.");
			}
		});
	}

	// Take url-encodded key-value pairs (like 'pet=cat&name=Fluffy'), return a JSON object (like
	// json = {pet: 'cat', name: 'Fluffy'})
	function jsonifyRequest(req) {
		var json = {};
		// Split the original string around "&" to break up each key-value pair, then loop through and separate key from value.
		req.split("&").forEach(function (pair) {
			pair = pair.split('=');
			json[pair[0]] = pair[1];
		});
		return json;
	}
};
//# sourceMappingURL=data:application/json;base64,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QXhCLEVBQTRCO0FBQzNCLE1BQUksT0FBTyxFQUFYO0FBQ0E7QUFDQSxNQUFJLEtBQUosQ0FBVSxHQUFWLEVBQWUsT0FBZixDQUF1QixVQUFTLElBQVQsRUFBYztBQUNwQyxVQUFPLEtBQUssS0FBTCxDQUFXLEdBQVgsQ0FBUDtBQUNBLFFBQUssS0FBSyxDQUFMLENBQUwsSUFBZ0IsS0FBSyxDQUFMLENBQWhCO0FBQ0EsR0FIRDtBQUlBLFNBQU8sSUFBUDtBQUNBO0FBQ0QsQ0FyRkQiLCJmaWxlIjoiZGlzcGF0Y2hlci5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBmcyAgID0gcmVxdWlyZSgnZnMnKTtcbnZhciBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xudmFyIG1pbWUgPSByZXF1aXJlKCdtaW1lJyk7XG52YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcbi8vIFRoZSBuZXh0IHR3byBjdXN0b20gbW9kdWxlcyB3aWxsIGhhbmRsZSB0aGUgc3RyZWFtaW5nIGFuZCBSRVNUZnVsIHJlcXVlc3RzIHRvIFR3aXR0ZXIuIFxudmFyIHN0cmVhbVNlcnZsZXQgPSByZXF1aXJlKCcuL3N0cmVhbVNlcnZsZXQuanMnKTsgXG52YXIgcmVzdFNlcnZsZXQgICA9IHJlcXVpcmUoJy4vcmVzdFNlcnZsZXQuanMnKTsgXG5cbi8vIENoZWNrIHRoZSBhZGRyZXNzIG9mIGEgcmVxdWVzdCwgc2VuZCBpdCB0byB0aGUgYXBwcm9wcmlhdGUgZnVuY3Rpb24uIExpa2UgYSBmb3J3YXJkIGNvbnRyb2xsZXIgaW4gYW4gTVZDIGRlc2lnbi4gXG50aGlzLmRpc3BhdGNoID0gZnVuY3Rpb24ocmVxdWVzdCwgcmVzcG9uc2UsIHdvcmRCYW5rKXtcblx0Ly8gRmlyc3QsIGNoZWNrIGlmIHRoZSB1c2VyIG9ubHkgd2FudHMgdG8gc2VlIHRoZSBob21lIHBhZ2UuIElmIHNvLCBzZXJ2ZSB0aGUgaG9tZSB2aWV3LiBJZiBub3QsIFxuXHQvLyBsZXQgdGhlIHN3aXRjaCBzdGF0ZW1lbnQgYmVsb3cgZmlndXJlIG91dCB3aGVyZSB0aGUgcmVxdWVzdCBuZWVkcyB0byBnby4gXG5cdGlmIChyZXF1ZXN0LnVybCA9PSBcIi9cIiB8fCByZXF1ZXN0LnVybCA9PSBcIi9ob21lXCIpIHsgXG5cdFx0b3BlbkZpbGUoJy4vcHVibGljL2luZGV4Lmh0bWwnKTtcdFx0XHQgICBcblx0fSBlbHNlIHtcdFx0XHRcblx0XHQvLyBJbml0aWFsaXplIHRoaXMgdG8gcmVjZWl2ZSBkYXRhIGZyb20gdGhlIHVzZXIgaW4gYWpheCByZXF1ZXN0cyBiZWxvdy4gXG5cdFx0dmFyIGRhdGFKc29uO1xuXHRcdC8vIFRoZSBuZXh0IDMgbGluZXMgcHVsbCBvdXQgdGhlIGFjdGlvbiBvZiB0aGUgcmVxdWVzdCAtLSBcImFjdGlvblwiIGJlaW5nIHdoZXJlIHRvIHNlbmQgdGhlIHJlcXVlc3QncyBkYXRhLiBcblx0XHQvLyBcImFyZ3VtZW50XCIgY29udGFpbnMgdGhlIHJlcXVlc3RzJ3MgcGFyYW1ldGVycy5cdFx0XHRcdFx0XHRcblx0XHR2YXIgcGFydHMgPSByZXF1ZXN0LnVybC5zcGxpdCgnLycpOyBcblx0XHR2YXIgYWN0aW9uID0gcGFydHNbMV07XG5cdFx0Ly8gVGFrZSBldmVyeXRoaW5nIGxlZnQgaW4gXCJwYXJ0c1wiIGFmdGVyIFwiYWN0aW9uXCIsIHB1dCBpdCBiYWNrIGludG8gXCIvZm9sZGVyL2ZpbGVcIiBmb3JtYXQuXHRcdFx0XHRcblx0XHR2YXIgYXJndW1lbnQgPSBwYXJ0cy5zbGljZSgyLCBwYXJ0cy5sZW5ndGgpLmpvaW4oJy8nKTtcblx0XHQvLyBUaGUgc3dpdGNoIHN0YXRlbWVudCBjYXNlcyBjb250cm9sIHRoZSBmbG93IG9mIG5vbi1ob21lIHJlcXVlc3RzLlxuXHRcdHN3aXRjaChhY3Rpb24pe1xuXHRcdFx0Ly8gSWYgdGhlIHJlcXVlc3QgaXMgZm9yIGEgcmVzb3VyY2UsIGNhbGwgdGhlIG9wZW5GaWxlIGZ1bmN0aW9uLCBmZWVkIGluIHRoZSBsb2NhbCBwYXRoIFxuXHRcdFx0Ly8gKFwiLi9wdWJsaWMvXCIpIHBsdXMgdGhlIGZpbGUgbmFtZSAoXCJhcmd1bWVudFwiKS5cblx0XHRcdGNhc2UgJ3Jlc291cmNlJzogXG5cdFx0XHRcdG9wZW5GaWxlKCcuL3B1YmxpYy8nICsgYXJndW1lbnQpOyBcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHQvLyBQdWxsIHRoZSBkYXRhIG91dCBmcm9tIHRoZSByZXF1ZXN0LCBjb252ZXJ0IGl0IGZyb20gYSB1cmwtZW5jb2RlZCBzdHJpbmcgdG8gSlNPTiwgYW5kIHBhc3MgaXRcblx0XHRcdC8vIHRvIFwic3RyZWFtU2VydmxldC5xdWVyeVwiIHRvIGNvbm5lY3QgdG8gVHdpdHRlciBQdWJsaWMgU3RyZWFtaW5nIEFQSS5cblx0XHRcdGNhc2UgJ3N0cmVhbVR3ZWV0cyc6IFxuXHRcdFx0XHRyZXF1ZXN0Lm9uKCdkYXRhJywgZnVuY3Rpb24oZGF0YSl7XG5cdFx0XHRcdFx0ZGF0YUpzb24gPSBqc29uaWZ5UmVxdWVzdChkYXRhLnRvU3RyaW5nKCkpO1xuXHRcdFx0XHRcdHN0cmVhbVNlcnZsZXQucXVlcnkoZGF0YUpzb24sIHJlc3BvbnNlLCByZXF1ZXN0LCB3b3JkQmFuayk7IFxuXHRcdFx0XHR9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHQvLyBQdWxsIHRoZSBkYXRhIGZyb20gdGhlIHJlcXVlc3QsIGNvbnZlcnQgaXQgZnJvbSBhIHVybC1lbmNvZGVkIHN0cmluZyB0byBKU09OLCBwYXNzIGl0IHRvIFwicmVzdFNlcnZsZXQucXVlcnlcIiB0byBcblx0XHRcdC8vIGZvcm0gYSBUd2l0dGVyIEdFVCByZXF1ZXN0LlxuXHRcdFx0Y2FzZSAnZ2V0VHdlZXRzJzpcblx0XHRcdFx0cmVxdWVzdC5vbignZGF0YScsIGZ1bmN0aW9uKGRhdGEpe1x0XHRcdFxuXHRcdFx0XHRcdGRhdGFKc29uID0ganNvbmlmeVJlcXVlc3QoZGF0YS50b1N0cmluZygpKTsgXG5cdFx0XHRcdFx0cmVzdFNlcnZsZXQucXVlcnkoZGF0YUpzb24sIHJlc3BvbnNlLCByZXF1ZXN0LCB3b3JkQmFuayk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdC8vIEN1dCBvZmYgdGhlIGN1cnJlbnQgc3RyZWFtaW5nIHJlcXVlc3QuIFJlcXVlc3RzIHRvIHRoZSBUd2l0dGVyIHN0cmVhbWluZyBBUEkgYXJlIGhlbGQgb3BlbiBvbiBcblx0XHRcdC8vIFR3aXR0ZXIncyBlbmQgdW50aWwgdGhpcyBpcyBjYWxsZWQuIFxuXHRcdFx0Y2FzZSAncGF1c2VTdHJlYW0nOiBcblx0XHRcdFx0c3RyZWFtU2VydmxldC5raWxsKHJlc3BvbnNlKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHQvLyBJbiBjYXNlIHRoZSByZXF1ZXN0IGFjdGlvbiBkb2Vzbid0IG1hdGNoIGFueSBvZiBteSBjYXNlcywgZ2l2ZSBhIDQwNCBlcnJvciB2aWV3Llx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5cdFx0XHRkZWZhdWx0OiAgXG5cdFx0XHRcdHNlcnZlckVycm9yKDQwNCwgJzQwNCBFcnJvcjogUmVzb3VyY2Ugbm90IGZvdW5kLicpO1xuXHRcdH1cblx0fVxuXHRcblx0Ly8gQSB3cmFwcGVyIGZvciBzZXJ2aW5nIGFuIGVycm9yIHZpZXcsIHdpbGwgdGFrZSBhbnkgZXJyb3IgY29kZSAobGlrZSA0MDQpIGFuZCBlcnJvciBtZXNzYWdlLlxuXHRmdW5jdGlvbiBzZXJ2ZXJFcnJvcihjb2RlLCBjb250ZW50KSB7IFxuXHRcdHJlc3BvbnNlLndyaXRlSGVhZChjb2RlLHsnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW4nfSk7XG5cdFx0cmVzcG9uc2UuZW5kKGNvbnRlbnQpO1xuXHR9XG5cblx0Ly8gTWFrZXMgc3VyZSBhIGZpbGUgZXhpc3RzLCBoYXMgbm8gZXJyb3IsIHRoZW4gd3JpdGVzIHRoZSBmaWxlIGJhY2sgdG8gdGhlIGZyb250IGVuZC5cblx0ZnVuY3Rpb24gb3BlbkZpbGUoZmlsZVBhdGgpIHsgXG5cdFx0ZnMuZXhpc3RzKGZpbGVQYXRoLCBmdW5jdGlvbihleGlzdHMpeyBcblx0XHRcdGlmIChleGlzdHMpe1xuXHRcdFx0XHRmcy5yZWFkRmlsZShmaWxlUGF0aCwgZnVuY3Rpb24oZXJyLCBkYXRhKXtcblx0XHRcdFx0XHRpZiAoZXJyKXtcblx0XHRcdFx0XHRcdHNlcnZlckVycm9yKDQwNCwgXCJSZXNvdXJjZSBub3QgZm91bmQuXCIpXG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdC8vIFRoZSBtaW1lLmxvb2t1cCBncmFudHMgZmxleGliaWxpdHksIHNvIGFueSBmaWxlIGZvcm1hdCBjYW4gYmUgcmVhZC4gXG5cdFx0XHRcdFx0XHQvLyBJIHVzZSB0aGlzIGJvdGggZm9yIEhUTUwtYmFzZWQgdmlld3MgYW5kIC5qcyBzY3JpcHRzLlx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0cmVzcG9uc2Uud3JpdGVIZWFkKDIwMCwgeydDb250ZW50LVR5cGUnOiBtaW1lLmxvb2t1cChwYXRoLmJhc2VuYW1lKGZpbGVQYXRoKSl9KTsgXG5cdFx0XHRcdFx0XHRyZXNwb25zZS5lbmQoZGF0YSk7XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pOyBcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHNlcnZlckVycm9yKDQwNCwgXCJSZXNvdXJjZSBub3QgZm91bmQuXCIpXG5cdFx0XHR9XG5cdFx0fSlcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XG5cdH1cblxuIFx0Ly8gVGFrZSB1cmwtZW5jb2RkZWQga2V5LXZhbHVlIHBhaXJzIChsaWtlICdwZXQ9Y2F0Jm5hbWU9Rmx1ZmZ5JyksIHJldHVybiBhIEpTT04gb2JqZWN0IChsaWtlXG4gXHQvLyBqc29uID0ge3BldDogJ2NhdCcsIG5hbWU6ICdGbHVmZnknfSlcblx0ZnVuY3Rpb24ganNvbmlmeVJlcXVlc3QocmVxKXtcblx0XHR2YXIganNvbiA9IHt9O1xuXHRcdC8vIFNwbGl0IHRoZSBvcmlnaW5hbCBzdHJpbmcgYXJvdW5kIFwiJlwiIHRvIGJyZWFrIHVwIGVhY2gga2V5LXZhbHVlIHBhaXIsIHRoZW4gbG9vcCB0aHJvdWdoIGFuZCBzZXBhcmF0ZSBrZXkgZnJvbSB2YWx1ZS5cblx0XHRyZXEuc3BsaXQoXCImXCIpLmZvckVhY2goZnVuY3Rpb24ocGFpcil7IFxuXHRcdFx0cGFpciA9IHBhaXIuc3BsaXQoJz0nKTsgXG5cdFx0XHRqc29uW3BhaXJbMF1dID0gcGFpclsxXTsgXG5cdFx0fSk7XG5cdFx0cmV0dXJuIGpzb247IFxuXHR9XG59Il19