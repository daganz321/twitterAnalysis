if (Meteor.isClient) {

  Meteor.startup(function() {
    GoogleMaps.load();
  });

  Template.searchForElasticSearch.events({
    'click button': function () {
      //console.log(target.topic.value);
      var userTopic = document.getElementById('topic').value;
      var userLatitude = document.getElementById('latitude').value;
      var userLongitude = document.getElementById('longitude').value;
      var userDistance = document.getElementById('distance').value;

          /*GoogleMaps.maps.map.instance.clearMarkers = function() {
            for(var i=0; i < this.markers.length; i++){
                this.markers[i].setMap(null);
            }
            this.markers = new Array();
          };*/
          //google.maps.map.instance.setMapOnAll(null);
          //var thisMap = new google.maps.Map(document.getElementById("map"));
          var thisMap = GoogleMaps.maps.map.instance;

            Meteor.call("elasticSearchGET", userLatitude, userLongitude, userDistance, userTopic, function(error, results) {
              if(!error){
                //GoogleMaps.ready('map', function(map) {
                    var theRealData = JSON.parse(results);
                    //console.log(results);
                    var theArray = theRealData.hits.hits;
                    var myLatLng = {};
                    //console.log(JSON.stringify(theArray));
                    
                    console.log('hits: ' + theRealData.hits.total);
                     for(var i=0; i<theRealData.hits.total; i++){
                        //console.log(theArray[i]["_id"]);
                         myLatLng = {lat: theArray[i]['_source']['location']['lat'], lng: theArray[i]['_source']['location']['lon']};
                        //console.log(myLatLng);
                        //console.log(theArray[i]['_source']['tweet_text']);
                        var marker = new google.maps.Marker({
                          position: myLatLng,
                          map: GoogleMaps.maps.map.instance,
                          animation: google.maps.Animation.DROP,
                          title: theArray[i]['_source']['tweet_text']
                        });

                    }
                    //google.maps.map.LatLng(userLatitude, userLongitude);
                  //});
              }
            });

              //return {
                   // center: new google.maps.LatLng(userLatitude, userLongitude),
                   // zoom: 8
                  //};
    }
  });

  Template.map.helpers({  
    mapOptions: function() {
      if (GoogleMaps.loaded()) {
        return {
          center: new google.maps.LatLng(37.322078, -121.931466),//focus on 7 Stars, my favorite bar
          zoom: 8
        };
      }
    }
  });


  Template.body.onCreated(function() {
    // We can use the `ready` callback to interact with the map API once the map is ready.
    GoogleMaps.ready('exampleMap', function(map) {
      // Add a marker to the map once it's ready
      var marker = new google.maps.Marker({
        position: map.options.center,
        map: map.instance
      });
    });
  });






  Template.map.onCreated(function() {  
    GoogleMaps.ready('map', function(map) {
      google.maps.event.addListener(map.instance, 'click', function(event) {
        console.log('lat: ' + event.latLng.lat());
        console.log('long: ' + event.latLng.lng());
        Meteor.call("checkTwitter", event.latLng.lat(), event.latLng.lng(), function(error, results) {

        });


       





      });


    });
  });





}

if (Meteor.isServer) {

  Meteor.startup(function () {


  });

  Meteor.methods({checkTwitter: function (lat, long) {


    var Fiber = Meteor.npmRequire('fibers');
    var Future = Meteor.npmRequire('fibers/future');
    var future = new Future();


    var T = new Twit({
          consumer_key:         Meteor.settings.consumer_key,
          consumer_secret:      Meteor.settings.consumer_secret,
          access_token:         Meteor.settings.access_token,
          access_token_secret:  Meteor.settings.access_token_secret
        })
        //this.unblock();
        try {
          //var lat = 37.76489493;
          //var long = -122.42010036;
          
          var theLocationToFind = [ long - .5, lat - .5, long + .5, lat + .5 ]

          var stream = T.stream('statuses/filter', { locations: theLocationToFind })

          stream.on('tweet', function (tweet) {
             
              var thisLat = null;
              var thisLon = null;
              if(tweet.geo != null){
                if(tweet.geo.coordinates != null){
                  thisLat = tweet.geo.coordinates[0];
                  thisLon = tweet.geo.coordinates[1];
                }

              }
              if( (thisLon == null) || (thisLat == null) ){
                if(tweet.geo != null){
                  if(tweet.geo.coordinates != null){
                    thisLat = tweet.coordinates.coordinates[1];
                    thisLon = tweet.coordinates.coordinates[0];
                  }

                }

              }

              if( (thisLon == null) || (thisLat == null) ){
                if(tweet.geo != null){
                  if(tweet.geo.coordinates != null){
                    thisLat = tweet.coordinates.coordinates[1];
                    thisLon = tweet.coordinates.coordinates[0];
                  }

                }

              }
              
              if( (thisLat != null) && (thisLon != null) ){


               var result = Meteor._wrapAsync(elasticSearchPostB(tweet, thisLat, thisLon));


              }


              return tweet;
          });//stream on 
        

          return 1;
        } catch (e) {
          console.log('error: ' + e);
          // Got a network error, time-out or HTTP error in the 400 or 500 range.
          return false;
        }


  }});



  Meteor.methods({ 
   
          elasticSearchGET: function (thisLat, thisLon, thisDistance, thisText) {
            if(thisText != ''){
              thisDistance = thisDistance + "mi";
                  mydata = {
                      "from" : 0, "size" : 250,
                      "sort" : [
                          { "created" : {"order" : "desc"}},
                          { "_id" : "desc" }
                      ],
                      "query":{
                        'bool' : {
                          "must" : {
                              "match_all" : {}
                          },
                          "filter" : {
                            "and":[
                              {"geohash_cell": {
                                  "location": {
                                      "lat": thisLat,
                                      "lon": thisLon
                                  },
                                  "precision": thisDistance,
                                  "neighbors": true
                              }},
                              {"match" : { "tweet_text" : thisText }}
                              ]
                          }
                        }
                      }
                    }
            }//if
            else{
                  mydata = {
                      "from" : 0, "size" : 250,
                      "sort" : [
                          { "created" : {"order" : "desc"}},
                          { "_id" : "desc" }
                      ],
                      "query":{
                        'bool' : {
                          "must" : {
                              "match_all" : {}
                          },
                          "filter" : {
                              "geohash_cell": {
                                  "location": {
                                      "lat": thisLat,
                                      "lon": thisLon
                                  },
                                  "precision": thisDistance+"mi",
                                  "neighbors": true
                              }
                          }
                        }
                      }
                    }
            }
            
            try{
              var result = HTTP.call("GET", Meteor.settings.elasticsearchURL + '_search?fielddata_fields=location.geohash',
                {data: mydata
                }

                );
              //console.log(result.content.toString());
              return result.content;
            } catch (e) {
              console.log(e);
              return false;
            }
          }

    });


  function elasticSearchPostB(tweet, thisLat, thisLon){
    var Fiber = Meteor.npmRequire('fibers');
    var Future = Meteor.npmRequire('fibers/future');
    var future = new Future();

            var date = new Date(); 
            Fiber(function(){
              try{
                var result = HTTP.call("PUT", Meteor.settings.elasticsearchURL + tweet.id,
                  {data: {'screen_name': tweet.user.screen_name, 'keywords': tweet.text,
                  'name': tweet.user.name, 'tweet_text':tweet.text , 'created': date.toJSON(), 'location': {'lat': thisLat, 'lon': thisLon} }}

                  );
                return true;
              } catch (e) {
                console.log(e);
                return false;
              }
            }).run()

            
  }

}
