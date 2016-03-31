// For oAuth 1.1 (Twitter streaming)
process.env['TWITTER_CONSUMER_KEY']        = "UaWIqAfAQpVaCVDBH00J4sfRK";
process.env['TWITTER_CONSUMER_SECRET']     = "XvZDvmkbt11JEIoX6mcYjfZm6UbXQVsXekOEjHtzjDYzfDcN63";
process.env['TWITTER_ACCESS_TOKEN_KEY']    = "3168061382-ohkKrBin00UF7rfwYJYGPeGJxpXpo4XHegBN77P";
process.env['TWITTER_ACCESS_TOKEN_SECRET'] = "cmexYA9DJSqq2WJfp79h5d7UylrIq87tXlJHvpHEMDyIO";

// For oAuth 1.2 (application-only usage of Twitter, the status searches)
process.env['BEARER_TOKEN_CREDENTIALS']         = process.env['TWITTER_CONSUMER_KEY'] + ":" + process.env['TWITTER_CONSUMER_SECRET'];
process.env['ENCODED_BEARER_TOKEN_CREDENTIALS'] = "VWFXSXFBZkFRcFZhQ1ZEQkgwMEo0c2ZSSzpYdlpEdm1rYnQxMUpFSW9YNm1jWWpmWm02VWJYUVZzWGVrT0VqSHR6akRZemZEY042Mw==";
process.env['BEARER_ACCESS_TOKEN']              = "AAAAAAAAAAAAAAAAAAAAANazuAAAAAAAJEN7WlBpaEkjxSoBtqmT1FYAp2U%3DcAWPTNT0KWQddAuKhntfkiBgNy68EZLd0GxiylkpCemBiwBY3r";

/* 

	Code used to generate process.end['ENCODED_BEARER_TOKEN_CREDENTIALS'] = btoa(process.end['BEARER_TOKEN_CREDENTIALS']); // btoa == Javascript's base64 encoder
	
	Code used to generate process.env['BEARER_TOKEN']:

	var https = require('https');

	(function requestAuthFromTwit(){

		var options = {
			'path'	  : '/oauth2/token',
			'host'    : 'api.twitter.com',
			'method'  : 'POST',
			'headers' : {'Content-Type'  : 'application/x-www-form-urlencoded;charset=UTF-8',
						         'Authorization': 'Basic ' + process.env.ENCODED_BEARER_TOKEN_CREDENTIALS}
		};

		var req = new https.request(options, function(res){
			var responseString = '';

			res.on('data', function(data){
				responseString += data;
			});

			res.on('end', function(){
				console.log("Bearer tok: " + responseString);
			});
		});

		req.end('grant_type=client_credentials');	
	})()
*/	

