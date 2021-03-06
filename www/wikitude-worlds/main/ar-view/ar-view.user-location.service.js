/**
 * Created by Mathias on 08.06.2016.
 */
(function() {
  'use strict';
  angular
    .module('ar-view')
    .factory('UserLocation', UserLocationService);

  function UserLocationService(Location, $log, rx, turf) {

    var TAG                     = "[UserLocation] ",
        movingDistanceThreshold = 20,
        realLocationSubject     = new rx.ReplaySubject(1),
        spacedLocationSubject   = new rx.ReplaySubject(1),
        service                 = {
          real       : null,
          spaced     : null,
          update     : update,
          hasLocation: hasLocation,
          realObs    : realLocationSubject.asObservable(),
          spacedObs  : spacedLocationSubject.asObservable()
        };

    return service;

    ////////////////////

    function hasLocation() {
      return !_.isNil(service.real);
    }

    function update(lon, lat, alt, acc) {

      var firstLocation = !hasLocation();

      // Always update the real location.

      service.real = new Location(lon, lat, alt, acc);
      realLocationSubject.onNext(service.real);

      // Only update the spaced location the first time, or if the user has moved beyond the threshold.
      var distance = movingDistance();
      if (firstLocation || distance > movingDistanceThreshold) {
        service.spaced = service.real.clone();
        spacedLocationSubject.onNext(service.spaced);

        if (!firstLocation) {
          $log.debug(TAG + 'User has moved more than ' + movingDistanceThreshold + 'm');
        }
      }

      var message = 'User location changed to longitude ' + service.real.lon + ', latitude ' + service.real.lat + ', altitude ' + service.real.alt + ', with an accuracy of ' + service.real.acc;
      if (distance) {
        message += ' (moved ' + distance + 'm from the last spaced position)';
      }

      $log.debug(TAG + message);
    }

    function movingDistance() {
      return service.spaced ? turf.distance(service.real, service.spaced) * 1000 : 0;
    }
  }
})();
