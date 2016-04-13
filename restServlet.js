var util 		  = require('util');
var TweetAnalyzer = require('./tweetAnalyzer.js');
var https         = require('https');

// "data", here, came from the front end and contains the parameters to define the query to Twitter. "response" 
// and "request" are from the main server, so when "response.write" is used, it's writing back to the client.
this.query = function(data, response, request, wordBank){ 
	// "octet-stream" alleviates a strange buffering issue I experienced when writing to Chrome. 
	response.writeHead(200,{'Content-Type': 'application/octet-stream'});	
	// Note the full customization via user parameters. I keep 100 as "count", as it's the max, and the 
	// user can pause at any time on the front end if they want to see less.
	var queryString = '/1.1/search/tweets.json?q=' + data.subject 
	                + '%20since%3A' + parseDate(data.start) 
	                + '%20until%3A' + parseDate(data.end)
	                + '&max_id='  + (data.id)
	                + '&count=100';

	// Sample query string: '/1.1/search/tweets.json?q=Puppies%20since%3A2016-03-25%20until%3A2016-03-28&count=3'.

	// Get request options, including bearer access token for Twitter application-only authorization. Access token is in "env.js".
	var options = {
		'path'	   : queryString,
		'hostname' : 'api.twitter.com',
		'method'   : 'GET',
		'headers'  : {'Authorization': ('Bearer ' + process.env.BEARER_ACCESS_TOKEN)},
	};
	// Must use https, as per Twitter application-only request requirements. 
	var req = new https.request(options, function(res){
		var responseString = ""; 
		// As data arrives in chunks, add them to the string.
		res.on('data', function(tweet){
			responseString += tweet; 
		})
		// "end" indicates all the data from the query is done sending. "responseString" can now be parsed 
		// into an object which contains "statuses", which contains an array of the individual tweets as 
		// JSON objects. Loop through that array, pass each tweet to "tweetAnalyzer", then write the result 
		// to the front end with "response.write". Use a timeout to throttle the writing to avoid overtaxing 
		// the geocoders.
		res.on('end', function(){ 
			var tweets = JSON.parse(responseString).statuses;
			var i;
			var result; 
			for (i = 0; i < tweets.length; i++){ 
				(function intervalClosure(i){
					setTimeout(function(){
						// The result, at this point, is ready for use in the front end.    
						result = TweetAnalyzer.analyze(tweets[i], wordBank); 
						if (result){
							response.write(JSON.stringify(result)); 
						}
					}, i * 500); // The half-second interval is arbitrary/aesthetic/sufficient time for the geocoders.									       
				})(i); // Closure needed to correctly stagger timeout.
			};	
		});
		res.on('error', function(error){
			console.log("Error in restServlet: " + error);
			throw error;
		})
	})
	// A request must be ended in order to be sent to the API. 
	req.end();
	
	// Takes "month/day/year" format, returns what Twitter needs: "YYYY-MM-DD"
	function parseDate(date){
		// Split around '%2F', which is the url code for "/".
		date = date.split('%2F');
		return (date[2] + '-' + checkSingle(date[0]) + '-' + checkSingle(date[1])); 
		// If a month or day is a single digit, concatenate a "0" to its front.
		function checkSingle(digit){ 
			if (digit.length == 1){ 
				digit = '0' + digit;
			}
			return digit;
		}
	}		
}