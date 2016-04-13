// This will be a rectangle on the map, south of Hawaii, that will mark a location for 
// tweets that do not have location ("tweet.location" = null). Made global so that it 
// can later be used in drawTweetCircle.  
var tweetDump

// The Google Maps API works with a callback to initialize the map on the page's load. 
// "initMap" is that callback. 
function initMap(){

  // Natively, a Map object does not give the user a way to access polygons that are 
  // drawn on it. I added some methods to the Map and Circle prototypes that give 
  // this functionality. It supports the hide/show options, as well as keeping track
  // of the most recently shown circle's id, which gives context to the subsequent query to 
  // Twitter. 
  addCircleStorageToMap(); 

  // Set the initial properties of the Map (such things as zoom level, whether or not to show
  // roads and landmarks, etc.).
  var props = setProperties(); 
  var styles = setStyles(); 
  var styledMap = new google.maps.StyledMapType(styles, {name: 'Styled Map'});
  geoCoder = new google.maps.Geocoder(); 
  map = new google.maps.Map(document.getElementById('map'), props);
  map.mapTypes.set('map_style', styledMap); 
  map.setMapTypeId('map_style'); 

  // This rectangle defines an area where tweets go when their location field is 
  // null, when they come out of tweetAnalyzer. Basically, it's a tweet dump. 
  tweetDump = new google.maps.Rectangle({
    'strokeColor'  : 'RGB(85,85,85)', 
    'strokeOpacity': 0.25, 
    'strokeWeight' : 2,
    'fillColor'    : 'RGB(85,85,85)',
    'fillOpacity'  : 0.05,
    'map'          : map,
    'bounds'       : {
      north:  6.393879233, // The area is just south of Hawaii (sorry, French Polynesia!)
      south: -16.186677698,
      east :  -131.8916015625,
      west :  -160.9599609375
    }
  });

  // This label will tell the user why there is a gray, blurry rectangle floating around 
  // below Hawaii.
  var dumpLabel = new google.maps.InfoWindow({
        'content'        : '<p>Tweets Without Location Go Here</p>',
        'maxWidth'       : 100,
        'disableAutoPan' : true,
        'position'       : {'lat': 6.393879233, 'lng': -146.42578125}
  });

  // Use these listeners to show the label for non-located tweets only when the cursor 
  // is over the rectangle (it's pretty distracting, having it open when the page loads.)
  tweetDump.addListener('mouseover', function(){
    dumpLabel.open(map);
  })
  tweetDump.addListener('mouseout', function(){
    dumpLabel.close(map);
  })

  // Define the map's properties.
  function setProperties(){
    return {
      'streetViewControl'      : false,
      'disableDoubleClickZoom' : true,      
      'center'                 : new google.maps.LatLng(14.750979, -34.145508), // On load, centered in the Atlantic
      'zoom'                   : 2,
      'minZoom'                : 2,
      'maxZoom'                : 12,
      'mapTypeId'              : [google.maps.MapTypeId.ROADMAP, 'map_style'],
    };
  }

  // Styles which were set with the very helpful Google Styled Maps Wizard.
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

  // Give the map a way to store circles, so I can later toggle their visibility, store data, etc.
  function addCircleStorageToMap(){

    // All circles will have listeners of these events. 
    var listeners = ['click','dblclick','drag','dragend','mouseover','mouseout']; 

    // Store all circles in an array.
    google.maps.Map.prototype.circles = []; 

    // Getter method for the circles array.  
    google.maps.Map.prototype._getCircles = function(){ 
      return this.circles;
    };    

    // Store the id of the last circle drawn. 
    google.maps.Map.prototype.lastId = "";

    // Track whether or not the user has reset a search parameter. When the user does change one 
    // (".reset" = "true"), the "lastId" will be reset to "", so the Twitter querying begins anew, 
    // with ids only respective of the current search parameters. 
    google.maps.Map.prototype.reset = false;

    // The method to reset "lastId". 
    google.maps.Map.prototype._resetLastId = function(str){
      this.lastId = str;
      this.reset = true;
    }

    // Store the circle's id (from Twitter, this is id_str).
    google.maps.Circle.prototype.id = "";

    // Setter method for the circle's id. 
    google.maps.Circle.prototype._setId = function(idStr){
      this.id = idStr;
    }

    // Getter method for the circle's id. 
    google.maps.Circle.prototype._getId = function(){
      return this.id;
    }; 

    // Goes through the circle array, decouples them first from their listeners, then from the map 
    // itself, then rewrites the circle array -- effectively erasing them. 
    google.maps.Map.prototype._clearCircles = function(){ 
      this.circles.forEach(function(circle){        
        listeners.forEach(function(listener){ 
          // Decouple the listeners from the current circle.           
          google.maps.event.clearListeners(circle, listener);
        });
        // Setting the map to "null" does not, in itself, delete a circle, it just makes it invisible.
        circle.setMap(null);  
       });
      // Make sure the id of the last circle in the array (the last return from the server) is stored,
      // anticipating that the user may want to clear the map before performing another search on the same
      // parameters -- thus, Twitter needs a way of knowing where to start its query response. 
      this.lastId = this.circles[this.circles.length - 1]._getId();
      // This is the step that full removes the circles from future access.
      this.circles = []; 
    };

    // If the map is currently set to null (circle invisible), reset it to map (circle now shows
    // on map), and vice versa. "command" tracks the current text showing on the button, ensuring that 
    // the toggling between visibility makes sense to what the user sees on the button -- no circles
    // should be showing, if the user has clicked 'Hide Circles'. 
    // Note: Circles that were "erased" via the double click event will only have their map set to null, 
    // are not decoupled from the map. So, when this function is used with 'Show Circles' on the button, 
    // those double click-deleted circles will now show again. 
    google.maps.Map.prototype._togCircVis = function(command){ 
      this.circles.forEach(function(circle){   
        if (command == 'Hide Circles' && circle.map == map){
          circle.setMap(null);
        }
        if (command == 'Show Circles' && circle.map == null){
          circle.setMap(map);
        }
      })
    }

    // Note that, every time this is called, it checks the length of the circles array in the map. If that array
    // is populated (has length > 0), and a user has not changed the form fields, the id of the last circle in 
    // the array is the value of the map's "lastId" property. If those conditions fail, the currently stored 
    // "lastId" is used. This makes sure a user is getting new data, any time they make a new query to Twitter. 
    // (If you don't keep track of the last id that Twitter returned in a previous query, then the next query
    // will give you the same thing, if you make a new query with the same parameters).
    google.maps.Map.prototype._getLastId = function(){
      var id = (this.circles.length > 0) && (!this.reset) ? this.circles[this.circles.length - 1]._getId() : this.lastId;
      this.reset = false;
      return id;
    }

    // Called when circles are initialized in "createTweetCircle", this uses .push to populate the map's array of
    // circles -- and, implicitly, the last circle drawn has the id of the last tweet returned from the server. 
    google.maps.Circle.prototype._storeInMap = function(map){ 
      if(map){                                               
        map.circles.push(this);
      }
    }
  }
}