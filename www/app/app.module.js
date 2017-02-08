/**
 * Created by Mathias on 31.03.2016.
 */
(function () {
  'use strict';

  angular.module('app', [
    // Third-party modules.
    'ionic',
    'IonicitudeModule',
    'lokijs',
    'leaflet-directive',
    'ngCordova',
    // Application modules.
    'AuthModule',
    'bio-db-module',
    'poi',
    'leaflet-directive',
    'map-icons',
    'OutingsModule',
    'seen-pois-data',
    'SpeciesModule',
    'QRModule',
    'timers',
    'trans',
    'world-actions'
    // 'arDirectives'
  ]);
})();
