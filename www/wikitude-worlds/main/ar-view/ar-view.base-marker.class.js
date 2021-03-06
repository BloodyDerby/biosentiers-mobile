/**
 * Created by Mathias Oberson on 03.02.2017.
 */
(function() {
  'use strict';
  angular
    .module('ar-view')
    .service('ArBaseMarker', ArBaseMarkerClass);

  function ArBaseMarkerClass(Altitude, $log) {
    var TAG = "[ArBaseMarker] ";

    /**
     * This class represents the ArMarker that represents the POIs in the AR view.
     * @param {GeoJSON} poi A GeoJSON object representing the poi that will be displayed on the AR view.
     * @param {Boolean} enabled Indicates wether or not the constructed ArMarker should be visible in the AR view.
     * @constructor
     */
    function ArBaseMarker(poi, enabled) {
      if (typeof poi === 'undefined') throw TypeError("The ArBaseMarker constructor needs a GeoJSON object as its first parameter, none given.");
      enabled = typeof enabled !== 'undefined' ? enabled : true;

      var self = this;

      self.poi = poi;
      self.properties = poi.properties;
      self.relativeAltitudeDelta = Altitude.getRelativeDelta(self.properties.theme);
      self.minActiveDistance = getMinActiveDistance(self.properties.theme);

      $log.debug(TAG + 'new ArBaseMarker', self);
      self.location = new AR.GeoLocation(self.poi.geometry.coordinates[1], self.poi.geometry.coordinates[0]);
      Altitude.setFixedAltitude(self);

      self.geoObject = new AR.GeoObject(self.location, {
        enabled: enabled
      });
    }

    /**
     * Return the straight distance between the ArPoi and the user, in meters
     */
    ArBaseMarker.prototype.distanceToUser = function() {
      return this.location.distanceToUser();
    };

    /**
     * Indicates wether or not the ArPoi is currently visible in the ArView.
     */
    ArBaseMarker.prototype.isVisible = function() {
      return this.geoObject.enabled;
    };

    /**
     * Change the visibility of the ArPoi based on the value of the visible argument.
     * To make an hidden ArPoi visible, call this function and pass it true as its argument's value.
     * To make a visible ArPoi hidden, call this function and pass it false as its argument's value.
     * @param visible A boolean indicating wether or not the ArPoi should be visible
     * @return {ArBaseMarker} The ArPoi whos visibility has been changed.
     */
    ArBaseMarker.prototype.setVisible = function(visible) {
      this.geoObject.enabled = visible;
      return this;
    };

    /**
     * Removes the ArPoi from the ArView, along with all of its componants.
     */
    ArBaseMarker.prototype.remove = function() {
      this.location.destroy();
      this.location.destroyed && (this.location = null);
      this.geoObject.destroy();
      this.geoObject.destroyed && (this.geoObject = null);
    };

    return ArBaseMarker;

    ////////////////////

    function getMinActiveDistance(theme) {
      var distances = {
        'bird': 40,
        'butterfly': 40
      };

      var res = distances.hasOwnProperty(theme) ? distances[theme] : AR.context.scene.minPoiActiveDistance;
      $log.log(TAG + 'minActiveDistance', res);
      return res;
    }
  }
})();
