var util = require('util');

this.analyze = function(tweet, wordBanks){
	var wordBank = setWordBank();
	var result = initResult();

	return result;

	// It hasn't been catching as many hits as I had been hoping, but there is a Spanish word list in wordBanks.
	function setWordBank(){
		var wordBank = {};
		switch (tweet.lang){
			case 'sp':
				wordBank = wordBanks.spanish;
				break;
			case 'en':
			default:
				wordBank = wordBanks.english; // default to English wordbank. 
		}
		return wordBank;		
	}

	function initResult(){
		var result = {};

		// Note: 'text' MUST be first property of result to agree with front end string splitting & finding what part of a
		// result represents an isolated Tweet object in JSON. (See index.html. It uses JSON.parse(result))
		if (tweet.text){
			result.text        = tweet.text;
			result.stats       = analyzeMood();
			result.stats.time  = tweet.created_at;				
			result.stats.reach = tweet.user.followers_count;													
			result.id          = tweet.id_str;
			result.location    = setLocation();
			result.user        = setUser();				 
		} else {
			result = null;			 
		}
		return result;

		// Simple constructor. 
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
				location = 'UL:' + street + tweet.place.full_name + ", " + tweet.place.country;
			} else if (tweet.user && tweet.user.location){
			 	location = 'UL:' + tweet.user.location; 		
			} 
			return location;
		}

		function analyzeMood(){
			var R          = 127; // For (R,G,B) color array values, which represent mood on the front end. G = B below, in scoreEntireTweet().
			var B          = 127; // 127 for R and B indicate neutral sentiment. High R values == negativity, High B values == positivity.
			var stats      = {'mood': [], 'posWords': [], 'negWords': []}; // Track how each word has scored, store stats. 
			var tweetBoost = 1; // Indicates extremess of a tweet -- how many !'s occur? Is it in all caps? Amplifies both R and B when applied.
			var wordBoost; // Indicates extremeness of a specific word, boosts both R and B when applied. Amplifies on top of tweetBoost.
			scoreIndividualWords(); // Loop through the current tweet word by word, add up scores and amplifiers as per scoring criteria.
			scoreEntireTweet();  // The final step rolls all scoring back into the (R,G,B) array. If no sentiment/extremeness is detected,
			stats.tweetEF = tweetBoost.toFixed(2);                         // then (127,127,127) is returned here: gray represents neutral. 
			return stats;

			function scoreIndividualWords(){
				var tweetWords = tweet.text.split(' ');
				tweetWords.forEach(function(word, i){
					// Gatekeeping conditions to cull irrelevant words. Separated from the if statement for readability.
					var conditions = (word.length > 2 				// Words must be 3 letters and up.
								    && word[0] != '@' 				// No usernames
								    && word.indexOf('http') == -1 	// No links
									&& word.indexOf('@') == -1 		// Really, no usernames! (also catches emails)
									&& word != "\n" 				// No newline characters
									&& !(word.length == 3 && word[0] =='#')); // No 2-letter hashtags (state acryonyms, i.e., #MA)

					// If the conditions are met, see if the word fits db format. If not, normalize it, perform analyses, track scoring criteria.
					if (conditions){
						wordBoost = 1;
						if (!/^[a-z']+$/.test(word)){ // If the word doesn't contain only valid characters, analyze it, reformat to be valid.
			 				scorePunctuation(word); // "!", ":)",":(", etc., will effect the scoring of a word and the overall tweet.
			 				word = scoreCasing(word); // ALL CAPS make a word and its tweet more extreme (amplify whatever sentiment is present).
			 				word = suffixCheck(word); // Increase changes of making a hit against the wordBank by looking at suffixes.
						}
						if (wordBank[word]){ // Note that words that are already found in the wordBank won't be checked for suffixes
							scoreWord(word, i);
						}
					}	
				})
 			
 				// Look at combinations of a word with common suffixes to see if a match can be found. Will reassign word if a match, 
 				// with the suffix changes, is found.
				function suffixCheck(word){
					var suffs = ['s', 'd', 'er', 'ing', 'ful', 'ous', 'fully', 'er', 'ier', 'less']; // Common suffixes to check.
					var suf;
					for (var i = 0; i < suffs.length; i++){
						suf = suffs[i];
						if (wordBank[word + suf]){ // Check if the word plus the suffix is present in the DB. 
							word += suf; // If it is present, reassign word to what hit in the DB. Return true.
							return word;
						}
						var lastInd = word.lastIndexOf(suf);
						if (lastInd == word.length - suf.length){ // Check if the suffix is present in the word
							if (wordBank[word.substring(0, lastInd)]){ // Check if the word minus the suffix is present in the database
								word = word.substring(0, lastInd); // If it is present, reassign word to what hit in the DB. Return true.
								return word;
							}
						}
					}
					return word;
				}

 				// Flexible scoring template; works with either array or single number arguments, with a constant for ever member of the 
 				// object array. Presumes object.length == constant.length and constant[i] logically pairs with object[i].
 				function scoringTemplate(bases, constants){
 					if (bases.constructor === Array){ // If an array is passed, presume bases[0] goes with constants[0], etc. 
 						for (var i = 0; i < bases.length; i++){
 							bases[i] += constants[i]; // Adjust base up or down, according to how a word has scored in the analyses.
 						}
 					} else {
 						bases += constants;// This catches when a single value is passed to both arguments. 
 					}
 					return bases; 					  
 				}	

 				// Exclamation points or UTF-encoded emoticons will augment a word score. 
 				function scorePunctuation(word){
 					punc = word.replace(/[a-z']/gi,''); // Take only the punctuation, other than ', for analysis.

 					var temp = puncScoringWrapper(/!/g, [wordBoost, tweetBoost], [.15, .1]); // Boost extremeness of both word and overall tweet.
 					if (temp){ // Notice the need to use temp, as [A, B] = returnArrayFn(); is an invalid assignment.  						
	 					wordBoost  = temp[0]; 
	 					tweetBoost = temp[1];
 					}
 					temp = puncScoringWrapper(/\:\)|\=\)|\:,|\:\D|\<\3/g, [B, R], [50, -50]); // Increase blue, decrease red, for happies.
 					if (temp){	// if needed due to possible null returns.
	 					B = temp[0]; 
	 					R = temp[1];
 					}
 					temp = puncScoringWrapper(/\:\(|\=\(/g, [B, R], [-50, 50]); // Decrease blue, increase red, for sads.
 					if (temp){	// if needed due to possible null returns.
	 					B = temp[0]; 
	 					R = temp[1];
 					}

 					// This wrapper implements the scoring template, using the length of the regEx (length == how many matches were made 
 				    // against the regEx emoticons for a given word) as a multiplier for the constant, which will then be multiplied with 
                    // the numArray argument (which would be, for example, a [B, R] array).
	 				function puncScoringWrapper(regEx, numArray, constArray){
	 					var matches = punc.match(regEx);
	 					if (matches){
	 						return scoringTemplate(numArray, [constArray[0] * matches.length, constArray[1] * matches.length]);
	 					} else {
	 						return null; // If no regEx matches are made (very common), return null. This is why the if checks are needed
	 					}                // in scorePunctuationon when assigning temp via returns from puncScoringWrapper.
	 				}
 				}

 				// After a word is changed to only its letters and ', see if it is all caps. If so, increase scores for sentiment extremity.
 				function scoreCasing(word){
	 				word = word.match(/[a-z']+/gi); // Pull out only letters and ' from the word (returns null if none).
	 				if (word){
	 					word = word.join(''); // Chaining .join('') after .match() above looks nice, but possible null return from match == bad.	
 						var caps = word.match(/[A-Z']+/g); // Take only the all-caps letters from word (returns null if none.)
	 					if (caps && caps.length == word.length){ // This means it's all-caps.
	 						var temp   = scoringTemplate([wordBoost, tweetBoost], [(.05 * caps.length), (.02 * caps.length)]); //See next line...
	 						wordBoost  = temp[0];   // ...scoringTemplate here increases both word and tweet score boosters proportional to the 
	 						tweetBoost = temp[1];   // length of the all-cap word found. 
		 					word = word.toLowerCase(); 							
	 					}
	 				} else {
	 					word = "SKIP NULL." // A dummy setting. Makes sure a null value of word isn't scored in scoreWord below. 
	 				}
	 				return word; 						
 				}

 				// By the time a word has reached scoreWord, it's in the database, and all lowercased and with apostrophes. 
 				function scoreWord(word, i){
 					var score = 1;
 					negatorCheck();
					score *= wordBank[word] * 25 * wordBoost; // This where the scoring criteria get amalgamated into one score. 
					wordBank[word] > 0 ? wordScoringWrapper('posWords') : wordScoringWrapper('negWords'); 

					function negatorCheck(){
						if (i > 0){ // This checks a previous array entry, so make sure it doesn't look at an invalid index of -1 when i == 0
							var prevWord = tweetWords[i - 1];
							if (prevWord.substring(prevWord.length - 3, prevWord.length) == "n't"){ // For now, hard code "n't" as the negator.
								score *= -1; // Flip the score of a given word, if a negator precedes it.
							}
						}
					}				     

					function wordScoringWrapper(field){ // Wrapper stores words in either posWords or negWords, depending on score, then scores.
						stats[field].push({'word': word, 'score': wordBank[word]});//, 'EF': wordBoost * score}); // Word storage.
						var rbTemp = scoringTemplate([R, B], [-score, score]); // This is where scores go into the [R,B] arrray. Notice the role of
						R = rbTemp[0];                                         // negatorCheck(), here: if a negator was found, the score values 
						B = rbTemp[1];										   // are flipped, meaning that, what would have boosted blue, now 
					}				                                           // reduces it, and vice versa for red. 
				}
			}
 					
 				// Note that B is used for green pixels
			function scoreEntireTweet(){
				stats.mood = [R,B,B] // I considered using the ANEW wordbank, as it has trinary scoring, but simplified it to the binary AFINN.
				for (var i = 0; i < stats.mood.length; i++){                             // So, G gets lumped in with B as "positive sentiment."
					stats.mood[i] = (stats.mood[i] * tweetBoost).toFixed(0); // The final scoring occurs here. wordBoost has already been             
					if (stats.mood[i] > 255){								 // included in the final score within scoreWord. Representing 
						stats.mood[i] = 255;                                 // mood via RGB means the range will represented in the uint8 range, 
					}                                                        // so I cap the scores between 0 and 255. 
					if (stats.mood[i] < 0){
						stats.mood[i] = 0;                                   // The end result: A fully negative sentiment is expressed as [255,0,0],
					}                                                        // fully positive sentiment is [0,255,255], and ambiguous sentiments 
				}                                                            // form the grey/red/blue spectra. 
			}
		}
	}
}






	