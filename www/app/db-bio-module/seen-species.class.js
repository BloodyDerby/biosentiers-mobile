(function() {
  'use strict';
  angular
    .module('db-bio-module')
    .factory('SeenSpecies', SeenSpeciesFn);

  function SeenSpeciesFn() {
    /**
     * Creates a new SeenSpecies object with the given values.
     * @param {String} qrId
     * @param {String} serverId
     * @param {String} participantId
     * @param {String} speciesId
     * @param {String} theme
     * @param {Object} commonName
     * @constructor
     */
    function SeenSpecies(qrId, serverId, participantId, speciesId, theme, commonName) {
      this.qrId = qrId;
      this.serverId = serverId;
      this.participantId = participantId;
      this.speciesId = speciesId;
      this.theme = theme;
      this.commonName = commonName;
      this.nbSeen = 1;
    }

    /**
     * Creates a new SeenSpecies object from a SeenPoi object.
     * @param {String} seenPoi.qrId - The qrId of the excursion
     * @param {String} seenPoi.serverId - The serverId of the excursion
     * @param {String} seenPoi.participantId - The participantId for this excursion
     * @param {String} seenPoi.poiData.properties.speciesId - The speciesId of the SeenSpecies
     * @param {String} seenPoi.poiData.properties.theme - The theme of the SeenSpecies
     * @param {Object} seenPoi.poiData.properties.commonName - The commonName(s) of the SeenSpecies
     * @return {SeenSpecies}
     */
    SeenSpecies.fromSeenPoi = function(seenPoi) {
      return new SeenSpecies(
        seenPoi.qrId,
        seenPoi.serverId,
        seenPoi.participantId,
        seenPoi.poiData.properties.speciesId,
        seenPoi.poiData.properties.theme,
        seenPoi.poiData.properties.commonName
      )
    };

    return SeenSpecies;
  }
})();
