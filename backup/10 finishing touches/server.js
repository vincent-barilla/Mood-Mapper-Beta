
var util          = require('util'); 
var http          = require('http');
var url           = require('url');
var fs            = require('fs');
var Dispatcher    = require('./dispatcher.js'); // Custom-made dispatcher script. 

require('./env.js'); // The environment variables (Twitter authentication/access keys and tokens).

var wordBank = {}; 
initWordBank();   

// The server receives requests and passes them along to Dispatcher.dispatch for further processing. The
// server will listen at a localhost port, if not launched on a hosting service.
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
	Refer to Readme.md: "I. initWordBank" in the github repo for a more detailed explanation of this 
	function, including examples of both the format of the file this loads, as well as the format of the 
	word bank it creates. 
*/

// This initializes the wordBank (effectively the app's database). Sync used to make sure the wordBank 
// is done readiing before requests come in. 
function initWordBank(){
	var data = fs.readFileSync('./public/AFINN/JSON/MasterList.json').toString(); 
	data = JSON.parse(data); 
	setWordBank(); 

	// The end result will allow for the following use: wordBank['english']['love'] //==> 4. 
	// (See Readme.md for details. )
	function setWordBank(){
		var key;
		var list;
		for (key in data){ 
			wordBank[key] = {};
			list = data[key];
			list.forEach(function(wordJson){ 
				wordBank[key][wordJson['word']] = wordJson['score']; 
			})
		}	
	}														 
	console.log("MAIN SERVER: wordBank initialized.")
}
