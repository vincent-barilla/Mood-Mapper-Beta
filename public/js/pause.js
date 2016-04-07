function pauseStream(){
  
  // Cutting off xhr (client request to server) isn't sufficient to cut off the server's connection
  // to Twitter. An ajax request to the server is thus sent, telling the streaming connection to 
  // also be aborted.

  // Abort the client-server connection within the app. 
  xhr.abort();      
  var pauseXhr = new XMLHttpRequest();
  pauseXhr.open('POST','../pauseStream', true);
  pauseXhr.setRequestHeader('Content-Type','text/plain');

  // Sending this ajax request will tell the server to cut off its Twitter stream. 
  pauseXhr.send();

  pauseXhr.onreadystatechange = function(){
    // This state will indicate the Twitter streaming connection was successfully severed. 
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200){
      console.log(this.responseText)
    } else {
      console.log('There was an error closing the streaming data.')
    }
  }
};      