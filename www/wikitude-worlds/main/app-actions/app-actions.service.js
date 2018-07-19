/**
 * This service allows the wikitude world to trigger actions in the
 * Ionic application and optionally receive the results.
 *
 * Note that actions must be registered in the Ionic application by
 * adding them with Ionicitude (see `www/app/ionicitude.actions.js`).
 *
 * Created by Mathias on 02.05.2016.
 */
(function() {
  'use strict';

  angular
    .module('bio.world.app-actions')
    .factory('AppActions', AppActionsService);

  function AppActionsService($log, $q, $timeout) {

    var TAG             = "[AppActions] ",
        defaultTimeout  = 30000,
        nextExecutionId = 0,
        pendingActions  = {};

    var service = {
      execute            : execute,
      returnResultFromApp: returnResultFromApp
    };

    return service;

    ////////////////////

    /**
     * Executes a registered action in the Ionic application.
     *
     * @param {String} name - The action to execute (corresponding to a name registered with Ionicitude).
     * @param {Object} params - The action parameters.
     * @param {Object} options - Execution options.
     * @param {Boolean} options.return - Whether the result of executing the action in the Ionic application should be returned to the wikitude world.
     *                                   If true, the returned promise will be resolved with the result (or the error if it failed).
     *                                   Defaults to false. //TODELETE// En clair : tu passes { return: true } en troisième paramètre de execute, et tu peux faire un then sur execute
     * @param {Boolean|Number} options.timeout - A number of milliseconds after which the action will be considered to have timed out and
     *                                           the returned promise will be rejected. You may also pass `false` to disable the timeout entirely.
     *                                           Defaults to 30000 milliseconds.
     *                                           This only has an effect if `options.return` is true.
     * @returns {Promise} A promise that will be resolved or rejected either immediately (if `options.return` is false or not specified)
     *                    or when the action has been executed and the result returned from the Ionic application (if `options.return` is true).
     */
    function execute(name, params, options) {
      options = _.extend({}, options);

      // If no return is necessary, simply execute the action in a promise chain
      // to ensure a promise is returned.
      if (!options.return) {
        return $q.resolve().then(executeInApp);
      }

      // If returning a result from the Ionic application, a deferred object is needed,
      // as the result will be returned later by the application using the `returnResultFromApp` method.
      var deferred = $q.defer();

      // Generate a unique execution ID string to identify the action.
      var executionId = '' + (nextExecutionId++);

      // Create an object to hold data about the action and store it by its ID.
      var action = pendingActions[executionId] = {
        deferred: deferred
      };

      // Create a timeout if necessary.
      var timeout = options.timeout || defaultTimeout;
      if (timeout && timeout >= 1) {
        action.timeout = $timeout(cancel, timeout);
      }

      // Executes the action in the Ionic application, passing the execution ID
      // to keep track of the returned result.
      $q.resolve({
        _executionId: executionId
      }).then(executeInApp);

      // Return the deferred's promise and ensure cleanup after execution.
      return deferred.promise.finally(cleanup);

      function executeInApp(extraData) {

        var fullData = _.extend({}, params, extraData);

        $log.debug(TAG + 'Executing app action ' + name + ' with ' + angular.toJson(fullData) + ' and options ' + angular.toJson(options));

        var dest = "architectsdk://" + name;
        var url = dest + "?" + angular.toJson(fullData);
        document.location = url;
      }

      function cancel() {
        deferred.reject(new Error('App action ' + name + ' has timed out after ' + timeout + 'ms'));
      }

      function cleanup() {
        delete pendingActions[executionId];
      }
    }

    /**
     * Used by the Ionic application to return the results of calling `execute`.
     * Do not call manually. See `www/app/ionicitude.actions.js`.
     *
     * @param {Object} data - The result data returned by the Ionic application.
     * @param {String} data.id - The unique execution ID of the action.
     * @param {String} data.result - The result of the action if it succeeded.
     * @param {String} data.error - The error message if the action failed.
     */
    function returnResultFromApp(data) {

      // Retrieve the execution ID and the action data.
      var executionId = data.id,
          action      = pendingActions[executionId];

      if (!action) {
        $log.warn(TAG + 'Received app result for unknown execution ID ' + executionId + ' (it may have timed out)');
        return;
      }

      // Cancel the timeout (if any).
      if (action.timeout) {
        $timeout.cancel(action.timeout);
      }

      // Resolve or reject the deferred object depending on the result data.
      if (data.error) {
        action.deferred.reject(new Error(data.error));
      } else {
        action.deferred.resolve(data.result);
      }
    }
  }
})();
