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
			 	location = 'UL:' + tweet.user.location; 		
			} 
			return location;
		}

		function analyzeMood(){
			var R          = 127; 
			var B          = 127; // For (R,G,B) color array values, which will represent mood on the front end. G == B below, in scoreEntireTweet()
			var stats      = {'mood': [], 'posWords': [], 'negWords': []};
			var tweetBoost = 1;
			var wordBoost;
			scoreIndividualWords();
			scoreEntireTweet();  // Assignment for stats.mood occurs here.
			stats.tweetEF  = tweetBoost.toFixed(2);
			return stats;

			function scoreIndividualWords(){
				var tweetWords = tweet.text.split(' ');
				tweetWords.forEach(function(word, i){
					// Gatekeeping conditions to cull irrelevant words. Separated from the if statement for readability.
					var conditions = (word.length > 2 				// No 2-letter or fewer words
								    && word[0] != '@' 				// No usernames
								    && word.indexOf('http') == -1 	// No links
									&& word.indexOf('@') == -1 		// Really, no usernames! (also catches emails)
									&& word != "\n" 					// No newline characters
									&& !(word.length == 3 && word[0] =='#')); // No 2-letter hashtags (state acryonyms, i.e., #MA)

					// If the conditions are met, see if the word fits db format. If not, normalize it. Check if word
					// exists in db. If so, score the word for inferred sentiment.
					if (conditions){
						wordBoost = 1;
						if (!/^[a-z']+$/.test(word)){
			 				scorePunctuation(word);
			 				word = scoreCasing(word); 
						}	 
						if (wordBank[word] || wordBank[word + 's'] || wordBank[word + 'ed'] || wordBank[word + 'ing'] || wordBank[word + 'ful']
							|| wordBank[word + 'ous']){
							scoreWord(word, i);
						}
					}	
				})

 				// Flexible scoring template; works with either array or single number arguments, with a constant for ever member of the 
 				// object array; presumes object.length == constant.length and constant[i] logically pairs with object[i].
 				function scoringTemplate(bases, constants){
 					if (bases.constructor === Array){ 
 						for (var i = 0; i < bases.length; i++){
 							bases[i] += constants[i];
 						}
 					} else {
 						bases += constants[i];
 					}
 					return bases;					  
 				}	

 				function scorePunctuation(word){
 					punc = word.replace(/[a-z']/gi,'');

 					var temp = puncScoringWrapper(/!/g, [wordBoost, tweetBoost], [.15, .1]);
 					if (temp){ 						
	 					wordBoost  = temp[0]; 
	 					tweetBoost = temp[1];
 					}
 					temp = puncScoringWrapper(/\:\)|\=\)|\:,|\:\D|\<\3/g, [B, R], [50, -50]);
 					if (temp){	
	 					B = temp[0]; 
	 					R = temp[1];
 					}
 					temp = puncScoringWrapper(/\:\(|\=\(/g, [B, R], [-50, 50]);
 					if (temp){	
	 					B = temp[0]; 
	 					R = temp[1];
 					}

	 				function puncScoringWrapper(regEx, numArray, constArray){
	 					var matches = punc.match(regEx);
	 					if (matches){
	 						return scoringTemplate(numArray, [constArray[0] * matches.length, constArray[1] * matches.length]);
	 					} else {
	 						return null;
	 					}
	 				}
 				}

 				function scoreCasing(word){
	 				word = word.match(/[a-z']+/gi); // Decouple .join() from this statement due to null result
	 				if (word){
	 					word = word.join('');	
 						var caps = word.match(/[A-Z']+/g);
	 					if (caps && caps.length == word.length){
	 						var temp   = scoringTemplate([wordBoost, tweetBoost], [(.05 * caps.length), (.02 * caps.length)]);
	 						wordBoost  = temp[0];
	 						tweetBoost = temp[1];
		 					word = word.toLowerCase(); 							
	 					}
	 				} else {
	 					word = "SKIP NULL."
	 				}
	 				return word; 						
 				}

 				function scoreWord(word, i){
 					var score = 1;
 					checkNegators();
					score *= wordBank[word] * 25 * wordBoost;
					wordBank[word] > 0 ? wordScoringWrapper('posWords') 
										   : wordScoringWrapper('negWords')  
						
					function checkNegators(){
						var negators = "^n't^not";
						if (i != 0){
							var prevWord = tweetWords[i - 1];
							var suffix = prevWord.substring(prevWord.length - 3, prevWord.length);
							if (negators.indexOf(suffix) != -1){
								score = -1;
							}
						}
					}

					function wordScoringWrapper(field){
						stats[field].push({'word': word, 'score': wordBank[word], 'EF': wordBoost * score});
						var rbTemp = scoringTemplate([R, B], [-score, score]);
						R = rbTemp[0]; 
						B = rbTemp[1];
					}				   
				}
			}
 					
 				// Note that B is used for green pixels
			function scoreEntireTweet(){
				stats.mood = [R,B,B]
				for (var i = 0; i < stats.mood.length; i++){
					stats.mood[i] = (stats.mood[i] * tweetBoost).toFixed(0);
					if (stats.mood[i] > 255){
						stats.mood[i] = 255;
					}
					if (stats.mood[i] < 0){
						stats.mood[i] = 0;
					}
				}
			}
		}
	}
}






	