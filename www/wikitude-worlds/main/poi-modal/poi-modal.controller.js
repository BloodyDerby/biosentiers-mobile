/**
 * Created by Mathias Oberson on 08.05.2017.
 */
(function() {
  'use strict';
  angular
    .module('poi-modal')
    .controller('PoiModalCtrl', PoiModalCtrlFn);

  function PoiModalCtrlFn(ArView, Excursion, $log, Modals, $ionicPopup, PoiCardService) {
    var poiCtrl = this;

    poiCtrl.remove = Modals.removeCurrent;
    poiCtrl.setPoiSeen = setPoiSeen;

    poiCtrl.getImageSource = getImageSource;

    Excursion.currentPoiChangeObs.subscribe(function(data) {
      $log.log('PoiModal:currentPoiChangeObs', data);
      poiCtrl.poi = data.poi;
      poiCtrl.commonNameLanguages = Object.keys(poiCtrl.poi.properties.common_name);
      $log.log('PoiModalCtrl:poiCtrl.commonNameLanguages', poiCtrl.commonNameLanguages);
      PoiCardService.setup(poiCtrl, data.details);
    });

    ////////////////////

    function getImageSource(id) {
      return "./assets/img/" + id + "a.jpg";
    }

    function setPoiSeen() {
      Modals.removeCurrent().then(function() {
        ArView.setPoiSeen(poiCtrl.poi);
      });
    }
  }
})();
