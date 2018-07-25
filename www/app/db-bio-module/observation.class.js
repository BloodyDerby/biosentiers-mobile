(function() {
  'use strict';
  angular
    .module('db-bio-module')
    .factory('Observation', ObservationFn);

  function ObservationFn() {
     /**
       * Creates a new observation object, that represents an observation of a clicked Poi
       * @param {String} text -  The observation of the POI saw
       * @param {String} observationId - The qrID + poiId
       * @param {String} qrId - The QRCODE of the excursion       
       * @param {String} participantId - The id of the participant who did the observation      
       * @param {String} serverId - The id (server side) of the current excursion 
       * @param {String} speciesId - The id of the current species  
       * @param {String} poiId - The id of the POI which have the observation
       * @constructor
       */
    function Observation(text, observationId, qrId, participantId, serverId, speciesId, poiId) {      
      this.text = text;
      this.observationId = observationId;
      this.qrId = qrId;
      this.participantId = participantId;
      this.serverId = serverId;      
      this.speciesId = speciesId;
      this.poiId = poiId;
    }

    return Observation;
  }
})();
