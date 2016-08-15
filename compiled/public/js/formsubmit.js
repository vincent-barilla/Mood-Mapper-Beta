'use strict';

// Sends data from the form to the server so that it can make queries to Twitter. 
function formSubmit() {
  // Jumps the window to the map after a form submission.
  window.scrollTo(0, document.getElementById('bannerContentDiv').getBoundingClientRect().height + 15);
  // Set "pauseBtn" to "Pause" to keep views consistent with user's activity.      
  document.getElementById('pauseBtn').firstChild.data = 'Pause';
  // Send data to the server that has been serialized (i.e., put in url key-value pairs, in a string.)
  sendData(serializeForm());

  // Grab the data from the input fields in the form, convert them into the url-encoded pairs. 
  // Refer to Readme.md, "III. Why Track "lastId"?" for details on what the "lastId" does.  
  function serializeForm() {
    var data = { 'subject': document.getElementById("subject").value,
      'start': document.getElementById("startdate").value,
      'end': document.getElementById("enddate").value };
    // Get the final tweet's from the last response. May be an empty string. 
    data.id = map._getLastId.call(map);
    var urlEncodedData = "";
    var urlEncodedDataPairs = [];
    // Loop through the "data" object, comprised of the user's input, and form a query string. 
    for (var name in data) {
      urlEncodedDataPairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
    }
    // "mode" tells the server where to send the query parameters. Best kept separate from the query itself for easier access below.
    return [urlEncodedDataPairs.join('&').replace(/%20/g, '+'), document.getElementById('modeSelect').value];
  }

  // Send the data from the form, in a url string, to the server for parsing. 
  function sendData(data) {
    // "data[1]" will either be '/streamTweets' or '/getTweets' ("mode", from the previous function).
    xhr.open('POST', data[1], true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    // The url-encoded key-value pairs are in "data[0]". This is what the server will consume.
    xhr.send(data[0]);
    // Set the listener for when the server starts writing responses.
    xhr.onreadystatechange = function () {
      // Note the use of "LOADING": data will be usable before the request is "DONE".
      if ((this.readyState === XMLHttpRequest.LOADING || this.readyState === XMLHttpRequest.DONE) && this.status === 200) {
        var response = this.responseText;
        // '{"text":"'' delimits the start of a new tweet, according to assignment of "result" in "this.analyze" in "tweetAnalyzer.js"
        var jsonTweet = JSON.parse(response.substring(response.lastIndexOf('{"text":"'), response.length));
        // Calling "geoCodeTweet" chains "createTweetCircle". Those two take the data from the response all the way to the 
        // interactive map objects and links that make up the front end's final view state.         
        geoCodeTweet(jsonTweet);
        // "updateMoodBoxes" changes the colors below the text crawl. 
        updateMoodBoxes(jsonTweet.stats.mood);
      }
    };
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3B1YmxpYy9qcy9mb3Jtc3VibWl0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQSxTQUFTLFVBQVQsR0FBcUI7QUFDbkI7QUFDQSxTQUFPLFFBQVAsQ0FBZ0IsQ0FBaEIsRUFBbUIsU0FBUyxjQUFULENBQXdCLGtCQUF4QixFQUE0QyxxQkFBNUMsR0FBb0UsTUFBcEUsR0FBNkUsRUFBaEc7QUFDQTtBQUNBLFdBQVMsY0FBVCxDQUF3QixVQUF4QixFQUFvQyxVQUFwQyxDQUErQyxJQUEvQyxHQUFzRCxPQUF0RDtBQUNBO0FBQ0EsV0FBUyxlQUFUOztBQUVBO0FBQ0E7QUFDQSxXQUFTLGFBQVQsR0FBd0I7QUFDdEIsUUFBSSxPQUFPLEVBQUMsV0FBVyxTQUFTLGNBQVQsQ0FBd0IsU0FBeEIsRUFBbUMsS0FBL0M7QUFDQyxlQUFTLFNBQVMsY0FBVCxDQUF3QixXQUF4QixFQUFxQyxLQUQvQztBQUVDLGFBQU8sU0FBUyxjQUFULENBQXdCLFNBQXhCLEVBQW1DLEtBRjNDLEVBQVg7QUFHQTtBQUNBLFNBQUssRUFBTCxHQUFVLElBQUksVUFBSixDQUFlLElBQWYsQ0FBb0IsR0FBcEIsQ0FBVjtBQUNBLFFBQUksaUJBQWlCLEVBQXJCO0FBQ0EsUUFBSSxzQkFBc0IsRUFBMUI7QUFDQTtBQUNBLFNBQUssSUFBSSxJQUFULElBQWlCLElBQWpCLEVBQXNCO0FBQ2xCLDBCQUFvQixJQUFwQixDQUF5QixtQkFBbUIsSUFBbkIsSUFBMkIsR0FBM0IsR0FBaUMsbUJBQW1CLEtBQUssSUFBTCxDQUFuQixDQUExRDtBQUNIO0FBQ0Q7QUFDQSxXQUFPLENBQUMsb0JBQW9CLElBQXBCLENBQXlCLEdBQXpCLEVBQThCLE9BQTlCLENBQXNDLE1BQXRDLEVBQThDLEdBQTlDLENBQUQsRUFBcUQsU0FBUyxjQUFULENBQXdCLFlBQXhCLEVBQXNDLEtBQTNGLENBQVA7QUFDRDs7QUFFRDtBQUNBLFdBQVMsUUFBVCxDQUFrQixJQUFsQixFQUF1QjtBQUNyQjtBQUNBLFFBQUksSUFBSixDQUFTLE1BQVQsRUFBaUIsS0FBSyxDQUFMLENBQWpCLEVBQTBCLElBQTFCO0FBQ0EsUUFBSSxnQkFBSixDQUFxQixjQUFyQixFQUFvQyxtQ0FBcEM7QUFDQTtBQUNBLFFBQUksSUFBSixDQUFTLEtBQUssQ0FBTCxDQUFUO0FBQ0E7QUFDQSxRQUFJLGtCQUFKLEdBQXlCLFlBQVc7QUFDbEM7QUFDQSxVQUFJLENBQUMsS0FBSyxVQUFMLEtBQW9CLGVBQWUsT0FBbkMsSUFBOEMsS0FBSyxVQUFMLEtBQW9CLGVBQWUsSUFBbEYsS0FBMkYsS0FBSyxNQUFMLEtBQWdCLEdBQS9HLEVBQW9IO0FBQ2xILFlBQUksV0FBVyxLQUFLLFlBQXBCO0FBQ0E7QUFDQSxZQUFJLFlBQVksS0FBSyxLQUFMLENBQVcsU0FBUyxTQUFULENBQW1CLFNBQVMsV0FBVCxDQUFxQixXQUFyQixDQUFuQixFQUFzRCxTQUFTLE1BQS9ELENBQVgsQ0FBaEI7QUFDQTtBQUNBO0FBQ0EscUJBQWEsU0FBYjtBQUNBO0FBQ0Esd0JBQWdCLFVBQVUsS0FBVixDQUFnQixJQUFoQztBQUNEO0FBQ0YsS0FaRDtBQWFEO0FBQ0YiLCJmaWxlIjoiZm9ybXN1Ym1pdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFNlbmRzIGRhdGEgZnJvbSB0aGUgZm9ybSB0byB0aGUgc2VydmVyIHNvIHRoYXQgaXQgY2FuIG1ha2UgcXVlcmllcyB0byBUd2l0dGVyLiBcbmZ1bmN0aW9uIGZvcm1TdWJtaXQoKXtcbiAgLy8gSnVtcHMgdGhlIHdpbmRvdyB0byB0aGUgbWFwIGFmdGVyIGEgZm9ybSBzdWJtaXNzaW9uLlxuICB3aW5kb3cuc2Nyb2xsVG8oMCwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Jhbm5lckNvbnRlbnREaXYnKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQgKyAxNSk7XG4gIC8vIFNldCBcInBhdXNlQnRuXCIgdG8gXCJQYXVzZVwiIHRvIGtlZXAgdmlld3MgY29uc2lzdGVudCB3aXRoIHVzZXIncyBhY3Rpdml0eS4gICAgICBcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BhdXNlQnRuJykuZmlyc3RDaGlsZC5kYXRhID0gJ1BhdXNlJztcbiAgLy8gU2VuZCBkYXRhIHRvIHRoZSBzZXJ2ZXIgdGhhdCBoYXMgYmVlbiBzZXJpYWxpemVkIChpLmUuLCBwdXQgaW4gdXJsIGtleS12YWx1ZSBwYWlycywgaW4gYSBzdHJpbmcuKVxuICBzZW5kRGF0YShzZXJpYWxpemVGb3JtKCkpO1xuXG4gIC8vIEdyYWIgdGhlIGRhdGEgZnJvbSB0aGUgaW5wdXQgZmllbGRzIGluIHRoZSBmb3JtLCBjb252ZXJ0IHRoZW0gaW50byB0aGUgdXJsLWVuY29kZWQgcGFpcnMuIFxuICAvLyBSZWZlciB0byBSZWFkbWUubWQsIFwiSUlJLiBXaHkgVHJhY2sgXCJsYXN0SWRcIj9cIiBmb3IgZGV0YWlscyBvbiB3aGF0IHRoZSBcImxhc3RJZFwiIGRvZXMuICBcbiAgZnVuY3Rpb24gc2VyaWFsaXplRm9ybSgpe1xuICAgIHZhciBkYXRhID0geydzdWJqZWN0JzogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzdWJqZWN0XCIpLnZhbHVlLFxuICAgICAgICAgICAgICAgICdzdGFydCc6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic3RhcnRkYXRlXCIpLnZhbHVlLFxuICAgICAgICAgICAgICAgICdlbmQnOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImVuZGRhdGVcIikudmFsdWV9O1xuICAgIC8vIEdldCB0aGUgZmluYWwgdHdlZXQncyBmcm9tIHRoZSBsYXN0IHJlc3BvbnNlLiBNYXkgYmUgYW4gZW1wdHkgc3RyaW5nLiBcbiAgICBkYXRhLmlkID0gbWFwLl9nZXRMYXN0SWQuY2FsbChtYXApO1xuICAgIHZhciB1cmxFbmNvZGVkRGF0YSA9IFwiXCI7XG4gICAgdmFyIHVybEVuY29kZWREYXRhUGFpcnMgPSBbXTtcbiAgICAvLyBMb29wIHRocm91Z2ggdGhlIFwiZGF0YVwiIG9iamVjdCwgY29tcHJpc2VkIG9mIHRoZSB1c2VyJ3MgaW5wdXQsIGFuZCBmb3JtIGEgcXVlcnkgc3RyaW5nLiBcbiAgICBmb3IgKHZhciBuYW1lIGluIGRhdGEpe1xuICAgICAgICB1cmxFbmNvZGVkRGF0YVBhaXJzLnB1c2goZW5jb2RlVVJJQ29tcG9uZW50KG5hbWUpICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGRhdGFbbmFtZV0pKTtcbiAgICB9XG4gICAgLy8gXCJtb2RlXCIgdGVsbHMgdGhlIHNlcnZlciB3aGVyZSB0byBzZW5kIHRoZSBxdWVyeSBwYXJhbWV0ZXJzLiBCZXN0IGtlcHQgc2VwYXJhdGUgZnJvbSB0aGUgcXVlcnkgaXRzZWxmIGZvciBlYXNpZXIgYWNjZXNzIGJlbG93LlxuICAgIHJldHVybiBbdXJsRW5jb2RlZERhdGFQYWlycy5qb2luKCcmJykucmVwbGFjZSgvJTIwL2csICcrJyksIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtb2RlU2VsZWN0JykudmFsdWVdO1xuICB9XG5cbiAgLy8gU2VuZCB0aGUgZGF0YSBmcm9tIHRoZSBmb3JtLCBpbiBhIHVybCBzdHJpbmcsIHRvIHRoZSBzZXJ2ZXIgZm9yIHBhcnNpbmcuIFxuICBmdW5jdGlvbiBzZW5kRGF0YShkYXRhKXtcbiAgICAvLyBcImRhdGFbMV1cIiB3aWxsIGVpdGhlciBiZSAnL3N0cmVhbVR3ZWV0cycgb3IgJy9nZXRUd2VldHMnIChcIm1vZGVcIiwgZnJvbSB0aGUgcHJldmlvdXMgZnVuY3Rpb24pLlxuICAgIHhoci5vcGVuKCdQT1NUJywgZGF0YVsxXSwgdHJ1ZSk7XG4gICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcpO1xuICAgIC8vIFRoZSB1cmwtZW5jb2RlZCBrZXktdmFsdWUgcGFpcnMgYXJlIGluIFwiZGF0YVswXVwiLiBUaGlzIGlzIHdoYXQgdGhlIHNlcnZlciB3aWxsIGNvbnN1bWUuXG4gICAgeGhyLnNlbmQoZGF0YVswXSk7XG4gICAgLy8gU2V0IHRoZSBsaXN0ZW5lciBmb3Igd2hlbiB0aGUgc2VydmVyIHN0YXJ0cyB3cml0aW5nIHJlc3BvbnNlcy5cbiAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCl7XG4gICAgICAvLyBOb3RlIHRoZSB1c2Ugb2YgXCJMT0FESU5HXCI6IGRhdGEgd2lsbCBiZSB1c2FibGUgYmVmb3JlIHRoZSByZXF1ZXN0IGlzIFwiRE9ORVwiLlxuICAgICAgaWYgKCh0aGlzLnJlYWR5U3RhdGUgPT09IFhNTEh0dHBSZXF1ZXN0LkxPQURJTkcgfHwgdGhpcy5yZWFkeVN0YXRlID09PSBYTUxIdHRwUmVxdWVzdC5ET05FKSAmJiB0aGlzLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgIHZhciByZXNwb25zZSA9IHRoaXMucmVzcG9uc2VUZXh0O1xuICAgICAgICAvLyAne1widGV4dFwiOlwiJycgZGVsaW1pdHMgdGhlIHN0YXJ0IG9mIGEgbmV3IHR3ZWV0LCBhY2NvcmRpbmcgdG8gYXNzaWdubWVudCBvZiBcInJlc3VsdFwiIGluIFwidGhpcy5hbmFseXplXCIgaW4gXCJ0d2VldEFuYWx5emVyLmpzXCJcbiAgICAgICAgdmFyIGpzb25Ud2VldCA9IEpTT04ucGFyc2UocmVzcG9uc2Uuc3Vic3RyaW5nKHJlc3BvbnNlLmxhc3RJbmRleE9mKCd7XCJ0ZXh0XCI6XCInKSwgcmVzcG9uc2UubGVuZ3RoKSk7ICAgICAgICBcbiAgICAgICAgLy8gQ2FsbGluZyBcImdlb0NvZGVUd2VldFwiIGNoYWlucyBcImNyZWF0ZVR3ZWV0Q2lyY2xlXCIuIFRob3NlIHR3byB0YWtlIHRoZSBkYXRhIGZyb20gdGhlIHJlc3BvbnNlIGFsbCB0aGUgd2F5IHRvIHRoZSBcbiAgICAgICAgLy8gaW50ZXJhY3RpdmUgbWFwIG9iamVjdHMgYW5kIGxpbmtzIHRoYXQgbWFrZSB1cCB0aGUgZnJvbnQgZW5kJ3MgZmluYWwgdmlldyBzdGF0ZS4gICAgICAgICBcbiAgICAgICAgZ2VvQ29kZVR3ZWV0KGpzb25Ud2VldCk7XG4gICAgICAgIC8vIFwidXBkYXRlTW9vZEJveGVzXCIgY2hhbmdlcyB0aGUgY29sb3JzIGJlbG93IHRoZSB0ZXh0IGNyYXdsLiBcbiAgICAgICAgdXBkYXRlTW9vZEJveGVzKGpzb25Ud2VldC5zdGF0cy5tb29kKTsgICAgICAgICBcbiAgICAgIH1cbiAgICB9ICAgICAgICAgXG4gIH1cbn0iXX0=