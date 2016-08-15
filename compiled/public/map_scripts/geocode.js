'use strict';

/*

  See Readme VII: "Comments on Geocoding Usage" for why I use four geocoders and general issues of using 
  them with streaming data.

*/

// The basic pattern here is: 1) Grab the location from a tweet, 2) send the location to a geocoder
// service, 3) pass the response to "createTweetCircle". This is done for one geocoder at a time, with 
// a cycle of four geocoders used.
function geoCodeTweet(tweet) {
  var center;
  // If the user location is null, the tweet will go to the center of "tweetDump". 
  if (tweet.location != null) {
    // The next 2 lines separate the location from the 2-letter id code I set in "tweetAnalyzer". This 
    // code will be used to indicate what format the address has. 
    var location = tweet.location.substring(3, tweet.location.length);
    var id = tweet.location.substring(0, 3);
    // Update the tweet's location, now without its id code, for display in "drawTweetCircle".
    tweet.location = location;
    switch (id) {
      // Here, locations are already coordinates and do not need geocoding.
      case 'CO:':
        var latLng = location.split(",");
        // This format for "center" is standardized across geocoder responses. This helps with the later href map panning function. 
        center = { 'lat': Number(latLng[0]), 'lng': Number(latLng[1]) };
        break;

      // UL stands for "user location". Cycle through geocoders. 
      case 'UL:':
        switch (turnstileCount) {
          // 0: Query the Google geocoder.
          case 0:
            // Increment "turnstileCount", so the next time this function is called, the next geocoder in line is used.
            turnstileCount++;
            // Use Google's geocoder object to make a query.
            geoCoder.geocode({ 'address': location }, function (results, status) {
              if (status == google.maps.GeocoderStatus.OK) {
                // Make sure the results exist where I'm expecting them before making an assignment to "center".
                if (results[0].geometry != null && results[0].geometry.location != null) {
                  center = results[0].geometry.location;
                  // Standardize "center"'s format for later use.
                  center = { 'lat': center.lat(), 'lng': center.lng() };
                  // Send the tweet and center to "createTweetCircle" for making the final view state.
                  createTweetCircle(tweet, center);
                }
              } else if (status == google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
                // This message will show if usage exceeds a per-second or per-day max. 
                console.log('Oh no! The app has maxed out Google geocoder queries. Try again later.');
              }
            });
            break;

          // 1: Query the mapquest geocoder service using the "getGeo" helper function.    
          case 1:
            turnstileCount++;
            getGeo('https://www.mapquestapi.com/geocoding/v1/address?key=bTOgIMAbO4p0SvZmAgD9EIFVxqO2MocO&maxResults=1&location=' + location, 'mapQuest');
            break;

          // 2: Query the Open Cage geocoder service using the "getGeo" helper function.     
          case 2:
            turnstileCount++;
            getGeo('https://api.opencagedata.com/geocode/v1/json?q=' + location + '&key=02b58331c3075f21b23ab96521c85d81&limit=1', 'OpenCage');
            break;

          // 3: Query the bing geocoder service.  
          case 3:
            // Here's where the "turnstileCount" is reset, such that, next time "geoCodeTweet" is called, it'll start
            // with the case 0 geocoder (Google's), then work back down the list from there. 
            turnstileCount = 0;
            var geocodeRequest = 'https://dev.virtualearth.net/REST/v1/Locations?query=' + location + '&maxResults=1&key=Ap-VHxhCSyNJIBPYQptUIuYtx-CRsgCFFbWSLk6bmynl5Di_xn0CerxeblD-kVEb&jsonp=bingCallback';
            // Due to lack of CORS support for bing's service, I use a blank script ("bingScript" is included with all
            // the other scripts in the header of "index.html"), then set its "src" to the user-parameterized 
            // query string above. "bingScript" will now have the results from that query in it. When "bingCallback" 
            // fires, it grabs data from those results and processes them in the same pattern as the above cases. 
            bingScript.setAttribute('src', geocodeRequest);
            // This callback fires as soon as the "geocodeRequest" is set to bingScript's "src" attribute in the above
            // line. The callback repeats the same pattern as the above cases. 
            bingCallback = function bingCallback(response) {
              if (response.resourceSets[0].resources[0]) {
                center = response.resourceSets[0].resources[0].point.coordinates;
                center = { 'lat': Number(center[0]), 'lng': Number(center[1]) };
                if (center) {
                  createTweetCircle(tweet, center);
                }
              }
            };
            break;
        }
        break;
    }
    // If the tweet didn't have a location, send it to "tweetDump".   
  } else if (location == null) {
    center = DefaultCenter;
    // "default" will be used here for telling "tweetCircleDraw" when to highlight "tweetDump" for the user.
    createTweetCircle(tweet, center, 'default');
  }

  // This helper function makes an ajax GET query to either Open Cage or mapQuest. Used to condense their repetitive logic.
  function getGeo(url, source) {
    var geoXHR = new XMLHttpRequest();
    // The url here is a user-parameterized query string.  
    geoXHR.open('GET', url);
    geoXHR.send();
    geoXHR.onreadystatechange = function () {
      if (geoXHR.readyState == XMLHttpRequest.DONE && geoXHR.status == 200) {
        // Results from both services come as JSON strings. 
        var response = JSON.parse(geoXHR.responseText);
        if (response.results[0]) {
          // The returns from the queries do not come in the same format, which is why it's necessary to have separate assignments. The 
          // first option is how mapQuest results must be assigned, the second is for Open Cage results.
          source == 'mapQuest' ? center = response.results[0].locations[0].latLng : center = response.results[0].geometry;
          if (center) {
            createTweetCircle(tweet, center);
          }
        }
      }
    };
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3B1YmxpYy9tYXBfc2NyaXB0cy9nZW9jb2RlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7QUFPQTtBQUNBO0FBQ0E7QUFDQSxTQUFTLFlBQVQsQ0FBc0IsS0FBdEIsRUFBNEI7QUFDMUIsTUFBSSxNQUFKO0FBQ0E7QUFDQSxNQUFJLE1BQU0sUUFBTixJQUFrQixJQUF0QixFQUEyQjtBQUN6QjtBQUNBO0FBQ0EsUUFBSSxXQUFXLE1BQU0sUUFBTixDQUFlLFNBQWYsQ0FBeUIsQ0FBekIsRUFBNEIsTUFBTSxRQUFOLENBQWUsTUFBM0MsQ0FBZjtBQUNBLFFBQUksS0FBSyxNQUFNLFFBQU4sQ0FBZSxTQUFmLENBQXlCLENBQXpCLEVBQTRCLENBQTVCLENBQVQ7QUFDQTtBQUNBLFVBQU0sUUFBTixHQUFpQixRQUFqQjtBQUNBLFlBQU8sRUFBUDtBQUNFO0FBQ0EsV0FBSyxLQUFMO0FBQ0UsWUFBSSxTQUFTLFNBQVMsS0FBVCxDQUFlLEdBQWYsQ0FBYjtBQUNBO0FBQ0EsaUJBQVMsRUFBQyxPQUFPLE9BQU8sT0FBTyxDQUFQLENBQVAsQ0FBUixFQUEyQixPQUFPLE9BQU8sT0FBTyxDQUFQLENBQVAsQ0FBbEMsRUFBVDtBQUNBOztBQUVGO0FBQ0EsV0FBSyxLQUFMO0FBQ0UsZ0JBQU8sY0FBUDtBQUNFO0FBQ0EsZUFBSyxDQUFMO0FBQ0U7QUFDQTtBQUNBO0FBQ0EscUJBQVMsT0FBVCxDQUFpQixFQUFDLFdBQVUsUUFBWCxFQUFqQixFQUF1QyxVQUFTLE9BQVQsRUFBa0IsTUFBbEIsRUFBeUI7QUFDOUQsa0JBQUksVUFBVSxPQUFPLElBQVAsQ0FBWSxjQUFaLENBQTJCLEVBQXpDLEVBQTRDO0FBQ3hDO0FBQ0Esb0JBQUksUUFBUSxDQUFSLEVBQVcsUUFBWCxJQUF1QixJQUF2QixJQUErQixRQUFRLENBQVIsRUFBVyxRQUFYLENBQW9CLFFBQXBCLElBQWdDLElBQW5FLEVBQXdFO0FBQ3RFLDJCQUFTLFFBQVEsQ0FBUixFQUFXLFFBQVgsQ0FBb0IsUUFBN0I7QUFDQTtBQUNBLDJCQUFTLEVBQUMsT0FBTyxPQUFPLEdBQVAsRUFBUixFQUFzQixPQUFPLE9BQU8sR0FBUCxFQUE3QixFQUFUO0FBQ0E7QUFDQSxvQ0FBa0IsS0FBbEIsRUFBeUIsTUFBekI7QUFDRDtBQUNGLGVBVEgsTUFTUyxJQUFJLFVBQVUsT0FBTyxJQUFQLENBQVksY0FBWixDQUEyQixnQkFBekMsRUFBMEQ7QUFDL0Q7QUFDQSx3QkFBUSxHQUFSLENBQVksd0VBQVo7QUFDRDtBQUNGLGFBZEg7QUFlRTs7QUFFSjtBQUNBLGVBQUssQ0FBTDtBQUNFO0FBQ0EsbUJBQVEsaUhBQWlILFFBQXpILEVBQW9JLFVBQXBJO0FBQ0E7O0FBRUY7QUFDQSxlQUFLLENBQUw7QUFDRTtBQUNBLG1CQUFRLG9EQUFvRCxRQUFwRCxHQUErRCwrQ0FBdkUsRUFBeUgsVUFBekg7QUFDQTs7QUFFRjtBQUNBLGVBQUssQ0FBTDtBQUNFO0FBQ0E7QUFDQSw2QkFBaUIsQ0FBakI7QUFDQSxnQkFBSSxpQkFBaUIsMERBQTBELFFBQTFELEdBQ2pCLHVHQURKO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSx1QkFBVyxZQUFYLENBQXdCLEtBQXhCLEVBQStCLGNBQS9CO0FBQ0E7QUFDQTtBQUNBLDJCQUFlLHNCQUFTLFFBQVQsRUFBa0I7QUFDL0Isa0JBQUcsU0FBUyxZQUFULENBQXNCLENBQXRCLEVBQXlCLFNBQXpCLENBQW1DLENBQW5DLENBQUgsRUFBeUM7QUFDdkMseUJBQVMsU0FBUyxZQUFULENBQXNCLENBQXRCLEVBQXlCLFNBQXpCLENBQW1DLENBQW5DLEVBQXNDLEtBQXRDLENBQTRDLFdBQXJEO0FBQ0EseUJBQVMsRUFBQyxPQUFPLE9BQU8sT0FBTyxDQUFQLENBQVAsQ0FBUixFQUEyQixPQUFPLE9BQU8sT0FBTyxDQUFQLENBQVAsQ0FBbEMsRUFBVDtBQUNBLG9CQUFJLE1BQUosRUFBWTtBQUNWLG9DQUFrQixLQUFsQixFQUF5QixNQUF6QjtBQUNEO0FBQ0Y7QUFDRixhQVJEO0FBU0E7QUExREo7QUE0REY7QUF0RUY7QUF3RUY7QUFDQyxHQWhGRCxNQWdGTyxJQUFJLFlBQVksSUFBaEIsRUFBcUI7QUFDMUIsYUFBUyxhQUFUO0FBQ0E7QUFDQSxzQkFBa0IsS0FBbEIsRUFBeUIsTUFBekIsRUFBaUMsU0FBakM7QUFDRDs7QUFFRDtBQUNBLFdBQVMsTUFBVCxDQUFnQixHQUFoQixFQUFxQixNQUFyQixFQUE0QjtBQUMxQixRQUFJLFNBQVMsSUFBSSxjQUFKLEVBQWI7QUFDQTtBQUNBLFdBQU8sSUFBUCxDQUFZLEtBQVosRUFBbUIsR0FBbkI7QUFDQSxXQUFPLElBQVA7QUFDQSxXQUFPLGtCQUFQLEdBQTRCLFlBQVU7QUFDcEMsVUFBSSxPQUFPLFVBQVAsSUFBcUIsZUFBZSxJQUFwQyxJQUE0QyxPQUFPLE1BQVAsSUFBaUIsR0FBakUsRUFBc0U7QUFDcEU7QUFDQSxZQUFJLFdBQVcsS0FBSyxLQUFMLENBQVcsT0FBTyxZQUFsQixDQUFmO0FBQ0EsWUFBRyxTQUFTLE9BQVQsQ0FBaUIsQ0FBakIsQ0FBSCxFQUF1QjtBQUNyQjtBQUNBO0FBQ0Esb0JBQVUsVUFBVixHQUF1QixTQUFTLFNBQVMsT0FBVCxDQUFpQixDQUFqQixFQUFvQixTQUFwQixDQUE4QixDQUE5QixFQUFpQyxNQUFqRSxHQUE0RSxTQUFTLFNBQVMsT0FBVCxDQUFpQixDQUFqQixFQUFvQixRQUF6RztBQUNBLGNBQUksTUFBSixFQUFZO0FBQ1YsOEJBQWtCLEtBQWxCLEVBQXlCLE1BQXpCO0FBQ0Q7QUFDRjtBQUNGO0FBQ0YsS0FiRDtBQWNEO0FBQ0YiLCJmaWxlIjoiZ2VvY29kZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG5cbiAgU2VlIFJlYWRtZSBWSUk6IFwiQ29tbWVudHMgb24gR2VvY29kaW5nIFVzYWdlXCIgZm9yIHdoeSBJIHVzZSBmb3VyIGdlb2NvZGVycyBhbmQgZ2VuZXJhbCBpc3N1ZXMgb2YgdXNpbmcgXG4gIHRoZW0gd2l0aCBzdHJlYW1pbmcgZGF0YS5cblxuKi9cblxuLy8gVGhlIGJhc2ljIHBhdHRlcm4gaGVyZSBpczogMSkgR3JhYiB0aGUgbG9jYXRpb24gZnJvbSBhIHR3ZWV0LCAyKSBzZW5kIHRoZSBsb2NhdGlvbiB0byBhIGdlb2NvZGVyXG4vLyBzZXJ2aWNlLCAzKSBwYXNzIHRoZSByZXNwb25zZSB0byBcImNyZWF0ZVR3ZWV0Q2lyY2xlXCIuIFRoaXMgaXMgZG9uZSBmb3Igb25lIGdlb2NvZGVyIGF0IGEgdGltZSwgd2l0aCBcbi8vIGEgY3ljbGUgb2YgZm91ciBnZW9jb2RlcnMgdXNlZC5cbmZ1bmN0aW9uIGdlb0NvZGVUd2VldCh0d2VldCl7XG4gIHZhciBjZW50ZXI7XG4gIC8vIElmIHRoZSB1c2VyIGxvY2F0aW9uIGlzIG51bGwsIHRoZSB0d2VldCB3aWxsIGdvIHRvIHRoZSBjZW50ZXIgb2YgXCJ0d2VldER1bXBcIi4gXG4gIGlmICh0d2VldC5sb2NhdGlvbiAhPSBudWxsKXtcbiAgICAvLyBUaGUgbmV4dCAyIGxpbmVzIHNlcGFyYXRlIHRoZSBsb2NhdGlvbiBmcm9tIHRoZSAyLWxldHRlciBpZCBjb2RlIEkgc2V0IGluIFwidHdlZXRBbmFseXplclwiLiBUaGlzIFxuICAgIC8vIGNvZGUgd2lsbCBiZSB1c2VkIHRvIGluZGljYXRlIHdoYXQgZm9ybWF0IHRoZSBhZGRyZXNzIGhhcy4gXG4gICAgdmFyIGxvY2F0aW9uID0gdHdlZXQubG9jYXRpb24uc3Vic3RyaW5nKDMsIHR3ZWV0LmxvY2F0aW9uLmxlbmd0aCk7XG4gICAgdmFyIGlkID0gdHdlZXQubG9jYXRpb24uc3Vic3RyaW5nKDAsIDMpO1xuICAgIC8vIFVwZGF0ZSB0aGUgdHdlZXQncyBsb2NhdGlvbiwgbm93IHdpdGhvdXQgaXRzIGlkIGNvZGUsIGZvciBkaXNwbGF5IGluIFwiZHJhd1R3ZWV0Q2lyY2xlXCIuXG4gICAgdHdlZXQubG9jYXRpb24gPSBsb2NhdGlvbjtcbiAgICBzd2l0Y2goaWQpe1xuICAgICAgLy8gSGVyZSwgbG9jYXRpb25zIGFyZSBhbHJlYWR5IGNvb3JkaW5hdGVzIGFuZCBkbyBub3QgbmVlZCBnZW9jb2RpbmcuXG4gICAgICBjYXNlICdDTzonOlxuICAgICAgICB2YXIgbGF0TG5nID0gbG9jYXRpb24uc3BsaXQoXCIsXCIpO1xuICAgICAgICAvLyBUaGlzIGZvcm1hdCBmb3IgXCJjZW50ZXJcIiBpcyBzdGFuZGFyZGl6ZWQgYWNyb3NzIGdlb2NvZGVyIHJlc3BvbnNlcy4gVGhpcyBoZWxwcyB3aXRoIHRoZSBsYXRlciBocmVmIG1hcCBwYW5uaW5nIGZ1bmN0aW9uLiBcbiAgICAgICAgY2VudGVyID0geydsYXQnOiBOdW1iZXIobGF0TG5nWzBdKSwgJ2xuZyc6IE51bWJlcihsYXRMbmdbMV0pfTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIC8vIFVMIHN0YW5kcyBmb3IgXCJ1c2VyIGxvY2F0aW9uXCIuIEN5Y2xlIHRocm91Z2ggZ2VvY29kZXJzLiBcbiAgICAgIGNhc2UgJ1VMOic6XG4gICAgICAgIHN3aXRjaCh0dXJuc3RpbGVDb3VudCl7XG4gICAgICAgICAgLy8gMDogUXVlcnkgdGhlIEdvb2dsZSBnZW9jb2Rlci5cbiAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAvLyBJbmNyZW1lbnQgXCJ0dXJuc3RpbGVDb3VudFwiLCBzbyB0aGUgbmV4dCB0aW1lIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkLCB0aGUgbmV4dCBnZW9jb2RlciBpbiBsaW5lIGlzIHVzZWQuXG4gICAgICAgICAgICB0dXJuc3RpbGVDb3VudCsrOyBcbiAgICAgICAgICAgIC8vIFVzZSBHb29nbGUncyBnZW9jb2RlciBvYmplY3QgdG8gbWFrZSBhIHF1ZXJ5LlxuICAgICAgICAgICAgZ2VvQ29kZXIuZ2VvY29kZSh7J2FkZHJlc3MnOmxvY2F0aW9ufSwgZnVuY3Rpb24ocmVzdWx0cywgc3RhdHVzKXtcbiAgICAgICAgICAgICAgaWYgKHN0YXR1cyA9PSBnb29nbGUubWFwcy5HZW9jb2RlclN0YXR1cy5PSyl7XG4gICAgICAgICAgICAgICAgICAvLyBNYWtlIHN1cmUgdGhlIHJlc3VsdHMgZXhpc3Qgd2hlcmUgSSdtIGV4cGVjdGluZyB0aGVtIGJlZm9yZSBtYWtpbmcgYW4gYXNzaWdubWVudCB0byBcImNlbnRlclwiLlxuICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdHNbMF0uZ2VvbWV0cnkgIT0gbnVsbCAmJiByZXN1bHRzWzBdLmdlb21ldHJ5LmxvY2F0aW9uICE9IG51bGwpe1xuICAgICAgICAgICAgICAgICAgICBjZW50ZXIgPSByZXN1bHRzWzBdLmdlb21ldHJ5LmxvY2F0aW9uO1xuICAgICAgICAgICAgICAgICAgICAvLyBTdGFuZGFyZGl6ZSBcImNlbnRlclwiJ3MgZm9ybWF0IGZvciBsYXRlciB1c2UuXG4gICAgICAgICAgICAgICAgICAgIGNlbnRlciA9IHsnbGF0JzogY2VudGVyLmxhdCgpLCAnbG5nJzogY2VudGVyLmxuZygpfTtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2VuZCB0aGUgdHdlZXQgYW5kIGNlbnRlciB0byBcImNyZWF0ZVR3ZWV0Q2lyY2xlXCIgZm9yIG1ha2luZyB0aGUgZmluYWwgdmlldyBzdGF0ZS5cbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlVHdlZXRDaXJjbGUodHdlZXQsIGNlbnRlcik7XG4gICAgICAgICAgICAgICAgICB9ICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzdGF0dXMgPT0gZ29vZ2xlLm1hcHMuR2VvY29kZXJTdGF0dXMuT1ZFUl9RVUVSWV9MSU1JVCl7XG4gICAgICAgICAgICAgICAgICAvLyBUaGlzIG1lc3NhZ2Ugd2lsbCBzaG93IGlmIHVzYWdlIGV4Y2VlZHMgYSBwZXItc2Vjb25kIG9yIHBlci1kYXkgbWF4LiBcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdPaCBubyEgVGhlIGFwcCBoYXMgbWF4ZWQgb3V0IEdvb2dsZSBnZW9jb2RlciBxdWVyaWVzLiBUcnkgYWdhaW4gbGF0ZXIuJylcbiAgICAgICAgICAgICAgICB9ICBcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgLy8gMTogUXVlcnkgdGhlIG1hcHF1ZXN0IGdlb2NvZGVyIHNlcnZpY2UgdXNpbmcgdGhlIFwiZ2V0R2VvXCIgaGVscGVyIGZ1bmN0aW9uLiAgICBcbiAgICAgICAgICBjYXNlIDE6ICBcbiAgICAgICAgICAgIHR1cm5zdGlsZUNvdW50Kys7XG4gICAgICAgICAgICBnZXRHZW8oKCdodHRwczovL3d3dy5tYXBxdWVzdGFwaS5jb20vZ2VvY29kaW5nL3YxL2FkZHJlc3M/a2V5PWJUT2dJTUFiTzRwMFN2Wm1BZ0Q5RUlGVnhxTzJNb2NPJm1heFJlc3VsdHM9MSZsb2NhdGlvbj0nICsgbG9jYXRpb24pLCAnbWFwUXVlc3QnKTtcbiAgICAgICAgICAgIGJyZWFrOyBcblxuICAgICAgICAgIC8vIDI6IFF1ZXJ5IHRoZSBPcGVuIENhZ2UgZ2VvY29kZXIgc2VydmljZSB1c2luZyB0aGUgXCJnZXRHZW9cIiBoZWxwZXIgZnVuY3Rpb24uICAgICBcbiAgICAgICAgICBjYXNlIDI6IFxuICAgICAgICAgICAgdHVybnN0aWxlQ291bnQrKzsgXG4gICAgICAgICAgICBnZXRHZW8oKCdodHRwczovL2FwaS5vcGVuY2FnZWRhdGEuY29tL2dlb2NvZGUvdjEvanNvbj9xPScgKyBsb2NhdGlvbiArICcma2V5PTAyYjU4MzMxYzMwNzVmMjFiMjNhYjk2NTIxYzg1ZDgxJmxpbWl0PTEnKSwgJ09wZW5DYWdlJyk7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIC8vIDM6IFF1ZXJ5IHRoZSBiaW5nIGdlb2NvZGVyIHNlcnZpY2UuICBcbiAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICAvLyBIZXJlJ3Mgd2hlcmUgdGhlIFwidHVybnN0aWxlQ291bnRcIiBpcyByZXNldCwgc3VjaCB0aGF0LCBuZXh0IHRpbWUgXCJnZW9Db2RlVHdlZXRcIiBpcyBjYWxsZWQsIGl0J2xsIHN0YXJ0XG4gICAgICAgICAgICAvLyB3aXRoIHRoZSBjYXNlIDAgZ2VvY29kZXIgKEdvb2dsZSdzKSwgdGhlbiB3b3JrIGJhY2sgZG93biB0aGUgbGlzdCBmcm9tIHRoZXJlLiBcbiAgICAgICAgICAgIHR1cm5zdGlsZUNvdW50ID0gMDtcbiAgICAgICAgICAgIHZhciBnZW9jb2RlUmVxdWVzdCA9ICdodHRwczovL2Rldi52aXJ0dWFsZWFydGgubmV0L1JFU1QvdjEvTG9jYXRpb25zP3F1ZXJ5PScgKyBsb2NhdGlvblxuICAgICAgICAgICAgICArICcmbWF4UmVzdWx0cz0xJmtleT1BcC1WSHhoQ1N5TkpJQlBZUXB0VUl1WXR4LUNSc2dDRkZiV1NMazZibXlubDVEaV94bjBDZXJ4ZWJsRC1rVkViJmpzb25wPWJpbmdDYWxsYmFjayc7XG4gICAgICAgICAgICAvLyBEdWUgdG8gbGFjayBvZiBDT1JTIHN1cHBvcnQgZm9yIGJpbmcncyBzZXJ2aWNlLCBJIHVzZSBhIGJsYW5rIHNjcmlwdCAoXCJiaW5nU2NyaXB0XCIgaXMgaW5jbHVkZWQgd2l0aCBhbGxcbiAgICAgICAgICAgIC8vIHRoZSBvdGhlciBzY3JpcHRzIGluIHRoZSBoZWFkZXIgb2YgXCJpbmRleC5odG1sXCIpLCB0aGVuIHNldCBpdHMgXCJzcmNcIiB0byB0aGUgdXNlci1wYXJhbWV0ZXJpemVkIFxuICAgICAgICAgICAgLy8gcXVlcnkgc3RyaW5nIGFib3ZlLiBcImJpbmdTY3JpcHRcIiB3aWxsIG5vdyBoYXZlIHRoZSByZXN1bHRzIGZyb20gdGhhdCBxdWVyeSBpbiBpdC4gV2hlbiBcImJpbmdDYWxsYmFja1wiIFxuICAgICAgICAgICAgLy8gZmlyZXMsIGl0IGdyYWJzIGRhdGEgZnJvbSB0aG9zZSByZXN1bHRzIGFuZCBwcm9jZXNzZXMgdGhlbSBpbiB0aGUgc2FtZSBwYXR0ZXJuIGFzIHRoZSBhYm92ZSBjYXNlcy4gXG4gICAgICAgICAgICBiaW5nU2NyaXB0LnNldEF0dHJpYnV0ZSgnc3JjJywgZ2VvY29kZVJlcXVlc3QpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRoaXMgY2FsbGJhY2sgZmlyZXMgYXMgc29vbiBhcyB0aGUgXCJnZW9jb2RlUmVxdWVzdFwiIGlzIHNldCB0byBiaW5nU2NyaXB0J3MgXCJzcmNcIiBhdHRyaWJ1dGUgaW4gdGhlIGFib3ZlXG4gICAgICAgICAgICAvLyBsaW5lLiBUaGUgY2FsbGJhY2sgcmVwZWF0cyB0aGUgc2FtZSBwYXR0ZXJuIGFzIHRoZSBhYm92ZSBjYXNlcy4gXG4gICAgICAgICAgICBiaW5nQ2FsbGJhY2sgPSBmdW5jdGlvbihyZXNwb25zZSl7IFxuICAgICAgICAgICAgICBpZihyZXNwb25zZS5yZXNvdXJjZVNldHNbMF0ucmVzb3VyY2VzWzBdKXtcbiAgICAgICAgICAgICAgICBjZW50ZXIgPSByZXNwb25zZS5yZXNvdXJjZVNldHNbMF0ucmVzb3VyY2VzWzBdLnBvaW50LmNvb3JkaW5hdGVzO1xuICAgICAgICAgICAgICAgIGNlbnRlciA9IHsnbGF0JzogTnVtYmVyKGNlbnRlclswXSksICdsbmcnOiBOdW1iZXIoY2VudGVyWzFdKX1cbiAgICAgICAgICAgICAgICBpZiAoY2VudGVyKSB7XG4gICAgICAgICAgICAgICAgICBjcmVhdGVUd2VldENpcmNsZSh0d2VldCwgY2VudGVyKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH0gICAgXG4gICAgICBicmVhaztcbiAgICB9XG4gIC8vIElmIHRoZSB0d2VldCBkaWRuJ3QgaGF2ZSBhIGxvY2F0aW9uLCBzZW5kIGl0IHRvIFwidHdlZXREdW1wXCIuICAgXG4gIH0gZWxzZSBpZiAobG9jYXRpb24gPT0gbnVsbCl7XG4gICAgY2VudGVyID0gRGVmYXVsdENlbnRlcjtcbiAgICAvLyBcImRlZmF1bHRcIiB3aWxsIGJlIHVzZWQgaGVyZSBmb3IgdGVsbGluZyBcInR3ZWV0Q2lyY2xlRHJhd1wiIHdoZW4gdG8gaGlnaGxpZ2h0IFwidHdlZXREdW1wXCIgZm9yIHRoZSB1c2VyLlxuICAgIGNyZWF0ZVR3ZWV0Q2lyY2xlKHR3ZWV0LCBjZW50ZXIsICdkZWZhdWx0Jyk7XG4gIH1cblxuICAvLyBUaGlzIGhlbHBlciBmdW5jdGlvbiBtYWtlcyBhbiBhamF4IEdFVCBxdWVyeSB0byBlaXRoZXIgT3BlbiBDYWdlIG9yIG1hcFF1ZXN0LiBVc2VkIHRvIGNvbmRlbnNlIHRoZWlyIHJlcGV0aXRpdmUgbG9naWMuXG4gIGZ1bmN0aW9uIGdldEdlbyh1cmwsIHNvdXJjZSl7XG4gICAgdmFyIGdlb1hIUiA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIC8vIFRoZSB1cmwgaGVyZSBpcyBhIHVzZXItcGFyYW1ldGVyaXplZCBxdWVyeSBzdHJpbmcuICBcbiAgICBnZW9YSFIub3BlbignR0VUJywgdXJsKTtcbiAgICBnZW9YSFIuc2VuZCgpOyAgXG4gICAgZ2VvWEhSLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCl7XG4gICAgICBpZiAoZ2VvWEhSLnJlYWR5U3RhdGUgPT0gWE1MSHR0cFJlcXVlc3QuRE9ORSAmJiBnZW9YSFIuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAvLyBSZXN1bHRzIGZyb20gYm90aCBzZXJ2aWNlcyBjb21lIGFzIEpTT04gc3RyaW5ncy4gXG4gICAgICAgIHZhciByZXNwb25zZSA9IEpTT04ucGFyc2UoZ2VvWEhSLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgIGlmKHJlc3BvbnNlLnJlc3VsdHNbMF0pe1xuICAgICAgICAgIC8vIFRoZSByZXR1cm5zIGZyb20gdGhlIHF1ZXJpZXMgZG8gbm90IGNvbWUgaW4gdGhlIHNhbWUgZm9ybWF0LCB3aGljaCBpcyB3aHkgaXQncyBuZWNlc3NhcnkgdG8gaGF2ZSBzZXBhcmF0ZSBhc3NpZ25tZW50cy4gVGhlIFxuICAgICAgICAgIC8vIGZpcnN0IG9wdGlvbiBpcyBob3cgbWFwUXVlc3QgcmVzdWx0cyBtdXN0IGJlIGFzc2lnbmVkLCB0aGUgc2Vjb25kIGlzIGZvciBPcGVuIENhZ2UgcmVzdWx0cy5cbiAgICAgICAgICBzb3VyY2UgPT0gJ21hcFF1ZXN0Jz8gKGNlbnRlciA9IHJlc3BvbnNlLnJlc3VsdHNbMF0ubG9jYXRpb25zWzBdLmxhdExuZykgOiAoY2VudGVyID0gcmVzcG9uc2UucmVzdWx0c1swXS5nZW9tZXRyeSk7XG4gICAgICAgICAgaWYgKGNlbnRlcikgeyAgICAgXG4gICAgICAgICAgICBjcmVhdGVUd2VldENpcmNsZSh0d2VldCwgY2VudGVyKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBcbiAgICB9OyAgICAgICAgICAgICAgXG4gIH0gIFxufSJdfQ==