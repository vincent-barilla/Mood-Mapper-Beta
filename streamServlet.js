var util 			 = require('util');
var TweetAnalyzer    = require('./tweetAnalyzer.js');
var Oauth 	         = require('oauth');

// Query the Twitter public stream API. Receive a sample of real-time tweets that match query parameters.
this.makeQuery = function(data, response, request, wordBank){ // data, here, came from the front end, contains the parameters to define the
															  // query to Twitter. response, request, are from the main server, so when 
															  // response.write() is used, it goes back to the front end. 
	response.writeHead(200,{'Content-Type': 'application/octet-stream'});// octet-stream alleviates a strange buffering issue I experience when writing to Chrome. 

	// I used an npm module for the oauth 1.0 authentication, as it's a very involved and tricky process. 
	var oauth = new Oauth.OAuth(
		'https://api.twitter.com/oauth/request_token', 
	  	'https://api.twitter.com/oauth/access_token',
	  	process.env.TWITTER_CONSUMER_KEY, // See env.js for the keys. If I don't show code for how I got the keys programmatically, then they were generated
	  	process.env.TWITTER_CONSUMER_SECRET, // in my Twitter account, then copied and pasted into env.js. 
	  	'1.0A',
	  	null,
	  	'HMAC-SHA1'
	);

	// Notice that the stream is really a long-lived get request. Twitter holds it open and states, in their documentation, that they prefer a client keep this 
	// connection open for as long as possible, as disconnecting and reconnecting is more resource intensive for them. 
	var stream = oauth.get('https://stream.twitter.com/1.1/statuses/filter.json?filter_level=none&track=' + data.subject, 
								 process.env.TWITTER_ACCESS_TOKEN_KEY, // See env.js for these keys.
								 process.env.TWITTER_ACCESS_TOKEN_SECRET);

	stream.end(); // Since the stream connection comes from a GET request, the request must be ended. 

/*
 Refer to Readme.md: "II. Concerns about Twitter" in the github repo for a consideration of stream usage limits for this app. 
*/

	stream.addListener('response', function (twitResponse){ 
 
		var startInd; // The next three lines intialize variables that handle the incoming data. Twitter does not respond with complete tweets, so the startInd and endInd
		var endInd;   // variables will store the positions of a delimeter that I've found to perfectly distinguish tweet start/end points.  
		var string = ""; // Data will be concatenated onto this empty string as it is detected in the response. 
		
		twitResponse.addListener('data', function(data){ // Data come in in chunks, NOT complete tweets (what a headache!).
			string   += data; // Add the current chunk to the string. 
			startInd = string.indexOf('\r\n{"created_at":"'); // This index indicates a new tweet's start point. indexOf ALWAYS returns the first index of the substring.
			endInd   = string.lastIndexOf('\r\n{"created_at":"'); // This will indicate a tweet's end point. lastIndeOf ALWAYS returns the last index of the substring.
			if (endInd > startInd){ // Precludes the possibility that the substring was not found (endInd == startInd == -1), or that the last index is the first index (endInd == startInd)
				strSub = string.substring(startInd, endInd); // Return the substring delimited between startInd and endInd. This is a complete tweet. 
				var result = TweetAnalyzer.analyze(JSON.parse(strSub), wordBank); // Parse the complete tweet, pass it, and wordBank, into TweetAnalyzer for analysis. 
				string = ""; // MUST RESET THE STRING, for the above logic to work. Without this, using lastIndexOf with the delimiting substring will not necessarily return a complete tweet.
				response.write(JSON.stringify(result)); // Write the result (in JSON format already, as per tweetAnalyzer) back to the front end for consumption. 
				console.log(JSON.stringify(result));
				console.log('\n')
			}
		})
	})
};


