  
function updateMoodBoxes(mood){
  var RGB = [];
  updateRGB();
  colorBox(document.getElementById('mood-div'), mood)
  colorBox(document.getElementById('globalMood-div'), RGB);
  globalMood.count++;

  function updateRGB(){
    mood.forEach(function(value, i){
      globalMood.mood[i] += Number(value);
      RGB[i] = (globalMood.mood[i] / globalMood.count).toFixed(0);
    })
  }

  function colorBox(html, mood){
    mood = mood.toString();
    html.style = 'background-color: RGB(' + mood + ')';  
  }
} 