function drawCircle(tweet, center, source){
  var radius      = setRadius();
  var tweetCircle = initTweetCircle(); 
  var radBoost;
  tweetCircle.initListeners();
  tweetCircle._storeInMap(map); //NOT native to this code; depends on init.js preceding. 

  function setRadius(){
    var rad = tweet.stats.reach;
    if (rad){
      rad > 500 ? (radBoost = 1.1, rad *= 500) : ((radBoost = (500 / rad) + .1), rad = ((1000 - rad) * rad));
    } else {
      rad = 1000;
    }
    return rad;
  }

  function initTweetCircle(){
      
    var circle = new google.maps.Circle({
      'strokeColor'  : 'RGB(' + tweet.stats.mood.toString() + ')',
      'strokeOpacity': .8,
      'strokeWeight' : 2,
      'fillColor'    : 'RGB(' + tweet.stats.mood.toString() + ')',
      'fillOpacity'  : .35, 
      'map'          : map,
      'center'       : center,
      'radius'       : radius,
      'draggable'    : true,
      'clickable'    : true,
      'geodesic'     : false,
    });

    circle.infoWindow = initInfoWindow(); 
    circle.timer;

    function initInfoWindow(){
      var content = ("<p>"
                    + "User:<br/> "     + tweet.user.name   + "<br/>" 
                    + "Text:<br/> "     + tweet.text        + "<br/>" 
                    + "Location:<br/> " + tweet.location    + "<br/>" 
                    + "Mood:<br/> "     + tweet.stats.mood  + "<br/>" 
                    + "Reach:<br/> "    + tweet.stats.reach + "<br/>" 
                    + "Reach:<br/> "    + tweet.stats.reach + "<br/>"
                    + "Provider:<br/> " + source            + "<br/>"
                    + "</p>");
      return new google.maps.InfoWindow({
        'content'        : content,
        'maxWidth'       : 325,
        'disableAutoPan' : true,
      });
    }

    circle.initListeners = function(){

      this.addListener('mouseover', function(){
        explodeView();
        this.infoWindow.setPosition(this.getBounds().getNorthEast());
        this.infoWindow.open(map);/*
        this.timer = setInterval(function(){
            map.panTo(this.getCenter());
          }.bind(circle), 2500);*/

        function explodeView(){
          circle.setRadius(radius * radBoost);
        }  
      });

      this.addListener('mouseout', function(){
        this.setRadius(radius);
        this.infoWindow.close(map);
        clearTimeout(this.timer);
      });

      this.addListener('drag', function(){
        this.infoWindow.setMap(null);
      });

      this.addListener('dragend', function(){
        this.setMap(map);
        this.infoWindow.setPosition(this.getBounds().getNorthEast());
        this.infoWindow.setMap(map);
      });

      this.addListener('dblclick', function(){
        this.infoWindow.setMap(null);
        this.setMap(null);
      });            
    }
    return circle; 
  }
} 