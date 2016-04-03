var util 			 = require('util');
var TweetAnalyzer    = require('./tweetAnalyzer.js');
var Oauth 	         = require('oauth');


this.makeQuery = function(data, response, request, wordBank){
	
	response.writeHead(200,{'Content-Type': 'application/octet-stream'});

	var stream = initStream();

	function initStream(){

		var oauth = new Oauth.OAuth(
			'https://api.twitter.com/oauth/request_token',
		  	'https://api.twitter.com/oauth/access_token',
		  	process.env.TWITTER_CONSUMER_KEY,
		  	process.env.TWITTER_CONSUMER_SECRET,
		  	'1.0A',
		  	null,
		  	'HMAC-SHA1'
		);

		stream = oauth.get('https://stream.twitter.com/1.1/statuses/filter.json?filter_level=none&track=berniesanders', 
									 process.env.TWITTER_ACCESS_TOKEN_KEY, 
									 process.env.TWITTER_ACCESS_TOKEN_SECRET).end();

		stream.on('error', function(error){
			console.log("MAIN SERVER: Error with twitter stream: " + error)
			throw error;
		})	
		return stream;
	}

	stream.addListener('response', function (twitResponse){
		
		var startInd;
		var endInd;
		var string = "";
		
		twitResponse.addListener('data', function(data){
			string   += data;
			startInd = string.indexOf('\r\n{"created_at":"');
			endInd   = string.lastIndexOf('\r\n{"created_at":"');

			if (endInd > startInd){
				strSub = string.substring(startInd, endInd);
				var result = TweetAnalyzer.analyze(JSON.parse(strSub), wordBank);
				
				string = "";		
				response.write(JSON.stringify(result));
				console.log(JSON.stringify(result));
				console.log('\n')
			}
		})

		response.addListener('end', function(){
			//console.log(JSON.parse(string))
		})
	})
};
