/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var _map = null;
var _marker = null;
 function showMapa()
 {
	 document.getElementById('searchInput').value = "";

 $.ajax({
   url: 'https://maps.app.goo.gl/SCf33',
   type: "GET",
   //datatype: 'application/JSON',
   async: false,
   success:function( data ){alert("HERE");},
   error: function (xhr, status) {
       console.log(xhr.statusText);
       console.log(status);
    }
});
	 alert("ACA");
     _marker.setPosition(null);
     _marker.setMap(null);
     var latlong = {lat: 24.801522, lng:84.995989};
     if(_map == null )
        _map = new google.maps.Map(document.getElementById('map_area'), {zoom: 17});
     _map.setCenter(latlong);
     _marker.setMap(_map);
     setTimeout(function(){  $("#myPopup").popup("open", { transition: "slideup"   }); document.getElementById('searchInput').focus();}, 300);

    // alert("HERE");
 }

 function placeMarker(location) {
        _marker.setPosition(location);
 }
var app = {
    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
		let _mapOptions = {	zoom: 17,
							center: {lat: 24.801522, lng: 84.995989},
							disableDefaultUI: true
						  };
        _map = new google.maps.Map(document.getElementById('map_area'),_mapOptions);
        _marker = new google.maps.Marker({});

        google.maps.event.addListener(_map, 'click', function(event) {
           placeMarker(event.latLng);
        });

		 var input = document.getElementById('searchInput');
		_map.controls[google.maps.ControlPosition.TOP_CENTER].push(input);
		var markers = [];

		//var searchBox = new google.maps.places.SearchBox(input);
														var options = {
														  		types: ['geocode'],
														  		componentRestrictions: {country: "cl"}
																};
												var searchBox = new google.maps.places.Autocomplete(input, options);
		google.maps.event.addListener(searchBox, 'place_changed', function()  {
		var place = searchBox.getPlace();
			console.log(place);
			if (place.geometry.viewport) 	_map.fitBounds(place.geometry.viewport);
			else							_map.setCenter(place.geometry.location);
         _marker.setPosition(place.geometry.location);
		 _map.setZoom(16);
		 _map.setCenter(place.geometry.location);
        });
		/*
searchBox.addListener('places_changed', function() {
          var places = searchBox.getPlaces();

          if (places.length == 0) {
            return;
          }

          // Clear out the old markers.
          markers.forEach(function(marker) {
            marker.setMap(null);
          });
          markers = [];

          // For each place, get the icon, name and location.
          var bounds = new google.maps.LatLngBounds();
          places.forEach(function(place) {
            if (!place.geometry) {
              console.log("Returned place contains no geometry");
              return;
            }
            var icon = {
              url: place.icon,
              size: new google.maps.Size(71, 71),
              origin: new google.maps.Point(0, 0),
              anchor: new google.maps.Point(17, 34),
              scaledSize: new google.maps.Size(25, 25)
            };

            // Create a marker for each place.
            markers.push(new google.maps.Marker({
              map: _map,
              icon: icon,
              title: place.name,
              position: place.geometry.location
            }));

            if (place.geometry.viewport) {
              // Only geocodes have viewport.
              bounds.union(place.geometry.viewport);
            } else {
              bounds.extend(place.geometry.location);
            }
          });
          _map.fitBounds(bounds);
        });
		*/
        $("#botonLogin").on("click", function(){showMapa();});

        $("#btnAcceptMap").on("click", function(){alert(_marker.getPosition().lat());$("#myPopup").popup("close");});
        $("#btnCancelMap").on("click", function(){$("#myPopup").popup("close");});


    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
        //this.receivedEvent('deviceready');
    },

    // Update DOM on a Received Event
    receivedEvent: function(id) {
        // var parentElement = document.getElementById(id);
        // var listeningElement = parentElement.querySelector('.listening');
        // var receivedElement = parentElement.querySelector('.received');
        //
        // listeningElement.setAttribute('style', 'display:none;');
        // receivedElement.setAttribute('style', 'display:block;');
        //
        // console.log('Received Event: ' + id);
    }
};

app.initialize();
