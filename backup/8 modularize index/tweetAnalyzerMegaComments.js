var util = require('util');

	this.analyze = function(tweet, wordBanks){

		var wordBank = setWordBank();
		var result = initResult();
		return result;

		function setWordBank(){
			var wordBank = {};
			switch (tweet.lang){
				case 'sp':
					wordBank = wordBanks.spanish;
					break;
				case 'en':
				default:
					wordBank = wordBanks.english;
			}
			return wordBank;		
		}

		function initResult(){
			var result = {};

			// Note: 'text' MUST be first property of result to agree with front end selection of data (index.html)
			if (tweet.text != null){
				result.text        = tweet.text;
				result.stats       = analyzeMood();				
				result.stats.reach = tweet.user.followers_count;													
				result.id          = tweet.id_str;
				result.location    = setLocation();
				result.user        = setUser();				 
			} else {
				result.text    	   = null;	
				result.stats       = null;					
				result.stats.reach = null;							
				result.id          = tweet.id_str;				
				result.location    = null;
				result.user        = null;				 
			}
			return result;

			function setUser(){
				var user         = {};
				user.description = tweet.user.description;
				user.id          = tweet.user.id_str;
				user.name        = tweet.user.screen_name;
				user.verified    = tweet.user.verified;
				return user;
			}

			// Assign a location string to the result. The two-letter id's ('CO, ST, UL') will assist in geocoding on the front end.
			function setLocation(){
				var location = null;
				if (tweet.coordinates != null) {
					location = 'CO:' + (tweet.coordinates.coordinates).toString();
				} else if (tweet.place != null) {
					var street = "";
					if (tweet.place.attributes.street_address != null){
						street += tweet.place.attributes.street_address + ", ";
						if (tweet.place.attributes['623:id'] != null){
							street += tweet.place.attributes['623:id'] + ", "; 
						}
					} 
					location = 'ST:' + street + tweet.place.full_name + ", " + tweet.place.country;
				} else if (tweet.user != null && tweet.user.location != null){
				 	location = 'UL:' + tweet.user.location; // no country code.					
				} 
				return location;
			}

			function analyzeMood(){
				var text = tweet.text;
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
				stats.mood = [];				
				// Both arrays are populated in scoreWord() below, according to a word's score found in wordBank. 
				stats.posWords = [];
				stats.negWords = [];

				/*
				 The mood is represented by an RGB color array. Negative words will increase R, decrease GB; positive will 
				 increase GB, decrease R. The choice for beginning with this gray color was purely aesthetic -- I didn't 
				 like starting at black, as this would indicate ambiguity, or absence of sentimenet, and roughly half the
				 tweets are this way -- leading to a black, ugly output about half the time.
				*/
				mood = [127,127,127];
				var tweetMultiplier = 1;
				var wordMultiplier;

				tweetWords = text.split(' ');

				tweetWords.forEach(function(word, i){

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

						//console.log("Word pre-norm is: " + word);

						/* 
						 wordBank contains lowercased, non-punctuated words. If the current word isn't already
						 formatted to these conditions, then it must be normalized (re-cased and its punctuation removed) 
						 in normalizeWord, so that it can check for a match in wordBank.
						*/ 
						if (!/^[a-z]+$/.test(word)){
							word = normalizeWord(word);
						}	

						//console.log("Word post-norm is: " + word);
						
						/*
						 After normalization, the word can be checked against wordBank. If there is a match, the 
						 word's score will be stored for later calculation of the overall mood in the tweet.
						*/ 
						if (wordBank[word] != undefined){
							//console.log("Word post-dbCheck is: " + word);
							scoreWord(word, i);
						}

					}	
				})

				//console.log("tweetMultiplier is now: " + tweetMultiplier);

				scoreTweet();
				stats.tweetEF = tweetMultiplier.toFixed(2);
				stats.mood = mood;
				return stats;
 						
 				function normalizeWord(word){

 					// The non-letter characters will be checked for "!" or smiley faces. "!" increases multiplier, faces increase mood.
 					scorePunctuation(word); 

 					// word.match(RegExp) below selects only letters from the current word. Will be null if no letters are present.
 					word = word.match(/[a-z]+/gi);
 					if (word != null){
 						word = word.join('');
 						//console.log("Word post-match and join is: " + word + " and it is of type: " + typeof word)

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
 						//console.log("caps is: " + caps)
 						if (caps != null && caps.length == word.length){
 							wordMultiplier += .05 * caps.length;
 							tweetMultiplier += .02 * caps.length;
 						}
 					}

 					// Checks for null returns on cutting all letters, leaving only punctuation. '!' augments the multiplier; smiley augments a mood. 
 					function scorePunctuation(word){
 						punc = word.replace(/[a-z]/gi,'');
 						//console.log("punc is: " + punc); 						
 						if (punc != null){
	 						var exclam = punc.match(/!/g);
	 						if (exclam != null){
	 							wordMultiplier += .25
	 							tweetMultiplier += exclam.length * .1;
	 						}
	 						var happyFace = punc.match(/\:\)|\=\)|\:,|\:\D/g);
	 						if (happyFace != null){
	 							//console.log("Happy face found.")
	 							mood[0] -= 50 * happyFace.length;	 							
	 							mood[1] += 50 * happyFace.length;
	 							mood[1] = mood[2];		 							
	 						}
	 						var sadFace = punc.match(/\:\(|\=\(/g);
	 						if (sadFace != null){
	 							//console.log("Sad face found.")
	 							mood[0] += 50 * sadFace.length;
	 							mood[2] -= 50 * sadFace.length;
	 							mood[1] = mood[2];		 							
	 						}
	 					}	
 					}
 				}

 				// Checks the score for a word in wordBank, multiplies it by a constant, adds this to the overall mood array. Also store words, 
 				// either positive or negative, in their respective field in stats object. Note that scores for negative words are negative, so 
 				// R must multiply by a negative constant before adding to see a positive gain. 
				function scoreWord(word, i){
					console.log("**ALERT**, Word: " + word +" is being scored.")

					// If a negator precedes a word, it will have the opposite effect on mood, as the score multiplier will
					// be -1 rather than 1. Negators as a string w/ indexOf() used as it is 15-20x faster than a RegEx test. 
					var negators = "cant^wont^isnt^not^nor^arent";
					var score = 1;
					if (i != 0){
						var prevWord = tweetWords[i - 1];
						//console.log("Word is : " + word + "~And prevWord is: " + prevWord + "~And indexOf yields: " + negators.indexOf(prevWord)) 
						if (negators.indexOf(prevWord) != -1){
							score = -1;
							console.log("~~~ALERT~~~ Negator found.")
						}
					}

					// Positive words increase G & B, decrease R; negative words increase R, decrease G & B, with the wordMultiplier
					// increasing magnitude of the change. Note the effect that the negator check above has on the score: if 
					// score == -1 because a negator preceded the current word, then the change below will be inverted -- 
					// i.e., "is good" ==> [R--, G++, B++], but "not good" ==> [R++, G--, B--].
					if (wordBank[word] > 0){
						stats.posWords.push({'word': word, 'score': wordBank[word], 'EF': wordMultiplier * score});
						score *= wordBank[word] * 25 * wordMultiplier;
						mood[1] = mood[2] += score;
						mood[0] -= score;
					}
					if (wordBank[word] < 0){
						stats.negWords.push({'word': word, 'score': wordBank[word], 'EF': wordMultiplier * score});
						score *= wordBank[word] * -25 * wordMultiplier;
						mood[0] += score;
						mood[1] = mood[2] -= score;
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






	