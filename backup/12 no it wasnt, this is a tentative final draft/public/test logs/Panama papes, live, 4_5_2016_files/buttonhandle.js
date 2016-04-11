// Execute functions according to button clicks. Note the flexibility in the logic of clickWrapper(a,b,c,d,e,f) --
// it MUST have the first 4 arguments, but also works with either 5 or 6 args (extras as optional callbacks).
function buttonHandler(source){
  var name = source.name;
  var mode = document.getElementById('mode').value;
  switch (name){
    case 'mapOnly':
      onclickWrapper(document.getElementById('togTextVis-btn').firstChild, 'data', true, 'Show Text Crawl', 'Hide Text Crawl');
      onclickWrapper(document.getElementById('text-div').style, 'display', true, 'none', 'block-inline');      
      //onclickWrapper(document.getElementById('map').style, 'width', true, '100%', '73%');
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
        document.getElementById('map').style = 'width:73%'
        document.getElementById('text-div').style = 'display:block-inline';
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

  function onclickWrapper(elem, prop, toggleEnabled, newVal, oldVal, newOnClickMthd, oldOnClickMthd){
          console.log('old val is: ' + oldVal + ' and newVal is: ' + newVal); console.log (' and the actual value is: ' + document.getElementById('text-div').style.display)
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

  function resetGlobals(){
    map._clearCircles();
    globalMood = {"mood" : [0,0,0], "count" : 1 };
    document.getElementById('text-div').innerHTML = '';
    document.getElementById('togCircVis-btn').style.display = 'none';
    document.getElementById('togCircVis-btn').firstChild.data = 'Hide Circles';    
  }

  function batchHide(toBeHidden){
    toBeHidden.forEach(function(elem){
      document.getElementById(elem).style.display = 'none';
    })
  }

  function showErrorMsgs(){
    if (startErrMsg.length > 0){      
      document.getElementById('starterror').innerHTML = startErrMsg;
      document.getElementById('starterror').style.display = 'block';          
    }
    if (endErrMsg.length > 0) {  
      document.getElementById('enderror').innerHTML = endErrMsg;
      document.getElementById('enderror').style.display = 'block';          
    }
  }  
}