function formSubmit(){

  // Send data to the server that has been serialized (i.e., put in url key-value pairs, in a string.)
  sendData(serializeForm());

  // Once the form is sent, show the button that has 'Hide Circles' and 'Show Circles' on it. 
  document.getElementById('togCircVis-btn').style.display = 'block';        
  
  // Grab the data from the input fields in the form, convert them into the url-encoded pairs. 
  // Also, data.id is storing the id of the last tweet that is returnd from the previous GET
  // request. If this is the first submission, it will be an empty string. This is used in the 
  // GET request query to Twitter, telling it to send tweet data from BEFORE this date. Without
  // this step, the user will keep getting the same batch of tweets over and over, if they choose
  // to request more Tweets with the same form parameters still in place. Changing the subject
  // of the form will reset this to an empty string. (Empty strings are fine for a request; 
  // by default, Twitter will send the newest tweets, and work to older ones from there.)
  function serializeForm(){
    var data = {'subject' : document.getElementById("subject").value,
                'start' : document.getElementById("startdate").value,
                'end' : document.getElementById("enddate").value};

    // Get the id for the Twitter request. 
    data.id = map._getLastId.call(map);

    var urlEncodedData = "";
    var urlEncodedDataPairs = [];

    for (var name in data){
        urlEncodedDataPairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
    }

    // As the mode will be used as part of the request in sendData, I keep it outside the url-encoded
    // string, and return an array with both separated.
    return [urlEncodedDataPairs.join('&').replace(/%20/g, '+'), document.getElementById("mode").value];
  }

  // Send the data from the form, in a url string, to the server for parsing. 
  function sendData(data){
    // data[1] will either be '/streamTweets' or '/getTweets', indicating the mode for the backend 
    //dispatcher.
    xhr.open('POST', data[1], true);
    xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
    xhr.send(data[0]);
    
    // I hold the request open for as long as is needed for the data to return, so the .LOADING state 
    // is used in addition to the .DONE state. Calling geoCodeTweet, when the data comes back from the 
    // server, chains createTweetCircle -- several hundred lines of code comprise those two functions,
    // contained in geocode.js and circledraw.js, taking the data from the server all the way to the 
    // interactive map objects and linksthat make the front end's final state.
    xhr.onreadystatechange = function (){
      if ((this.readyState === XMLHttpRequest.LOADING || this.readyState === XMLHttpRequest.DONE) && this.status === 200) {
        var response = this.responseText;

        // '{"text":"'' delimits the start of a new tweet -- the flaw being, if '{"text":"' occurs
        // in a tweet, the code will think everything subsequent is a new tweet. I have not encountered that error
        // in practice. 
        var jsonTweet = JSON.parse(response.substring(response.lastIndexOf('{"text":"'), response.length));
        geoCodeTweet(jsonTweet); 

        // For context, these two color boxes were from one of the early stages of this project. I
        //  randomized RGB() values for the returns from tweetAnalyzer, and sent them to the front end,
        // to show colors in these boxes.
        updateMoodBoxes(jsonTweet.stats.mood);           
      }
    }         
  }
}