// This sets all the global variables that will be used in subsequent functions. 

// Because so many tweets don't have a location, I use a default latLng position on the map for 
// the non-locatable tweets. This is outlined with a gray box, just south of Hawaii, defined as 
// "tweetDump" in "initMap" in "init.js" 
const DefaultCenter = {'lat': -3.8963, 'lng': -146.4255};

// Make a week that will be accurate across all browsers. 
const Week = function (){
  var pointA = new Date('3/3/2016');
  var pointB = new Date('3/10/2016'); 
  return pointB - pointA;
}();

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

// The Google Map.
var map;  

// Error messages to be set in "formvalidate", used in "buttonhandler".
var startErrMsg;
var endErrMsg;
var subjectErrMsg;

// Two toggle buttons act on the same DOM element in "buttonHandler". This array stores the 
// sources of the toggle, to make sure one toggler doesn't untoggle the other's states.
var togSources = [];

// "tweetDump" is a rectangle on the map, south of Hawaii, that will mark a location for 
// tweets that do not have location ("tweet.location" = null). Made global so that it 
// can later be used in "drawTweetCircle".  
var tweetDump;
