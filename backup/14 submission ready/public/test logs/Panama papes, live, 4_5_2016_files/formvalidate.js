function formValidates(mode){
  if (mode == '/streamTweets'){
    return true;
  }
  
  var start    = document.getElementById('startdate').value;
  var end      = document.getElementById('enddate').value;
  var startObj = new Date(start);
  var endObj   = new Date(end);
  startErrMsg  = '';
  endErrMsg    = '';
  // & forces all to be checked; && would stop checking if first is invalidated. Needed to see all error messages.
  return (withinWeek() & validStart() & hasFormat());

  function withinWeek(){
    var now = new Date();
    if ((now - startObj) < Week){
      return true; 
    } else {
       startErrMsg += 'That start date is too long ago. Twitter only allows searches that go roughly a week back. ';
      return false;
    }
  }

  function validStart(){
    if ((endObj - startObj) > 0){
      return true;    
    } else {
        endErrMsg += 'Please make sure your end date is after your start date. '
      return false;
    }
  }

  function hasFormat(){
    if (!checkSizes(start)){
      if (startErrMsg.length > 0){
        startErrMsg += 'Also: '
      }
      startErrMsg += 'Your format is incorrect. Please stick to day/month/year.'
    }
    if (!checkSizes(end)){
      if (endErrMsg.length > 0){
        endErrMsg += 'Also: '
      }        
      endErrMsg += 'Your format is incorrect. Please stick to day/month/year.' 
    }
    return (checkSizes(end) && checkSizes(start)) ? true : false;

    function checkSizes(date){
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
  }
}  