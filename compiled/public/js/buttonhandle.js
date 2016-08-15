'use strict';

// All button "onclick" events get processed here. Essentially a front-end dispatcher/router.  
function buttonHandler(source) {
  // Check which button was clicked. Its name will indicate what case to use in the switch below.
  var mode = document.getElementById('modeSelect').value;
  switch (source.name) {
    // Show background info about the app, namely how the mood sentiment scoring is performed.
    case 'about':
      // Toggle the button's text back and forth between 'Got it' and 'What Does This App Do?'
      toggleWithOptCb(document.getElementById('aboutBtn').firstChild, 'data', 'Got it.', 'What Does This App Do?');
      // Instructions are in a local html file, 'aboutThis.html.' Show them in an iFrame.          
      document.getElementById('banFrame').src = 'resource/aboutThis.html';
      // Both 'about' and 'mapHowTo' use the iFrame. This ensures that the toggling of one button 
      // doesn't untoggle that of the other. 
      preventCrossToggling(source.name);
      break;
    // Show the instructions on how to interact with the app. 
    case 'mapHowTo':
      // Repeat the logic of the 'about' case, but this time, for map instructions. 
      toggleWithOptCb(document.getElementById('instrBtn').firstChild, 'data', 'Hide Map Tips', 'See Map Tips');
      document.getElementById('banFrame').src = 'resource/mapTips.html';
      preventCrossToggling(source.name);
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
      // Toggle the text of the "togTextVis" button from 'Hide Text Crawl' to 'Show Text Crawl' 
      toggleWithOptCb(document.getElementById('togTextVisBtn').firstChild, 'data', 'Show Text Crawl', 'Hide Text Crawl');
      // Toggle the display of the text crawl from 'inline-block' to 'none'
      toggleWithOptCb(document.getElementById('text').style, 'display', 'none', 'inline-block');
      // Toggle the width of the map between 73%, to make room for the text, and 100%, when the text is hidden.
      toggleWithOptCb(document.getElementById('map').style, 'width', '100%', '73%');
      break;
    // An 'onkeyup' event in any of the three inpux boxes will call this, to reset "lastId" to "". 
    case 'formChange':
      // See "mapInit" in "init.js" for details about what "lastId" does. 
      map._resetLastId.call(map, "");
      break;
    // Dates are only needed if "mode" is "Search Tweets". Hide the date inputs if "Stream Tweets" is the mode.
    case 'modeSelect':
      toggleWithOptCb(document.getElementById('startlabel').style, 'display', 'none', 'block');
      toggleWithOptCb(document.getElementById('endlabel').style, 'display', 'none', 'block');
      break;
    // Execute all actions for the form submission, including validation and view toggling.
    case 'submit':
      // Only execute all those action after the form validates. 
      if (formValidates(mode)) {
        // Show the buttons and colored boxes below the map
        document.getElementById('hiddenDiv').style.display = 'block';
        // Send the user's choices to the server.
        formSubmit();
        // Hide the error messages.
        batchHide(['starterror', 'enderror']);
        // Shrink the map.
        document.getElementById('map').style.width = '73%';
        // Show the crawl.
        document.getElementById('text').style.display = 'inline-block';
        // Make scrollwheel able to zoom in on the map. Disabled upon initialization to allow easier page scrolling.
        map.set('scrollwheel', true);
      } else {
        // Validation fails, show the error messages. 
        showErrorMsgs();
      }
      break;
    // Toggle between pausing and resuming mapping. 
    case 'pause':
      // As resuming means a form resubmission, validation is again required.  
      if (formValidates(mode)) {
        // Note the callbacks being used. One submits the form, the other requests the Twitter stream to stop.
        toggleWithOptCb(document.getElementById('pauseBtn').firstChild, 'data', 'Resume', 'Pause', formSubmit, pauseStream);
        // Set 'togCircVisBtn' to 'Hide Circles', so a "show" option isn't given when they're already visible.
        document.getElementById('togCircVisBtn').firstChild.data = 'Hide Circles';
      } else {
        // Show error messages if validation failed.
        showErrorMsgs();
      }
      break;
    // Jump down to the form. The map makes scrolling down the page annoying; this makes it easier.  
    case 'newSearch':
      document.getElementById('searchInstruct').style.display = 'inline-block';
      window.scrollTo(0, yOffsetForm);
      break;
    // Toggle text of 'togCircVisBtn', always fire "._togCircVis", which shows hidden circles/hides shown circles. 
    case 'togCircVis':
      toggleWithOptCb(document.getElementById('togCircVisBtn').firstChild, 'data', 'Show Circles', 'Hide Circles', map._togCircVis.call(map, document.getElementById('togCircVisBtn').firstChild.data));
      break;
    // Wipes all circles from the map. Clears any global variables that have been tracking current mood.  
    case 'clear':
      // Decouple references of all currently showing circles from the map. 
      map._clearCircles();
      // Reset the mood tracking variables to their start values. 
      globalMood = { 'mood': [0, 0, 0], 'count': 1 };
      // Reset mood box background colors to their starting values. 
      document.getElementById('moodDiv').style = 'background-color: RGB(127,127,127)';
      document.getElementById('globalMoodDiv').style = 'background-color: RGB(127,127,127)';
      // Set the text crawl to be blank. 
      document.getElementById('text').innerHTML = '';
      // Show the user 'No Circles' on this button. 
      document.getElementById('togCircVisBtn').firstChild.data = 'No Circles';
      break;
  }

  /*
  
    Refer to Readme.md "V: toggleWithOptCb(elem, prop, newVal, oldVal, newOnClickMthd, oldOnClickMthd)" for extended comments on the
    following function.
  
  */

  // Toggle between two values for an html element, optionally firing callbacks with every click (5th and 6th args are callbacks).
  function toggleWithOptCb(elem, prop, newVal, oldVal, newOnClickMthd, oldOnClickMthd) {
    // When the element's property is "oldVal", switch element's property to "newVal" and maybe fire a callback. Reverse (toggle) when it doesn't.
    elem[prop] == oldVal ? clickAction(newVal, oldOnClickMthd) : clickAction(oldVal, newOnClickMthd);

    // Always set the element's property to "value". Fire a callback, depending on the number of arguments given to the outer function.
    function clickAction(value, callback) {
      elem[prop] = value;
      // Fire no callbacks, if none were given. If one callback was given, always use it. If both are given, toggle between them. 
      if (!callback && newOnClickMthd) {
        // The first callback given (5th argument into "toggleWithOptCb") will be used as callback for both sides of the toggled state.
        callback = newOnClickMthd;
      }
      // If no callback is given ("toggleWithOptCb" has 4 arguments), nothing happens here. "elem[prop] =  value" is all that happens.
      if (callback) {
        callback();
      }
    }
  }

  /*
  
    Refer to Readme.md "VI: preventCrossToggling(source)" for extended comments on the following function.
  
  */

  // If 'banFrame' is hidden and minimized, maximize and show it. Keep it open, with new contents, if the user jumps between help files.
  function preventCrossToggling(source) {
    // Push the current origin of the click into the array. 
    togSources.push(source);
    // Toggle iFrame's visibility back to invisible ONLY when the same button calls this function twice in a row, OR on the third click after
    // two different buttons have been clicked.   
    if (togSources.length == 1 || togSources[0] == togSources[1]) {
      toggleWithOptCb(document.getElementById('bannerContentDiv').style, 'height', '500px', '60px');
      toggleWithOptCb(document.getElementById('contentBtns').style, 'bottom', '3.5%', '5px');
      toggleWithOptCb(document.getElementById('banFrame').style, 'visibility', 'visible', 'hidden');
    }
    // This makes it so only the last two button clicks are considered.
    if (togSources.length == 2) {
      togSources = [];
    }
  }

  // Takes an array of html elements, toggles their display to 'none'.
  function batchHide(toBeHidden) {
    toBeHidden.forEach(function (elem) {
      document.getElementById(elem).style.display = 'none';
    });
  }

  // Show error messages. They were set in "formValidates" in "formvalidates.js" and will be blank if the form is valid. 
  function showErrorMsgs() {
    show(startErrMsg, 'starterror');
    show(endErrMsg, 'enderror');
    show(subjectErrMsg, 'subjecterror');

    // Show the error message, if it's not an empty string. 
    function show(msg, html) {
      if (msg.length > 0) {
        document.getElementById(html).innerHTML = msg;
        document.getElementById(html).style.display = 'block';
      }
    }
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3B1YmxpYy9qcy9idXR0b25oYW5kbGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBLFNBQVMsYUFBVCxDQUF1QixNQUF2QixFQUE4QjtBQUM1QjtBQUNBLE1BQUksT0FBTyxTQUFTLGNBQVQsQ0FBd0IsWUFBeEIsRUFBc0MsS0FBakQ7QUFDQSxVQUFRLE9BQU8sSUFBZjtBQUNFO0FBQ0EsU0FBSyxPQUFMO0FBQ0U7QUFDQSxzQkFBZ0IsU0FBUyxjQUFULENBQXdCLFVBQXhCLEVBQW9DLFVBQXBELEVBQWdFLE1BQWhFLEVBQXdFLFNBQXhFLEVBQW1GLHdCQUFuRjtBQUNBO0FBQ0EsZUFBUyxjQUFULENBQXdCLFVBQXhCLEVBQW9DLEdBQXBDLEdBQTBDLHlCQUExQztBQUNBO0FBQ0E7QUFDQSwyQkFBcUIsT0FBTyxJQUE1QjtBQUNBO0FBQ0Y7QUFDQSxTQUFLLFVBQUw7QUFDRTtBQUNBLHNCQUFnQixTQUFTLGNBQVQsQ0FBd0IsVUFBeEIsRUFBb0MsVUFBcEQsRUFBZ0UsTUFBaEUsRUFBd0UsZUFBeEUsRUFBeUYsY0FBekY7QUFDQSxlQUFTLGNBQVQsQ0FBd0IsVUFBeEIsRUFBb0MsR0FBcEMsR0FBMEMsdUJBQTFDO0FBQ0EsMkJBQXFCLE9BQU8sSUFBNUI7QUFDQTtBQUNGO0FBQ0EsU0FBSyxZQUFMO0FBQ0UsZUFBUyxjQUFULENBQXdCLGtCQUF4QixFQUE0QyxLQUE1QyxDQUFrRCxNQUFsRCxHQUEyRCxNQUEzRDtBQUNBLGVBQVMsY0FBVCxDQUF3QixhQUF4QixFQUF1QyxLQUF2QyxDQUE2QyxNQUE3QyxHQUFzRCxLQUF0RDtBQUNBLGVBQVMsY0FBVCxDQUF3QixVQUF4QixFQUFvQyxLQUFwQyxDQUEwQyxVQUExQyxHQUF1RCxRQUF2RDtBQUNBLGVBQVMsY0FBVCxDQUF3QixVQUF4QixFQUFvQyxVQUFwQyxDQUErQyxJQUEvQyxHQUFzRCxjQUF0RDtBQUNBLGVBQVMsY0FBVCxDQUF3QixVQUF4QixFQUFvQyxVQUFw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QUE5RCxFQUF3RSxNQUF4RSxFQUErRSxLQUEvRTtBQUNBLHNCQUFnQixTQUFTLGNBQVQsQ0FBd0IsVUFBeEIsRUFBb0MsS0FBcEQsRUFBMEQsWUFBMUQsRUFBdUUsU0FBdkUsRUFBaUYsUUFBakY7QUFDRDtBQUNEO0FBQ0EsUUFBSSxXQUFXLE1BQVgsSUFBcUIsQ0FBekIsRUFBMkI7QUFDekIsbUJBQWEsRUFBYjtBQUNEO0FBQ0Y7O0FBRUQ7QUFDQSxXQUFTLFNBQVQsQ0FBbUIsVUFBbkIsRUFBOEI7QUFDNUIsZUFBVyxPQUFYLENBQW1CLFVBQVMsSUFBVCxFQUFjO0FBQy9CLGVBQVMsY0FBVCxDQUF3QixJQUF4QixFQUE4QixLQUE5QixDQUFvQyxPQUFwQyxHQUE4QyxNQUE5QztBQUNELEtBRkQ7QUFHRDs7QUFFRDtBQUNBLFdBQVMsYUFBVCxHQUF3QjtBQUN0QixTQUFLLFdBQUwsRUFBa0IsWUFBbEI7QUFDQSxTQUFLLFNBQUwsRUFBZ0IsVUFBaEI7QUFDQSxTQUFLLGFBQUwsRUFBb0IsY0FBcEI7O0FBRUE7QUFDQSxhQUFTLElBQVQsQ0FBYyxHQUFkLEVBQW1CLElBQW5CLEVBQXdCO0FBQ3RCLFVBQUksSUFBSSxNQUFKLEdBQWEsQ0FBakIsRUFBbUI7QUFDakIsaUJBQVMsY0FBVCxDQUF3QixJQUF4QixFQUE4QixTQUE5QixHQUEwQyxHQUExQztBQUNBLGlCQUFTLGNBQVQsQ0FBd0IsSUFBeEIsRUFBOEIsS0FBOUIsQ0FBb0MsT0FBcEMsR0FBOEMsT0FBOUM7QUFDRDtBQUNGO0FBQ0Y7QUFDRiIsImZpbGUiOiJidXR0b25oYW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBBbGwgYnV0dG9uIFwib25jbGlja1wiIGV2ZW50cyBnZXQgcHJvY2Vzc2VkIGhlcmUuIEVzc2VudGlhbGx5IGEgZnJvbnQtZW5kIGRpc3BhdGNoZXIvcm91dGVyLiAgXG5mdW5jdGlvbiBidXR0b25IYW5kbGVyKHNvdXJjZSl7XG4gIC8vIENoZWNrIHdoaWNoIGJ1dHRvbiB3YXMgY2xpY2tlZC4gSXRzIG5hbWUgd2lsbCBpbmRpY2F0ZSB3aGF0IGNhc2UgdG8gdXNlIGluIHRoZSBzd2l0Y2ggYmVsb3cuXG4gIHZhciBtb2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21vZGVTZWxlY3QnKS52YWx1ZTtcbiAgc3dpdGNoIChzb3VyY2UubmFtZSl7XG4gICAgLy8gU2hvdyBiYWNrZ3JvdW5kIGluZm8gYWJvdXQgdGhlIGFwcCwgbmFtZWx5IGhvdyB0aGUgbW9vZCBzZW50aW1lbnQgc2NvcmluZyBpcyBwZXJmb3JtZWQuXG4gICAgY2FzZSAnYWJvdXQnOlxuICAgICAgLy8gVG9nZ2xlIHRoZSBidXR0b24ncyB0ZXh0IGJhY2sgYW5kIGZvcnRoIGJldHdlZW4gJ0dvdCBpdCcgYW5kICdXaGF0IERvZXMgVGhpcyBBcHAgRG8/J1xuICAgICAgdG9nZ2xlV2l0aE9wdENiKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhYm91dEJ0bicpLmZpcnN0Q2hpbGQsICdkYXRhJywgJ0dvdCBpdC4nLCAnV2hhdCBEb2VzIFRoaXMgQXBwIERvPycpO1xuICAgICAgLy8gSW5zdHJ1Y3Rpb25zIGFyZSBpbiBhIGxvY2FsIGh0bWwgZmlsZSwgJ2Fib3V0VGhpcy5odG1sLicgU2hvdyB0aGVtIGluIGFuIGlGcmFtZS4gICAgICAgICAgXG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFuRnJhbWUnKS5zcmMgPSAncmVzb3VyY2UvYWJvdXRUaGlzLmh0bWwnOyAgICBcbiAgICAgIC8vIEJvdGggJ2Fib3V0JyBhbmQgJ21hcEhvd1RvJyB1c2UgdGhlIGlGcmFtZS4gVGhpcyBlbnN1cmVzIHRoYXQgdGhlIHRvZ2dsaW5nIG9mIG9uZSBidXR0b24gXG4gICAgICAvLyBkb2Vzbid0IHVudG9nZ2xlIHRoYXQgb2YgdGhlIG90aGVyLiBcbiAgICAgIHByZXZlbnRDcm9zc1RvZ2dsaW5nKHNvdXJjZS5uYW1lKTsgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgIGJyZWFrO1xuICAgIC8vIFNob3cgdGhlIGluc3RydWN0aW9ucyBvbiBob3cgdG8gaW50ZXJhY3Qgd2l0aCB0aGUgYXBwLiBcbiAgICBjYXNlICdtYXBIb3dUbyc6XG4gICAgICAvLyBSZXBlYXQgdGhlIGxvZ2ljIG9mIHRoZSAnYWJvdXQnIGNhc2UsIGJ1dCB0aGlzIHRpbWUsIGZvciBtYXAgaW5zdHJ1Y3Rpb25zLiBcbiAgICAgIHRvZ2dsZVdpdGhPcHRDYihkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaW5zdHJCdG4nKS5maXJzdENoaWxkLCAnZGF0YScsICdIaWRlIE1hcCBUaXBzJywgJ1NlZSBNYXAgVGlwcycpOyAgICAgIFxuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhbkZyYW1lJykuc3JjID0gJ3Jlc291cmNlL21hcFRpcHMuaHRtbCc7XG4gICAgICBwcmV2ZW50Q3Jvc3NUb2dnbGluZyhzb3VyY2UubmFtZSk7ICAgICAgICAgICAgICAgICBcbiAgICAgIGJyZWFrOyBcbiAgICAvLyBDbG9zZSB0aGUgaW5mb3JtYXRpb24gaUZyYW1lLCByZXNldCB0aGUgYmFubmVyIGJ1dHRvbnMgdG8gc3RhcnQgdmFsdWVzLCBhbmQganVtcCBmcm9tIHRoZSBiYW5uZXIgZG93biB0byB0aGUgc2VhcmNoIGZvcm0uICAgXG4gICAgY2FzZSAnc2NybFRvRm9ybSc6XG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFubmVyQ29udGVudERpdicpLnN0eWxlLmhlaWdodCA9ICc2MHB4JztcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb250ZW50QnRucycpLnN0eWxlLmJvdHRvbSA9ICc1cHgnOyAgICAgIFxuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhbkZyYW1lJykuc3R5bGUudmlzaWJpbGl0eSA9ICdoaWRkZW4nOyBcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbnN0ckJ0bicpLmZpcnN0Q2hpbGQuZGF0YSA9ICdTZWUgTWFwIFRpcHMnO1xuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Fib3V0QnRuJykuZmlyc3RDaGlsZC5kYXRhID0gJ1doYXQgRG9lcyBUaGlzIEFwcCBEbz8nOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgd2luZG93LnNjcm9sbFRvKDAsIHlPZmZzZXRGb3JtKTsgICAgICAgICAgICAgICAgICAgXG4gICAgICBicmVhaztcbiAgICAvLyBTaG93L2hpZGUgdGhlIHRleHQgY3Jhd2wgdG8gdGhlIHJpZ2h0IG9mIHRoZSBtYXAuIFN0YXJ0cyBhcyBzaG93bi4gXG4gICAgY2FzZSAnbWFwT25seSc6XG4gICAgICAvLyBUb2dnbGUgdGhlIHRleHQgb2YgdGhlIFwidG9nVGV4dFZpc1wiIGJ1dHRvbiBmcm9tICdIaWRlIFRleHQgQ3Jhd2wnIHRvICdTaG93IFRleHQgQ3Jhd2wnIFxuICAgICAgdG9nZ2xlV2l0aE9wdENiKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2dUZXh0VmlzQnRuJykuZmlyc3RDaGlsZCwgJ2RhdGEnLCAnU2hvdyBUZXh0IENyYXdsJywgJ0hpZGUgVGV4dCBDcmF3bCcpO1xuICAgICAgLy8gVG9nZ2xlIHRoZSBkaXNwbGF5IG9mIHRoZSB0ZXh0IGNyYXdsIGZyb20gJ2lubGluZS1ibG9jaycgdG8gJ25vbmUnXG4gICAgICB0b2dnbGVXaXRoT3B0Q2IoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RleHQnKS5zdHlsZSwgJ2Rpc3BsYXknLCAnbm9uZScsICdpbmxpbmUtYmxvY2snKTtcbiAgICAgIC8vIFRvZ2dsZSB0aGUgd2lkdGggb2YgdGhlIG1hcCBiZXR3ZWVuIDczJSwgdG8gbWFrZSByb29tIGZvciB0aGUgdGV4dCwgYW5kIDEwMCUsIHdoZW4gdGhlIHRleHQgaXMgaGlkZGVuLlxuICAgICAgdG9nZ2xlV2l0aE9wdENiKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXAnKS5zdHlsZSwgJ3dpZHRoJywgJzEwMCUnLCAnNzMlJyk7XG4gICAgICBicmVhaztcbiAgICAvLyBBbiAnb25rZXl1cCcgZXZlbnQgaW4gYW55IG9mIHRoZSB0aHJlZSBpbnB1eCBib3hlcyB3aWxsIGNhbGwgdGhpcywgdG8gcmVzZXQgXCJsYXN0SWRcIiB0byBcIlwiLiBcbiAgICBjYXNlICdmb3JtQ2hhbmdlJzpcbiAgICAgIC8vIFNlZSBcIm1hcEluaXRcIiBpbiBcImluaXQuanNcIiBmb3IgZGV0YWlscyBhYm91dCB3aGF0IFwibGFzdElkXCIgZG9lcy4gXG4gICAgICBtYXAuX3Jlc2V0TGFzdElkLmNhbGwobWFwLCBcIlwiKTsgXG4gICAgICBicmVhaztcbiAgICAvLyBEYXRlcyBhcmUgb25seSBuZWVkZWQgaWYgXCJtb2RlXCIgaXMgXCJTZWFyY2ggVHdlZXRzXCIuIEhpZGUgdGhlIGRhdGUgaW5wdXRzIGlmIFwiU3RyZWFtIFR3ZWV0c1wiIGlzIHRoZSBtb2RlLlxuICAgIGNhc2UgJ21vZGVTZWxlY3QnOiBcbiAgICAgIHRvZ2dsZVdpdGhPcHRDYihkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3RhcnRsYWJlbCcpLnN0eWxlLCAnZGlzcGxheScsICdub25lJywnYmxvY2snKTtcbiAgICAgIHRvZ2dsZVdpdGhPcHRDYihkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZW5kbGFiZWwnKS5zdHlsZSwgJ2Rpc3BsYXknLCAnbm9uZScsJ2Jsb2NrJyk7ICAgICAgXG4gICAgICBicmVhaztcbiAgICAvLyBFeGVjdXRlIGFsbCBhY3Rpb25zIGZvciB0aGUgZm9ybSBzdWJtaXNzaW9uLCBpbmNsdWRpbmcgdmFsaWRhdGlvbiBhbmQgdmlldyB0b2dnbGluZy5cbiAgICBjYXNlICdzdWJtaXQnOlxuICAgICAgLy8gT25seSBleGVjdXRlIGFsbCB0aG9zZSBhY3Rpb24gYWZ0ZXIgdGhlIGZvcm0gdmFsaWRhdGVzLiBcbiAgICAgIGlmIChmb3JtVmFsaWRhdGVzKG1vZGUpKXtcbiAgICAgICAgLy8gU2hvdyB0aGUgYnV0dG9ucyBhbmQgY29sb3JlZCBib3hlcyBiZWxvdyB0aGUgbWFwXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdoaWRkZW5EaXYnKS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgICAgICAgLy8gU2VuZCB0aGUgdXNlcidzIGNob2ljZXMgdG8gdGhlIHNlcnZlci5cbiAgICAgICAgZm9ybVN1Ym1pdCgpO1xuICAgICAgICAvLyBIaWRlIHRoZSBlcnJvciBtZXNzYWdlcy5cbiAgICAgICAgYmF0Y2hIaWRlKFsnc3RhcnRlcnJvcicsJ2VuZGVycm9yJ10pO1xuICAgICAgICAvLyBTaHJpbmsgdGhlIG1hcC5cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21hcCcpLnN0eWxlLndpZHRoID0gJzczJSdcbiAgICAgICAgLy8gU2hvdyB0aGUgY3Jhd2wuXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0ZXh0Jykuc3R5bGUuZGlzcGxheSA9ICdpbmxpbmUtYmxvY2snO1xuICAgICAgICAvLyBNYWtlIHNjcm9sbHdoZWVsIGFibGUgdG8gem9vbSBpbiBvbiB0aGUgbWFwLiBEaXNhYmxlZCB1cG9uIGluaXRpYWxpemF0aW9uIHRvIGFsbG93IGVhc2llciBwYWdlIHNjcm9sbGluZy5cbiAgICAgICAgbWFwLnNldCgnc2Nyb2xsd2hlZWwnLCB0cnVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFZhbGlkYXRpb24gZmFpbHMsIHNob3cgdGhlIGVycm9yIG1lc3NhZ2VzLiBcbiAgICAgICAgc2hvd0Vycm9yTXNncygpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgLy8gVG9nZ2xlIGJldHdlZW4gcGF1c2luZyBhbmQgcmVzdW1pbmcgbWFwcGluZy4gXG4gICAgY2FzZSAncGF1c2UnOlxuICAgICAgLy8gQXMgcmVzdW1pbmcgbWVhbnMgYSBmb3JtIHJlc3VibWlzc2lvbiwgdmFsaWRhdGlvbiBpcyBhZ2FpbiByZXF1aXJlZC4gIFxuICAgICAgaWYgKGZvcm1WYWxpZGF0ZXMobW9kZSkpe1xuICAgICAgICAvLyBOb3RlIHRoZSBjYWxsYmFja3MgYmVpbmcgdXNlZC4gT25lIHN1Ym1pdHMgdGhlIGZvcm0sIHRoZSBvdGhlciByZXF1ZXN0cyB0aGUgVHdpdHRlciBzdHJlYW0gdG8gc3RvcC5cbiAgICAgICAgdG9nZ2xlV2l0aE9wdENiKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwYXVzZUJ0bicpLmZpcnN0Q2hpbGQsICdkYXRhJywgJ1Jlc3VtZScsICdQYXVzZScsIGZvcm1TdWJtaXQsIHBhdXNlU3RyZWFtKTtcbiAgICAgICAgLy8gU2V0ICd0b2dDaXJjVmlzQnRuJyB0byAnSGlkZSBDaXJjbGVzJywgc28gYSBcInNob3dcIiBvcHRpb24gaXNuJ3QgZ2l2ZW4gd2hlbiB0aGV5J3JlIGFscmVhZHkgdmlzaWJsZS5cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ0NpcmNWaXNCdG4nKS5maXJzdENoaWxkLmRhdGEgPSAnSGlkZSBDaXJjbGVzJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFNob3cgZXJyb3IgbWVzc2FnZXMgaWYgdmFsaWRhdGlvbiBmYWlsZWQuXG4gICAgICAgIHNob3dFcnJvck1zZ3MoKTtcbiAgICAgIH0gICAgICAgICAgICAgIFxuICAgICAgYnJlYWs7ICBcbiAgICAvLyBKdW1wIGRvd24gdG8gdGhlIGZvcm0uIFRoZSBtYXAgbWFrZXMgc2Nyb2xsaW5nIGRvd24gdGhlIHBhZ2UgYW5ub3lpbmc7IHRoaXMgbWFrZXMgaXQgZWFzaWVyLiAgXG4gICAgY2FzZSAnbmV3U2VhcmNoJzpcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZWFyY2hJbnN0cnVjdCcpLnN0eWxlLmRpc3BsYXkgPSAnaW5saW5lLWJsb2NrJztcbiAgICAgIHdpbmRvdy5zY3JvbGxUbygwLCB5T2Zmc2V0Rm9ybSk7ICAgICAgICAgICAgICAgICAgIFxuICAgICAgYnJlYWs7XG4gICAgLy8gVG9nZ2xlIHRleHQgb2YgJ3RvZ0NpcmNWaXNCdG4nLCBhbHdheXMgZmlyZSBcIi5fdG9nQ2lyY1Zpc1wiLCB3aGljaCBzaG93cyBoaWRkZW4gY2lyY2xlcy9oaWRlcyBzaG93biBjaXJjbGVzLiBcbiAgICBjYXNlICd0b2dDaXJjVmlzJzpcbiAgICAgIHRvZ2dsZVdpdGhPcHRDYihkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG9nQ2lyY1Zpc0J0bicpLmZpcnN0Q2hpbGQsICdkYXRhJywgJ1Nob3cgQ2lyY2xlcycsICdIaWRlIENpcmNsZXMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgIG1hcC5fdG9nQ2lyY1Zpcy5jYWxsKG1hcCwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ0NpcmNWaXNCdG4nKS5maXJzdENoaWxkLmRhdGEpKTtcbiAgICAgIGJyZWFrO1xuICAgIC8vIFdpcGVzIGFsbCBjaXJjbGVzIGZyb20gdGhlIG1hcC4gQ2xlYXJzIGFueSBnbG9iYWwgdmFyaWFibGVzIHRoYXQgaGF2ZSBiZWVuIHRyYWNraW5nIGN1cnJlbnQgbW9vZC4gIFxuICAgIGNhc2UgJ2NsZWFyJzpcbiAgICAgIC8vIERlY291cGxlIHJlZmVyZW5jZXMgb2YgYWxsIGN1cnJlbnRseSBzaG93aW5nIGNpcmNsZXMgZnJvbSB0aGUgbWFwLiBcbiAgICAgIG1hcC5fY2xlYXJDaXJjbGVzKCk7XG4gICAgICAvLyBSZXNldCB0aGUgbW9vZCB0cmFja2luZyB2YXJpYWJsZXMgdG8gdGhlaXIgc3RhcnQgdmFsdWVzLiBcbiAgICAgIGdsb2JhbE1vb2QgPSB7J21vb2QnIDogWzAsMCwwXSwgJ2NvdW50JyA6IDEgfTtcbiAgICAgIC8vIFJlc2V0IG1vb2QgYm94IGJhY2tncm91bmQgY29sb3JzIHRvIHRoZWlyIHN0YXJ0aW5nIHZhbHVlcy4gXG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbW9vZERpdicpLnN0eWxlID0gJ2JhY2tncm91bmQtY29sb3I6IFJHQigxMjcsMTI3LDEyNyknXG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2xvYmFsTW9vZERpdicpLnN0eWxlID0gJ2JhY2tncm91bmQtY29sb3I6IFJHQigxMjcsMTI3LDEyNyknICAgICAgXG4gICAgICAvLyBTZXQgdGhlIHRleHQgY3Jhd2wgdG8gYmUgYmxhbmsuIFxuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RleHQnKS5pbm5lckhUTUwgPSAnJztcbiAgICAgIC8vIFNob3cgdGhlIHVzZXIgJ05vIENpcmNsZXMnIG9uIHRoaXMgYnV0dG9uLiBcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2dDaXJjVmlzQnRuJykuZmlyc3RDaGlsZC5kYXRhID0gJ05vIENpcmNsZXMnOyAgICAgICAgXG4gICAgICBicmVhazsgICAgICAgXG4gIH1cblxuLypcblxuICBSZWZlciB0byBSZWFkbWUubWQgXCJWOiB0b2dnbGVXaXRoT3B0Q2IoZWxlbSwgcHJvcCwgbmV3VmFsLCBvbGRWYWwsIG5ld09uQ2xpY2tNdGhkLCBvbGRPbkNsaWNrTXRoZClcIiBmb3IgZXh0ZW5kZWQgY29tbWVudHMgb24gdGhlXG4gIGZvbGxvd2luZyBmdW5jdGlvbi5cblxuKi8gXG5cbiAgLy8gVG9nZ2xlIGJldHdlZW4gdHdvIHZhbHVlcyBmb3IgYW4gaHRtbCBlbGVtZW50LCBvcHRpb25hbGx5IGZpcmluZyBjYWxsYmFja3Mgd2l0aCBldmVyeSBjbGljayAoNXRoIGFuZCA2dGggYXJncyBhcmUgY2FsbGJhY2tzKS5cbiAgZnVuY3Rpb24gdG9nZ2xlV2l0aE9wdENiKGVsZW0sIHByb3AsIG5ld1ZhbCwgb2xkVmFsLCBuZXdPbkNsaWNrTXRoZCwgb2xkT25DbGlja010aGQpe1xuICAgIC8vIFdoZW4gdGhlIGVsZW1lbnQncyBwcm9wZXJ0eSBpcyBcIm9sZFZhbFwiLCBzd2l0Y2ggZWxlbWVudCdzIHByb3BlcnR5IHRvIFwibmV3VmFsXCIgYW5kIG1heWJlIGZpcmUgYSBjYWxsYmFjay4gUmV2ZXJzZSAodG9nZ2xlKSB3aGVuIGl0IGRvZXNuJ3QuXG4gICAgZWxlbVtwcm9wXSA9PSBvbGRWYWwgPyBjbGlja0FjdGlvbihuZXdWYWwsIG9sZE9uQ2xpY2tNdGhkKSA6IGNsaWNrQWN0aW9uKG9sZFZhbCwgbmV3T25DbGlja010aGQpO1xuXG4gICAgLy8gQWx3YXlzIHNldCB0aGUgZWxlbWVudCdzIHByb3BlcnR5IHRvIFwidmFsdWVcIi4gRmlyZSBhIGNhbGxiYWNrLCBkZXBlbmRpbmcgb24gdGhlIG51bWJlciBvZiBhcmd1bWVudHMgZ2l2ZW4gdG8gdGhlIG91dGVyIGZ1bmN0aW9uLlxuICAgIGZ1bmN0aW9uIGNsaWNrQWN0aW9uKHZhbHVlLCBjYWxsYmFjayl7XG4gICAgICBlbGVtW3Byb3BdID0gdmFsdWU7XG4gICAgICAvLyBGaXJlIG5vIGNhbGxiYWNrcywgaWYgbm9uZSB3ZXJlIGdpdmVuLiBJZiBvbmUgY2FsbGJhY2sgd2FzIGdpdmVuLCBhbHdheXMgdXNlIGl0LiBJZiBib3RoIGFyZSBnaXZlbiwgdG9nZ2xlIGJldHdlZW4gdGhlbS4gXG4gICAgICBpZiAoIWNhbGxiYWNrICYmIG5ld09uQ2xpY2tNdGhkKXtcbiAgICAgICAgLy8gVGhlIGZpcnN0IGNhbGxiYWNrIGdpdmVuICg1dGggYXJndW1lbnQgaW50byBcInRvZ2dsZVdpdGhPcHRDYlwiKSB3aWxsIGJlIHVzZWQgYXMgY2FsbGJhY2sgZm9yIGJvdGggc2lkZXMgb2YgdGhlIHRvZ2dsZWQgc3RhdGUuXG4gICAgICAgIGNhbGxiYWNrID0gbmV3T25DbGlja010aGQ7XG4gICAgICB9XG4gICAgICAvLyBJZiBubyBjYWxsYmFjayBpcyBnaXZlbiAoXCJ0b2dnbGVXaXRoT3B0Q2JcIiBoYXMgNCBhcmd1bWVudHMpLCBub3RoaW5nIGhhcHBlbnMgaGVyZS4gXCJlbGVtW3Byb3BdID0gIHZhbHVlXCIgaXMgYWxsIHRoYXQgaGFwcGVucy5cbiAgICAgIGlmIChjYWxsYmFjayl7ICAgICAgICBcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuLypcblxuICBSZWZlciB0byBSZWFkbWUubWQgXCJWSTogcHJldmVudENyb3NzVG9nZ2xpbmcoc291cmNlKVwiIGZvciBleHRlbmRlZCBjb21tZW50cyBvbiB0aGUgZm9sbG93aW5nIGZ1bmN0aW9uLlxuXG4qLyBcblxuICAvLyBJZiAnYmFuRnJhbWUnIGlzIGhpZGRlbiBhbmQgbWluaW1pemVkLCBtYXhpbWl6ZSBhbmQgc2hvdyBpdC4gS2VlcCBpdCBvcGVuLCB3aXRoIG5ldyBjb250ZW50cywgaWYgdGhlIHVzZXIganVtcHMgYmV0d2VlbiBoZWxwIGZpbGVzLlxuICBmdW5jdGlvbiBwcmV2ZW50Q3Jvc3NUb2dnbGluZyhzb3VyY2Upe1xuICAgIC8vIFB1c2ggdGhlIGN1cnJlbnQgb3JpZ2luIG9mIHRoZSBjbGljayBpbnRvIHRoZSBhcnJheS4gXG4gICAgdG9nU291cmNlcy5wdXNoKHNvdXJjZSk7XG4gICAgLy8gVG9nZ2xlIGlGcmFtZSdzIHZpc2liaWxpdHkgYmFjayB0byBpbnZpc2libGUgT05MWSB3aGVuIHRoZSBzYW1lIGJ1dHRvbiBjYWxscyB0aGlzIGZ1bmN0aW9uIHR3aWNlIGluIGEgcm93LCBPUiBvbiB0aGUgdGhpcmQgY2xpY2sgYWZ0ZXJcbiAgICAvLyB0d28gZGlmZmVyZW50IGJ1dHRvbnMgaGF2ZSBiZWVuIGNsaWNrZWQuICAgXG4gICAgaWYgKHRvZ1NvdXJjZXMubGVuZ3RoID09IDEgfHwgdG9nU291cmNlc1swXSA9PSB0b2dTb3VyY2VzWzFdKXtcbiAgICAgIHRvZ2dsZVdpdGhPcHRDYihkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFubmVyQ29udGVudERpdicpLnN0eWxlLCAnaGVpZ2h0JywgJzUwMHB4JywnNjBweCcpO1xuICAgICAgdG9nZ2xlV2l0aE9wdENiKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb250ZW50QnRucycpLnN0eWxlLCAnYm90dG9tJywgJzMuNSUnLCc1cHgnKTsgICAgICBcbiAgICAgIHRvZ2dsZVdpdGhPcHRDYihkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFuRnJhbWUnKS5zdHlsZSwndmlzaWJpbGl0eScsJ3Zpc2libGUnLCdoaWRkZW4nKTtcbiAgICB9XG4gICAgLy8gVGhpcyBtYWtlcyBpdCBzbyBvbmx5IHRoZSBsYXN0IHR3byBidXR0b24gY2xpY2tzIGFyZSBjb25zaWRlcmVkLlxuICAgIGlmICh0b2dTb3VyY2VzLmxlbmd0aCA9PSAyKXtcbiAgICAgIHRvZ1NvdXJjZXMgPSBbXTtcbiAgICB9XG4gIH1cblxuICAvLyBUYWtlcyBhbiBhcnJheSBvZiBodG1sIGVsZW1lbnRzLCB0b2dnbGVzIHRoZWlyIGRpc3BsYXkgdG8gJ25vbmUnLlxuICBmdW5jdGlvbiBiYXRjaEhpZGUodG9CZUhpZGRlbil7XG4gICAgdG9CZUhpZGRlbi5mb3JFYWNoKGZ1bmN0aW9uKGVsZW0pe1xuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbSkuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICB9KVxuICB9XG5cbiAgLy8gU2hvdyBlcnJvciBtZXNzYWdlcy4gVGhleSB3ZXJlIHNldCBpbiBcImZvcm1WYWxpZGF0ZXNcIiBpbiBcImZvcm12YWxpZGF0ZXMuanNcIiBhbmQgd2lsbCBiZSBibGFuayBpZiB0aGUgZm9ybSBpcyB2YWxpZC4gXG4gIGZ1bmN0aW9uIHNob3dFcnJvck1zZ3MoKXtcbiAgICBzaG93KHN0YXJ0RXJyTXNnLCAnc3RhcnRlcnJvcicpO1xuICAgIHNob3coZW5kRXJyTXNnLCAnZW5kZXJyb3InKTtcbiAgICBzaG93KHN1YmplY3RFcnJNc2csICdzdWJqZWN0ZXJyb3InKTtcblxuICAgIC8vIFNob3cgdGhlIGVycm9yIG1lc3NhZ2UsIGlmIGl0J3Mgbm90IGFuIGVtcHR5IHN0cmluZy4gXG4gICAgZnVuY3Rpb24gc2hvdyhtc2csIGh0bWwpe1xuICAgICAgaWYgKG1zZy5sZW5ndGggPiAwKXsgICAgICBcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaHRtbCkuaW5uZXJIVE1MID0gbXNnO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChodG1sKS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJzsgICAgICAgICAgXG4gICAgICB9XG4gICAgfSAgXG4gIH0gIFxufVxuIl19