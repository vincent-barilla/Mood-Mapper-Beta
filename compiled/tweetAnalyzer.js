'use strict';

var util = require('util');

// Receive a JSON tweet and the "wordBanks" object, perform sentiment analysis on the tweet. 
// Analysis uses the AFINN word list, makes an RGB color using negative words to increase 
// R pixels and positive words to increase G and B pixels. 
undefined.analyze = function (tweet, wordBanks) {
	// Choose the language for "wordBank".
	var wordBank = setWordBank();
	// The return from this call is ready to be used on the front end. 
	return initResult();

	// Choose "wordBank" based on the tweet's language. Defaults to English, if no language is listed. 
	function setWordBank() {
		var wordBank = {};
		switch (tweet.lang) {
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
	function initResult() {
		var result = {};
		// Note: 'text' MUST be first property of result to agree with front end string splitting. 
		if (tweet.text) {
			result.text = tweet.text;
			// "analyzeMood" is where the sentiment analysis occurs and the RGB color is formed. 
			result.stats = analyzeMood();
			result.stats.time = tweet.created_at;
			result.stats.reach = tweet.user.followers_count;
			result.id = tweet.id_str;
			result.location = setLocation();
			result.user = setUser();
		} else {
			result = null;
		}
		return result;

		// Grab some Twitter user data for front-end display.
		function setUser() {
			var user = {};
			user.id = tweet.user.id_str;
			user.name = tweet.user.screen_name;
			return user;
		}

		// The two-letter id's ('CO, UL') will assist in geocoding on the front end. It prioritizes the "tweet.coordinates"  
		// first, as this is the least ambiguous and most useful for geocoding data. "tweet.place" has the next best 
		// data. Location from a user's account gives the weakest data and so is used as the last option (though is the most common case). 
		function setLocation() {
			var location = null;
			if (tweet.coordinates) {
				location = 'CO:' + tweet.coordinates.coordinates.toString();
			} else if (tweet.place) {
				// Use the "if" checks to make sure the data exists before trying to add it to the string, then add what is found. 
				// If "tweet.place" exists, there will at least be a "place.full_name" and "place.country".
				var street = "";
				if (tweet.place.attributes.street_address) {
					street += tweet.place.attributes.street_address + ", ";
					if (tweet.place.attributes['623:id']) {
						street += tweet.place.attributes['623:id'] + ", ";
					}
				}
				location = 'UL:' + street + tweet.place.full_name + ", " + tweet.place.country;
			} else if (tweet.user && tweet.user.location) {
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
		function analyzeMood() {
			var R = 127;
			var B = 127;
			// 'mood' is a RGB array, 'posWords' and 'negWords' will contain all words of this tweet that were found in the AFINN list.
			var stats = { 'mood': [], 'posWords': [], 'negWords': [] };
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
			function scoreIndividualWords() {
				var tweetWords = tweet.text.split(' ');
				tweetWords.forEach(function (word, i) {
					// Gatekeeping conditions to cull irrelevant words. Separated from the "if" statement below for readability.
					var conditions = word.length > 2 // Words must be 3 letters and up.
					&& word[0] != '@' // No usernames.
					&& word.indexOf('http') == -1 // No links.
					&& word.indexOf('@') == -1 // Really, no usernames! (Nor emails).
					&& word != "\n" // No newline characters.
					&& !(word.length == 3 && word[0] == '#'); // No 2-letter hashtags (#NY, for example).
					if (conditions) {
						// "wordBoost" is used as a multiplier later, so initialize it as 1.
						wordBoost = 1;
						// The test checks if the word will already be ok for "wordBank"'s format. If not, score punctuation, reformat.
						if (!/^[a-z']+$/.test(word)) {
							// Score then cut punctuation. Keep "'", since "'s" kept returning false positives when "'" was cut.
							scorePunctuation(word);
							// Score all-caps and recase. "word" is now all lower-cased letters and possibly "'".
							word = scoreCasing(word);
						}
						// Check to see if "word" is in the database. If so, score it. 
						if (wordBank[word]) {
							scoreWord(word, i); // "i" will be used to check if the previous word is a negator (such as "can't").
						} else {
							// If the word wasn't found, see if adding/removing common suffixes will yield a match. Score the word, if so.  
							scoreAfterSuffixCheck(word, i);
						}
					}
				});

				// Punctuation, "!", ":)", ":(", etc., will effect the scoring of a word and the overall tweet.
				function scorePunctuation(word) {
					punc = word.replace(/[a-z']/gi, ''); // Take only the punctuation, other than "'", for analysis.
					// "puncScoringWrapper" invokes "scoringTemplate", forms "constants" for "scoringTemplate"
					// from multiplying both elements of its own third argument by the length of its own first argument.
					var temp = puncScoringWrapper(/!/g, [wordBoost, tweetBoost], [.15, .1]);
					if (temp) {
						// I tried an assignment like "[wordBoost,tweetBoost] = puncScoring...." , but the 
						// assignment was illegal, thus the need to make two assignments from temp, here.	
						wordBoost = temp[0];
						tweetBoost = temp[1];
					}
					// Repeat the same for happy emojis.
					temp = puncScoringWrapper(/\:\)|\=\)|\:,|\:\D|\<\3/g, [B, R], [50, -50]);
					if (temp) {
						B = temp[0];
						R = temp[1];
					}
					// Repeat for sad emojis.
					temp = puncScoringWrapper(/\:\(|\=\(/g, [B, R], [-50, 50]);
					if (temp) {
						B = temp[0];
						R = temp[1];
					}

					// The wrapper checks the length of "regEx", uses it to increase the constants that it then feeds to 
					// "scoringTemplate".
					function puncScoringWrapper(regEx, numArray, constArray) {
						var matches = punc.match(regEx);
						if (matches) {
							var len = matches.length;
							return scoringTemplate(numArray, [constArray[0] * len, constArray[1] * len]);
						} else {
							return null;
						}
					}
				}

				// After a word is changed to only its letters and "'", see if it is all caps. If so, increase "-Boost"
				// scores for extremeness
				function scoreCasing(word) {
					word = word.match(/[a-z']+/gi); // This regexp keeps only upper- and lower-cased letters and "'". 
					if (word) {
						word = word.join('');
						var caps = word.match(/[A-Z']+/g); // Take only the upper-cased-letters and "'" from "word".
						if (caps && caps.length == word.length) {
							// This checks if the word is all caps.
							// Scoring template uses "caps.length" to increase the constants passed to "scoringTemplate". 
							// (I forwent using a wrapper, here, because I'm only invoking "scoringTemplate" once.) 
							var temp = scoringTemplate([wordBoost, tweetBoost], [.05 * caps.length, .02 * caps.length]);
							wordBoost = temp[0];
							tweetBoost = temp[1];
							word = word.toLowerCase();
						}
					} else {
						word = "SKIP NULL."; // A dummy setting. Makes sure a null value of word isn't scored. 
					}
					return word;
				}

				// If a word plus/minus suffixes is in "wordBank", score it. Note: I considered wrapping the two "for" loops inside this  
				// in helper functions, but decided to leave it as is, so that the return statements will escape the function as soon as a
				// match is found. 
				function scoreAfterSuffixCheck(word, i) {
					// Common suffixes to check.
					var suffs = ['s', 'd', 'er', 'ing', 'ful', 'ous', 'fully', 'er', 'ier'];
					// Initialize and/or assign all variables that will be updated frequently in the loop to speed processing. 
					var suffsLen = suffs.length;
					var suf;
					// "j" is used so "i" will be preserved to send to "scoreWord" below.					
					var j;
					var wordLen = word.length;
					var lastInd;
					for (j = 0; j < suffsLen; j++) {
						// "suf" is the suffix to add to the end of word for this check.
						suf = suffs[j];
						if (wordLen > 2) {
							// I had 'as' be scored as 'ass.' This should prevent that. 
							// Check if "word" plus the suffix is present in the bank.
							if (wordBank[word + suf]) {
								// Score the word plus suffix.
								scoreWord(word + suf, i);
								// Return from the function, if a scorable word was made here.
								return;
							}
						}
						// If the check above did not lead to a "return", check if the word minus the suffix is present in the bank.	
						lastInd = word.lastIndexOf(suf);
						// Note that, if the suffix wasn't in "word" at all, "lastInd" will equal -1, and this condition is false.				
						if (lastInd == wordLen - suf.length) {
							// See if the word minus the suffix is in the bank. 
							if (wordBank[word.substring(0, lastInd)]) {
								// Score the root word.
								scoreWord(word.substring(0, lastInd), i);
								// Return from the function, if a scorable word was made here. 
								return;
							}
						}
					}
				}

				// By the time "word" has reached "scoreWord", it has been found in the database.
				function scoreWord(word, i) {
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
					function negatorCheck() {
						// The only time i <= 0 is for the first word of a tweet.
						if (i > 0) {
							// Grab the word preceding the one that is currently being scored.
							var prevWord = tweetWords[i - 1];
							// Hard code "n't" as the only negator, for speed and simplicity. See if the previous word ends in it.			
							if (prevWord.substring(prevWord.length - 3, prevWord.length) == "n't") {
								score *= -1;
							}
						}
					}

					// wordScoringWrapper accepts either "posWords" or "negWords" as a field into "stats", 
					// and pushes a word into "stats[field]" according to its score. Words with a score
					// of below 0 go into "newWords", words with a score above zero go into "posWords". 
					function wordScoringWrapper(field) {
						stats[field].push({ 'word': word, 'score': wordBank[word] });
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
				function scoringTemplate(bases, constants) {
					// If "bases" is an array, apply a "constants" value to a "bases" value, one at a time. 
					if (bases.constructor === Array) {
						for (var i = 0; i < bases.length; i++) {
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
			function scoreEntireTweet() {
				stats.mood = [R, B, B];
				for (var i = 0; i < stats.mood.length; i++) {
					stats.mood[i] = (stats.mood[i] * tweetBoost).toFixed(0);
					if (stats.mood[i] > 255) {
						stats.mood[i] = 255;
					}
					if (stats.mood[i] < 0) {
						stats.mood[i] = 0;
					}
				}
			}
		}
	}
};
//# sourceMappingURL=data:application/json;base64,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RDtBQUNEO0FBQ0Q7QUFDRCxDQXpTRCIsImZpbGUiOiJ0d2VldEFuYWx5emVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG5cbi8vIFJlY2VpdmUgYSBKU09OIHR3ZWV0IGFuZCB0aGUgXCJ3b3JkQmFua3NcIiBvYmplY3QsIHBlcmZvcm0gc2VudGltZW50IGFuYWx5c2lzIG9uIHRoZSB0d2VldC4gXG4vLyBBbmFseXNpcyB1c2VzIHRoZSBBRklOTiB3b3JkIGxpc3QsIG1ha2VzIGFuIFJHQiBjb2xvciB1c2luZyBuZWdhdGl2ZSB3b3JkcyB0byBpbmNyZWFzZSBcbi8vIFIgcGl4ZWxzIGFuZCBwb3NpdGl2ZSB3b3JkcyB0byBpbmNyZWFzZSBHIGFuZCBCIHBpeGVscy4gXG50aGlzLmFuYWx5emUgPSBmdW5jdGlvbih0d2VldCwgd29yZEJhbmtzKXtcblx0Ly8gQ2hvb3NlIHRoZSBsYW5ndWFnZSBmb3IgXCJ3b3JkQmFua1wiLlxuXHR2YXIgd29yZEJhbmsgPSBzZXRXb3JkQmFuaygpO1xuXHQvLyBUaGUgcmV0dXJuIGZyb20gdGhpcyBjYWxsIGlzIHJlYWR5IHRvIGJlIHVzZWQgb24gdGhlIGZyb250IGVuZC4gXG5cdHJldHVybiBpbml0UmVzdWx0KCk7XG5cblx0Ly8gQ2hvb3NlIFwid29yZEJhbmtcIiBiYXNlZCBvbiB0aGUgdHdlZXQncyBsYW5ndWFnZS4gRGVmYXVsdHMgdG8gRW5nbGlzaCwgaWYgbm8gbGFuZ3VhZ2UgaXMgbGlzdGVkLiBcblx0ZnVuY3Rpb24gc2V0V29yZEJhbmsoKXtcblx0XHR2YXIgd29yZEJhbmsgPSB7fTtcblx0XHRzd2l0Y2ggKHR3ZWV0Lmxhbmcpe1xuXHRcdFx0Y2FzZSAnc3AnOlxuXHRcdFx0XHR3b3JkQmFuayA9IHdvcmRCYW5rcy5zcGFuaXNoO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2VuJzpcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHdvcmRCYW5rID0gd29yZEJhbmtzLmVuZ2xpc2g7IFxuXHRcdH1cblx0XHRyZXR1cm4gd29yZEJhbms7XHRcdFxuXHR9XG5cblx0Ly8gQXNzaWducyBhbGwgZmllbGRzIG9mIHRoZSBcInJlc3VsdFwiIG9iamVjdC5cblx0ZnVuY3Rpb24gaW5pdFJlc3VsdCgpe1xuXHRcdHZhciByZXN1bHQgPSB7fTtcblx0XHQvLyBOb3RlOiAndGV4dCcgTVVTVCBiZSBmaXJzdCBwcm9wZXJ0eSBvZiByZXN1bHQgdG8gYWdyZWUgd2l0aCBmcm9udCBlbmQgc3RyaW5nIHNwbGl0dGluZy4gXG5cdFx0aWYgKHR3ZWV0LnRleHQpe1xuXHRcdFx0cmVzdWx0LnRleHQgICAgICAgID0gdHdlZXQudGV4dDtcblx0XHRcdC8vIFwiYW5hbHl6ZU1vb2RcIiBpcyB3aGVyZSB0aGUgc2VudGltZW50IGFuYWx5c2lzIG9jY3VycyBhbmQgdGhlIFJHQiBjb2xvciBpcyBmb3JtZWQuIFxuXHRcdFx0cmVzdWx0LnN0YXRzICAgICAgID0gYW5hbHl6ZU1vb2QoKTtcblx0XHRcdHJlc3VsdC5zdGF0cy50aW1lICA9IHR3ZWV0LmNyZWF0ZWRfYXQ7XHRcdFx0XHRcblx0XHRcdHJlc3VsdC5zdGF0cy5yZWFjaCA9IHR3ZWV0LnVzZXIuZm9sbG93ZXJzX2NvdW50O1x0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XG5cdFx0XHRyZXN1bHQuaWQgICAgICAgICAgPSB0d2VldC5pZF9zdHI7XG5cdFx0XHRyZXN1bHQubG9jYXRpb24gICAgPSBzZXRMb2NhdGlvbigpO1xuXHRcdFx0cmVzdWx0LnVzZXIgICAgICAgID0gc2V0VXNlcigpO1x0XHRcdFx0IFxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHQgPSBudWxsO1x0XHRcdCBcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblxuXHRcdC8vIEdyYWIgc29tZSBUd2l0dGVyIHVzZXIgZGF0YSBmb3IgZnJvbnQtZW5kIGRpc3BsYXkuXG5cdFx0ZnVuY3Rpb24gc2V0VXNlcigpe1xuXHRcdFx0dmFyIHVzZXIgPSB7fTtcblx0XHRcdHVzZXIuaWQgPSB0d2VldC51c2VyLmlkX3N0cjtcblx0XHRcdHVzZXIubmFtZSA9IHR3ZWV0LnVzZXIuc2NyZWVuX25hbWU7XG5cdFx0XHRyZXR1cm4gdXNlcjtcblx0XHR9XG5cblx0XHQvLyBUaGUgdHdvLWxldHRlciBpZCdzICgnQ08sIFVMJykgd2lsbCBhc3Npc3QgaW4gZ2VvY29kaW5nIG9uIHRoZSBmcm9udCBlbmQuIEl0IHByaW9yaXRpemVzIHRoZSBcInR3ZWV0LmNvb3JkaW5hdGVzXCIgIFxuXHRcdC8vIGZpcnN0LCBhcyB0aGlzIGlzIHRoZSBsZWFzdCBhbWJpZ3VvdXMgYW5kIG1vc3QgdXNlZnVsIGZvciBnZW9jb2RpbmcgZGF0YS4gXCJ0d2VldC5wbGFjZVwiIGhhcyB0aGUgbmV4dCBiZXN0IFxuXHRcdC8vIGRhdGEuIExvY2F0aW9uIGZyb20gYSB1c2VyJ3MgYWNjb3VudCBnaXZlcyB0aGUgd2Vha2VzdCBkYXRhIGFuZCBzbyBpcyB1c2VkIGFzIHRoZSBsYXN0IG9wdGlvbiAodGhvdWdoIGlzIHRoZSBtb3N0IGNvbW1vbiBjYXNlKS4gXG5cdFx0ZnVuY3Rpb24gc2V0TG9jYXRpb24oKXtcblx0XHRcdHZhciBsb2NhdGlvbiA9IG51bGw7XG5cdFx0XHRpZiAodHdlZXQuY29vcmRpbmF0ZXMpIHtcblx0XHRcdFx0bG9jYXRpb24gPSAnQ086JyArICh0d2VldC5jb29yZGluYXRlcy5jb29yZGluYXRlcykudG9TdHJpbmcoKTtcblx0XHRcdH0gZWxzZSBpZiAodHdlZXQucGxhY2UpIHtcblx0XHRcdFx0Ly8gVXNlIHRoZSBcImlmXCIgY2hlY2tzIHRvIG1ha2Ugc3VyZSB0aGUgZGF0YSBleGlzdHMgYmVmb3JlIHRyeWluZyB0byBhZGQgaXQgdG8gdGhlIHN0cmluZywgdGhlbiBhZGQgd2hhdCBpcyBmb3VuZC4gXG5cdFx0XHRcdC8vIElmIFwidHdlZXQucGxhY2VcIiBleGlzdHMsIHRoZXJlIHdpbGwgYXQgbGVhc3QgYmUgYSBcInBsYWNlLmZ1bGxfbmFtZVwiIGFuZCBcInBsYWNlLmNvdW50cnlcIi5cblx0XHRcdFx0dmFyIHN0cmVldCA9IFwiXCI7XG5cdFx0XHRcdGlmICh0d2VldC5wbGFjZS5hdHRyaWJ1dGVzLnN0cmVldF9hZGRyZXNzKXtcblx0XHRcdFx0XHRzdHJlZXQgKz0gdHdlZXQucGxhY2UuYXR0cmlidXRlcy5zdHJlZXRfYWRkcmVzcyArIFwiLCBcIjtcblx0XHRcdFx0XHRpZiAodHdlZXQucGxhY2UuYXR0cmlidXRlc1snNjIzOmlkJ10pe1xuXHRcdFx0XHRcdFx0c3RyZWV0ICs9IHR3ZWV0LnBsYWNlLmF0dHJpYnV0ZXNbJzYyMzppZCddICsgXCIsIFwiOyBcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gXG5cdFx0XHRcdGxvY2F0aW9uID0gJ1VMOicgKyBzdHJlZXQgKyB0d2VldC5wbGFjZS5mdWxsX25hbWUgKyBcIiwgXCIgKyB0d2VldC5wbGFjZS5jb3VudHJ5O1xuXHRcdFx0fSBlbHNlIGlmICh0d2VldC51c2VyICYmIHR3ZWV0LnVzZXIubG9jYXRpb24pe1xuXHRcdFx0XHQvLyBUaGlzIHVzZXMgd2hhdGV2ZXIgdGhlIHVzZXIgaGFzIG9uIHRoZWlyIHByb2ZpbGUgZm9yIFwibG9jYXRpb24uXCIgXG5cdFx0XHQgXHRsb2NhdGlvbiA9ICdVTDonICsgdHdlZXQudXNlci5sb2NhdGlvbjsgXHRcdFxuXHRcdFx0fSBcblx0XHRcdHJldHVybiBsb2NhdGlvbjtcblx0XHR9XG5cbiBcdFx0Ly8gUkdCKDEyNywxMjcsMTI3KSwgb3IgZ3JheSwgbWVhbnMgdGhlcmUncyBubyBtb29kIGRldGVjdGVkLiBBbGwgdHdlZXRzIHN0YXJ0IGF0IHRoaXMgcG9pbnQuIFRoZSBhbmFseXNpc1xuIFx0XHQvLyB0aGVuIGluY3JlYXNlcyBvciBkZWNyZWFzZXMgUiBhbmQgR0IgdG8gcmVwcmVzZW50IHBvc2l0aXZpdHkgKEdCKSB2cy4gbmVnYXRpdml0eSAoUikuIEFueSBjaGFuZ2UgdG8gb25lXG4gXHRcdC8vIG1vb2QgaXMgZXF1YWwgYW5kIG9wcG9zaXRlIHRvIGEgY2hhbmdlIGluIHRoZSBvdGhlciBtb29kOiBhZGRpbmcgMTAgdG8gR0Igd2lsbCBuZWNlc3NpdGF0ZSBzdWJ0cmFjdGluZyAxMCBmcm9tIFIsXG4gXHRcdC8vIGFuZCB2aWNlIHZlcnNhLiBcInR3ZWV0Qm9vc3RcIiBhbmQgXCJ3b3JkQm9vc3RcIiBpbmRpY2F0ZSBleHRyZW1lc3Mgb2Ygc2VudGltZW50IC0tIGhvdyBtYW55IFwiIVwiJ3Mgb2NjdXIgYW5kIGlmIFxuIFx0XHQvLyBhIHdvcmQgaXMgaW4gYWxsIGNhcHMuIFNjb3JpbmcgaXMgbW9kdWxhcml6ZWQuIFRoZSBjb21tZW50cyBiZWxvdyB3aWxsIGdpdmUgbW9yZSBkZXRhaWxzIG9uIGVhY2ggc3RlcC4gIFxuXHRcdGZ1bmN0aW9uIGFuYWx5emVNb29kKCl7XG5cdFx0XHR2YXIgUiA9IDEyNztcblx0XHRcdHZhciBCID0gMTI3O1xuXHRcdFx0Ly8gJ21vb2QnIGlzIGEgUkdCIGFycmF5LCAncG9zV29yZHMnIGFuZCAnbmVnV29yZHMnIHdpbGwgY29udGFpbiBhbGwgd29yZHMgb2YgdGhpcyB0d2VldCB0aGF0IHdlcmUgZm91bmQgaW4gdGhlIEFGSU5OIGxpc3QuXG5cdFx0XHR2YXIgc3RhdHMgPSB7J21vb2QnOiBbXSwgJ3Bvc1dvcmRzJzogW10sICduZWdXb3Jkcyc6IFtdfTsgXG5cdFx0XHQvLyBUaGUgXCItQm9vc3RcIiB2YXJpYWJsZXMgd2lsbCBhbXBsaWZ5IFIsRywgYW5kIEIgZXF1YWxseS4gSWYgeW91IHNlZSBsaWdodGVyIGdyYXkgdHdlZXRzIG9uIHRoZSBtYXAsIHRoYXQgY29tZXMgXG5cdFx0XHQvLyBmcm9tIG5vIHBvc2l0aXZlIG5vciBuZWdhdGl2ZSB3b3JkcyBiZWluZyBmb3VuZCwgYnV0IFwiIVwiIG9yIGFsbC1jYXBzIHN0aWxsIGFtcGxpZnlpbmcgdGhlIGRlZmF1bHQgKDEyNywxMjcsMTI3KSB2YWx1ZXMuIFxuXHRcdFx0dmFyIHR3ZWV0Qm9vc3QgPSAxOyBcblx0XHRcdHZhciB3b3JkQm9vc3Q7XG5cdFx0XHQvLyBUYWxseSB1cCBSIGFuZCBHQiB2YWx1ZXMsIGFzIHdlbGwgYXMgXCItQm9vc3RcIiBzY29yZXMsIHBlciBlYWNoIHdvcmQgaW4gdGhlIHR3ZWV0LiAgXG5cdFx0XHRzY29yZUluZGl2aWR1YWxXb3JkcygpOyBcblx0XHRcdC8vIEFtYWxnYW1hdGUgYWxsIHRoZSBzY29yaW5nIHZhbHVlcyBpbnRvIG9uZSBtb29kIGZvciB0aGUgZW50aXJlIHR3ZWV0LlxuXHRcdFx0c2NvcmVFbnRpcmVUd2VldCgpO1xuXHRcdFx0Ly8gXCJ0d2VldEVGXCIgdHJhY2sgdGhlIFwiRXh0cmVtZW5lc3MgRmFjdG9yXCIgb2YgYSB0d2VldCwgYXMgcGVyIFwiIVwiIGFuZCBhbGwgY2Fwcy5cblx0XHRcdHN0YXRzLnR3ZWV0RUYgPSB0d2VldEJvb3N0LnRvRml4ZWQoMik7IC8vIE1heSBiZSBhIGRlY2ltYWwsIHNvIHRydW5jYXRlIGl0IHRvIDIgc3BhY2VzLiAgICAgICAgICAgICAgICAgICAgICAgIFxuXHRcdFx0cmV0dXJuIHN0YXRzOyBcblxuXHRcdFx0Ly8gTm90ZTogQWxsIHNjb3JpbmcgZnVuY3Rpb25zIHVzZSBcInNjb3JpbmdUZW1wbGF0ZVwiLCB3aGljaCBpcyBkZWZpbmVkIGF0IHRoZSBlbmQgb2YgXCJhbmFseXplTW9vZFwiLCBjbG9zZSB0byB0aGUgZW5kIG9mIHRoaXMgc2NyaXB0LlxuXG5cdFx0XHQvLyBTcGxpdCB0aGlzIHR3ZWV0IGFyb3VuZCBibGFuayBzcGFjZXMgdG8gZ2V0IGl0cyB3b3JkcywgcnVuIGFsbCB3b3JkcyB0aHJvdWdoIGEgXCJmb3JFYWNoXCIgbG9vcCwgc2NvcmUgdGhlbSBhcyBpdCBnb2VzLlxuXHRcdFx0ZnVuY3Rpb24gc2NvcmVJbmRpdmlkdWFsV29yZHMoKXtcblx0XHRcdFx0dmFyIHR3ZWV0V29yZHMgPSB0d2VldC50ZXh0LnNwbGl0KCcgJyk7XG5cdFx0XHRcdHR3ZWV0V29yZHMuZm9yRWFjaChmdW5jdGlvbih3b3JkLCBpKXtcblx0XHRcdFx0XHQvLyBHYXRla2VlcGluZyBjb25kaXRpb25zIHRvIGN1bGwgaXJyZWxldmFudCB3b3Jkcy4gU2VwYXJhdGVkIGZyb20gdGhlIFwiaWZcIiBzdGF0ZW1lbnQgYmVsb3cgZm9yIHJlYWRhYmlsaXR5LlxuXHRcdFx0XHRcdHZhciBjb25kaXRpb25zID0gKHdvcmQubGVuZ3RoID4gMiBcdFx0XHRcdC8vIFdvcmRzIG11c3QgYmUgMyBsZXR0ZXJzIGFuZCB1cC5cblx0XHRcdFx0XHRcdFx0XHQgICAgJiYgd29yZFswXSAhPSAnQCcgXHRcdFx0XHQvLyBObyB1c2VybmFtZXMuXG5cdFx0XHRcdFx0XHRcdFx0ICAgICYmIHdvcmQuaW5kZXhPZignaHR0cCcpID09IC0xIFx0Ly8gTm8gbGlua3MuXG5cdFx0XHRcdFx0XHRcdFx0XHQmJiB3b3JkLmluZGV4T2YoJ0AnKSA9PSAtMSBcdFx0Ly8gUmVhbGx5LCBubyB1c2VybmFtZXMhIChOb3IgZW1haWxzKS5cblx0XHRcdFx0XHRcdFx0XHRcdCYmIHdvcmQgIT0gXCJcXG5cIiBcdFx0XHRcdC8vIE5vIG5ld2xpbmUgY2hhcmFjdGVycy5cblx0XHRcdFx0XHRcdFx0XHRcdCYmICEod29yZC5sZW5ndGggPT0gMyAmJiB3b3JkWzBdID09JyMnKSk7IC8vIE5vIDItbGV0dGVyIGhhc2h0YWdzICgjTlksIGZvciBleGFtcGxlKS5cblx0XHRcdFx0XHRpZiAoY29uZGl0aW9ucyl7XG5cdFx0XHRcdFx0XHQvLyBcIndvcmRCb29zdFwiIGlzIHVzZWQgYXMgYSBtdWx0aXBsaWVyIGxhdGVyLCBzbyBpbml0aWFsaXplIGl0IGFzIDEuXG5cdFx0XHRcdFx0XHR3b3JkQm9vc3QgPSAxOyBcblx0XHRcdFx0XHRcdC8vIFRoZSB0ZXN0IGNoZWNrcyBpZiB0aGUgd29yZCB3aWxsIGFscmVhZHkgYmUgb2sgZm9yIFwid29yZEJhbmtcIidzIGZvcm1hdC4gSWYgbm90LCBzY29yZSBwdW5jdHVhdGlvbiwgcmVmb3JtYXQuXG5cdFx0XHRcdFx0XHRpZiAoIS9eW2EteiddKyQvLnRlc3Qod29yZCkpe1xuXHRcdFx0XHRcdFx0XHQvLyBTY29yZSB0aGVuIGN1dCBwdW5jdHVhdGlvbi4gS2VlcCBcIidcIiwgc2luY2UgXCInc1wiIGtlcHQgcmV0dXJuaW5nIGZhbHNlIHBvc2l0aXZlcyB3aGVuIFwiJ1wiIHdhcyBjdXQuXG5cdFx0XHQgXHRcdFx0XHRzY29yZVB1bmN0dWF0aW9uKHdvcmQpO1xuXHRcdFx0IFx0XHRcdFx0Ly8gU2NvcmUgYWxsLWNhcHMgYW5kIHJlY2FzZS4gXCJ3b3JkXCIgaXMgbm93IGFsbCBsb3dlci1jYXNlZCBsZXR0ZXJzIGFuZCBwb3NzaWJseSBcIidcIi5cblx0XHRcdCBcdFx0XHRcdHdvcmQgPSBzY29yZUNhc2luZyh3b3JkKTsgXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvLyBDaGVjayB0byBzZWUgaWYgXCJ3b3JkXCIgaXMgaW4gdGhlIGRhdGFiYXNlLiBJZiBzbywgc2NvcmUgaXQuIFxuXHRcdFx0XHRcdFx0aWYgKHdvcmRCYW5rW3dvcmRdKXtcblx0XHRcdFx0XHRcdFx0c2NvcmVXb3JkKHdvcmQsIGkpOyAvLyBcImlcIiB3aWxsIGJlIHVzZWQgdG8gY2hlY2sgaWYgdGhlIHByZXZpb3VzIHdvcmQgaXMgYSBuZWdhdG9yIChzdWNoIGFzIFwiY2FuJ3RcIikuXG5cdFx0XHRcdFx0XHR9IGVsc2UgeyAvLyBJZiB0aGUgd29yZCB3YXNuJ3QgZm91bmQsIHNlZSBpZiBhZGRpbmcvcmVtb3ZpbmcgY29tbW9uIHN1ZmZpeGVzIHdpbGwgeWllbGQgYSBtYXRjaC4gU2NvcmUgdGhlIHdvcmQsIGlmIHNvLiAgXG5cdFx0XHRcdFx0XHRcdHNjb3JlQWZ0ZXJTdWZmaXhDaGVjayh3b3JkLCBpKTsgXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVx0XG5cdFx0XHRcdH0pXHRcblxuIFx0XHRcdFx0Ly8gUHVuY3R1YXRpb24sIFwiIVwiLCBcIjopXCIsIFwiOihcIiwgZXRjLiwgd2lsbCBlZmZlY3QgdGhlIHNjb3Jpbmcgb2YgYSB3b3JkIGFuZCB0aGUgb3ZlcmFsbCB0d2VldC5cbiBcdFx0XHRcdGZ1bmN0aW9uIHNjb3JlUHVuY3R1YXRpb24od29yZCl7XG4gXHRcdFx0XHRcdHB1bmMgPSB3b3JkLnJlcGxhY2UoL1thLXonXS9naSwnJyk7IC8vIFRha2Ugb25seSB0aGUgcHVuY3R1YXRpb24sIG90aGVyIHRoYW4gXCInXCIsIGZvciBhbmFseXNpcy5cbiBcdFx0XHRcdFx0Ly8gXCJwdW5jU2NvcmluZ1dyYXBwZXJcIiBpbnZva2VzIFwic2NvcmluZ1RlbXBsYXRlXCIsIGZvcm1zIFwiY29uc3RhbnRzXCIgZm9yIFwic2NvcmluZ1RlbXBsYXRlXCJcbiBcdFx0XHRcdFx0Ly8gZnJvbSBtdWx0aXBseWluZyBib3RoIGVsZW1lbnRzIG9mIGl0cyBvd24gdGhpcmQgYXJndW1lbnQgYnkgdGhlIGxlbmd0aCBvZiBpdHMgb3duIGZpcnN0IGFyZ3VtZW50LlxuIFx0XHRcdFx0XHR2YXIgdGVtcCA9IHB1bmNTY29yaW5nV3JhcHBlcigvIS9nLCBbd29yZEJvb3N0LCB0d2VldEJvb3N0XSwgWy4xNSwgLjFdKTtcbiBcdFx0XHRcdFx0aWYgKHRlbXApeyBcbiBcdFx0XHRcdFx0XHQvLyBJIHRyaWVkIGFuIGFzc2lnbm1lbnQgbGlrZSBcIlt3b3JkQm9vc3QsdHdlZXRCb29zdF0gPSBwdW5jU2NvcmluZy4uLi5cIiAsIGJ1dCB0aGUgXG4gXHRcdFx0XHRcdFx0Ly8gYXNzaWdubWVudCB3YXMgaWxsZWdhbCwgdGh1cyB0aGUgbmVlZCB0byBtYWtlIHR3byBhc3NpZ25tZW50cyBmcm9tIHRlbXAsIGhlcmUuXHRcblx0IFx0XHRcdFx0XHR3b3JkQm9vc3QgPSB0ZW1wWzBdOyBcblx0IFx0XHRcdFx0XHR0d2VldEJvb3N0ID0gdGVtcFsxXTtcbiBcdFx0XHRcdFx0fVxuIFx0XHRcdFx0XHQvLyBSZXBlYXQgdGhlIHNhbWUgZm9yIGhhcHB5IGVtb2ppcy5cbiBcdFx0XHRcdFx0dGVtcCA9IHB1bmNTY29yaW5nV3JhcHBlcigvXFw6XFwpfFxcPVxcKXxcXDosfFxcOlxcRHxcXDxcXDMvZywgW0IsIFJdLCBbNTAsIC01MF0pOyBcbiBcdFx0XHRcdFx0aWYgKHRlbXApe1x0XG5cdCBcdFx0XHRcdFx0QiA9IHRlbXBbMF07IFxuXHQgXHRcdFx0XHRcdFIgPSB0ZW1wWzFdO1xuIFx0XHRcdFx0XHR9XG4gXHRcdFx0XHRcdC8vIFJlcGVhdCBmb3Igc2FkIGVtb2ppcy5cbiBcdFx0XHRcdFx0dGVtcCA9IHB1bmNTY29yaW5nV3JhcHBlcigvXFw6XFwofFxcPVxcKC9nLCBbQiwgUl0sIFstNTAsIDUwXSk7IFxuIFx0XHRcdFx0XHRpZiAodGVtcCl7XHRcblx0IFx0XHRcdFx0XHRCID0gdGVtcFswXTsgXG5cdCBcdFx0XHRcdFx0UiA9IHRlbXBbMV07XG4gXHRcdFx0XHRcdH1cblxuIFx0XHRcdFx0XHQvLyBUaGUgd3JhcHBlciBjaGVja3MgdGhlIGxlbmd0aCBvZiBcInJlZ0V4XCIsIHVzZXMgaXQgdG8gaW5jcmVhc2UgdGhlIGNvbnN0YW50cyB0aGF0IGl0IHRoZW4gZmVlZHMgdG8gXG4gXHRcdFx0XHRcdC8vIFwic2NvcmluZ1RlbXBsYXRlXCIuXG5cdCBcdFx0XHRcdGZ1bmN0aW9uIHB1bmNTY29yaW5nV3JhcHBlcihyZWdFeCwgbnVtQXJyYXksIGNvbnN0QXJyYXkpe1xuXHQgXHRcdFx0XHRcdHZhciBtYXRjaGVzID0gcHVuYy5tYXRjaChyZWdFeCk7XG5cdCBcdFx0XHRcdFx0aWYgKG1hdGNoZXMpe1xuXHRcdCBcdFx0XHRcdFx0dmFyIGxlbiA9IG1hdGNoZXMubGVuZ3RoO1xuXHQgXHRcdFx0XHRcdFx0cmV0dXJuIHNjb3JpbmdUZW1wbGF0ZShudW1BcnJheSwgW2NvbnN0QXJyYXlbMF0gKiBsZW4sIGNvbnN0QXJyYXlbMV0gKiBsZW5dKTtcblx0IFx0XHRcdFx0XHR9IGVsc2Uge1xuXHQgXHRcdFx0XHRcdFx0cmV0dXJuIG51bGw7IFxuXHQgXHRcdFx0XHRcdH0gICAgICAgICAgICAgIFxuXHQgXHRcdFx0XHR9XG4gXHRcdFx0XHR9XG5cbiBcdFx0XHRcdC8vIEFmdGVyIGEgd29yZCBpcyBjaGFuZ2VkIHRvIG9ubHkgaXRzIGxldHRlcnMgYW5kIFwiJ1wiLCBzZWUgaWYgaXQgaXMgYWxsIGNhcHMuIElmIHNvLCBpbmNyZWFzZSBcIi1Cb29zdFwiXG4gXHRcdFx0XHQvLyBzY29yZXMgZm9yIGV4dHJlbWVuZXNzXG4gXHRcdFx0XHRmdW5jdGlvbiBzY29yZUNhc2luZyh3b3JkKXtcblx0IFx0XHRcdFx0d29yZCA9IHdvcmQubWF0Y2goL1thLXonXSsvZ2kpOy8vIFRoaXMgcmVnZXhwIGtlZXBzIG9ubHkgdXBwZXItIGFuZCBsb3dlci1jYXNlZCBsZXR0ZXJzIGFuZCBcIidcIi4gXG5cdCBcdFx0XHRcdGlmICh3b3JkKXtcblx0IFx0XHRcdFx0XHR3b3JkID0gd29yZC5qb2luKCcnKTsgXHRcbiBcdFx0XHRcdFx0XHR2YXIgY2FwcyA9IHdvcmQubWF0Y2goL1tBLVonXSsvZyk7IC8vIFRha2Ugb25seSB0aGUgdXBwZXItY2FzZWQtbGV0dGVycyBhbmQgXCInXCIgZnJvbSBcIndvcmRcIi5cblx0IFx0XHRcdFx0XHRpZiAoY2FwcyAmJiBjYXBzLmxlbmd0aCA9PSB3b3JkLmxlbmd0aCl7IC8vIFRoaXMgY2hlY2tzIGlmIHRoZSB3b3JkIGlzIGFsbCBjYXBzLlxuXHQgXHRcdFx0XHRcdFx0Ly8gU2NvcmluZyB0ZW1wbGF0ZSB1c2VzIFwiY2Fwcy5sZW5ndGhcIiB0byBpbmNyZWFzZSB0aGUgY29uc3RhbnRzIHBhc3NlZCB0byBcInNjb3JpbmdUZW1wbGF0ZVwiLiBcblx0IFx0XHRcdFx0XHRcdC8vIChJIGZvcndlbnQgdXNpbmcgYSB3cmFwcGVyLCBoZXJlLCBiZWNhdXNlIEknbSBvbmx5IGludm9raW5nIFwic2NvcmluZ1RlbXBsYXRlXCIgb25jZS4pIFxuXHQgXHRcdFx0XHRcdFx0dmFyIHRlbXAgICA9IHNjb3JpbmdUZW1wbGF0ZShbd29yZEJvb3N0LCB0d2VldEJvb3N0XSwgWyguMDUgKiBjYXBzLmxlbmd0aCksICguMDIgKiBjYXBzLmxlbmd0aCldKTsgXG5cdCBcdFx0XHRcdFx0XHR3b3JkQm9vc3QgID0gdGVtcFswXTsgICBcblx0IFx0XHRcdFx0XHRcdHR3ZWV0Qm9vc3QgPSB0ZW1wWzFdOyAgIFxuXHRcdCBcdFx0XHRcdFx0d29yZCA9IHdvcmQudG9Mb3dlckNhc2UoKTsgXHRcdFx0XHRcdFx0XHRcblx0IFx0XHRcdFx0XHR9XG5cdCBcdFx0XHRcdH0gZWxzZSB7XG5cdCBcdFx0XHRcdFx0d29yZCA9IFwiU0tJUCBOVUxMLlwiIC8vIEEgZHVtbXkgc2V0dGluZy4gTWFrZXMgc3VyZSBhIG51bGwgdmFsdWUgb2Ygd29yZCBpc24ndCBzY29yZWQuIFxuXHQgXHRcdFx0XHR9XG5cdCBcdFx0XHRcdHJldHVybiB3b3JkOyBcdFx0XHRcdFx0XHRcbiBcdFx0XHRcdH1cblxuIFx0XHRcdFx0Ly8gSWYgYSB3b3JkIHBsdXMvbWludXMgc3VmZml4ZXMgaXMgaW4gXCJ3b3JkQmFua1wiLCBzY29yZSBpdC4gTm90ZTogSSBjb25zaWRlcmVkIHdyYXBwaW5nIHRoZSB0d28gXCJmb3JcIiBsb29wcyBpbnNpZGUgdGhpcyAgXG4gXHRcdFx0XHQvLyBpbiBoZWxwZXIgZnVuY3Rpb25zLCBidXQgZGVjaWRlZCB0byBsZWF2ZSBpdCBhcyBpcywgc28gdGhhdCB0aGUgcmV0dXJuIHN0YXRlbWVudHMgd2lsbCBlc2NhcGUgdGhlIGZ1bmN0aW9uIGFzIHNvb24gYXMgYVxuIFx0XHRcdFx0Ly8gbWF0Y2ggaXMgZm91bmQuIFxuXHRcdFx0XHRmdW5jdGlvbiBzY29yZUFmdGVyU3VmZml4Q2hlY2sod29yZCwgaSl7XG5cdFx0XHRcdFx0Ly8gQ29tbW9uIHN1ZmZpeGVzIHRvIGNoZWNrLlxuXHRcdFx0XHRcdHZhciBzdWZmcyA9IFsncycsICdkJywgJ2VyJywgJ2luZycsICdmdWwnLCAnb3VzJywgJ2Z1bGx5JywgJ2VyJywgJ2llciddO1xuXHRcdFx0XHRcdC8vIEluaXRpYWxpemUgYW5kL29yIGFzc2lnbiBhbGwgdmFyaWFibGVzIHRoYXQgd2lsbCBiZSB1cGRhdGVkIGZyZXF1ZW50bHkgaW4gdGhlIGxvb3AgdG8gc3BlZWQgcHJvY2Vzc2luZy4gXG5cdFx0XHRcdFx0dmFyIHN1ZmZzTGVuID0gc3VmZnMubGVuZ3RoO1x0XHRcdFx0XHRcblx0XHRcdFx0XHR2YXIgc3VmO1xuXHRcdFx0XHRcdC8vIFwialwiIGlzIHVzZWQgc28gXCJpXCIgd2lsbCBiZSBwcmVzZXJ2ZWQgdG8gc2VuZCB0byBcInNjb3JlV29yZFwiIGJlbG93Llx0XHRcdFx0XHRcblx0XHRcdFx0XHR2YXIgajtcblx0XHRcdFx0XHR2YXIgd29yZExlbiA9IHdvcmQubGVuZ3RoO1xuXHRcdFx0XHRcdHZhciBsYXN0SW5kO1xuXHRcdFx0XHRcdGZvciAoaiA9IDA7IGogPCBzdWZmc0xlbjsgaisrKXtcblx0XHRcdFx0XHRcdC8vIFwic3VmXCIgaXMgdGhlIHN1ZmZpeCB0byBhZGQgdG8gdGhlIGVuZCBvZiB3b3JkIGZvciB0aGlzIGNoZWNrLlxuXHRcdFx0XHRcdFx0c3VmID0gc3VmZnNbal07XG5cdFx0XHRcdFx0XHRpZiAod29yZExlbiA+IDIpeyAvLyBJIGhhZCAnYXMnIGJlIHNjb3JlZCBhcyAnYXNzLicgVGhpcyBzaG91bGQgcHJldmVudCB0aGF0LiBcblx0XHRcdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgXCJ3b3JkXCIgcGx1cyB0aGUgc3VmZml4IGlzIHByZXNlbnQgaW4gdGhlIGJhbmsuXG5cdFx0XHRcdFx0XHRcdGlmICh3b3JkQmFua1t3b3JkICsgc3VmXSl7ICBcblx0XHRcdFx0XHRcdFx0XHQvLyBTY29yZSB0aGUgd29yZCBwbHVzIHN1ZmZpeC5cblx0XHRcdFx0XHRcdFx0XHRzY29yZVdvcmQoKHdvcmQgKyBzdWYpLCBpKTsgXG5cdFx0XHRcdFx0XHRcdFx0Ly8gUmV0dXJuIGZyb20gdGhlIGZ1bmN0aW9uLCBpZiBhIHNjb3JhYmxlIHdvcmQgd2FzIG1hZGUgaGVyZS5cblx0XHRcdFx0XHRcdFx0XHRyZXR1cm47IFxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvLyBJZiB0aGUgY2hlY2sgYWJvdmUgZGlkIG5vdCBsZWFkIHRvIGEgXCJyZXR1cm5cIiwgY2hlY2sgaWYgdGhlIHdvcmQgbWludXMgdGhlIHN1ZmZpeCBpcyBwcmVzZW50IGluIHRoZSBiYW5rLlx0XG5cdFx0XHRcdFx0XHRsYXN0SW5kID0gd29yZC5sYXN0SW5kZXhPZihzdWYpO1xuXHRcdFx0XHRcdFx0Ly8gTm90ZSB0aGF0LCBpZiB0aGUgc3VmZml4IHdhc24ndCBpbiBcIndvcmRcIiBhdCBhbGwsIFwibGFzdEluZFwiIHdpbGwgZXF1YWwgLTEsIGFuZCB0aGlzIGNvbmRpdGlvbiBpcyBmYWxzZS5cdFx0XHRcdFxuXHRcdFx0XHRcdFx0aWYgKGxhc3RJbmQgPT0gd29yZExlbiAtIHN1Zi5sZW5ndGgpe1xuXHRcdFx0XHRcdFx0XHQvLyBTZWUgaWYgdGhlIHdvcmQgbWludXMgdGhlIHN1ZmZpeCBpcyBpbiB0aGUgYmFuay4gXG5cdFx0XHRcdFx0XHRcdGlmICh3b3JkQmFua1t3b3JkLnN1YnN0cmluZygwLCBsYXN0SW5kKV0peyBcblx0XHRcdFx0XHRcdFx0XHQvLyBTY29yZSB0aGUgcm9vdCB3b3JkLlxuXHRcdFx0XHRcdFx0XHRcdHNjb3JlV29yZCh3b3JkLnN1YnN0cmluZygwLCBsYXN0SW5kKSxpKTtcblx0XHRcdFx0XHRcdFx0XHQvLyBSZXR1cm4gZnJvbSB0aGUgZnVuY3Rpb24sIGlmIGEgc2NvcmFibGUgd29yZCB3YXMgbWFkZSBoZXJlLiBcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gXHRcdFx0XHRcblxuIFx0XHRcdFx0Ly8gQnkgdGhlIHRpbWUgXCJ3b3JkXCIgaGFzIHJlYWNoZWQgXCJzY29yZVdvcmRcIiwgaXQgaGFzIGJlZW4gZm91bmQgaW4gdGhlIGRhdGFiYXNlLlxuIFx0XHRcdFx0ZnVuY3Rpb24gc2NvcmVXb3JkKHdvcmQsIGkpe1xuIFx0XHRcdFx0XHQvLyBcInNjb3JlXCIgd2lsbCBiZSBtdWx0aXBsaWVkIGJ5IG90aGVyIGNvbnN0YW50cywgc28gaXMgZGVmaW5lZCBhcyAxLlxuIFx0XHRcdFx0XHR2YXIgc2NvcmUgPSAxO1xuIFx0XHRcdFx0XHQvLyBQcmVzZW5jZSBvZiBcIm4ndFwiIGluZGljYXRlcyB0aGUgcmV2ZXJzZSBzZW50aW1lbnQgb2YgYSB3b3JkIGNvbWluZyBhZnRlciBpdCAtLSBcbiBcdFx0XHRcdFx0Ly8gRm9yIGV4YW1wbGU6IHdvcmRCYW5rWydoYXRlJ10gKiBzY29yZSAvLz09PiAtNCwgYnV0IGlmIFwiZG9lc24ndFwiIGNvbWVzIGJlZm9yZSBcImhhdGVcIiwgXG4gXHRcdFx0XHRcdC8vIG5vdyB3b3JkQmFua1snaGF0ZSddICogc2NvcmUgLy89PT4gNC5cbiBcdFx0XHRcdFx0bmVnYXRvckNoZWNrKCk7XG4gXHRcdFx0XHRcdC8vIFNjb3JpbmcgY3JpdGVyaWEgZ2V0IGx1bXBlZCBpbnRvIG9uZSBzY29yZS4gTm90ZSB0aGF0IFwibmVnYXRvckNoZWNrXCIgbWF5IGhhdmUgZmxpcHBlZCBcInNjb3JlXCIncyArLy0gc2lnbi5cblx0XHRcdFx0XHRzY29yZSAqPSB3b3JkQmFua1t3b3JkXSAqIDI1ICogd29yZEJvb3N0OyBcblx0XHRcdFx0XHQvLyBVc2UgdGhlICsvLSBzaWduIG9mIHRoZSB3b3JkIHRvIGRldGVybWluZSB3aGljaCBpbnB1dCB0byBnaXZlIFwid29yZFNjb3JpbmdXcmFwcGVyLlwiXG5cdFx0XHRcdFx0d29yZEJhbmtbd29yZF0gPiAwID8gd29yZFNjb3JpbmdXcmFwcGVyKCdwb3NXb3JkcycpIDogd29yZFNjb3JpbmdXcmFwcGVyKCduZWdXb3JkcycpOyBcblxuXHRcdFx0XHRcdC8vIEZsaXAgdGhlIHNpZ24gb2YgYSBnaXZlbiB3b3JkJ3Mgc2NvcmUgaWYgYSBuZWdhdG9yIHByZWNlZGVzIHRoZSB3b3JkLlxuXHRcdFx0XHRcdGZ1bmN0aW9uIG5lZ2F0b3JDaGVjaygpe1xuXHRcdFx0XHRcdFx0Ly8gVGhlIG9ubHkgdGltZSBpIDw9IDAgaXMgZm9yIHRoZSBmaXJzdCB3b3JkIG9mIGEgdHdlZXQuXG5cdFx0XHRcdFx0XHRpZiAoaSA+IDApe1xuXHRcdFx0XHRcdFx0XHQvLyBHcmFiIHRoZSB3b3JkIHByZWNlZGluZyB0aGUgb25lIHRoYXQgaXMgY3VycmVudGx5IGJlaW5nIHNjb3JlZC5cblx0XHRcdFx0XHRcdFx0dmFyIHByZXZXb3JkID0gdHdlZXRXb3Jkc1tpIC0gMV07XG5cdFx0XHRcdFx0XHRcdC8vIEhhcmQgY29kZSBcIm4ndFwiIGFzIHRoZSBvbmx5IG5lZ2F0b3IsIGZvciBzcGVlZCBhbmQgc2ltcGxpY2l0eS4gU2VlIGlmIHRoZSBwcmV2aW91cyB3b3JkIGVuZHMgaW4gaXQuXHRcdFx0XG5cdFx0XHRcdFx0XHRcdGlmIChwcmV2V29yZC5zdWJzdHJpbmcocHJldldvcmQubGVuZ3RoIC0gMywgcHJldldvcmQubGVuZ3RoKSA9PSBcIm4ndFwiKXtcblx0XHRcdFx0XHRcdFx0XHRzY29yZSAqPSAtMTsgXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XHRcdFxuXG5cdFx0XHRcdFx0Ly8gd29yZFNjb3JpbmdXcmFwcGVyIGFjY2VwdHMgZWl0aGVyIFwicG9zV29yZHNcIiBvciBcIm5lZ1dvcmRzXCIgYXMgYSBmaWVsZCBpbnRvIFwic3RhdHNcIiwgXG5cdFx0XHRcdFx0Ly8gYW5kIHB1c2hlcyBhIHdvcmQgaW50byBcInN0YXRzW2ZpZWxkXVwiIGFjY29yZGluZyB0byBpdHMgc2NvcmUuIFdvcmRzIHdpdGggYSBzY29yZVxuXHRcdFx0XHRcdC8vIG9mIGJlbG93IDAgZ28gaW50byBcIm5ld1dvcmRzXCIsIHdvcmRzIHdpdGggYSBzY29yZSBhYm92ZSB6ZXJvIGdvIGludG8gXCJwb3NXb3Jkc1wiLiBcblx0XHRcdFx0XHRmdW5jdGlvbiB3b3JkU2NvcmluZ1dyYXBwZXIoZmllbGQpeyBcblx0XHRcdFx0XHRcdHN0YXRzW2ZpZWxkXS5wdXNoKHsnd29yZCc6IHdvcmQsICdzY29yZSc6IHdvcmRCYW5rW3dvcmRdfSk7XG5cdFx0XHRcdFx0XHR2YXIgcmJUZW1wID0gc2NvcmluZ1RlbXBsYXRlKFtSLCBCXSwgWy1zY29yZSwgc2NvcmVdKTsgXG5cdFx0XHRcdFx0XHQvLyBOb3RlOiBcIlJcIiBhbmQgXCJCXCIgYXJlIGFzc2lnbmVkIG9ubHkgYXQgdGhlIGVuZCBvZiB0aGlzIHByb2Nlc3MsIGFmdGVyIGFsbCBzY29yZXMgaGF2ZSBiZWVuIGludGVncmF0ZWQuIFxuXHRcdFx0XHRcdFx0UiA9IHJiVGVtcFswXTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcblx0XHRcdFx0XHRcdEIgPSByYlRlbXBbMV07XHRcdFx0XHRcdFx0XHRcdFx0XHQgXG5cdFx0XHRcdFx0fVx0XHRcdFx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuXHRcdFx0XHR9XG5cbiBcdFx0XHRcdC8vIEZsZXhpYmxlIHNjb3JpbmcgdGVtcGxhdGUgdXNlZCBieSBhbGwgdGhlIHNjb3JpbmcgZnVuY3Rpb25zIGFib3ZlLiBQcmVzdW1lcyBcImJhc2VzLmxlbmd0aFwiID0gXCJjb25zdGFudHMubGVuZ3RoXCIgXG4gXHRcdFx0XHQvLyBhbmQgdGhlIGxvZ2ljIG9mIFwiY29uc3RhbnRzW2ldXCIgcGFpcnMgd2l0aCBcImJhc2VzW2ldXCIuIFwiYmFzZXNcIiB3aWxsIGJlIGFuIGFycmF5IG9mIHRoZSBzdGFydGluZyBzY29yZSBvZiBzb21lIFxuIFx0XHRcdFx0Ly8gdmFsdWUgKGxpa2UgUixHLCBvciBCKSwgXCJjb25zdGFudHNcIiBhZGQgdG8gXCJiYXNlc1wiIHRvIGJvb3N0IHRoZSBzdGFydGluZyBzY29yZS4gRm9yIGV4YW1wbGU6IFwic2NvcmluZ1RlbXBsYXRlKFIsIC01MClcbiBcdFx0XHRcdC8vICB3b3VsZCBtZWFuIFwiZGVjcmVhc2UgUiBieSA1MC5cIiBPciwgXCJzY29yaW5nVGVtcGxhdGUoW1IsQl0sWy01MCw1MF0pXCIgd291bGQgbWVhbiwgXCJkZWNyZWFzZSBSIGJ5IDUwLCB0aGVuIGluY3JlYXNlIEIgYnkgNTAuXCJcbiBcdFx0XHRcdGZ1bmN0aW9uIHNjb3JpbmdUZW1wbGF0ZShiYXNlcywgY29uc3RhbnRzKXtcbiBcdFx0XHRcdFx0Ly8gSWYgXCJiYXNlc1wiIGlzIGFuIGFycmF5LCBhcHBseSBhIFwiY29uc3RhbnRzXCIgdmFsdWUgdG8gYSBcImJhc2VzXCIgdmFsdWUsIG9uZSBhdCBhIHRpbWUuIFxuIFx0XHRcdFx0XHRpZiAoYmFzZXMuY29uc3RydWN0b3IgPT09IEFycmF5KXtcbiBcdFx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGJhc2VzLmxlbmd0aDsgaSsrKXtcbiBcdFx0XHRcdFx0XHRcdGJhc2VzW2ldICs9IGNvbnN0YW50c1tpXTtcbiBcdFx0XHRcdFx0XHR9XG4gXHRcdFx0XHRcdH0gLy8gSWYgaXRzIG5vdCBhbiBhcnJheSwgaXQncyBhIHNpbmdsZSB2YWx1ZS4gQWRkIHRoZSB0d28uIFxuIFx0XHRcdFx0XHQgIGVsc2Uge1xuIFx0XHRcdFx0XHRcdGJhc2VzICs9IGNvbnN0YW50cztcbiBcdFx0XHRcdFx0fVxuIFx0XHRcdFx0XHRyZXR1cm4gYmFzZXM7IFx0XHRcdFx0XHQgIFxuIFx0XHRcdFx0fVxuXHRcdFx0fVx0XHRcdFxuIFx0XHRcdFx0XHRcbiBcdFx0XHQvLyBUaGUgZmluYWwgc2NvcmluZyBvY2N1cnMgaGVyZS4gUmVwcmVzZW50aW5nIG1vb2QgdmlhIFJHQiBtZWFucyB0aGUgdmFsdWVzIG11c3QgZmFsbCBpbiB0aGUgdWludDggcmFuZ2UsXG4gXHRcdFx0Ly8gc28gSSBjYXAgdGhlIHNjb3JlcyBiZXR3ZWVuIDAgYW5kIDI1NS4gVGhlIGVuZCByZXN1bHQ6IEEgZnVsbHkgbmVnYXRpdmUgc2VudGltZW50IGlzIGV4cHJlc3NlZCBhcyBbMjU1LDAsMF0sXG4gXHRcdFx0Ly8gZnVsbHkgcG9zaXRpdmUgc2VudGltZW50IGlzIFswLDI1NSwyNTVdLCBhbmQgYW1iaWd1b3VzIHNlbnRpbWVudHMgZm9ybSB0aGUgZ3JleS9yZWQvYmx1ZS9wdXJwbGUgc3BlY3RyYS4gXG5cdFx0XHRmdW5jdGlvbiBzY29yZUVudGlyZVR3ZWV0KCl7XG5cdFx0XHRcdHN0YXRzLm1vb2QgPSBbUixCLEJdXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc3RhdHMubW9vZC5sZW5ndGg7IGkrKyl7XG5cdFx0XHRcdFx0c3RhdHMubW9vZFtpXSA9IChzdGF0cy5tb29kW2ldICogdHdlZXRCb29zdCkudG9GaXhlZCgwKTsgICAgICAgICAgICBcblx0XHRcdFx0XHRpZiAoc3RhdHMubW9vZFtpXSA+IDI1NSl7XHRcdFx0XHRcdFx0XHRcdCAgXG5cdFx0XHRcdFx0XHRzdGF0cy5tb29kW2ldID0gMjU1OyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuXHRcdFx0XHRcdH0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuXHRcdFx0XHRcdGlmIChzdGF0cy5tb29kW2ldIDwgMCl7XG5cdFx0XHRcdFx0XHRzdGF0cy5tb29kW2ldID0gMDsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcblx0XHRcdFx0XHR9ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5cdFx0XHRcdH0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cblxuXG5cblxuXG5cblx0Il19