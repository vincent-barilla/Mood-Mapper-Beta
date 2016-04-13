var util = require('util');

// Receive a JSON tweet and the "wordBanks" object, perform sentiment analysis on the tweet. 
// Analysis uses the AFINN word list, makes an RGB color using negative words to increase 
// R pixels and positive words to increase G and B pixels. 
this.analyze = function(tweet, wordBanks){
	// Choose the language for "wordBank".
	var wordBank = setWordBank();
	// The return from this call is ready to be parsed and used on the front end. 
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

	// Assigns all fields of the "result" object, which will have all the data needed for front end processes.
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

		// Grab some user data for front-end display.
		function setUser(){
			var user = {};
			user.id = tweet.user.id_str;
			user.name = tweet.user.screen_name;
			return user;
		}

		// The two-letter id's ('CO, UL') will assist in geocoding on the front end. It prioritizes the "tweet.coordinates"  
		// first, as this is the least ambiguous and most useful for geocoding data. "tweet.place" has the next best 
		// data. Location from a user's account is the weakest data and so is used as the last option (though is the most common case). 
		function setLocation(){
			var location = null;
			if (tweet.coordinates) {
				location = 'CO:' + (tweet.coordinates.coordinates).toString();
			} else if (tweet.place) {
				// Use the "if" checks to make sure the data exists before trying to add it, then add what is found. 
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
				// This uses whatever the user has on their profile for "Location." 
			 	location = 'UL:' + tweet.user.location; 		
			} 
			return location;
		}

 		// RGB(127,127,127), or gray, means there's no mood detected. All tweets start at this point. The analysis
 		// then increases or decreases R and GB to represent positivity (GB) vs. negativity (R). Any increase to one
 		// mood is equal to a decrease in the other mood: adding 10 to GB will necessitate subtracting 10 from R,
 		// and vice versa. "tweetBoost" and "wordBoost" indicate extremess of sentiment -- how many "!"'s occur and if 
 		// a word is in all caps.  Scoring is modularized; the comments below will give more details on each step.  
		function analyzeMood(){
			var R = 127;
			var B = 127;
			// 'mood' is a RGB array, 'posWords' and 'negWords' will contain all words of this tweet that were found in the AFINN list.
			var stats = {'mood': [], 'posWords': [], 'negWords': []}; 
			// The "-Boost" variables will amplify R,G, and B equally. If you see lighter gray tweets on the map, that comes 
			// from no positive nor negative words being found, then "!" or all-caps amplifying the default (127,127,127) values. 
			var tweetBoost = 1; 
			var wordBoost;
			// Tally up R and GB values, as well as "-Boost" scores, per each word in the tweet.  
			scoreIndividualWords(); 
			// Amalgamate all the scoring values into one mood for the entire tweet.
			scoreEntireTweet();
			// "tweetEF" track the "Extremeness Factor" of a tweet, as per "!" and all caps.
			stats.tweetEF = tweetBoost.toFixed(2); // May be a decimal, so truncate it to 2 spaces.                        
			return stats; 

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
						wordBoost = 1; // Used as a multiplier later, so initialize it as 1.
						// The test checks if the word will already be ok for "wordBank"'s format. If not, reformat, while scoring extra characters.
						if (!/^[a-z']+$/.test(word)){
							// Score and trim punctuation. Keep "'", since "'s" kept returning false positives when "'" was cut.
			 				scorePunctuation(word);
			 				// Scoring all-caps and set to lower cased. "word" is now all lower-cased letters and possibly "'".
			 				word = scoreCasing(word); 
						}
						// Check to see if "word" is in the database. If so, score it. 
						if (wordBank[word]){
							scoreWord(word, i); // "i" will be used to check if the previous word is a negator (such as "can't").
						}
						  // If the word wasn't found, see if adding/removing common suffixes will yield a match. Score the word, if so.  
						  else {
							scoreAfterSuffixCheck(word, i); 
						}
					}	
				})
 			
 				// If a word plus/minus suffixes is in "wordBank", score it. Note: I considered wrapping the two loops in helper 
 				// functions, but decided to leave it as is, so that the return statements will escape the function as soon as a
 				// match is found. 
				function scoreAfterSuffixCheck(word, i){
					var wordLen = word.length;
					// "j" is used so "i" will be preserved to send to "scoreWord" below.
					var j;
					// An array of possible suffix lengths. I can't think of any suffix lengths greather than 5, so I hard-coded
					// 1 through 5 for speedier processing. 
					var possibleLens = [1,2,3,4,5];
					// Generic name, as I'll reuse "loopMax" below.					
					var loopMax = possibleLens.length; // Here, "loopMax" goes by the length of "possibleLens."

					// The loop will keep checking the original word minus each suffix length, to see if there is a root word 
					// that would be found in the bank, even if the full word wasn't.
					for (j = 0; j < loopMax; j++){
						var wordRoot = word.substring(0, wordLen - possibleLens[j])
						if (wordBank[wordRoot]){ 
							scoreWord(wordRoot, i); // Score what was found in the bank.
							return; // Return from the function, if a scorable word was made here.
						}
					}
					// This loop checks if the word plus a suffix is in the bank. Placed after the root word loop as this will be 
					// more resource-intensive.															
					var suffs = ['s', 'd', 'er', 'ing', 'ers', 'ier', 'ful', 'ous', 'fully', 'ously'];
					var suf;
					loopMax = suffs.length; // Here, set "loopMax" to the length of "suffs".
					for (j = 0; j < loopMax; j++){
						suf = suffs[j];
						if (wordLen > 2){ // I had "as" be scored as "ass." This should prevent that. 
							if (wordBank[word + suf]){ // Check if "word" plus the suffix is present in the bank. 
								scoreWord((word + suf), i); // Score what was found in the bank.
								return; // Return from the function, if a scorable word was made here.
							}
						}
					}
				}

 				// Flexible scoring template. Presumes 'bases.length" = "constants.length" and the logic 
 				// of "constants[i]" pairs with "bases[i]". "bases" will be an array of the starting score 
 				// of some value (like R,G, or B), "constants" add to "bases" to boost the starting score. 
 				// For example: "scoringTemplate(R, -50) would mean "decrease R by 50." Or, 
 				// "scoringTemplate([R,B],[-50,50])" would mean, "decrease R by 50, then increase B by 50."
 				function scoringTemplate(bases, constants){
 					// If it's an array, apply a "constants" value to a "bases" value, one at a time. 
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

 				// Punctuation, "!", ":)", ":(", etc., will effect the scoring of a word and the overall tweet.
 				function scorePunctuation(word){
 					punc = word.replace(/[a-z']/gi,''); // Take only the punctuation, other than ', for analysis.

 					// "puncScoringWrapper" invokes "scoringTemplate", forms "constants" for "scoringTemplate"
 					// from multiplying both elements of its own third argument by the length of its own first argument.
 					var temp = puncScoringWrapper(/!/g, [wordBoost, tweetBoost], [.15, .1]);
 					if (temp){ 
 						// I tried an assignment like [wordBoost,tweetBoost] = puncScoring.... , but the 
 						// assignment was illegal, thus the need to split temp, here.	
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
	 						return scoringTemplate(numArray, [constArray[0] * matches.length, constArray[1] * matches.length]);
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
	 					if (caps && caps.length == word.length){ // All-caps words yield a "true" condition, here.
	 						// Scoring template uses "caps.length" to increase the constants passed to "scoringTemplate". 
	 						// (I forwent using a wrapper, here, because I'm only invoking the call to scoringTemplate once.) 
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

 				// By the time "word" has reached "scoreWord", it has been found in the database, and is all lowercased
 				// letters with possibly one or more apostrophes. 
 				function scoreWord(word, i){
 					// "score" will be multiplied by other constants, so is assigned as 1.
 					var score = 1;
 					// Presence of "n't" indicates the reverse sentiment of a word coming after it -- 
 					// For example: wordBank['hate'] * score //==> -4, but if "doesn't" comes before "hate", 
 					// now wordBank['hate'] * score //==> 4.
 					negatorCheck();
 					// Scoring criteria get lumped into one score. Note that "negatorCheck" may have flipped "score"'s +/- sign.
					score *= wordBank[word] * 25 * wordBoost; 
					// Use the +/- sign of the word to determine which input to give "wordScoringWrapper."
					wordBank[word] > 0 ? wordScoringWrapper('posWords') : wordScoringWrapper('negWords'); 

					// Flip the sign of a given score, if a negator precedes the word that generated it.
					function negatorCheck(){
						// The only time i !> 0 is for the first word of a tweet.
						if (i > 0){
							// Grab the word preceding the one that is currently being scored.
							var prevWord = tweetWords[i - 1];
							// Hard code "n't" as the only negator, for speed and simplicity.			
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






	