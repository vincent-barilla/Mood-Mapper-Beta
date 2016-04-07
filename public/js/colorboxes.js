// Originally this was only to test getting anything from the back end and 
// representing it with colors on the front end, but I think it's a neat
// addition to the overall app. It shows the averaged mood from all the 
// tweets, then also shows the mood of the current tweet.   
function updateMoodBoxes(mood){
  // "RGB" represents the overall mood of the current session. 
  var RGB = [];
  updateRGB();
  colorBox(document.getElementById('mood-div'), mood)
  colorBox(document.getElementById('globalMood-div'), RGB);
  globalMood.count++;

  // The heper function to update the mood of the session. 
  function updateRGB(){
    mood.forEach(function(value, i){
      globalMood.mood[i] += Number(value);
      RGB[i] = (globalMood.mood[i] / globalMood.count).toFixed(0);
    })
  }

  // A helper function to set a given html to a given color. 
  function colorBox(html, mood){
    mood = mood.toString();
    html.style = 'background-color: RGB(' + mood + ')';  
  }
} 