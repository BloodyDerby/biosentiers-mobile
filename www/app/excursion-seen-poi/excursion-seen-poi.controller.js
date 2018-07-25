/**
 * Created by Mathias Oberson on 17.05.2017.
 */
(function() {
  'use strict';
  angular
    .module('app')
    .controller('ExcursionSeenPoiCtrl', ExcursionSeenPoiCtrlFn);

  function ExcursionSeenPoiCtrlFn(PoiCardService, PoiContent, $log, $stateParams, DbObservation) {
    var TAG     = "[ExcursionSeenPoiCtrl] ",
        poiCtrl = this;       
        poiCtrl.observation ="";  
        poiCtrl.displayObservation = true;
        poiCtrl.displayTxtArea = false;
        poiCtrl.displayP = true;

    $log.log(TAG + "state params", $stateParams);

    poiCtrl.getTitle = function() {
      $log.log(TAG + 'content', poiCtrl.content);
      return _.get(poiCtrl, 'content.commonName.fr');
    };
    PoiContent.getPoiData($stateParams.speciesId, $stateParams.theme)
      .then(function(data) {
        PoiCardService.setup(poiCtrl, data);
        $log.log(TAG + "updated controller", poiCtrl);
        poiCtrl.includeSrc = './utils/poi-card/poi-card-' + $stateParams.theme + '.html';
    });
    loadObservation();

    ////////////////////
    //TB-BIOSENTIERS
    function loadObservation()
    {
      //TODELETE
      console.log("dans stateParams il y a : ", $stateParams);
      var param = {
        qrId : $stateParams.qrId,
        speciesId : $stateParams.speciesId
      };
      //TODELETE
      console.log("$stateParams.qrId : ",$stateParams.qrId);
      console.log("$stateParams.speciesId : ",$stateParams.speciesId);

      DbObservation.fetchAll(param)
        .then(function(observation){
          //TODELETE
          console.log("Le fetchAll retourne cela :",observation);  
          console.log(observation[1]);
          if(observation.length == 0){
            poiCtrl.displayObservation = false;
          }
          else{
            poiCtrl.observations = observation;        
          }

      });
    }


  }
})();
