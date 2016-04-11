var util = require('util');

// Receive a JSON tweet and the wordBanks object, perform a sentiment analysis on the tweet. Refer to 
// Readme.md, "IV: Tweet Analysis Methodology" for a discussion on how I approached an inferred mood 
// came from this function. In short: it uses the AFINN wordbank, plus considerations for punctuation,
// and makes an RGB color array using negative words to increase R pixels, positive words to increase
// GB pixels. Returns its results ready to be used on the front end. 
this.analyze = function(tweet, wordBanks){
	var wordBank = setWordBank();
	var result = initResult();

	return result;

	// It hasn't been catching as many hits as I had been hoping, but there is a Spanish word list 
	// in wordBanks.
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

		// Note: 'text' MUST be first property of result to agree with front end string splitting & finding
		// what part of a result represents an isolated Tweet object in JSON. (See index.html. It uses 
		// JSON.parse(result))
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

		// Simple constructor to set the result.user field.
		function setUser(){
			var user         = {};
			user.description = tweet.user.description;
			user.id          = tweet.user.id_str;
			user.name        = tweet.user.screen_name;
			user.verified    = tweet.user.verified;
			return user;
		}

		// Assign a location string to the result. The two-letter id's ('CO, UL') will assist in 
		// geocoding on the front end. Note that I prioritize the tweet.coordinates first, as 
		// this is the least ambiguous, most useful for geocoding data. tweet.place has the next best 
		// data. Location from a user's account is often pretty poor as data (i.e., people will write 
	    // things like "waaaay out in $paaaace" for their location -- presumably not true, and definitely
	    // not easy to geocode). Still, a user's location will usually produce some result on the front end, 
		// and without this, very few tweets would be mappable. 
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

 		// RGB(127,127,127), or gray, means there's no mood detected. All tweets start at this point, 
 		// then the scoring increases or decreases R and GB in different amounts to represent positivity 
 		// vs. negativity, as well as extremeness of that sentiment. tweetBoost and wordBoost indicate 
 		// extremess of sentiment -- how many !'s occur, is it in all caps. They will amplify R,G, and B 
 		// equally (so you can get a very extreme, but not negative nor positive, tweet -- loud but 
 		// without content). R represents negativity, G and B, always equal to each other, represent
		// positivity.
 		// The actual scoring is done in scoreIndividualWords and scoreEntireTweet.  
		function analyzeMood(){
			var R = 127;
			var B = 127;
			var stats = {'mood': [], 'posWords': [], 'negWords': []}; 
			var tweetBoost = 1; 
			var wordBoost; 
			scoreIndividualWords(); 
			scoreEntireTweet(); 
			stats.tweetEF = tweetBoost.toFixed(2);                        
			return stats;

			// Split a tweet around ' ', run all words through a forEach loop, scoring them as it goes.
			function scoreIndividualWords(){
				var tweetWords = tweet.text.split(' ');
				tweetWords.forEach(function(word, i){

					// Gatekeeping conditions to cull irrelevant words. Separated from the if statement 
					// for readability.
					var conditions = (word.length > 2 				// Words must be 3 letters and up.
								    && word[0] != '@' 				// No usernames
								    && word.indexOf('http') == -1 	// No links
									&& word.indexOf('@') == -1 		// Really, no usernames! (nor emails)
									&& word != "\n" 				// No newline characters
									&& !(word.length == 3 && word[0] =='#')); // No 2-letter hashtags

					// If the conditions are met, see if the word fits db format. If not, normalize it, 
					// perform analyses, track scoring criteria.
					if (conditions){
						wordBoost = 1; // Used as a multiplier later, so initialize it as 1.

						// If the word doesn't contain only valid characters, analyze it, reformat to be valid.
						if (!/^[a-z']+$/.test(word)){
			 				scorePunctuation(word); 
			 				word = scoreCasing(word); 
			 				word = suffixCheck(word); 
						}

						// Check to see if the word is in the database. If so, score it. 
						if (wordBank[word]){
							scoreWord(word, i);
						}
					}	
				})
 			
 				// Look at combinations of a word with common suffixes to see if a match can be found. 
 				// Will reassign the variable word if a match, with the suffix changes, is found.
				function suffixCheck(word){
					var suffs = ['s', 'd', 'er', 'ing', 'ful', 'ous', 'fully', 'er', 'ier', 'less'];
					var suf;
					var i;
					var suffsLen = suffs.length;
					var wordLen = word.length;
					var lastInd;
					for (i = 0; i < suffsLen; i++){
						suf = suffs[i];
						if (wordBank[word + suf]){ // Check if the word plus the suffix is present in the DB. 
							word += suf; // If it is present, reassign word to what hit in the DB. Return true.
							return word;
						}
						lastInd = word.lastIndexOf(suf);
						// Check if the word minus the suffix is present in the database. If it is present,
						// reassign word to what hit in the DB. Return true.						
						if (lastInd == wordLen - suf.length){
							if (wordBank[word.substring(0, lastInd)]){ 
								word = word.substring(0, lastInd); 
								return word;
							}
						}
					}
					// If none of the above conditions were satisfied, return the word, unchanged.
					return word;
				}

 				// Flexible scoring template; presumes bases.length == constants.length and the logic 
 				// of constants[i] pairs with bases[i]. bases will be an array of the starting score 
 				// of some value (like R,G, or B), constants add to bases to boost the starting score. 
 				// For example: scoringTemplate(R, -50) would mean, "decrease R by 50." Or, 
 				// scoringTemplate([R,B],[-50,50]) would mean, "decrease R by 50, then increase B by 50."
 				function scoringTemplate(bases, constants){
 					if (bases.constructor === Array){
 						for (var i = 0; i < bases.length; i++){
 							bases[i] += constants[i];
 						}
 					} else {
 						bases += constants;
 					}
 					return bases; 					  
 				}	

 				// Punctuation, '!', ':)',':(', etc., will effect the scoring of a word and the overall tweet.
 				function scorePunctuation(word){
 					punc = word.replace(/[a-z']/gi,''); // Take only the punctuation, other than ', for analysis.

 					// puncScoringWrapper invokes scoringTemplate, forms the constants argument for 
 					// scoringTemplate from multiplying both its third arguments by the number of '!' found.
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

 					// The wrapper which checks the length of the regEx, uses it to incrase the constants
	 				function puncScoringWrapper(regEx, numArray, constArray){
	 					var matches = punc.match(regEx);
	 					if (matches){
	 						return scoringTemplate(numArray, [constArray[0] * matches.length, constArray[1] * matches.length]);
	 					} else {
	 						return null; 
	 					}              
	 				}
 				}

 				// After a word is changed to only its letters and ', see if it is all caps. If so, increase
 				// scores for extremeness
 				function scoreCasing(word){
	 				word = word.match(/[a-z']+/gi); 
	 				if (word){
	 					word = word.join(''); 	
 						var caps = word.match(/[A-Z']+/g); 
	 					if (caps && caps.length == word.length){ // This means it's all-caps.
	 						// Scoring template uses caps.length in incrase the constants passed to 
	 						// scoring Template, identical to puncScoringWrapper above.
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

 				// By the time a word has reached scoreWord, it's in the database, and is all lowercased
 				// letters and possibly one or more apostrophes. 
 				function scoreWord(word, i){
 					var score = 1;

 					// Present of "n't" indicates the reverse sentiment of a word coming after it -- 
 					// For example: wordBank['hate'] //==> -4, but if 'doesn't' comes before 'hate', 
 					// now wordBank['hate'] //==> 4.
 					negatorCheck();
					score *= wordBank[word] * 25 * wordBoost; // Scoring criteria get amalgamated into one score. 
					wordBank[word] > 0 ? wordScoringWrapper('posWords') : wordScoringWrapper('negWords'); 

					// Flip the sign of a given score, if a negator precedes the word that generated it.
					function negatorCheck(){
						if (i > 0){
							var prevWord = tweetWords[i - 1];
							// For now, hard code "n't" as the negator.			
							if (prevWord.substring(prevWord.length - 3, prevWord.length) == "n't"){
								score *= -1; 
							}
						}
					}		

					// wordScoringWrapper accepts either 'posWords' or 'negWords' as a field into stats, 
					// and pushes a word into stats[field].
					function wordScoringWrapper(field){ 
						stats[field].push({'word': word, 'score': wordBank[word]});
						var rbTemp = scoringTemplate([R, B], [-score, score]); 
						R = rbTemp[0]; // Note: R and B values are assigned here.                                        
						B = rbTemp[1];										 
					}				                                        
				}
			}
 					
 			// The final scoring occurs here. wordBoost Representing mood via RGB means the range 
 			// uwill represented in theint8 range, so I cap the scores between 0 and 255. The end 
 			// result: A fully negative sentiment is expressed as [255,0,0], fully positive sentiment 
 			// is [0,255,255], and ambiguous sentiments form the grey/red/blue/purple spectra. 
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






	