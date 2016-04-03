
function initMap(){

  addCircleStorageToMap();
  var props     = setProperties();
  var styles    = setStyles();
  var styledMap = new google.maps.StyledMapType(styles, {name: 'Styled Map'});
  geoCoder      = new google.maps.Geocoder();
  map           = new google.maps.Map(document.getElementById('map'), props);
  map.mapTypes.set('map_style', styledMap);
  map.setMapTypeId('map_style');

  function setProperties(){
    return {
      'streetViewControl'      : false,
      'disableDoubleClickZoom' : true,      
      'center'                 : new google.maps.LatLng(42.877742, -97.380979),
      'zoom'                   : 3,
      'minZoom'                : 2,
      'maxZoom'                : 12,
      'mapTypeId'              : [google.maps.MapTypeId.ROADMAP, 'map_style'],
    };
  }

  function setStyles(){
    // Styles from the fantastic Google Styled Maps Wizard, http://googlemaps.github.io/js-samples/styledmaps/wizard/index.html
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

  function addCircleStorageToMap(){

    var listeners = ['click','dblclick','drag','dragend','mouseover','mouseout'];
    google.maps.Map.prototype.circles = [];

    google.maps.Map.prototype._getCircles = function(){
      return this.circles;
    };

    google.maps.Map.prototype._clearCircles = function(){
      this.circles.forEach(function(circle){
        listeners.forEach(function(listener){
          google.maps.event.clearListeners(circle, listener);
        });
        circle.setMap(null);
       });
      this.circles = [];
    };

    google.maps.Map.prototype._togCircVis = function(){
      this.circles.forEach(function(circle){
        circle.getMap() != null ? circle.setMap(null) : circle.setMap(map);
      })
    }

    google.maps.Circle.prototype._storeInMap = function(map){
      if(map){
        map.circles.push(this);
      }
    }
  }
}