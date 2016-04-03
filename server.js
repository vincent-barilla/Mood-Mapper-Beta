
var util          = require('util');
var http          = require('http');
var url           = require('url');
var fs            = require('fs');
var Dispatcher    = require('./dispatcher.js');

// Environment variables (twitter keys in here)
require('./env.js');

var wordBank = {}; 
initWordBank();

console.log('Starting server @ localhost:3000/')

/*................................. Main Server .................................*/

var mainServer = http.createServer(function (request, response){
	try {
		Dispatcher.dispatch(request, response, wordBank);
	} catch (error) {
		console.log(error);
		response.writeHead(500);
		response.end('MAIN SERVER: Internal Server Error: ' + error);
	}
}).listen(process.env.PORT || 3000 , function(){
	console.log('Server running at ' + process.env.PORT || 3000);
});


function initWordBank(){
	var data = fs.readFileSync('./public/AFINN/JSON/MasterList.json').toString(); 
	data = JSON.parse(data);
	setWordBank();

	function setWordBank(){
		for (var key in data){
			wordBank[key] = {};
			var list = data[key];
			list.forEach(function(wordJson){
				wordBank[key][wordJson['word']] = wordJson['score'];
			})
		}
	}
	console.log("MAIN SERVER: wordBank initialized.")
}
