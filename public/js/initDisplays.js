// Several DOM displays are best set programatically. Those are done here. 
  
// This adjusts map height to the user's screen size, then takes off a bit to make room for the buttons to show beneath
// the map. 
(function onLoadSetMapHeight(){
  var mapHeight = window.innerHeight - 55;
  // Set the map-dependent DOM elements by this value in the three lines.  
  document.getElementById('mainViewSection').style.height = mapHeight;
  document.getElementById('map').style.height = mapHeight;
  document.getElementById('text').style.height = mapHeight;
})();

(function onLoadSetInputDates(){
  // Since Twitter will only search back a week or so, set the default values of the input 
  // boxes to 6 (ish) days ago. 
  var end = new Date();
  var start = new Date(end - Week + 86400 * 1000); // That math at the end equals one day, in ms.
  setDisplay('enddate', end);
  setDisplay('startdate', start);

  // Set default values in the iput boxes.
  function setDisplay(html, date){
    date = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
    document.getElementById(html).value = date;
  }
})();

// Set these to strings here so that the toggling in "buttonHandler" in "buttonhandle.js" will be able to use them.
(function onLoadSetBannerStyle(){
  document.getElementById('bannerContentDiv').style.height = "60px";
  document.getElementById('contentBtns').style.bottom = "5px";
})();

// All these follow the pattern used in "buttonDisp": set the "firstChild.data" of the element with "key" as its id to 
// "key"'s value. Set as strings so that "buttonHandler" in "buttonhandle.js" will be able to use them.
(function onLoadSetButtonText(){
  var buttons = {'pauseBtn': 'Pause',
                 'togCircVisBtn': 'Hide Circles',
                 'togTextVisBtn': 'Hide Text Crawl',
                 'instrBtn': 'See Map Tips',
                 'aboutBtn': 'What Does This App Do?',
               };
  buttonDisp(buttons);

  function buttonDisp(htmls){
    var key;
    for (key in htmls){
      document.getElementById(key).firstChild.data = htmls[key];
    }
  }
})();

// This gives a y-coordinate which allows "scrollTo" calls to jump the user to the form. Defined here instead of 
// "initGlobals.js" to ensure the map's height is up-to-date.
const yOffsetForm = document.getElementById('bannerContentDiv').getBoundingClientRect().height + 
                    document.getElementById('map').getBoundingClientRect().height;