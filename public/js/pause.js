// Cutting off "xhr" (client request to server) isn't sufficient to cut off the server's connection
// to Twitter. An ajax request to the server is thus sent, telling the streaming connection to 
// also be aborted. ("xhr" is global as per "initGlobals" in "initGlobals.js").
function pauseStream(){
  
  // Abort the client-server connection within the app. This stops the mapping.
  xhr.abort();

  // No need to send the "kill Twitter stream" command if the user has been watching mapping from a GET request.
  if (document.getElementById('mode').value = '/streamTweets'){      
    var pauseXhr = new XMLHttpRequest();
    // Generate the POST query to send to the server.
    pauseXhr.open('POST','../pauseStream', true);
    pauseXhr.setRequestHeader('Content-Type','text/plain');
    // Tell the server to cut off its Twitter stream. 
    pauseXhr.send();
    // Listen for when the request has finished.
    pauseXhr.onreadystatechange = function(){
      // This condition being true will indicate the Twitter streaming connection was successfully severed. 
      if (this.readyState === XMLHttpRequest.DONE && this.status === 200){
        console.log(this.responseText)
      } else {
        console.log('There was an error closing the streaming data.')
      }
    }
  }  
};       