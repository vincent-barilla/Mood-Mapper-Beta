// Execute functions according to button clicks. Note the flexibility in the logic of clickWrapper(a,b,c,d,e,f) --
// it MUST have the first 4 arguments, but also works with either 5 or 6 args (extras as optional callbacks).
function buttonHandler(source){
  var name  = source.name;

  switch (name){
    case 'submit':
      if (formValidates()){
        onclickWrapper(document.getElementById('hidden-div').style, 'display', false, 'block', 'none', ajaxFormSubmit);
        batchHide(['submit-btn','starterror','enderror','form']);
        document.getElementById('textar').style = 'display:block-inline';
      } else {
        showErrorMsgs();
      }
      break;
    case 'pause':
      if (formValidates()){
        onclickWrapper(document.getElementById('pause-btn').firstChild, 'data', true,'Pause Mapping', 'Resume Mapping',ajaxPauseStream,ajaxFormSubmit);
        onclickWrapper(document.getElementById('form').style, 'display', true, 'block', 'none');  
      } else {
        showErrorMsgs();
      }
      break;        
    case 'togCircVis':
      onclickWrapper(document.getElementById('togCircVis-btn').firstChild, 'data', true, 'Show Circles', 'Hide Circles', map._togCircVis.call(map));
      break;
    case 'clear':
      map._clearCircles();
      document.getElementById('togCircVis-btn').style.display = 'none';
      document.getElementById('togCircVis-btn').firstChild.data = 'Hide Circles';
      break;       
  }

  /*... onclickWrapper(elem, prop, toggleEnabled, newVal, oldVal, newOnClickMthd, oldOnClickMthd .................................*/ /*

  elem is the html element being changed, prop is what property of elem is being changed, oldVal is what prop starts as, newVal is what it finishes as, 
  toggleEnabled is a boolean value, and the last two inputs are optional callbacks. 

  If toggleEnabled is true, elem.prop will toggle back and for between oldVal and newVal. Zero, one, or two callbacks may also be accepted. With zero,
  no callbacks are fired. With one callback given, clickAction uses that callback for both toggle states. If two are, clickAction uses the first
  callback when elem.prop == newVal, and the second callback when elem.prop == oldVal.

  If toggleEnabled is false, zero, one, or two callbacks may be accepted. With zero, no callbacks are fired. With one, clickAction uses that action for 
  both toggle states. If two are, clickAction uses the first callback when elem.prop == oldVal, and the second callback when elem.prop == newval. If
  none are, no callbacks are fired. 

  Note: At the point that you would use this to change one value to another, with no callback, you're duplicating the logic of 
  document.getElementById.property = value. When I encountered that case, I used the native JS code. I wrote this, in the first place, because 
  of how space-intensive toggling the values was getting. Using it when it's not serving that purpose would make that all wasted effort. */ 

  function onclickWrapper(elem, prop, toggleEnabled, newVal, oldVal, newOnClickMthd, oldOnClickMthd){
    if(toggleEnabled) {
      elem[prop] == oldVal ? clickAction(newVal, oldOnClickMthd) : clickAction(oldVal, newOnClickMthd);
    } else {
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

  function batchHide(toBeHidden){
    toBeHidden.forEach(function(elem){
      document.getElementById(elem).style.display = 'none';
    })
  }

  function showErrorMsgs(){
    if (startErrMsg.length > 0){      
      document.getElementById('starterror').value = startErrMsg;
      document.getElementById('starterror').style.display = 'block';          
    }
    if (endErrMsg.length > 0) {  
      document.getElementById('enderror').value = endErrMsg;
      document.getElementById('enderror').style.display = 'block';          
    }
  }  
}