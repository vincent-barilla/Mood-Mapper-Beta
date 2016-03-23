var util = require('util');

	this.analyze = function(tweet, wordBank){

		var result = {};
		determineResults();
		return result;

		function determineResults(){
			// Make sure the tweet has text. If not, return null, as the analysis can't be done
			if (tweet.text != null){
				result["text"] = tweet.text;
				result["mood"] = analyzeMood(tweet.text); anon(tweet.text);
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
			
			function analyzeMood(){
				function randColor (){
					return (Math.random() * 255).toFixed(0);
				}
				return [randColor(), randColor(), randColor()];	
			};

			function anon(tweetText){

				mood = [];
				multiplier = 1;
				tweetWords = tweetText.split(" ");

				tweetWords.forEach(function(word){

					// Make sure the word isn't a hashtag, username, hyperlink, or newline character.
					if (word[0] != '#' && word[0] != '@' && word.indexOf('http') == -1 
				    	&& word.indexOf('#') == -1 && word.indexOf('@') == -1 && word != "\n") {
						
						// The word bank presumes lower case and unpunctuated words. If it doesn't already 
						// satisfy these conditions, then the word must be normalized.
						if (!/^[a-z]+$/i.test(word)){
							word = normalizeWord(word);
						}	

						// After normalization, the word can be checked against the database.
						if (word != null && wordBank[word] != undefined){
							scoreWord(word);
						}

					}	
				})
				console.log(multiplier);



				// Arbitrarily used a tweet I thought equated to a [160, 0, 0] RGB score, then broke it down 
				// by the multipliers I (also arbitrarily) assigned. It came out to roughly 10 pixels * a word's score 
				// per hit against the database, then times the multiplier.
				function scoreWord(word){
					if (wordBank[word] > 0){
						mood[2] += wordBank[word] * 10;
					}
					if (wordBank[word] < 0){
						mood[0] += wordBank[word] * 10;
					}	
				}
			}
		}
	}
	





	