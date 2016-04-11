// Sends data from the form to the server, so that it can form queries to Twitter. 
function formSubmit(){

  // For DOM settings that do not toggle in buttonhandle, but rather occur only when the form submits, 
  // their commands go here. 
  window.scrollTo(0, document.getElementById('bannerDiv').getBoundingClientRect().height);      
  document.getElementById('pauseBtn').firstChild.data = 'Pause';

  // Send data to the server that has been serialized (i.e., put in url key-value pairs, in a string.)
  sendData(serializeForm());

  // Grab the data from the input fields in the form, convert them into the url-encoded pairs. 
  // "data.id" is storing the id of the last tweet from the previous GET request.  This is used in the 
  // GET request query to Twitter, telling it to send tweet data with an id SMALLER than this 
  // (smaller meaning, made previous to this), so the user will keep getting new tweets, even if 
  // he/she keeps submitting the same form. 
  function serializeForm(){
    var data = {'subject' : document.getElementById("subject").value,
                'start' : document.getElementById("startdate").value,
                'end' : document.getElementById("enddate").value};

    // Get the id for the Twitter request. 
    data.id = map._getLastId.call(map);

    var urlEncodedData = "";
    var urlEncodedDataPairs = [];

    // Loop through the "data" object and form a query string. 
    for (var name in data){
        urlEncodedDataPairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
    }

    // As the mode will be used as the request to the server in "sendData", I keep it outside the url-encoded
    // string. "%20" represents a space. 
    return [urlEncodedDataPairs.join('&').replace(/%20/g, '+'), document.getElementById("mode").value];
  }

  // Send the data from the form, in a url string, to the server for parsing. 
  function sendData(data){
    // data[1] will either be '/streamTweets' or '/getTweets'. 
    xhr.open('POST', data[1], true);
    xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
    xhr.send(data[0]);
    
    // Calling "geoCodeTweet", when the data comes back from the server, chains "createTweetCircle". Those two
    // functions take the data from the server all the way to the interactive map objects and links that make
    // the front end's final view state.
    xhr.onreadystatechange = function (){
      if ((this.readyState === XMLHttpRequest.LOADING || this.readyState === XMLHttpRequest.DONE) && this.status === 200) {
        var response = this.responseText;

        // '{"text":"'' delimits the start of a new tweet -- the flaw being, in theory, that if '{"text":"' occurs
        // in a tweet, the code will think everything subsequent is a new tweet. I have not encountered that error
        // in practice, after thousands of trials. 
        var jsonTweet = JSON.parse(response.substring(response.lastIndexOf('{"text":"'), response.length));
        geoCodeTweet(jsonTweet); 

        // For context, these two color boxes were from one of the early stages of this project. I
        // randomized RGB() values for the returns from tweetAnalyzer, and sent them to the front end,
        // to show colors in these boxes.
        updateMoodBoxes(jsonTweet.stats.mood);           
      }
    }         
  }
}