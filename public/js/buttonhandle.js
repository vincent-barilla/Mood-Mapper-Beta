// All button "onclick" events get processed here. Essentially, a front-end dispatcher/router.  
function buttonHandler(source){
  
  // Check which button was clicked. Its name will indicate what case to use in the switch below.
  var name = source.name;
  var mode = document.getElementById('mode').value;

  switch (name){

    // Show background info about the app, namely how the mood sentiment scoring is performed.
    case 'about':
      // Toggle the button's text back and forth between 'Got it' and 'What Does This App Do?'
      toggleWithOptCb(document.getElementById('aboutBtn').firstChild, 'data', 'Got it.', 'What Does This App Do?');
      // Instructions are in a local html file, 'aboutThis.html.' Show them in an iFrame.          
      document.getElementById('banFrame').src = 'resource/aboutThis.html';    
      // Both 'about' and 'mapHowTo' use the iFrame. This ensures that the toggling of one button 
      // does not mess up the toggling of the other. 
      preventCrossToggling(name);                           
      break;

    // Show the instructions on how to interact with the app. 
    case 'mapHowTo':
      // Repeat the logic of the 'about' case, but this time, for map instructions. 
      toggleWithOptCb(document.getElementById('instrBtn').firstChild, 'data', 'Hide Map Tips', 'See Map Tips');      
      document.getElementById('banFrame').src = 'resource/mapTips.html';
      preventCrossToggling(name);                 
      break; 

    // Close the information iFrame, reset the banner buttons to start values, and jump from the banner down to the search form.   
    case 'scrlToForm':
      document.getElementById('bannerContentDiv').style.height = '60px';
      document.getElementById('contentBtns').style.bottom = '5px';      
      document.getElementById('banFrame').style.visibility = 'hidden'; 
      document.getElementById('instrBtn').firstChild.data = 'See Map Tips';
      document.getElementById('aboutBtn').firstChild.data = 'What Does This App Do?';                                    
      window.scrollTo(0, yOffsetForm);                   
      break;

    // Show/hide the text crawl to the right of the map. Starts as shown. 
    case 'mapOnly':
      // Toggle the text of the togTextVis button from 'Hide Text Crawl' to 'Show Text Crawl' 
      toggleWithOptCb(document.getElementById('togTextVisBtn').firstChild, 'data', 'Show Text Crawl', 'Hide Text Crawl');
      // Toggle the display of the text crawl from 'inline-block' to 'none'
      toggleWithOptCb(document.getElementById('text').style, 'display', 'none', 'inline-block');
      // Toggle the width of the map between 73%, to make room for the text, and 100%, when the text is hidden.
      toggleWithOptCb(document.getElementById('map').style, 'width', '100%', '73%');
      break;

    // An 'onkeyup' event in any of the three inpux boxes in the form causes this event. 
    case 'formChange':
      // When the user changes the subject, the previously stored "lastId" is no longer relevant. See "mapInit" in 
      // "init.js" for details about what "lastId" does.
      map._resetLastId.call(map, ""); 
      break;

    // Dates are only needed if "mode" is "Search Tweets". Hide the date inputs if "Stream Tweets" is chosen.
    case 'mode': 
      toggleWithOptCb(document.getElementById('startlabel').style, 'display', 'none','block');
      toggleWithOptCb(document.getElementById('endlabel').style, 'display', 'none','block');      
      break;

    // Execute all actions for the form submission.
    case 'submit':
      // Only execute all those action IF the form validates. 
      if (formValidates(mode)){
        // Show the buttons and colored boxes below the map
        document.getElementById('hiddenDiv').style.display = 'block';
        // Send the user's choices to the server.
        formSubmit();
        // Hide the form and all related elements.
        batchHide(['starterror','enderror']);
        // Shrink the map.
        document.getElementById('map').style.width = '73%'
        // Show the crawl.
        document.getElementById('text').style.display = 'inline-block';
        // Make scroll able to zoom in on the map. Disabled upon initialization to allow easier page scrolling.
        map.set('scrollwheel', true);
      } else {
        // Validation fails, show the error messages. 
        showErrorMsgs();
      }
      break;

    // Toggle between pausing and resuming the mapping. 
    case 'pause':
    //As resuming means a form resubmission, validation is again required.  
      if (formValidates(mode)){
        // Note the callbacks being used. One submits the form, the other requests the Twitter stream stop.
        toggleWithOptCb(document.getElementById('pauseBtn').firstChild, 'data', 'Resume', 'Pause', formSubmit, pauseStream);
        // Set 'togCircVisBtn' to 'Hide Circles', so a 'show' option isn't given when they're already visible.
        document.getElementById('togCircVisBtn').firstChild.data = 'Hide Circles';
      } else {
        // Show error messages if validation failed.
        showErrorMsgs();
      }              
      break;  

    // Jump down to the form. The map makes scrolling down the page annoying; this helps make it easier.  
    case 'newSearch':
      // Jump the view down to the form. The 'submit' case will be triggered from clicking 'Submit' button. 
      window.scrollTo(0, yOffsetForm);                   
      break;

    // Toggle text of 'togCircVis', always fire "._togCircVis" -- shows hidden circles, hides shown circles. 
    case 'togCircVis':
      toggleWithOptCb(document.getElementById('togCircVisBtn').firstChild, 'data', 'Show Circles', 'Hide Circles',
                         map._togCircVis.call(map, document.getElementById('togCircVisBtn').firstChild.data));
      break;

    // Wipes all circles from the map. Clears any global variables that have been tracking current mood.  
    case 'clear':
      // Decouple references of all currently showing circles from the map. 
      map._clearCircles();
      // Reset the mood tracking variables to their start values. 
      globalMood = {"mood" : [0,0,0], "count" : 1 };
      // Set the text crawl to be blank. 
      document.getElementById('text').innerHTML = '';
      // Show the user 'No Circles' on this button. 
      document.getElementById('togCircVisBtn').firstChild.data = 'No Circles';        
      break;       
  }

/*
  Refer to Readme.md "V: toggleWithOptCb(elem, prop, newVal, oldVal, newOnClickMthd, oldOnClickMthd)" for extended comments on this
  function.
*/ 

  // Toggle between two values for an html element, optionally firing callbacks with every click (5th and 6th args are callbacks).
  function toggleWithOptCb(elem, prop, newVal, oldVal, newOnClickMthd, oldOnClickMthd){
    // When the element shows "oldVal", switch the value to "newVal", and maybe fire a callback. Reverse when it doesn't -- i.e., toggle.
    elem[prop] == oldVal ? clickAction(newVal, oldOnClickMthd) : clickAction(oldVal, newOnClickMthd);

    // Always set the element's property to "value". Fire a callback, depending on the number of arguments given to the outer function.
    function clickAction(value, callback){
      elem[prop] = value;
      // Fire no callbacks, if none were given. If one callback was given, always use it. If both are given, toggle between them.
      if (!callback && newOnClickMthd){
        // The first callback given (5th argument into "toggleWithOptCb") will always be used, in this condition. 
        callback = newOnClickMthd;
      }
      // If no callback is given ("toggleWithOptCb" has 4 arguments), nothing happens here, "elem[prop] =  value" is all that happens.
      if (callback){        
        callback();
      }
    }
  }

/*
  Refer to Readme.md "VI: preventCrossToggling(source)" for extended comments on this function.
*/ 

  // If 'banFrame' is hidden and minimized, maximize and show it. Keep it open, with new contents, if the user jumps between help files.
  function preventCrossToggling(source){
    // Push the current origin of the click into the array. 
    togSources.push(source);
    // Toggle iFrame's visibility back to invisible ONLY when the same button calls this function twice in a row.  
    if (togSources.length == 1 || togSources[0] == togSources[1]){
      toggleWithOptCb(document.getElementById('bannerContentDiv').style, 'height', '500px','60px');
      toggleWithOptCb(document.getElementById('contentBtns').style, 'bottom', '3.5%','5px');      
      toggleWithOptCb(document.getElementById('banFrame').style,'visibility','visible','hidden');
    }
    // This makes it so only the last two button clicks are considered.
    if (togSources.length == 2){
      togSources = [];
    }
  }

  // Takes an array of html elements, toggles their display to 'none'.
  function batchHide(toBeHidden){
    toBeHidden.forEach(function(elem){
      document.getElementById(elem).style.display = 'none';
    })
  }

  // Show error messages. They were set in "formValidates" and will be blank if the validation succeeded. 
  function showErrorMsgs(){
    show(startErrMsg, 'starterror');
    show(endErrMsg, 'enderror');

    // Show the error message, if it's not an empty string. 
    function show(msg, html){
      if (msg.length > 0){      
        document.getElementById(html).innerHTML = msg;
        document.getElementById(html).style.display = 'block';          
      }
    }  
  }  
}
