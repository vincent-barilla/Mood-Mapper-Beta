// For context, this was the original proof-of-concept when I was figuring out
// how to get any data from the back end and turn it into colors on the front. I 
// started with returning an array of three randomized integers from "tweetAnalyzer"
// and displaying those as RGB colors here.
function updateMoodBoxes(mood){
  // "RGB" represents the averaged mood of the current search. 
  var RGB = [];
  // Update the colors every time data from the server's response is parsed.
  updateRGB();
  colorBox(document.getElementById('moodDiv'), mood);
  colorBox(document.getElementById('globalMoodDiv'), RGB);
  // Used for averaging the overall mood of all parsed tweets.
  globalMood.count++;

  // The helper function to update the mood of the session. 
  function updateRGB(){
    mood.forEach(function(value, i){
      globalMood.mood[i] += Number(value);
      RGB[i] = (globalMood.mood[i] / globalMood.count).toFixed(0);
    })
  }

  // Sets a given color as the background of a given box. 
  function colorBox(html, mood){
    mood = mood.toString();
    html.style = 'background-color: RGB(' + mood + ')';  
  }
} 