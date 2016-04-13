Contents:

(Order within each group is alphabetical, not the order in which the scripts need to be invoked.)

Server files: 
  server.js        - Main server.
  dispatcher.js    - Gets the requests from the server, parses them, sends them onward for further processing.
  restServlet.js   - Make queries for Twitter RESTful API.
  streamServlet.js - Make queries for Twitter streaming API.
  tweetAnalyzer.js - Analyze a tweet's text for inferred mood.

Data files: 
    public/AFINN/JSON/MasterList.json - AFINN word list.

Help files: 
    Readme.md             - Readme for the whole project.
    public/aboutThis.html - About the app.
    public/mapTips.html   - About map features.

Mark-up and styles: 
    public/css/style.css - CSS style sheet.
    public/index.html    - Home view markup.

Front-end JS files:  
    public/js/buttonhandle.js - All buttons invoke one handler, it then executes actions according to what was pushed.
    public/js/colorboxes.js   - Update averaged tweet moods as RGB colors.
    public/js/formsubmit.js   - Send user parameters to the server (server.js).
    public/js/formvalidate.js - Make sure user input is valid.
    public/js/initDisplays.js - Initialize several DOM view states on page load.
    public/js/initGlobals.js  - Initialize several global variables on page load.
    public/js/pause.js        - Pause mapping, sever connection to Twitter stream API.

Google Map-specific JS files:  
    public/map_scripts/circledraw.js - Draw a color-coded circle for each tweet on the map. 
    public/map_scripts/geocode.js    - Take a tweet's location string, query a geocoder service, get coordinates. 
    public/map_scripts/init.js       - Initialize the Google Map. 

    

Explaining some of the denser coding blocks and general engineering concerns for this app: 

A note on commenting: I tried to put the more extensive comments, especially
those that called for examples, here in the readme. References will be placed in the 
code to indicate when to use these comments.

I.     initWordBank()

  Read in data from a local file path, then reformat it into a wordBank that is tailored
  to the needs of tweetAnalyzer. A sample of the start product:
  
  		var wordFile = {
      'english':[ 
                   {'word': 'love',
      				  	 'score': 4},
      				     {'word': 'hate',
      				     'score': -4} ],
       'spanish':[ 
                   {'word': 'amor',
      	    			 'score': 4},
      	     			 {'word': 'odio',
      	     			 'score': -4} ] };
  
   And a sample of the end product:
  
  		var wordBank = {
      'english': 
                 {'love': 4,
					    	 'hate': -4},
  		'spanish': 
                 {'amor': 4,
			 		   	   'odio': -4} };
  
  This allows for tweetAnalyzer to make rapid checks to see if a word is in a wordBank, 
  with the following: 
  
  		    wordBank['english']['love']; // ==> 4  
      OR 	wordBank['english']['odio']; // ==> undefined
      OR  wordBank['spanish']['odio']; // ==> -4
  
  There are multiple wordBanks available for each analysis. tweetAnalyzer checks the Tweet's language and assigns 
  a wordBank accordingly every time it is called. 
  

  
  
II. Concerns About Twitter Stream Usage Limits

  Note that I customize the get request (the stream) to Twitter for each user. This is not a good solution, 
  according to Twitter. Twitter may, in fact, block apps that make too many connections from the same IP address. 

  That's a big limitation to the streaming mode of my app. Luckily, Twitter is developing something 
  that would solve this problem perfectly: Twitter's Site Streaming API is currently in closed beta, but,
  when open, it will do exactly what I'm talking about -- make customized connections per user, 
  for many users, for an app. 

  When Site Stream comes out, it should be an easy inclusion to this app. Till then, I'm going to leave 
  things as they are, consider the streaming mode of my app in a closed beta stage itself, rather than try 
  developing work-arounds to make the public streaming API do something it really is not meant to. 



III.   Delimiting Stream Response
    
    /* What I did: 

      Data come in chunks, NOT complete tweets, so I use '\r\n{"created_at":"' to delimt the start 
      and end indices of new, whole tweets. I then take indexOf to get the first index of my delimiter,
      and lastIndexOf to get its last index. Using "endInd > startInd" precludes the possibility 
      that the substring was not found or that the delimiter only appears once: if it appears once, both 
      "lastIndexOf" and "indexOf" will return the same thing; if it doesn't appear at all, both will 
      equal -1. (This seemed dicey at first, to me, but it has held up very well. I've never, after thousands  
      of trials, had the delimiters fail.) 
    
    */  

    twitResponse.addListener('data', function(data){ 
      string += data; 
      startInd = string.indexOf('\r\n{"created_at":"'); 
      endInd = string.lastIndexOf('\r\n{"created_at":"');

      /* The downside to what I did, and why I have left it as-is: 

        I use startInd and endInd to pull out the entire tweet, pass it through tweetAnalyzer, reset the 
        string for the next incoming tweet, and write the result, in JSON, back to the front end. 

        The downside: setting string to "" wipes out the tail of the string, which could have been coupled with the 
        beginning of the next data chunk to form another tweet. This means I'm losing about half the tweets 
        that I could be returning to the client. 

        But, because the streaming is already very close to maxing out the geocoders on the front end, I'm leaving that alone. 
        Losing tweets actually acts as a de facto throttling measure; fixing it would double the load on geocoders, 
        which they cannot support. If I can further boost the geocoders, then I can support the additional load. 

      */

      if (endInd > startInd){ 
        tweet = string.substring(startInd, endInd); 
        result = TweetAnalyzer.analyze(JSON.parse(tweet), wordBank);
        string = "";        
        response.write(JSON.stringify(result));
        console.log(JSON.stringify(result));
        console.log('\n')
	

	
IV.     Why Track "lastId"? 

  GET requests to Twitter using the same set of parameters will usually return the same batch of tweets 
  in response. For the user, this means he or she will see the same medley of circles show up on the 
  map over and over again, till the form values are changed and a new GET request sends. 

  To solve this, the id of the the last tweet that reached the client must be stored, so it can then be 
  used in the "max_id" parameter of the next Twitter GET request. "max_id" tells Twitter to respond with 
  only tweets that are older than the one corresponding to this id. The user will now see all new tweets 
  every time they hit "Submit" on the front end, even if they use the identical form multiple times.  

  Because "lastId" only pertains to the current parameters of a user's search, it will be wiped clean 
  every time the user changes the input. This is done via an 'onkeyup' callback on all the input 
  boxes in "index.html". 
 

  Note: Twitter responds with newest-to-oldest ordering in its tweets; the "max_id" tells Twitter to send tweets
  with an "id" smaller than this number.



V.     toggleWithOptCb(elem, prop, newVal, oldVal, newOnClickMthd, oldOnClickMthd){

          /* Paraphrasing the arguments:

              elem: The html element you want to change. 
              prop: The property of that element you want to change. 
              newVal: The new value you want that property to have. 
              oldVal: The value the property currently has, which it will then be toggled back to, on the next click. 
              newOnClickMthd: A callback that you want to fire whenever the button is clicked - OR - a callback
                              you want to fire only when the element's property is set to arguments[2]. Whether or not
                              there is a sixth argument determines between the two options. 
              oldOnClickMthd: A callback that you want to fire when the element's property is set to the value found 
                              in arguments[3]. Including this means the callback in agument[4] will be 
                              associated with the value in arguments[2].

              In other words: Add one callback, and calling toggleWithOptCb fires it whenever a button is clicked, while
              toggling a view state simultaneously. Add a second callback to have the callbacks toggle their firing
              to coincide to the toggling view states.

          */

            elem[prop] == oldVal ? clickAction(newVal, oldOnClickMthd) : clickAction(oldVal, newOnClickMthd);
              
              /* What clickAction does, here:

                  If only the first 4 arguments are given, this function will toggle the element between 
                  oldVal and newVal, and not fire any callbacks. If there's one callback given, use that 
                  callback whenever this button is clicked. If both callbacks are given, use the first 
                  when element shows newVal, and the second when the element shows oldVal. 

              */

            function clickAction(value, callback){
              elem[prop] = value;
              if (!callback && newOnClickMthd){
                callback = newOnClickMthd;
              }

              // If no callback is given, nothing happens here, and this function only toggles the "elem[prop]".
              if (callback){        
                callback();
              }
            }
          }



VI. function preventCrossToggling(source){

    /* What this does, in a nutshell: 

      If 'banFrame' is hidden and minimized, maximize and show it. This will contain how-to info for 
      the app. As two buttons set the 'src' of the iFrame, this function checks to make sure one button isn't 
      toggling 'hidden' when the other one is expecting 'visible.'
    
    /*  

    togSources.push(source);
 
    if (togSources.length == 1 || togSources[0] == togSources[1]){

      /* What happens when the length is either one, or both elements are the same?  

        If only one source has been kept track of so far, go ahead and let it start its toggle action. Then,
        the next time a button is clicked, compare it to the first one. If they're different, then do not 
        let the first button's action be un-toggled. 

        In practice, this means either 'action' or 'mapHowTo' can toggle the iFrame to be visible, but it
        will only toggle to be hidden if the same button is clicked consecutively. If the user first 
        clicks one button to open the iFrame, then clicks the other button, iFrame now will stay open, even 
        though the contents have been changed.

      */

      // All thsee values toggle between the iFrames visible/hidden states.       
      toggleWithOptCb(document.getElementById('bannerContentDiv').style, 'height', '500px','60px');
      toggleWithOptCb(document.getElementById('contentBtns').style, 'bottom', '3.5%','5px');      
      toggleWithOptCb(document.getElementById('banFrame').style,'visibility','visible','hidden');
    }
    // Here's the reset to [], whenever a second click, regardless of source, calls this function.
    if (togSources.length == 2){
      togSources = [];
    }
  }



VII.      Comments on Geocoding Usage:

  I've found that geocoders are not very well-suited for streaming live data. They'll briefly stop working
  if you exceed some per-second query limit which is not clearly stated in the documentation. To work around
  this, I spread the workload over four geocoders: Google, mapQuest, Open Cage, and bing. This alleviates
  the issue of maxing out the per-second limit for most instances, the exception being when you're tracking
  a massively trending topic. As a recent example, Villanova won the NCAA championship in dramatic fashion. 
  When I used "Villanova" immediately after the game as my subject in live streaming mode, the four geocoders 
  couldn't keep up for very long.

  I implement the group of geocoders with a 'turnstileCount' variable in a switch statement. 'turnstileCount'
  has four possible values, 0-3, each representing one of the geocoders. In the case for the current geocoder,
  it increments 'turnstileCount' by one, so that, the next time this function is called, the next case in line
  will be used. When it hits the end of the line, case 3, 'turnstileCount' is reset to 0, and the process begins
  again.  

  Google comes equipped with a geocoder constructor, which I utilize, and Open Cage and mapQuest are similar
  enough that I pass them both to the same helper function. bing rejected my query attempt due to lack of CORS support, 
  so I use the request url as the src to a script, and include a callback in the request, such that the src
  script will grab the data from the src contents and pass it to createTweetCircle as soon as it is assigned into 
  bingScript (initialized in "index.html", in the header's script tags).







