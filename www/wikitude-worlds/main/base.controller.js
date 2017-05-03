(function() {
  angular
    .module('ar')
    .controller('BaseCtrl', BaseCtrl);

  function BaseCtrl(AppActions, ArView, Modals, $log, Excursion, $scope) {
    var base = this;

    base.positionStatus = 'searching';
    base.poi = null;
    base.poiDetails = null;
    base.hasReachedEnd = false;
    base.removePoiModal = removePoiModal;
    base.setPoiSeen = setPoiSeen;
    base.closeAR = closeAR;
    base.showDebugModal = showDebugModal;
    base.showFiltersModal = showFiltersModal;
    base.finishExcursion = finishExcursion;
    base.maxScalingDistance = AR.context.scene.maxScalingDistance || 0;
    base.minScalingDistance = AR.context.scene.minScalingDistance || 0;
    base.scalingFactor = AR.context.scene.scalingFactor * 100 || 0;

    // Cleanup the modal when we're done with it!
    $scope.$on('$destroy', function() {
      base.poi = null;
      base.poiDetails = null;
    });
    // Execute action on hide modal
    $scope.$on('modal.hidden', function() {
      // Execute action
      console.log('modal hidden');
    });
    // Execute action on remove modal
    $scope.$on('modal.removed', function() {
      // Execute action
      console.log('modal removed');
    });

    $scope.$watch('base.maxScalingDistance', _.debounce(function(value) {
      $log.log('debug-icon-size - maxScalingDistance', value);
      AR.context.scene.maxScalingDistance = value;
    }), 250);

    $scope.$watch('base.minScalingDistance', _.debounce(function(value) {
      $log.log('debug-icon-size - minScalingDistance', value);
    }), 250);

    $scope.$watch('base.scalingFactor', _.debounce(function(value) {
      $log.log('debug-icon-size - scalingFactor', value);
    }), 250);

    Excursion.currentPoiChangeObs.subscribe(function(data) {
      base.poi = data.poi;
      base.poiDetails = data.details;
      showPoiModal(data.poi.properties.theme_name);
    });

    ArView.excursionEndReachedObs.subscribe(function() {
      base.hasReachedEnd = true;
    });

    ////////////////////

    function closeAR() {
      $log.debug('Closing the AR');
      AppActions.execute('close');
    }

    function finishExcursion() {
      AppActions.execute('finishExcursion', {excursionId: Excursion.id});
    }

    function showDebugModal() {
      Modals.showDebugPosition($scope);
    }

    function showFiltersModal() {
      Modals.showFilters($scope);
    }

    function showPoiModal(type) {
      Modals.showPoi(type, $scope);
    }

    function removePoiModal() {
      return Modals.removeCurrent();
    }

    function setPoiSeen() {
      var poi = base.poi;
      removePoiModal().then(function() {
        ArView.setPoiSeen(poi);
      });
    }
  }
})();
