/**
 * Created by Mathias on 29.03.2016.
 */
(function() {
  'use strict';

  angular
    .module('app')
    .controller('OutingCtrl', OutingCtrl);

  function OutingCtrl(ActivityTracker, $cordovaGeolocation, $cordovaToast, Ionicitude, leafletData, leafletBoundsHelpers, $log, OutingMap, Outings, outingData, PoiGeo, $q, SeenPoisData, $timeout, turf, WorldActions) {
    var excursion = this;
    var geoData;
    var positionWatcher = $cordovaGeolocation.watchPosition({
      timeout           : 10000,
      enableHighAccuracy: false
    });

    excursion.startOuting = startOuting;
    excursion.resumeOuting = resumeOuting;
    excursion.actionButtonClick = actionButtonClick;
    excursion.badgeClassFromStatus = badgeClassFromStatus;

    excursion.data = outingData;
    excursion.downloadProgress = "Télécharger";
    excursion.map = new OutingMap;
    excursion.positionBadge = {
      label  : "Localisation...",
      spinner: true,
      icon   : false,
      visible: true
    };

    $log.info(excursion.map);

    // excursion.map.setUserLocation({
    //   lat: 46.781001,
    //   lng: 6.647128
    // });

    PoiGeo.getExcursionGeoData(excursion.data.zones).then(function(excursionGeoData) {
      geoData = excursionGeoData;
      $log.info('getExcursionGeoData -  excursionGeoData', geoData);
      excursion.map.setPath(geoData.path);
      excursion.map.setZones(geoData.zones);
      excursion.map.setExtremityPoints(geoData.extremityPoints);
      var bbox = turf.bbox(geoData.path);
      excursion.map.bounds = leafletBoundsHelpers.createBoundsFromArray([[bbox[0], bbox[1]], [bbox[2], bbox[3]]]);
    });

    leafletData.getMap('map').then(function(map) {
      $log.info(map);
    }).catch(handleError);

    Outings.isNotNew(excursion.data);

    SeenPoisData.countFor(excursion.data.id).then(function(res) {
      excursion.nbSeenPoi = res;
    }).catch(handleError);

    positionWatcher.then(null, positionError, positionUpdate);

    ////////////////////

    function positionError(error) {
      $log.error('positionError', error)
    }

    function positionUpdate(position) {
        $log.info('getCurrentPosition', position);
        excursion.map.setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        updatePositionBadge();
    }

    function updatePositionBadge() {
      excursion.positionBadge.label = "Localisé !";
      excursion.positionBadge.icon = true;
      excursion.positionBadge.spinner = false;
      $timeout(function() {
        excursion.positionBadge.visible = false;
      }, 1000)
    }

    function badgeClassFromStatus(status) {
      var classes = {
        pending : 'badge-balanced',
        ongoing : 'badge-energized',
        finished: 'badge-assertive'
      };

      return classes[status];
    }

    function actionButtonClick() {
      var actions = {
        pending: startOuting,
        ongoing: resumeOuting
      };
      actions[excursion.data.status]();
    }

    /**
     * Load and launch the AR World with the outing's data, then changes the status of this outing from "pending" to "ongoing".
     */
    function startOuting() {
      return $q.when()
        .then(Ionicitude.launchAR)
        .then(loadWorldOuting)
        .then(_.partial(Outings.setOngoingStatus, excursion.data))
        .catch(handleError);
    }

    function resumeOuting() {
      return $q.when()
        .then(startOuting)
        .then(ActivityTracker.logResume)
        .catch(handleError);
    }

    /**
     * Handles errors occuring.
     * An UnsupportedFeatureError could be raised by Ionicitude if the device doesn't support Wikitude.
     * For all the other errors, the error is logged and a toast is shown.
     * @param e
     */
    function handleError(e) {
      $log.error(e);
      if (e instanceof UnsupportedFeatureError) {
        $cordovaToast.showShortBottom("Device not supported !");
      } else {
        $cordovaToast.showShortBottom("Unknow error. Please check the logs.");
      }
    }

    /**
     * Load in the AR View the current outing's data.
     * This means getting the GeoJSON for the path and the points, as well as retrieveing the
     * points that have already been seen.
     * When all these promises are resolved, a call to the AR function loadOuting is made.
     */
    function loadWorldOuting() {
      $log.debug('World loaded');

      var promises = [
        PoiGeo.getFilteredPoints(excursion.data.zones, excursion.data.themes),
        SeenPoisData.getAll(excursion.data.id)
      ];

      return $q.all(promises).then(function(results) {
        $log.log(results);
        var arData = {
          id             : excursion.data.id,
          themes         : excursion.data.themes,
          path           : geoData.path,
          extremityPoints: geoData.extremityPoints,
          pois           : results[0],
          seen           : results[1]
        };
        $log.info('loadWorldOuting - excursion.arData', arData);
        WorldActions.execute('loadOuting', arData);
      });
    }


    // Zip download
    //TODO add to localdb that the download and unzip was sucessful
    // ctrl.getZip = function(outingId) {
    //   downloader.init({folder: outingId.toString(), unzip: true});
    //   downloader.get("http://knae.niloo.fr/testBirds.zip");
    //   document.addEventListener("DOWNLOADER_downloadProgress", function(event) {
    //     var data = event.data;
    //     $scope.$apply(function() {
    //       ctrl.downloadProgress = data[0] + ' %';
    //     });
    //   });
    //   document.addEventListener("DOWNLOADER_unzipSuccess", function(event) {
    //     $scope.$apply(function() {
    //       ctrl.downloadProgress = "Réussit";
    //     });
    //   });
    // }
  }
})();
