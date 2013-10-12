/**** Local storage ***/
	Storage.prototype.setObj = function(key, obj) {
    return this.setItem(key, JSON.stringify(obj))
	}
	Storage.prototype.getObj = function(key) {
	    return JSON.parse(this.getItem(key))
	}

	/**** Locationing ****/

	var _radInKM = 1.0;

	// Calculate the distance given two points
	function rad(x) {return x*Math.PI/180;}
	function distHaversine(p1, p2) {
	  var R = 6371; // earth's mean radius in km
	  var dLat  = rad(p2.latitude - p1.latitude);
	  var dLong = rad(p2.longitude - p1.longitude);

	  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
	  Math.cos(rad(p1.latitude)) * Math.cos(rad(p2.latitude)) * Math.sin(dLong/2) * Math.sin(dLong/2);
	  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	  var d = R * c;

	  return d.toFixed(3);
	}

	function isCloseToEachOther(location1, location2){
		return distHaversine(location1, location2) < _radInKM;
	};

	/**********************/

	var prepared_message=new Object;
	var prepared_friends=new Object;
	var prepared_place= new Object;
	var prepared_event= new Object
	// Update UI to prompt user to login
	function promptLogin(request_message) {
		$('#showButton').removeAttr('disabled');
		$('#showButton').html(request_message);
		$('#showButton').off('click'); // remove previous click handler
		$('#showButton').click(clickToLoginHandler);
	}

	// Update UI to say it's ready to go!
	function promptStart() {
		// Sample call: Show name
		FB.api('/me?fields=name', function(response) {
			$('#showButton').html('Hello '+response.name+'!');
		});

		generateStatusMessage();
	}

	// Pad leading zero if needed
	function pad(number, length) {
		var str = '' + number;
		while (str.length < length) {
			str = '0' + str;
		}
		return str;
	}

	// Post Facebook status
	function postFBStatus(message, friends, place, myEvent) {
		alert(message)
				

		var parameters = {
			"access_token": fb_authResponse.accessToken,
			"message": message
			//"tags": friends.join(),
		};
		if (friends && friends!="") {
			parameters.tags =friends.join()
			alert(friends)

			}
		if (place) {
			parameters.place = place;
		}
		if (myEvent) {
			storeEvent(myEvent);
		}
        //TODO: Commenting this out during test
		//$.post( "https://graph.facebook.com/me/feed", parameters).done(function( data ) {
			alert("Posted!!");
		//});
	}

	// Get current location. Need callback
	function getCurrentLocation(callback) {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(function(position) {
				callback({ "latitude": position.coords.latitude, "longitude": position.coords.longitude });
			});
		}
	}

	// Some place far away because we don't need this for demo
	function getMyHomeLocation() {
		return {"latitude": 0, "longitude": 0};
	}

	// Prepare content, wait for user to post
	function preparePostContent(type,message, friends, place, myEvent) {
		prepared_message[type] = message;
		prepared_friends[type] = friends;
		prepared_place[type] = place;
		prepared_event[type] = myEvent;


		if (type=="event")
		$("#messageEvent").html(message);
		if (type=="weather")
		$("#messageWeather").html(message);
		if (type=="location")
		$("#messageLocation").html(message);
		// $("#friends..")
		$("#postButton").removeAttr("disabled");
	}

	// Return event attendees and my friends
	function getAttendingEventAndFriends(response) {

		// Prepare current date to be the same as response.event date format for comparison
		var current_events=0,all_events=0;
		var currentdate = new Date();
		var datetime = currentdate.getFullYear() + "-"
		+ pad(currentdate.getMonth()+1,2) + "-"
		+ pad(currentdate.getDate(),2) + "T"
		+ pad(currentdate.getHours(),2) + ":"
		+ pad(currentdate.getMinutes(),2) + ":"
		+ pad(currentdate.getSeconds(),2) + "-"
		+ pad(currentdate.getTimezoneOffset()/60,2) + "00" ;

		var results = {};

		for (var i=0; i<response.events.data.length; i++) {
      // If that event has both start & end time. Check whether current time is in the event's timeframe
      if (response.events.data[i].end_time) {
        // $('#events').append(response.events.data[i].end_time);
        if (response.events.data[i].end_time > datetime && response.events.data[i].start_time < datetime) {
					// :: Event result ::
					results.event = response.events.data[i];
					break;
				}
			}
      // Otherwise, that event is all-day. Just check whether current date is the same as event's
      else if (datetime.indexOf(response.events.data[i].start_time) != -1 ) {
    		// Return this event as a result
    		results.event = response.events.data[i];
    		break;
    	}
    }

    // Check if there's any attending event
    if (results.event != undefined) {
    	results.friends = [];
      // Search for people attending this event that are my friends
      var attendeesHash = {};
      for (var j=0; j<results.event.attending.data.length; j++) {
      	attendeesHash[results.event.attending.data[j].id] = true;
      }
      // Search for your friend and add him to the results
      for (var j=0; j<response.friends.data.length; j++) {
      	if (attendeesHash[response.friends.data[j].id] == true) {
	        // :: Append friend to result ::
	        results.friends.push(response.friends.data[j].id);
	      }
	    }
	  }
	  return results;
	}

	// Store "myEvent" into offline storage
	function storeEvent(myEvent) {
		eventHash=localStorage.getObj('eventHash');
		if (eventHash==null) {
			eventHash={};
			eventHash[myEvent.id] = myEvent;
		}
		else {
			eventHash[myEvent.id] = myEvent;
		}
	}

	// Search status mentioning about that place or event
	function searchStatusContainingEvent(myEvent) {
		eventHash=localStorage.getObj('eventHash');

		if (eventHash!=null)  {
			return eventHash[myEvent.id];
		}

		return null;
	}

	// Check if that event is recent < 1hr
	function isLessThan1HourAgo(myEvent) {

		startTime=new Date(myEvent.start_time);
		nowTime=new Date();
		difference=(nowTime-startTime)
		if (difference!=0)
			difference=difference/1000;

		if (difference<3600)
			return true;
		else
			return false;
	}

	function isLessThan5HourAgo(s) {
		return false;
	}

	function getEventTimeSpentPercent(e) {
		return 50;
	}

	function getNormalTemperatureNow(p) {
		return 70;
	}

	function getCurrentTemperatureNow(p) {
		return 65;
	}

	function getMessageTimeSpentPercent(timeSpentPercent) {
		if (timeSpentPercent<10)
			return "Feeling excited!!.. just started"
		if (40<timeSpentPercent && timeSpentPercent<60)
			return "Lets keep rolling..just half way done!!!"
		if (90<timeSpentPercent)
			return  "Almost done!.."
	}

	function generateStatusMessage() {
		// Get an object from FB.api about everything I need
		FB.api('/me?fields=name,events.fields(name,venue,attending.fields(id),end_time,start_time),friends.fields(id,name)', 
			function(response) {
				console.log("Got response from Graph API! "+response.name);
			// Also need to wait for location.
			getCurrentLocation(function(currentLocation) {
				// Got everything we need. Proceed!
				console.log("Got location!");
				// Is there a happenning event that I'm suppose to be attending now?
				// Results will be { "event": {..}, "friends": [..] }
				var eventAndFriends = getAttendingEventAndFriends(response);
				eventAndFriends.event = undefined; /*TEST*/
				if (eventAndFriends.event != undefined) {
					var myEvent = eventAndFriends.event;
					var friendsInEvent = eventAndFriends.friends;

					// Yes. Am I close to that event's location?
					var isCloseToEvent = isCloseToEachOther(currentLocation, myEvent.venue);
					// var isCloseToEvent = false; /*TEST*/
					if (isCloseToEvent) {
						// alert("I'm close to "+myEvent.name); return;

						// Yes. Have I posted a status about this event earlier?
						var status = searchStatusContainingEvent(myEvent);
						if (status) {
							//when a message about this event has been posted
							// Has he posted about it recently (1hr) ?
							if (isLessThan1HourAgo(status)) {
								// Get out of this logic
								// ** do nothing and proceed to next logic **
							} else {
								// More than 1 hour ago. Post the event progress!
								var timeSpentPercent = getEventTimeSpentPercent(myEvent);
								("event",
									"I am still at "+myEvent.name+". "+getMessageTimeSpentPercent(timeSpentPercent), // message
									[], // friends (no friends to avoid disturbing them)
									myEvent.venue.id, // place
									myEvent // event
									);
								//return;
							}
						} else {
							// No status about the event yet. Post a status about this event!
							//first time a event is retrieved
							preparePostContent("event",
								"I am at "+myEvent.name+"!", // message
								friendsInEvent, // tag every friend here!
								myEvent.venue.id, // place
								myEvent // event
								);
							//return;
						}
					} else {
						// I'm not close to that event. I must have missed it!
						preparePostContent("event",
							"I missed "+myEvent.name+" T_T", // message
							[], // no friend
							null, // no place
							null // no event
							);
						//return;
					}
				} else {
				// No happening event.
						preparePostContent("event",
							"Looking for events or passtimes. Any ideas?", // message
							[], // no friend
							null, // no place
							null // no event
							);

				}

				// Or just posted about that event recently (< 1hr)
				// Come to this logic!


				
				

					var averageDegree = getNormalTemperatureNow(currentLocation);
					var currentDegree = getCurrentTemperatureNow(currentLocation);

					if (currentDegree - averageDegree > 2) {
						// It's hotter than normal
						preparePostContent("weather",
							"OMG ..It's so hot in here!!", 
							[], // no friend
							null, // no place
							null // no event
							);
				
					} else if (currentDegree - averageDegree < -2) {
						// It's cooler than normal
						preparePostContent("weather",
							"Crazy weather, I'm freezing now!", 
							[], // no friend
							null, // no place
							null // no event
							);
					} else {
						preparePostContent("weather","bahhh boring weather.. same old!!", 
							[], // no friend
							null, // no place
							null // no event
							);
					}


				//	var pointOfInterest = getClosestPointOfInterest(currentLocation, function () {});

					getClosestPointOfInterest(currentLocation, function (pointOfInterest) {
					if (pointOfInterest) {
							// I'm closed to somewhere. So, have I posted about it recently?
							preparePostContent("location","I'm here! "+pointOfInterest.name);

							/*var status = searchStatusContainingPointOfInterest(pointOfInterest.name);
							if (isLessThan5HourAgo(status)) {
								// No use case for this.
								// ** do nothing **
							} else {
								// Check in here!
								preparePostContent("I'm here! "+pointOfInterest.name);
							}*/
						}	


					});
						

			}); // end callback of getCurrentLocation()

		}); // end decision tree

	}

	function postButtonClick(type) {

		postFBStatus(prepared_message[type], prepared_friends[type], prepared_place[type], prepared_event[type]);
	}