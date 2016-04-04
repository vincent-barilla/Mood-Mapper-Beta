var util 			 = require('util');
var TweetAnalyzer    = require('./tweetAnalyzer.js');
var https            = require('https');

this.makeQuery = function(data, response, request, wordBank){ // data, here, came from the front end, contains the parameters to define the
															  // query to Twitter. response, request, are from the main server, so when 
															  // response.write() is used, it goes back to the front end. 

	// Here's a full query string: '/1.1/search/tweets.json?q=DonaldTrump%20since%3A2016-03-25%20until%3A2016-03-28&count=3',
	var queryString = '/1.1/search/tweets.json?q=' + data.subject 
	                + '%20since%3A' + parseDate(data.start) 
	                + '%20until%3A' + parseDate(data.end)
	                + '&since_id='  + checkId(data.id)
	                + '&count=100';

	// Fairly standard get request, using a user-parameterized search string. The code that produced my access token is in env.js.
	var options = {
		'path'	   : queryString,
		'hostname' : 'api.twitter.com',
		'method'   : 'GET',
		'headers'  : {'Authorization': ('Bearer ' + process.env.BEARER_ACCESS_TOKEN)},
	};

	// Must use https, as per Twitter application-only requirements. 
	var req = new https.request(options, function(res){

		var responseString = ""; // Initialize an empty string, to then concatenate on data chunks as they are returned from Twitter.

		res.on('data', function(tweet){
			responseString += tweet; // Concatenate all data chunks into the responseString. 
		})

		res.on('end', function(){ // Unlike streaming tweets, 'end' occurs when the entire batch has reached the requester. 
			var twe = JSON.parse(responseString).statuses; // Parse ONLY the tweets. Avoid trying to parse the meta-data around statuses. 
			for (var i = 0; i < twe.length; i++){ 
				(function intervalClosure(i){ // Closure used to set the timeout according to i, avoid asynch issue of i iterating to completion before 
					setTimeout(function(){    // timeout callback has fired. 
						var result = TweetAnalyzer.analyze(twe[i], wordBank); // Analyze one tweet at a time.
						if (result){
							response.write(JSON.stringify(result)); // Write the result to the front end. 
						}
					}, i * 500); // This delay alleviates load on front-end geocoders, makes the batch data from GET act more like a stream. 									       
				})(i);
			};	
		});

		res.on('error', function(error){
			console.log("Error in twitGet: " + error);
			throw error;
		})

	})
	req.end();
	
	// Helper function for the above formation of queryString; takes 'month/day/year' format, returns what Twitter needs: 'YYYY-MM-DD'
	function parseDate(date){
		date = date.split('%2F'); // Split around the encoding for a backslash ('%2F' == '/', after url-encoding).
		return (date[2] + '-' + checkSingle(date[0]) + '-' + checkSingle(date[1])); // checkSingle tacks a '0' onto a single-digit month or day.
		function checkSingle(digit){ // Helper function to do the work of padding signle-digit inputs with a '0' 
			if (digit.length == 1){ // Note that dates are error checked on the front end, so it's safe, here, to presume that digit is a number.
				digit = '0' + digit;
			}
			return digit;
		}
	}

	function checkId(date){
		
	}			
}