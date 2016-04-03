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

	/*................. Twitter streaming usage concerns: ............
	
	Note that I customize the get request (the stream), making a unique connection to Twitter for each user. This is NOT a good solution, according to Twitter.
	Twitter will, in fact, block access to accounts who make too many connections from the same IP address. 

	That's a big limitation to the streaming mode of my app. A possible workaround would be to make one stream for the entire server, remove all filtering (or try to -- 
	there would have to be something to define my request query), then receive the user parameters, make a filter from them, and apply this filter as a 
	response.addListener('data', function(data){//and here I parse data}) to the server's stream. The user is then listening to a global stream for matches of their parameters. 

	I don't like that solution, insofar as it means flooding the server with this generalized stream of tweets, of which the user(s) only cares about a tiny percent. Also, I doubt I 
	could make a filter to detect 100% of all relevant tweets from the global stream, which will already be diluted by huge amounts of irrelevant tweets, so the user ends up seeing 
	a much less interesting stream. 

	All other solutions that I can think of would similarly ask Twitter's public stream to do something it wasn't meant to. My best solution is probably to just keep my 
	code as is, demo for you the idea as I originally saw it, and then wait on a new tech to come out. This may not take so long: Twitter is actually developing something that
	would be perfect for this app: Twitter's Site Streaming API is currently in closed beta, but, when open, it will do exactly what I'm talking about here -- make customized 
	connections per user, for many users, for your app. When Site Stream comes out, it should be an easy inclusion to this app. 
	
	*/

	stream.end(); // Since the stream connection comes from a GET request, the request must be ended. 

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
