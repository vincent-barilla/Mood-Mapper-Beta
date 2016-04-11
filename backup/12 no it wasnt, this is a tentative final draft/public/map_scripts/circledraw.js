// Creates a circle on the map using the tweet's mood (RGB values) as its
// color, the tweet's location as its coordinates, and the tweet user's
// number of followers to set its radius (more followers = a bigger radius,
// or "reach".)
function createTweetCircle(tweet, center, source){
  var radius = setRadius();
  var color = 'RGB(' + tweet.stats.mood.toString() + ')';                    
  var tweetCircle = setTweetCircle();
  tweetCircle.initListeners();

  // The id will help Twitter recognize the oldest or most recent tweet
  // displayed on the front end. Note the "._" prefix to the function 
  // call. I use this convention for all functions I manually added
  // to prototypes.  
  tweetCircle._setId(tweet.id);

  // Storing the circles in the map allows for their visiblity to be toggled, 
  // and have their id's retrieved when needed. 
  tweetCircle._storeInMap(map);

  // This creates a clickable href in a crawl to the right of the map. Clicking
  // on it causes the map to pan to this circle's center and resets the map zoom
  // to focus on this circle.
  linkToCircle();

  // Google Map Circle radii are measured in meters, so tweets with a small number
  // of followers needs to be multiplied considerably to be visible on the map. 
  // But, multiplying all circles by the same constant makes larger tweets way too big. 
  // I thus use a function which will expand samller circles more, with a cutoff point 
  // of 50k followers. (This is unsmiplified to be easier to edit, and is highly 
  // subject to change, as I play around with what sizes give the right aesthetic.)
  function setRadius(){
    var rad = tweet.stats.reach;
    if (rad){
      rad > 50000 ? rad *= 20 : rad = ((500000 - 10 * rad) * .000095 * rad) ;
    } else {
      // 40 meters is the default, for a user with no followers. 
      rad = 40;
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
    // information about the tweet that originated it. 
    circle.infoWindow = initInfoWindow(); 

    // Set the Info Window with xml from the tweet's stats/info.
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

      // If there are words inside either posWords or negWords, both of which are an array of JSON objects 
      // with the format {'word': 'love', 'score': 4}, make a row for the "content" table out of an xml 
      // string. It'll be formatted as such: "love(4), win(3)"
      function wordsToRow(words){
        if (words.length > 0){
          var str = '';
          // "str" will become a comma-separated string of all words that were scored in "tweet".
          words.forEach(function(word, i){
            if (word.score > 0){
              word.score = '+' + word.score;
            }
            i < words.length - 1 ? str += (word.word + ' (' + word.score +'), ') : str += (word.word + ' (' + word.score +')');
          })
          return '<tr><td>Scoring Words:</td><td>' + str + '</td></tr>';          
        } else {
          // If there aren't any words in this array, return an empty string. No row will show in "content"
          // for this type.
          return '';
        }
      };
    }

    // The circle has its own listeners, detecting events such as "drag", "mouseover", etc.
    circle.initListeners = function(){
      var holdWindow = false;
      var timer = null;

      // Sets a listener that triggers whenever the cursor passes over this circle.
      this.addListener('mouseover', function(){
        // Without this condition, the info Window stays open, after clicked the first time, until
        // you click it again. With this condition, the info window closes after the next time the mouseover
        // occurs (leads to much cleaner viewing.)
        if (holdWindow){
          holdWindow = false
        };

        // Before opening the window, it must be anchored to the circle. 
        anchorInfoWindow(this);     

        // When the cursor passes over this circle, make a small increase in its radius, to clarify which 
        // circle is currently under the cursor.       
        explodeView();

        // Open up the map, now that all the above properties have been set.                 
        this.infoWindow.open(map);

        // The helper function which gives the temporary boost to radius. 
        function explodeView(){
          circle.setRadius(radius * 1.15);
        }  
      });

      // Set the timer to clear, reset the radius (undoes "explodeView"), and close the info window if 
      // "holdWindow" is not true on a 'mouseout' event ('mouseout' meaning, "when the cursor is
      // no longer over the circle.")
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
  // coded to its mood (same color as the circle). Clicking it pans the map to center over this circle. 
  function linkToCircle(){
    var a = document.createElement('a');
    a.innerHTML = tweet.text + "<br><br>";
    // Setting display to 'block' helps to stabilize the animation. Without it, the only clickable part
    // of "a" is the href text. That means that the cursor triggers a 'mouseout' and then another 
    // 'mouseon' event every time it goes between characters. This happens often, causing a bunch of animations
    // to start before the previous one has finished. 'block' display makes the entire rectangle which the
    // href text occupies clickable -- greatly reducing unwanted 'mouseout's. 
    a.style.display = 'block';
    a.style.color = color;
    a.style['text-decoration'] = 'none';
    a.style['text-shadow'] = '1px 1px 1px rgb(220,220,220)';

    // zoomLevel is either 6 (more zoom) for tweets that have their own locations, or 5 (less zoom) for
    // the tweets that use default coordinates (are in the tweet dump). Calling this function, as executed
    //  by clicking the href, will pan the map over to the circle's center .
    panToCircle = function(latLng){
      var lat = Number(latLng[0]);
      var lng = Number(latLng[1]);
      var zoomLevel = source == 'default' ? 5 : 6;     
      var cen = {'lat': lat, 'lng': lng};
      map.setZoom(zoomLevel); 
      // Scroll the window back to the map, as the user may have been clicking a button lower in the page, 
      // and may miss the updates to the text crawl and map.
      window.scrollTo(0, document.getElementById('bannerDiv').getBoundingClientRect().height);      
      map.panTo(cen);
    }

    // I had originally tried putting the circle in the href directly, but it kept using the coordinates
    // of the last circle that was drawn on the map, not 'this' circle. To fix that, I concatenated a string 
    // containing 'this' circle's coordinates into the href. This holds the values fixed in the href string 
    // in the DOM (then seems like it's doing something like an eval on that string, when clicked). 
    var centerString = center.lat.toString() + ',' + center.lng.toString();
    a.href = 'javascript:panToCircle([' + centerString + ']);'
  
    // Creates a gold ring to go around 'this' circle when the cursor hovers over 'a.href'.
    highlightHalo();

    document.getElementById('text').appendChild(a);


    // When the user hovers the cursor over the href link created below, this circle will highlight around
    // the circle connected to that href. It helps clarify which circle belongs to which href link, in the 
    // tweet crawl.   
    function highlightHalo(){  

      var haloRad = radius * 1.3;

      // Set up a new Circle object to be the highlight halo around 'this' circle.
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

      // Help the user see what circle corresponds to the href by drawing a yellow ring around it. The ring will 
      // disappear when the cursor leaves the href. Notice the bounds of "haloChange": it starts at .17 and increases till
      // it hits 5. "haloIncr" then flips from true to false, which means that "haloChange" will decrement till it
      // hits .17. Then, "haloIncr" flips back -- and so on, so that the ring zooms in and out, before staying still 
      // around the "this" circle. 
      a.addEventListener('mouseover', function(){
        if (source == 'default'){
          tweetDump.setOptions({'strokeColor': 'RGB(255,255,100)',
                                'strokeOpacity': .4 });      
        }  
        hrefHalo.setMap(map); 
        var i = 1;
        var haloChange = .17;     
        var haloIncr = true;
        for (; i <= 110; i++){
          (function animateHalo(i){
            // As "i" increments, so does "haloChange", with either positive or negative growth, according to the boolean 
            // "haloIncr" -- when "haloIncr" is true, increase "haloChange", when false, decrease "haloChange".
            haloTimer = setTimeout(function(){
              haloIncr ? haloChange += .17 : haloChange -= .17;
              if (haloChange >= 5){
                haloIncr = false;
              }
              if (haloChange <= .17){
                haloIncr = true;
              }
              // Setting the radius to a variable which is alternately increasing then decreasing causes the zoom-in, 
              // zoom-out animation. 
              hrefHalo.setRadius(haloRad * (1 + haloChange));
            }, i * 30)
          })(i)
        }
      });

      // Hide the ring on a 'mouseout' from the href link. 
      a.addEventListener('mouseout', function(){
        clearTimeout(haloTimer);
        hrefHalo.setMap(null);
        // These are the original values from "mapInit".
        tweetDump.setOptions({'strokeColor': 'RGB(85,85,85)',
                              'strokeOpacity': .25});      
      });    
    } 
  };
}