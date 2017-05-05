/**
 * Created by Mathias on 29.03.2016.
 */
(function() {
  'use strict';

  angular
    .module('app')
    .controller('ExcursionCtrl', ExcursionCtrl);

  function ExcursionCtrl(ActivityTracker, $cordovaGeolocation, $cordovaToast, Ionicitude, leafletData, $log, ExcursionMapConfig, Excursions, excursionData, PoiGeo, $q, SeenPoisData, $scope, $timeout, WorldActions) {

    var excursion = this;
    var geoData, positionWatcher;

    excursion.actionButtonClick = actionButtonClick;
    excursion.badgeClassFromStatus = badgeClassFromStatus;
    excursion.centerMapOnZone = centerMapOnZone;
    excursion.openFabActions = openFabActions;
    excursion.zoneIsNotAvailable = zoneIsNotAvailable;

    excursion.show = false;
    excursion.data = excursionData;
    excursion.downloadProgress = "Télécharger";
    excursion.map = new ExcursionMapConfig;
    excursion.positionState = 'searching';
    excursion.activeFAB = false;

    $scope.$on('$ionicView.afterEnter', afterViewEnter);

    $scope.$on('$ionicView.beforeLeave', beforeViewLeave);

    PoiGeo.getExcursionGeoData(excursion.data.zones).then(loadExcursionData);

    Excursions.isNotNew(excursion.data);

    leafletData.getMap('map').then(function(map) {
      $log.info(map);
    }).catch(handleError);

    SeenPoisData.countFor(excursion.data.id).then(function(res) {
      excursion.nbSeenPoi = res;
    }).catch(handleError);

    ////////////////////

    function zoneIsNotAvailable(zoneNb) {
      return !_.includes(excursion.data.zones, zoneNb);
    }

    function openFabActions() {
      excursion.activeFAB = !excursion.activeFAB;
    }

    function centerMapOnZone(zone) {
      $log.log('ExcursionCtrl - center map on zone', zone);
      var zoneGeoJson = getZone(zone);
      $log.log('centerMapOnZone', zoneGeoJson);
      excursion.map.setBoundsFromGeoJson(zoneGeoJson);
    }

    function getZone(zoneId) {
      return _.find(excursion.map.geojson.zones.data.features, function(zone) {
        return zone.properties.id_zone === zoneId;
      })
    }

    function loadExcursionData(excursionData) {
      geoData = excursionData;
      $log.info('getExcursionGeoData -  excursionGeoData', geoData);
      excursion.map.setPath(geoData.path);
      excursion.map.setZones(geoData.zones);
      excursion.map.setExtremityPoints(geoData.extremityPoints);
      excursion.map.setBoundsFromGeoJson(geoData.path);
    }

    function afterViewEnter() {
      $log.info('ExcursionCtrl - Activating location watcher');
      positionWatcher = $cordovaGeolocation.watchPosition({
        timeout           : 10000,
        enableHighAccuracy: true
      });
      positionWatcher.then(null, positionError, positionUpdate);
    }

    function beforeViewLeave() {
      $log.info('ExcursionCtrl - Deactivating location watcher');
      positionWatcher.cancel();
    }

    function positionError(error) {
      $log.error('positionError', error);
      excursion.positionState = 'error';
      $timeout(function() {
        excursion.positionState = 'refresh';
      }, 1000);
    }

    function positionUpdate(position) {
      $log.info('getCurrentPosition', position);
      excursion.map.setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }, 'never');
      excursion.positionState = 'success';
      $timeout(function() {
        excursion.positionState = 'searching';
      }, 1000);
      $log.info(positionWatcher);
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
        pending: startExcursion,
        ongoing: resumeExcursion
      };
      actions[excursion.data.status]();
    }

    /**
     * Load and launch the AR World with the excursion's data, then changes the status of this excursion from "pending" to "ongoing".
     */
    function startExcursion() {
      return $q.when()
        .then(Ionicitude.launchAR)
        .then(loadWorldExcursion)
        .then(_.partial(Excursions.setOngoingStatus, excursion.data))
        .catch(handleError);
    }

    function resumeExcursion() {
      return $q.when()
        .then(startExcursion)
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
     * Load in the AR View the current excursion's data.
     * This means getting the GeoJSON for the path and the points, as well as retrieveing the
     * points that have already been seen.
     * When all these promises are resolved, a call to the AR function loadExcursion is made.
     */
    function loadWorldExcursion() {
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
        $log.info('loadWorldExcursion - excursion.arData', arData);
        WorldActions.execute('loadExcursion', arData);
      });
    }


    // Zip download
    //TODO add to localdb that the download and unzip was sucessful
    // ctrl.getZip = function(excursionId) {
    //   downloader.init({folder: excursionId.toString(), unzip: true});
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
