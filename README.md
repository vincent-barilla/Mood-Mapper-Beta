# HR project
testing heroku setup for HR project

Explaining some of the denser coding blocks: 



I. initWordBank()

   Read in data from a local file path, then reformat it into a wordBank that is tailored to the 
   needs of tweetAnalyzer. A sample of the start product:
  
  		var wordFile = {'english':[ {'word': 'love',
  									'score': 4},
  								    {'word': 'hate',
  								    'score': -4} ],
  					    'spanish':[ {'word': 'amor',
  					    			'score': 4},
  					     			{'word': 'odio',
  					     			'score': -4} ] };
  
   And a sample of the end product:
  
  		var wordBank = {'english': {'love': 4,
  									'hate': -4},
  						'spanish': {'amor': 4,
  						 			'odio': -4}};
  
  This allows for tweetAnalyzer to make rapid checks to see if a word is in a wordBank, with the following: 
  
  		wordBank['english']['love']; // ==> 4  
      OR 	wordBank['english']['odio']; // ==> undefined
      OR  wordBank['spanish']['odio']; // ==> 4
  
  tweetAnalyzer checks the Tweet's language and assigns a wordBank accordingly every time it is called. 
  
  
  
II. Concerns about Twitter stream usage limits (see streamServlet.js)

	Note that I customize the get request (the stream), making a unique connection to Twitter for each user. This is NOT a good solution, according to Twitter. Twitter will, in fact, block access to accounts who make too many connections from the same IP address. 

	That's a big limitation to the streaming mode of my app. A possible workaround would be to make one stream for the entire server, remove all filtering (or try to -- there would have to be something to define my request query), then receive the user parameters, make a filter from them, and apply this filter as a response.addListener('data', function(data){//and here I parse data}) to the server's stream. The user is then listening to a global stream for matches of their parameters. 

	I don't like that solution, insofar as it means flooding the server with this generalized stream of tweets, of which the user(s) only cares about a tiny percent. Also, I doubt I could make a filter to detect 100% of all relevant tweets from the global stream, which will already be diluted by huge amounts of irrelevant tweets, so the user ends up seeing a much less interesting stream. 

	All other solutions that I can think of would similarly ask Twitter's public stream to do something it wasn't meant to. My best solution is probably to just keep my code as is, demo for you the idea as I originally saw it, and then wait on a new tech to come out. This may not take so long: Twitter is actually developing something that	would be perfect for this app: Twitter's Site Streaming API is currently in closed beta, but, when open, it will do exactly what I'm talking about here -- make customized connections per user, for many users, for your app. When Site Stream comes out, it should be an easy inclusion to this app. 
	
	
	
III. onclickWrapper(elem, prop, toggleEnabled, newVal, oldVal, newOnClickMthd, oldOnClickMthd)

  elem is the html element being changed, prop is what property of elem is being changed, oldVal is what prop starts as, newVal is what it finishes as, toggleEnabled is a boolean value, and the last two inputs are optional callbacks. 

  If toggleEnabled is true, elem.prop will toggle back and for between oldVal and newVal. Zero, one, or two callbacks may also be accepted. With zero, no callbacks are fired. With one callback given, clickAction uses that callback for both toggle states. If two are, clickAction uses the first callback when elem.prop == newVal, and the second callback when elem.prop == oldVal.

  If toggleEnabled is false, zero, one, or two callbacks may be accepted. With zero, no callbacks are fired. With one, clickAction uses that action for both toggle states. If two are, clickAction uses the first callback when elem.prop == oldVal, and the second callback when elem.prop == newval. If none are, no callbacks are fired. 

  Note: At the point that you would use this to change one value to another, with no callback, you're duplicating the logic of 
document.getElementById.property = value. When I encountered that case, I used the native JS code. I wrote this, in the first place, because of how space-intensive toggling the values was getting. Using it when it's not serving that purpose would make that all wasted effort. 
	




