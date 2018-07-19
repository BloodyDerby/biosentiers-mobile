/**
 * Created by Mathias on 29.03.2016.
 */
(function() {
  'use strict';

  angular
    .module('app')
    .controller('ExcursionCtrl', ExcursionCtrl);

  function ExcursionCtrl(ActivityTracker, $cordovaGeolocation, $cordovaToast, EventLogFactory, Ionicitude, $ionicPopover, leafletData, $log, ExcursionMapConfig, DbExcursions, excursionData, PoiGeo, $q, DbSeenPois, DbSeenSpecies, DbObservation, rx, $scope, $state, $timeout, WorldActions) {
    var TAG = "[ExcursionCtrl] ";

    $scope.$on('$ionicView.beforeEnter', function(event, viewData) {
      viewData.enableBack = true;
      excursion.map && excursion.map._onResize();
    });

    $scope.$on('$ionicView.enter', function() {
      ActivityTracker(EventLogFactory.navigation.excursion.card(excursionData));
    });

    // $scope.$on('$ionicView.afterEnter', afterViewEnter);

    $scope.$on('$ionicView.beforeLeave', function() {
      excursion.positionState !== 'refresh' && deactivatePositionWatch();
    });

    var excursion = this;
    var geoData, positionWatcher;
    var RefreshData = rx.Observable.merge(DbExcursions.archivedObs, DbExcursions.restoredObs);

    //TODELETE
    console.log(DbObservation.fetchAll().then(DbObservation.removeObservation()));

    $log.log(TAG + "excursion data", excursionData);
    excursion.data = excursionData;
    excursion.downloadProgress = "Télécharger";
    excursion.mapConfig = new ExcursionMapConfig;
    excursion.positionState = 'refresh';
    excursion.activeFAB = false;

    excursion.actionButtonClick = actionButtonClick;
    excursion.centerMapOnZone = centerMapOnZone;
    excursion.openFabActions = toggleFabActions;
    excursion.zoneIsNotAvailable = zoneIsNotAvailable;
    excursion.togglePositionWatch = togglePositionWatch;
    excursion.goToSeenList = goToSeenList;
    excursion.openExcursionMenu = openExcursionMenu;
    excursion.isArchived = isArchived;
    excursion.remove = menuAction(removeExcursion);
    excursion.archive = menuAction(DbExcursions.archiveOne);
    excursion.restore = menuAction(DbExcursions.restoreOne);
    excursion.reinitialize = menuAction(DbExcursions.reinitializeOne);

    PoiGeo.getExcursionGeoData(excursion.data.zones).then(loadExcursionData).catch(handleError);

    DbExcursions.setNotNew(excursion.data);

    leafletData.getMap(excursion.data.qrId).then(function(map) {
      excursion.map = map;
    }).catch(handleError);

    DbSeenSpecies.countFor(excursion.data.qrId).then(function(res) {
      excursion.nbSeenSpecies = res;
    }).catch(handleError);

    DbSeenSpecies.seenSpeciesObs.subscribe(function(data) {
      if (excursion.data.qrId === data.qrId) excursion.nbSeenSpecies = data.nbSeen;
    });

    RefreshData.subscribe(function(newData) {
      if (newData.qrId === excursion.data.qrId) excursion.data = newData;
    });

    $ionicPopover
      .fromTemplateUrl('app/excursion-context-menus/excursion-details-context-menu.html', {scope: $scope})
      .then(function(popover) {
        $log.log(TAG + "details context menu", popover);
        excursion.excursionMenu = popover;
      })
      .catch(function(error) {
        $log.error(TAG + "details context menu", error);
      });

    ////////////////////

    /**
     * Used to create the actions triggered by the contextual menu of the excursion details.
     * The given action will be wrapped in a function that executes the action, then closes the contextual menu.
     * The returned function should be passed an excursion object as its argument, that will be passed along to the action function as well.
     * @param action A function representing an action of the contextual menu
     * @return {Function} A function that will executes the action, then closes the contextual menu
     */
    function menuAction(action) {
      return function(excursion) {
        closeExcursionMenu().then(function() {
          action(excursion);
        });
      }
    }

    /**
     * Removes the current excursion from the databse.
     * If it has been correctly removed, then the user is redirected to the excursions list
     * @param excursion
     */
    function removeExcursion(excursion) {
      DbExcursions.removeOne(excursion)
        .then(function(result) {
          $log.log(TAG + "remove excursion result", result);
          result !== false && $state.go('app.excursions-list.all');
        });
    }

    /**
     * Opens the contextual menu for the excursion list page
     */
    function openExcursionMenu($event) {
      ActivityTracker(EventLogFactory.excursion.contextMenu());
      excursion.excursionMenu.show($event);
    }

    /**
     * If it exists, close the contextual menu for the excursion list page
     */
    function closeExcursionMenu() {
      if (!!excursion.excursionMenu) return excursion.excursionMenu.hide();
    }

    /**
     * Stops or restarts the position watcher looking out for the user's location.
     * If the position watcher is on a "refresh" state, it will be restarted. Otherwise, it will be stopped.
     */
    function togglePositionWatch() {
      excursion.positionState === 'refresh' ? activatePositionWatch() : deactivatePositionWatch();
    }

    /**
     * Checks wether or not the given zone number is in the selected excursion zones.
     * @param zoneNb
     * @return {boolean}
     */
    function zoneIsNotAvailable(zoneNb) {
      return !_.includes(excursion.data.zones, zoneNb);
    }

    /**
     * Switch the boolean value of excursion.activeFAB
     */
    function toggleFabActions() {
      excursion.activeFAB = !excursion.activeFAB;
    }

    /**
     * Centers the map on one of the excursion zone
     * @param zoneId The number of the zone
     */
    function centerMapOnZone(zoneId) {
      var zoneGeoJson = getZone(zoneId);
      excursion.mapConfig.setBoundsFromGeoJson(zoneGeoJson);
    }

    /**
     * Fetch the GeoJSON object matching the given zone id.
     * @param zoneId
     */
    function getZone(zoneId) {
      return _.find(excursion.mapConfig.geojson.zones.data.features, function(zone) {
        return zone.properties.id_zone === zoneId;
      })
    }

    /**
     * Updates the config of the excursion map to includes the excursion data,
     * like the path, the zones, the extremity points and the bounds.
     * @param excursionData
     */
    function loadExcursionData(excursionData) {
      geoData = excursionData;
      $log.info(TAG + 'getExcursionGeoData -  excursionGeoData', geoData);
      excursion.mapConfig.setPath(geoData.path);
      excursion.mapConfig.setZones(geoData.zones);
      excursion.mapConfig.setExtremityPoints(geoData.extremityPoints);
      excursion.mapConfig.setBoundsFromGeoJson(geoData.path);
    }

    /**
     * Activates the position watcher so that it waits for a user's location.
     * If an error occurs, the positionError function is called, otherwise, the positionUpdate function is called.
     */
    function activatePositionWatch() {
      ActivityTracker(EventLogFactory.action.positionWatcher.activated());
      excursion.positionState = "searching";
      positionWatcher = $cordovaGeolocation.watchPosition({
        timeout           : 10000,
        enableHighAccuracy: true
      });
      positionWatcher.then(null, positionError, positionUpdate);
    }

    /**
     * Deactivate the position watcher so that it doesnt watch for the user's location.
     */
    function deactivatePositionWatch() {
      if (positionWatcher) {
        positionWatcher.cancel();
        ActivityTracker(EventLogFactory.action.positionWatcher.deactivated());
      }
      delete excursion.mapConfig.markers.user;
      excursion.positionState = 'refresh';
    }

    /**
     * Called when an error occured while watching the user's location.
     * Logs the error, and change the state of the position watcher to 'error'.
     * @param error
     */
    function positionError(error) {
      $log.error(TAG + 'positionError', error);
      excursion.positionState = 'error';
      $timeout(function() {
        excursion.positionState = 'refresh';
      }, 1000);
    }

    /**
     * Called when the position watcher successfully retrieved the user's location.
     * Updates the map configuration with the new location.
     * @param position
     */
    function positionUpdate(position) {
      $log.info(TAG + 'getCurrentPosition', position);
      ActivityTracker(EventLogFactory.location('excursionCard', excursion.data.serverId, position.coords));
      excursion.mapConfig.setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }, {center: 'once'});
      excursion.positionState = 'success';
      $timeout(function() {
        excursion.positionState = 'searching';
      }, 1000);
      $log.info(TAG + "positionWatcher", positionWatcher);
    }

    /**
     * Executes the action corresponding to the state of the excursion main button.
     * This will start the excursion if the state is 'pending',
     * or resume it if the state is 'ongoing'.
     */
    function actionButtonClick() {
      var actions = {
        pending: startExcursion,
        ongoing: resumeExcursion
      };
      actions[excursion.data.status]();
    }

    /**
     * Loads and launches the AR World with the excursion's data, then changes the status of this excursion from "pending" to "ongoing".
     */
    function startExcursion() {
      ActivityTracker(EventLogFactory.excursion.started(excursion.data));
      return $q.when()
        .then(launchAr)
        .then(_.partial(DbExcursions.setOngoingStatus, excursion.data))
        .catch(handleError);
    }

    /**
     * Executes the startExcursion function, then logs the fact in the ActivityTracker that the excursion has been resumed.
     */
    function resumeExcursion() {
      ActivityTracker(EventLogFactory.excursion.resumed(excursion.data));
      return $q.when()
        .then(launchAr)
        .catch(handleError);
    }

    /**
     * Actually launch the AR view.
     */
    function launchAr() {
      ActivityTracker(EventLogFactory.ar.launched());
      return $q.when()
        .then(Ionicitude.launchAR)
        .then(loadWorldExcursion)
    }

    /**
     * Handles errors occuring.
     * An UnsupportedFeatureError could be raised by Ionicitude if the device doesn't support Wikitude.
     * For all the other errors, the error is logged and a toast is shown.
     * @param e
     */
    function handleError(e) {
      $log.error(TAG + "handleError", e);
      if (e instanceof UnsupportedFeatureError) {
        $cordovaToast.showShortBottom("Votre appareil est incompatible.");
      } else {
        $cordovaToast.showShortBottom("Erreur inconnue. Merci de réessayer.");
      }
    }

    /**
     * Load in the AR View the current excursion's data.
     * This means getting the GeoJSON for the path and the points, as well as retrieveing the
     * points that have already been seen.
     * When all these promises are resolved, a call to the AR function loadExcursion is made.
     */
    function loadWorldExcursion() {
      $log.debug(TAG + 'World loading...');

      var promises = {
        pois    : PoiGeo.getFilteredPoints(excursion.data.zones, excursion.data.themes),
        seenPois: DbSeenPois.fetchAll(excursion.data.qrId)
      };

      return $q.all(promises).then(function(results) {
        $log.log(TAG + 'loadWorldExcursion', results);
        var arData = {
          name           : excursion.data.name,
          qrId           : excursion.data.qrId,
          serverId       : excursion.data.serverId,
          participantId  : excursion.data.participant.id,
          themes         : excursion.data.themes,
          path           : geoData.path,
          extremityPoints: geoData.extremityPoints,
          pois           : results.pois,
          seen           : _.map(results.seenPois, 'poiId')
        };
        $log.info(TAG + 'loadWorldExcursion:excursion.arData', arData);
        WorldActions.execute('loadExcursion', arData);
      });
    }

    /**
     * Redirect the user to the list of seen elements, if he/she has effectively seen at least one element.
     */
    function goToSeenList() {
      excursion.nbSeenSpecies > 0 && $state.go('app.excursion.seenlist', {excursionId: excursion.data.qrId});
    }

    function isArchived() {
      return excursion.data.archivedAt !== null;
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
