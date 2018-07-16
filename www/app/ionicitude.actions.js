/**
 * Created by Mathias on 17.05.2016.
 */
(function() {
  'use strict';

  angular
    .module('app')
    .run(ionicitude);

  function ionicitude(ActivityTracker,
                      $cordovaDeviceOrientation,
                      $cordovaToast,
                      DbBio,
                      DbExcursions,
                      DbSeenPois,
                      DbSeenSpecies,
                      EventLogFactory,
                      Ionicitude,
                      $ionicPlatform,
                      $log,
                      PoiContent,
                      $q,
                      SeenPoi,
                      WorldActions) {

    var TAG = "[App:Run:IonicitudeAction] ",
        deviceOrientationWatch,
        deviceOrientationUpdatesInterval = 250;

    $ionicPlatform.ready(function() {
      Ionicitude.init()
        .then(function(success) { $log.log(TAG + "init success", success); })
        .catch(function(error) { $log.log(TAG + "init error", error); });

      /**
       * Register Ionicitude Actions
       */
      addIonicitudeAction(open);
      addIonicitudeAction(loadPoiDetails);
      addIonicitudeAction(toast);
      addIonicitudeAction(setPosition);
      addIonicitudeAction(close);
      addIonicitudeAction(addSeenPoi);
      addIonicitudeAction(finishExcursion);
      addIonicitudeAction(trackActivity);
      addIonicitudeAction(saveObservation);

      // Ionicitude.listLibActions();

      ////////////////////

      /**
       * Starts to watch the device's orientation and send the data to the AR View.
       * @param service The Ionicitude service
       */
      function open(service) {
        $log.debug(TAG + 'World opened');

        $log.debug(TAG + 'Starting device orientation updates every ' + deviceOrientationUpdatesInterval + 'ms');
        deviceOrientationWatch = $cordovaDeviceOrientation.watchHeading({
          frequency: deviceOrientationUpdatesInterval
        });

        deviceOrientationWatch.then(null, function(err) {
          $log.error(TAG + err);
        }, function(update) {
          WorldActions.execute('updateDeviceOrientation', update);
        });
      }

      function loadPoiDetails(service, param) {
        return $q.all({
          poiData: PoiContent.getPoiData(param.speciesId, param.theme),
          speciesSeen: DbSeenSpecies.fetchOne(param.qrId, param.speciesId)
        }).then(function(res) {
          res.poiData.speciesSeen = res.speciesSeen ? res.speciesSeen.nbSeen : 0;
          return res.poiData;
        })
      }

      function toast(service, param) {
        $cordovaToast.showLongCenter(param.message);
      }

      function setPosition(service, param) {
        $log.log(TAG + 'setting position :', param);
        service.setLocation(param.lat, param.lon, param.alt, 1);
      }

      function close(service, param) {
        $log.debug(TAG + 'World closing');

        if (deviceOrientationWatch) {
          $log.debug(TAG + 'Stopping device orientation updates');
          deviceOrientationWatch.clearWatch();
        } else {
          $log.warn(TAG + 'No devices orientation updates to stop');
        }
        service.close();
        ActivityTracker(EventLogFactory.ar.quitted());
        // Set the excursion as paused
        DbExcursions.fetchOne(param.qrId).then(DbExcursions.setPausedDate);
        DbBio.save();
      }

      function addSeenPoi(service, param) {
        $log.log(TAG + 'adding seen poi', param);
        $log.log(TAG + 'addSeenPoi', DbSeenPois.addOne(new SeenPoi(param.qrId, param.serverId, param.participantId, param.poiId, param.poiData)));
      }

      function finishExcursion(service, param) {
        param.eventObject && ActivityTracker(param.eventObject);
        return $q.when(param.qrId)
          .then(DbExcursions.fetchOne)
          .then(DbExcursions.setFinishedStatus)
          .then(_.partial(close, service))
          .catch(function(error) {
            $log.error(TAG + error);
            $q.reject(error);
          });
      }

      /**
       * Proxy to the ActivityTracker service.
       * @param {Object} service - The Ionicitude service.
       * @param {Object} param - The action params.
       * @param {EventLog} param.eventObject - An object representing the event to pass to the ActivityTracker service.
       */
      function trackActivity(service, param) {
        return ActivityTracker(param.eventObject);
      }

      function saveObservation(service, param) {
        console.log("Ionictitude action trigger, the observation is :",param);
      }

      ////////////////////

      /**
       * Adds an Ionicitude action.
       *
       * The action is added in a wrapper that can automatically return the result
       * of the action to the wikitude world.
       *
       * Use the `AppActions` service in the wikitude world to execute these actions.
       *
       * @param {Function} func - The function to wrap.
       * @see {@link #wrapIonicitudeAction}
       */
      function addIonicitudeAction(func) {
        if (!func.name) {
          throw new Error('Ionicitude action function must be named');
        }

        return Ionicitude.addAction(func.name, wrapIonicitudeAction(func));
      }

      /**
       * Creates a wrapper around an Ionicitude action function that can automatically
       * return the result of the action to the wikitude world.
       *
       * A result will be returned only if the `_executionId` parameter is provided to
       * the generated function. The `AppActions` service in the wikitude world will
       * automatically generate and provide this execution ID if given the `return` option.
       *
       * @param {Function} func - The Ionicitude action function (it must be a named function).
       * @returns {Function} A wrapper function that can be added to Ionicitude.
       * @see AppActions
       */
      function wrapIonicitudeAction(func) {

        // Return the function that will actually be added to Ionicitude, and which will call `func`.
        return function(service, params) {

          // Retrieve the action execution ID provided by the wikitude world (if any).
          var executionId = params._executionId;

          // Execute the passed function (without the execution ID).
          var resultOrPromise = func(service, _.omit(params, '_executionId'));

          // If an execution ID was provided, resolve the result (it might be a value or a promise),
          // then return the result (or error) to the wikitude world.
          if (executionId) {
            $q.resolve(resultOrPromise).then(function(result) {
              returnResultToWorld(executionId, result);
            }, function(err) {
              returnErrorToWorld(executionId, err);
            });
          }

          return resultOrPromise;
        }
      }

      function returnResultToWorld(executionId, result) {
        WorldActions.execute('returnResultFromApp', {
          id    : executionId,
          result: result
        });
      }

      function returnErrorToWorld(executionId, err) {
        WorldActions.execute('returnResultFromApp', {
          id   : executionId,
          error: err.message
        });
      }
    });
  }
})();
