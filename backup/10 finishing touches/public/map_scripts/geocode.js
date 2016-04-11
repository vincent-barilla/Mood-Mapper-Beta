// I've found that geocoders are not very well-suited for streaming live data.  They'll briefly
// stop working if you exceed some per-second query limit which is not clearly stated in the 
// documentation. To work around this, I spread the workload over four geocoders: Google, 
// mapQuest, Open Cage, and bing. This alleviates the issue of maxing out the per-second limit
// for most instances, the exception being when you're tracking a massively trending topic 
// (recently, Villanova won the NCAA championship in dramatic fashion -- the four geocoders couldn't
// keep up for very long, immediately after the game).
//
// I implement the group of geocoders with a 'turnstileCount' variable in a switch statement. 
// 'turnstileCount' has four possible values, 0-3, each representing one of the geocoders. In 
// the case for the current geocoder, it increments 'turnstileCount' by one, so that, the next time 
// this function is called, the next case in line will be used. When it hits the end of the line, 
// case 3, 'turnstileCount' is reset to 0, and the process begins again. 
//
// The basic pattern here is: 1) Grab the location from tweet data, 2) Send a location to a geocoder
// query, 3) pass the response to createTweetCircle, to see a circle mapped at the returned coordinates. 
// This is done for one geocoder at a time, with a cycle of four geocoders being used to handle the load
// of live data. 
//
//  Google comes equipped with a geocoder constructor, which I utilize, and Open Cage and mapQuest are 
// similar enough that I pass them both to the same helper function. bing rejected my CORS query attempt, 
// so I use the request url as the src to a script, and include a callback in the request, such that the 
// src script will grab the data from the page and pass it to createTweetCircle.

function geoCodeTweet(tweet){
  var center  = null;

  // If the user location is null, a default center will be given in the else if of this statement. 
  if (tweet.location != null){
    // The next 2 lines separate the location from the 2-letter id code I set in tweetAnalyzer. This 
    // code will be used in the outer switch statement below, to indicate what format the address has. 
    var location   = tweet.location.substring(3, tweet.location.length);
    var id         = tweet.location.substring(0, 3);
    // Update the tweet's location, now without its id code, for display in drawTweetCircle.
    tweet.location = location;
    switch(id){
      // CO: locations are already coordinates, and do not need geocoding.
      case 'CO:':
        var latLng = location.split(",");
        // This format for the center, a JSON object with 'lat','lng' keys, is standard across all the 
        // geocoder results. This helps with the later href map panning function. 
        center = {'lat': Number(latLng[0]), 'lng': Number(latLng[1])};
        break;
      // UL stands for user location. I originally had a separate code for ST, or street address, but 
      // the geocoders receive street addresses the same as a less clear user location,  so I cut the ST 
      // case, used UL code for street addresses too. 
      case 'UL:':
        switch(turnstileCount){
          // Query the Google geocoder.
          case 0:
            turnstileCount++; 
            // Google requires an https request be made, so I can't use the helper function getGeo
            // for the google coder. Luckily, Google makes a geocoder object available, which is
            // what I use here. 
            geoCoder.geocode({'address':location}, function(results, status){
              if (status == google.maps.GeocoderStatus.OK){
                  // Make sure the results exist where I'm expecting them before making an assignment to 
                  // center.
                  if (results[0].geometry != null && results[0].geometry.location != null){
                    center = results[0].geometry.location;
                    // Standardize the center's format for later use.
                    center = {'lat': center.lat(), 'lng': center.lng()};
                    createTweetCircle(tweet, center);
                  }                     
                } else if (status == google.maps.GeocoderStatus.OVER_QUERY_LIMIT){
                  // This message will show if usage exceeds a per-second or per-day max. 
                  console.log('Oh no! The app has maxed out Google geocoder queries. Try again later.')
                }  
              });
              break;
          // Query the mapquest geocoder service.    
          case 1:  
            turnstileCount++;
            getGeo(('http://www.mapquestapi.com/geocoding/v1/address?key=bTOgIMAbO4p0SvZmAgD9EIFVxqO2MocO&maxResults=1&location=' + location), 1);
            break; 
          // Query the Open Cage geocoder service.  
          case 2: 
            turnstileCount++; 
            getGeo(('http://api.opencagedata.com/geocode/v1/json?q=' + location + '&key=02b58331c3075f21b23ab96521c85d81&limit=1'), 2);
            break;
          // Query the bing geocoder service.  
          case 3:
            // Here's where the turnstileCount is reset, such that, next time this function is called, it'll start
            // with the case 0 geocoder (Google's), then work back down the list from there. 
            turnstileCount = 0;
            var geocodeRequest = 'http://dev.virtualearth.net/REST/v1/Locations?query=' + location
              + '&maxResults=1&key=Ap-VHxhCSyNJIBPYQptUIuYtx-CRsgCFFbWSLk6bmynl5Di_xn0CerxeblD-kVEb&jsonp=bingCallback';
            // Due to lack of CORS support for bing's service, I use a blank script (bingScript is included with all
            // the other scripts in the header of index.html), then set its source to the user-parameterized 
            // query string above. bingScript will now have the results from that query in it. When bingCallback 
            // is fired, it grabs data from those results, and processes the results like the other cases above do. 
            bingScript.setAttribute('src', geocodeRequest);                                             

            // This callback fires as soon as the geocodeRequest is set to bingScript's 'src' attribute. 
            bingCallback = function(response){ 
              if(response.resourceSets[0]){
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
  } else if (location == null || center == null){
    center = DefaultCenter;
    createTweetCircle(tweet, center);
  }

  // This helper function makes an ajax GET query to either Open Cage or mapQuest. As only two options are used here, 
  // the ternary operator will choose the correct assignment statement, per geocoding service -- they do not have a 
  // standardized request format. 
  function getGeo(url, count){
    var geoXHR = new XMLHttpRequest(); 
    geoXHR.open('GET', url);
    geoXHR.send();  
    geoXHR.onreadystatechange = function(){
      if (geoXHR.readyState == XMLHttpRequest.DONE && geoXHR.status == 200) {
        var response = JSON.parse(geoXHR.responseText);
        if(response.results[0]){

          // count == 1 corresponds to map!uest, the other case corresponds to Open Cage.
          count == 1 ? (center = response.results[0].locations[0].latLng) : (center = response.results[0].geometry);
          if (center) {     
            createTweetCircle(tweet, center)
          }
        }
      } 
    };              
  }  
}