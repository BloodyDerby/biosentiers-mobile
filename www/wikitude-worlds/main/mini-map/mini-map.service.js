/**
 * Created by Mathias on 01.09.2016.
 */
(function () {
  'use strict';

  angular
    .module('mini-map')
    .factory('MiniMap', MiniMapService);

  function MiniMapService(Icons, $log) {
    var zoom    = 16,
        service = {
          config          : {},
          addPath         : addPath,
          updateMapMarkers: updateMapMarkers
        };

    initialize();

    return service;

    ////////////////////

    function initialize() {
      service.config = {
        tiles   : {
          url    : '../../data/Tiles/{z}/{x}/{y}.png',
          options: {
            errorTileUrl: '../../data/Tiles/error.png'
          }
        },
        defaults: {
          scrollWheelZoom   : false,
          touchZoom         : false,
          doubleClickZoom   : false,
          dragging          : false,
          attributionControl: false
        },
        center  : {
          lat : 46.781001,
          lng : 6.647128,
          zoom: zoom
        },
        markers : {
          user: {
            lat : 46.781001,
            lng : 6.647128,
            icon: Icons.user
          }
        },
        events  : {
          map: {
            enable: ['click'],
            logic : 'emit'
          }
        },
        geojson : {}
      };
    }

    /**
     * Adds the received path as a geojson layer on the config object for the minimap.
     * @param pathData A GeoJSON object representing the path
     */
    function addPath(pathData) {
      service.config.geojson.path = {
        data : pathData,
        style: {
          color : 'red',
          weigth: 6
        }
      };
      console.log(service.config);
    }

    /**
     * Updates the markers on the mini-map, following the changes passed as the argument.
     * @param mapMarkerChanges An object with at least a removed and added properties, that contains respectivly the map markers to delete and to add.
     */
    function updateMapMarkers(mapMarkerChanges) {
      $log.log(mapMarkerChanges);
      _.each(mapMarkerChanges.hidden, function (marker) {
        delete service.config.markers[marker.properties.id_poi];
      });
      _.each(mapMarkerChanges.shown, function (marker) {
        service.config.markers[marker.properties.id_poi] = {
          lat : marker.geometry.coordinates[1],
          lng : marker.geometry.coordinates[0],
          icon: Icons.get(marker.properties.theme_name)
        }
      });
      $log.log(service.config);
    }

  }
})();
