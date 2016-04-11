function geoCodeTweet(tweet, callback){

  bingCallback = function(){};
  
  var center  = null;
  if (tweet.location != null){
    var location = tweet.location.substring(3, tweet.location.length);
    var id       = tweet.location.substring(0, 3);
    switch(id){
      case 'CO:':
        alert("~~~~ CO FOUND: Location is " + location)
        var latLng = location.split(",");
        center = {'lat': Number(latLng[0]), 'lng': Number(latLng[1])};
        alert("CO center is " + center.lat + " " + center.lng);
        break;
      case 'ST:':
      case 'UL:':

      if(turnstileCount == 0){
        turnstileCount++; console.log('google')

        geoCoder.geocode({'address':location}, function(results, status){
          if (status == google.maps.GeocoderStatus.OK){
            if (results[0].geometry != null && results[0].geometry.location != null){
              center = results[0].geometry.location;
              callback(tweet, center, 'google');
            }                     
          } else if (status == google.maps.GeocoderStatus.OVER_QUERY_LIMIT){
            alert('Oh no! This app has maxed out its queries. Try again later.')
          }  
        });
      } else if(turnstileCount == 1){
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
                callback(tweet, center, 'mapQuest')
              }
            }  
          } 
        }; 
      } else if (turnstileCount == 2){
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
                callback(tweet, center,' openCage')
              }
            }
          } 
        };
      } else if (turnstileCount == 3){
        turnstileCount = 0; console.log('bing')

        var geocodeRequest = 'http://dev.virtualearth.net/REST/v1/Locations?query=' + location
          + '&maxResults=1&key=Ap-VHxhCSyNJIBPYQptUIuYtx-CRsgCFFbWSLk6bmynl5Di_xn0CerxeblD-kVEb&jsonp=bingCallback';

        bingCallback = function(response){ 
          if(response.resourceSets[0]){
            center = response.resourceSets[0].resources[0].point.coordinates;
            console.log(center)
            center = {'lat': Number(center[0]), 'lng': Number(center[1])}
            console.log(center)
            if (center) {
              callback(tweet, center, 'bing')
            }
          }
        }

        bingScript.setAttribute('src', geocodeRequest);                                             
      }    
      break;
    }
  } else if (location == null || center == null){
  // The middle of Iceland, for non-located tweets!
    center = DefaultCenter;
  }
  callback(tweet, center,'default');   
}