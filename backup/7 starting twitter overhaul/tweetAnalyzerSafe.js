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
			if (tweet.text){
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
				if (tweet.coordinates) {
					location = 'CO:' + (tweet.coordinates.coordinates).toString();
				} else if (tweet.place) {
					var street = "";
					if (tweet.place.attributes.street_address){
						street += tweet.place.attributes.street_address + ", ";
						if (tweet.place.attributes['623:id']){
							street += tweet.place.attributes['623:id'] + ", "; 
						}
					} 
					location = 'ST:' + street + tweet.place.full_name + ", " + tweet.place.country;
				} else if (tweet.user && tweet.user.location){
				 	location = 'UL:' + tweet.user.location; // no country code.					
				} 
				return location;
			}

			function analyzeMood(){

				var stats           = {'mood': [127,127,127], 'posWords': [], 'negWords': []};
				var tweetMultiplier = 1;
				var wordMultiplier;
				scoreIndividualWords();
				scoreEntireTweet();
				stats.tweetEF = tweetMultiplier.toFixed(2);
				stats.mood = mood;
				return stats;

				function scoreIndividualWords(){
					var tweetWords = tweet.text.split(' ');
					tweetWords.forEach(function(word, i){

						// Gatekeeping conditions to cull irrelevant words, separated from the if statement for readability.
						var conditions = (word.length > 2 
									   && word[0] != '@' 
									   && word.indexOf('http') == -1 
									   && word.indexOf('@') == -1 
									   && word != "\n" 
									   && !(word.length == 3 
									   && word[0] =='#'));

						// If the conditions are met, see if the word fits db format. If not, normalize it. Check if word
						// exists in db. If so, score the word for inferred sentiment.
						if (conditions){
							wordMultiplier = 1;
							if (!/^[a-z']+$/.test(word)){
								word = normalizeWord(word);
							}	 
							if (wordBank[word] != undefined){
								scoreWord(word, i);
							}
						}	
					})
				}
 						
 				function normalizeWord(word){
 					scorePunctuation(word); 

 					// Cut punctuation, score casing (all caps?) of a word, lower case to agree with db format. Allowed ' in regex to avoid 
 					// confusion of words like "He'll" being normalized to "hell" and being scored as negative.
 					word = word.match(/[a-z']+/gi);
 					
 					if (word){
 						// .join() used as .match() above returned array if excluded character interrupted word. Also casts to String (needed anyways).
 						word = word.join('');
 						scoreCasing(word);
 						word = word.toLowerCase();
 					} else {
 						word = "SKIP NULL."
 					}

 					return word;

 					// Flexible scoring template. At least needs gainers and constant; if no losers, just score gainers. Inner function abstracts the 
 					// scoring methodology, such that the argument passed to score() can be either a single number or an array of numbers. 
 					function scoringTemplate(gainers, constant, losers){
 						losers ? (function(){(score(gainers)); score(losers)})() : score(gainers); 
 						function score(object){
 							object.length > 0 ? object.forEach(function(obj){obj *= constant}) : obj *= constant;
 						}

 					}

 					function scoreCasing(word){
 						var caps = word.match(/[A-Z]/g);
 						//console.log("caps is: " + caps)
 						if (caps && caps.length == word.length){
 							wordMultiplier += .05 * caps.length;
 							tweetMultiplier += .02 * caps.length;
 						}
 					}

 					function scorePunctuation(word){
 						punc = word.replace(/[a-z']/gi,'');
 						//console.log("punc is: " + punc); 						
 						if (punc){
	 						var exclam = punc.match(/!/g);
	 						if (exclam){
	 							wordMultiplier += .25
	 							tweetMultiplier += exclam.length * .1;
	 						}
	 						var happyEmo = punc.match(/\:\)|\=\)|\:,|\:\D|\<\3/g);
	 						if (happyEmo){
	 							//console.log("Happy face found.")
	 							mood[0] -= 50 * happyEmo.length;	 							
	 							mood[1] = mood[2] += 50 * happyEmo.length;
	 						}
	 						var sadEmo = punc.match(/\:\(|\=\(/g);
	 						if (sadFace){
	 							//console.log("Sad face found.")
	 							mood[0] += 50 * sadEmo.length;
	 							mood[1] = mood[2] -= 50 * sadEmo.length;	 							
	 						}
	 					}	
 					}
 				}


				function scoreIndividualWord(word, i){
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

				function scoreEntireTweet(){
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






	