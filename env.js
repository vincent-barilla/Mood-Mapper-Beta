// For oAuth 1.1 (Twitter streaming)
process.env['TWITTER_CONSUMER_KEY'] = "UaWIqAfAQpVaCVDBH00J4sfRK";
process.env['TWITTER_CONSUMER_SECRET'] = "XvZDvmkbt11JEIoX6mcYjfZm6UbXQVsXekOEjHtzjDYzfDcN63";
process.env['TWITTER_ACCESS_TOKEN_KEY'] = "3168061382-ohkKrBin00UF7rfwYJYGPeGJxpXpo4XHegBN77P";
process.env['TWITTER_ACCESS_TOKEN_SECRET'] = "cmexYA9DJSqq2WJfp79h5d7UylrIq87tXlJHvpHEMDyIO";

// For oAuth 1.2 (application-only usage of Twitter, the status searches)
process.env['BEARER_TOKEN_CREDENTIALS'] = process.env['TWITTER_CONSUMER_KEY'] + ":" + process.env['TWITTER_CONSUMER_SECRET'];
process.env['ENCODED_BEARER_TOKEN_CREDENTIALS'] = "VWFXSXFBZkFRcFZhQ1ZEQkgwMEo0c2ZSSzpYdlpEdm1rYnQxMUpFSW9YNm1jWWpmWm02VWJYUVZzWGVrT0VqSHR6akRZemZEY042Mw==";


