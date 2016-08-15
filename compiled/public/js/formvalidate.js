'use strict';

// Simple form validation, on form submission. 
function formValidates(mode) {
  // Make sure the error messages from previous validation attempts aren't still showing.
  clearMessages();
  // Validate the subject for both modes, and also the dates in the GET mode.
  switch (mode) {
    case '/streamTweets':
      return checkSubject();
      break;
    case '/getTweets':
      return checkSubject() & checkDates();
      break;
  }

  function clearMessages() {
    var messageIds = ['subjecterror', 'starterror', 'enderror'];
    messageIds.forEach(function (id) {
      document.getElementById(id).innerHTML = '';
    });
    // Note that the next three are initialized in "initGlobals.js". Assign them here to overwrite any previous errors.    
    subjectErrMsg = '';
    startErrMsg = '';
    endErrMsg = '';
  }

  // Make sure the user entered a subject. It can be anything, including multiple words. 
  function checkSubject() {
    if (document.getElementById('subject').value.length == 0) {
      subjectErrMsg += 'Make sure you enter a subject.';
      return false;
    }
    return true;
  }

  function checkDates() {
    var start = document.getElementById('startdate').value;
    var end = document.getElementById('enddate').value;
    // The form dates must be used with the "Date" constructor to later do subtraction between dates.
    var startObj = new Date(start);
    var endObj = new Date(end);
    return withinWeek() & validStart() & hasFormat();

    // Use JS date subtraction to verify that the gap between now (current time) and the entered start date is less than 
    // 7 days (a week as per "Week", which is assigned in "initGlobals"). Add an error message if the condition fails. 
    function withinWeek() {
      var now = new Date();
      if (now - startObj < Week) {
        return true;
      } else {
        startErrMsg += 'That start date is too long ago. Twitter only allows searches that go roughly a week back. ';
        return false;
      }
    }

    // For a date range to be valid, the end can't be earlier than the start. Use "Date" subtraction to check this. 
    function validStart() {
      if (endObj - startObj > 0) {
        return true;
      } else {
        endErrMsg += 'Please make sure your end date is after your start date. ';
        return false;
      }
    }

    // "validStart" and "withinWeek" already validate the date numerically. Check for 'month/day/year' format
    // (single digit month and day values are fine). 
    function hasFormat() {
      // Use "checkFormat" to see if both end and start dates have the valid format. 
      var startIsValid = checkFormat(start);
      var endIsValid = checkFormat(end);
      // This error message is standard to both input boxes, so given scope outside the helper "setMsg".
      var formatErrMsg = 'Your format is incorrect. Please stick to month/day/year.';
      // Set error messages. These will be empty strings if the validation succeeded.
      startErrMsg = setMsg(startIsValid, startErrMsg);
      endErrMsg = setMsg(endIsValid, endErrMsg);
      // If format for both is are ok, return true. If either fails, return false.
      return startIsValid && endIsValid ? true : false;

      // Validate the format by splitting around '/', making sure there are three string chunks in the returned
      // array, and checking that each chunk has the expected length (1 or 2 for month or date, 4 for year).
      function checkFormat(date) {
        date = date.split('/');
        // Anything but 3 elements in "date" precludes the chance that any following logic validates the input. Return false.
        if (date.length != 3) {
          return false;
        } else {
          if (date[0].length > 0 && date[0].length < 3 && date[1].length > 0 && date[1].length < 3 && date[2].length === 4) {
            return true;
          }
        }
        // In case anything slips through the cracks, make a default return of false.  
        return false;
      }

      function setMsg(condition, errMsg) {
        // If the condition is false, see if the error message already is started, and if so, add 'Also: ', and 
        // always add "errMsg". If the condition is true, return "errMsg" unchanged.        
        if (!condition) {
          if (errMsg.length > 0) {
            errMsg += 'Also: ';
          }
          errMsg += formatErrMsg;
        }
        return errMsg;
      }
    }
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3B1YmxpYy9qcy9mb3JtdmFsaWRhdGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBLFNBQVMsYUFBVCxDQUF1QixJQUF2QixFQUE0QjtBQUMxQjtBQUNBO0FBQ0E7QUFDQSxVQUFPLElBQVA7QUFDRSxTQUFLLGVBQUw7QUFDRSxhQUFPLGNBQVA7QUFDQTtBQUNGLFNBQUssWUFBTDtBQUNFLGFBQU8saUJBQWlCLFlBQXhCO0FBQ0E7QUFOSjs7QUFTQSxXQUFTLGFBQVQsR0FBd0I7QUFDdEIsUUFBSSxhQUFhLENBQUMsY0FBRCxFQUFnQixZQUFoQixFQUE2QixVQUE3QixDQUFqQjtBQUNBLGVBQVcsT0FBWCxDQUFtQixVQUFTLEVBQVQsRUFBWTtBQUM3QixlQUFTLGNBQVQsQ0FBd0IsRUFBeEIsRUFBNEIsU0FBNUIsR0FBd0MsRUFBeEM7QUFDRCxLQUZEO0FBR0E7QUFDQSxvQkFBZ0IsRUFBaEI7QUFDQSxrQkFBYyxFQUFkO0FBQ0EsZ0JBQVksRUFBWjtBQUNEOztBQUVEO0FBQ0EsV0FBUyxZQUFULEdBQXVCO0FBQ3JCLFFBQUksU0FBUyxjQUFULENBQXdCLFNBQXhCLEVBQW1DLEtBQW5DLENBQXlDLE1BQXpDLElBQW1ELENBQXZELEVBQXlEO0FBQ3ZELHVCQUFpQixnQ0FBakI7QUFDQSxhQUFPLEtBQVA7QUFDRDtBQUNELFdBQU8sSUFBUDtBQUNEOztBQUVELFdBQVMsVUFBVCxHQUFxQjtBQUNuQixRQUFJLFFBQVEsU0FBUyxjQUFULENBQXdCLFdBQXhCLEVBQXFDLEtBQWpEO0FBQ0EsUUFBSSxNQUFNLFNBQVMsY0FBVCxDQUF3QixTQUF4QixFQUFtQyxLQUE3QztBQUNBO0FBQ0EsUUFBSSxXQUFXLElBQUksSUFBSixDQUFTLEtBQVQsQ0FBZjtBQUNBLFFBQUksU0FBUyxJQUFJLElBQUosQ0FBUyxHQUFULENBQWI7QUFDQSxXQUFRLGVBQWUsWUFBZixHQUE4QixXQUF0Qzs7QUFFQTtBQUNBO0FBQ0EsYUFBUyxVQUFULEdBQXFCO0FBQ25CLFVBQUksTUFBTSxJQUFJLElBQUosRUFBVjtBQUNBLFVBQUssTUFBTSxRQUFQLEdBQW1CLElBQXZCLEVBQTRCO0FBQzFCLGVBQU8sSUFBUDtBQUNELE9BRkQsTUFFTztBQUNKLHVCQUFlLDZGQUFmO0FBQ0QsZUFBTyxLQUFQO0FBQ0Q7QUFDRjs7QUFFRDtBQUNBLGFBQVMsVUFBVCxHQUFxQjtBQUNuQixVQUFLLFNBQVMsUUFBVixHQUFzQixDQUExQixFQUE0QjtBQUMxQixlQUFPLElBQVA7QUFDRCxPQUZELE1BRU87QUFDSCxxQkFBYSwyREFBYjtBQUNGLGVBQU8sS0FBUDtBQUNEO0FBQ0Y7O0FBRUQ7QUFDQTtBQUNBLGFBQVMsU0FBVCxHQUFvQjtBQUNsQjtBQUNBLFVBQUksZUFBZSxZQUFZLEtBQVosQ0FBbkI7QUFDQSxVQUFJLGFBQWEsWUFBWSxHQUFaLENBQWpCO0FBQ0E7QUFDQSxVQUFJLGVBQWUsMkRBQW5CO0FBQ0E7QUFDQSxvQkFBYyxPQUFPLFlBQVAsRUFBcUIsV0FBckIsQ0FBZDtBQUNBLGtCQUFZLE9BQU8sVUFBUCxFQUFtQixTQUFuQixDQUFaO0FBQ0E7QUFDQSxhQUFRLGdCQUFnQixVQUFqQixHQUErQixJQUEvQixHQUFzQyxLQUE3Qzs7QUFFQTtBQUNBO0FBQ0EsZUFBUyxXQUFULENBQXFCLElBQXJCLEVBQTBCO0FBQ3hCLGVBQU8sS0FBSyxLQUFMLENBQVcsR0FBWCxDQUFQO0FBQ0E7QUFDQSxZQUFJLEtBQUssTUFBTCxJQUFlLENBQW5CLEVBQXFCO0FBQ25CLGlCQUFPLEtBQVA7QUFDRCxTQUZELE1BRU87QUFDTCxjQUFNLEtBQUssQ0FBTCxFQUFRLE1BQVIsR0FBaUIsQ0FBakIsSUFBc0IsS0FBSyxDQUFMLEVBQVEsTUFBUixHQUFpQixDQUF4QyxJQUNDLEtBQUssQ0FBTCxFQUFRLE1BQVIsR0FBaUIsQ0FBakIsSUFBc0IsS0FBSyxDQUFMLEVBQVEsTUFBUixHQUFpQixDQUR4QyxJQUVDLEtBQUssQ0FBTCxFQUFRLE1BQVIsS0FBbUIsQ0FGekIsRUFFNEI7QUFDMUIsbUJBQU8sSUFBUDtBQUNEO0FBQ0Y7QUFDRDtBQUNBLGVBQU8sS0FBUDtBQUNEOztBQUVELGVBQVMsTUFBVCxDQUFnQixTQUFoQixFQUEyQixNQUEzQixFQUFrQztBQUNoQztBQUNBO0FBQ0EsWUFBSSxDQUFDLFNBQUwsRUFBZTtBQUNiLGNBQUcsT0FBTyxNQUFQLEdBQWdCLENBQW5CLEVBQXFCO0FBQ25CLHNCQUFVLFFBQVY7QUFDRDtBQUNELG9CQUFVLFlBQVY7QUFDRDtBQUNELGVBQU8sTUFBUDtBQUNEO0FBQ0Y7QUFDRjtBQUNGIiwiZmlsZSI6ImZvcm12YWxpZGF0ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFNpbXBsZSBmb3JtIHZhbGlkYXRpb24sIG9uIGZvcm0gc3VibWlzc2lvbi4gXG5mdW5jdGlvbiBmb3JtVmFsaWRhdGVzKG1vZGUpe1xuICAvLyBNYWtlIHN1cmUgdGhlIGVycm9yIG1lc3NhZ2VzIGZyb20gcHJldmlvdXMgdmFsaWRhdGlvbiBhdHRlbXB0cyBhcmVuJ3Qgc3RpbGwgc2hvd2luZy5cbiAgY2xlYXJNZXNzYWdlcygpO1xuICAvLyBWYWxpZGF0ZSB0aGUgc3ViamVjdCBmb3IgYm90aCBtb2RlcywgYW5kIGFsc28gdGhlIGRhdGVzIGluIHRoZSBHRVQgbW9kZS5cbiAgc3dpdGNoKG1vZGUpe1xuICAgIGNhc2UgJy9zdHJlYW1Ud2VldHMnOlxuICAgICAgcmV0dXJuIGNoZWNrU3ViamVjdCgpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnL2dldFR3ZWV0cyc6XG4gICAgICByZXR1cm4gY2hlY2tTdWJqZWN0KCkgJiBjaGVja0RhdGVzKCk7IFxuICAgICAgYnJlYWs7ICAgXG4gIH1cblxuICBmdW5jdGlvbiBjbGVhck1lc3NhZ2VzKCl7XG4gICAgdmFyIG1lc3NhZ2VJZHMgPSBbJ3N1YmplY3RlcnJvcicsJ3N0YXJ0ZXJyb3InLCdlbmRlcnJvciddO1xuICAgIG1lc3NhZ2VJZHMuZm9yRWFjaChmdW5jdGlvbihpZCl7XG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCkuaW5uZXJIVE1MID0gJyc7XG4gICAgfSk7XG4gICAgLy8gTm90ZSB0aGF0IHRoZSBuZXh0IHRocmVlIGFyZSBpbml0aWFsaXplZCBpbiBcImluaXRHbG9iYWxzLmpzXCIuIEFzc2lnbiB0aGVtIGhlcmUgdG8gb3ZlcndyaXRlIGFueSBwcmV2aW91cyBlcnJvcnMuICAgIFxuICAgIHN1YmplY3RFcnJNc2cgPSAnJzsgICAgXG4gICAgc3RhcnRFcnJNc2cgPSAnJzsgXG4gICAgZW5kRXJyTXNnID0gJyc7IFxuICB9XG5cbiAgLy8gTWFrZSBzdXJlIHRoZSB1c2VyIGVudGVyZWQgYSBzdWJqZWN0LiBJdCBjYW4gYmUgYW55dGhpbmcsIGluY2x1ZGluZyBtdWx0aXBsZSB3b3Jkcy4gXG4gIGZ1bmN0aW9uIGNoZWNrU3ViamVjdCgpe1xuICAgIGlmIChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3ViamVjdCcpLnZhbHVlLmxlbmd0aCA9PSAwKXtcbiAgICAgIHN1YmplY3RFcnJNc2cgKz0gJ01ha2Ugc3VyZSB5b3UgZW50ZXIgYSBzdWJqZWN0Lic7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNoZWNrRGF0ZXMoKXsgXG4gICAgdmFyIHN0YXJ0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0YXJ0ZGF0ZScpLnZhbHVlOyBcbiAgICB2YXIgZW5kID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2VuZGRhdGUnKS52YWx1ZTsgXG4gICAgLy8gVGhlIGZvcm0gZGF0ZXMgbXVzdCBiZSB1c2VkIHdpdGggdGhlIFwiRGF0ZVwiIGNvbnN0cnVjdG9yIHRvIGxhdGVyIGRvIHN1YnRyYWN0aW9uIGJldHdlZW4gZGF0ZXMuXG4gICAgdmFyIHN0YXJ0T2JqID0gbmV3IERhdGUoc3RhcnQpOyBcbiAgICB2YXIgZW5kT2JqID0gbmV3IERhdGUoZW5kKTsgXG4gICAgcmV0dXJuICh3aXRoaW5XZWVrKCkgJiB2YWxpZFN0YXJ0KCkgJiBoYXNGb3JtYXQoKSk7IFxuXG4gICAgLy8gVXNlIEpTIGRhdGUgc3VidHJhY3Rpb24gdG8gdmVyaWZ5IHRoYXQgdGhlIGdhcCBiZXR3ZWVuIG5vdyAoY3VycmVudCB0aW1lKSBhbmQgdGhlIGVudGVyZWQgc3RhcnQgZGF0ZSBpcyBsZXNzIHRoYW4gXG4gICAgLy8gNyBkYXlzIChhIHdlZWsgYXMgcGVyIFwiV2Vla1wiLCB3aGljaCBpcyBhc3NpZ25lZCBpbiBcImluaXRHbG9iYWxzXCIpLiBBZGQgYW4gZXJyb3IgbWVzc2FnZSBpZiB0aGUgY29uZGl0aW9uIGZhaWxzLiBcbiAgICBmdW5jdGlvbiB3aXRoaW5XZWVrKCl7IFxuICAgICAgdmFyIG5vdyA9IG5ldyBEYXRlKCk7IFxuICAgICAgaWYgKChub3cgLSBzdGFydE9iaikgPCBXZWVrKXsgXG4gICAgICAgIHJldHVybiB0cnVlOyBcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICBzdGFydEVyck1zZyArPSAnVGhhdCBzdGFydCBkYXRlIGlzIHRvbyBsb25nIGFnby4gVHdpdHRlciBvbmx5IGFsbG93cyBzZWFyY2hlcyB0aGF0IGdvIHJvdWdobHkgYSB3ZWVrIGJhY2suICc7XG4gICAgICAgIHJldHVybiBmYWxzZTsgXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRm9yIGEgZGF0ZSByYW5nZSB0byBiZSB2YWxpZCwgdGhlIGVuZCBjYW4ndCBiZSBlYXJsaWVyIHRoYW4gdGhlIHN0YXJ0LiBVc2UgXCJEYXRlXCIgc3VidHJhY3Rpb24gdG8gY2hlY2sgdGhpcy4gXG4gICAgZnVuY3Rpb24gdmFsaWRTdGFydCgpeyBcbiAgICAgIGlmICgoZW5kT2JqIC0gc3RhcnRPYmopID4gMCl7IFxuICAgICAgICByZXR1cm4gdHJ1ZTsgXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVuZEVyck1zZyArPSAnUGxlYXNlIG1ha2Ugc3VyZSB5b3VyIGVuZCBkYXRlIGlzIGFmdGVyIHlvdXIgc3RhcnQgZGF0ZS4gJztcbiAgICAgICAgcmV0dXJuIGZhbHNlOyBcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBcInZhbGlkU3RhcnRcIiBhbmQgXCJ3aXRoaW5XZWVrXCIgYWxyZWFkeSB2YWxpZGF0ZSB0aGUgZGF0ZSBudW1lcmljYWxseS4gQ2hlY2sgZm9yICdtb250aC9kYXkveWVhcicgZm9ybWF0XG4gICAgLy8gKHNpbmdsZSBkaWdpdCBtb250aCBhbmQgZGF5IHZhbHVlcyBhcmUgZmluZSkuIFxuICAgIGZ1bmN0aW9uIGhhc0Zvcm1hdCgpeyBcbiAgICAgIC8vIFVzZSBcImNoZWNrRm9ybWF0XCIgdG8gc2VlIGlmIGJvdGggZW5kIGFuZCBzdGFydCBkYXRlcyBoYXZlIHRoZSB2YWxpZCBmb3JtYXQuIFxuICAgICAgdmFyIHN0YXJ0SXNWYWxpZCA9IGNoZWNrRm9ybWF0KHN0YXJ0KTtcbiAgICAgIHZhciBlbmRJc1ZhbGlkID0gY2hlY2tGb3JtYXQoZW5kKTtcbiAgICAgIC8vIFRoaXMgZXJyb3IgbWVzc2FnZSBpcyBzdGFuZGFyZCB0byBib3RoIGlucHV0IGJveGVzLCBzbyBnaXZlbiBzY29wZSBvdXRzaWRlIHRoZSBoZWxwZXIgXCJzZXRNc2dcIi5cbiAgICAgIHZhciBmb3JtYXRFcnJNc2cgPSAnWW91ciBmb3JtYXQgaXMgaW5jb3JyZWN0LiBQbGVhc2Ugc3RpY2sgdG8gbW9udGgvZGF5L3llYXIuJztcbiAgICAgIC8vIFNldCBlcnJvciBtZXNzYWdlcy4gVGhlc2Ugd2lsbCBiZSBlbXB0eSBzdHJpbmdzIGlmIHRoZSB2YWxpZGF0aW9uIHN1Y2NlZWRlZC5cbiAgICAgIHN0YXJ0RXJyTXNnID0gc2V0TXNnKHN0YXJ0SXNWYWxpZCwgc3RhcnRFcnJNc2cpXG4gICAgICBlbmRFcnJNc2cgPSBzZXRNc2coZW5kSXNWYWxpZCwgZW5kRXJyTXNnKVxuICAgICAgLy8gSWYgZm9ybWF0IGZvciBib3RoIGlzIGFyZSBvaywgcmV0dXJuIHRydWUuIElmIGVpdGhlciBmYWlscywgcmV0dXJuIGZhbHNlLlxuICAgICAgcmV0dXJuIChzdGFydElzVmFsaWQgJiYgZW5kSXNWYWxpZCkgPyB0cnVlIDogZmFsc2U7XG5cbiAgICAgIC8vIFZhbGlkYXRlIHRoZSBmb3JtYXQgYnkgc3BsaXR0aW5nIGFyb3VuZCAnLycsIG1ha2luZyBzdXJlIHRoZXJlIGFyZSB0aHJlZSBzdHJpbmcgY2h1bmtzIGluIHRoZSByZXR1cm5lZFxuICAgICAgLy8gYXJyYXksIGFuZCBjaGVja2luZyB0aGF0IGVhY2ggY2h1bmsgaGFzIHRoZSBleHBlY3RlZCBsZW5ndGggKDEgb3IgMiBmb3IgbW9udGggb3IgZGF0ZSwgNCBmb3IgeWVhcikuXG4gICAgICBmdW5jdGlvbiBjaGVja0Zvcm1hdChkYXRlKXtcbiAgICAgICAgZGF0ZSA9IGRhdGUuc3BsaXQoJy8nKTtcbiAgICAgICAgLy8gQW55dGhpbmcgYnV0IDMgZWxlbWVudHMgaW4gXCJkYXRlXCIgcHJlY2x1ZGVzIHRoZSBjaGFuY2UgdGhhdCBhbnkgZm9sbG93aW5nIGxvZ2ljIHZhbGlkYXRlcyB0aGUgaW5wdXQuIFJldHVybiBmYWxzZS5cbiAgICAgICAgaWYgKGRhdGUubGVuZ3RoICE9IDMpe1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoIChkYXRlWzBdLmxlbmd0aCA+IDAgJiYgZGF0ZVswXS5sZW5ndGggPCAzKSBcbiAgICAgICAgICAgICYmIChkYXRlWzFdLmxlbmd0aCA+IDAgJiYgZGF0ZVsxXS5sZW5ndGggPCAzKVxuICAgICAgICAgICAgJiYgKGRhdGVbMl0ubGVuZ3RoID09PSA0KSl7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gXG4gICAgICAgIC8vIEluIGNhc2UgYW55dGhpbmcgc2xpcHMgdGhyb3VnaCB0aGUgY3JhY2tzLCBtYWtlIGEgZGVmYXVsdCByZXR1cm4gb2YgZmFsc2UuICBcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBzZXRNc2coY29uZGl0aW9uLCBlcnJNc2cpe1xuICAgICAgICAvLyBJZiB0aGUgY29uZGl0aW9uIGlzIGZhbHNlLCBzZWUgaWYgdGhlIGVycm9yIG1lc3NhZ2UgYWxyZWFkeSBpcyBzdGFydGVkLCBhbmQgaWYgc28sIGFkZCAnQWxzbzogJywgYW5kIFxuICAgICAgICAvLyBhbHdheXMgYWRkIFwiZXJyTXNnXCIuIElmIHRoZSBjb25kaXRpb24gaXMgdHJ1ZSwgcmV0dXJuIFwiZXJyTXNnXCIgdW5jaGFuZ2VkLiAgICAgICAgXG4gICAgICAgIGlmICghY29uZGl0aW9uKXtcbiAgICAgICAgICBpZihlcnJNc2cubGVuZ3RoID4gMCl7XG4gICAgICAgICAgICBlcnJNc2cgKz0gJ0Fsc286ICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVyck1zZyArPSBmb3JtYXRFcnJNc2c7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVyck1zZztcbiAgICAgIH1cbiAgICB9XG4gIH0gICBcbn0gICJdfQ==