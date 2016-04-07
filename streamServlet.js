var util 			 = require('util');
var Oauth 	         = require('oauth');
var TweetAnalyzer    = require('./tweetAnalyzer.js');
var stream; // Initialize stream here to give it global scope so it can be used across all functions.

// Query the Twitter public stream API. Receive a sample of real-time tweets that match query parameters.
// data, here, came from the front end, contains the parameters to define the query to Twitter. response, 
// request, are from the main server, so when response.write() is used, it goes back to the front end. 
this.query = function(data, response, request, wordBank){ 

	// octet-stream alleviates a strange buffering issue I experience when writing to Chrome. 
	response.writeHead(200,{'Content-Type': 'application/octet-stream'});

	// I used an npm module for the oauth 1.0 authentication, as it's a very involved and tricky process. 
	// See env.js for the keys. If I don't show code for how I got the keys programmatically, then they 
	// were generated in my Twitter account, then copied and pasted into env.js. 
	var oauth = new Oauth.OAuth(
		'https://api.twitter.com/oauth/request_token', 
	  	'https://api.twitter.com/oauth/access_token',
	  	process.env.TWITTER_CONSUMER_KEY, 
	  	process.env.TWITTER_CONSUMER_SECRET, 
	  	'1.0A',
	  	null,
	  	'HMAC-SHA1'
	);

	// Notice that the stream is really a long-lived get request. Twitter holds it open and states, in their 
	// documentation, that they prefer a client keep this connection open for as long as possible, as disconnecting 
	// and reconnecting is more resource intensive for them. 
	stream = oauth.get('https://stream.twitter.com/1.1/statuses/filter.json?filter_level=none&track=' + data.subject, 
								 process.env.TWITTER_ACCESS_TOKEN_KEY, 
								 process.env.TWITTER_ACCESS_TOKEN_SECRET);

	// Since the stream connection comes from a GET request, the request must be ended. 
	stream.end(); 

	/*
	 Refer to Readme.md: "II. Concerns about Twitter" in the github repo for a consideration of stream usage limits 
	 for this app. 	
	*/

	// This response will contain the incoming tweet data. The variables initialized here will be used to delimit
	// complete tweets. Unlike the RESTful query, no 'end' event is generated with this response. 
	stream.addListener('response', function (twitResponse){ 
		var startInd; 
		var endInd;   
		var string = "";
		var tweet; 
		var result; 

		// Data come in chunks, NOT complete tweets, so I use '\r\n{"created_at":"' to delimt the start and end 
		// indices of new, whole tweets. I then take a the indexOf to get the first index of my delimiter, and 
		// lastIndexOf to get its last index. Using endInd > startInd precludes the possibility that the substring 
		// was not found or that the delimiter only appears once: if it appears once, both lastIndexOf and indexOf 
		// will return the same thing; if it doesn't appear at all, both will equal -1. (This seemed dicey at first,
		// to me, but it has held up very well. I've never, after thousands of trials, had the delimiters fail.)	
		twitResponse.addListener('data', function(data){ 
			string += data; 
			startInd = string.indexOf('\r\n{"created_at":"'); 
			endInd = string.lastIndexOf('\r\n{"created_at":"');

			// Use startInd and endInd to pull out the entire tweet, pass it through tweetAnalyzer, reset the string 
			// for the next incoming tweet, and write the result, in JSON,  back to the front end. Note that setting 
			// string to "" wipes out the tail of the string, which could have been coupled with the start of the next 
			// chunk to form another tweet. Because the streaming is already very close to maxing out the geocoders
			// on the front end, this is ok for now, actually acting as a de facto throttling measure. If I can further
			// boost the geocoders, it'll make sense to fix this. 
			if (endInd > startInd){ 
				tweet = string.substring(startInd, endInd); 
				result = TweetAnalyzer.analyze(JSON.parse(tweet), wordBank);
				string = "";				
				response.write(JSON.stringify(result));
				console.log(JSON.stringify(result));
				console.log('\n')
			}
		})
	})
};

// Twitter will keep the http responses flowing in until you manually abort the request.
this.kill = function(response){
	stream.abort();
	response.writeHead(200,{'Content-Type': 'text/plain; charset=UTF-8'});
	response.end("Stream ended.");
}

