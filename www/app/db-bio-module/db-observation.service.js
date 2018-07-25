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
          upsertOne   : upsertOne,
          addOne      : addOne,
          updateOne   : updateOne,
          removeObservation : removeObservation,
        };

    return service;

    /* ----- Public Functions ----- */
        /**
     * Retrieve all the saved obserations
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
     * @return {Promise} - A promise of an updated Observation.
     */
    function fetchOne(observationId) {
      return getCollection()
        .then(function(coll) { return coll.findOne({observationId: observationId}); }) 
        .catch(handleError);
    }


  /**
   * Add or Update an  Observation in the database.
   * @param {Observation} observation - An object representing the new Observation to add.
   */
   function upsertOne(observation) {
    var observationCollection;
    return getCollection()
      .then(function(coll) {
        observationCollection = coll;
         return coll.findOne({observationId : observation.observationId});})
      .then(function(observationFound) {
        console.log("observationFound = ", observationFound)
        if(observationFound === null){
          console.log("Nouvelle observation à ajouter", observationCollection);
          return observationCollection.insert(observation);          
        }
        else{          
          console.log("Observation à MAJ", observationCollection);
          //should do modifiy the proprety in the object from res cause this one has meta $loki info. can't update with observation Object
          observationFound.text = observation.text;
          return observationCollection.update(observationFound);          
        }
      })
      .catch(handleError)
      .finally(DbBio.save);
  } 


      /**
     * Adds a new Observation in the database.
     * @param {Observation} observation - An object representing the new Observation to add.
     */
      function addOne(observation) {
        return getCollection()
          .then(function(coll) {return coll.insert(observation);})
          .catch(handleError)
          .finally(DbBio.save);
    } 

            
     /* var coll;
      return getCollection()
        .then(function(collection) {
      coll = collection;
      return coll.insert(observation);})
      .catch(handleError)
      .finally(function() {
        DbBio.save();
      })  */
    
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
      return DbBio.getCollection(COLL_NAME,COLL_OPTIONS);
    }
  }
})();
