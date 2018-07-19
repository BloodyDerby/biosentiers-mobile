/**
 * Created by Mathias on 04.05.2016.
 * This module is responsible for managing the ArView.
 * It initializes it, updates it, etc.
 */
(function() {
  'use strict';

  angular
    .module('ar-view')
    .factory('ArView', ArViewService);

  function ArViewService(Altitude, AppActions, ArExtremityMarker, ArMarker, DebugLog, EndPopup, EventLogFactory, Excursion, Filters, $log, $rootScope, rx, SeenTracker, Timers, turf, UserLocation, $timeout) {

    // Private data
    // Will store all the ArPoi in the view, by their id.
    var TAG                         = "[ArView] ",
        arPointsById                = {},
        arExtremityPoints           = {},
        reachLimit                  = 250,
        minPoiActiveDistance        = 10,
        updateAltitudeTime          = 500,
        activateManualEndingSubject = new rx.ReplaySubject(1),
        poisChangeSubject           = new rx.Subject(),
        hasReachEndOnce             = false,
        latestAltitude              = 0,
        updateAltitudeThrottle      = _.throttle(updateArPoisAltitude, updateAltitudeTime, {leading: false});

    var service = {
      poisChangeObs          : poisChangeSubject.asObservable(),
      activateManualEndingObs: activateManualEndingSubject.asObservable(),
      init                   : init,
      updateAr               : updateAr,
      loadExtremityPoints    : loadExtremityPoints,
      manageAr               : manageAr,
      setPoiSeen             : setPoiSeen
    };

    // Updates the POIs altitude at a maximum of one time during 1000 ms
    UserLocation.realObs.subscribe(updateAltitudeThrottle);

    return service;

    /* ----- PUBLIC FUNCTIONS ----- */

    /**
     * Initializes the different options of the Wikitude AR Object, such as the constants
     * that impacts the way the ArMarker are shown on the screen.
     */
    function init() {
      AR.context.clickBehavior = AR.CONST.CLICK_BEHAVIOR.TOUCH_DOWN;
      AR.context.scene.cullingDistance = reachLimit;
      AR.context.scene.maxScalingDistance = reachLimit;
      AR.context.scene.minScalingDistance = 5;
      AR.context.scene.scalingFactor = 0.01;
      AR.context.scene.minPoiActiveDistance = minPoiActiveDistance;
      AR.context.onScreenClick = onScreenClick;
      AR.context.onLocationChanged = onLocationChanged;
    }

    /**
     * Updates the POIs in the AR.
     *
     * Points have two states:
     *
     * * They can be in the AR or not.
     *   This depends on the distance of the point from the current location of the user.
     *   Only points that are close enough are added to the AR.
     *
     * * They can be visible or hidden.
     *   This depends on user-selected filters.
     *   Only points that match the currently selected filters will be visible;
     *   the other points will still be in the AR, but they will be disabled and not show on the screen.
     *
     * The reason for these two states is that it is expensive to add or remove AR points,
     * so we avoid that by simply showing/hiding them when the user changes filters but does not move.
     */
    function updateAr() {

      // Ensure the data is loaded and the user is located.
      if (!Excursion.hasExcursion() || !UserLocation.hasLocation()) {
        return;
      }

      var timer = Timers.start();

      // Retrieve all available points.
      var allPois = Excursion.pois;
      $log.debug(TAG + allPois.length + ' points in total');

      // Determine the nearest points; those are the only points that should be in the AR.
      var nearestPois = getNearestPois(allPois);

      // Determine the visible points based on user-selected filters.
      // (Some of the nearest points might not be visible if they do not match the selected filters.)
      var visiblePois = Filters.filterPois(nearestPois);

      // We will keep track of applied changes.
      var changes = {
        visible: visiblePois
      };

      var newPoiIds        = _.map(nearestPois, getPoiId),
          newVisiblePoiIds = _.map(visiblePois, getPoiId);

      // Remove points that are too far away from the AR.
      // Store the list of removed points.
      changes.removed = removeFarthestPois(newPoiIds);

      // Hide points that are in the AR but that do not match user-selected filters.
      var hidden = hideFilteredPois(newVisiblePoiIds);

      // Store the list of hidden points (this includes the points that we just removed from the AR).
      changes.hidden = changes.removed.concat(hidden);

      // Add new points not yet present in the AR.
      // Store the list of added points.
      changes.added = addNewPois(nearestPois, newVisiblePoiIds);

      // Show points that were hidden in the AR but that should now be visible (e.g. because the user changed the current filters).
      var shown = showVisiblePois(newVisiblePoiIds);

      // Store the list of shown points (including points that were just added to the AR and that are visible).
      changes.shown = shown.concat(filterVisiblePois(changes.added, newVisiblePoiIds));

      timer.stop('load ' + newPoiIds.length + ' points in AR (' + newVisiblePoiIds.length + ' visible)');

      // Notify observers of changes.
      poisChangeSubject.onNext(changes);
    }

    /**
     * Loads in the AR View both the start point and the end point of the excursion.
     */
    function loadExtremityPoints() {
      console.log(Excursion.startPoint, Excursion.endPoint);
      arExtremityPoints = {
        start: new ArExtremityMarker(Excursion.startPoint),
        end  : new ArExtremityMarker(Excursion.endPoint, onEnterActionRange)
      }
    }

    /**
     * Manages the states of the camera and sensors for the AR, depending on the properties' value of options.
     * * options.all: if set to truthy value, both camera and sensors will be activated. If set to falsy value, both will be deactivated.
     * * options.camera: if set to truthy value, the camera will be activated. If set to falsy value, it will be deactivated. In both cases, the sensors state won't change.
     * * options.sensors: if set to truthy value, the sensors will be activated. If set to falsy value, they will be deactivated. In both cases, the camera state won't change.
     * @param {{all, camera, sensors}} options The options to apply to the AR Hardware components
     */
    function manageAr(options) {
      if (!!options) {
        if (options.hasOwnProperty('all')) {
          arHardwareStates({camera: options.all, sensors: options.all});
        } else if (options.hasOwnProperty('camera')) {
          arHardwareStates({camera: options.camera});
        } else if (options.hasOwnProperty('sensors')) {
          arHardwareStates({sensors: options.sensors});
        }
      }
    }

    /**
     * Changes the states of the hardware components for the AR, namely the camera and sensors.
     * When a truthy value is passed, the hardware is enabled. It's disabled when a falsy value is passed
     * If one of the options is ommitted, the corresponding state won't change
     * @param {{camera, sensors}} options
     */
    function arHardwareStates(options) {
      $log.log(TAG + 'arHardwareStates', options);
      if (options.hasOwnProperty('camera')) {
        $log.log(TAG + 'arHardwareStates:' + (options.camera ? 'activating' : 'deactivating') + ' the camera.');
        // FIXME: there seems to be a Wikitude bug which causes the app to freeze when exiting the ar view after using this
        //AR.hardware.camera.enabled = !!options.camera;
      }
      if (options.hasOwnProperty('sensors')) {
        $log.log(TAG + 'arHardwareStates:' + (options.sensors ? 'activating' : 'deactivating') + ' the sensors.');
        AR.hardware.sensors.enabled = !!options.sensors;
      }
    }

    /**
     * Handles the seeing of an ArPoi by the user.
     * This function saves the fact that the ArPoi has been seen in the local database.
     * It also flags this ArPoi as having been seen, and hide it from the ArView if necessary.
     * @param poi A GeoJSON object representing the poi that have been seen.
     */
    function setPoiSeen(poi) {
      $log.log(TAG + 'setPoiSeen:poi', poi);
      SeenTracker.addSeenPoi(poi);
      var arPoi = arPointsById[getPoiId(poi)];
      $log.log(TAG + 'setPoiSeen:arPointsById', arPointsById);
      arPoi.setSeen();
      if (Filters.getSelected().settings.showSeenPois === false) {
        arPoi.setVisible(false);
      }
    }

    /* ----- EVENT FUNCTIONS ----- */

    /**
     * This function is called whenever the user clicks on the screen on the AR View.
     */
    function onScreenClick() {
      $rootScope.$apply(function() {
        $log.log(TAG + 'screen clicked');
      });
    }

    /**
     * This function is called whenever Wikitude receives a new location for the user from the device's GPS.
     * It's called with three parameters, representing the new Location, which are passed upon the UserLocation update() method.
     * @param lat The latitude of the new Location
     * @param lon The longitude of the new Location
     * @param alt The altitude of the new Location
     * @param acc The accuracy of the new Location
     */
    function onLocationChanged(lat, lon, alt, acc) {
      AppActions.execute('trackActivity', {
        eventObject: EventLogFactory.location('ar', Excursion.serverId, {
          latitude : lat,
          longitude: lon,
          altitude : alt,
          accuracy : acc
        })
      });
      $rootScope.$apply(function() {
        UserLocation.update(lon, lat, alt, acc);
      });
    }

    /**
     * This function is used to create a closure for an ArPoi that will fire when the ArPoin will be clicked by the user.
     * @param arPoi The ArPoi for which to create the closure.
     * @return {onClick} The closure that will fire each time the ArPoi is clicked.
     */
    function onArPoiClick(arPoi) {
      /**
       * When a ArPoi is clicked by the user, if there
       */
      return function onClick() {
        $log.log(TAG + 'POI clicked', arPoi);
        var dist = arPoi.distanceToUser();
        $log.log(TAG + "distance to user ", dist);
        DebugLog.add('POI clicked - ' + arPoi.id);
        DebugLog.add('POI distance to user - ' + dist + 'm');
          // if (1 === 1) {
          if (dist <= arPoi.minActiveDistance) {
            DebugLog.add('POI showing the details');
            AppActions.execute('trackActivity', {eventObject: EventLogFactory.action.ar.poi.opened(Excursion.serverId, arPoi.id)}, {return: true})
              .then(function() { Excursion.loadCurrentPoi(arPoi.poi); });
            // if (!arPoi.hasBeenSeen) setPoiSeen();
          } else {
            DebugLog.add('POI is too far away');
            AppActions.execute('trackActivity', {eventObject: EventLogFactory.action.ar.poi.clicked(Excursion.serverId, arPoi.id, dist)}, {return: true})
            .then(function() {
              AppActions.execute('toast', {message: "Rapprochez-vous encore de " + Math.ceil(dist - arPoi.minActiveDistance) + "m."});
            });
          }
        return true; // Stop propagating the click event
      };
    }

    function onEnterActionRange() {
      AppActions.execute('trackActivity', {eventObject: EventLogFactory.action.ar.end.reached(Excursion.serverId)});
      if (!hasReachEndOnce) {
        EndPopup.automatic().then(function(validated) {
          $log.log(TAG + "promptEndOfExcursion - prompt result", validated);
          if (validated) {
            AppActions.execute('finishExcursion', {
              qrId       : Excursion.qrId,
              eventObject: EventLogFactory.action.ar.end.prompt(Excursion.serverId, validated)
            });
          } else {
            AppActions.execute('trackActivity', {eventObject: EventLogFactory.action.ar.end.prompt(Excursion.serverId, validated)});
            hasReachEndOnce = true;
            activateManualEndingSubject.onNext();
            $log.log(TAG + 'Pas de fin du sentier');
          }
        });
      }
      // TODO : À supprimer lorsque cette fonction servira vraiment pour l'ActionRange
      return true;
    }

    /* ----- PRIVATE FUNCTIONS ----- */

    /**
     * Updates the relative altitude of all currently visible arPois in the ArView, based on the received altitude.
     * This updates occurs only if the received altitude has changed compared to the latest received.
     */
    function updateArPoisAltitude() {
      // This timeout without delay is used to ensure that the code is executed within an angular digest cycle.
      $timeout(function() {
        var currentAltitude = UserLocation.real.alt;
        $log.log(TAG + 'updateArPoiAltitude:altitudes', currentAltitude, latestAltitude);
        if (currentAltitude === latestAltitude) {
          DebugLog.add('Same current and latest altitude - no updates');
        } else {
          $log.log(TAG + 'updateArPoisAltitude:User position', UserLocation.real);
          var updateTime = Timers.start();
          _.each(arPointsById, Altitude.setFixedAltitude);
          _.each(arExtremityPoints, Altitude.setFixedAltitude);
          DebugLog.add('Updating POIs altitude took ' + updateTime.stop('update ArPois altitude') / 1000 + 's.');
          latestAltitude = currentAltitude;
        }
      });
    }

    /**
     * Given a certain array of GeoJSON poi objects, returns an array with only the pois
     * that are within a predefined radius around the user.
     * This function uses the isInReach function to determine wether a poi should be returned or not.
     * @param pois An Array of GeoJSON poi objects.
     * @return {Array} An Array with the pois that are within the predefined radius.
     */
    function getNearestPois(pois) {
      var timer = Timers.start();
      var nearest = _.filter(pois, isInReach);
      timer.stop('get ' + nearest.length + ' nearest pois');
      return nearest;
    }

    /**
     * Removes the ArPoi from the ArView that are too far from the user.
     * Given a certain array of IDs of POIs that are within a certain radius around the user,
     * returns an array containing the GeoJSON poi object corresponding to the ArPoi that were previously
     * within the same radius but are now farther away, and have been removed from the view.
     * This function **actually** removes the farthest poi from the AR View.
     * @param nearestPoiIds An Array containing the IDs of pois that are currently near the user
     * @return {Array} An Array with the GeoJSON poi object corresponding to the removed ArPoi.
     */
    function removeFarthestPois(nearestPoiIds) {
      var timer = Timers.start();

      var removed = _.reduce(arPointsById, function(memo, arPoi, id) {
        if (!_.includes(nearestPoiIds, id)) {
          memo.push(removeArPoi(id));
        }

        return memo;
      }, []);

      timer.stop('remove ' + removed.length + ' farthest pois');
      return removed;
    }

    /**
     * Hide the ArPoi in the ArView that should not be visible anymore.
     * Given a certain array of ID of poi that should now be visible, returns an array containing
     * the GeoJSON poi object corresponding to the ArPoi that were previously visible but are now being hidden from the view.
     * This function **actually** hide the poi from the AR View.
     * To be hidden from the View, the poi must be currently visible in the ArView and not match the selected filters.
     * @param visiblePoiIds An Array containing the IDs of pois that are near the user AND should be visible.
     * @return {Array} An Array with the GeoJSON poi objects that are present in the ArView but have been hidden from the ArView.
     */
    function hideFilteredPois(visiblePoiIds) {
      var timer = Timers.start();

      var hidden = _.reduce(arPointsById, function(memo, arPoi, id) {
        // if (isArPoiVisible(arPoi) && !_.includes(visiblePoiIds, id)) {
        if (arPoi.isVisible() && !_.includes(visiblePoiIds, id)) {
          memo.push(setArPoiVisible(arPoi, false).poi);
        }

        return memo;
      }, []);

      timer.stop('hide ' + hidden.length + ' filtered pois');
      return hidden;
    }

    /**
     * Adds in the ArView the ArPoi that are now close enough from the user.
     * The ArPoi that were close to the user before (thus present in the ArView) and are still now are **not** recreated.
     * Each ArPoi is created and added to the ArView, but is only visible if it matches the current selected filters.
     * If it does not, it's added but is not visible.
     * Returns an Array of the GeoJSON poi objects corresponding to every ArPoi added to the ArView (visible or not).
     * @param newPois An Array containing the GeoJSON poi objects of the new ArPoi to add to the ArView
     * @param newVisiblePoiIds An Array containing the IDs of pois that should be visible in the ArView.
     * @return {Array} An Array of the GeoJSON poi objects of the ArPoi that have been added to the ArView
     */
    function addNewPois(newPois, newVisiblePoiIds) {
      var timer = Timers.start();

      var added = _.filter(newPois, function(poi) {
        if (!isInAr(poi)) {
          var visible = _.includes(newVisiblePoiIds, getPoiId(poi));
          addArPoi(poi, visible);
          return true;
        }
      });

      timer.stop('add ' + added.length + ' new pois');
      return added;
    }

    /**
     * Shows the ArPoi that were previously present in the ArView but not visible.
     * @param newVisiblePoiIds An Array containing IDs of pois representing ArPois that should now be visible in the ArView.
     * @return {Array} An Array of GeoJSON poi objects that have been shown in the ArView.
     */
    function showVisiblePois(newVisiblePoiIds) {
      var timer = Timers.start();

      var shown = _.reduce(newVisiblePoiIds, function(memo, id) {

        var arPoi = arPointsById[id];
        // arPoi.updateOpacity(); // Update drawables

        //if (!isArPoiVisible(arPoi)) {
        if (!arPoi.isVisible()) {
          memo.push(setArPoiVisible(arPoi, true).poi);
        }

        return memo;
      }, []);

      timer.stop('show ' + shown.length + ' visible pois');
      return shown;
    }

    /**
     * Given an array of GeoJSON poi objects and an array of IDs of pois that should be visible,
     * returns only the GeoJSON poi objects whose ID match an ID of a visible POI.
     * @param pois An Array containing GeoJSON poi objects
     * @param visiblePoiIds An Array containing the IDs of ArPoi that are visible in the ArView
     * @return {Array} Each poi from the pois argument whose ID is in the visiblePoiIds argument.
     */
    function filterVisiblePois(pois, visiblePoiIds) {
      return _.filter(pois, function(poi) {
        return _.includes(visiblePoiIds, getPoiId(poi));
      });
    }

    /**
     * Given a certain GeoJSON poi object, check wether or not this poi is within a predefined radius around the user.
     * @param poi A GeoJSON object representing the poi
     * @return {boolean} True if the poi is within the radius, False otherwise.
     */
    function isInReach(poi) {
      return turf.distance(UserLocation.real, poi) * 1000 < reachLimit;
    }

    /**
     * Given a certain GeoJSON poi object, check wether or not an ArPoi for this poi is present in the ArView.
     * @param poi A GeoJSON object representing the poi.
     * @return {boolean} True if there is an ArPoi for this poi, False otherwise.
     */
    function isInAr(poi) {
      return !_.isNil(arPointsById[getPoiId(poi)]);
    }

    /**
     * Change the visibility of the given ArPoi, according to the given visibility : true for visible, false for hidden.
     * The given ArPoi is then returned.
     * @param arPoi An ArPoi to which the visibility should be changed
     * @param visible
     * @return {*}
     */
    function setArPoiVisible(arPoi, visible) {
      arPoi.geoObject.enabled = visible;
      return arPoi;
    }

    /**
     * Creates a new ArPoi based on the GeoJSON poi object passed as the first argument.
     * This new ArPoi will be automatically added to the ArView, but its vibisility will depend upon
     * the value of the enabled argument. If it's true, the ArPoi will be visible, if it's false, it will not.
     * @param poi The GeoJSON poi object of the ArPoi to add to the ArView.
     * @param enabled A Boolean indicating wether or not the new ArPoi will be visible in the ArView.
     * @return {ArMarker} The new ArPoi that have been added to the ArView.
     */
    function addArPoi(poi, enabled) {
      var arPoi = new ArMarker(poi, enabled, onArPoiClick, SeenTracker.hasBeenSeen(poi));
      var poiId = getPoiId(poi);
      arPointsById[poiId] = arPoi;
      $log.info(TAG + 'UpdateAr:addArPoi:The poi n°' + poiId + ' has been added', arPointsById);
      return arPoi;
    }

    /**
     * Removes the ArPoi whose ID matches the value passed as argument.
     * If there's no ArPoi for this ID, nothing will happen and the function will return nothing.
     * If there's an ArPoi for this ID, it will be removed from the ArView, and the GeoJSON poi object representing this ArPoi
     * will be returned by the function.
     * @param id The ID of the ArPoi to remove from the ArView.
     * @return {Object|undefined} A GeoJSON poi object if the ID matches an existing ArPoi, undefined otherwise.
     */
    function removeArPoi(id) {
      var arPoi = arPointsById[id];
      if (!arPoi) {
        $log.warn(TAG + 'Could not find ArMarker to remove with id ' + JSON.stringify(id));
        return;
      }
      arPoi.remove();
      delete arPointsById[id];
      $log.info(TAG + 'ArView:UpdateAr:removeArPoi:The poi n°' + id + ' has been removed', arPointsById);
      return arPoi.poi;
    }

    /**
     * Given a GeoJSON poi object, returns the id for this poi.
     * @param poi
     * @return {string}
     */
    function getPoiId(poi) {
      // Important: must return a string as the resulting value is used both
      // in array and as object keys (it is automatically casted to a string
      // when used as an object key).
      return '' + poi.properties.id;
    }
  }
})();
