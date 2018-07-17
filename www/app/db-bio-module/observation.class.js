(function() {
  'use strict';
  angular
    .module('db-bio-module')
    .factory('Observation', ObservationFn);

  function ObservationFn() {
     /**
       * Creates a new observation object, that represents an observation of a clicked Poi
       * @param {String} text -  The observation of the POI saw
       * @param {String} qrId - The cross id of the participant and server       
       * @param {String} participantId - The id of the participant who did the observation      
       * @param {String} serverId - The id of the current observation 's server(excursion)  
       * @param {String} poiId - The id of the POI which have the observation
       * @constructor
       */
    function Observation(text, qrId, participantId, serverId, poiId) {      
      this.text = text;
      this.qrId = qrId;
      this.participantId = participantId;
      this.serverId = serverId;
      this.poiId = poiId;
    }

    return Observation;
  }
})();
