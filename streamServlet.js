var util 	      = require('util');
var Oauth 	      = require('oauth');
var TweetAnalyzer = require('./tweetAnalyzer.js'); 
// Initialize stream here to give it global scope. It can now trigger writes to the front end in "query",
// and disconnect from Twitter in "kill". 
var stream;

	/*

	 Refer to Readme.md: "II.  Concerns About Twitter Stream Usage Limits" in the github repo for a consideration of
	 stream usage limits for this app.  	
	
	*/

// Query the Twitter Public Stream API. Receive a sample of real-time tweets that match query parameters.
// "data" came from the front end, contains the parameters to define the query to Twitter. "response", 
// "request", are from the main server, so when "response.write" is used, JSON.stringified data go back to the client. 
this.query = function(data, response, request, wordBank){ 
	// "octet-stream" alleviates a strange buffering issue I experienced when writing to Chrome. 
	response.writeHead(200,{'Content-Type': 'application/octet-stream'});
	// I used an npm module for the oauth 1.0 authentication. See "env.js" for the keys. 
	var oauth = new Oauth.OAuth(
		'https://api.twitter.com/oauth/request_token', 
	  	'https://api.twitter.com/oauth/access_token',
	  	process.env.TWITTER_CONSUMER_KEY, 
	  	process.env.TWITTER_CONSUMER_SECRET, 
	  	'1.0A',
	  	null,
	  	'HMAC-SHA1'
	);
	// Notice that the stream is a long-lived get request. Twitter holds it open and states, in their documentation,
	// that they prefer a client keep this connection open for as long as possible. Frequently disconnecting and 
	// reconnecting is more resource intensive for them than is holding open one request. 
	stream = oauth.get('https://stream.twitter.com/1.1/statuses/filter.json?filter_level=none&track=' + data.subject, 
								 process.env.TWITTER_ACCESS_TOKEN_KEY, 
								 process.env.TWITTER_ACCESS_TOKEN_SECRET);
	// Since the stream connection comes from a GET request, the request must be ended.  
	stream.end(); 
	// This response will contain the incoming tweet data. Unlike the RESTful query, no 'end' event is generated with 
	// this response, so the code can't wait till all the data has reached the server before cutting it up.
	stream.addListener('response', function (twitResponse){ 
		// The variables initialized here will delimit complete tweets. 		
		var startInd; 
		var endInd;   
		var string = "";
		var tweet; 
		var result; 

		/*

			Refer to Readme.md "III. Delimiting Stream Response" for expanded comments on the methodology I used 
			in the "twitResponse.addListener" code block.

		*/

		// Data come in chunks, NOT complete tweets, so I use '\r\n{"created_at":"' to delimt the start and end 
		// indices of tweets.
		twitResponse.addListener('data', function(data){ 
			// Concatenate incoming chunks into one, long string. 
			string += data; 
			startInd = string.indexOf('\r\n{"created_at":"'); 
			endInd = string.lastIndexOf('\r\n{"created_at":"');
			// Use startInd and endInd to pull out the entire tweet, pass it through tweetAnalyzer, reset the string 
			// for the next incoming tweet, and write the result, in JSON, back to the front end.
			if (endInd > startInd){ 
				tweet = string.substring(startInd, endInd); 
				result = TweetAnalyzer.analyze(JSON.parse(tweet), wordBank);
				// Clear string to prepare it for the next chunk.
				string = "";				
				response.write(JSON.stringify(result));
			}
		})
	})
};

// Twitter will keep the responses flowing in until you manually abort the request from the front end.
this.kill = function(response){
	stream.abort();
	response.writeHead(200,{'Content-Type': 'text/plain; charset=UTF-8'});
	response.end("Stream ended.");
}

