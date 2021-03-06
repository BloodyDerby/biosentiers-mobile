/**
 * This service is responsible for interacting with the local database,
 * but only when these interactions concerns Excursion(s) data.
 */
(function() {
  'use strict';
  angular
    .module('db-bio-module')
    .factory('DbExcursions', DbExcursions);

  function DbExcursions(ActivityTracker, EventLogFactory, ExcursionClass, ExcursionsSettings, DbBio, DbSeenPois, $ionicPopup, $cordovaToast, $log, $q, rx) {
    var TAG                  = "[DbExursions] ",
        COLL_NAME            = 'excursions',
        COLL_OPTIONS         = {
          unique: ['qrId']
        },
        archivedSubject      = new rx.ReplaySubject(1),
        removedSubject       = new rx.ReplaySubject(1),
        restoredSubject      = new rx.ReplaySubject(1),
        reinitializedSubject = new rx.ReplaySubject(1),
        service              = {
          fetchAll         : fetchAll,
          fetchOne         : fetchOne,
          countAll         : countAll,
          getStats         : getStats,
          createOne        : createOne,
          archiveOne       : archiveOne,
          removeOne        : removeOne,
          reinitializeOne  : reinitializeOne,
          restoreOne       : restoreOne,
          setOngoingStatus : setOngoingStatus,
          setFinishedStatus: setFinishedStatus,
          setNotNew        : setNotNew,
          setNew           : setNew,
          setPausedDate    : setPausedDate,
          archivedObs      : archivedSubject.asObservable(),
          removedObs       : removedSubject.asObservable(),
          restoredObs      : restoredSubject.asObservable(),
          reinitializeObs  : reinitializedSubject.asObservable()
        };

    return service;

    ////////////////////

    /**
     * Retrieve all the saved Excursions
     * @param {Object} criterias An option object respecting the MongoDB syntax that will be used to filter the excursions.
     * @return {Promise} A promise of an array of Excursions
     */
    function fetchAll(criterias) {
      criterias = angular.copy(criterias);
      // If the Excursions are set to not show the Archived one, add the corresponding filter to find only excursions that have no archivedAt value.
      if (ExcursionsSettings.withArchive.value === false) {
        criterias.archivedAt = null;
      }
      return getCollection()
        .then(function(coll) {
          $log.log(TAG + 'getAll', coll, criterias);
          return coll.chain().find(criterias).simplesort('date', true).data();
        }).catch(handleError);
    }

    /**
     * Fetchs the excursion matching the given qrId, if such an excursion exists.
     * @param {String} qrId - The qrId of the excursion to fetch
     * @return {Promise} - A promise of a single Excursion object.
     */
    function fetchOne(qrId) {
      return getCollection()
        .then(function(coll) { return coll.findOne({qrId: qrId}); })
        .catch(handleError);
    }

    /**
     * Counts the number of Excursions in the database
     * @return {Promise} A promise of the number of Excursions in the DB
     */
    function countAll() {
      return getCollection()
        .then(function(coll) { return coll.count(); })
        .catch(handleError);
    }

    /**
     * Returns information about the excursions as an object with the properties all, pending, ongoing and finished.
     * Each of these properties's value will be the number of corresponding excursions.
     * @return {Promise}
     */
    function getStats() {
      // If the Excursions are set to not show the Archived one, add the corresponding filter to find only excursions that have no archivedAt value.
      var options = ExcursionsSettings.withArchive.value === false ? {archivedAt: null} : {};
      return getCollection()
        .then(function(coll) {
          return coll.chain().find(options).mapReduce(statsMap, statsReduce);
        })
        .catch(handleError);

      ////////////////////

      /**
       * Maps the received elements to their corresponding status.
       * @param element The current element
       */
      function statsMap(element) {
        return element.status;
      }

      /**
       * Aggregate the statutes as an object of count.
       * @param statuses An array of all the excursions statuses.
       * @return {{all, pending: number, ongoing: number, finished: number}}
       */
      function statsReduce(statuses) {
        var stats = {
          all     : statuses.length,
          pending : 0,
          ongoing : 0,
          finished: 0
        };
        statuses.forEach(function(element) {
          stats[element] += 1;
        });
        return stats;
      }
    }

    /**
     * Creates a new Excursion in the database, based on the data provided through newExcursionData
     * @param newExcursion The new Excursion to save
     * @return {Promise} A promise of a new Excursion
     */
    function createOne(newExcursion) {
      return getCollection()
        .then(function(coll) {
          $log.log(TAG + 'newExcursionData', newExcursion);
          return coll.insert(newExcursion);
        })
        .then(function(result) {
          ActivityTracker(EventLogFactory.excursion.created(result));
        })
        .catch(handleError)
        .finally(DbBio.save);
    }

    /**
     * Updates a document in the local database that correspond to the given object.
     * The values of existing properties will be changed, new properties will be added and missing properties will be removed.
     * The object passed as a parameter must have the $loki and meta properties, required by LokiJS.
     * When the update is performed, the in-memory database is saved on the device's filesystem.
     * @param excursion An object of the Excursion to update
     * @return {Promise} A promise of an updated document.
     */
    function updateOne(excursion) {
      $log.log(TAG + 'Updating');
      return getCollection()
        .then(function(coll) { return coll.update(excursion); })
        .catch(handleError)
        .finally(DbBio.save);
    }

    /**
     * Archive the given excursion.
     * This means setting its 'archivedAt' property to the current datetime.
     * This is only possible if this property has not already been set before.
     * If a 'new' excursion is archived, it's setted to 'not new', then archived
     * @param excursion
     * @return {Promise}
     */
    function archiveOne(excursion) {
      $log.log(TAG + 'Archiving');
      if (!excursion) throw new TypeError('DbExcursions : archiveOne needs an Excursion object as its first argument, none given');
      if (excursion.archivedAt !== null) return $q.resolve(excursion);
      excursion.archivedAt = new Date();
      // Remove the "new" flag if it exists
      excursion.isNew && (excursion.isNew = false);
      return updateOne(excursion)
        .then(function(result) {
          ActivityTracker(EventLogFactory.excursion.archived(result));
          archivedSubject.onNext(result);
          $cordovaToast.showShortBottom('"' + result.name + '" archivée.');
        });
    }

    /**
     * Restore the given excursion.
     * This means setting its 'archivedAt' property to null.
     * This is only possible if this property is not already equal to null.
     * @param excursion
     * @return {Promise}
     */
    function restoreOne(excursion) {
      if (!excursion) throw new TypeError('DbExcursions : restoreOne needs an Excursion object as its first argument, none given');
      if (excursion.archivedAt === null) return $q.resolve(excursion);
      excursion.archivedAt = null;
      return updateOne(excursion)
        .then(function(result) {
          ActivityTracker(EventLogFactory.excursion.restored(result));
          restoredSubject.onNext(result);
          $cordovaToast.showShortBottom('"' + result.name + '" restaurée.')
        });
    }

    /**
     * Removes the given excursion from the database. This will also remove all the SeenPoi for this excursion from the database.
     * This can only be done if the given excursion has been archvied.
     * @param excursion
     */
    function removeOne(excursion) {
      if (!excursion) throw new TypeError('DbExcursions : removeOne needs an Excursion object as its first argument, none given');
      if (excursion.archivedAt === null) throw new Error('DbExcursions: removeOne can only remove an excursion if it has previously been archived.');

      var confirmPopup = $ionicPopup.confirm({
        title     : 'Supprimer une sortie',
        subTitle  : excursion.name,
        template  : "<p>Ceci supprimera définitivement la sortie, ainsi que l'historique de ses éléments vus.</p><p><strong>Cette action est irréversible !</strong></p>",
        cancelText: "Annuler",
        okText    : "Supprimer",
        okType    : "button-assertive"
      });

      return confirmPopup.then(function(res) {
        if (res) {
          return getCollection()
            .then(function(coll) { coll.remove(excursion); })
            .then(function() { DbSeenPois.removeAllFor(excursion.qrId); })
            .then(function() {
              ActivityTracker(EventLogFactory.excursion.deleted(excursion));
              removedSubject.onNext(excursion);
              $cordovaToast.showShortBottom('"' + excursion.name + '" supprimée.')
            })
            .catch(handleError)
            .finally(DbBio.save);
        } else {
          return false;
        }
      });
    }

    /**
     * Reinitializes an excursion. This means reverting its status back as if it had just been scanned by the user.
     * Shows a popup before actually reinitializing the excursion, to ask confirmation to the user.
     * @param excursion
     */
    function reinitializeOne(excursion) {
      if (!excursion) throw new TypeError('DbExcursions : reinitializeOne needs an Excursion object as its first argument, none given');
      if (excursion.status !== 'finished') throw new Error('DbExcursions: reinitializeOne can only reinitialize an excursion if it has previously been finished.');

      var excursionCache,
          confirmPopup = $ionicPopup.confirm({
            title     : 'Réinitialiser une sortie',
            subTitle  : excursion.name,
            template  : "<p>La sortie <strong>" + excursion.name + "</strong> va revenir à son état initial, comme si son QR Code venait d'être scanné.</p><p>La liste des éléments vus lors de cette sortie va être supprimée.</p><p><strong>Attention, cette opération est irréversible.</strong></p>",
            cancelText: "Annuler",
            okText    : "Réinitialiser",
            okType    : "button-energized"
          });

      return confirmPopup.then(function(res) {
        if (res) {
          return getCollection()
            .then(function(coll) {
              excursionCache = angular.copy(excursion);
              excursion.isNew = true;
              excursion.startedAt = null;
              excursion.pausedAt = null;
              excursion.finishedAt = null;
              excursion.archivedAt = null;
              excursion.status = 'pending';
              return coll.update(excursion);
            })
            .then(function() { return DbSeenPois.removeAllFor(excursion.qrId); })
            .then(function() {
              ActivityTracker(EventLogFactory.excursion.reinitialized(excursionCache));
              reinitializedSubject.onNext(excursion);
              $cordovaToast.showShortBottom('"' + excursion.name + '" réinitialisée.');
            })
            .catch(handleError)
            .finally(DbBio.save);
        } else {
          return false;
        }
      });
    }

    /**
     * Changes the status of a single excursion, passed as argument, and updates this excursion in the Loki DB.
     * Only an excursion with a 'pending' status could have its status changed to 'ongoing'.
     * If you pass an excursion with a status other than 'pending', the promise will be resolved, but the excursion will remain untouched.
     * @param {ExcursionClass} excursion The excursion whose status should be set as 'oingoing'
     * @param {String} excursion.status This property must have a value of 'pending'. It will be set to 'ongoing'
     * @param {Number} excursion.startedAt This property should be empty. It will be set as the current timestamp.
     * @return {Promise} A promise of an updated Excursion
     */
    function setOngoingStatus(excursion) {
      if (!excursion) throw new TypeError('DbExcursions : setOngoingStatus needs an Excursion object as its first argument, none given');
      if (excursion.status !== 'pending') return $q.resolve(excursion);
      excursion.status = 'ongoing';
      excursion.startedAt = new Date();
      return updateOne(excursion);
    }

    /**
     * Changes the status of a single excursion, passed as argument, and updates this excursion in the Loki DB.
     * Only an excursion with an 'ongoing' status value can have its status changed to 'finished'.
     * Note that if you pass an excursion with a status other than 'ongoing', the promise will be resolved, but the excursion will remain untouched.
     * @param {ExcursionClass} excursion The excursion whose status should be set as 'finished'
     * @param {String} excursion.status This property must have a value of 'ongoing'. It will be set to 'finished'
     * @param {Number} excursion.finishedAt This property should be empty. It will be set as the current timestamp.
     * @return {Promise} A promise of an updated Excursion
     */
    function setFinishedStatus(excursion) {
      $log.log(TAG + "finishing excursion", excursion);
      if (!excursion) throw new TypeError('DbExcursions : setFinishedStatus needs an Excursion object as its first argument, none given');
      if (excursion.status !== 'ongoing') return $q.resolve(excursion);
      excursion.status = 'finished';
      excursion.finishedAt = new Date();
      ActivityTracker(EventLogFactory.excursion.finished(excursion));
      return updateOne(excursion);
    }

    /**
     * TODO: Comment this function
     * @param excursion
     * @return {Promise}
     */
    function setNotNew(excursion) {
      $log.log(TAG + 'Setting as not new');
      if (!excursion) throw new TypeError('DbExcursions : setNotNew needs an Excursion object as its first argument, none given');
      if (!excursion.isNew) return $q.resolve(excursion);
      excursion.isNew = false;
      // The call to ActivityTracker is done in the excursion-list-action-sheet.service.js file, because the event should only be logged when the user manually unflag an excursion.
      return updateOne(excursion);
    }

    /**
     * Set the given excursion as "new".
     * This can only be done if the excursion is not already "new" and is in a "pending" state.
     * @param excursion
     * @return {Promise}
     */
    function setNew(excursion) {
      if (!excursion) throw new TypeError('DbExcursions : setNew needs an Excursion object as its first argument, none given');
      if (excursion.isNew || excursion.status !== 'pending') return $q.resolve(excursion);
      excursion.isNew = true;
      ActivityTracker(EventLogFactory.excursion.flaggedAsNew(excursion));
      return updateOne(excursion)
    }

    /**
     * Sets or changes the value of the "pausedAt" attribute of the given excursion.
     * @param excursion
     * @return {Promise}
     */
    function setPausedDate(excursion) {
      if (!excursion) throw new TypeError('DbExcursions : setNew needs an Excursion object as its first argument, none given');
      excursion.pausedAt = new Date();
      ActivityTracker(EventLogFactory.excursion.paused(excursion));
      return updateOne(excursion);
    }

    /**
     * Determines how to react to an error when a query is executed.
     * Right now, this does nothing more than logging said error and returning it as a rejected Promise.
     * @param {*} error
     * @return {Promise} A rejected promise whose value is the received error.
     */
    function handleError(error) {
      $log.error(TAG + "handleError", error);
      throw error;
    }

    /**
     * TODO : supprimer en production
     * Insert dumy data inside the given collection
     * @param coll
     */
    function populateDb(coll) {
      var participant = {
        id  : 'xf8',
        name: 'Robert'
      };
      var themes = ['bird', 'flower', 'butterfly', 'tree'];
      var zones = [1, 5, 8];
      coll.insert([
        new ExcursionClass('Mme Adams', '3', new Date('2016.05.12'), 'Deuxième sortie de classe', participant, themes, zones),
        new ExcursionClass('Ben', '1', new Date('2016.03.12'), 'Promenade de vacances', participant, themes, zones),
        new ExcursionClass('Jens', '4', new Date('2016.08.21'), 'Dernière sortie de classe', participant, themes, zones),
        new ExcursionClass('Mr Harnold', '2', new Date('2016.03.10'), 'Première sortie de classe', participant, themes, zones),
        new ExcursionClass('Mathias', '5', new Date('2016.10.22'), 'Deuxième sortie de classe', participant, themes, zones)
      ]);
      DbBio.save();
    }

    /**
     * Gets the excursion collection from the database.
     * If the database doesn't exist yet, it will be created with the COLL_OPTIONS, and then returned.
     * @return {Promise} - The promise of a collection
     */
    function getCollection() {
      return DbBio.getCollection(COLL_NAME, COLL_OPTIONS);
    }
  }
})();
