(function() {
  'use strict';
  angular.module('auth-module', []);

  angular.module('auth-module')
    .factory('AuthToken', AuthTokenFn);

  function AuthTokenFn(API_URL, JWT_API, $log, $q, InstallationId, InstallationSecret, $http, uuid) {
    var TAG     = "[AuthToken] ",
        tokenDefer,
        service = {
          get: getFn
        };

    return service;

    ////////////////////

    /**
     * Returns an authentification JWT token, either from cache, if the token has already been fetched before,
     * or from an API call if not existing.
     * You can force fetch a new token from the API by passing an object to the opt param with at least a regen property set to true.
     * @param {{regen:Boolean}} opt
     */
    function getFn(opt) {
      opt = opt || {regen: false};
      if (!tokenDefer || opt.regen === true) {
        tokenDefer = $q.defer();
        getDataObject()
          .then(requestToken)
          .then(function(response) {
            tokenDefer.resolve(response.data.token);
          })
          .catch(function(error) {
            $log.error(TAG + 'get error', error);
            tokenDefer.reject(error);
          })
      }
      return tokenDefer.promise;
    }

    /**
     * Construct the data object that will be passed as POST params in the API call to get a JWT Token.
     */
    function getDataObject() {
      return $q.all({
        iid   : InstallationId.getValue(),
        secret: InstallationSecret.getValue()
      })
        .then(function(results) {
          var dataObject = {
            installation : results.iid.id,
            nonce        : uuid(),
            date         : (new Date()).toISOString(),
            authorization: null
          };

          // Creation of the HMAC encoding
          // Documentation of the jsSHA lib : https://github.com/Caligatio/jsSHA
          var shaObj = new jsSHA("SHA-512", "TEXT");
          shaObj.setHMACKey(atob(results.secret), 'BYTES');
          shaObj.update(dataObject.installation + ';' + dataObject.nonce + ';' + dataObject.date);

          dataObject.authorization = shaObj.getHMAC('HEX');
          $log.log(TAG + 'dataObject', dataObject);
          return dataObject;
        })
        .catch(function(error) {
          $log.error(TAG + "getDataObject error", error);
          return error;
        });
    }

    /**
     * Executes the call to the API to authenticate the app
     * @param data A data object, see getDataObject()
     */
    function requestToken(data) {
      return $http.post(API_URL + JWT_API, data);
    }
  }
})
();
