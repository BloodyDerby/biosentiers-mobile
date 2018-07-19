/**
 * Created by Mathias Oberson on 07.02.2017.
 */
(function() {
  'use strict';
  angular
    .module('db-bio-module')
    .service('DbBio', DbBioService);

  function DbBioService($ionicPlatform, $log, Loki, $q) {
    var TAG      = "[DbBio] ",
        deferred,
        db,
        prevSave = null,
        service  = {
          getCollection: getCollection,
          reset        : reset,
          save         : save,
          removeObsColl : removeObsColl
        };

    return service;

    ////////////////////

    /**
     * Initializes the DbBio
     */
    function start(name) {
      if (!deferred) {
        deferred = $q.defer();
        $ionicPlatform.ready(function() {
          $log.log(TAG + 'initializing Loki for', name);
          db = new Loki('db', {
            // autosave        : true,
            // autosaveInterval: 10000,
            adapter         : new LokiCordovaFSAdapter({'prefix': 'biosentiers'}),
            autoload        : true,
            autoloadCallback: function(result) {
              $log.warn(TAG + 'loadDatabase:result', result);
              deferred.resolve();
            }
          });
        });
      }
      return deferred.promise;
    }

    /**
     * Get a collection from the DB, based on its name.
     * If the required collection doesn't exist, it will be created with the given options, then returned.
     * @param name The name of the collection to access (or create if not existing)
     * @param options Options to be applied to the collection when created.
     */
    function getCollection(name, options) {
      return start(name).then(function() {
        // db.removeCollection(name);
        var coll = db.getCollection(name);
        if (coll) return coll;
        $log.log(TAG + 'getCollection:' + name + ' options', options);
        coll = db.addCollection(name, options);
        return save().then(function() {
          return coll;
        });
      })
    }

    //TODELETE + DELETE--> dans la déclaration public en haut  FOnction test pour purger la collection d'observation
    function removeObsColl(){
      return start()
		.then(function(){
				return db.removeCollection('observation');
	  		})
        .then(save)
    }

    /**
     * Save the complete database on the device's filesystem.
     * @return {Promise} A promise of the database saved.
     */
    function save() {
      prevSave = $q.when(prevSave).catch(_.noop)
        .then(function() {
          return $q(function(resolve, reject) {
            db.saveDatabase(function(err) {
              $log.log(TAG + 'Save result', err);
              err ? reject(err) : resolve(true);
            });
          });
        });
      return prevSave;
    }

    // TODO : Supprimer en prod
    function reset() {
      return start()
        .then(function() {
          $log.log(TAG + "Removing the excursion collection");
          return db.removeCollection('excursions');
        })
        .then(function() {
          $log.log(TAG + "Removing the seen-pois collection");
          return db.removeCollection('seen-pois');
        })
        .then(function() {
          $log.log(TAG + "Removing the seen-species collection");
          return db.removeCollection('seen-species');
        })
        .then(save)
        .then(function() { deferred = null; })
    }
  }
})();
