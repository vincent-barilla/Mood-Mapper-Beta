// Execute functions according to button clicks. Note the flexibility in the logic of clickWrapper(a,b,c,d,e,f) --
// it MUST have the first 4 arguments, but also works with either 5 or 6 args (extras as optional callbacks).
function buttonHandler(source){
  var name = source.name;
  var mode = document.getElementById('mode').value;
  switch (name){
    case 'mapOnly':
      onclickWrapper(document.getElementById('togTextVis-btn').firstChild, 'data', true, 'Show Text Crawl', 'Hide Text Crawl');
      onclickWrapper(document.getElementById('text').style, 'display', true, 'none', 'inline-block');
      var center = map.getCenter();
      onclickWrapper(document.getElementById('map').style, 'width', true, '100%', '73%');
      map.panTo(center);
      break;
    case 'subject':
      map._resetLastId.call(map, ""); 
      break;
    case 'mode': 
      onclickWrapper(document.getElementById('startlabel').style, 'display', true,'none','block');
      onclickWrapper(document.getElementById('endlabel').style, 'display', true, 'none','block');      
      break;
    case 'submit':
      if (formValidates(mode)){
        onclickWrapper(document.getElementById('hidden-div').style, 'display', false, 'block', 'none', formSubmit);
        batchHide(['submit-btn','starterror','enderror','form']);
        document.getElementById('map').style.width = '73%'
        document.getElementById('text').style.display = 'inline-block';
      } else {
        showErrorMsgs();
      }
      break;
    case 'pause':
      if (formValidates(mode)){
        onclickWrapper(document.getElementById('pause-btn').firstChild, 'data', true, 'Resume Mapping', 'Pause Mapping', formSubmit, pauseStream);
        onclickWrapper(document.getElementById('form').style, 'display', true, 'block', 'none');  
      } else {
        showErrorMsgs();
      }
      break;        
    case 'togCircVis':
      onclickWrapper(document.getElementById('togCircVis-btn').firstChild, 'data', true,  'Show Circles', 'Hide Circles',
                     map._togCircVis.call(map, document.getElementById('togCircVis-btn').firstChild.data));
      break;
    case 'clear':
      resetGlobals();
      break;       
  }

/*
  Refer to Readme.md "III: onclickWrapper(elem, prop, toggleEnabled, newVal, oldVal, newOnClickMthd, oldOnClickMthd)" for further explanation of this 
  function.
*/ 
  
  // Paraphrasing these arguments:
  // 0: The html element you want to change. 
  // 1: The property of that element you want to change. 
  // 2: Whether or not you want the property to keep toggling back between what it was, and what you now set it to. 
  // 3: The new value you want. 
  // 4: The old value it was (only needed if you enable toggling).
  // 5: A callback that you want to fire when the html element shows the new value you've chosen (optional)
  // 6: A callback that you want to fire when element shows the value it started as (optional, unless 
  //    you intend to have both toggled values correspond to their own callback).
  function onclickWrapper(elem, prop, toggleEnabled, newVal, oldVal, newOnClickMthd, oldOnClickMthd){
    if(toggleEnabled) {
      elem[prop] == oldVal ? clickAction(newVal, oldOnClickMthd) : clickAction(oldVal, newOnClickMthd);
    } else {

      // If the toggleEnabled = false, then only newVal need be present in the function. 
      elem[prop] = newVal;
      if (newOnClickMthd){
        newOnClickMthd();
      }    
    }

    function clickAction(value, callback){
      elem[prop] = value;
      if (!callback && newOnClickMthd){
        callback = newOnClickMthd;
      }
      if (callback){        
        callback();
      }
    }
  }

  // Reset the global variables that relate to the user's view. 
  function resetGlobals(){
    map._clearCircles();
    globalMood = {"mood" : [0,0,0], "count" : 1 };
    document.getElementById('text').innerHTML = '';
    document.getElementById('togCircVis-btn').style.display = 'none';
    document.getElementById('togCircVis-btn').firstChild.data = 'Hide Circles';    
  }

  // Takes an array of html elements, toggles their display to 'none'.
  function batchHide(toBeHidden){
    toBeHidden.forEach(function(elem){
      document.getElementById(elem).style.display = 'none';
    })
  }

  // Show error messages that were set in formValidates if the messages are not blank. 
  // The two show independently of one another; one, the other, or both, could show. 
  function showErrorMsgs(){
    show(startErrMsg, starterror);
    show(endErrMsg, enderror);

    // A helper function to cut down on repeating the logic for both operations. 
    function show(msg, html){
      if (msg.length > 0){      
        document.getElementById(html).innerHTML = msg;
        document.getElementById(html).style.display = 'block';          
      }
    }  
  }  
}