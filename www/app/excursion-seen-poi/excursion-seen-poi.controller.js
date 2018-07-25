/**
 * Created by Mathias Oberson on 17.05.2017.
 */
(function() {
  'use strict';
  angular
    .module('app')
    .controller('ExcursionSeenPoiCtrl', ExcursionSeenPoiCtrlFn);

  function ExcursionSeenPoiCtrlFn(PoiCardService, PoiContent, $log, $stateParams, DbObservation, DbSeenPois, $q) {
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
      var tab_allSeenPois;
      var tab_allObservations;
      var tab_filtredSeenPoisObservations = [];

      var paramObservation = {
        qrId : $stateParams.qrId,
        speciesId : $stateParams.speciesId
      };

      var promise = {
        tab_allSeenPois : DbSeenPois.fetchAll($stateParams.qrId),
        tab_allObservations : DbObservation.fetchAll(paramObservation)
      }     
      
      
      $q.all(promise).then(function(resultat){
        //Fonction double boucle
        console.log("Resultat ...:D",resultat);
        console.log("Resultat ...:D",resultat.tab_allObservations);
        console.log("Longueur de all Observation ...:D", resultat.tab_allObservations.length);
       
        for (var i = 0; i < resultat.tab_allObservations.length; i++) {
          console.log("resultat.tab_allObservations[i].text =",resultat.tab_allObservations[i].text);         
          for (var j = 0; j < resultat.tab_allSeenPois.length; j++) {
            if(resultat.tab_allObservations[i].poiId == resultat.tab_allSeenPois[j].poiId){
              console.log("Toto");
              tab_filtredSeenPoisObservations.push({"text" : resultat.tab_allObservations[i].text}); 
            }
          }       
        }      
        if(tab_filtredSeenPoisObservations.length == 0){
          poiCtrl.displayObservation = false;
        }
        else{
          console.log("dnas le tableau filtré il y a : ",tab_filtredSeenPoisObservations);
          poiCtrl.observations = tab_filtredSeenPoisObservations;        
        } 

      }); 
      

    }


  }
})();
