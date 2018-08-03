//TB-BIOSENTIERS
//This file was fully created during the TB
//LokiJs  use this file to generate or update and do request on the observation collection
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


  /**TB-BIOSENTIERS
   * An add and update functions were created. But the developper said that we can do two in once, here we go with the upsert. 
   * Add or Update an  Observation in the lokiJs database.
   * @param {Observation} observation - An object representing the new Observation to add.
   */
   function upsertOne(observation) {
    var observationCollection;
    return getCollection()
      .then(function(coll) {
        observationCollection = coll;
         return coll.findOne({observationId : observation.observationId});})
      .then(function(observationFound) {
        if(observationFound === null){
          return observationCollection.insert(observation);          
        }
        else{          
          //Should keep the observation object returned by the fineOne request cause this one have additional meta data
          //Which are important to match the observation entity and do the update.
          observationFound.text = observation.text;
          return observationCollection.update(observationFound);          
        }
      })
      .catch(handleError)
      .finally(DbBio.save);
    } 
        
    //TB-BIOSENTIERS
    //TODELETE Custom remove function to make test on the data base without deleting the app
    //Check the excursion.controller.js file
    function removeObservation() {
         return DbBio.removeObsColl();
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
