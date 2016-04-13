Explaining some of the denser coding blocks and general engineering concerns for this app: 

Intro -- A note on commenting: I tried to put the more extensive comments, especially
those that called for examples, here in the readme. References will be placed in the 
code to indicate when to use these comments.. 

I.     initWordBank()

  Read in data from a local file path, then reformat it into a wordBank that is tailored
  to the needs of tweetAnalyzer. A sample of the start product:
  
  		var wordFile = {'english':[ 
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
  
  		var wordBank = {'english': 
                         {'love': 4,
  								    	 'hate': -4},
  			        		'spanish': 
                         {'amor': 4,
  						 		   	   'odio': -4} };
  
  This allows for tweetAnalyzer to make rapid checks to see if a word is in a wordBank, 
  with the following: 
  
  		wordBank['english']['love']; // ==> 4  
      OR 	wordBank['english']['odio']; // ==> undefined
      OR  wordBank['spanish']['odio']; // ==> 4
  
  tweetAnalyzer checks the Tweet's language and assigns a wordBank accordingly every 
  time it is called. 
  

  
  
II. Concerns About Twitter Stream Usage Limits

  Note that I customize the get request (the stream), making a unique connection to Twitter 
  for each user. This is NOT a good solution, according to Twitter. Twitter will, in fact, 
  block accounts who make too many connections from the same IP address. 

  That's a big limitation to the streaming mode of my app. All the solutions that I can think 
  of would ask Twitter's public stream to do something it wasn't meant to. My best approach is 
  probably to just keep my code as is, demo for you the idea as I originally saw it, and then 
  wait on a new tech to come out. This may not take so long: Twitter is actually developing something 
  that	would be perfect for this app: Twitter's Site Streaming API is currently in closed beta, but,
  when open, it will do exactly what I'm talking about here -- make customized connections per user, 
  for many users, for your app. When Site Stream comes out, it should be an easy inclusion to this app. 




III.   Delimiting Stream Response
    
    /* What I did: 

      Data come in chunks, NOT complete tweets, so I use '\r\n{"created_at":"' to delimt the start 
      and end indices of new, whole tweets. I then take indexOf to get the first index of my delimiter,
      and lastIndexOf to get its last index. Using "endInd > startInd" precludes the possibility 
      that the substring was not found or that the delimiter only appears once: if it appears once, both 
      "lastIndexOf" and "indexOf" will return the same thing; if it doesn't appear at all, both will 
      equal -1. (This seemed dicey at first,to me, but it has held up very well. I've never, after thousands  
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
        that I could be returning to the front end. 

        Because the streaming is already very close to maxing out the geocoders on the front end, I'm leaving that alone. 
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

    All GET requests to Twitter using the same set of parameters will return the same batch of tweets 
    in response. For the user, this means he or she will see the same medley of circles show up on the 
    map over and over again, till the form values are changed and a new GET request sends. 

    To solve this, the id of the the last tweet must be stored. It can then be used in the "max_id" 
    parameter of the GET request. "mad_id" tells Twitter to only respond with tweets that are older* than the one 
    corresponding to this id. The user will now see all new tweets every time they hit "Submit" on the 
    front end, even if they use the identical form, multiple times.  

    Because this id only pertains to the current subject of a user's search, it will be wiped clean 
    every time the user changes subject. This is done via and 'onkeyup' callback to the subject input 
    box in "index.html". 

    Note that Twitter will accept a query string with "max_id=&next_param=value" -- an empty value for
     "max_id". This empty string is what "._getLastId" will return**. 

    * Twitter responds with newest-to-oldest ordering.
    ** See "initMap" in "init.js" for the function definition, and "formSubmit" in "formsubmit.js" for its use)



V.     toggleWithOptCb(elem, prop, newVal, oldVal, newOnClickMthd, oldOnClickMthd){

          /* Paraphrasing the arguments:

              elem: The html element you want to change. 
              prop: The property of that element you want to change. 
              newVal: The new value you want. 
              oldVal: The value it currently is, which it will then be toggled back to, on the next click. 
              newOnClickMthd: A callback that you want to fire whenever the button is clicked - OR - a callback
                              you want to fire only when the element's property is set to arguments[2]. Whether or not
                              there is a sixth argument determines between the two options. 
              oldOnClickMthd: A callback that you want to fire when the element's property is set to the value found 
                              in arguments[3]. Including this means the callback in agument[4] will be 
                              associated with the value in arguments[2].

          */

            elem[prop] == oldVal ? clickAction(newVal, oldOnClickMthd) : clickAction(oldVal, newOnClickMthd);
              
              /* What clickAction does, here:

                  If only the first 4 arguments are given, this function will toggle the element between 
                  oldVal and newVal, and not fire any callbacks. If there's one callback given, use that 
                  callback whenever this button is clicked. If both callbacks are given, use the first 
                  when element shows newVal, and the second when the element shows oldVal. 
              
                  I find it counter-intuitive to order the callbacks new before old, but doing so allows 
                  the single callback to be entered, and used for both sides of the toggle. That's why 
                  I ordered them as such.
              */

            function clickAction(value, callback){
              elem[prop] = value;

              /* What the "if" statement is doing:

                  This condition applies to when only the first callback is given. In that case, assign 
                  callback to "newOnClickMthd", and fire it whenever the button is clicked.

              */    
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
        though the contents have been changed (see the cases above for the assignment of 'src' of the iFrame,
        for where the contents are set.)

        My reason for doing this is to provide a smoother viewing experience of the help files. Without it,
        the user has to click once to open the iFrame, once more to close it, then a third time to reopen 
        it with new contents. This function cuts that down by one needless click. Or, if the user is finished with the
        iFrame, it'll still close after two clicks, so long as the same button is clicked twice in a row.

      */

      // All thsee values toggle between the iFrames visible/hidden states.       
      toggleWithOptCb(document.getElementById('bannerContentDiv').style, 'height', '500px','60px');
      toggleWithOptCb(document.getElementById('contentBtns').style, 'bottom', '3.5%','5px');      
      toggleWithOptCb(document.getElementById('banFrame').style,'visibility','visible','hidden');
    }

    /* Why wipe out the array, when length == 2? 
        
        This makes it so only the last two button clicks are considered. Notice that the 'push' at the start
        of this function ensures that the length will always be at least 1. When it is 1, the first toggle
        action -- here, showing the iFrame -- starts. If the two elements in the array are different, nothing
        happens -- the iFrame stays visible, while the above cases will have set its contents.

    */
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
    enough that I pass them both to the same helper function. bing rejected my CORS query attempt, so I use the
    request url as the src to a script, and include a callback in the request, such that the src script will grab
    the data from the src contents and pass it to createTweetCircle.





