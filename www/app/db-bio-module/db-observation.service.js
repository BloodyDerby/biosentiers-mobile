(function() {
  'use strict';
  angular
    .module('db-bio-module')
    .factory('DbObservation', DbObservationFn);

  function DbObservationFn(DbBio, $log, rx) {
    var TAG                = "[DbObservation] ",
        COLL_NAME          = "observation",
        service   = {
          fetchOne    : fetchOne,
          addOne      : addOne,
          updateOne   : updateOne
        };

    return service;

    /* ----- Public Functions ----- */

    /**
     * Fetches one Observation from the database that matches the given qrId and speciesId.
     * @param {String} poiId - The poiId of the observation 
     * @param {String} qrId - The participantId of the observation to fetch
     */
    function fetchOne(poiId, qrId) {
      return getCollection()
        .then(function(coll) { return coll.findOne({poiId: poiId, qrId: qrId}); })
        .catch(handleError);
    }

     /**
     * Adds a new Observation in the database.
     * @param {Observation} observation - An object representing the new Observation to add.
     */
  /*   function addOne(observation) {
      return getCollection()
        .then(function(coll) {return coll.insert(observation); })
        .catch(handleError)
        .finally(DbBio.save)
    } */

    function addOne(observation) {
      var coll;    
          return getCollection()    
            .then(function(collection) {     
          coll = collection;    
          return coll.insert(observation);})    
            .catch(handleError)    
            .finally(function() {    
          console.log(coll);    
          DbBio.save();    
        })    
    }
    

    /**
     * Updates the Observation that matches the given observation object.
     * Uses internal Loki properties to do the matching.
     * @param {Observation} observation - The Observation to update.
     * @return {Promise} - A promise of an updated Observation.
     */
    function updateOne(observation) {
      return getCollection()
        .then(function(coll) { return coll.update(observation); })
        .catch(handleError)
        .finally(DbBio.save)
    }

    /* ----- Private Functions ----- */
    function handleError(error) {
      $log.log(TAG + "error", error);
      throw error;
    }

    /**
     * Gets the observation collection from the database.
     * @return {Promise} - The promise of a collection
     */
    function getCollection() {
      return DbBio.getCollection(COLL_NAME);
    }
  }
})();
