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

const yOffsetForm = document.getElementById('bannerContentDiv').getBoundingClientRect().height + 
              document.getElementById('map').getBoundingClientRect().height;  

(function onLoadDisplays(){
  // In order to use the toggle function in "buttonHandler", the pixels must be set to
  // strings. Setting them in the css file gives them a Style Object class. 
  document.getElementById('bannerContentDiv').style.height = "60px";
  document.getElementById('contentBtns').style.bottom = "5px";
  
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
  // Without this, the toggles in "buttonHandler" will not recognize the "firstChild.data" as a
  // string. 
  var buttons = {'newSearchBtn': 'New Search', 
                 'pauseBtn': 'Pause',
                 'togCircVisBtn': 'Hide Circles',
                 'togTextVisBtn': 'Hide Text Crawl',
                 'instrBtn': 'See Map Tips',
                 'aboutBtn': 'What Does This App Do?',
               };
  buttonDisp(buttons);               
                 
  // Set a given string to appear on a given button. 
  function buttonDisp(htmls){
    var key;
    for (key in htmls){
      console.log(key)
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

// Two toggle buttons act on the same DOM element in "buttonHandler". This array stores the 
// sources of the toggle, to make sure one toggler doesn't untoggle the other one's states.
var togSources = [];

