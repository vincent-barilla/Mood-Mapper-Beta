function geoCodeTweet(tweet){
  var turnstileCount = 0;
  var center  = null;
  if (tweet.location != null){
    var location   = tweet.location.substring(3, tweet.location.length);
    var id         = tweet.location.substring(0, 3);
    tweet.location = location;
    switch(id){
      case 'CO:':
        alert("~~~~ CO FOUND: Location is " + location)
        var latLng = location.split(",");
        center = {'lat': Number(latLng[0]), 'lng': Number(latLng[1])};
        alert("CO center is " + center.lat + " " + center.lng);
        break;
      case 'UL:':
        switch(turnstileCount){
          case 0:
            turnstileCount++;    console.log('google')
            geoCoder.geocode({'address':location}, function(results, status){
              if (status == google.maps.GeocoderStatus.OK){
                  if (results[0].geometry != null && results[0].geometry.location != null){
                    center = results[0].geometry.location;
                    center = {'lat': center.lat(), 'lng': center.lng()};
                    createTweetCircle(tweet, center, 'google');
                  }                     
                } else if (status == google.maps.GeocoderStatus.OVER_QUERY_LIMIT){
                  alert('Oh no! This app has maxed out its queries. Try again later.')
                }  
              });
              break;
          case 1:  
            turnstileCount++; console.log('mapquest')                
            var mapQuestXHR = new XMLHttpRequest(); 
            mapQuestXHR.open('GET', 'http://www.mapquestapi.com/geocoding/v1/address?key=bTOgIMAbO4p0SvZmAgD9EIFVxqO2MocO&maxResults=1&location=' + location);
            mapQuestXHR.send();
            mapQuestXHR.onreadystatechange = function() {
              if (mapQuestXHR.readyState == XMLHttpRequest.DONE && mapQuestXHR.status == 200) {
                var response = JSON.parse(mapQuestXHR.responseText);
                if (response.results[0]){
                  center = response.results[0].locations[0].latLng;
                  if (center) {  
                    createTweetCircle(tweet, center, 'mapQuest')
                  }
                }  
              } 
            };
            break; 
          case 2:
            turnstileCount++; console.log('openCage')
            var openCageXHR = new XMLHttpRequest(); 
            openCageXHR.open('GET', 'http://api.opencagedata.com/geocode/v1/json?q=' + location + '&key=02b58331c3075f21b23ab96521c85d81&limit=1');
            openCageXHR.send();
             
            openCageXHR.onreadystatechange = function() {
              if (openCageXHR.readyState == XMLHttpRequest.DONE && openCageXHR.status == 200) {
                var response = JSON.parse(openCageXHR.responseText);
                if(response.results[0]){
                  center = response.results[0].geometry;
                  if (center) {                       
                    createTweetCircle(tweet, center,' openCage')
                  }
                }
              } 
            };
          case 3:
            turnstileCount = 0; console.log('bing')
            var geocodeRequest = 'http://dev.virtualearth.net/REST/v1/Locations?query=' + location
              + '&maxResults=1&key=Ap-VHxhCSyNJIBPYQptUIuYtx-CRsgCFFbWSLk6bmynl5Di_xn0CerxeblD-kVEb&jsonp=bingCallback';
            bingScript.setAttribute('src', geocodeRequest);                                             

            bingCallback = function(response){ 
              if(response.resourceSets[0]){
                center = response.resourceSets[0].resources[0].point.coordinates;
                center = {'lat': Number(center[0]), 'lng': Number(center[1])}
                if (center) {
                  createTweetCircle(tweet, center, 'bing')
                }
              }
            }
            break;
        }    
      break;
    }
  } else if (location == null || center == null){
    center = DefaultCenter;
    createTweetCircle(tweet, center,'default');
  }
}