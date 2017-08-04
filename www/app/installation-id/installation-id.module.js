/*
  Service responsible for generating and reading the installation id of an app instance.
  This installation id will then be used when connecting to the backend for synchonization purposes.
  To get the value of this id, call the only service's method getValue ; the actual value is accesible through the id property of the result
 */
(function() {
  'use strict';
  angular.module('installation-id-module', []);

  angular.module('installation-id-module')
    .factory('InstallationId', InstallationIdFn);

  function InstallationIdFn($cordovaFile, $log, $q) {
    var deferred,
        fileName = 'installation-id.txt',
        service  = {
          getValue: fetchOrCreate,
          regen   : regenFn
        };

    return service;

    ////////////////////

    /**
     * Fetches or Creates the installation id for this application instance.
     * @return {Promise} If resolved, the value will be that of the iid. If rejected, it will contains some error object or message.
     */
    function fetchOrCreate() {
      if (!deferred) {
        deferred = $q.defer();
        $cordovaFile.checkFile(cordova.file.dataDirectory, fileName)
          .then(readFile)
          .catch(failedChedk)
      }
      return deferred.promise;
    }

    /**
     * Reads the iid from the installation-id.txt file.
     * Will resolve the getValue promise if successful and reject it if not
     */
    function readFile() {
      $cordovaFile.readAsText(cordova.file.dataDirectory, fileName)
        .then(function(content) {
          console.log('Installation Id value', content);
          deferred.resolve(JSON.parse(content));
        })
        .catch(function(error) {
          deferred.reject(error);
        })
    }

    /**
     * Triggered when checking for the file existince failed.
     * This failure can be what is expected if the result.code is 1, which means that the file doesn't exist (and thus, it's the first time the app is launched)
     * If it's the case, then a call to createIidFile is made.
     * Oterhwise, the getValue promise is rejected.
     * @param result
     */
    function failedChedk(result) {
      $log.debug('InstallationId checkFile exisence error', result);
      result.code === 1 ? createIidFile() : deferred.reject(result);
    }

    /**
     * Creates the installation-id.txt file and generates the uuid that it will contains.
     * When the creation is successful, the getValue promise is resolved with the iid value.
     * If it fails, then the promise is rejected instead.
     */
    function createIidFile() {
      var now     = new Date(),
          content = {
            id            : b(),
            firstStartedAt: now.toISOString(),
            properties    : {
              device: device
            }
          };
      $log.debug('InstallationId generated iid', content);
      $cordovaFile.writeFile(cordova.file.dataDirectory, fileName, JSON.stringify(content), true)
        .then(function(result) {
          $log.debug('InstallationId create file success', result);
          deferred.resolve(content);
        })
        .catch(function(error) {
          $log.debug('InstallationId create file error', error);
          deferred.reject(error);
        })
    }

    function regenFn() {
      deferred = $q.defer();
      createIidFile();
      return deferred.promise;
    }

    /**
     * Returns a random v4 UUID of the form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx,
     * where each x is replaced with a random hexadecimal digit from 0 to f,
     * and y is replaced with a random hexadecimal digit from 8 to b.
     * @author Jed Schmidt (https://github.com/jed)
     * @link https://gist.github.com/jed/982883
     * @param a
     * @return {string}
     */
    function b(a) {return a ? (a ^ Math.random() * 16 >> a / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, b)}
  }
})();
