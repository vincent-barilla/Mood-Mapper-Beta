// Creates a circle on the map using the tweet's mood (RGB values) as its
// color, the tweet's location as its coordinates, and the tweet user's
// number of followers to set its radius (more followers = a bigger radius,
// or "reach".)
function createTweetCircle(tweet, center, source){
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
  function setRadius(){
    var rad = tweet.stats.reach;
    if (rad){
      // In short -- it's half of an upside-down parabola (fast growth for small numbers, slow growth
      // towards the middle), with the middle set at 25k followers. The constants are set to further increase 
      // the growth of smaller circles, relative to that of larger circles.
      rad > 25000 ? rad *= 25 : rad = ((50 - .001 * rad) * rad);
    } else {
      // 50 meters is the default, for a user with no followers. 
      rad = 50;
    }
    return rad;
  }

  // Set the starting properties of this circle. 
  function setTweetCircle(){
    var circle = new google.maps.Circle({
      'strokeColor'  : color,
      'strokeOpacity': .8,
      'strokeWeight' : 2,
      'fillColor'    : color,
      'fillOpacity'  : .35, 
      'map'          : map,
      'center'       : center,
      'radius'       : radius,
      'draggable'    : true,
      'clickable'    : true,
      'geodesic'     : false,
    });
    // Each circle has its own Info Window object following it around, displaying
    // information about its tweet.
    circle.infoWindow = initInfoWindow(); 

    // Set the Info Window with html from the tweet's stats/info.
    function initInfoWindow(){
      var content = 
      '<div id="info">' +
          '<div class="infoTitle">@' + tweet.user.name + '</div>' +
          '<div class>' +
            '<p class="tweText" style="color:' + color + '">' + tweet.text + '</p>' +
            '<table class="tweData"><tr><td> Location:</td><td>' + tweet.location + '</td></tr>' +
                     '<tr><td> Time:</td><td>' + tweet.stats.time + '</td></tr>' +
                     wordsToRow(tweet.stats.posWords.concat(tweet.stats.negWords)) + 
                     '<tr><td> Followers:</td><td>' + tweet.stats.reach + '</td></tr>' +
            '</table>' +
          '</div>' +
      '</div>';

      return  new google.maps.InfoWindow({
        'content'        : content,
        'maxWidth'       : 350,
        'disableAutoPan' : true,
      });

      // If there are words inside either posWords or negWords, make a row for the "content" table out of an html
      // string. It'll be formatted as such: "love(4), win(3), hate(-4)". 
      function wordsToRow(words){
        // Notice the use of "concat" in the definition of "content". "words" has both "posWords" and "negWords".
        if (words.length > 0){
          var str = '';
          // "str" will become a comma-separated string of all words that were scored in "tweet".
          words.forEach(function(word, i){
            if (word.score > 0){
              // Put a plus sign in front of everything from "posWords" (scores > 0).
              word.score = '+' + word.score;
            }
            // Concatenate "word(+/-score)," until the last element, then, drop the comma, concatenate "(word(+/-score)" only).
            i < words.length - 1 ? str += (word.word + ' (' + word.score +'), ') : str += (word.word + ' (' + word.score +')');
          })
          // Scoring words from both "posWords" and "negWords" appear in the same html string. 
          return '<tr><td>Scoring Words:</td><td>' + str + '</td></tr>';          
        } else {
          // If there aren't any words in this array, return an empty string. No row will show in "content" for this tweet.
          return '';
        }
      };
    }
    // The circle has its own listeners, detecting events such as "drag", "mouseover", etc.
    circle.initListeners = function(){
      // "holdWindow" will tell listeners whether or not to close an info window immediately on a 'mouseout'. 
      var holdWindow = false;
      var timer = null;

      // Sets a listener that triggers whenever the cursor passes over this circle.
      this.addListener('mouseover', function(){
        // With this condition, the info window closes after the next time the mouseover
        // occurs, after it has been clicked to hold it open.
        if (holdWindow){
          holdWindow = false
        };
        // Before opening the window, it must be anchored to the circle. 
        anchorInfoWindow(this);     
        // When the cursor passes over this circle, make a small increase in its radius to clarify which 
        // circle is currently under the cursor.       
        explodeView();
        // Open up the map, now that all the above properties have been set.                 
        this.infoWindow.open(map);
        // The helper function which gives the temporary boost to radius. 
        function explodeView(){
          circle.setRadius(radius * 1.15);
        }  
      });

      // Clear the timer, reset the radius (undoes "explodeView"), and close the info window if 
      // "holdWindow" is not true on a 'mouseout' event.
      this.addListener('mouseout', function(){
        clearTimer();
        this.setRadius(radius);        
        if (!holdWindow){
          this.infoWindow.close(map);
        }
      });

      // The timer is cleared when dragging starts, and the window is invisible during the drag. 
      this.addListener('drag', function(){
        this.infoWindow.setMap(null);
        clearTimer();
      });

      // Re-anchor the window to this circle's current location, clear the timer, show the info
      // window when dragging stops. 
      this.addListener('dragend', function(){
        anchorInfoWindow(this);
        clearTimer();           
        this.infoWindow.setMap(map);
      });

      // When a circle is clicked, it will tell the info window to stay open after the first 
      // mouseout event occurs. After the next mouseout event, this is undone, and the window
      // will close, unless the circle is clicked again. 
      this.addListener('click', function(){
        !holdWindow ? holdWindow = true : holdWindow = false;
      });              

      // On a double click, the circle is invisible. It can be visible again by clicking the
      // "Show Circles" button below the map. 
      this.addListener('dblclick', function(){
        clearTimer();
        this.infoWindow.setMap(null);
        this.setMap(null);
      });

      // Sets the info window's display center to be just northeast of the circle's outer edge. 
      // (The position is subject to change, just picked a placement I liked.)
      function anchorInfoWindow(circle){
        var cen = circle.getCenter();
        var span = circle.getBounds().toSpan();
        // Dealing with latLng math is made difficult due to conversion factors of lat/long values 
        // into meters. Spherical math is needed, which takes up a bunch of space. "getBounds" keeps the units 
        // in coordinates, alleviates that issue.
        var latLng = {'lat': cen.lat() + (span.lat() / 2.3), 'lng': cen.lng() + (span.lng() / 2.3) };
        circle.infoWindow.setPosition(latLng);                    
      }  

      // A helper function to make sure the timer is clearing (setting it to null is a fail-safe). 
      // When the timer wasn't working as expected, info windows were staying open all over the 
      // place, so I felt the fail-safe was worthwhile. 
      function clearTimer(){
        clearInterval(timer);
        timer = null;
      }          
    }
    return circle; 
  }

  // Appends an href to the crawl to the right of the map. The href has the tweet's text and is color-
  // coded to its mood (same color as the circle). Clicking it pans the map to center over its circle. 
  function linkToCircle(){
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
    a.href = 'javascript:panToCircle([' + centerString + ']);' 
    // Creates a gold ring to go around 'this' circle when the cursor hovers over "a.href'\".
    highlightHalo();
    // Append "a" to the crawl.
    document.getElementById('text').appendChild(a);
    // The href's function; pans the map to "this" circle's center.
    panToCircle = function(latLng){
      // Though "centerString" was a string above, it evaluates as an array, here.
      var lat = Number(latLng[0]);
      var lng = Number(latLng[1]);
      // "zoomLevel" is either 6 (more zoom) for tweets that have locations, or 5 (less zoom) for the tweets in 
      // "tweetDump". (Auto-zooming too close within "tweetDump" is disorienting, I found.)
      var zoomLevel = (lat == DefaultCenter.lat && lng == DefaultCenter.lng) ? 5 : 6;     
      // Take the center from the local argument, not "center" from the outer scope. "center" from the outer scope
      // is overwritten by the time this will fire, panning the map to the most recently drawn circle.
      var cen = {'lat': lat, 'lng': lng};
      map.setZoom(zoomLevel); 
      map.setCenter(cen);
      // Scroll the window back to the map.
      window.scrollTo(0, document.getElementById('bannerContentDiv').getBoundingClientRect().height + 15);      
      map.panTo(cen);
    }

    // Sets a ring to zoom in and out around a circle, helps clarify which circle belongs to which tweet, from the crawl.   
    function highlightHalo(){  
      var haloRad = radius * 1.3;
      // An empty golden ring -- a halo.
      var hrefHalo = new google.maps.Circle({
        'strokeColor'  : 'RGB(255,255,100)',
        'strokeOpacity': 1,
        'strokeWeight' : 3,
        'fillColor'    : 'RGB(255,255,100)',
        'fillOpacity'  : 0, 
        'map'          : null,
        'center'       : center,
        'radius'       : haloRad,
      });
      // A timeout will be used to animate the halo expanding and contracting. 
      var haloTimer;
      // A 'mouseover' event of the href in the crawl triggers halo animation around its circle.
      a.addEventListener('mouseover', function(){
        // Light up "tweetDump", in addition to the halo, in case the halo is buried under a big stack of dumped tweets.
        if (source == 'default'){
          tweetDump.setOptions({'strokeColor': 'RGB(255,255,100)',
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
        for (; i <= 110; i++){
          (function animateHalo(i){
            haloTimer = setTimeout(function(){
              // "haloIncr" tells "haloChange" to either increment or decrement. 
              haloIncr ? haloChange += .17 : haloChange -= .17;
              // .17 and 5 form lower and upper bounds for "haloChange". When a bound is reached, flip "haloIncr", so that
              // "haloChange" will now move towards the opposite bound in the next loop iteration.
              if (haloChange >= 5){
                haloIncr = false;
              }
              if (haloChange <= .17){
                haloIncr = true;
              }
              // Use "haloChange" as a multiplier on "haloRad". As "haloChange" grows and shrinks, the animation of zooming in, 
              // zooming out, is achieved.
              hrefHalo.setRadius(haloRad * (1 + haloChange));
            }, i * 30) // Use a small increment with the high "i" value to make the animation smooth. 
          })(i) // The closure is needed to use the intended "i" for the asynchronous "setTimer" callback.
        }
      });

      // Hide the ring on a 'mouseout' from the href link. 
      a.addEventListener('mouseout', function(){
        clearTimeout(haloTimer);
        hrefHalo.setMap(null);
        if (source == 'default'){
          // These are the original values for "tweetDump" from "mapInit" in "init.js".
          tweetDump.setOptions({'strokeColor': 'RGB(85,85,85)',
                                'strokeOpacity': .25});   
        }                         
      });    
    } 
  };
}