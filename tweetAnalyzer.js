var util = require('util');

	this.analyze = function(tweet){

		var result = {};
	
		// Make sure the tweet has text. If not, return null, as the analysis can't be done.
		if (tweet.text != null){

			result["text"] = tweet.text;
			result["mood"] = analyzeMood(tweet)

			// Check to see if the user is geo-enabled, and thus able to have tweet info mapped.
			if (tweet.place != null){
				result["location"] = tweet.place.full_name + ", " + tweet.place.country;
			} else {
			 	if (tweet.user != null && tweet.user.location != null){
			 		result["location"] = tweet.user.location; // no country code.
				} else {
		 			result["location"] = null;
		 		}
			}
		}

		return result;
	};

	function analyzeMood(tweet){

		function randColor (){
			return (Math.random() * 255).toFixed(0);
		}

		return [randColor(), randColor(), randColor()];
	}