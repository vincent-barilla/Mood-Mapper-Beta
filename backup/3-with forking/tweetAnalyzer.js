var util = require('util');
var Fork = require('child_process').fork;
var globalChild = null; 

	this.analyze = function(tweet, connection){

		connection.on('close', function(){
			console.log("WebSocket connection closed. Kill child process.");
			if (globalChild != null){
				globalChild.kill('WebSocket closed.');
			}

		})

		var result = {};
	
		// Make sure the tweet has text. If not, return null, as the analysis can't be done.
		if (tweet.text != null){
			result["text"] = tweet.text;
			result["mood"] = analyzeMood(tweet.text);
			// Check to see if there is any location data attached to the tweet, with first preference on the tweet's place, 
			// then checking the location listed on the user's profile. 
			if (tweet.place != null){
				result["location"] = tweet.place.full_name + ", " + tweet.place.country;
			} else {
			 	if (tweet.user != null && tweet.user.location != null){
			 		result["location"] = tweet.user.location; // no country code.
				} else {
		 			result["location"] = null;
		 		}
			}
		} else {
			result["text"] = null;
			result["mood"] = null;
			result["location"] = null;
		}

		return result;
	};


	function analyzeMood(tweetText){
		var mood = "cat";
		var child = Fork('./afinnSentiment.js');

		child.send(tweetText);

		child.on('message', function(data){
			console.log('PARENT: Received ' + data + ' from child.');
			console.log('****Forking done*****')
			console.log('\n');
			return data;
		});

		child.on('error', function(code){
			console.log('PARENT: error, code: ' + code);
		})


	}