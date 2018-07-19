(function() {
  'use strict';
  angular
    .module('db-bio-module')
    .factory('DbObservation', DbObservationFn);

  function DbObservationFn(DbBio, $log, rx) {
    var TAG                = "[DbObservation] ",
        COLL_NAME          = "observation",
        COLL_OPTIONS         = {
          unique: ['observationId']
        },
        service   = {
          fetchAll    : fetchAll,
          fetchOne    : fetchOne,
          addOne      : addOne,
          updateOne   : updateOne,
          removeObservation : removeObservation,
        };

    return service;

    /* ----- Public Functions ----- */
        /**
     * Retrieve all the saved Excursions
     * @param {Object} criterias An option object respecting the MongoDB syntax that will be used to filter the excursions.
     * @return {Promise} A promise of an array of Excursions
     */
    function fetchAll(criterias) {
      criterias = angular.copy(criterias);
      return getCollection()
        .then(function(coll) {
          $log.log(TAG + 'getAll', coll, criterias);
          return coll.chain().find(criterias).data();
        }).catch(handleError);
    }

    /**
     * Fetches one Observation from the database that matches the given qrId and speciesId.
     * @param {String} observationId - Unique id which the combinaison of qrId + poiId
     */
    function fetchOne(observationId) {
      return getCollection()
        .then(function(coll) { return coll.findOne({observationId: observationId}); })
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
          DbBio.save();
        })
    }
    //TODELETE Supprime la collection
    function removeObservation() {
         return DbBio.removeObsColl();
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
      //TODELETE
      console.log("Ici c'est le get Collection du service observation");
      return DbBio.getCollection(COLL_NAME,COLL_OPTIONS);
    }
  }
})();
