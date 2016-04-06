function formValidates(mode){

  // The stream mode operates without dates and any subject is searchable, so no validation needs to be done
  // if the mode == '/streamTweets'. Always return true.
  if (mode == '/streamTweets'){ 
    return true;               
  }                        
  
  // There's only one other mode, so if the above condition wasn't satisified, the user is using the RESTful search.
  // As this search is date-dependent, user entries for dates must be validated. These variables will set up the 
  // below functions to check differences between current time, user-entered start and end dates, and update error
  // messages as any of the conditions fail.
  var start = document.getElementById('startdate').value; 
  var end = document.getElementById('enddate').value; 
  var startObj = new Date(start); 
  var endObj = new Date(end); 
  // Note that the next two are initialized in index.html, giving them global scope for later use with the DOM. 
  startErrMsg = ''; 
  endErrMsg = ''; 

  // One '&' forces all to be checked, hence all error messages updated. '&&'' would stop checking if first returns false.
  return (withinWeek() & validStart() & hasFormat()); 

  // Use JS date subtraction to verify that the gap between now (current time) and the entered start date is less than 
  // 7 days (a week as per Week, which is assigned in index.html). Add an error message if the condition fails. 
  function withinWeek(){ 
    var now = new Date(); 
    if ((now - startObj) < Week){ 
      return true; 
    } else {
       startErrMsg += 'That start date is too long ago. Twitter only allows searches that go roughly a week back. ';
      return false; 
    }
  }

  // For a date range to be valid, the end can't be earlier than the start. Use Date subtraction to check this. 
  function validStart(){ 
    if ((endObj - startObj) > 0){ 
      return true; 
    } else {
        endErrMsg += 'Please make sure your end date is after your start date. ';
      return false; 
    }
  }

  // validStart and withinWeek already validate the date numerically. This makes sure it's in the format 
  // month/day/year (single digit month and day values are fine.). 
  function hasFormat(){ 
    var startIsValid = checkFormat(start);
    var endIsValid = checkFormat(end);
    var formatError = 'Your format is incorrect. Please stick to month/day/year.';
    startErrMsg = setMsg(startIsValid, startErrMsg)
    endErrMsg = setMsg(endIsValid, endErrMsg)
    return (startIsValid && endIsValid) ? true : false;

    // Validate the format by splitting around '/', making sure there are three string chunks in the returned
    // array, and checking that each chunk has the expected length (1 or 2 for month or date, 4 for year).
    function checkFormat(date){
      date = date.split('/');
      if (date.length != 3){
        return false;
      } else {
        if ( (date[0].length > 0 && date[0].length < 3) 
          && (date[1].length > 0 && date[1].length < 3)
          && (date[2].length === 4)){
          return true;
        }
      }  
      return false;
    }

    // If the condition is false, see if the error message already is started, add 'Also: ' if so, then always 
    // add the format string. Note that, if the condition is true, the errMsg is returned unchanged. 
    function setMsg(condition, errMsg){
      if (!condition){
        if(errMsg.length > 0){
          errMsg += 'Also: ';
        }
        errMsg += formatError;
      }
      return errMsg;
    }
  }
}  