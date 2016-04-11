function formSubmit(){
  sendData(serializeForm());
  document.getElementById('togCircVis-btn').style.display = 'block';        
  
  function serializeForm(){
    var data = {'subject' : document.getElementById("subject").value,
                'start'   : document.getElementById("startdate").value,
                'end'     : document.getElementById("enddate").value};

    data.id = map._getLastId.call(map);

    var urlEncodedData = "";
    var urlEncodedDataPairs = [];

    for (var name in data){
        urlEncodedDataPairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
    }
    return [urlEncodedDataPairs.join('&').replace(/%20/g, '+'), document.getElementById("mode").value];
  }

  function sendData(data){
    xhr.open('POST', data[1], true);
    xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
    xhr.send(data[0]);
    xhr.onreadystatechange = function (){
      if ((this.readyState === XMLHttpRequest.LOADING || this.readyState === XMLHttpRequest.DONE) && this.status === 200) {
        var response = this.responseText;
        // '{"text":"'' delimits the start of a new tweet -- the flaw being, if '{"text":"' occurs
        // in a tweet, the code will think everything subsequent is a new tweet. 
        var jsonTweet = JSON.parse(response.substring(response.lastIndexOf('{"text":"'), response.length));
        geoCodeTweet(jsonTweet); //geoCodeTweet calls createTweetCircle. See circledraw.js to see the function.
        updateMoodBoxes(jsonTweet.stats.mood);           
      }
    }         
  }
}