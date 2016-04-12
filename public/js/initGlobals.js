// This sets all the global variables that will be used in subsequent functions. 


// Because so many tweets don't have a location, I use a default latLng position on the map to anchor 
// the non-locatable tweets. This is outlined with a gray box, just south of Hawaii, defined as 
// "tweetDump" in "initMap" in "init.js" 
const DefaultCenter = {'lat': -3.8963, 'lng': -146.4255};

// Make a week that will not be subject to cross-browser variances. 
const Week = function (){
  var pointA = new Date('3/3/2016');
  var pointB = new Date('3/10/2016'); 
  return pointB - pointA;
}();
  
// Several DOM displays are easiest set with an onLoad function. Those are done here. 
(function onLoadDisplays(){
  
  var mapHeight = window.innerHeight - 55;
  document.getElementById('mainViewSection').style.height = mapHeight;
  document.getElementById('map').style.height = mapHeight;
  document.getElementById('text').style.height = mapHeight;


  // Since Twitter will only search back a week or so, set the placeholders of the input 
  // boxes to 6 (ish) days ago. 
  var end = new Date();
  var start = new Date(end - Week + 86400 * 1000); // That math at the end equals one day, in ms.
  setDisplay('enddate', end);
  setDisplay('startdate', start);
  
  // Show placeholder dates in 'month/day/year' format in a given input box.
  function setDisplay(html, date){
  	date = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
  	document.getElementById(html).value = date;
  }

  // In order to toggle DOM values in "buttonHandler", the following properties all need to be strings. Setting 
  // them in the css file gives them a Style Object class, confusing the toggle action.
  document.getElementById('bannerContentDiv').style.height = "60px";
  document.getElementById('contentBtns').style.bottom = "5px";
  // All these follow the pattern used in "buttonDisp": set the "firstChild.data" of the key to its value. 
  var buttons = {'pauseBtn': 'Pause',
                 'togCircVisBtn': 'Hide Circles',
                 'togTextVisBtn': 'Hide Text Crawl',
                 'instrBtn': 'See Map Tips',
                 'aboutBtn': 'What Does This App Do?',
               };
  buttonDisp(buttons);               
                 
  // Set a given string to appear on a given button; ensures it is ok for the toggling in "buttonHandler". 
  function buttonDisp(htmls){
    var key;
    for (key in htmls){
      document.getElementById(key).firstChild.data = htmls[key];
    }
  }
})()

// This gives a y-coordinate which allows "scrollTo" calls to jump the user to the form. 
const yOffsetForm = document.getElementById('bannerContentDiv').getBoundingClientRect().height + 
              document.getElementById('map').getBoundingClientRect().height;

// These functions need to be global, to be set asynchronously/dynamically in "createCircle" and "geoCodeTweet".
var bingCallback = function(){};
var panToCircle = function(){};

// Making this global allows for aborting it outside of the function in which it is used to send its first query.
// See "pauseStream" for where this is aborted, "formSubmit" for where it sends a query to the server. 
var xhr = new XMLHttpRequest();

// Used to show the current text color and average text color in the boxes below the map.
var globalMood = {"mood" : [0,0,0], "count" : 1 };

// the googleGeocoder, set in "initMap", used in "geoCodeTweet".
var geoCoder;

// Determines which geocoder to use in "geoCodeTweet", out of a group of 4.
var turnstileCount = 0;

// The Google Map
var map;  

// Error messages to be set in "formvalidate", used in "buttonhandler"
var startErrMsg;
var endErrMsg;

// Two toggle buttons act on the same DOM element in "buttonHandler". This array stores the 
// sources of the toggle, to make sure one toggler doesn't untoggle the other one's states.
var togSources = [];

// "tweetDump" is a rectangle on the map, south of Hawaii, that will mark a location for 
// tweets that do not have location ("tweet.location" = null). Made global so that it 
// can later be used in "drawTweetCircle".  
var tweetDump;
