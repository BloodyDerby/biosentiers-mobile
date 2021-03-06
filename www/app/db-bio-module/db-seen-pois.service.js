/**
 * Created by Mathias Oberson on 16.12.2016.
 */
(function() {
  'use strict';
  angular
    .module('db-bio-module')
    .factory('DbSeenPois', DbSeenPoisService);

  function DbSeenPoisService(DbBio, DbSeenSpecies, SeenSpecies, $log) {

    var TAG       = "[DbSeenPois] ",
        COLL_NAME = 'seen-pois',
        service   = {
          fetchAll    : fetchAll,
          countFor    : countFor,
          addOne      : addOne,
          removeAllFor: removeAllFor
        };

    return service;

    /* ----- Public Functions ----- */

    /**
     * Tries to get all the POIs that have been seen for a particuler excursion.
     * @param qrId The qrId of the Excursion for which we want to get all the seen POIs.
     * @return {Promise} A promise of an Array containing the POIs that have been seen for the specified Excursion
     */
    function fetchAll(qrId) {
      return getCollection()
        .then(function(coll) {
          var res = coll.find({qrId: qrId});
          $log.log(TAG + 'getAll:result', res);
          return res;
        })
        .catch(handleError);
    }

    /**
     * Counts the number of Seen Poi for the excursion whose ID matches the one received in argument.
     * @param qrId
     */
    function countFor(qrId) {
      return getCollection()
        .then(function(coll) { return coll.count({qrId: qrId}); })
        .catch(handleError);
    }

    /**
     * Adds a new seen poi to the collection, that matches the given parameter.
     * @param {SeenPoi} seenPoi - The SeenPoi to add to the database.
     */
    function addOne(seenPoi) {
      return getCollection()
        .then(function(coll) { return coll.insert(seenPoi); })
        .then(function(res) {
          return DbSeenSpecies.fetchOne(res.qrId, res.poiData.properties.speciesId);
        })
        .then(function(species) {
          if (!species) {
            return DbSeenSpecies.addOne(SeenSpecies.fromSeenPoi(seenPoi))
          } else {
            species.nbSeen += 1;
            return DbSeenSpecies.updateOne(species);
          }
        })
        .catch(handleError)
        .finally(DbBio.save);
    }

    /**
     * Remove all the SeenPoi from the database whose serverId matches the given excursionId parameter.
     * @param qrId
     */
    function removeAllFor(qrId) {
      return getCollection()
        .then(function(coll) { return coll.removeWhere({qrId: qrId}); })
        .catch(handleError)
        .finally(DbBio.save)
    }

    /* ----- Private Functions ----- */

    // TODO : supprimer en prod
    // function populate(coll, excursionId) {
    //   var poiData = {
    //     geometry  : {
    //       coordinates: [
    //         6.64853712883608,
    //         46.7817862925931,
    //         431.8
    //       ],
    //       type       : "Point"
    //     },
    //     properties: {
    //       commonName : {
    //         de: "Thunbergs Berberitze",
    //         fr: "Epine-vinette de Thunberg",
    //         it: "Crespino di Thunberg",
    //         la: "Berberis thunbergii"
    //       },
    //       createdAt  : "20170402112523",
    //       id_poi      : 166,
    //       speciesId   : 122,
    //       zoneId     : 1,
    //       ownerName  : "Alain Jotterand",
    //       periodEnd  : 5,
    //       periodStart: 5,
    //       theme  : "tree"
    //     },
    //     type      : "Feature"
    //   };
    //   coll.insert([
    //     new Seen(excursionId, 5007, poiData),
    //     new Seen(excursionId, 5010, poiData),
    //     new Seen(excursionId, 5291, poiData),
    //     new Seen(excursionId, 5391, poiData),
    //     new Seen(excursionId, 5018, poiData),
    //     new Seen(excursionId, 5347, poiData)
    //   ]);
    //   DbBio.save();
    // }

    /**
     * Creates a new Seen object, that represents a POI seen in an Excursion
     * The seenAt property of this object will be set as Date.now().
     * @param qrId The qrId of the Excursion in which the POI has been seen
     * @param serverId The serverId of the Excursion in which the POI has been seen
     * @param participantId The id of the participant to the Excursion that has seen the POI
     * @param poiId The id of the POI that has been seen
     * @param poiData The GeoJSON data of the seen POI
     * @constructor
     */
    function Seen(qrId, serverId, participantId, poiId, poiData) {
      this.qrId = qrId;
      this.serverId = serverId;
      this.participantId = participantId;
      this.poiId = poiId;
      this.poiData = poiData;
      this.seenAt = new Date();
    }

    /**
     * Determines how to react to an error when a query is executed.
     * Right now, this does nothing more than logging said error and returning it as a rejected Promise.
     * @param error
     */
    function handleError(error) {
      $log.error(TAG + "handleError", error);
      throw error;
    }

    /**
     * Gets the seen-pois collection from the database.
     * @return {Promise} - The promise of a collection
     */
    function getCollection() {
      return DbBio.getCollection(COLL_NAME);
    }
  }
})();
