/**
 * Created by Mathias on 29.03.2016.
 */
(function() {
  'use strict';

  angular
    .module('app')
    .controller('ExcursionsListCtrl', ExcursionsListCtrl);

  function ExcursionsListCtrl(excursionsData, $ionicSideMenuDelegate, $ionicTabsDelegate, $log) {
    var excursions = this;
    // excursions.loading = true;
    $log.log('excursionsData', excursionsData);
    excursions.data = excursionsData;

    excursions.nextTab = nextTab;
    excursions.previousTab = previousTab;

    ////////////////////

    /**
     * Returns true if the Side Menu is not being open, and false otherwise.
     * @return {boolean}
     */
    function menuIsNotOpening() {
      return $ionicSideMenuDelegate.getOpenRatio() === 0;
    }

    /**
     * Manually navigate to the next tab in the page.
     */
    function nextTab() {
      if (menuIsNotOpening()) {
        var selected = $ionicTabsDelegate.selectedIndex();
        if (selected !== -1 && selected !== 0) {
          $ionicTabsDelegate.select(selected - 1);
        }
      }
    }

    /**
     * Manually navigate to the previous tab in the page.
     */
    function previousTab() {
      if (menuIsNotOpening()) {
        var selected = $ionicTabsDelegate.selectedIndex();
        if (selected !== -1) {
          $ionicTabsDelegate.select(selected + 1);
        }
      }
    }
  }
})();
