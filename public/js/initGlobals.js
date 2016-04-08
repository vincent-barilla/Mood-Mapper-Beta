// Because so many tweets don't have a location, but I still want them visible to the user, 
// I use a default latLng position on the map to anchor the non-locatable tweets. This is
// outlined with a gray box, just south of Hawaii. 
const DefaultCenter = {'lat': -3.8963, 'lng': -146.4255};

// Apparently cross-browser standardization of date construction is not so consistent, so I use
// this as a golden standard: 
const Week = function (){
  var pointA = new Date('3/3/2016');
  var pointB = new Date('3/10/2016'); 
  return pointB - pointA;
}();

(function onLoadDisplays(){
  // Since Twitter will only search back a week or so, set the default values of the input 
  // boxes to 6 (ish) days ago. 
  var end = new Date();
  var start = new Date(end - Week + 86400 * 1000); // That math at the end equals one day, in ms.
  setDisplay('enddate', end);
  setDisplay('startdate', start);
  
  // Shows "date" in month/day/year format in a given date input box.
  function setDisplay(html, date){
  	date = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
  	document.getElementById(html).value = date;
  }

  // All the buttons to initialize, and the value to set as their view text (firstChild.data).
  var buttons = {'newSearchBtn': 'New Search', 
                 'pauseBtn': 'Pause',
                 'togCircVisBtn': 'Hide Circles',
                 'togTextVisBtn': 'Hide Text Crawl',
                 'instrButton': 'Map How-To'}
  buttonDisp(buttons);               
                 
  // Set a given string to appear on a given button. 
  function buttonDisp(htmls){
    var key;
    for (key in htmls){
      document.getElementById(key).firstChild.data = htmls[key];
    }
  }
})()

// These functions need to be global, to be set asynchronously/dynamically
// in "createCircle" and "geoCodeTweet".
var bingCallback = function(){};
var panToCircle = function(){};

// Making this global allows for aborting it, outside of the function in which it is 
// used to send its query. This will send the main requests to the server. 
var xhr = new XMLHttpRequest();

// Used to show the current text color and average text color in the boxes below the map.
var globalMood = {"mood" : [0,0,0], "count" : 1 };




// the googleGeocoder, set in initMap, used in geoCodeTweet.
var geoCoder;

// Determines which geocoder to use, out of a group of 4.
var turnstileCount = 0;

// The Google Map
var map;  

// Error messages to be set in formvalidate, used in buttonhandle
var startErrMsg;
var endErrMsg;

