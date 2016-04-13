var util = require('util');

// Receive a JSON tweet and the "wordBanks" object, perform sentiment analysis on the tweet. 
// Analysis uses the AFINN word list, makes an RGB color using negative words to increase 
// R pixels and positive words to increase G and B pixels. 
this.analyze = function(tweet, wordBanks){
	// Choose the language for "wordBank".
	var wordBank = setWordBank();
	// The return from this call is ready to be used on the front end. 
	return initResult();

	// Choose "wordBank" based on the tweet's language. Defaults to English, if no language is listed. 
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

	// Assigns all fields of the "result" object.
	function initResult(){
		var result = {};
		// Note: 'text' MUST be first property of result to agree with front end string splitting. 
		if (tweet.text){
			result.text        = tweet.text;
			// "analyzeMood" is where the sentiment analysis occurs and the RGB color is formed. 
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

		// Grab some Twitter user data for front-end display.
		function setUser(){
			var user = {};
			user.id = tweet.user.id_str;
			user.name = tweet.user.screen_name;
			return user;
		}

		// The two-letter id's ('CO, UL') will assist in geocoding on the front end. It prioritizes the "tweet.coordinates"  
		// first, as this is the least ambiguous and most useful for geocoding data. "tweet.place" has the next best 
		// data. Location from a user's account gives the weakest data and so is used as the last option (though is the most common case). 
		function setLocation(){
			var location = null;
			if (tweet.coordinates) {
				location = 'CO:' + (tweet.coordinates.coordinates).toString();
			} else if (tweet.place) {
				// Use the "if" checks to make sure the data exists before trying to add it to the string, then add what is found. 
				// If "tweet.place" exists, there will at least be a "place.full_name" and "place.country".
				var street = "";
				if (tweet.place.attributes.street_address){
					street += tweet.place.attributes.street_address + ", ";
					if (tweet.place.attributes['623:id']){
						street += tweet.place.attributes['623:id'] + ", "; 
					}
				} 
				location = 'UL:' + street + tweet.place.full_name + ", " + tweet.place.country;
			} else if (tweet.user && tweet.user.location){
				// This uses whatever the user has on their profile for "location." 
			 	location = 'UL:' + tweet.user.location; 		
			} 
			return location;
		}

 		// RGB(127,127,127), or gray, means there's no mood detected. All tweets start at this point. The analysis
 		// then increases or decreases R and GB to represent positivity (GB) vs. negativity (R). Any change to one
 		// mood is equal and opposite to a change in the other mood: adding 10 to GB will necessitate subtracting 10 from R,
 		// and vice versa. "tweetBoost" and "wordBoost" indicate extremess of sentiment -- how many "!"'s occur and if 
 		// a word is in all caps. Scoring is modularized. The comments below will give more details on each step.  
		function analyzeMood(){
			var R = 127;
			var B = 127;
			// 'mood' is a RGB array, 'posWords' and 'negWords' will contain all words of this tweet that were found in the AFINN list.
			var stats = {'mood': [], 'posWords': [], 'negWords': []}; 
			// The "-Boost" variables will amplify R,G, and B equally. If you see lighter gray tweets on the map, that comes 
			// from no positive nor negative words being found, but "!" or all-caps still amplifying the default (127,127,127) values. 
			var tweetBoost = 1; 
			var wordBoost;
			// Tally up R and GB values, as well as "-Boost" scores, per each word in the tweet.  
			scoreIndividualWords(); 
			// Amalgamate all the scoring values into one mood for the entire tweet.
			scoreEntireTweet();
			// "tweetEF" track the "Extremeness Factor" of a tweet, as per "!" and all caps.
			stats.tweetEF = tweetBoost.toFixed(2); // May be a decimal, so truncate it to 2 spaces.                        
			return stats; 

			// Note: All scoring functions use "scoringTemplate", which is defined at the end of "analyzeMood", close to the end of this script.

			// Split this tweet around blank spaces to get its words, run all words through a "forEach" loop, score them as it goes.
			function scoreIndividualWords(){
				var tweetWords = tweet.text.split(' ');
				tweetWords.forEach(function(word, i){
					// Gatekeeping conditions to cull irrelevant words. Separated from the "if" statement below for readability.
					var conditions = (word.length > 2 				// Words must be 3 letters and up.
								    && word[0] != '@' 				// No usernames.
								    && word.indexOf('http') == -1 	// No links.
									&& word.indexOf('@') == -1 		// Really, no usernames! (Nor emails).
									&& word != "\n" 				// No newline characters.
									&& !(word.length == 3 && word[0] =='#')); // No 2-letter hashtags (#NY, for example).
					if (conditions){
						// "wordBoost" is used as a multiplier later, so initialize it as 1.
						wordBoost = 1; 
						// The test checks if the word will already be ok for "wordBank"'s format. If not, score punctuation, reformat.
						if (!/^[a-z']+$/.test(word)){
							// Score then cut punctuation. Keep "'", since "'s" kept returning false positives when "'" was cut.
			 				scorePunctuation(word);
			 				// Score all-caps and recase. "word" is now all lower-cased letters and possibly "'".
			 				word = scoreCasing(word); 
						}
						// Check to see if "word" is in the database. If so, score it. 
						if (wordBank[word]){
							scoreWord(word, i); // "i" will be used to check if the previous word is a negator (such as "can't").
						} else { // If the word wasn't found, see if adding/removing common suffixes will yield a match. Score the word, if so.  
							scoreAfterSuffixCheck(word, i); 
						}
					}	
				})	

 				// Punctuation, "!", ":)", ":(", etc., will effect the scoring of a word and the overall tweet.
 				function scorePunctuation(word){
 					punc = word.replace(/[a-z']/gi,''); // Take only the punctuation, other than "'", for analysis.
 					// "puncScoringWrapper" invokes "scoringTemplate", forms "constants" for "scoringTemplate"
 					// from multiplying both elements of its own third argument by the length of its own first argument.
 					var temp = puncScoringWrapper(/!/g, [wordBoost, tweetBoost], [.15, .1]);
 					if (temp){ 
 						// I tried an assignment like "[wordBoost,tweetBoost] = puncScoring...." , but the 
 						// assignment was illegal, thus the need to make two assignments from temp, here.	
	 					wordBoost = temp[0]; 
	 					tweetBoost = temp[1];
 					}
 					// Repeat the same for happy emojis.
 					temp = puncScoringWrapper(/\:\)|\=\)|\:,|\:\D|\<\3/g, [B, R], [50, -50]); 
 					if (temp){	
	 					B = temp[0]; 
	 					R = temp[1];
 					}
 					// Repeat for sad emojis.
 					temp = puncScoringWrapper(/\:\(|\=\(/g, [B, R], [-50, 50]); 
 					if (temp){	
	 					B = temp[0]; 
	 					R = temp[1];
 					}

 					// The wrapper checks the length of "regEx", uses it to increase the constants that it then feeds to 
 					// "scoringTemplate".
	 				function puncScoringWrapper(regEx, numArray, constArray){
	 					var matches = punc.match(regEx);
	 					if (matches){
		 					var len = matches.length;
	 						return scoringTemplate(numArray, [constArray[0] * len, constArray[1] * len]);
	 					} else {
	 						return null; 
	 					}              
	 				}
 				}

 				// After a word is changed to only its letters and "'", see if it is all caps. If so, increase "-Boost"
 				// scores for extremeness
 				function scoreCasing(word){
	 				word = word.match(/[a-z']+/gi);// This regexp keeps only upper- and lower-cased letters and "'". 
	 				if (word){
	 					word = word.join(''); 	
 						var caps = word.match(/[A-Z']+/g); // Take only the upper-cased-letters and "'" from "word".
	 					if (caps && caps.length == word.length){ // This checks if the word is all caps.
	 						// Scoring template uses "caps.length" to increase the constants passed to "scoringTemplate". 
	 						// (I forwent using a wrapper, here, because I'm only invoking "scoringTemplate" once.) 
	 						var temp   = scoringTemplate([wordBoost, tweetBoost], [(.05 * caps.length), (.02 * caps.length)]); 
	 						wordBoost  = temp[0];   
	 						tweetBoost = temp[1];   
		 					word = word.toLowerCase(); 							
	 					}
	 				} else {
	 					word = "SKIP NULL." // A dummy setting. Makes sure a null value of word isn't scored. 
	 				}
	 				return word; 						
 				}

 				// If a word plus/minus suffixes is in "wordBank", score it. Note: I considered wrapping the two "for" loops inside this  
 				// in helper functions, but decided to leave it as is, so that the return statements will escape the function as soon as a
 				// match is found. 
				function scoreAfterSuffixCheck(word, i){
					// Common suffixes to check.
					var suffs = ['s', 'd', 'er', 'ing', 'ful', 'ous', 'fully', 'er', 'ier'];
					// Initialize and/or assign all variables that will be updated frequently in the loop to speed processing. 
					var suffsLen = suffs.length;					
					var suf;
					// "j" is used so "i" will be preserved to send to "scoreWord" below.					
					var j;
					var wordLen = word.length;
					var lastInd;
					for (j = 0; j < suffsLen; j++){
						// "suf" is the suffix to add to the end of word for this check.
						suf = suffs[j];
						if (wordLen > 2){ // I had 'as' be scored as 'ass.' This should prevent that. 
							// Check if "word" plus the suffix is present in the bank.
							if (wordBank[word + suf]){  
								// Score the word plus suffix.
								scoreWord((word + suf), i); 
								// Return from the function, if a scorable word was made here.
								return; 
							}
						}
						// If the check above did not lead to a "return", check if the word minus the suffix is present in the bank.	
						lastInd = word.lastIndexOf(suf);
						// Note that, if the suffix wasn't in "word" at all, "lastInd" will equal -1, and this condition is false.				
						if (lastInd == wordLen - suf.length){
							// See if the word minus the suffix is in the bank. 
							if (wordBank[word.substring(0, lastInd)]){ 
								// Score the root word.
								scoreWord(word.substring(0, lastInd),i);
								// Return from the function, if a scorable word was made here. 
								return;
							}
						}
					}
				} 				

 				// By the time "word" has reached "scoreWord", it has been found in the database.
 				function scoreWord(word, i){
 					// "score" will be multiplied by other constants, so is defined as 1.
 					var score = 1;
 					// Presence of "n't" indicates the reverse sentiment of a word coming after it -- 
 					// For example: wordBank['hate'] * score //==> -4, but if "doesn't" comes before "hate", 
 					// now wordBank['hate'] * score //==> 4.
 					negatorCheck();
 					// Scoring criteria get lumped into one score. Note that "negatorCheck" may have flipped "score"'s +/- sign.
					score *= wordBank[word] * 25 * wordBoost; 
					// Use the +/- sign of the word to determine which input to give "wordScoringWrapper."
					wordBank[word] > 0 ? wordScoringWrapper('posWords') : wordScoringWrapper('negWords'); 

					// Flip the sign of a given word's score if a negator precedes the word.
					function negatorCheck(){
						// The only time i <= 0 is for the first word of a tweet.
						if (i > 0){
							// Grab the word preceding the one that is currently being scored.
							var prevWord = tweetWords[i - 1];
							// Hard code "n't" as the only negator, for speed and simplicity. See if the previous word ends in it.			
							if (prevWord.substring(prevWord.length - 3, prevWord.length) == "n't"){
								score *= -1; 
							}
						}
					}		

					// wordScoringWrapper accepts either "posWords" or "negWords" as a field into "stats", 
					// and pushes a word into "stats[field]" according to its score. Words with a score
					// of below 0 go into "newWords", words with a score above zero go into "posWords". 
					function wordScoringWrapper(field){ 
						stats[field].push({'word': word, 'score': wordBank[word]});
						var rbTemp = scoringTemplate([R, B], [-score, score]); 
						// Note: "R" and "B" are assigned only at the end of this process, after all scores have been integrated. 
						R = rbTemp[0];                                       
						B = rbTemp[1];										 
					}				                                        
				}

 				// Flexible scoring template used by all the scoring functions above. Presumes "bases.length" = "constants.length" 
 				// and the logic of "constants[i]" pairs with "bases[i]". "bases" will be an array of the starting score of some 
 				// value (like R,G, or B), "constants" add to "bases" to boost the starting score. For example: "scoringTemplate(R, -50)
 				//  would mean "decrease R by 50." Or, "scoringTemplate([R,B],[-50,50])" would mean, "decrease R by 50, then increase B by 50."
 				function scoringTemplate(bases, constants){
 					// If "bases" is an array, apply a "constants" value to a "bases" value, one at a time. 
 					if (bases.constructor === Array){
 						for (var i = 0; i < bases.length; i++){
 							bases[i] += constants[i];
 						}
 					} // If its not an array, it's a single value. Add the two. 
 					  else {
 						bases += constants;
 					}
 					return bases; 					  
 				}
			}			
 					
 			// The final scoring occurs here. Representing mood via RGB means the values must fall in the uint8 range,
 			// so I cap the scores between 0 and 255. The end result: A fully negative sentiment is expressed as [255,0,0],
 			// fully positive sentiment is [0,255,255], and ambiguous sentiments form the grey/red/blue/purple spectra. 
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






	