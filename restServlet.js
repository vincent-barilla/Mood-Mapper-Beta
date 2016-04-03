var util 			 = require('util');
var TweetAnalyzer    = require('./tweetAnalyzer.js');
var https            = require('https');

this.makeQuery = function(data, response, request, wordBank){

	// Sample: '/1.1/search/tweets.json?q=DonaldTrump%20since%3A2016-03-25%20until%3A2016-03-28&count=3',
	var queryString = '/1.1/search/tweets.json?q=' + data.subject 
	                + '%20since%3A' + parseDate(data.start) 
	                + '%20until%3A' + parseDate(data.end)
	                + '&count=100';

	console.log("GET MODE")
	var options = {
		'path'	   : queryString,
		'hostname' : 'api.twitter.com',
		'method'   : 'GET',
		'headers'  : {'Authorization': ('Bearer ' + process.env.BEARER_ACCESS_TOKEN)},
		'port'     : 443,		
	};

	var req = new https.request(options, function(res){
		console.log("Request made at: " + (new Date()));

		var responseString = "";

		res.on('data', function(tweet){
			responseString += tweet;
		})

		res.on('end', function(){
			var twe = JSON.parse(responseString).statuses;
			for (var i = 0; i < twe.length; i++){
				(function intervalClosure(i){
					setTimeout(function(){
						var result = TweetAnalyzer.analyze(twe[i], wordBank);
						if (result){
							response.write(JSON.stringify(result));
						}
					}, i * 1000);
				})(i);
			};	
		});

		res.on('error', function(error){
			console.log("Error in twitGet: " + error);
			throw error;
		})

	})
	req.end();
	
	function parseDate(date){
		date = date.split('%2F');
		return (date[2] + '-' + checkSingle(date[0]) + '-' + checkSingle(date[1]));
		function checkSingle(digit){
			if (Number(date[0])){
				digit = '0' + digit;
			}
			return digit;
		}
	}			
}