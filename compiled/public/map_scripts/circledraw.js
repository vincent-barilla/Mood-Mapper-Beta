'use strict';

// Creates a circle on the map using the tweet's mood (RGB values) as its
// color, the tweet's location as its coordinates, and the tweet user's
// number of followers to set its radius (more followers = a bigger radius,
// or "reach".)
function createTweetCircle(tweet, center, source) {
  var radius = setRadius();
  var color = 'RGB(' + tweet.stats.mood.toString() + ')';
  var tweetCircle = setTweetCircle();
  tweetCircle.initListeners();
  // Track the tweet's id for parameterizing later Twitter GET requests. 
  tweetCircle._setId(tweet.id);
  // Store the circle in the map for later toggling of visibility.  
  tweetCircle._storeInMap(map);
  // Set an href in the text crawl that pans the map and zooms to the current "center".
  linkToCircle();

  // Circle radii are in meters, so numbers of followers need to be multiplied in order for the circle to show on 
  // the map. This sets the radius such that smaller tweets receive a bigger bump in size than larger ones, 
  // capped at 25k followers, after which there is a constant multiplier.
  function setRadius() {
    var rad = tweet.stats.reach;
    if (rad) {
      // In short -- it's half of an upside-down parabola (fast growth for small numbers, slow growth
      // towards the middle), with the middle set at 25k followers. The constants are set to further increase 
      // the growth of smaller circles, relative to that of larger circles.
      rad > 25000 ? rad *= 25 : rad = (50 - .001 * rad) * rad;
    } else {
      // 50 meters is the default, for a user with no followers. 
      rad = 50;
    }
    return rad;
  }

  // Set the starting properties of this circle. 
  function setTweetCircle() {
    var circle = new google.maps.Circle({
      'strokeColor': color,
      'strokeOpacity': .8,
      'strokeWeight': 2,
      'fillColor': color,
      'fillOpacity': .35,
      'map': map,
      'center': center,
      'radius': radius,
      'draggable': true,
      'clickable': true,
      'geodesic': false
    });
    // Each circle has its own Info Window object following it around, displaying
    // information about its tweet.
    circle.infoWindow = initInfoWindow();

    // Set the Info Window with html from the tweet's stats/info.
    function initInfoWindow() {
      var content = '<div id="info">' + '<div class="infoTitle">@' + tweet.user.name + '</div>' + '<div class>' + '<p class="tweText" style="color:' + color + '">' + tweet.text + '</p>' + '<table class="tweData"><tr><td> Location:</td><td>' + tweet.location + '</td></tr>' + '<tr><td> Time:</td><td>' + tweet.stats.time + '</td></tr>' + wordsToRow(tweet.stats.posWords.concat(tweet.stats.negWords)) + '<tr><td> Followers:</td><td>' + tweet.stats.reach + '</td></tr>' + '</table>' + '</div>' + '</div>';

      return new google.maps.InfoWindow({
        'content': content,
        'maxWidth': 350,
        'disableAutoPan': true
      });

      // If there are words inside either posWords or negWords, make a row for the "content" table out of an html
      // string. It'll be formatted as such: "love(4), win(3), hate(-4)". 
      function wordsToRow(words) {
        // Notice the use of "concat" in the definition of "content". "words" has both "posWords" and "negWords".
        if (words.length > 0) {
          var str = '';
          // "str" will become a comma-separated string of all words that were scored in "tweet".
          words.forEach(function (word, i) {
            if (word.score > 0) {
              // Put a plus sign in front of everything from "posWords" (scores > 0).
              word.score = '+' + word.score;
            }
            // Concatenate "word(+/-score)," until the last element, then, drop the comma, concatenate "(word(+/-score)" only).
            i < words.length - 1 ? str += word.word + ' (' + word.score + '), ' : str += word.word + ' (' + word.score + ')';
          });
          // Scoring words from both "posWords" and "negWords" appear in the same html string. 
          return '<tr><td>Scoring Words:</td><td>' + str + '</td></tr>';
        } else {
          // If there aren't any words in this array, return an empty string. No row will show in "content" for this tweet.
          return '';
        }
      };
    }
    // The circle has its own listeners, detecting events such as "drag", "mouseover", etc.
    circle.initListeners = function () {
      // "holdWindow" will tell listeners whether or not to close an info window immediately on a 'mouseout'. 
      var holdWindow = false;
      var timer = null;

      // Sets a listener that triggers whenever the cursor passes over this circle.
      this.addListener('mouseover', function () {
        // With this condition, the info window closes after the next time the mouseover
        // occurs, after it has been clicked to hold it open.
        if (holdWindow) {
          holdWindow = false;
        };
        // Before opening the window, it must be anchored to the circle. 
        anchorInfoWindow(this);
        // When the cursor passes over this circle, make a small increase in its radius to clarify which 
        // circle is currently under the cursor.       
        explodeView();
        // Open up the map, now that all the above properties have been set.                 
        this.infoWindow.open(map);
        // The helper function which gives the temporary boost to radius. 
        function explodeView() {
          circle.setRadius(radius * 1.15);
        }
      });

      // Clear the timer, reset the radius (undoes "explodeView"), and close the info window if 
      // "holdWindow" is not true on a 'mouseout' event.
      this.addListener('mouseout', function () {
        clearTimer();
        this.setRadius(radius);
        if (!holdWindow) {
          this.infoWindow.close(map);
        }
      });

      // The timer is cleared when dragging starts, and the window is invisible during the drag. 
      this.addListener('drag', function () {
        this.infoWindow.setMap(null);
        clearTimer();
      });

      // Re-anchor the window to this circle's current location, clear the timer, show the info
      // window when dragging stops. 
      this.addListener('dragend', function () {
        anchorInfoWindow(this);
        clearTimer();
        this.infoWindow.setMap(map);
      });

      // When a circle is clicked, it will tell the info window to stay open after the first 
      // mouseout event occurs. After the next mouseout event, this is undone, and the window
      // will close, unless the circle is clicked again. 
      this.addListener('click', function () {
        !holdWindow ? holdWindow = true : holdWindow = false;
      });

      // On a double click, the circle is invisible. It can be visible again by clicking the
      // "Show Circles" button below the map. 
      this.addListener('dblclick', function () {
        clearTimer();
        this.infoWindow.setMap(null);
        this.setMap(null);
      });

      // Sets the info window's display center to be just northeast of the circle's outer edge. 
      // (The position is subject to change, just picked a placement I liked.)
      function anchorInfoWindow(circle) {
        var cen = circle.getCenter();
        var span = circle.getBounds().toSpan();
        // Dealing with latLng math is made difficult due to conversion factors of lat/long values 
        // into meters. Spherical math is needed, which takes up a bunch of space. "getBounds" keeps the units 
        // in coordinates, alleviates that issue.
        var latLng = { 'lat': cen.lat() + span.lat() / 2.3, 'lng': cen.lng() + span.lng() / 2.3 };
        circle.infoWindow.setPosition(latLng);
      }

      // A helper function to make sure the timer is clearing (setting it to null is a fail-safe). 
      // When the timer wasn't working as expected, info windows were staying open all over the 
      // place, so I felt the fail-safe was worthwhile. 
      function clearTimer() {
        clearInterval(timer);
        timer = null;
      }
    };
    return circle;
  }

  // Appends an href to the crawl to the right of the map. The href has the tweet's text and is color-
  // coded to its mood (same color as the circle). Clicking it pans the map to center over its circle. 
  function linkToCircle() {
    var a = document.createElement('a');
    a.innerHTML = tweet.text + "<br><br>";
    // Setting display to 'block' helps to stabilize the animations, prevents 'mouseout's from firing when 
    // the cursor slides between gaps in characters, words, line spaces, etc..
    a.style.display = 'block';
    a.style.color = color;
    a.style['text-decoration'] = 'none';
    a.style['text-shadow'] = '1px 1px 1px rgb(220,220,220)';
    // Concatenate this string to preserve the current center in the DOM, ensures map pans to correct circle.
    var centerString = center.lat.toString() + ',' + center.lng.toString();
    a.href = 'javascript:panToCircle([' + centerString + ']);';
    // Creates a gold ring to go around 'this' circle when the cursor hovers over "a.href'\".
    highlightHalo();
    // Append "a" to the crawl.
    document.getElementById('text').appendChild(a);
    // The href's function; pans the map to "this" circle's center.
    panToCircle = function panToCircle(latLng) {
      // Though "centerString" was a string above, it evaluates as an array, here.
      var lat = Number(latLng[0]);
      var lng = Number(latLng[1]);
      // "zoomLevel" is either 6 (more zoom) for tweets that have locations, or 5 (less zoom) for the tweets in 
      // "tweetDump". (Auto-zooming too close within "tweetDump" is disorienting, I found.)
      var zoomLevel = lat == DefaultCenter.lat && lng == DefaultCenter.lng ? 5 : 6;
      // Take the center from the local argument, not "center" from the outer scope. "center" from the outer scope
      // is overwritten by the time this will fire, panning the map to the most recently drawn circle.
      var cen = { 'lat': lat, 'lng': lng };
      map.setZoom(zoomLevel);
      map.setCenter(cen);
      // Scroll the window back to the map.
      window.scrollTo(0, document.getElementById('bannerContentDiv').getBoundingClientRect().height + 15);
      map.panTo(cen);
    };

    // Sets a ring to zoom in and out around a circle, helps clarify which circle belongs to which tweet, from the crawl.   
    function highlightHalo() {
      var haloRad = radius * 1.3;
      // An empty golden ring -- a halo.
      var hrefHalo = new google.maps.Circle({
        'strokeColor': 'RGB(255,255,100)',
        'strokeOpacity': 1,
        'strokeWeight': 3,
        'fillColor': 'RGB(255,255,100)',
        'fillOpacity': 0,
        'map': null,
        'center': center,
        'radius': haloRad
      });
      // A timeout will be used to animate the halo expanding and contracting. 
      var haloTimer;
      // A 'mouseover' event of the href in the crawl triggers halo animation around its circle.
      a.addEventListener('mouseover', function () {
        // Light up "tweetDump", in addition to the halo, in case the halo is buried under a big stack of dumped tweets.
        if (source == 'default') {
          tweetDump.setOptions({ 'strokeColor': 'RGB(255,255,100)',
            'strokeOpacity': .4 });
        }
        // Make the halo visible.  
        hrefHalo.setMap(map);
        // Pre-allocate "i", as there will be many iterations.
        var i = 1;
        // Read as "the amount by which to change halo."
        var haloChange = .17;
        // Read as "haloIncrease".    
        var haloIncr = true;
        // The loop action will expand and contract the halo's radius, with the timer interval giving it animation. 
        for (; i <= 110; i++) {
          (function animateHalo(i) {
            haloTimer = setTimeout(function () {
              // "haloIncr" tells "haloChange" to either increment or decrement. 
              haloIncr ? haloChange += .17 : haloChange -= .17;
              // .17 and 5 form lower and upper bounds for "haloChange". When a bound is reached, flip "haloIncr", so that
              // "haloChange" will now move towards the opposite bound in the next loop iteration.
              if (haloChange >= 5) {
                haloIncr = false;
              }
              if (haloChange <= .17) {
                haloIncr = true;
              }
              // Use "haloChange" as a multiplier on "haloRad". As "haloChange" grows and shrinks, the animation of zooming in, 
              // zooming out, is achieved.
              hrefHalo.setRadius(haloRad * (1 + haloChange));
            }, i * 30); // Use a small increment with the high "i" value to make the animation smooth. 
          })(i); // The closure is needed to use the intended "i" for the asynchronous "setTimer" callback.
        }
      });

      // Hide the ring on a 'mouseout' from the href link. 
      a.addEventListener('mouseout', function () {
        clearTimeout(haloTimer);
        hrefHalo.setMap(null);
        if (source == 'default') {
          // These are the original values for "tweetDump" from "mapInit" in "init.js".
          tweetDump.setOptions({ 'strokeColor': 'RGB(85,85,85)',
            'strokeOpacity': .25 });
        }
      });
    }
  };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3B1YmxpYy9tYXBfc2NyaXB0cy9jaXJjbGVkcmF3LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTLGlCQUFULENBQTJCLEtBQTNCLEVBQWtDLE1BQWxDLEVBQTBDLE1BQTFDLEVBQWlEO0FBQy9DLE1BQUksU0FBUyxXQUFiO0FBQ0EsTUFBSSxRQUFRLFNBQVMsTUFBTSxLQUFOLENBQVksSUFBWixDQUFpQixRQUFqQixFQUFULEdBQXVDLEdBQW5EO0FBQ0EsTUFBSSxjQUFjLGdCQUFsQjtBQUNBLGNBQVksYUFBWjtBQUNBO0FBQ0EsY0FBWSxNQUFaLENBQW1CLE1BQU0sRUFBekI7QUFDQTtBQUNBLGNBQVksV0FBWixDQUF3QixHQUF4QjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsV0FBUyxTQUFULEdBQW9CO0FBQ2xCLFFBQUksTUFBTSxNQUFNLEtBQU4sQ0FBWSxLQUF0QjtBQUNBLFFBQUksR0FBSixFQUFRO0FBQ047QUFDQTtBQUNBO0FBQ0EsWUFBTSxLQUFOLEdBQWMsT0FBTyxFQUFyQixHQUEwQixNQUFPLENBQUMsS0FBSyxPQUFPLEdBQWIsSUFBb0IsR0FBckQ7QUFDRCxLQUxELE1BS087QUFDTDtBQUNBLFlBQU0sRUFBTjtBQUNEO0FBQ0QsV0FBTyxHQUFQO0FBQ0Q7O0FBRUQ7QUFDQSxXQUFTLGNBQVQsR0FBeUI7QUFDdkIsUUFBSSxTQUFTLElBQUksT0FBTyxJQUFQLENBQVksTUFBaEIsQ0FBdUI7QUFDbEMscUJBQWlCLEtBRGlCO0FBRWxDLHVCQUFpQixFQUZpQjtBQUdsQyxzQkFBaUIsQ0FIaUI7QUFJbEMsbUJBQWlCLEtBSmlCO0FBS2xDLHFCQUFpQixHQUxpQjtBQU1sQyxhQUFpQixHQU5pQjtBQU9sQyxnQkFBaUIsTUFQaUI7QUFRbEMsZ0JBQWlCLE1BUmlCO0FBU2xDLG1CQUFpQixJQVRpQjtBQVVsQyxtQkFBaUIsSUFWaUI7QUFXbEMsa0JBQWlCO0FBWGlCLEtBQXZCLENBQWI7QUFhQTtBQUNBO0FBQ0EsV0FBTyxVQUFQLEdBQW9CLGdCQUFwQjs7QUFFQTtBQUNBLGFBQVMsY0FBVCxHQUF5QjtBQUN2QixVQUFJLFVBQ0osb0JBQ0ksMEJBREosR0FDaUMsTUFBTSxJQUFOLENBQVcsSUFENUMsR0FDbUQsUUFEbkQsR0FFSSxhQUZKLEdBR00sa0NBSE4sR0FHMkMsS0FIM0MsR0FHbUQsSUFIbkQsR0FHMEQsTUFBTSxJQUhoRSxHQUd1RSxNQUh2RSxHQUlNLG9EQUpOLEdBSTZELE1BQU0sUUFKbkUsR0FJOEUsWUFKOUUsR0FLZSx5QkFMZixHQUsyQyxNQUFNLEtBQU4sQ0FBWSxJQUx2RCxHQUs4RCxZQUw5RCxHQU1lLFdBQVcsTUFBTSxLQUFOLENBQVksUUFBWixDQUFxQixNQUFyQixDQUE0QixNQUFNLEtBQU4sQ0FBWSxRQUF4QyxDQUFYLENBTmYsR0FPZSw4QkFQZixHQU9nRCxNQUFNLEtBQU4sQ0FBWSxLQVA1RCxHQU9vRSxZQVBwRSxHQVFNLFVBUk4sR0FTSSxRQVRKLEdBVUEsUUFYQTs7QUFhQSxhQUFRLElBQUksT0FBTyxJQUFQLENBQVksVUFBaEIsQ0FBMkI7QUFDakMsbUJBQW1CLE9BRGM7QUFFakMsb0JBQW1CLEdBRmM7QUFHakMsMEJBQW1CO0FBSGMsT0FBM0IsQ0FBUjs7QUFNQTtBQUNBO0FBQ0EsZUFBUyxVQUFULENBQW9CLEtBQXBCLEVBQTBCO0FBQ3hCO0FBQ0EsWUFBSSxNQUFNLE1BQU4sR0FBZSxDQUFuQixFQUFxQjtBQUNuQixjQUFJLE1BQU0sRUFBVjtBQUNBO0FBQ0EsZ0JBQU0sT0FBTixDQUFjLFVBQVMsSUFBVCxFQUFlLENBQWYsRUFBaUI7QUFDN0IsZ0JBQUksS0FBSyxLQUFMLEdBQWEsQ0FBakIsRUFBbUI7QUFDakI7QUFDQSxtQkFBSyxLQUFMLEdBQWEsTUFBTSxLQUFLLEtBQXhCO0FBQ0Q7QUFDRDtBQUNBLGdCQUFJLE1BQU0sTUFBTixHQUFlLENBQW5CLEdBQXVCLE9BQVEsS0FBSyxJQUFMLEdBQVksSUFBWixHQUFtQixLQUFLLEtBQXhCLEdBQStCLEtBQTlELEdBQXVFLE9BQVEsS0FBSyxJQUFMLEdBQVksSUFBWixHQUFtQixLQUFLLEtBQXhCLEdBQStCLEdBQTlHO0FBQ0QsV0FQRDtBQVFBO0FBQ0EsaUJBQU8sb0NBQW9DLEdBQXBDLEdBQTBDLFlBQWpEO0FBQ0QsU0FiRCxNQWFPO0FBQ0w7QUFDQSxpQkFBTyxFQUFQO0FBQ0Q7QUFDRjtBQUNGO0FBQ0Q7QUFDQSxXQUFPLGFBQVAsR0FBdUIsWUFBVTtBQUMvQjtBQUNBLFVBQUksYUFBYSxLQUFqQjtBQUNBLFVBQUksUUFBUSxJQUFaOztBQUVBO0FBQ0EsV0FBSyxXQUFMLENBQWlCLFdBQWpCLEVBQThCLFlBQVU7QUFDdEM7QUFDQTtBQUNBLFlBQUksVUFBSixFQUFlO0FBQ2IsdUJBQWEsS0FBYjtBQUNEO0FBQ0Q7QUFDQSx5QkFBaUIsSUFBakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQUssVUFBTCxDQUFnQixJQUFoQixDQUFxQixHQUFyQjtBQUNBO0FBQ0EsaUJBQVMsV0FBVCxHQUFzQjtBQUNwQixpQkFBTyxTQUFQLENBQWlCLFNBQVMsSUFBMUI7QUFDRDtBQUNGLE9BakJEOztBQW1CQTtBQUNBO0FBQ0EsV0FBSyxXQUFMLENBQWlCLFVBQWpCLEVBQTZCLFlBQVU7QUFDckM7QUFDQSxhQUFLLFNBQUwsQ0FBZSxNQUFmO0FBQ0EsWUFBSSxDQUFDLFVBQUwsRUFBZ0I7QUFDZCxlQUFLLFVBQUwsQ0FBZ0IsS0FBaEIsQ0FBc0IsR0FBdEI7QUFDRDtBQUNGLE9BTkQ7O0FBUUE7QUFDQSxXQUFLLFdBQUwsQ0FBaUIsTUFBakIsRUFBeUIsWUFBVTtBQUNqQyxhQUFLLFVBQUwsQ0FBZ0IsTUFBaEIsQ0FBdUIsSUFBdkI7QUFDQTtBQUNELE9BSEQ7O0FBS0E7QUFDQTtBQUNBLFdBQUssV0FBTCxDQUFpQixTQUFqQixFQUE0QixZQUFVO0FBQ3BDLHlCQUFpQixJQUFqQjtBQUNBO0FBQ0EsYUFBSyxVQUFMLENBQWdCLE1BQWhCLENBQXVCLEdBQXZCO0FBQ0QsT0FKRDs7QUFNQTtBQUNBO0FBQ0E7QUFDQSxXQUFLLFdBQUwsQ0FBaUIsT0FBakIsRUFBMEIsWUFBVTtBQUNsQyxTQUFDLFVBQUQsR0FBYyxhQUFhLElBQTNCLEdBQWtDLGFBQWEsS0FBL0M7QUFDRCxPQUZEOztBQUlBO0FBQ0E7QUFDQSxXQUFLLFdBQUwsQ0FBaUIsVUFBakIsRUFBNkIsWUFBVTtBQUNyQztBQUNBLGFBQUssVUFBTCxDQUFnQixNQUFoQixDQUF1QixJQUF2QjtBQUNBLGFBQUssTUFBTCxDQUFZLElBQVo7QUFDRCxPQUpEOztBQU1BO0FBQ0E7QUFDQSxlQUFTLGdCQUFULENBQTBCLE1BQTFCLEVBQWlDO0FBQy9CLFlBQUksTUFBTSxPQUFPLFNBQVAsRUFBVjtBQUNBLFlBQUksT0FBTyxPQUFPLFNBQVAsR0FBbUIsTUFBbkIsRUFBWDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFlBQUksU0FBUyxFQUFDLE9BQU8sSUFBSSxHQUFKLEtBQWEsS0FBSyxHQUFMLEtBQWEsR0FBbEMsRUFBd0MsT0FBTyxJQUFJLEdBQUosS0FBYSxLQUFLLEdBQUwsS0FBYSxHQUF6RSxFQUFiO0FBQ0EsZUFBTyxVQUFQLENBQWtCLFdBQWxCLENBQThCLE1BQTlCO0FBQ0Q7O0FBRUQ7QUFDQTtBQUNBO0FBQ0EsZUFBUyxVQUFULEdBQXFCO0FBQ25CLHNCQUFjLEtBQWQ7QUFDQSxnQkFBUSxJQUFSO0FBQ0Q7QUFDRixLQW5GRDtBQW9GQSxXQUFPLE1BQVA7QUFDRDs7QUFFRDtBQUNBO0FBQ0EsV0FBUyxZQUFULEdBQXVCO0FBQ3JCLFFBQUksSUFBSSxTQUFTLGFBQVQsQ0FBdUIsR0FBdkIsQ0FBUjtBQUNBLE1BQUUsU0FBRixHQUFjLE1BQU0sSUFBTixHQUFhLFVBQTNCO0FBQ0E7QUFDQTtBQUNBLE1BQUUsS0FBRixDQUFRLE9BQVIsR0FBa0IsT0FBbEI7QUFDQSxNQUFFLEtBQUYsQ0FBUSxLQUFSLEdBQWdCLEtBQWhCO0FBQ0EsTUFBRSxLQUFGLENBQVEsaUJBQVIsSUFBNkIsTUFBN0I7QUFDQSxNQUFFLEtBQUYsQ0FBUSxhQUFSLElBQXlCLDhCQUF6QjtBQUNBO0FBQ0EsUUFBSSxlQUFlLE9BQU8sR0FBUCxDQUFXLFFBQVgsS0FBd0IsR0FBeEIsR0FBOEIsT0FBTyxHQUFQLENBQVcsUUFBWCxFQUFqRDtBQUNBLE1BQUUsSUFBRixHQUFTLDZCQUE2QixZQUE3QixHQUE0QyxLQUFyRDtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQVMsY0FBVCxDQUF3QixNQUF4QixFQUFnQyxXQUFoQyxDQUE0QyxDQUE1QztBQUNBO0FBQ0Esa0JBQWMscUJBQVMsTUFBVCxFQUFnQjtBQUM1QjtBQUNBLFVBQUksTUFBTSxPQUFPLE9BQU8sQ0FBUCxDQUFQLENBQVY7QUFDQSxVQUFJLE1BQU0sT0FBTyxPQUFPLENBQVAsQ0FBUCxDQUFWO0FBQ0E7QUFDQTtBQUNBLFVBQUksWUFBYSxPQUFPLGNBQWMsR0FBckIsSUFBNEIsT0FBTyxjQUFjLEdBQWxELEdBQXlELENBQXpELEdBQTZELENBQTdFO0FBQ0E7QUFDQTtBQUNBLFVBQUksTUFBTSxFQUFDLE9BQU8sR0FBUixFQUFhLE9BQU8sR0FBcEIsRUFBVjtBQUNBLFVBQUksT0FBSixDQUFZLFNBQVo7QUFDQSxVQUFJLFNBQUosQ0FBYyxHQUFkO0FBQ0E7QUFDQSxhQUFPLFFBQVAsQ0FBZ0IsQ0FBaEIsRUFBbUIsU0FBUyxjQUFULENBQXdCLGtCQUF4QixFQUE0QyxxQkFBNUMsR0FBb0UsTUFBcEUsR0FBNkUsRUFBaEc7QUFDQSxVQUFJLEtBQUosQ0FBVSxHQUFWO0FBQ0QsS0FmRDs7QUFpQkE7QUFDQSxhQUFTLGFBQVQsR0FBd0I7QUFDdEIsVUFBSSxVQUFVLFNBQVMsR0FBdkI7QUFDQTtBQUNBLFVBQUksV0FBVyxJQUFJLE9BQU8sSUFBUCxDQUFZLE1BQWhCLENBQXVCO0FBQ3BDLHVCQUFpQixrQkFEbUI7QUFFcEMseUJBQWlCLENBRm1CO0FBR3BDLHdCQUFpQixDQUhtQjtBQUlwQyxxQkFBaUIsa0JBSm1CO0FBS3BDLHVCQUFpQixDQUxtQjtBQU1wQyxlQUFpQixJQU5tQjtBQU9wQyxrQkFBaUIsTUFQbUI7QUFRcEMsa0JBQWlCO0FBUm1CLE9BQXZCLENBQWY7QUFVQTtBQUNBLFVBQUksU0FBSjtBQUNBO0FBQ0EsUUFBRSxnQkFBRixDQUFtQixXQUFuQixFQUFnQyxZQUFVO0FBQ3hDO0FBQ0EsWUFBSSxVQUFVLFNBQWQsRUFBd0I7QUFDdEIsb0JBQVUsVUFBVixDQUFxQixFQUFDLGVBQWUsa0JBQWhCO0FBQ0MsNkJBQWlCLEVBRGxCLEVBQXJCO0FBRUQ7QUFDRDtBQUNBLGlCQUFTLE1BQVQsQ0FBZ0IsR0FBaEI7QUFDQTtBQUNBLFlBQUksSUFBSSxDQUFSO0FBQ0E7QUFDQSxZQUFJLGFBQWEsR0FBakI7QUFDQTtBQUNBLFlBQUksV0FBVyxJQUFmO0FBQ0E7QUFDQSxlQUFPLEtBQUssR0FBWixFQUFpQixHQUFqQixFQUFxQjtBQUNuQixXQUFDLFNBQVMsV0FBVCxDQUFxQixDQUFyQixFQUF1QjtBQUN0Qix3QkFBWSxXQUFXLFlBQVU7QUFDL0I7QUFDQSx5QkFBVyxjQUFjLEdBQXpCLEdBQStCLGNBQWMsR0FBN0M7QUFDQTtBQUNBO0FBQ0Esa0JBQUksY0FBYyxDQUFsQixFQUFvQjtBQUNsQiwyQkFBVyxLQUFYO0FBQ0Q7QUFDRCxrQkFBSSxjQUFjLEdBQWxCLEVBQXNCO0FBQ3BCLDJCQUFXLElBQVg7QUFDRDtBQUNEO0FBQ0E7QUFDQSx1QkFBUyxTQUFULENBQW1CLFdBQVcsSUFBSSxVQUFmLENBQW5CO0FBQ0QsYUFkVyxFQWNULElBQUksRUFkSyxDQUFaLENBRHNCLENBZVg7QUFDWixXQWhCRCxFQWdCRyxDQWhCSCxFQURtQixDQWlCYjtBQUNQO0FBQ0YsT0FsQ0Q7O0FBb0NBO0FBQ0EsUUFBRSxnQkFBRixDQUFtQixVQUFuQixFQUErQixZQUFVO0FBQ3ZDLHFCQUFhLFNBQWI7QUFDQSxpQkFBUyxNQUFULENBQWdCLElBQWhCO0FBQ0EsWUFBSSxVQUFVLFNBQWQsRUFBd0I7QUFDdEI7QUFDQSxvQkFBVSxVQUFWLENBQXFCLEVBQUMsZUFBZSxlQUFoQjtBQUNDLDZCQUFpQixHQURsQixFQUFyQjtBQUVEO0FBQ0YsT0FSRDtBQVNEO0FBQ0Y7QUFDRiIsImZpbGUiOiJjaXJjbGVkcmF3LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ3JlYXRlcyBhIGNpcmNsZSBvbiB0aGUgbWFwIHVzaW5nIHRoZSB0d2VldCdzIG1vb2QgKFJHQiB2YWx1ZXMpIGFzIGl0c1xuLy8gY29sb3IsIHRoZSB0d2VldCdzIGxvY2F0aW9uIGFzIGl0cyBjb29yZGluYXRlcywgYW5kIHRoZSB0d2VldCB1c2VyJ3Ncbi8vIG51bWJlciBvZiBmb2xsb3dlcnMgdG8gc2V0IGl0cyByYWRpdXMgKG1vcmUgZm9sbG93ZXJzID0gYSBiaWdnZXIgcmFkaXVzLFxuLy8gb3IgXCJyZWFjaFwiLilcbmZ1bmN0aW9uIGNyZWF0ZVR3ZWV0Q2lyY2xlKHR3ZWV0LCBjZW50ZXIsIHNvdXJjZSl7XG4gIHZhciByYWRpdXMgPSBzZXRSYWRpdXMoKTtcbiAgdmFyIGNvbG9yID0gJ1JHQignICsgdHdlZXQuc3RhdHMubW9vZC50b1N0cmluZygpICsgJyknOyAgICAgICAgICAgICAgICAgICAgXG4gIHZhciB0d2VldENpcmNsZSA9IHNldFR3ZWV0Q2lyY2xlKCk7XG4gIHR3ZWV0Q2lyY2xlLmluaXRMaXN0ZW5lcnMoKTtcbiAgLy8gVHJhY2sgdGhlIHR3ZWV0J3MgaWQgZm9yIHBhcmFtZXRlcml6aW5nIGxhdGVyIFR3aXR0ZXIgR0VUIHJlcXVlc3RzLiBcbiAgdHdlZXRDaXJjbGUuX3NldElkKHR3ZWV0LmlkKTtcbiAgLy8gU3RvcmUgdGhlIGNpcmNsZSBpbiB0aGUgbWFwIGZvciBsYXRlciB0b2dnbGluZyBvZiB2aXNpYmlsaXR5LiAgXG4gIHR3ZWV0Q2lyY2xlLl9zdG9yZUluTWFwKG1hcCk7XG4gIC8vIFNldCBhbiBocmVmIGluIHRoZSB0ZXh0IGNyYXdsIHRoYXQgcGFucyB0aGUgbWFwIGFuZCB6b29tcyB0byB0aGUgY3VycmVudCBcImNlbnRlclwiLlxuICBsaW5rVG9DaXJjbGUoKTtcblxuICAvLyBDaXJjbGUgcmFkaWkgYXJlIGluIG1ldGVycywgc28gbnVtYmVycyBvZiBmb2xsb3dlcnMgbmVlZCB0byBiZSBtdWx0aXBsaWVkIGluIG9yZGVyIGZvciB0aGUgY2lyY2xlIHRvIHNob3cgb24gXG4gIC8vIHRoZSBtYXAuIFRoaXMgc2V0cyB0aGUgcmFkaXVzIHN1Y2ggdGhhdCBzbWFsbGVyIHR3ZWV0cyByZWNlaXZlIGEgYmlnZ2VyIGJ1bXAgaW4gc2l6ZSB0aGFuIGxhcmdlciBvbmVzLCBcbiAgLy8gY2FwcGVkIGF0IDI1ayBmb2xsb3dlcnMsIGFmdGVyIHdoaWNoIHRoZXJlIGlzIGEgY29uc3RhbnQgbXVsdGlwbGllci5cbiAgZnVuY3Rpb24gc2V0UmFkaXVzKCl7XG4gICAgdmFyIHJhZCA9IHR3ZWV0LnN0YXRzLnJlYWNoO1xuICAgIGlmIChyYWQpe1xuICAgICAgLy8gSW4gc2hvcnQgLS0gaXQncyBoYWxmIG9mIGFuIHVwc2lkZS1kb3duIHBhcmFib2xhIChmYXN0IGdyb3d0aCBmb3Igc21hbGwgbnVtYmVycywgc2xvdyBncm93dGhcbiAgICAgIC8vIHRvd2FyZHMgdGhlIG1pZGRsZSksIHdpdGggdGhlIG1pZGRsZSBzZXQgYXQgMjVrIGZvbGxvd2Vycy4gVGhlIGNvbnN0YW50cyBhcmUgc2V0IHRvIGZ1cnRoZXIgaW5jcmVhc2UgXG4gICAgICAvLyB0aGUgZ3Jvd3RoIG9mIHNtYWxsZXIgY2lyY2xlcywgcmVsYXRpdmUgdG8gdGhhdCBvZiBsYXJnZXIgY2lyY2xlcy5cbiAgICAgIHJhZCA+IDI1MDAwID8gcmFkICo9IDI1IDogcmFkID0gKCg1MCAtIC4wMDEgKiByYWQpICogcmFkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gNTAgbWV0ZXJzIGlzIHRoZSBkZWZhdWx0LCBmb3IgYSB1c2VyIHdpdGggbm8gZm9sbG93ZXJzLiBcbiAgICAgIHJhZCA9IDUwO1xuICAgIH1cbiAgICByZXR1cm4gcmFkO1xuICB9XG5cbiAgLy8gU2V0IHRoZSBzdGFydGluZyBwcm9wZXJ0aWVzIG9mIHRoaXMgY2lyY2xlLiBcbiAgZnVuY3Rpb24gc2V0VHdlZXRDaXJjbGUoKXtcbiAgICB2YXIgY2lyY2xlID0gbmV3IGdvb2dsZS5tYXBzLkNpcmNsZSh7XG4gICAgICAnc3Ryb2tlQ29sb3InICA6IGNvbG9yLFxuICAgICAgJ3N0cm9rZU9wYWNpdHknOiAuOCxcbiAgICAgICdzdHJva2VXZWlnaHQnIDogMixcbiAgICAgICdmaWxsQ29sb3InICAgIDogY29sb3IsXG4gICAgICAnZmlsbE9wYWNpdHknICA6IC4zNSwgXG4gICAgICAnbWFwJyAgICAgICAgICA6IG1hcCxcbiAgICAgICdjZW50ZXInICAgICAgIDogY2VudGVyLFxuICAgICAgJ3JhZGl1cycgICAgICAgOiByYWRpdXMsXG4gICAgICAnZHJhZ2dhYmxlJyAgICA6IHRydWUsXG4gICAgICAnY2xpY2thYmxlJyAgICA6IHRydWUsXG4gICAgICAnZ2VvZGVzaWMnICAgICA6IGZhbHNlLFxuICAgIH0pO1xuICAgIC8vIEVhY2ggY2lyY2xlIGhhcyBpdHMgb3duIEluZm8gV2luZG93IG9iamVjdCBmb2xsb3dpbmcgaXQgYXJvdW5kLCBkaXNwbGF5aW5nXG4gICAgLy8gaW5mb3JtYXRpb24gYWJvdXQgaXRzIHR3ZWV0LlxuICAgIGNpcmNsZS5pbmZvV2luZG93ID0gaW5pdEluZm9XaW5kb3coKTsgXG5cbiAgICAvLyBTZXQgdGhlIEluZm8gV2luZG93IHdpdGggaHRtbCBmcm9tIHRoZSB0d2VldCdzIHN0YXRzL2luZm8uXG4gICAgZnVuY3Rpb24gaW5pdEluZm9XaW5kb3coKXtcbiAgICAgIHZhciBjb250ZW50ID0gXG4gICAgICAnPGRpdiBpZD1cImluZm9cIj4nICtcbiAgICAgICAgICAnPGRpdiBjbGFzcz1cImluZm9UaXRsZVwiPkAnICsgdHdlZXQudXNlci5uYW1lICsgJzwvZGl2PicgK1xuICAgICAgICAgICc8ZGl2IGNsYXNzPicgK1xuICAgICAgICAgICAgJzxwIGNsYXNzPVwidHdlVGV4dFwiIHN0eWxlPVwiY29sb3I6JyArIGNvbG9yICsgJ1wiPicgKyB0d2VldC50ZXh0ICsgJzwvcD4nICtcbiAgICAgICAgICAgICc8dGFibGUgY2xhc3M9XCJ0d2VEYXRhXCI+PHRyPjx0ZD4gTG9jYXRpb246PC90ZD48dGQ+JyArIHR3ZWV0LmxvY2F0aW9uICsgJzwvdGQ+PC90cj4nICtcbiAgICAgICAgICAgICAgICAgICAgICc8dHI+PHRkPiBUaW1lOjwvdGQ+PHRkPicgKyB0d2VldC5zdGF0cy50aW1lICsgJzwvdGQ+PC90cj4nICtcbiAgICAgICAgICAgICAgICAgICAgIHdvcmRzVG9Sb3codHdlZXQuc3RhdHMucG9zV29yZHMuY29uY2F0KHR3ZWV0LnN0YXRzLm5lZ1dvcmRzKSkgKyBcbiAgICAgICAgICAgICAgICAgICAgICc8dHI+PHRkPiBGb2xsb3dlcnM6PC90ZD48dGQ+JyArIHR3ZWV0LnN0YXRzLnJlYWNoICsgJzwvdGQ+PC90cj4nICtcbiAgICAgICAgICAgICc8L3RhYmxlPicgK1xuICAgICAgICAgICc8L2Rpdj4nICtcbiAgICAgICc8L2Rpdj4nO1xuXG4gICAgICByZXR1cm4gIG5ldyBnb29nbGUubWFwcy5JbmZvV2luZG93KHtcbiAgICAgICAgJ2NvbnRlbnQnICAgICAgICA6IGNvbnRlbnQsXG4gICAgICAgICdtYXhXaWR0aCcgICAgICAgOiAzNTAsXG4gICAgICAgICdkaXNhYmxlQXV0b1BhbicgOiB0cnVlLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIElmIHRoZXJlIGFyZSB3b3JkcyBpbnNpZGUgZWl0aGVyIHBvc1dvcmRzIG9yIG5lZ1dvcmRzLCBtYWtlIGEgcm93IGZvciB0aGUgXCJjb250ZW50XCIgdGFibGUgb3V0IG9mIGFuIGh0bWxcbiAgICAgIC8vIHN0cmluZy4gSXQnbGwgYmUgZm9ybWF0dGVkIGFzIHN1Y2g6IFwibG92ZSg0KSwgd2luKDMpLCBoYXRlKC00KVwiLiBcbiAgICAgIGZ1bmN0aW9uIHdvcmRzVG9Sb3cod29yZHMpe1xuICAgICAgICAvLyBOb3RpY2UgdGhlIHVzZSBvZiBcImNvbmNhdFwiIGluIHRoZSBkZWZpbml0aW9uIG9mIFwiY29udGVudFwiLiBcIndvcmRzXCIgaGFzIGJvdGggXCJwb3NXb3Jkc1wiIGFuZCBcIm5lZ1dvcmRzXCIuXG4gICAgICAgIGlmICh3b3Jkcy5sZW5ndGggPiAwKXtcbiAgICAgICAgICB2YXIgc3RyID0gJyc7XG4gICAgICAgICAgLy8gXCJzdHJcIiB3aWxsIGJlY29tZSBhIGNvbW1hLXNlcGFyYXRlZCBzdHJpbmcgb2YgYWxsIHdvcmRzIHRoYXQgd2VyZSBzY29yZWQgaW4gXCJ0d2VldFwiLlxuICAgICAgICAgIHdvcmRzLmZvckVhY2goZnVuY3Rpb24od29yZCwgaSl7XG4gICAgICAgICAgICBpZiAod29yZC5zY29yZSA+IDApe1xuICAgICAgICAgICAgICAvLyBQdXQgYSBwbHVzIHNpZ24gaW4gZnJvbnQgb2YgZXZlcnl0aGluZyBmcm9tIFwicG9zV29yZHNcIiAoc2NvcmVzID4gMCkuXG4gICAgICAgICAgICAgIHdvcmQuc2NvcmUgPSAnKycgKyB3b3JkLnNjb3JlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQ29uY2F0ZW5hdGUgXCJ3b3JkKCsvLXNjb3JlKSxcIiB1bnRpbCB0aGUgbGFzdCBlbGVtZW50LCB0aGVuLCBkcm9wIHRoZSBjb21tYSwgY29uY2F0ZW5hdGUgXCIod29yZCgrLy1zY29yZSlcIiBvbmx5KS5cbiAgICAgICAgICAgIGkgPCB3b3Jkcy5sZW5ndGggLSAxID8gc3RyICs9ICh3b3JkLndvcmQgKyAnICgnICsgd29yZC5zY29yZSArJyksICcpIDogc3RyICs9ICh3b3JkLndvcmQgKyAnICgnICsgd29yZC5zY29yZSArJyknKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC8vIFNjb3Jpbmcgd29yZHMgZnJvbSBib3RoIFwicG9zV29yZHNcIiBhbmQgXCJuZWdXb3Jkc1wiIGFwcGVhciBpbiB0aGUgc2FtZSBodG1sIHN0cmluZy4gXG4gICAgICAgICAgcmV0dXJuICc8dHI+PHRkPlNjb3JpbmcgV29yZHM6PC90ZD48dGQ+JyArIHN0ciArICc8L3RkPjwvdHI+JzsgICAgICAgICAgXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gSWYgdGhlcmUgYXJlbid0IGFueSB3b3JkcyBpbiB0aGlzIGFycmF5LCByZXR1cm4gYW4gZW1wdHkgc3RyaW5nLiBObyByb3cgd2lsbCBzaG93IGluIFwiY29udGVudFwiIGZvciB0aGlzIHR3ZWV0LlxuICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gICAgLy8gVGhlIGNpcmNsZSBoYXMgaXRzIG93biBsaXN0ZW5lcnMsIGRldGVjdGluZyBldmVudHMgc3VjaCBhcyBcImRyYWdcIiwgXCJtb3VzZW92ZXJcIiwgZXRjLlxuICAgIGNpcmNsZS5pbml0TGlzdGVuZXJzID0gZnVuY3Rpb24oKXtcbiAgICAgIC8vIFwiaG9sZFdpbmRvd1wiIHdpbGwgdGVsbCBsaXN0ZW5lcnMgd2hldGhlciBvciBub3QgdG8gY2xvc2UgYW4gaW5mbyB3aW5kb3cgaW1tZWRpYXRlbHkgb24gYSAnbW91c2VvdXQnLiBcbiAgICAgIHZhciBob2xkV2luZG93ID0gZmFsc2U7XG4gICAgICB2YXIgdGltZXIgPSBudWxsO1xuXG4gICAgICAvLyBTZXRzIGEgbGlzdGVuZXIgdGhhdCB0cmlnZ2VycyB3aGVuZXZlciB0aGUgY3Vyc29yIHBhc3NlcyBvdmVyIHRoaXMgY2lyY2xlLlxuICAgICAgdGhpcy5hZGRMaXN0ZW5lcignbW91c2VvdmVyJywgZnVuY3Rpb24oKXtcbiAgICAgICAgLy8gV2l0aCB0aGlzIGNvbmRpdGlvbiwgdGhlIGluZm8gd2luZG93IGNsb3NlcyBhZnRlciB0aGUgbmV4dCB0aW1lIHRoZSBtb3VzZW92ZXJcbiAgICAgICAgLy8gb2NjdXJzLCBhZnRlciBpdCBoYXMgYmVlbiBjbGlja2VkIHRvIGhvbGQgaXQgb3Blbi5cbiAgICAgICAgaWYgKGhvbGRXaW5kb3cpe1xuICAgICAgICAgIGhvbGRXaW5kb3cgPSBmYWxzZVxuICAgICAgICB9O1xuICAgICAgICAvLyBCZWZvcmUgb3BlbmluZyB0aGUgd2luZG93LCBpdCBtdXN0IGJlIGFuY2hvcmVkIHRvIHRoZSBjaXJjbGUuIFxuICAgICAgICBhbmNob3JJbmZvV2luZG93KHRoaXMpOyAgICAgXG4gICAgICAgIC8vIFdoZW4gdGhlIGN1cnNvciBwYXNzZXMgb3ZlciB0aGlzIGNpcmNsZSwgbWFrZSBhIHNtYWxsIGluY3JlYXNlIGluIGl0cyByYWRpdXMgdG8gY2xhcmlmeSB3aGljaCBcbiAgICAgICAgLy8gY2lyY2xlIGlzIGN1cnJlbnRseSB1bmRlciB0aGUgY3Vyc29yLiAgICAgICBcbiAgICAgICAgZXhwbG9kZVZpZXcoKTtcbiAgICAgICAgLy8gT3BlbiB1cCB0aGUgbWFwLCBub3cgdGhhdCBhbGwgdGhlIGFib3ZlIHByb3BlcnRpZXMgaGF2ZSBiZWVuIHNldC4gICAgICAgICAgICAgICAgIFxuICAgICAgICB0aGlzLmluZm9XaW5kb3cub3BlbihtYXApO1xuICAgICAgICAvLyBUaGUgaGVscGVyIGZ1bmN0aW9uIHdoaWNoIGdpdmVzIHRoZSB0ZW1wb3JhcnkgYm9vc3QgdG8gcmFkaXVzLiBcbiAgICAgICAgZnVuY3Rpb24gZXhwbG9kZVZpZXcoKXtcbiAgICAgICAgICBjaXJjbGUuc2V0UmFkaXVzKHJhZGl1cyAqIDEuMTUpO1xuICAgICAgICB9ICBcbiAgICAgIH0pO1xuXG4gICAgICAvLyBDbGVhciB0aGUgdGltZXIsIHJlc2V0IHRoZSByYWRpdXMgKHVuZG9lcyBcImV4cGxvZGVWaWV3XCIpLCBhbmQgY2xvc2UgdGhlIGluZm8gd2luZG93IGlmIFxuICAgICAgLy8gXCJob2xkV2luZG93XCIgaXMgbm90IHRydWUgb24gYSAnbW91c2VvdXQnIGV2ZW50LlxuICAgICAgdGhpcy5hZGRMaXN0ZW5lcignbW91c2VvdXQnLCBmdW5jdGlvbigpe1xuICAgICAgICBjbGVhclRpbWVyKCk7XG4gICAgICAgIHRoaXMuc2V0UmFkaXVzKHJhZGl1cyk7ICAgICAgICBcbiAgICAgICAgaWYgKCFob2xkV2luZG93KXtcbiAgICAgICAgICB0aGlzLmluZm9XaW5kb3cuY2xvc2UobWFwKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIFRoZSB0aW1lciBpcyBjbGVhcmVkIHdoZW4gZHJhZ2dpbmcgc3RhcnRzLCBhbmQgdGhlIHdpbmRvdyBpcyBpbnZpc2libGUgZHVyaW5nIHRoZSBkcmFnLiBcbiAgICAgIHRoaXMuYWRkTGlzdGVuZXIoJ2RyYWcnLCBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmluZm9XaW5kb3cuc2V0TWFwKG51bGwpO1xuICAgICAgICBjbGVhclRpbWVyKCk7XG4gICAgICB9KTtcblxuICAgICAgLy8gUmUtYW5jaG9yIHRoZSB3aW5kb3cgdG8gdGhpcyBjaXJjbGUncyBjdXJyZW50IGxvY2F0aW9uLCBjbGVhciB0aGUgdGltZXIsIHNob3cgdGhlIGluZm9cbiAgICAgIC8vIHdpbmRvdyB3aGVuIGRyYWdnaW5nIHN0b3BzLiBcbiAgICAgIHRoaXMuYWRkTGlzdGVuZXIoJ2RyYWdlbmQnLCBmdW5jdGlvbigpe1xuICAgICAgICBhbmNob3JJbmZvV2luZG93KHRoaXMpO1xuICAgICAgICBjbGVhclRpbWVyKCk7ICAgICAgICAgICBcbiAgICAgICAgdGhpcy5pbmZvV2luZG93LnNldE1hcChtYXApO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFdoZW4gYSBjaXJjbGUgaXMgY2xpY2tlZCwgaXQgd2lsbCB0ZWxsIHRoZSBpbmZvIHdpbmRvdyB0byBzdGF5IG9wZW4gYWZ0ZXIgdGhlIGZpcnN0IFxuICAgICAgLy8gbW91c2VvdXQgZXZlbnQgb2NjdXJzLiBBZnRlciB0aGUgbmV4dCBtb3VzZW91dCBldmVudCwgdGhpcyBpcyB1bmRvbmUsIGFuZCB0aGUgd2luZG93XG4gICAgICAvLyB3aWxsIGNsb3NlLCB1bmxlc3MgdGhlIGNpcmNsZSBpcyBjbGlja2VkIGFnYWluLiBcbiAgICAgIHRoaXMuYWRkTGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKXtcbiAgICAgICAgIWhvbGRXaW5kb3cgPyBob2xkV2luZG93ID0gdHJ1ZSA6IGhvbGRXaW5kb3cgPSBmYWxzZTtcbiAgICAgIH0pOyAgICAgICAgICAgICAgXG5cbiAgICAgIC8vIE9uIGEgZG91YmxlIGNsaWNrLCB0aGUgY2lyY2xlIGlzIGludmlzaWJsZS4gSXQgY2FuIGJlIHZpc2libGUgYWdhaW4gYnkgY2xpY2tpbmcgdGhlXG4gICAgICAvLyBcIlNob3cgQ2lyY2xlc1wiIGJ1dHRvbiBiZWxvdyB0aGUgbWFwLiBcbiAgICAgIHRoaXMuYWRkTGlzdGVuZXIoJ2RibGNsaWNrJywgZnVuY3Rpb24oKXtcbiAgICAgICAgY2xlYXJUaW1lcigpO1xuICAgICAgICB0aGlzLmluZm9XaW5kb3cuc2V0TWFwKG51bGwpO1xuICAgICAgICB0aGlzLnNldE1hcChudWxsKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBTZXRzIHRoZSBpbmZvIHdpbmRvdydzIGRpc3BsYXkgY2VudGVyIHRvIGJlIGp1c3Qgbm9ydGhlYXN0IG9mIHRoZSBjaXJjbGUncyBvdXRlciBlZGdlLiBcbiAgICAgIC8vIChUaGUgcG9zaXRpb24gaXMgc3ViamVjdCB0byBjaGFuZ2UsIGp1c3QgcGlja2VkIGEgcGxhY2VtZW50IEkgbGlrZWQuKVxuICAgICAgZnVuY3Rpb24gYW5jaG9ySW5mb1dpbmRvdyhjaXJjbGUpe1xuICAgICAgICB2YXIgY2VuID0gY2lyY2xlLmdldENlbnRlcigpO1xuICAgICAgICB2YXIgc3BhbiA9IGNpcmNsZS5nZXRCb3VuZHMoKS50b1NwYW4oKTtcbiAgICAgICAgLy8gRGVhbGluZyB3aXRoIGxhdExuZyBtYXRoIGlzIG1hZGUgZGlmZmljdWx0IGR1ZSB0byBjb252ZXJzaW9uIGZhY3RvcnMgb2YgbGF0L2xvbmcgdmFsdWVzIFxuICAgICAgICAvLyBpbnRvIG1ldGVycy4gU3BoZXJpY2FsIG1hdGggaXMgbmVlZGVkLCB3aGljaCB0YWtlcyB1cCBhIGJ1bmNoIG9mIHNwYWNlLiBcImdldEJvdW5kc1wiIGtlZXBzIHRoZSB1bml0cyBcbiAgICAgICAgLy8gaW4gY29vcmRpbmF0ZXMsIGFsbGV2aWF0ZXMgdGhhdCBpc3N1ZS5cbiAgICAgICAgdmFyIGxhdExuZyA9IHsnbGF0JzogY2VuLmxhdCgpICsgKHNwYW4ubGF0KCkgLyAyLjMpLCAnbG5nJzogY2VuLmxuZygpICsgKHNwYW4ubG5nKCkgLyAyLjMpIH07XG4gICAgICAgIGNpcmNsZS5pbmZvV2luZG93LnNldFBvc2l0aW9uKGxhdExuZyk7ICAgICAgICAgICAgICAgICAgICBcbiAgICAgIH0gIFxuXG4gICAgICAvLyBBIGhlbHBlciBmdW5jdGlvbiB0byBtYWtlIHN1cmUgdGhlIHRpbWVyIGlzIGNsZWFyaW5nIChzZXR0aW5nIGl0IHRvIG51bGwgaXMgYSBmYWlsLXNhZmUpLiBcbiAgICAgIC8vIFdoZW4gdGhlIHRpbWVyIHdhc24ndCB3b3JraW5nIGFzIGV4cGVjdGVkLCBpbmZvIHdpbmRvd3Mgd2VyZSBzdGF5aW5nIG9wZW4gYWxsIG92ZXIgdGhlIFxuICAgICAgLy8gcGxhY2UsIHNvIEkgZmVsdCB0aGUgZmFpbC1zYWZlIHdhcyB3b3J0aHdoaWxlLiBcbiAgICAgIGZ1bmN0aW9uIGNsZWFyVGltZXIoKXtcbiAgICAgICAgY2xlYXJJbnRlcnZhbCh0aW1lcik7XG4gICAgICAgIHRpbWVyID0gbnVsbDtcbiAgICAgIH0gICAgICAgICAgXG4gICAgfVxuICAgIHJldHVybiBjaXJjbGU7IFxuICB9XG5cbiAgLy8gQXBwZW5kcyBhbiBocmVmIHRvIHRoZSBjcmF3bCB0byB0aGUgcmlnaHQgb2YgdGhlIG1hcC4gVGhlIGhyZWYgaGFzIHRoZSB0d2VldCdzIHRleHQgYW5kIGlzIGNvbG9yLVxuICAvLyBjb2RlZCB0byBpdHMgbW9vZCAoc2FtZSBjb2xvciBhcyB0aGUgY2lyY2xlKS4gQ2xpY2tpbmcgaXQgcGFucyB0aGUgbWFwIHRvIGNlbnRlciBvdmVyIGl0cyBjaXJjbGUuIFxuICBmdW5jdGlvbiBsaW5rVG9DaXJjbGUoKXtcbiAgICB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICBhLmlubmVySFRNTCA9IHR3ZWV0LnRleHQgKyBcIjxicj48YnI+XCI7XG4gICAgLy8gU2V0dGluZyBkaXNwbGF5IHRvICdibG9jaycgaGVscHMgdG8gc3RhYmlsaXplIHRoZSBhbmltYXRpb25zLCBwcmV2ZW50cyAnbW91c2VvdXQncyBmcm9tIGZpcmluZyB3aGVuIFxuICAgIC8vIHRoZSBjdXJzb3Igc2xpZGVzIGJldHdlZW4gZ2FwcyBpbiBjaGFyYWN0ZXJzLCB3b3JkcywgbGluZSBzcGFjZXMsIGV0Yy4uXG4gICAgYS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgICBhLnN0eWxlLmNvbG9yID0gY29sb3I7XG4gICAgYS5zdHlsZVsndGV4dC1kZWNvcmF0aW9uJ10gPSAnbm9uZSc7XG4gICAgYS5zdHlsZVsndGV4dC1zaGFkb3cnXSA9ICcxcHggMXB4IDFweCByZ2IoMjIwLDIyMCwyMjApJztcbiAgICAvLyBDb25jYXRlbmF0ZSB0aGlzIHN0cmluZyB0byBwcmVzZXJ2ZSB0aGUgY3VycmVudCBjZW50ZXIgaW4gdGhlIERPTSwgZW5zdXJlcyBtYXAgcGFucyB0byBjb3JyZWN0IGNpcmNsZS5cbiAgICB2YXIgY2VudGVyU3RyaW5nID0gY2VudGVyLmxhdC50b1N0cmluZygpICsgJywnICsgY2VudGVyLmxuZy50b1N0cmluZygpO1xuICAgIGEuaHJlZiA9ICdqYXZhc2NyaXB0OnBhblRvQ2lyY2xlKFsnICsgY2VudGVyU3RyaW5nICsgJ10pOycgXG4gICAgLy8gQ3JlYXRlcyBhIGdvbGQgcmluZyB0byBnbyBhcm91bmQgJ3RoaXMnIGNpcmNsZSB3aGVuIHRoZSBjdXJzb3IgaG92ZXJzIG92ZXIgXCJhLmhyZWYnXFxcIi5cbiAgICBoaWdobGlnaHRIYWxvKCk7XG4gICAgLy8gQXBwZW5kIFwiYVwiIHRvIHRoZSBjcmF3bC5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGV4dCcpLmFwcGVuZENoaWxkKGEpO1xuICAgIC8vIFRoZSBocmVmJ3MgZnVuY3Rpb247IHBhbnMgdGhlIG1hcCB0byBcInRoaXNcIiBjaXJjbGUncyBjZW50ZXIuXG4gICAgcGFuVG9DaXJjbGUgPSBmdW5jdGlvbihsYXRMbmcpe1xuICAgICAgLy8gVGhvdWdoIFwiY2VudGVyU3RyaW5nXCIgd2FzIGEgc3RyaW5nIGFib3ZlLCBpdCBldmFsdWF0ZXMgYXMgYW4gYXJyYXksIGhlcmUuXG4gICAgICB2YXIgbGF0ID0gTnVtYmVyKGxhdExuZ1swXSk7XG4gICAgICB2YXIgbG5nID0gTnVtYmVyKGxhdExuZ1sxXSk7XG4gICAgICAvLyBcInpvb21MZXZlbFwiIGlzIGVpdGhlciA2IChtb3JlIHpvb20pIGZvciB0d2VldHMgdGhhdCBoYXZlIGxvY2F0aW9ucywgb3IgNSAobGVzcyB6b29tKSBmb3IgdGhlIHR3ZWV0cyBpbiBcbiAgICAgIC8vIFwidHdlZXREdW1wXCIuIChBdXRvLXpvb21pbmcgdG9vIGNsb3NlIHdpdGhpbiBcInR3ZWV0RHVtcFwiIGlzIGRpc29yaWVudGluZywgSSBmb3VuZC4pXG4gICAgICB2YXIgem9vbUxldmVsID0gKGxhdCA9PSBEZWZhdWx0Q2VudGVyLmxhdCAmJiBsbmcgPT0gRGVmYXVsdENlbnRlci5sbmcpID8gNSA6IDY7ICAgICBcbiAgICAgIC8vIFRha2UgdGhlIGNlbnRlciBmcm9tIHRoZSBsb2NhbCBhcmd1bWVudCwgbm90IFwiY2VudGVyXCIgZnJvbSB0aGUgb3V0ZXIgc2NvcGUuIFwiY2VudGVyXCIgZnJvbSB0aGUgb3V0ZXIgc2NvcGVcbiAgICAgIC8vIGlzIG92ZXJ3cml0dGVuIGJ5IHRoZSB0aW1lIHRoaXMgd2lsbCBmaXJlLCBwYW5uaW5nIHRoZSBtYXAgdG8gdGhlIG1vc3QgcmVjZW50bHkgZHJhd24gY2lyY2xlLlxuICAgICAgdmFyIGNlbiA9IHsnbGF0JzogbGF0LCAnbG5nJzogbG5nfTtcbiAgICAgIG1hcC5zZXRab29tKHpvb21MZXZlbCk7IFxuICAgICAgbWFwLnNldENlbnRlcihjZW4pO1xuICAgICAgLy8gU2Nyb2xsIHRoZSB3aW5kb3cgYmFjayB0byB0aGUgbWFwLlxuICAgICAgd2luZG93LnNjcm9sbFRvKDAsIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYW5uZXJDb250ZW50RGl2JykuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0ICsgMTUpOyAgICAgIFxuICAgICAgbWFwLnBhblRvKGNlbik7XG4gICAgfVxuXG4gICAgLy8gU2V0cyBhIHJpbmcgdG8gem9vbSBpbiBhbmQgb3V0IGFyb3VuZCBhIGNpcmNsZSwgaGVscHMgY2xhcmlmeSB3aGljaCBjaXJjbGUgYmVsb25ncyB0byB3aGljaCB0d2VldCwgZnJvbSB0aGUgY3Jhd2wuICAgXG4gICAgZnVuY3Rpb24gaGlnaGxpZ2h0SGFsbygpeyAgXG4gICAgICB2YXIgaGFsb1JhZCA9IHJhZGl1cyAqIDEuMztcbiAgICAgIC8vIEFuIGVtcHR5IGdvbGRlbiByaW5nIC0tIGEgaGFsby5cbiAgICAgIHZhciBocmVmSGFsbyA9IG5ldyBnb29nbGUubWFwcy5DaXJjbGUoe1xuICAgICAgICAnc3Ryb2tlQ29sb3InICA6ICdSR0IoMjU1LDI1NSwxMDApJyxcbiAgICAgICAgJ3N0cm9rZU9wYWNpdHknOiAxLFxuICAgICAgICAnc3Ryb2tlV2VpZ2h0JyA6IDMsXG4gICAgICAgICdmaWxsQ29sb3InICAgIDogJ1JHQigyNTUsMjU1LDEwMCknLFxuICAgICAgICAnZmlsbE9wYWNpdHknICA6IDAsIFxuICAgICAgICAnbWFwJyAgICAgICAgICA6IG51bGwsXG4gICAgICAgICdjZW50ZXInICAgICAgIDogY2VudGVyLFxuICAgICAgICAncmFkaXVzJyAgICAgICA6IGhhbG9SYWQsXG4gICAgICB9KTtcbiAgICAgIC8vIEEgdGltZW91dCB3aWxsIGJlIHVzZWQgdG8gYW5pbWF0ZSB0aGUgaGFsbyBleHBhbmRpbmcgYW5kIGNvbnRyYWN0aW5nLiBcbiAgICAgIHZhciBoYWxvVGltZXI7XG4gICAgICAvLyBBICdtb3VzZW92ZXInIGV2ZW50IG9mIHRoZSBocmVmIGluIHRoZSBjcmF3bCB0cmlnZ2VycyBoYWxvIGFuaW1hdGlvbiBhcm91bmQgaXRzIGNpcmNsZS5cbiAgICAgIGEuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VvdmVyJywgZnVuY3Rpb24oKXtcbiAgICAgICAgLy8gTGlnaHQgdXAgXCJ0d2VldER1bXBcIiwgaW4gYWRkaXRpb24gdG8gdGhlIGhhbG8sIGluIGNhc2UgdGhlIGhhbG8gaXMgYnVyaWVkIHVuZGVyIGEgYmlnIHN0YWNrIG9mIGR1bXBlZCB0d2VldHMuXG4gICAgICAgIGlmIChzb3VyY2UgPT0gJ2RlZmF1bHQnKXtcbiAgICAgICAgICB0d2VldER1bXAuc2V0T3B0aW9ucyh7J3N0cm9rZUNvbG9yJzogJ1JHQigyNTUsMjU1LDEwMCknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc3Ryb2tlT3BhY2l0eSc6IC40IH0pOyAgICAgIFxuICAgICAgICB9XG4gICAgICAgIC8vIE1ha2UgdGhlIGhhbG8gdmlzaWJsZS4gIFxuICAgICAgICBocmVmSGFsby5zZXRNYXAobWFwKTsgXG4gICAgICAgIC8vIFByZS1hbGxvY2F0ZSBcImlcIiwgYXMgdGhlcmUgd2lsbCBiZSBtYW55IGl0ZXJhdGlvbnMuXG4gICAgICAgIHZhciBpID0gMTtcbiAgICAgICAgLy8gUmVhZCBhcyBcInRoZSBhbW91bnQgYnkgd2hpY2ggdG8gY2hhbmdlIGhhbG8uXCJcbiAgICAgICAgdmFyIGhhbG9DaGFuZ2UgPSAuMTc7IFxuICAgICAgICAvLyBSZWFkIGFzIFwiaGFsb0luY3JlYXNlXCIuICAgIFxuICAgICAgICB2YXIgaGFsb0luY3IgPSB0cnVlO1xuICAgICAgICAvLyBUaGUgbG9vcCBhY3Rpb24gd2lsbCBleHBhbmQgYW5kIGNvbnRyYWN0IHRoZSBoYWxvJ3MgcmFkaXVzLCB3aXRoIHRoZSB0aW1lciBpbnRlcnZhbCBnaXZpbmcgaXQgYW5pbWF0aW9uLiBcbiAgICAgICAgZm9yICg7IGkgPD0gMTEwOyBpKyspe1xuICAgICAgICAgIChmdW5jdGlvbiBhbmltYXRlSGFsbyhpKXtcbiAgICAgICAgICAgIGhhbG9UaW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgLy8gXCJoYWxvSW5jclwiIHRlbGxzIFwiaGFsb0NoYW5nZVwiIHRvIGVpdGhlciBpbmNyZW1lbnQgb3IgZGVjcmVtZW50LiBcbiAgICAgICAgICAgICAgaGFsb0luY3IgPyBoYWxvQ2hhbmdlICs9IC4xNyA6IGhhbG9DaGFuZ2UgLT0gLjE3O1xuICAgICAgICAgICAgICAvLyAuMTcgYW5kIDUgZm9ybSBsb3dlciBhbmQgdXBwZXIgYm91bmRzIGZvciBcImhhbG9DaGFuZ2VcIi4gV2hlbiBhIGJvdW5kIGlzIHJlYWNoZWQsIGZsaXAgXCJoYWxvSW5jclwiLCBzbyB0aGF0XG4gICAgICAgICAgICAgIC8vIFwiaGFsb0NoYW5nZVwiIHdpbGwgbm93IG1vdmUgdG93YXJkcyB0aGUgb3Bwb3NpdGUgYm91bmQgaW4gdGhlIG5leHQgbG9vcCBpdGVyYXRpb24uXG4gICAgICAgICAgICAgIGlmIChoYWxvQ2hhbmdlID49IDUpe1xuICAgICAgICAgICAgICAgIGhhbG9JbmNyID0gZmFsc2U7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGhhbG9DaGFuZ2UgPD0gLjE3KXtcbiAgICAgICAgICAgICAgICBoYWxvSW5jciA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gVXNlIFwiaGFsb0NoYW5nZVwiIGFzIGEgbXVsdGlwbGllciBvbiBcImhhbG9SYWRcIi4gQXMgXCJoYWxvQ2hhbmdlXCIgZ3Jvd3MgYW5kIHNocmlua3MsIHRoZSBhbmltYXRpb24gb2Ygem9vbWluZyBpbiwgXG4gICAgICAgICAgICAgIC8vIHpvb21pbmcgb3V0LCBpcyBhY2hpZXZlZC5cbiAgICAgICAgICAgICAgaHJlZkhhbG8uc2V0UmFkaXVzKGhhbG9SYWQgKiAoMSArIGhhbG9DaGFuZ2UpKTtcbiAgICAgICAgICAgIH0sIGkgKiAzMCkgLy8gVXNlIGEgc21hbGwgaW5jcmVtZW50IHdpdGggdGhlIGhpZ2ggXCJpXCIgdmFsdWUgdG8gbWFrZSB0aGUgYW5pbWF0aW9uIHNtb290aC4gXG4gICAgICAgICAgfSkoaSkgLy8gVGhlIGNsb3N1cmUgaXMgbmVlZGVkIHRvIHVzZSB0aGUgaW50ZW5kZWQgXCJpXCIgZm9yIHRoZSBhc3luY2hyb25vdXMgXCJzZXRUaW1lclwiIGNhbGxiYWNrLlxuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gSGlkZSB0aGUgcmluZyBvbiBhICdtb3VzZW91dCcgZnJvbSB0aGUgaHJlZiBsaW5rLiBcbiAgICAgIGEuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VvdXQnLCBmdW5jdGlvbigpe1xuICAgICAgICBjbGVhclRpbWVvdXQoaGFsb1RpbWVyKTtcbiAgICAgICAgaHJlZkhhbG8uc2V0TWFwKG51bGwpO1xuICAgICAgICBpZiAoc291cmNlID09ICdkZWZhdWx0Jyl7XG4gICAgICAgICAgLy8gVGhlc2UgYXJlIHRoZSBvcmlnaW5hbCB2YWx1ZXMgZm9yIFwidHdlZXREdW1wXCIgZnJvbSBcIm1hcEluaXRcIiBpbiBcImluaXQuanNcIi5cbiAgICAgICAgICB0d2VldER1bXAuc2V0T3B0aW9ucyh7J3N0cm9rZUNvbG9yJzogJ1JHQig4NSw4NSw4NSknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc3Ryb2tlT3BhY2l0eSc6IC4yNX0pOyAgIFxuICAgICAgICB9ICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgfSk7ICAgIFxuICAgIH0gXG4gIH07XG59Il19