(function() {
  'use strict';

  angular
    .module('ar-view')
    .factory('ArMarker', ArMarkerClass);

  function ArMarkerClass(ArBaseMarker, ArIcons) {
    /**
     * This class represent a geolocalized marker in the ArView.
     * @param poi The GeoJSON poi object representing the ArMarker to create
     * @param enabled A Boolean indicating wether or not the ArMarker should be visible in the ArView
     * @param onClick A callback that will be executed whenever the ArMarker is clicked in the ArView
     * @param hasBeenSeen A Boolean indicating wether or not the ArMarker has already been seen by the user
     * @constructor
     */
    function ArMarker(poi, enabled, onClick, hasBeenSeen) {
      ArBaseMarker.call(this, poi, enabled);

      var self = this;

      self.id = poi.properties.id;
      self.hasBeenSeen = hasBeenSeen;

      self.actionRange = new AR.ActionRange(self.location, self.minActiveDistance, {
        onEnter: setActive(self),
        onExit : setInactive(self)
      });

      if (self.distanceToUser() > self.minActiveDistance) {
        self.icon = ArIcons.getInactive(self.properties.theme, self.hasBeenSeen);
      } else {
        self.icon = ArIcons.getActive(self.properties.theme, self.hasBeenSeen);
      }

      self.geoObject.onClick = onClick(self);
      self.geoObject.drawables.cam = [self.icon];
    }

    ArMarker.prototype = Object.create(ArBaseMarker.prototype);
    ArMarker.prototype.constructor = ArMarker;

    // Methods

    /**
     * Update the ArPoi to reflect the fact that it had been seen by the user.
     * This means:
     *  * setting its flag to true
     *  * changing its icon
     */
    ArMarker.prototype.setSeen = function() {
      this.hasBeenSeen = true;
      this.geoObject.drawables.cam = [ArIcons.getActive(this.properties.theme, this.hasBeenSeen)];
    };

    /**
     * Removes the ArPoi from the ArView, along with all of its componants.
     */
    ArMarker.prototype.remove = function() {
      // Remove the location and geoObject
      ArBaseMarker.prototype.remove.call(this);
      this.actionRange.destroy();
      this.actionRange.destroyed && (this.actionRange = null);
    };

    return ArMarker;

    ////////////////////

    /**
     * Returns a Closure to use as callback for the onEnter event of an ArPoi's ActionRange.
     * @param ArPoi The ArPoi for which the closure will be created.
     * @return {Function} The Closure to use as callback.
     */
    function setActive(ArPoi) {
      /**
       * This function will be fired any time the user is within an ArPoi ActionRange.
       * It will change the ArPoi's Icon to an opaque one, indicating that the ArPoi can be clicked.
       */
      return function onEnterSetActive() {
        ArPoi.geoObject.drawables.cam = [ArIcons.getActive(ArPoi.properties.theme, ArPoi.hasBeenSeen)];
      }
    }

    /**
     * Returns a Closure to use as callback for the onExit event of an ArPoi's ActionRange.
     * @param ArPoi The ArPoi for which the closure will be created.
     * @return {Function} The Closure to use as callback.
     */
    function setInactive(ArPoi) {
      /**
       * This function will be fired any time the user moves out of an ArPoi's ActionRange.
       * It will change the ArPoi's Icon to a transparent one, indicating that the ArPoi can't be clicked.
       */
      return function onExitSetInactive() {
        ArPoi.geoObject.drawables.cam = [ArIcons.getInactive(ArPoi.properties.theme, ArPoi.hasBeenSeen)];
      }
    }
  }
})();
