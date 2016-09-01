/**
 * Created by Mathias on 25.08.2016.
 * This is the controller for the Big Map modal.
 * It handles showing the points, and further interaction with the bigmap.
 */
(function () {
  'use strict';
  angular
    .module('big-map-modal')
    .controller('BigMapCtrl', BigMapCtrl);

  function BigMapCtrl($log, leafletData, BigMap, BigMapModal, $scope) {
    var bigmap = this;

    // If the controller is active, that means that it's the BigMapModal that's loaded.
    // So, the Modals.closeCurrent closes the BigMap Modal.
    bigmap.remove = BigMapModal.remove;
    bigmap.config = BigMap.config;

    // var debouncedUpdatePoints = _.debounce(BigMap.updateVisiblePoints, 500);

    leafletData.getMap('bigmap').then(function (result) {
      BigMap.setMap(result);
      BigMap.updateVisiblePoints();
      $scope.$on('leafletDirectiveMap.bigmap.moveend', BigMap.updateVisiblePoints);
    }).catch(function (error) {
      $log.error(error);
    });
  }
})();
