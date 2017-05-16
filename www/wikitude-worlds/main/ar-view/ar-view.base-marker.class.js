/**
 * Created by Mathias Oberson on 03.02.2017.
 */
(function() {
  'use strict';
  angular
    .module('ar-view')
    .service('ArBaseMarker', ArBaseMarkerClass);

  function ArBaseMarkerClass(Altitude, $log) {
    /**
     *
     * @constructor
     */
    function ArBaseMarker(poi, enabled) {
      if (typeof poi === 'undefined') throw TypeError("The ArBaseMarker constructor needs a GeoJSON object as its first parameter, none given.");
      enabled = typeof enabled !== 'undefined' ? enabled : true;

      var self = this;

      self.poi = poi;
      self.properties = poi.properties;
      self.relativeAltitudeDelta = Altitude.getRelativeDelta(self.poi.properties.theme_name);

      $log.debug('ArBaseMarker -> self', self);
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
  }
})();
