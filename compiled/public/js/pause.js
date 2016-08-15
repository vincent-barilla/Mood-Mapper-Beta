'use strict';

// Cutting off "xhr" (client request to server) isn't sufficient to cut off the server's connection
// to Twitter. An ajax request to the server is thus sent, telling the streaming connection to 
// also be aborted. ("xhr" is global as per "initGlobals" in "initGlobals.js").
function pauseStream() {
  // Abort the client-server connection within the app. This stops the mapping.
  xhr.abort();
  // No need to send the "kill Twitter stream" command if the user has been mapping from a GET request.
  if (document.getElementById('modeSelect').value == '/streamTweets') {
    var pauseXhr = new XMLHttpRequest();
    // Generate the POST query to send to the server.
    pauseXhr.open('POST', '../pauseStream', true);
    pauseXhr.setRequestHeader('Content-Type', 'text/plain');
    // Tell the server to cut off its Twitter stream. 
    pauseXhr.send();
    // Listen for when the request has finished.
    pauseXhr.onreadystatechange = function () {
      // This condition being true will indicate the Twitter streaming connection was successfully severed. 
      if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        console.log(this.responseText);
      } else {
        console.log('There was an error closing the streaming data.');
      }
    };
  }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3B1YmxpYy9qcy9wYXVzZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBLFNBQVMsV0FBVCxHQUFzQjtBQUNwQjtBQUNBLE1BQUksS0FBSjtBQUNBO0FBQ0EsTUFBSSxTQUFTLGNBQVQsQ0FBd0IsWUFBeEIsRUFBc0MsS0FBdEMsSUFBK0MsZUFBbkQsRUFBbUU7QUFDakUsUUFBSSxXQUFXLElBQUksY0FBSixFQUFmO0FBQ0E7QUFDQSxhQUFTLElBQVQsQ0FBYyxNQUFkLEVBQXFCLGdCQUFyQixFQUF1QyxJQUF2QztBQUNBLGFBQVMsZ0JBQVQsQ0FBMEIsY0FBMUIsRUFBeUMsWUFBekM7QUFDQTtBQUNBLGFBQVMsSUFBVDtBQUNBO0FBQ0EsYUFBUyxrQkFBVCxHQUE4QixZQUFVO0FBQ3RDO0FBQ0EsVUFBSSxLQUFLLFVBQUwsS0FBb0IsZUFBZSxJQUFuQyxJQUEyQyxLQUFLLE1BQUwsS0FBZ0IsR0FBL0QsRUFBbUU7QUFDakUsZ0JBQVEsR0FBUixDQUFZLEtBQUssWUFBakI7QUFDRCxPQUZELE1BRU87QUFDTCxnQkFBUSxHQUFSLENBQVksZ0RBQVo7QUFDRDtBQUNGLEtBUEQ7QUFRRDtBQUNGIiwiZmlsZSI6InBhdXNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ3V0dGluZyBvZmYgXCJ4aHJcIiAoY2xpZW50IHJlcXVlc3QgdG8gc2VydmVyKSBpc24ndCBzdWZmaWNpZW50IHRvIGN1dCBvZmYgdGhlIHNlcnZlcidzIGNvbm5lY3Rpb25cbi8vIHRvIFR3aXR0ZXIuIEFuIGFqYXggcmVxdWVzdCB0byB0aGUgc2VydmVyIGlzIHRodXMgc2VudCwgdGVsbGluZyB0aGUgc3RyZWFtaW5nIGNvbm5lY3Rpb24gdG8gXG4vLyBhbHNvIGJlIGFib3J0ZWQuIChcInhoclwiIGlzIGdsb2JhbCBhcyBwZXIgXCJpbml0R2xvYmFsc1wiIGluIFwiaW5pdEdsb2JhbHMuanNcIikuXG5mdW5jdGlvbiBwYXVzZVN0cmVhbSgpe1xuICAvLyBBYm9ydCB0aGUgY2xpZW50LXNlcnZlciBjb25uZWN0aW9uIHdpdGhpbiB0aGUgYXBwLiBUaGlzIHN0b3BzIHRoZSBtYXBwaW5nLlxuICB4aHIuYWJvcnQoKTtcbiAgLy8gTm8gbmVlZCB0byBzZW5kIHRoZSBcImtpbGwgVHdpdHRlciBzdHJlYW1cIiBjb21tYW5kIGlmIHRoZSB1c2VyIGhhcyBiZWVuIG1hcHBpbmcgZnJvbSBhIEdFVCByZXF1ZXN0LlxuICBpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21vZGVTZWxlY3QnKS52YWx1ZSA9PSAnL3N0cmVhbVR3ZWV0cycpeyAgICAgIFxuICAgIHZhciBwYXVzZVhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIC8vIEdlbmVyYXRlIHRoZSBQT1NUIHF1ZXJ5IHRvIHNlbmQgdG8gdGhlIHNlcnZlci5cbiAgICBwYXVzZVhoci5vcGVuKCdQT1NUJywnLi4vcGF1c2VTdHJlYW0nLCB0cnVlKTtcbiAgICBwYXVzZVhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCd0ZXh0L3BsYWluJyk7XG4gICAgLy8gVGVsbCB0aGUgc2VydmVyIHRvIGN1dCBvZmYgaXRzIFR3aXR0ZXIgc3RyZWFtLiBcbiAgICBwYXVzZVhoci5zZW5kKCk7XG4gICAgLy8gTGlzdGVuIGZvciB3aGVuIHRoZSByZXF1ZXN0IGhhcyBmaW5pc2hlZC5cbiAgICBwYXVzZVhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpe1xuICAgICAgLy8gVGhpcyBjb25kaXRpb24gYmVpbmcgdHJ1ZSB3aWxsIGluZGljYXRlIHRoZSBUd2l0dGVyIHN0cmVhbWluZyBjb25uZWN0aW9uIHdhcyBzdWNjZXNzZnVsbHkgc2V2ZXJlZC4gXG4gICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09PSBYTUxIdHRwUmVxdWVzdC5ET05FICYmIHRoaXMuc3RhdHVzID09PSAyMDApe1xuICAgICAgICBjb25zb2xlLmxvZyh0aGlzLnJlc3BvbnNlVGV4dClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdUaGVyZSB3YXMgYW4gZXJyb3IgY2xvc2luZyB0aGUgc3RyZWFtaW5nIGRhdGEuJylcbiAgICAgIH1cbiAgICB9XG4gIH0gIFxufTsgICAgICAgIl19