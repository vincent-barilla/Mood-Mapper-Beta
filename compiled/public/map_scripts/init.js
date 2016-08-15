'use strict';

// The Google Maps API works with a callback to initialize the map on the page's load. 
// "initMap" is the callback. 
function initMap() {
  // I added some methods to Google's Map and Circle prototypes that store circles and track 
  // session variables. It supports the hide/show options, as well as keeping track
  // of the most recently shown circle's id.
  addCircleStorageToMap();
  // Set the initial properties of the Map (such things as zoom level, whether or not to show
  // roads and landmarks, etc.).
  var props = setProperties();
  var styles = setStyles();
  var styledMap = new google.maps.StyledMapType(styles, { name: 'Styled Map' });
  // "geoCoder" is initialized as global in "initGlobals" in "initGlobals.js".
  geoCoder = new google.maps.Geocoder();
  map = new google.maps.Map(document.getElementById('map'), props);
  map.mapTypes.set('map_style', styledMap);
  map.setMapTypeId('map_style');
  // Draw the gray rectangle.
  setTweetDump();

  // Define the map's properties.
  function setProperties() {
    return {
      'streetViewControl': false,
      'disableDoubleClickZoom': true,
      'center': new google.maps.LatLng(14.750979, -34.145508), // On load, centered in the Atlantic
      'zoom': 2,
      'minZoom': 2,
      'maxZoom': 12,
      'mapTypeId': [google.maps.MapTypeId.ROADMAP, 'map_style'],
      'scrollwheel': false
    };
  }

  // Styles were set with the very helpful Google Styled Maps Wizard.
  function setStyles() {
    return [{
      "featureType": "road",
      "stylers": [{ "visibility": "off" }]
    }, {
      "featureType": "poi",
      "stylers": [{ "visibility": "off" }]
    }, {
      "featureType": "transit",
      "stylers": [{ "visibility": "off" }]
    }, {
      "elementType": "labels",
      "stylers": [{ "lightness": 49 }]
    }, {
      "featureType": "administrative",
      "elementType": "geometry.fill",
      "stylers": [{ "visibility": "off" }]
    }, {
      "featureType": "administrative",
      "elementType": "geometry.stroke",
      "stylers": [{ "lightness": 48 }]
    }];
  }

  /* 
    Refer to Readme.md "IV. Why Track "lastId"? " for context on why the id of the most recently parsed
    tweet is meaningful to the user experience.
  */

  // Give the map a way to store circles, so I can later toggle their visibility, store data, etc.
  function addCircleStorageToMap() {
    // All circles will have listeners of these events. 
    var listeners = ['click', 'dblclick', 'drag', 'dragend', 'mouseover', 'mouseout'];
    // Store all circles in an array.
    google.maps.Map.prototype.circles = [];
    // Getter method for the circles array.  
    google.maps.Map.prototype._getCircles = function () {
      return this.circles;
    };
    // Store the id of the last circle drawn. 
    google.maps.Map.prototype.lastId = "";
    // Track whether or not the user has reset a search parameter. 
    google.maps.Map.prototype.reset = false;
    // The method to reset "lastId". 
    google.maps.Map.prototype._resetLastId = function (str) {
      this.lastId = str;
      this.reset = true;
    };
    // Store the circle's id (in a Twitter response, this is "id_str").
    google.maps.Circle.prototype.id = "";
    // Setter method for the circle's id. 
    google.maps.Circle.prototype._setId = function (idStr) {
      this.id = idStr;
    };
    // Getter method for the circle's id. 
    google.maps.Circle.prototype._getId = function () {
      return this.id;
    };
    // Goes through the circle array, decouples circles first from their listeners, then from the map 
    // itself, then rewrites the circle array -- effectively erasing the circles. 
    google.maps.Map.prototype._clearCircles = function () {
      this.circles.forEach(function (circle) {
        listeners.forEach(function (listener) {
          // Decouple the listeners from the current circle.           
          google.maps.event.clearListeners(circle, listener);
        });
        // Setting the map to "null" does not, in itself, delete a circle, it just makes it invisible.
        circle.setMap(null);
      });
      // Make sure the id of the last circle in the array (the last return from the server) is stored.
      this.lastId = this.circles[this.circles.length - 1]._getId();
      // This is the step that fully removes the circles.
      this.circles = [];
    };
    // If the map is currently set to null (circle invisible), reset it to map (circle now shows
    // on map), and vice versa. "command" is the string from the button that called this function.
    google.maps.Map.prototype._togCircVis = function (command) {
      this.circles.forEach(function (circle) {
        // Hide the circles or show them, depending on what the command is.        
        if (command == 'Hide Circles' && circle.map == map) {
          circle.setMap(null);
        }
        if (command == 'Show Circles' && circle.map == null) {
          circle.setMap(map);
        }
      });
    };
    // Either return "id" of the last circle in "circles", or, if "reset" == "true" or "circles" is empty, return whatever
    // "lastId" is currently in storage.
    google.maps.Map.prototype._getLastId = function () {
      var id = this.circles.length > 0 && !this.reset ? this.circles[this.circles.length - 1]._getId() : this.lastId;
      this.reset = false;
      return id;
    };
    // Called every time a circle is made in "drawTweetCircle" in "circledraw.js". Pushes the array into storage in "circles".
    google.maps.Circle.prototype._storeInMap = function (map) {
      if (map) {
        map.circles.push(this);
      }
    };
  }

  // Make the "tweetDump" default location rectanlge.
  function setTweetDump() {
    // Construct "tweetDump". 
    tweetDump = new google.maps.Rectangle({
      'strokeColor': 'RGB(85,85,85)',
      'strokeOpacity': 0.25,
      'strokeWeight': 2,
      'fillColor': 'RGB(85,85,85)',
      'fillOpacity': 0.05,
      'map': map,
      'bounds': {
        north: 6.393879233, // The area is just south of Hawaii (sorry, French Polynesia!)
        south: -16.186677698,
        east: -131.8916015625,
        west: -160.9599609375
      }
    });

    // This label will tell the user why there is a gray, blurry rectangle hanging out below Hawaii. 
    var dumpLabel = new google.maps.InfoWindow({
      'content': '<p>Tweets Without Location Go Here.</p>',
      'maxWidth': 100,
      'disableAutoPan': true,
      'position': { 'lat': 6.393879233, 'lng': -146.42578125 }
    });

    // "dumpLabel" is visible on 'mouseover', hides on 'mouseout'.
    tweetDump.addListener('mouseover', function () {
      dumpLabel.open(map);
    });
    tweetDump.addListener('mouseout', function () {
      dumpLabel.close(map);
    });
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3B1YmxpYy9tYXBfc2NyaXB0cy9pbml0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBLFNBQVMsT0FBVCxHQUFrQjtBQUNoQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFJLFFBQVEsZUFBWjtBQUNBLE1BQUksU0FBUyxXQUFiO0FBQ0EsTUFBSSxZQUFZLElBQUksT0FBTyxJQUFQLENBQVksYUFBaEIsQ0FBOEIsTUFBOUIsRUFBc0MsRUFBQyxNQUFNLFlBQVAsRUFBdEMsQ0FBaEI7QUFDQTtBQUNBLGFBQVcsSUFBSSxPQUFPLElBQVAsQ0FBWSxRQUFoQixFQUFYO0FBQ0EsUUFBTSxJQUFJLE9BQU8sSUFBUCxDQUFZLEdBQWhCLENBQW9CLFNBQVMsY0FBVCxDQUF3QixLQUF4QixDQUFwQixFQUFvRCxLQUFwRCxDQUFOO0FBQ0EsTUFBSSxRQUFKLENBQWEsR0FBYixDQUFpQixXQUFqQixFQUE4QixTQUE5QjtBQUNBLE1BQUksWUFBSixDQUFpQixXQUFqQjtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxXQUFTLGFBQVQsR0FBd0I7QUFDdEIsV0FBTztBQUNMLDJCQUEyQixLQUR0QjtBQUVMLGdDQUEyQixJQUZ0QjtBQUdMLGdCQUEyQixJQUFJLE9BQU8sSUFBUCxDQUFZLE1BQWhCLENBQXVCLFNBQXZCLEVBQWtDLENBQUMsU0FBbkMsQ0FIdEIsRUFHcUU7QUFDMUUsY0FBMkIsQ0FKdEI7QUFLTCxpQkFBMkIsQ0FMdEI7QUFNTCxpQkFBMkIsRUFOdEI7QUFPTCxtQkFBMkIsQ0FBQyxPQUFPLElBQVAsQ0FBWSxTQUFaLENBQXNCLE9BQXZCLEVBQWdDLFdBQWhDLENBUHRCO0FBUUwscUJBQTJCO0FBUnRCLEtBQVA7QUFVRDs7QUFFRDtBQUNBLFdBQVMsU0FBVCxHQUFvQjtBQUNsQixXQUFPLENBQ0w7QUFDRSxxQkFBZSxNQURqQjtBQUVFLGlCQUFXLENBQ1QsRUFBRSxjQUFjLEtBQWhCLEVBRFM7QUFGYixL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UUFBSSxZQUFZLElBQUksT0FBTyxJQUFQLENBQVksVUFBaEIsQ0FBMkI7QUFDckMsaUJBQW1CLHlDQURrQjtBQUVyQyxrQkFBbUIsR0FGa0I7QUFHckMsd0JBQW1CLElBSGtCO0FBSXJDLGtCQUFtQixFQUFDLE9BQU8sV0FBUixFQUFxQixPQUFPLENBQUMsWUFBN0I7QUFKa0IsS0FBM0IsQ0FBaEI7O0FBT0E7QUFDQSxjQUFVLFdBQVYsQ0FBc0IsV0FBdEIsRUFBbUMsWUFBVTtBQUMzQyxnQkFBVSxJQUFWLENBQWUsR0FBZjtBQUNELEtBRkQ7QUFHQSxjQUFVLFdBQVYsQ0FBc0IsVUFBdEIsRUFBa0MsWUFBVTtBQUMxQyxnQkFBVSxLQUFWLENBQWdCLEdBQWhCO0FBQ0QsS0FGRDtBQUdEO0FBQ0YiLCJmaWxlIjoiaW5pdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFRoZSBHb29nbGUgTWFwcyBBUEkgd29ya3Mgd2l0aCBhIGNhbGxiYWNrIHRvIGluaXRpYWxpemUgdGhlIG1hcCBvbiB0aGUgcGFnZSdzIGxvYWQuIFxuLy8gXCJpbml0TWFwXCIgaXMgdGhlIGNhbGxiYWNrLiBcbmZ1bmN0aW9uIGluaXRNYXAoKXtcbiAgLy8gSSBhZGRlZCBzb21lIG1ldGhvZHMgdG8gR29vZ2xlJ3MgTWFwIGFuZCBDaXJjbGUgcHJvdG90eXBlcyB0aGF0IHN0b3JlIGNpcmNsZXMgYW5kIHRyYWNrIFxuICAvLyBzZXNzaW9uIHZhcmlhYmxlcy4gSXQgc3VwcG9ydHMgdGhlIGhpZGUvc2hvdyBvcHRpb25zLCBhcyB3ZWxsIGFzIGtlZXBpbmcgdHJhY2tcbiAgLy8gb2YgdGhlIG1vc3QgcmVjZW50bHkgc2hvd24gY2lyY2xlJ3MgaWQuXG4gIGFkZENpcmNsZVN0b3JhZ2VUb01hcCgpOyBcbiAgLy8gU2V0IHRoZSBpbml0aWFsIHByb3BlcnRpZXMgb2YgdGhlIE1hcCAoc3VjaCB0aGluZ3MgYXMgem9vbSBsZXZlbCwgd2hldGhlciBvciBub3QgdG8gc2hvd1xuICAvLyByb2FkcyBhbmQgbGFuZG1hcmtzLCBldGMuKS5cbiAgdmFyIHByb3BzID0gc2V0UHJvcGVydGllcygpOyBcbiAgdmFyIHN0eWxlcyA9IHNldFN0eWxlcygpOyBcbiAgdmFyIHN0eWxlZE1hcCA9IG5ldyBnb29nbGUubWFwcy5TdHlsZWRNYXBUeXBlKHN0eWxlcywge25hbWU6ICdTdHlsZWQgTWFwJ30pO1xuICAvLyBcImdlb0NvZGVyXCIgaXMgaW5pdGlhbGl6ZWQgYXMgZ2xvYmFsIGluIFwiaW5pdEdsb2JhbHNcIiBpbiBcImluaXRHbG9iYWxzLmpzXCIuXG4gIGdlb0NvZGVyID0gbmV3IGdvb2dsZS5tYXBzLkdlb2NvZGVyKCk7IFxuICBtYXAgPSBuZXcgZ29vZ2xlLm1hcHMuTWFwKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXAnKSwgcHJvcHMpO1xuICBtYXAubWFwVHlwZXMuc2V0KCdtYXBfc3R5bGUnLCBzdHlsZWRNYXApOyBcbiAgbWFwLnNldE1hcFR5cGVJZCgnbWFwX3N0eWxlJyk7IFxuICAvLyBEcmF3IHRoZSBncmF5IHJlY3RhbmdsZS5cbiAgc2V0VHdlZXREdW1wKCk7XG5cbiAgLy8gRGVmaW5lIHRoZSBtYXAncyBwcm9wZXJ0aWVzLlxuICBmdW5jdGlvbiBzZXRQcm9wZXJ0aWVzKCl7XG4gICAgcmV0dXJuIHtcbiAgICAgICdzdHJlZXRWaWV3Q29udHJvbCcgICAgICA6IGZhbHNlLFxuICAgICAgJ2Rpc2FibGVEb3VibGVDbGlja1pvb20nIDogdHJ1ZSwgICAgICBcbiAgICAgICdjZW50ZXInICAgICAgICAgICAgICAgICA6IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoMTQuNzUwOTc5LCAtMzQuMTQ1NTA4KSwgLy8gT24gbG9hZCwgY2VudGVyZWQgaW4gdGhlIEF0bGFudGljXG4gICAgICAnem9vbScgICAgICAgICAgICAgICAgICAgOiAyLFxuICAgICAgJ21pblpvb20nICAgICAgICAgICAgICAgIDogMixcbiAgICAgICdtYXhab29tJyAgICAgICAgICAgICAgICA6IDEyLFxuICAgICAgJ21hcFR5cGVJZCcgICAgICAgICAgICAgIDogW2dvb2dsZS5tYXBzLk1hcFR5cGVJZC5ST0FETUFQLCAnbWFwX3N0eWxlJ10sXG4gICAgICAnc2Nyb2xsd2hlZWwnICAgICAgICAgICAgOiBmYWxzZSxcbiAgICB9O1xuICB9XG5cbiAgLy8gU3R5bGVzIHdlcmUgc2V0IHdpdGggdGhlIHZlcnkgaGVscGZ1bCBHb29nbGUgU3R5bGVkIE1hcHMgV2l6YXJkLlxuICBmdW5jdGlvbiBzZXRTdHlsZXMoKXtcbiAgICByZXR1cm4gW1xuICAgICAge1xuICAgICAgICBcImZlYXR1cmVUeXBlXCI6IFwicm9hZFwiLFxuICAgICAgICBcInN0eWxlcnNcIjogW1xuICAgICAgICAgIHsgXCJ2aXNpYmlsaXR5XCI6IFwib2ZmXCIgfVxuICAgICAgICBdXG4gICAgICB9LHtcbiAgICAgICAgXCJmZWF0dXJlVHlwZVwiOiBcInBvaVwiLFxuICAgICAgICBcInN0eWxlcnNcIjogW1xuICAgICAgICAgIHsgXCJ2aXNpYmlsaXR5XCI6IFwib2ZmXCIgfVxuICAgICAgICBdXG4gICAgICB9LHtcbiAgICAgICAgXCJmZWF0dXJlVHlwZVwiOiBcInRyYW5zaXRcIixcbiAgICAgICAgXCJzdHlsZXJzXCI6IFtcbiAgICAgICAgICB7IFwidmlzaWJpbGl0eVwiOiBcIm9mZlwiIH1cbiAgICAgICAgXVxuICAgICAgfSx7XG4gICAgICAgIFwiZWxlbWVudFR5cGVcIjogXCJsYWJlbHNcIixcbiAgICAgICAgXCJzdHlsZXJzXCI6IFtcbiAgICAgICAgICB7IFwibGlnaHRuZXNzXCI6IDQ5IH1cbiAgICAgICAgXVxuICAgICAgfSx7XG4gICAgICAgIFwiZmVhdHVyZVR5cGVcIjogXCJhZG1pbmlzdHJhdGl2ZVwiLFxuICAgICAgICBcImVsZW1lbnRUeXBlXCI6IFwiZ2VvbWV0cnkuZmlsbFwiLFxuICAgICAgICBcInN0eWxlcnNcIjogW1xuICAgICAgICAgIHsgXCJ2aXNpYmlsaXR5XCI6IFwib2ZmXCIgfVxuICAgICAgICBdXG4gICAgICB9LHtcbiAgICAgICAgXCJmZWF0dXJlVHlwZVwiOiBcImFkbWluaXN0cmF0aXZlXCIsXG4gICAgICAgIFwiZWxlbWVudFR5cGVcIjogXCJnZW9tZXRyeS5zdHJva2VcIixcbiAgICAgICAgXCJzdHlsZXJzXCI6IFtcbiAgICAgICAgICB7IFwibGlnaHRuZXNzXCI6IDQ4IH1cbiAgICAgICAgXVxuICAgICAgfSAgICAgIFxuICAgIF07ICAgICAgXG4gIH1cblxuICAvKiBcbiAgICBSZWZlciB0byBSZWFkbWUubWQgXCJJVi4gV2h5IFRyYWNrIFwibGFzdElkXCI/IFwiIGZvciBjb250ZXh0IG9uIHdoeSB0aGUgaWQgb2YgdGhlIG1vc3QgcmVjZW50bHkgcGFyc2VkXG4gICAgdHdlZXQgaXMgbWVhbmluZ2Z1bCB0byB0aGUgdXNlciBleHBlcmllbmNlLlxuICAqL1xuXG4gIC8vIEdpdmUgdGhlIG1hcCBhIHdheSB0byBzdG9yZSBjaXJjbGVzLCBzbyBJIGNhbiBsYXRlciB0b2dnbGUgdGhlaXIgdmlzaWJpbGl0eSwgc3RvcmUgZGF0YSwgZXRjLlxuICBmdW5jdGlvbiBhZGRDaXJjbGVTdG9yYWdlVG9NYXAoKXtcbiAgICAvLyBBbGwgY2lyY2xlcyB3aWxsIGhhdmUgbGlzdGVuZXJzIG9mIHRoZXNlIGV2ZW50cy4gXG4gICAgdmFyIGxpc3RlbmVycyA9IFsnY2xpY2snLCdkYmxjbGljaycsJ2RyYWcnLCdkcmFnZW5kJywnbW91c2VvdmVyJywnbW91c2VvdXQnXTsgXG4gICAgLy8gU3RvcmUgYWxsIGNpcmNsZXMgaW4gYW4gYXJyYXkuXG4gICAgZ29vZ2xlLm1hcHMuTWFwLnByb3RvdHlwZS5jaXJjbGVzID0gW107IFxuICAgIC8vIEdldHRlciBtZXRob2QgZm9yIHRoZSBjaXJjbGVzIGFycmF5LiAgXG4gICAgZ29vZ2xlLm1hcHMuTWFwLnByb3RvdHlwZS5fZ2V0Q2lyY2xlcyA9IGZ1bmN0aW9uKCl7IFxuICAgICAgcmV0dXJuIHRoaXMuY2lyY2xlcztcbiAgICB9OyAgICBcbiAgICAvLyBTdG9yZSB0aGUgaWQgb2YgdGhlIGxhc3QgY2lyY2xlIGRyYXduLiBcbiAgICBnb29nbGUubWFwcy5NYXAucHJvdG90eXBlLmxhc3RJZCA9IFwiXCI7XG4gICAgLy8gVHJhY2sgd2hldGhlciBvciBub3QgdGhlIHVzZXIgaGFzIHJlc2V0IGEgc2VhcmNoIHBhcmFtZXRlci4gXG4gICAgZ29vZ2xlLm1hcHMuTWFwLnByb3RvdHlwZS5yZXNldCA9IGZhbHNlO1xuICAgIC8vIFRoZSBtZXRob2QgdG8gcmVzZXQgXCJsYXN0SWRcIi4gXG4gICAgZ29vZ2xlLm1hcHMuTWFwLnByb3RvdHlwZS5fcmVzZXRMYXN0SWQgPSBmdW5jdGlvbihzdHIpe1xuICAgICAgdGhpcy5sYXN0SWQgPSBzdHI7XG4gICAgICB0aGlzLnJlc2V0ID0gdHJ1ZTtcbiAgICB9XG4gICAgLy8gU3RvcmUgdGhlIGNpcmNsZSdzIGlkIChpbiBhIFR3aXR0ZXIgcmVzcG9uc2UsIHRoaXMgaXMgXCJpZF9zdHJcIikuXG4gICAgZ29vZ2xlLm1hcHMuQ2lyY2xlLnByb3RvdHlwZS5pZCA9IFwiXCI7XG4gICAgLy8gU2V0dGVyIG1ldGhvZCBmb3IgdGhlIGNpcmNsZSdzIGlkLiBcbiAgICBnb29nbGUubWFwcy5DaXJjbGUucHJvdG90eXBlLl9zZXRJZCA9IGZ1bmN0aW9uKGlkU3RyKXtcbiAgICAgIHRoaXMuaWQgPSBpZFN0cjtcbiAgICB9XG4gICAgLy8gR2V0dGVyIG1ldGhvZCBmb3IgdGhlIGNpcmNsZSdzIGlkLiBcbiAgICBnb29nbGUubWFwcy5DaXJjbGUucHJvdG90eXBlLl9nZXRJZCA9IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gdGhpcy5pZDtcbiAgICB9OyBcbiAgICAvLyBHb2VzIHRocm91Z2ggdGhlIGNpcmNsZSBhcnJheSwgZGVjb3VwbGVzIGNpcmNsZXMgZmlyc3QgZnJvbSB0aGVpciBsaXN0ZW5lcnMsIHRoZW4gZnJvbSB0aGUgbWFwIFxuICAgIC8vIGl0c2VsZiwgdGhlbiByZXdyaXRlcyB0aGUgY2lyY2xlIGFycmF5IC0tIGVmZmVjdGl2ZWx5IGVyYXNpbmcgdGhlIGNpcmNsZXMuIFxuICAgIGdvb2dsZS5tYXBzLk1hcC5wcm90b3R5cGUuX2NsZWFyQ2lyY2xlcyA9IGZ1bmN0aW9uKCl7IFxuICAgICAgdGhpcy5jaXJjbGVzLmZvckVhY2goZnVuY3Rpb24oY2lyY2xlKXsgICAgICAgIFxuICAgICAgICBsaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbihsaXN0ZW5lcil7IFxuICAgICAgICAgIC8vIERlY291cGxlIHRoZSBsaXN0ZW5lcnMgZnJvbSB0aGUgY3VycmVudCBjaXJjbGUuICAgICAgICAgICBcbiAgICAgICAgICBnb29nbGUubWFwcy5ldmVudC5jbGVhckxpc3RlbmVycyhjaXJjbGUsIGxpc3RlbmVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIFNldHRpbmcgdGhlIG1hcCB0byBcIm51bGxcIiBkb2VzIG5vdCwgaW4gaXRzZWxmLCBkZWxldGUgYSBjaXJjbGUsIGl0IGp1c3QgbWFrZXMgaXQgaW52aXNpYmxlLlxuICAgICAgICBjaXJjbGUuc2V0TWFwKG51bGwpOyAgXG4gICAgICAgfSk7XG4gICAgICAvLyBNYWtlIHN1cmUgdGhlIGlkIG9mIHRoZSBsYXN0IGNpcmNsZSBpbiB0aGUgYXJyYXkgKHRoZSBsYXN0IHJldHVybiBmcm9tIHRoZSBzZXJ2ZXIpIGlzIHN0b3JlZC5cbiAgICAgIHRoaXMubGFzdElkID0gdGhpcy5jaXJjbGVzW3RoaXMuY2lyY2xlcy5sZW5ndGggLSAxXS5fZ2V0SWQoKTtcbiAgICAgIC8vIFRoaXMgaXMgdGhlIHN0ZXAgdGhhdCBmdWxseSByZW1vdmVzIHRoZSBjaXJjbGVzLlxuICAgICAgdGhpcy5jaXJjbGVzID0gW107IFxuICAgIH07XG4gICAgLy8gSWYgdGhlIG1hcCBpcyBjdXJyZW50bHkgc2V0IHRvIG51bGwgKGNpcmNsZSBpbnZpc2libGUpLCByZXNldCBpdCB0byBtYXAgKGNpcmNsZSBub3cgc2hvd3NcbiAgICAvLyBvbiBtYXApLCBhbmQgdmljZSB2ZXJzYS4gXCJjb21tYW5kXCIgaXMgdGhlIHN0cmluZyBmcm9tIHRoZSBidXR0b24gdGhhdCBjYWxsZWQgdGhpcyBmdW5jdGlvbi5cbiAgICBnb29nbGUubWFwcy5NYXAucHJvdG90eXBlLl90b2dDaXJjVmlzID0gZnVuY3Rpb24oY29tbWFuZCl7IFxuICAgICAgdGhpcy5jaXJjbGVzLmZvckVhY2goZnVuY3Rpb24oY2lyY2xlKXtcbiAgICAgICAgLy8gSGlkZSB0aGUgY2lyY2xlcyBvciBzaG93IHRoZW0sIGRlcGVuZGluZyBvbiB3aGF0IHRoZSBjb21tYW5kIGlzLiAgICAgICAgXG4gICAgICAgIGlmIChjb21tYW5kID09ICdIaWRlIENpcmNsZXMnICYmIGNpcmNsZS5tYXAgPT0gbWFwKXtcbiAgICAgICAgICBjaXJjbGUuc2V0TWFwKG51bGwpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb21tYW5kID09ICdTaG93IENpcmNsZXMnICYmIGNpcmNsZS5tYXAgPT0gbnVsbCl7XG4gICAgICAgICAgY2lyY2xlLnNldE1hcChtYXApO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgICAvLyBFaXRoZXIgcmV0dXJuIFwiaWRcIiBvZiB0aGUgbGFzdCBjaXJjbGUgaW4gXCJjaXJjbGVzXCIsIG9yLCBpZiBcInJlc2V0XCIgPT0gXCJ0cnVlXCIgb3IgXCJjaXJjbGVzXCIgaXMgZW1wdHksIHJldHVybiB3aGF0ZXZlclxuICAgIC8vIFwibGFzdElkXCIgaXMgY3VycmVudGx5IGluIHN0b3JhZ2UuXG4gICAgZ29vZ2xlLm1hcHMuTWFwLnByb3RvdHlwZS5fZ2V0TGFzdElkID0gZnVuY3Rpb24oKXtcbiAgICAgIHZhciBpZCA9ICh0aGlzLmNpcmNsZXMubGVuZ3RoID4gMCkgJiYgKCF0aGlzLnJlc2V0KSA/IHRoaXMuY2lyY2xlc1t0aGlzLmNpcmNsZXMubGVuZ3RoIC0gMV0uX2dldElkKCkgOiB0aGlzLmxhc3RJZDtcbiAgICAgIHRoaXMucmVzZXQgPSBmYWxzZTtcbiAgICAgIHJldHVybiBpZDtcbiAgICB9XG4gICAgLy8gQ2FsbGVkIGV2ZXJ5IHRpbWUgYSBjaXJjbGUgaXMgbWFkZSBpbiBcImRyYXdUd2VldENpcmNsZVwiIGluIFwiY2lyY2xlZHJhdy5qc1wiLiBQdXNoZXMgdGhlIGFycmF5IGludG8gc3RvcmFnZSBpbiBcImNpcmNsZXNcIi5cbiAgICBnb29nbGUubWFwcy5DaXJjbGUucHJvdG90eXBlLl9zdG9yZUluTWFwID0gZnVuY3Rpb24obWFwKXsgXG4gICAgICBpZihtYXApeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIG1hcC5jaXJjbGVzLnB1c2godGhpcyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gTWFrZSB0aGUgXCJ0d2VldER1bXBcIiBkZWZhdWx0IGxvY2F0aW9uIHJlY3RhbmxnZS5cbiAgZnVuY3Rpb24gc2V0VHdlZXREdW1wKCl7XG4gICAgLy8gQ29uc3RydWN0IFwidHdlZXREdW1wXCIuIFxuICAgIHR3ZWV0RHVtcCA9IG5ldyBnb29nbGUubWFwcy5SZWN0YW5nbGUoe1xuICAgICAgJ3N0cm9rZUNvbG9yJyAgOiAnUkdCKDg1LDg1LDg1KScsIFxuICAgICAgJ3N0cm9rZU9wYWNpdHknOiAwLjI1LCBcbiAgICAgICdzdHJva2VXZWlnaHQnIDogMixcbiAgICAgICdmaWxsQ29sb3InICAgIDogJ1JHQig4NSw4NSw4NSknLFxuICAgICAgJ2ZpbGxPcGFjaXR5JyAgOiAwLjA1LFxuICAgICAgJ21hcCcgICAgICAgICAgOiBtYXAsXG4gICAgICAnYm91bmRzJyAgICAgICA6IHtcbiAgICAgICAgbm9ydGg6ICA2LjM5Mzg3OTIzMywgLy8gVGhlIGFyZWEgaXMganVzdCBzb3V0aCBvZiBIYXdhaWkgKHNvcnJ5LCBGcmVuY2ggUG9seW5lc2lhISlcbiAgICAgICAgc291dGg6IC0xNi4xODY2Nzc2OTgsXG4gICAgICAgIGVhc3QgOiAgLTEzMS44OTE2MDE1NjI1LFxuICAgICAgICB3ZXN0IDogIC0xNjAuOTU5OTYwOTM3NVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gVGhpcyBsYWJlbCB3aWxsIHRlbGwgdGhlIHVzZXIgd2h5IHRoZXJlIGlzIGEgZ3JheSwgYmx1cnJ5IHJlY3RhbmdsZSBoYW5naW5nIG91dCBiZWxvdyBIYXdhaWkuIFxuICAgIHZhciBkdW1wTGFiZWwgPSBuZXcgZ29vZ2xlLm1hcHMuSW5mb1dpbmRvdyh7XG4gICAgICAgICAgJ2NvbnRlbnQnICAgICAgICA6ICc8cD5Ud2VldHMgV2l0aG91dCBMb2NhdGlvbiBHbyBIZXJlLjwvcD4nLFxuICAgICAgICAgICdtYXhXaWR0aCcgICAgICAgOiAxMDAsXG4gICAgICAgICAgJ2Rpc2FibGVBdXRvUGFuJyA6IHRydWUsXG4gICAgICAgICAgJ3Bvc2l0aW9uJyAgICAgICA6IHsnbGF0JzogNi4zOTM4NzkyMzMsICdsbmcnOiAtMTQ2LjQyNTc4MTI1fVxuICAgIH0pO1xuXG4gICAgLy8gXCJkdW1wTGFiZWxcIiBpcyB2aXNpYmxlIG9uICdtb3VzZW92ZXInLCBoaWRlcyBvbiAnbW91c2VvdXQnLlxuICAgIHR3ZWV0RHVtcC5hZGRMaXN0ZW5lcignbW91c2VvdmVyJywgZnVuY3Rpb24oKXtcbiAgICAgIGR1bXBMYWJlbC5vcGVuKG1hcCk7XG4gICAgfSlcbiAgICB0d2VldER1bXAuYWRkTGlzdGVuZXIoJ21vdXNlb3V0JywgZnVuY3Rpb24oKXtcbiAgICAgIGR1bXBMYWJlbC5jbG9zZShtYXApO1xuICAgIH0pXG4gIH1cbn0iXX0=