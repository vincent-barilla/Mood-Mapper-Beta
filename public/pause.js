function pauseStream(){
  
  // Cutting off xhr (client request to server) isn't sufficient to cut off the server's connection
  // to Twitter. A ajax request to the server is thus sent, telling the streaming connection to 
  // also be aborted. 

  xhr.abort();      
  var pauseXhr = new XMLHttpRequest();
  pauseXhr.open('POST','../pauseStream', true);
  pauseXhr.setRequestHeader('Content-Type','text/plain');
  pauseXhr.send();

  pauseXhr.onreadystatechange = function(){
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200){
      console.log(this.responseText)
    } else {
      console.log('There was an error closing the streaming data.')
    }
  }
};      