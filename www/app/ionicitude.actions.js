/**
 * Created by Mathias on 17.05.2016.
 */
(function () {
  'use strict';

  angular
    .module('app')
    .run(ionicitude);

  function ionicitude($cordovaDeviceOrientation, $ionicPlatform, Ionicitude, $cordovaToast, $log, PoiGeo, PoiContent, Timers) {

    var deviceOrientationWatch,
        deviceOrientationUpdatesInterval = 250;

    $ionicPlatform.ready(function () {
      Ionicitude.init()
        .then(function (success) { console.log(success); })
        .catch(function (error) { console.log(error); });

      Ionicitude
        .addAction(open)
        .addAction(close)
        .addAction(showPos)
        .addAction(loadTestPois)
        .addAction(loadMarkerData)
        .addAction(toast)
        .addAction(setPosition)
        .addAction(loadPois)
        .listLibActions();

      ////////////////////

      function open(service) {
        $log.debug('World opened');

        $log.debug('Starting device orientation updates every ' + deviceOrientationUpdatesInterval + 'ms');
        deviceOrientationWatch = $cordovaDeviceOrientation.watchHeading({
          frequency: deviceOrientationUpdatesInterval
        });

        deviceOrientationWatch.then(null, function(err) {
          $log.error(err);
        }, function(update) {
          Ionicitude.callJavaScript('World.updateDeviceOrientation(' + angular.toJson(update) + ')');
        });
      }

      function close(service) {
        $log.debug('World closing');

        if (deviceOrientationWatch) {
          $log.debug('Stopping device orientation updates');
          deviceOrientationWatch.clearWatch();
        } else {
          $log.warn('No devices orientation updates to stop');
        }

        service.close();
      }

      function showPos(service, param) {
        $cordovaToast.showLongCenter('lat : ' + param.lat + ", lon : " + param.lon + ", alt :" + param.alt);
      }

      function loadTestPois(service) {
        var marks = PoiGeo.getMarks();
        var timer = Timers.start();
        service.callJavaScript('World.loadPois(' + angular.toJson(marks) + ')');
        PoiGeo.getPoints()
          .then(function (success) {
            //var pois = (success.data.features).slice(0, 100);
            var pois = success.data.features;
            console.log(pois);
            service.callJavaScript('World.loadPois(' + angular.toJson(pois) + ')');
            timer.stop('load test pois');
          })
          .catch(function (error) {
            console.log(error);
          });
      }

      function loadMarkerData(service, param) {
        console.log('get marker data');
        service.callJavaScript('World.loadPoiData(' + angular.toJson(PoiContent.getData(param.id)) + ', ' + angular.toJson(param.properties) + ')');
      }

      function toast(service, param) {
        $cordovaToast.showLongCenter(param.message);
      }

      function setPosition(service, param) {
        console.log('setting position :', param);
        service.setLocation(param.lat, param.lon, param.alt, 1);
      }

      function loadPois(service, param) {
        var timer = Timers.start();
        console.log('beacon_id', param.beacon);
        PoiGeo.getPoints(param.beacon)
          .then(function (success) {
            var pois = success.data.features;
            console.log(pois);
            service.callJavaScript('World.loadPois(' + angular.toJson(pois) + ')');
            timer.stop('load beacon\'s points');
          })
          .catch(function (error) {
            console.log(error);
            $cordovaToast.showLongTop("Une erreur est survenue lors du chargement des points d'intérêts.");
          })
      }
    });
  }
})();
