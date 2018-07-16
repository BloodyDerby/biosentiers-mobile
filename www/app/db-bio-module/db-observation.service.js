(function() {
  'use strict';
  angular
    .module('db-bio-module')
    .factory('DbSeenSpecies', DbSeenSpeciesFn);

  function DbSeenSpeciesFn(DbBio, $log, rx) {
    var TAG                = "[DbSeenSpecies] ",
        COLL_NAME          = "seen-species",
        seenSpeciesSubject = new rx.ReplaySubject(1),
        service            = {
          fetchOne      : fetchOne,
          fetchAll      : fetchAll,
          addOne        : addOne,
          updateOne     : updateOne,
          countFor      : countFor,
          seenSpeciesObs: seenSpeciesSubject.asObservable()
        };

    return service;

    /* ----- Public Functions ----- */

    /**
     * Fetches one SeenSpecies from the database that matches the given qrId and speciesId.
     * @param {String} qrId - The qrId of the excursion in which the species has been seen
     * @param {String} speciesId - The id of the species to fetch
     */
    function fetchOne(qrId, speciesId) {
      return getCollection()
        .then(function(coll) { return coll.findOne({qrId: qrId, speciesId: speciesId}); })
        .catch(handleError);
    }

    /**
     * Fetches all SeenSpecies from the database that matches the given criteria object.
     * @param {Object} criteria - A MongoDB-like object describing the criteria to match.
     * @return {Promise} - A Promise of one or several SeenSpecies object
     */
    function fetchAll(criteria) {
      return getCollection()
        .then(function(coll) { return coll.find(criteria); })
        .catch(handleError);
    }

    /**
     * Adds a new SeenSpecies in the database.
     * @param {SeenSpecies} seenSpecies - An object representing the new SeenSpecies to add.
     */
    function addOne(seenSpecies) {
      return getCollection()
        .then(function(coll) { return coll.insert(seenSpecies); })
        .then(function(savedSpecies) { return countFor(savedSpecies.qrId); })
        .then(function(nbSeen) { seenSpeciesSubject.onNext({qrId: seenSpecies.qrId, nbSeen: nbSeen}); })
        .catch(handleError)
        .finally(DbBio.save)
    }

    /**
     * Updates the SeenSpecies that matches the given seenSpecies object.
     * Uses internal Loki properties to do the matching.
     * @param {SeenSpecies} seenSpecies - The SeenSpecies to update.
     * @return {Promise} - A promise of an updated SeenSpecies.
     */
    function updateOne(seenSpecies) {
      return getCollection()
        .then(function(coll) { return coll.update(seenSpecies); })
        .catch(handleError)
        .finally(DbBio.save)
    }

    /**
     * Counts how many species have been seen in the excursion whose qrId matches the one given as argument.
     * @param {String} qrId - The qrId of the excursion for which we want to count the number of SeenSpecies
     * @return {Promise} - A promise of the number of SeenSpecies for the excursion.
     */
    function countFor(qrId) {
      return getCollection()
        .then(function(coll) { return coll.count({qrId: qrId}); })
        .catch(handleError)
    }

    /* ----- Private Functions ----- */

    function handleError(error) {
      $log.log(TAG + "error", error);
      throw error;
    }

    /**
     * Gets the seen-species collection from the database.
     * @return {Promise} - The promise of a collection
     */
    function getCollection() {
      return DbBio.getCollection(COLL_NAME);
    }
  }
})();
