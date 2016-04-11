// Because so many tweets don't have a location, I use a default latLng position on the map to 
// anchor the non-locatable tweets. This is outlined with a gray box, just south of Hawaii. 
const DefaultCenter = {'lat': -3.8963, 'lng': -146.4255};

// Apparently cross-browser standardization of date construction is not so consistent, so I use
// this as a golden standard: 
const Week = xBrowserWeek();

function xBrowserWeek(){
  var pointA = new Date('3/3/2016');
  var pointB = new Date('3/10/2016'); 
  return pointB - pointA;
}

(function onLoadDisplays(){
  // Since Twitter will only search back a week or so, set the default values of the input 
  // boxes to 6 (ish) days ago. 
  var end = new Date();
  var start = new Date(end - xBrowserWeek() + 86400 * 1000); // That math at the end equals one day, in ms.
  setDisplay('enddate', end);
  setDisplay('startdate', start);
  
  // Shows date in month/day/year format in a given date input box.
  function setDisplay(html, date){
  	date = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
  	document.getElementById(html).value = date;
  }

  buttonDisp('pause-btn', 'Pause Mapping');
  buttonDisp('togCircVis-btn', 'Hide Circles');
  buttonDisp('togTextVis-btn', 'Hide Text Crawl');

  function buttonDisp(html, text){
	document.getElementById(html).firstChild.data = text;
  }
})()

// These functions need to be global, to be set asynchronously/dynamically/temporarily 
// in createCircle and geoCodeTweet.
var bingCallback = function(){};
var panToCircle = function(){};

// Making this global allows for aborting it, outside of the function in which it is 
// primarily used. This will send the main requests to the server. 
var xhr = new XMLHttpRequest();

// Used to show the current text color and average text color in the boxes below the map.
var globalMood = {"mood" : [0,0,0], "count" : 1 };

// the googleGeocoder, set in initMap, used in geoCodeTweet.
var geoCoder;

// The Google Map
var map;  

// Error messages to be set in formvalidate, used in buttonhandle
var startErrMsg;
var endErrMsg;

