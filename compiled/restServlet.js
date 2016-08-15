'use strict';

var util = require('util');
var TweetAnalyzer = require('./tweetAnalyzer.js');
var https = require('https');

// "data", here, came from the front end and contains the parameters to define the query to Twitter. "response" 
// and "request" are from the main server, so when "response.write" is used, it's writing back to the client.
undefined.query = function (data, response, request, wordBank) {
	// "octet-stream" alleviates a strange buffering issue I experienced when writing to Chrome. 
	response.writeHead(200, { 'Content-Type': 'application/octet-stream' });
	// Note the full customization via user parameters. I keep 100 as "count", as it's the max, and the 
	// user can pause at any time on the front end if they want to see less.
	var queryString = '/1.1/search/tweets.json?q=' + data.subject + '%20since%3A' + parseDate(data.start) + '%20until%3A' + parseDate(data.end) + '&max_id=' + data.id + '&count=100';

	// Sample query string: '/1.1/search/tweets.json?q=Puppies%20since%3A2016-03-25%20until%3A2016-03-28&count=3'.

	// Get request options, including bearer access token for Twitter application-only authorization. Access token is in "env.js".
	var options = {
		'path': queryString,
		'hostname': 'api.twitter.com',
		'method': 'GET',
		'headers': { 'Authorization': 'Bearer ' + process.env.BEARER_ACCESS_TOKEN }
	};
	// Must use https, as per Twitter application-only request requirements. 
	var req = new https.request(options, function (res) {
		var responseString = "";
		// As data arrives in chunks, add them to the string.
		res.on('data', function (tweet) {
			responseString += tweet;
		});
		// "end" indicates all the data from the query is done sending. "responseString" can now be parsed 
		// into an object which contains "statuses", which contains an array of the individual tweets as 
		// JSON objects. Loop through that array, pass each tweet to "tweetAnalyzer", then write the result 
		// to the front end with "response.write". Use a timeout to throttle the writing to avoid overtaxing 
		// the geocoders.
		res.on('end', function () {
			var tweets = JSON.parse(responseString).statuses;
			var i;
			var result;
			for (i = 0; i < tweets.length; i++) {
				(function intervalClosure(i) {
					setTimeout(function () {
						// The result, at this point, is ready for use in the front end.    
						result = TweetAnalyzer.analyze(tweets[i], wordBank);
						if (result) {
							response.write(JSON.stringify(result));
						}
					}, i * 500); // The half-second interval is arbitrary/aesthetic/sufficient time for the geocoders.									       
				})(i); // Closure needed to correctly stagger timeout.
			};
		});
		res.on('error', function (error) {
			console.log("Error in restServlet: " + error);
			throw error;
		});
	});
	// A request must be ended in order to be sent to the API. 
	req.end();

	// Takes "month/day/year" format, returns what Twitter needs: "YYYY-MM-DD"
	function parseDate(date) {
		// Split around '%2F', which is the url code for "/".
		date = date.split('%2F');
		return date[2] + '-' + checkSingle(date[0]) + '-' + checkSingle(date[1]);
		// If a month or day is a single digit, concatenate a "0" to its front.
		function checkSingle(digit) {
			if (digit.length == 1) {
				digit = '0' + digit;
			}
			return digit;
		}
	}
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3Jlc3RTZXJ2bGV0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsSUFBSSxPQUFXLFFBQVEsTUFBUixDQUFmO0FBQ0EsSUFBSSxnQkFBZ0IsUUFBUSxvQkFBUixDQUFwQjtBQUNBLElBQUksUUFBZ0IsUUFBUSxPQUFSLENBQXBCOztBQUVBO0FBQ0E7QUFDQSxVQUFLLEtBQUwsR0FBYSxVQUFTLElBQVQsRUFBZSxRQUFmLEVBQXlCLE9BQXpCLEVBQWtDLFFBQWxDLEVBQTJDO0FBQ3ZEO0FBQ0EsVUFBUyxTQUFULENBQW1CLEdBQW5CLEVBQXVCLEVBQUMsZ0JBQWdCLDBCQUFqQixFQUF2QjtBQUNBO0FBQ0E7QUFDQSxLQUFJLGNBQWMsK0JBQStCLEtBQUssT0FBcEMsR0FDQSxhQURBLEdBQ2dCLFVBQVUsS0FBSyxLQUFmLENBRGhCLEdBRUEsYUFGQSxHQUVnQixVQUFVLEtBQUssR0FBZixDQUZoQixHQUdBLFVBSEEsR0FHZSxLQUFLLEVBSHBCLEdBSUEsWUFKbEI7O0FBTUE7O0FBRUE7QUFDQSxLQUFJLFVBQVU7QUFDYixVQUFZLFdBREM7QUFFYixjQUFhLGlCQUZBO0FBR2IsWUFBYSxLQUhBO0FBSWIsYUFBYSxFQUFDLGlCQUFrQixZQUFZLFFBQVEsR0FBUixDQUFZLG1CQUEzQztBQUpBLEVBQWQ7QUFNQTtBQUNBLEtBQUksTUFBTSxJQUFJLE1BQU0sT0FBVixDQUFrQixPQUFsQixFQUEyQixVQUFTLEdBQVQsRUFBYTtBQUNqRCxNQUFJLGlCQUFpQixFQUFyQjtBQUNBO0FBQ0EsTUFBSSxFQUFKLENBQU8sTUFBUCxFQUFlLFVBQVMsS0FBVCxFQUFlO0FBQzdCLHFCQUFrQixLQUFsQjtBQUNBLEdBRkQ7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBSSxFQUFKLENBQU8sS0FBUCxFQUFjLFlBQVU7QUFDdkIsT0FBSSxTQUFTLEtBQUssS0FBTCxDQUFXLGNBQVgsRUFBMkIsUUFBeEM7QUFDQSxPQUFJLENBQUo7QUFDQSxPQUFJLE1BQUo7QUFDQSxRQUFLLElBQUksQ0FBVCxFQUFZLElBQUksT0FBTyxNQUF2QixFQUErQixHQUEvQixFQUFtQztBQUNsQyxLQUFDLFNBQVMsZUFBVCxDQUF5QixDQUF6QixFQUEyQjtBQUMzQixnQkFBVyxZQUFVO0FBQ3BCO0FBQ0EsZUFBUyxjQUFjLE9BQWQsQ0FBc0IsT0FBTyxDQUFQLENBQXRCLEVBQWlDLFFBQWpDLENBQVQ7QUFDQSxVQUFJLE1BQUosRUFBVztBQUNWLGdCQUFTLEtBQVQsQ0FBZSxLQUFLLFNBQUwsQ0FBZSxNQUFmLENBQWY7QUFDQTtBQUNELE1BTkQsRUFNRyxJQUFJLEdBTlAsRUFEMkIsQ0FPZDtBQUNiLEtBUkQsRUFRRyxDQVJILEVBRGtDLENBUzNCO0FBQ1A7QUFDRCxHQWZEO0FBZ0JBLE1BQUksRUFBSixDQUFPLE9BQVAsRUFBZ0IsVUFBUyxLQUFULEVBQWU7QUFDOUIsV0FBUSxHQUFSLENBQVksMkJBQTJCLEtBQXZDO0FBQ0EsU0FBTSxLQUFOO0FBQ0EsR0FIRDtBQUlBLEVBL0JTLENBQVY7QUFnQ0E7QUFDQSxLQUFJLEdBQUo7O0FBRUE7QUFDQSxVQUFTLFNBQVQsQ0FBbUIsSUFBbkIsRUFBd0I7QUFDdkI7QUFDQSxTQUFPLEtBQUssS0FBTCxDQUFXLEtBQVgsQ0FBUDtBQUNBLFNBQVEsS0FBSyxDQUFMLElBQVUsR0FBVixHQUFnQixZQUFZLEtBQUssQ0FBTCxDQUFaLENBQWhCLEdBQXVDLEdBQXZDLEdBQTZDLFlBQVksS0FBSyxDQUFMLENBQVosQ0FBckQ7QUFDQTtBQUNBLFdBQVMsV0FBVCxDQUFxQixLQUFyQixFQUEyQjtBQUMxQixPQUFJLE1BQU0sTUFBTixJQUFnQixDQUFwQixFQUFzQjtBQUNyQixZQUFRLE1BQU0sS0FBZDtBQUNBO0FBQ0QsVUFBTyxLQUFQO0FBQ0E7QUFDRDtBQUNELENBckVEIiwiZmlsZSI6InJlc3RTZXJ2bGV0LmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIHV0aWwgXHRcdCAgPSByZXF1aXJlKCd1dGlsJyk7XG52YXIgVHdlZXRBbmFseXplciA9IHJlcXVpcmUoJy4vdHdlZXRBbmFseXplci5qcycpO1xudmFyIGh0dHBzICAgICAgICAgPSByZXF1aXJlKCdodHRwcycpO1xuXG4vLyBcImRhdGFcIiwgaGVyZSwgY2FtZSBmcm9tIHRoZSBmcm9udCBlbmQgYW5kIGNvbnRhaW5zIHRoZSBwYXJhbWV0ZXJzIHRvIGRlZmluZSB0aGUgcXVlcnkgdG8gVHdpdHRlci4gXCJyZXNwb25zZVwiIFxuLy8gYW5kIFwicmVxdWVzdFwiIGFyZSBmcm9tIHRoZSBtYWluIHNlcnZlciwgc28gd2hlbiBcInJlc3BvbnNlLndyaXRlXCIgaXMgdXNlZCwgaXQncyB3cml0aW5nIGJhY2sgdG8gdGhlIGNsaWVudC5cbnRoaXMucXVlcnkgPSBmdW5jdGlvbihkYXRhLCByZXNwb25zZSwgcmVxdWVzdCwgd29yZEJhbmspeyBcblx0Ly8gXCJvY3RldC1zdHJlYW1cIiBhbGxldmlhdGVzIGEgc3RyYW5nZSBidWZmZXJpbmcgaXNzdWUgSSBleHBlcmllbmNlZCB3aGVuIHdyaXRpbmcgdG8gQ2hyb21lLiBcblx0cmVzcG9uc2Uud3JpdGVIZWFkKDIwMCx7J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nfSk7XHRcblx0Ly8gTm90ZSB0aGUgZnVsbCBjdXN0b21pemF0aW9uIHZpYSB1c2VyIHBhcmFtZXRlcnMuIEkga2VlcCAxMDAgYXMgXCJjb3VudFwiLCBhcyBpdCdzIHRoZSBtYXgsIGFuZCB0aGUgXG5cdC8vIHVzZXIgY2FuIHBhdXNlIGF0IGFueSB0aW1lIG9uIHRoZSBmcm9udCBlbmQgaWYgdGhleSB3YW50IHRvIHNlZSBsZXNzLlxuXHR2YXIgcXVlcnlTdHJpbmcgPSAnLzEuMS9zZWFyY2gvdHdlZXRzLmpzb24/cT0nICsgZGF0YS5zdWJqZWN0IFxuXHQgICAgICAgICAgICAgICAgKyAnJTIwc2luY2UlM0EnICsgcGFyc2VEYXRlKGRhdGEuc3RhcnQpIFxuXHQgICAgICAgICAgICAgICAgKyAnJTIwdW50aWwlM0EnICsgcGFyc2VEYXRlKGRhdGEuZW5kKVxuXHQgICAgICAgICAgICAgICAgKyAnJm1heF9pZD0nICArIChkYXRhLmlkKVxuXHQgICAgICAgICAgICAgICAgKyAnJmNvdW50PTEwMCc7XG5cblx0Ly8gU2FtcGxlIHF1ZXJ5IHN0cmluZzogJy8xLjEvc2VhcmNoL3R3ZWV0cy5qc29uP3E9UHVwcGllcyUyMHNpbmNlJTNBMjAxNi0wMy0yNSUyMHVudGlsJTNBMjAxNi0wMy0yOCZjb3VudD0zJy5cblxuXHQvLyBHZXQgcmVxdWVzdCBvcHRpb25zLCBpbmNsdWRpbmcgYmVhcmVyIGFjY2VzcyB0b2tlbiBmb3IgVHdpdHRlciBhcHBsaWNhdGlvbi1vbmx5IGF1dGhvcml6YXRpb24uIEFjY2VzcyB0b2tlbiBpcyBpbiBcImVudi5qc1wiLlxuXHR2YXIgb3B0aW9ucyA9IHtcblx0XHQncGF0aCdcdCAgIDogcXVlcnlTdHJpbmcsXG5cdFx0J2hvc3RuYW1lJyA6ICdhcGkudHdpdHRlci5jb20nLFxuXHRcdCdtZXRob2QnICAgOiAnR0VUJyxcblx0XHQnaGVhZGVycycgIDogeydBdXRob3JpemF0aW9uJzogKCdCZWFyZXIgJyArIHByb2Nlc3MuZW52LkJFQVJFUl9BQ0NFU1NfVE9LRU4pfSxcblx0fTtcblx0Ly8gTXVzdCB1c2UgaHR0cHMsIGFzIHBlciBUd2l0dGVyIGFwcGxpY2F0aW9uLW9ubHkgcmVxdWVzdCByZXF1aXJlbWVudHMuIFxuXHR2YXIgcmVxID0gbmV3IGh0dHBzLnJlcXVlc3Qob3B0aW9ucywgZnVuY3Rpb24ocmVzKXtcblx0XHR2YXIgcmVzcG9uc2VTdHJpbmcgPSBcIlwiOyBcblx0XHQvLyBBcyBkYXRhIGFycml2ZXMgaW4gY2h1bmtzLCBhZGQgdGhlbSB0byB0aGUgc3RyaW5nLlxuXHRcdHJlcy5vbignZGF0YScsIGZ1bmN0aW9uKHR3ZWV0KXtcblx0XHRcdHJlc3BvbnNlU3RyaW5nICs9IHR3ZWV0OyBcblx0XHR9KVxuXHRcdC8vIFwiZW5kXCIgaW5kaWNhdGVzIGFsbCB0aGUgZGF0YSBmcm9tIHRoZSBxdWVyeSBpcyBkb25lIHNlbmRpbmcuIFwicmVzcG9uc2VTdHJpbmdcIiBjYW4gbm93IGJlIHBhcnNlZCBcblx0XHQvLyBpbnRvIGFuIG9iamVjdCB3aGljaCBjb250YWlucyBcInN0YXR1c2VzXCIsIHdoaWNoIGNvbnRhaW5zIGFuIGFycmF5IG9mIHRoZSBpbmRpdmlkdWFsIHR3ZWV0cyBhcyBcblx0XHQvLyBKU09OIG9iamVjdHMuIExvb3AgdGhyb3VnaCB0aGF0IGFycmF5LCBwYXNzIGVhY2ggdHdlZXQgdG8gXCJ0d2VldEFuYWx5emVyXCIsIHRoZW4gd3JpdGUgdGhlIHJlc3VsdCBcblx0XHQvLyB0byB0aGUgZnJvbnQgZW5kIHdpdGggXCJyZXNwb25zZS53cml0ZVwiLiBVc2UgYSB0aW1lb3V0IHRvIHRocm90dGxlIHRoZSB3cml0aW5nIHRvIGF2b2lkIG92ZXJ0YXhpbmcgXG5cdFx0Ly8gdGhlIGdlb2NvZGVycy5cblx0XHRyZXMub24oJ2VuZCcsIGZ1bmN0aW9uKCl7IFxuXHRcdFx0dmFyIHR3ZWV0cyA9IEpTT04ucGFyc2UocmVzcG9uc2VTdHJpbmcpLnN0YXR1c2VzO1xuXHRcdFx0dmFyIGk7XG5cdFx0XHR2YXIgcmVzdWx0OyBcblx0XHRcdGZvciAoaSA9IDA7IGkgPCB0d2VldHMubGVuZ3RoOyBpKyspeyBcblx0XHRcdFx0KGZ1bmN0aW9uIGludGVydmFsQ2xvc3VyZShpKXtcblx0XHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHQvLyBUaGUgcmVzdWx0LCBhdCB0aGlzIHBvaW50LCBpcyByZWFkeSBmb3IgdXNlIGluIHRoZSBmcm9udCBlbmQuICAgIFxuXHRcdFx0XHRcdFx0cmVzdWx0ID0gVHdlZXRBbmFseXplci5hbmFseXplKHR3ZWV0c1tpXSwgd29yZEJhbmspOyBcblx0XHRcdFx0XHRcdGlmIChyZXN1bHQpe1xuXHRcdFx0XHRcdFx0XHRyZXNwb25zZS53cml0ZShKU09OLnN0cmluZ2lmeShyZXN1bHQpKTsgXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSwgaSAqIDUwMCk7IC8vIFRoZSBoYWxmLXNlY29uZCBpbnRlcnZhbCBpcyBhcmJpdHJhcnkvYWVzdGhldGljL3N1ZmZpY2llbnQgdGltZSBmb3IgdGhlIGdlb2NvZGVycy5cdFx0XHRcdFx0XHRcdFx0XHQgICAgICAgXG5cdFx0XHRcdH0pKGkpOyAvLyBDbG9zdXJlIG5lZWRlZCB0byBjb3JyZWN0bHkgc3RhZ2dlciB0aW1lb3V0LlxuXHRcdFx0fTtcdFxuXHRcdH0pO1xuXHRcdHJlcy5vbignZXJyb3InLCBmdW5jdGlvbihlcnJvcil7XG5cdFx0XHRjb25zb2xlLmxvZyhcIkVycm9yIGluIHJlc3RTZXJ2bGV0OiBcIiArIGVycm9yKTtcblx0XHRcdHRocm93IGVycm9yO1xuXHRcdH0pXG5cdH0pXG5cdC8vIEEgcmVxdWVzdCBtdXN0IGJlIGVuZGVkIGluIG9yZGVyIHRvIGJlIHNlbnQgdG8gdGhlIEFQSS4gXG5cdHJlcS5lbmQoKTtcblx0XG5cdC8vIFRha2VzIFwibW9udGgvZGF5L3llYXJcIiBmb3JtYXQsIHJldHVybnMgd2hhdCBUd2l0dGVyIG5lZWRzOiBcIllZWVktTU0tRERcIlxuXHRmdW5jdGlvbiBwYXJzZURhdGUoZGF0ZSl7XG5cdFx0Ly8gU3BsaXQgYXJvdW5kICclMkYnLCB3aGljaCBpcyB0aGUgdXJsIGNvZGUgZm9yIFwiL1wiLlxuXHRcdGRhdGUgPSBkYXRlLnNwbGl0KCclMkYnKTtcblx0XHRyZXR1cm4gKGRhdGVbMl0gKyAnLScgKyBjaGVja1NpbmdsZShkYXRlWzBdKSArICctJyArIGNoZWNrU2luZ2xlKGRhdGVbMV0pKTsgXG5cdFx0Ly8gSWYgYSBtb250aCBvciBkYXkgaXMgYSBzaW5nbGUgZGlnaXQsIGNvbmNhdGVuYXRlIGEgXCIwXCIgdG8gaXRzIGZyb250LlxuXHRcdGZ1bmN0aW9uIGNoZWNrU2luZ2xlKGRpZ2l0KXsgXG5cdFx0XHRpZiAoZGlnaXQubGVuZ3RoID09IDEpeyBcblx0XHRcdFx0ZGlnaXQgPSAnMCcgKyBkaWdpdDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBkaWdpdDtcblx0XHR9XG5cdH1cdFx0XG59Il19