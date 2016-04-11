// The Google Maps API works with a callback to initialize the map on the page's load. 
// "initMap" is that callback. 
function initMap(){

  // I added some methods to the Map and Circle prototypes that store circles, and track 
  // session variables. It supports the hide/show options, as well as keeping track
  // of the most recently shown circle's id.
  addCircleStorageToMap(); 

  // Set the initial properties of the Map (such things as zoom level, whether or not to show
  // roads and landmarks, etc.).
  var props = setProperties(); 
  var styles = setStyles(); 
  var styledMap = new google.maps.StyledMapType(styles, {name: 'Styled Map'});
  // "geoCoder" initialized as global in "initGlobals" in "initGlobals.js".
  geoCoder = new google.maps.Geocoder(); 
  map = new google.maps.Map(document.getElementById('map'), props);
  map.mapTypes.set('map_style', styledMap); 
  map.setMapTypeId('map_style'); 
  setTweetDump();

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
      'scrollwheel'            : false,
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

  /* 
    Refer to Readme.md "IV. Why Track "lastId"? " for context on why the id of the most recently parsed
    tweet is meaningful to the user experience.
  */

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

    // Track whether or not the user has reset a search parameter. 
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
      // Make sure the id of the last circle in the array (the last return from the server) is stored.
      this.lastId = this.circles[this.circles.length - 1]._getId();
      // This is the step that full removes the circles from future access.
      this.circles = []; 
    };

    // If the map is currently set to null (circle invisible), reset it to map (circle now shows
    // on map), and vice versa. "command" is the display string from the button that called this function.
    google.maps.Map.prototype._togCircVis = function(command){ 
      this.circles.forEach(function(circle){
        // Make sure the "setMap" makes sense for what the button shows, and what the current setting of circles are.
        // Without these two checks, the toggling gets confused after the map is cleared.        
        if (command == 'Hide Circles' && circle.map == map){
          circle.setMap(null);
        }
        if (command == 'Show Circles' && circle.map == null){
          circle.setMap(map);
        }
      })
    }

    // Either return "id" of the last circle in "circles", or, if "reset" = true or "circles" is empty, return whatever
    // "lastId" is currently in storage vis a vis "tis.lastId".
    google.maps.Map.prototype._getLastId = function(){
      var id = (this.circles.length > 0) && (!this.reset) ? this.circles[this.circles.length - 1]._getId() : this.lastId;
      this.reset = false;
      return id;
    }

    // Called every time a circle is made in "drawTweetCircle" in "circledraw.js". Pushes the array into storage in "circles".
    google.maps.Circle.prototype._storeInMap = function(map){ 
      if(map){                                               
        map.circles.push(this);
      }
    }
  }

// Make the "tweetDump" default location rectanlge.
  function setTweetDump(){
    // Construct "tweetDump". 
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

    // "dumpLabel" is visible on 'mouseover', hides on 'mouseout'.
    tweetDump.addListener('mouseover', function(){
      dumpLabel.open(map);
    })
    tweetDump.addListener('mouseout', function(){
      dumpLabel.close(map);
    })
  }

}