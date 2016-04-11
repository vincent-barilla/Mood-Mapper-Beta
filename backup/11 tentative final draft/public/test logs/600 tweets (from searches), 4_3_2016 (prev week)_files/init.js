// The Google Maps API works with a callback, named in the parameters of the url query, to initialize the map on the page's load. 
function initMap(){

  addCircleStorageToMap(); // Natively, a Map object does not store the polygons that are drawn on it. As I would like to give the user 
                           // the option to clear the map/restore the view, I added some methods to the Map prototype that allow for 
                           // storing the circles which represent both color and the radius of each tweet. 
  var props     = setProperties(); // Helper function that sets such Map properties as zoom, center, etc..
  var styles    = setStyles(); // Helper function that sets such styles as roads being visible/invisible, color of terrain, etc.,
  var styledMap = new google.maps.StyledMapType(styles, {name: 'Styled Map'}); // Initialize the styled Map. 
  geoCoder      = new google.maps.Geocoder(); // Initialize the Google geocoder, for returning lat. and long. when given a location.
  map           = new google.maps.Map(document.getElementById('map'), props); // Initialize the map.
  map.mapTypes.set('map_style', styledMap); // Overlay the styles on the map. 
  map.setMapTypeId('map_style'); // Makes the map's id reflect that it is styled. 

  // This rectangle defines an area where tweets go when their location field is null, when they come out of tweetAnalyzer. 
  var rectangle = new google.maps.Rectangle({
    strokeColor:   'RGB(85,85,85)', 
    strokeOpacity: 0.25, 
    strokeWeight:  2,
    fillColor:     'RGB(85,85,85)',
    fillOpacity:   0.05,
    map: map,
    bounds: {
      north:  6.393879233, // The area is just south of Hawaii (sorry, French Polynesia!)
      south: -16.186677698,
      east:  -131.8916015625,
      west:  -160.9599609375
    }
  });

  // Define the map's properties (self-explanatory)
  function setProperties(){
    return {
      'streetViewControl'      : false,
      'disableDoubleClickZoom' : true,      
      'center'                 : new google.maps.LatLng(42.877742, -97.380979), // Centered over the US
      'zoom'                   : 3,
      'minZoom'                : 2,
      'maxZoom'                : 12,
      'mapTypeId'              : [google.maps.MapTypeId.ROADMAP, 'map_style'],
    };
  }

  // Styles which were set with the very helpful Google Styled Maps Wizard
  function setStyles(){
    return [
      {
        "featureType": "road",
        "stylers": [
          { "visibility": "off" }
        ]
      },{
        "featureType": "poi",
        "stylers": [
          { "visibility": "off" }
        ]
      },{
        "featureType": "transit",
        "stylers": [
          { "visibility": "off" }
        ]
      },{
        "elementType": "labels",
        "stylers": [
          { "lightness": 49 }
        ]
      },{
        "featureType": "administrative",
        "elementType": "geometry.fill",
        "stylers": [
          { "visibility": "off" }
        ]
      },{
        "featureType": "administrative",
        "elementType": "geometry.stroke",
        "stylers": [
          { "lightness": 48 }
        ]
      }      
    ];      
  }

  // Give the map a way to store circles, so I can later toggle their visibility. 
  function addCircleStorageToMap(){

    var listeners = ['click','dblclick','drag','dragend','mouseover','mouseout']; // The listeners every circle will have
    google.maps.Map.prototype.circles = []; // Initialize the array that will store the circles 

    google.maps.Map.prototype._getCircles = function(){ // Basic get function, returns the array of circles. 
      return this.circles;
    };

    google.maps.Map.prototype._clearCircles = function(){ // Goes through the circle array, decouples them first from their 
      this.circles.forEach(function(circle){              // listeners, then from the map itself, then rewrites the circle 
        listeners.forEach(function(listener){             // array -- effectively erasing them. 
          google.maps.event.clearListeners(circle, listener);
        });
        circle.setMap(null); // Setting the map to "null" does not, in itself, delete a circle. 
       });
      this.circles = []; // This is the step that full removes the circles from future access.
    };

    google.maps.Map.prototype._togCircVis = function(){ // If the map is currently set to null (circle invisible), reset it to
      this.circles.forEach(function(circle){            // map (circle now shows on map), and vice versa.
        circle.getMap() != null ? circle.setMap(null) : circle.setMap(map);
      })
    }

    google.maps.Circle.prototype._storeInMap = function(map){ // Called when circles are initialized in index.html, this 
      if(map){                                                // is called, populating the map's circle array with a new circle. 
        map.circles.push(this);
      }
    }
  }
}