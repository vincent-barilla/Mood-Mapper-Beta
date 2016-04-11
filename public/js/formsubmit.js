// Sends data from the form to the server, so that it can form queries to Twitter. 
function formSubmit(){

  // Jumps the window to the map, after a form submission, and sets 'pauseBtn' to 'Pause'. 
  window.scrollTo(0, document.getElementById('bannerContentDiv').getBoundingClientRect().height + 15);      
  document.getElementById('pauseBtn').firstChild.data = 'Pause';

  // Send data to the server that has been serialized (i.e., put in url key-value pairs, in a string.)
  sendData(serializeForm());

  // Grab the data from the input fields in the form, convert them into the url-encoded pairs. 
  // Refer to Readme.md, "III. Why Track "lastId"?" for details on what the "lastId" does.  
  function serializeForm(){
    var data = {'subject': document.getElementById("subject").value,
                'start': document.getElementById("startdate").value,
                'end': document.getElementById("enddate").value};

    // Get the id for the Twitter request. 
    data.id = map._getLastId.call(map);

    var urlEncodedData = "";
    var urlEncodedDataPairs = [];

    // Loop through the "data" object, comprised of the user's input, and form a query string. 
    for (var name in data){
        urlEncodedDataPairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
    }

    // As the mode will be used as the request to the server in "sendData", I keep it outside the url-encoded
    // string, forming a 2-element array. (Note: "%20" represents a space.) 
    return [urlEncodedDataPairs.join('&').replace(/%20/g, '+'), document.getElementById("mode").value];
  }

  // Send the data from the form, in a url string, to the server for parsing. 
  function sendData(data){
    
    // data[1] will either be '/streamTweets' or '/getTweets'.
    xhr.open('POST', data[1], true);
    xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
    
    // The url-encoded key-value pairs are in data[0]. This is what the server will consume.
    xhr.send(data[0]);
    
    // Set the listener for when the response starts writing back from the server.
    xhr.onreadystatechange = function (){
      // Note the use of "LOADING": data will be usable before the request is "DONE".
      if ((this.readyState === XMLHttpRequest.LOADING || this.readyState === XMLHttpRequest.DONE) && this.status === 200) {
        var response = this.responseText;

        // '{"text":"'' delimits the start of a new tweet -- the flaw being, in theory, that if '{"text":"' occurs
        // in a tweet, the code will think everything subsequent is a new tweet. Luckily, I have not encountered that error
        // in practice, after thousands of trials.
        console.log(response); 
        var jsonTweet = JSON.parse(response.substring(response.lastIndexOf('{"text":"'), response.length));
        
        // Calling "geoCodeTweet" chains "createTweetCircle". Those two take the data from response all the way to the 
        // interactive map objects and links that make the front end's final view state.         
        geoCodeTweet(jsonTweet);
        // "updateMoodBoxes" changes the colors below the text crawl. 
        updateMoodBoxes(jsonTweet.stats.mood);         
      }
    }         
  }
}