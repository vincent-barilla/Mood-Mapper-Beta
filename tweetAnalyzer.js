var util = require('util');

	this.analyze = function(tweet, wordBank){

		var result = {};
		determineResults();
		console.log("\n")
		return result;

		function determineResults(){
			// Make sure the tweet has text. If not, return null, as the analysis can't be done
			if (tweet.text != null){
				result["text"] = tweet.text;

				var moodStats = anon(tweet.text);
				console.log("Moodstats out of anon is: ")
				console.log(moodStats);

				console.log("Positive words were: ");
				moodStats["posWords"].forEach(function(json){
					console.log("Score for " + json["word"] + " is " + json["score"] + ".")

				})

				//      console.log("Score for " + stats["posWords"][0]["word"] + " is " + stats["posWords"][0]["score"] + ".")

				
				console.log("Negative words were: ");
				moodStats["negWords"].forEach(function(json){
					console.log("Score for " + json["word"] + " is " + json["score"] + ".")
				})

				result['mood'] = moodStats['mood'];
				console.log("Mood in determineResults() is: " + result['mood']); 
				result['stats'] = moodStats;

				// Check to see if there is any location data attached to the tweet, with first preference on the tweet's place, 
				// then checking the location listed on the user's profile. 
				if (tweet.place != null){
					result['location'] = tweet.place.full_name + ", " + tweet.place.country;
				} else {
				 	if (tweet.user != null && tweet.user.location != null){
				 		result['location'] = tweet.user.location; // no country code.
					} else {
			 			result['location'] = null;
			 		}
				}

			} else {
				result['text'] = null;
				result['mood'] = null;
				result['location'] = null;
			}

			function anon(tweetText){

				/* 
					stats will contain information about each tweet, stored in the following properites: 

					stats['mood']     ==> An RGB color array. R pixels represent negative sentiment, B pixels represent
										  positive sentiment. Higher values indicates a more extreme sentiment. 
					stats['EF']       ==> EF stands for "Extremeness Factor." Tracks the extremeness of the sentiment
										  of a tweet, regardless of negativity or positivity. Begins as a *1 multiplier, 
										  increases in scorePunctuation() with every "!" or all-caps word found in a word.
										  The multiplier variable stores this value through the function. 
					stats['posWords'] ==> An array of JSON objects with fields "word" and "score" storing all positive words from
										  the entire tweet which matched entries in wordBank.
					stats['negWords'] ==> Same as above comment, but for negative words in a tweet.
				*/					
				var stats = {};
				stats['mood'] = [];				
				// Both arrays are populated in scoreWord() below, according to a word's score found in wordBank. 
				stats['posWords'] = [];
				stats['negWords'] = [];

				/*
				 The mood is represented by an RGB color array. Negative words will increase R, decrease GB; positive will 
				 increase GB, decrease R. The choice for beginning with this gray color was purely aesthetic -- I didn't 
				 like starting at black, as this would indicate ambiguity, or absence of sentimenet, and roughly half the
				 tweets are this way -- leading to a black, ugly output about half the time.
				*/
				mood = [127,127,127];
				var tweetMultiplier = 1;
				var wordMultiplier;

				tweetWords = tweetText.split(' ');

				tweetWords.forEach(function(word){

					/* 
					 Ensure the word isn't a username, hyperlink, or newline character. Also reject 2 letter words,
					 as well as three letter words beginning with a hashtag -- I was encountering state acroynyms
					 (i.e., #MA) which were being read as all-caps words, erroneously increasing the multiplier. 
					*/
					if (word.length > 2 && word[0] != '@' && word.indexOf('http') == -1 
						&& word.indexOf('@') == -1 && word != "\n" && !(word.length == 3 && word[0] =='#')){
						
						/*
						 The multiplier indicates extremeness of sentiment in a given tweet, as evidenced by number of 
						 exclamation points and and number of all caps words.
						*/
						wordMultiplier = 1;

						console.log("Word pre-norm is: " + word);

						/* 
						 wordBank contains lowercased, non-punctuated words. If the current word isn't already
						 formatted to these conditions, then it must be normalized (re-cased and its punctuation removed) 
						 in normalizeWord, so that it can check for a match in wordBank.
						*/ 
						if (!/^[a-z]+$/.test(word)){
							word = normalizeWord(word);
						}	

						console.log("Word post-norm is: " + word);
						
						/*
						 After normalization, the word can be checked against wordBank. If there is a match, the 
						 word's score will be stored for later calculation of the overall mood in the tweet.
						*/ 
						if (wordBank[word] != undefined){
							console.log("Word post-dbCheck is: " + word);
							scoreWord(word);
						}

					}	
				})

				console.log("tweetMultiplier is now: " + tweetMultiplier);

				scoreTweet();
				stats['tweetEF'] = tweetMultiplier.toFixed(2);
				stats['mood'] = mood;
				return stats;
 						
 				function normalizeWord(word){

 					// The non-letter characters will be checked for "!" or smiley faces. "!" increases multiplier, faces increase mood.
 					scorePunctuation(word); 

 					// word.match(RegExp) below selects only letters from the current word. Will be null if no letters are present.
 					word = word.match(/[a-z]+/gi);
 					if (word != null){
 						word = word.join('');
 						console.log("Word post-match and join is: " + word + " and it is of type: " + typeof word)

 						// scoreCasing adds to multiplier for every "!" or all-caps word.								
 						scoreCasing(word);

 						// Word must be lowercase, to be fully normalized to wordBank.
 						word = word.toLowerCase();
 					} else {

 						// In case there was a null result from the match(RegExp above, assign this dummy string to the output.)
 						word = "SKIP NULL."
 					}

 					return word;

 					// Checks for null returns on matching capitalized letters, increases multiplier per length of all-cap word.
 					function scoreCasing(word){
 						var caps = word.match(/[A-Z]/g);
 						console.log("caps is: " + caps)
 						if (caps != null && caps.length == word.length){
 							wordMultiplier += .05 * caps.length;
 							tweetMultiplier += .02 * caps.length;
 						}
 					}

 					// Checks for null returns on cutting all letters, leaving only punctuation. '!' augments the multiplier; smiley augments a mood. 
 					function scorePunctuation(word){
 						punc = word.replace(/[a-z]/gi,'');
 						console.log("punc is: " + punc); 						
 						if (punc != null){
	 						var exclam = punc.match(/!/g);
	 						if (exclam != null){
	 							wordMultiplier += .25
	 							tweetMultiplier += exclam.length * .1;
	 						}
	 						var happyFace = word.match(/\:\)|\=\)|\:,|\:\D/g);
	 						if (happyFace != null){
	 							console.log("Happy face found.")
	 							mood[0] -= 50 * sadFace.length;	 							
	 							mood[1] += 50 * happyFace.length;
	 							mood[1] = mood[2];		 							
	 						}
	 						var sadFace = word.match(/\:\(|\=\(/g);
	 						if (sadFace != null){
	 							console.log("Sad face found.")
	 							mood[0] += 50 * sadFace.length;
	 							mood[2] -= 50 * happyFace.length;
	 							mood[1] = mood[2];		 							
	 						}
	 					}	
 					}
 				}

 				// Checks the score for a word in wordBank, multiplies it by a constant, adds this to the overall mood array. Also store words, 
 				// either positive or negative, in their respective field in stats object. Note that scores for negative words are negative, so 
 				// R must multiply by a negative constant before adding to see a positive gain. 
				function scoreWord(word){
					console.log("**ALERT**, Word: " + word +" is being scored.")
					var score;
					if (wordBank[word] > 0){
						stats['posWords'].push({'word':word,'score':wordBank[word],'EF':wordMultiplier});
						score = wordBank[word] * 25 * wordMultiplier;
						mood[2] += score;
						mood[1] = mood[2];
						mood[0] -= score;
					}
					if (wordBank[word] < 0){
						stats['negWords'].push({'word':word,'score':wordBank[word],'EF':wordMultiplier});
						score = wordBank[word] * -25 * wordMultiplier;
						mood[0] += score;
						mood[2] -= score;
						mood[1] = mood[2];
					}
				}

				// Applies the overall tweetMultiplier to every mood, also makes sure the mood values are in the uint8 0-255 range for RGB usage.
				function scoreTweet(){
					for (var i = 0; i < mood.length; i++){
						mood[i] = (mood[i] * tweetMultiplier).toFixed(0);
						if (mood[i] > 255){
							mood[i] = 255;
						}
						if (mood[i] < 0){
							mood[i] = 0;
						}
					}
				}
			}
		}
	}






	