// Sends data from the form to the server so that it can make queries to Twitter. 
function formSubmit(){
  // Jumps the window to the map after a form submission.
  window.scrollTo(0, document.getElementById('bannerContentDiv').getBoundingClientRect().height + 15);
  // Set "pauseBtn" to "Pause" to keep views consistent with user's activity.      
  document.getElementById('pauseBtn').firstChild.data = 'Pause';
  // Send data to the server that has been serialized (i.e., put in url key-value pairs, in a string.)
  sendData(serializeForm());

  // Grab the data from the input fields in the form, convert them into the url-encoded pairs. 
  // Refer to Readme.md, "III. Why Track "lastId"?" for details on what the "lastId" does.  
  function serializeForm(){
    var data = {'subject': document.getElementById("subject").value,
                'start': document.getElementById("startdate").value,
                'end': document.getElementById("enddate").value};
    // Get the final tweet's from the last response. May be an empty string. 
    data.id = map._getLastId.call(map);
    var urlEncodedData = "";
    var urlEncodedDataPairs = [];
    // Loop through the "data" object, comprised of the user's input, and form a query string. 
    for (var name in data){
        urlEncodedDataPairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
    }
    // "mode" tells the server where to send the query parameters. Best kept separate from the query itself for easier access below.
    return [urlEncodedDataPairs.join('&').replace(/%20/g, '+'), document.getElementById('modeSelect').value];
  }

  // Send the data from the form, in a url string, to the server for parsing. 
  function sendData(data){
    // "data[1]" will either be '/streamTweets' or '/getTweets' ("mode", from the previous function).
    xhr.open('POST', data[1], true);
    xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
    // The url-encoded key-value pairs are in "data[0]". This is what the server will consume.
    xhr.send(data[0]);
    // Set the listener for when the server starts writing responses.
    xhr.onreadystatechange = function (){
      // Note the use of "LOADING": data will be usable before the request is "DONE".
      if ((this.readyState === XMLHttpRequest.LOADING || this.readyState === XMLHttpRequest.DONE) && this.status === 200) {
        var response = this.responseText;
        // '{"text":"'' delimits the start of a new tweet, according to assignment of "result" in "this.analyze" in "tweetAnalyzer.js"
        var jsonTweet = JSON.parse(response.substring(response.lastIndexOf('{"text":"'), response.length));        
        // Calling "geoCodeTweet" chains "createTweetCircle". Those two take the data from the response all the way to the 
        // interactive map objects and links that make up the front end's final view state.         
        geoCodeTweet(jsonTweet);
        // "updateMoodBoxes" changes the colors below the text crawl. 
        updateMoodBoxes(jsonTweet.stats.mood);         
      }
    }         
  }
}