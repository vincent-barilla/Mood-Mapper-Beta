var util       = require('util'); 
var http       = require('http');
var url        = require('url');
var fs         = require('fs');
var Dispatcher = require('./dispatcher.js');
require('./env.js');
// Given global scope so it can be defined synchronously in "initWordBank", then passed to "Dispatcher.dispatch"
// upon requests from clients. 
var wordBank = {}; 
initWordBank();   

// The server receives requests and passes them along to "Dispatcher.dispatch" for further processing. The
// server will listen at a local port, if not launched on a hosting service.
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

/* 
	Refer to Readme.md: "I. initWordBank" in the github repo for a more detailed explanation of initWordBank,
	including examples of both the format of the file this loads, as well as the format of the word bank it creates. 
*/

// This initializes the wordBank. Sync used to make sure "wordBank" is finished before requests come in. 
function initWordBank(){
	var data = fs.readFileSync('./public/AFINN/JSON/MasterList.json').toString(); 
	data = JSON.parse(data); 
	setWordBank(); 

	// The end result will allow for the following use: wordBank['english']['love'] //==> 4. 
	function setWordBank(){
		// Separating the initialization of variables from the loop, to prevent re-initializing them over and over 
		// (there are around 5k lines to parse in the original file).  
		var key;
		var list;
		for (key in data){ 
			wordBank[key] = {};
			list = data[key];
			list.forEach(function(wordJson){ 
				// "[wordJson['word']]" //==> 'love', "wordJson['score']" //==> 4
				wordBank[key][wordJson['word']] = wordJson['score']; 
			})
		}	
	}														 
}
