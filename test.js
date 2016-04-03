var util          = require('util');
var http          = require('http');
var url           = require('url');
var fs            = require('fs');
var Oauth 		  = require('oauth');
var TweetAnalyzer = require('./tweetAnalyzer.js');
var wordBank      = initWordBank();

function initWordBank(){
	var wordBank = {};
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
	return wordBank;
}


require('./env.js')

var oauth = new Oauth.OAuth(
	'https://api.twitter.com/oauth/request_token',
  	'https://api.twitter.com/oauth/access_token',
  	process.env.TWITTER_CONSUMER_KEY,
  	process.env.TWITTER_CONSUMER_SECRET,
  	'1.0A',
  	null,
  	'HMAC-SHA1'
);

var request = oauth.get('https://stream.twitter.com/1.1/statuses/filter.json?stringify_friend_ids=true&filter_level=none&track=berniesanders', 
						process.env.TWITTER_ACCESS_TOKEN_KEY, 
						process.env.TWITTER_ACCESS_TOKEN_SECRET);
request.end();

var count = 0;
request.addListener('response', function (response){

	var startInd;
	var endInd;
	var string = "";

	response.addListener('data', function(data){

		string += data;
		startInd = string.indexOf('\r\n{"created_at":"');

		endInd = string.lastIndexOf('\r\n{"created_at":"');

		if (endInd > startInd){
			strSub = string.substring(startInd, endInd);
			var result = TweetAnalyzer.analyze(JSON.parse(strSub), wordBank);
				
			string = "";

			count++;
			console.log(count);					
			console.log(JSON.stringify(result));
			console.log('\n')

		}
	})
		//console.log(string.split('\r\n'))

	response.addListener('end', function(){
		//console.log(JSON.parse(string))
	})
})
