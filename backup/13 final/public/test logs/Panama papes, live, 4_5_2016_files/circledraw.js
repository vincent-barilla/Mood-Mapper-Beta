function createTweetCircle(tweet, center, source){
  var radius = setRadius();
  var color = 'RGB(' + tweet.stats.mood.toString() + ')';                    
  var tweetCircle = initTweetCircle();
  tweetCircle.initListeners();
  tweetCircle._setId(tweet.id);
  //console.log(tweetCircle._getId());
  tweetCircle._storeInMap(map);
  linkToCircle();

  function setRadius(){
    var rad = tweet.stats.reach;
    if (rad){
      rad > 50000 ? rad *= 20 : rad = ((500000 - 10 * rad) * .000095 * rad);
    } else {
      rad = 4000;
    }
    return rad;
  }

  function initTweetCircle(){
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

    circle.infoWindow = initInfoWindow(); 

    function initInfoWindow(){           
      var content2 = 
      '<div id="info">' +
          '<div class="info-title">' + tweet.user.name + '</div>' +
          '<div class="info-content">' +
            '<p>' + tweet.text + '</p>' + 
            '<p>Location: ' + tweet.location + 
            '<br>Created At: ' + tweet.time +             
            '<br>Inferred Mood: ' + tweet.stats.mood + 
            '<br>Negative Words: ' + tweet.stats.posWords.join(', ') + 
            '<br>Positive Words: ' + tweet.stats.negWords.join(', ') +                         
            '<br>Reach: ' + tweet.stats.reach + '</p>'+
          '</div>' +
      '</div>';

      return  new google.maps.InfoWindow({
        'content'        : content2,
        'maxWidth'       : 350,
        'disableAutoPan' : true,
      });
    }

    circle.initListeners = function(){
      var holdWindow = false;
      var timer = null;

      this.addListener('mouseover', function(){
        if (holdWindow){
          holdWindow = false
        };
        anchorInfoWindow(this);           
        explodeView();                
        this.infoWindow.open(map);/*
        timer = setInterval(function(){
            map.panTo(this.getCenter());
          }.bind(circle), 2750); */

        function explodeView(){
          circle.setRadius(radius * 1.15);
        }  
      });

      this.addListener('mouseout', function(){
        clearTimer();
        this.setRadius(radius);        
        if (!holdWindow){
          this.infoWindow.close(map);
        }
      });

      this.addListener('drag', function(){
        this.infoWindow.setMap(null);
        clearTimer();
      });

      this.addListener('dragend', function(){
        this.setRadius(radius);                
        anchorInfoWindow(this);
        clearTimer();           
        this.infoWindow.setMap(map);
      });

      this.addListener('click', function(){
        !holdWindow ? holdWindow = true : holdWindow = false;
      });              

      this.addListener('dblclick', function(){
        clearTimer();
        this.infoWindow.setMap(null);
        this.setMap(null);
      });

      function anchorInfoWindow(circle){
        var cen = circle.getCenter();
        var span = circle.getBounds().toSpan();
        var latLng = {'lat': cen.lat() + (span.lat() / 2.3), 'lng': cen.lng() + (span.lng() / 2.3) };
        circle.infoWindow.setPosition(latLng);                    
      }  

      function clearTimer(){
        clearInterval(timer);
        timer = null;
      }          
    }
    return circle; 
  }

  function linkToCircle(){
    var a = document.createElement('a');
    a.innerHTML = tweet.text + "<br><br>";
    a.style.color = color;
    a.style['text-decoration'] = 'none';
    a.style['text-shadow'] = '1px 1px 1px rgb(220,220,220)';

    panToCircle = function(latLng){
      var lat = Number(latLng[0]);
      var lng = Number(latLng[1]);
      var zoomLevel = (lat.toFixed(0) == DefaultCenter.lat.toFixed(0) && lng.toFixed(0) == DefaultCenter.lng.toFixed(0)) 
                    ? 5 : 6;     
      var cen = {'lat': lat, 'lng': lng};
      map.setZoom(zoomLevel);              
      map.panTo(cen);
    }

    var centerString = center.lat.toString() + ',' + center.lng.toString();
    a.href = 'javascript:panToCircle([' + centerString + ']);'
    document.getElementById('text-div').appendChild(a);
  }          
}