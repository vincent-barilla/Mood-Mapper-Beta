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

				mood = [0,0,0];
				multiplier = 1;
				tweetWords = tweetText.split(" ");

				tweetWords.forEach(function(word){

					// Make sure the word isn't a username, hyperlink, or newline character. Also discount 2 letter words
					// as well as three letter hashtags (state name acroynyms, in all caps, which were throwing off mood detection)
					if (word.length > 2 && word[0] != '@' && word.indexOf('http') == -1 
						&& word.indexOf('@') == -1 && word != "\n" && !(word.length == 3 && word[0] =='#')){
						
						console.log("Word pre-norm is: " + word);

						// The word bank presumes lower case and unpunctuated words. If it doesn't already 
						// satisfy these conditions, then the word must be normalized.
						if (!/^[a-z]+$/.test(word)){
							word = normalizeWord(word);
						}	

						console.log("Word post-norm is: " + word);
						// After normalization, the word can be checked against the database. 
						if (wordBank[word] != undefined){
							console.log("Word post-dbCheck is: " + word);
							scoreWord(word);
						}

					}	
				})

				console.log("Multiplier is now: " + multiplier);

				return setMood();
 						
 				function normalizeWord(word){
 					// Only score punctuation for non-letter characters.
 					scorePunctuation(word.replace(/[a-z]/gi,"")); 
 					word = word.match(/[a-z]+/gi);
 					if (word != null){
 						word = word.join("")
 						console.log("Word post-match and join is: " + word + " and it is of type: " + typeof word)								
 						scoreCasing(word);
 						word = word.toLowerCase();
 					} else {
 						word = "SKIP NULL."
 					}

 					return word;

 					// Each all-cap word (or with 2 letters of being all caps) augment the multiplier.
 					function scoreCasing(word){
 						var caps = word.match(/[A-Z]/g);
 						console.log("caps is: " + caps)
 						if (caps != null && caps.length == word.length){
 							multiplier += .4;
 						}
 					}

 					// Each '!' augments the multiplier; each basic smiley face augments a mood.
 					function scorePunctuation(punc){
 						console.log("punc is: " + punc)
 						if (punc != null){
	 						var exclam = punc.match(/!/g);
	 						if (exclam != null){
	 							multiplier += exclam.length * .4;
	 						}

	 						var happyFace = word.match(/\:\)|\=\)|\:,|\:\D/g);
	 						if (happyFace != null){
	 							console.log("Happy face found.")
	 							mood[2] += 50 * happyFace.length;
	 						}
	 						var sadFace = word.match(/\:\(|\=\(/g);
	 						if (sadFace != null){
	 							console.log("Sad face found.")
	 							mood[0] += 50 * sadFace.length;
	 						}
	 					}	
 					}
 				}

				// Arbitrarily used a tweet I thought equated to a [160, 0, 0] RGB score, then broke it down 
				// by the multipliers I (also arbitrarily) assigned. It came out to roughly 10 pixels * a word's score 
				// per hit against the database, then times the multiplier.
				function scoreWord(word){
					console.log("**ALERT**, Word: " + word +" is being scored.")
					if (wordBank[word] > 0){
						mood[2] += wordBank[word] * 30;
					}
					if (wordBank[word] < 0){
						mood[0] += wordBank[word] * -30;
					}
				}

				function setMood(){
					for (var i = 0; i < mood.length; i ++){
						mood[i] = (mood[i] * multiplier).toFixed(0);
						if (mood[i] > 255){
							mood[i] = 255;
						}
					}
					console.log("Mood is now: " + mood);	
					return mood;
				}	
			}
		}
	}






	