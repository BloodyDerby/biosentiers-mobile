/**
 * Created by Mathias Oberson on 10.02.2017.
 */
(function() {
  'use strict';
  angular
    .module('app')
    .controller('ExcursionSeenCtrl', ExcursionSeenCtrl);

  function ExcursionSeenCtrl(ActivityTracker, EventLogFactory, excursionData, DbSeenSpecies, $log, $scope, $state) {
    var TAG           = "[ExcursionSeenCtrl] ",
        excursionSeen = this;
    excursionSeen.excursion = excursionData;
    excursionSeen.goToSpeciesCard = goToSpeciesCard;

    $scope.$on('$ionicView.enter', function() {
      ActivityTracker(EventLogFactory.navigation.excursion.seenPois.list(excursionData));
    });

    DbSeenSpecies.fetchAll({qrId: excursionSeen.excursion.qrId})
      .then(function(data) {
        $log.log(TAG + 'seen species', data);
        excursionSeen.seenSpecies = data;
      });

    ////////////////////
    
    function goToSpeciesCard(seenSpecies) {
      ActivityTracker(EventLogFactory.navigation.excursion.seenPois.card(seenSpecies.speciesId, excursionSeen.excursion));
      $state.go('app.excursion.seenlist.poi', {theme: seenSpecies.theme, speciesId: seenSpecies.speciesId})
    }
  }
})();
