// The two parts of the foursquare API url used to get data about a location.
// Supply your own foursquare [CLIENT_ID] and [CLIENT_SECRET]
// Supply your own Google Maps API key [GMAPS_API_KEY]
var URLROOT = 'https://api.foursquare.com/v2/venues/'
var URLPARAMS = '?client_id=[CLIEND_ID]&client_secret=CLIENT_SECRET&v=20160730'

// Global variables
var map = null;
var viewModel = null;

// An array of locations to be processed by the view model
var locationsArray = ko.observableArray([
    { name: "AVAN", lat: 52.5090081, lng: 13.3883645, details: "Asian fusion", highlight: ko.observable(false), foursquare: "55bceead498e58c1296dbafc" },
    { name: "Das Meisterstück", lat: 52.513437, lng: 13.3957452, details: "Meat", highlight: ko.observable(false), foursquare: "4ee0f98cd3e38ddb2b34e66d" },
    { name: "Fontani di Trevi", lat: 52.5112901, lng: 13.3977664, details: "Italian", highlight: ko.observable(false), foursquare: "4c80da45d34ca14330771c80" },
    { name: "Pax Coffee", lat: 52.5140448, lng: 13.3970823, details: "Coffee", highlight: ko.observable(false), foursquare: "55782f9e498ee3b164cc75f5" },
    { name: "Spätzle Club", lat: 52.510665, lng: 13.4022438, details: "German", highlight: ko.observable(false), foursquare: "4c86209047cc224b4b66a69f" }
    ]);

/**
 * Initialise the Google Maps map, create the view model and markers
 * as well as apply the knockout bindings
 */
 function initialise() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: { lat: 52.513066, lng: 13.3960058 }
    });

    viewModel = new ViewModel();
    viewModel.createMarkers();
    ko.applyBindings(viewModel);
}

/**
 * The view model and its utility functions
 */
 function ViewModel() {
    var self = this;

    self.locations = locationsArray;
    self.filter = ko.observable("");

    self.infoWindow = new google.maps.InfoWindow();

    /**
     * Opens the offcanvas menu on mobile devices on click on burger icon.
     */
     self.openMenu = function() {
        $('.row-offcanvas').toggleClass('active');
    };

    /**
     * Loops over all locations, uses their coordinates to create Google Maps
     * marker objects and finally attaches the newly created marker object to
     * the location.
     */
     self.createMarkers = function() {
        ko.utils.arrayForEach(self.locations(), function(item) {
            var marker = new google.maps.Marker({
                position: { lat: item.lat, lng: item.lng },
                map: map,
                title: item.name,
                animation: google.maps.Animation.DROP
            });
            marker.addListener('click', self.showInfoMarker);
            item.marker = marker;
        });
    };

    /**
     * Remove all animation from markers and any highlighed locations
     */
     self.resetMarkers = function() {
        // Remove animations and highlights from markers
        for (var i = 0; i < self.filteredLocations().length; i++) {
            self.filteredLocations()[i].marker.setAnimation(null);
            self.filteredLocations()[i].highlight(false);
        }
    };

    /**
     * Shows an Google Maps information window on the selected
     * marker or location entry. The information window contains
     * the name of the place selected; it also pulls from foursquare
     * its rating and a photo.
     * When the loading from foursquare fails, an error message is
     * displayed to the user.
     * If the information window is already open, it will be closed.
     * @param  loc the location of the information window
     */
     self.showInfoWindow = function(loc) {
        var url = URLROOT + loc.foursquare + URLPARAMS;

        $.ajax({
            url: url,
            type: 'GET',

            success: function(data) {
                var rating = data.response.venue.rating;
                var foursquareUrl = data.response.venue.canonicalUrl;
                var image = data.response.venue.photos.groups[0].items[0].prefix + '165x165' + data.response.venue.photos.groups[0].items[0].suffix;

                var content = '<div class="bold">' + loc.name + '</div>';
                content += '<div>Rating: ' + rating + '/10</div>';
                content += '<div>Details: ' + loc.details + '</div>';
                content += '<div><img src="' + image + '"></div>';
                content += '<div>Find out more on <a href="' + foursquareUrl + '" target="_blank">foursquare</a>.</div>';

                self.infoWindow.setContent(content);
                self.infoWindow.open(map, loc.marker);
            },

            error: function(data) {
                $('.notification').append('<div class="alert alert-danger"><strong>Oops</strong>, something went wrong. Please try again later.</div>');
            }
        });
    };

    /**
     * This function handles clicks on entries in the location list
     */
     self.showInfoList = function() {
        // Remove animations and highlights from markers
        self.resetMarkers();

        // Set animation for clicked marker and enable highlighting in list
        var that = this;
        that.marker.setAnimation(google.maps.Animation.BOUNCE);
        map.setCenter({ lat: that.lat, lng: that.lng });
        map.setZoom(16);
        that.highlight(true);

        // Show the information window on the map
        self.showInfoWindow(that);

        // Close the offcanvas menu
        $('.row-offcanvas').removeClass('active');
    };

    /**
     * This function handles clicks on map marlkers
     */
     self.showInfoMarker = function() {
        // Remove animations and highlights from markers
        self.resetMarkers();

        // Set animation for clicked marker and enable highlighting in list
        var that = this;
        that.setAnimation(google.maps.Animation.BOUNCE);
        var loc = ko.utils.arrayFirst(self.locations(), function(item) {
            return item.marker === that;
        });
        loc.highlight(true);

        // Show the information window on the map
        self.showInfoWindow(loc);
    };

    /**
     * Applies a filter to the view model's locations. If there is no filter
     * value, it returns all locations.
     */
     self.filteredLocations = ko.computed(function() {
        var filter = self.filter().toLowerCase();

        /**
         * If no filter is specified, return all locations.
         * Keep the animation if a marker had been selected,
         *
         * If a filter is set, filter the locations accordingly.
         * Close information windows where necessary.
         */
         if (!filter) {
            if (typeof self.filteredLocations !== 'undefined') {
                for (var i = 0; i < self.locations().length; i++) {
                    self.locations()[i].marker.setMap(map);
                    if (self.locations()[i].highlight()) {
                        self.locations()[i].marker.setAnimation(google.maps.Animation.BOUNCE);
                    }
                }
            }
            return self.locations();
        } else {
            return ko.utils.arrayFilter(self.locations(), function(item) {
                self.infoWindow.close();
                if (item.name.toLowerCase().includes(filter)) {
                    item.marker.setMap(map);
                    return true;
                } else {
                    item.highlight(false);
                    item.marker.setMap(null);
                    return false;
                }
            });
        }
    }, self);
 }