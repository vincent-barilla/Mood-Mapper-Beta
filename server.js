
var util          = require('util'); // The first four required add-ons are core node scripts. 
var http          = require('http');
var url           = require('url');
var fs            = require('fs');
var Dispatcher    = require('./dispatcher.js'); // Custom-made dispatcher script. 

require('./env.js'); // The environment variables (Twitter authentication/access keys and tokens).

var wordBank = {}; // Initialized the wordbank as an empty object for the convenience of not having to  
initWordBank();    // return a variable from initWordBank.

// The server receives all the requests, passes them to Dispatcher.dispatch to sort out where the
// request needs to go for further processing. Modeled after a Java Spring MVC dispatcher servlet. 
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
	Refer to Readme.md: "I. initWordBank" in the github repo for a more detailed explanation of this function, including examples of both the format of the file
 this loads, as well as the format of the word bank it creates. 
*/

function initWordBank(){
	var data = fs.readFileSync('./public/AFINN/JSON/MasterList.json').toString(); // Sync used to make sure the wordBank is done readiing before requests come in. 
	data = JSON.parse(data); // data is now a big object, containing word banks (more big objects) with language names as their keys.
	setWordBank(); // Call the helper function to do the work of setting the wordBank variable.

	function setWordBank(){
		for (var key in data){ // key is, at this point, a language ('english', for example). 
			wordBank[key] = {}; // Initialize wordBank('languageName') as an empty object.
			var list = data[key]; // Pull 'languageName' from the original object. This is an array of objects (see wordFile in above example).
			list.forEach(function(wordJson){ // Convert formats from the start product to the end product shown in the above example in a forEach loop. 
				wordBank[key][wordJson['word']] = wordJson['score']; // An example of this action, with actual values: wordBank['english']['love'] = 4.
			})													     // The forEach iterates this through the entire array, dynamically growing the 'english' wordbank. 									
		}															 // Once this forEach loop is done, 'english' is finished, and the for(var key in data) loop will then repeat 
	}																 // this process for as many language arrays are in your data object (I have 2, 'english' and 'spanish').
	console.log("MAIN SERVER: wordBank initialized.")
}
