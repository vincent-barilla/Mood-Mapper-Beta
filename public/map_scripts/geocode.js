/*
  See Readme VII: "Comments on geocoding usage" for a discussion on why I use four geocoders, and 
  general issues of working with them, with live data.
*/

// The basic pattern here is: 1) Grab the location from a tweet, 2) send the location to a geocoder
// service, 3) pass the response to "createTweetCircle", 4) see a circle mapped at the returned coordinates. 
// This is done for one geocoder at a time, with a cycle of four geocoders being used to handle the load
// of live data. 
function geoCodeTweet(tweet){
  var center;
  // If the user location is null, the tweet will go to the center of "tweetDump". 
  if (tweet.location != null){
    // The next 2 lines separate the location from the 2-letter id code I set in "tweetAnalyzer". This 
    // code will be used to indicate what format the address has. 
    var location = tweet.location.substring(3, tweet.location.length);
    var id = tweet.location.substring(0, 3);
    // Update the tweet's location, now without its id code, for display in "drawTweetCircle".
    tweet.location = location;
    switch(id){
      
      // Here, locations are already coordinates, and do not need geocoding.
      case 'CO:':
        var latLng = location.split(",");
        // This format for "center" is standardized across all cases. This helps with the later href map panning function. 
        center = {'lat': Number(latLng[0]), 'lng': Number(latLng[1])};
        break;

      // UL stands for "user location". Cycle through geocoders. (I use "turnstileCount" as this invokes the image of a turnstile, for me.) 
      case 'UL:':
        switch(turnstileCount){

          // 0: Query the Google geocoder.
          case 0:
            turnstileCount++; 
            // Google requires an https request be made, so I can't use "getGeo" for the Google coder. Luckily, Google makes a
            // geocoder object available, which I use here. 
            geoCoder.geocode({'address':location}, function(results, status){
              if (status == google.maps.GeocoderStatus.OK){
                  // Make sure the results exist where I'm expecting them before making an assignment to "center".
                  if (results[0].geometry != null && results[0].geometry.location != null){
                    center = results[0].geometry.location;
                    // Standardize "center"'s format for later use.
                    center = {'lat': center.lat(), 'lng': center.lng()};
                    // Send the tweet and center to "createTweetCircle" for making the final view state.
                    createTweetCircle(tweet, center);
                  }                     
                } else if (status == google.maps.GeocoderStatus.OVER_QUERY_LIMIT){
                  // This message will show if usage exceeds a per-second or per-day max. 
                  console.log('Oh no! The app has maxed out Google geocoder queries. Try again later.')
                }  
              });
              break;

          // 1: Query the mapquest geocoder service using the "getGeo" helper function.    
          case 1:  
            turnstileCount++;
            getGeo(('http://www.mapquestapi.com/geocoding/v1/address?key=bTOgIMAbO4p0SvZmAgD9EIFVxqO2MocO&maxResults=1&location=' + location), 1);
            break; 

          // 2: Query the Open Cage geocoder service using the "getGeo" helper function.     
          case 2: 
            turnstileCount++; 
            getGeo(('http://api.opencagedata.com/geocode/v1/json?q=' + location + '&key=02b58331c3075f21b23ab96521c85d81&limit=1'), 2);
            break;

          // 3: Query the bing geocoder service.  
          case 3:
            // Here's where the "turnstileCount" is reset, such that, next time "geoCodeTweet" is called, it'll start
            // with the case 0 geocoder (Google's), then work back down the list from there. 
            turnstileCount = 0;
            var geocodeRequest = 'http://dev.virtualearth.net/REST/v1/Locations?query=' + location
              + '&maxResults=1&key=Ap-VHxhCSyNJIBPYQptUIuYtx-CRsgCFFbWSLk6bmynl5Di_xn0CerxeblD-kVEb&jsonp=bingCallback';

            // Due to lack of CORS support for bing's service, I use a blank script ("bingScript" is included with all
            // the other scripts in the header of "index.html"), then set its "src" to the user-parameterized 
            // query string above. "bingScript" will now have the results from that query in it. When "bingCallback" 
            // fires, it grabs data from those results, and processes them in the same pattern as the above cases. 
            bingScript.setAttribute('src', geocodeRequest);                                             

            // This callback fires as soon as the "geocodeRequest" is set to bingScript's "src" attribute in the above
            // line. The callback repeats the same pattern as the above cases. 
            bingCallback = function(response){ 
              if(response.resourceSets[0].resources[0]){
                center = response.resourceSets[0].resources[0].point.coordinates;
                center = {'lat': Number(center[0]), 'lng': Number(center[1])}
                if (center) {
                  createTweetCircle(tweet, center)
                }
              }
            }
            break;
        }    
      break;
    }
  // If the tweet didn't have a location, send it to "tweetDump".   
  } else if (location == null){
    center = DefaultCenter;
    // "default" will be used here for telling "tweetCircleDraw" when to highlith "tweetDump" for the user.
    createTweetCircle(tweet, center, 'default');
  }

  // This helper function makes an ajax GET query to either Open Cage or mapQuest.
  function getGeo(url, count){
    var geoXHR = new XMLHttpRequest();
    // The url here is a user-parameterized query string.  
    geoXHR.open('GET', url);
    geoXHR.send();  
    geoXHR.onreadystatechange = function(){
      if (geoXHR.readyState == XMLHttpRequest.DONE && geoXHR.status == 200) {
        // Results from both services come as JSON strings. 
        var response = JSON.parse(geoXHR.responseText);
        if(response.results[0]){

          // 1 uses mapQuest geocoder service, not 1 uses Open Cage's service. The returns from the queries
          // do not come in the same format, which is why it's necessary to have separate assignments. The 
          // first option is how mapQuest results must be assigned, the second is for Open Cage results.
          count == 1 ? (center = response.results[0].locations[0].latLng) : (center = response.results[0].geometry);
          if (center) {     
            createTweetCircle(tweet, center)
          }
        }
      } 
    };              
  }  
}