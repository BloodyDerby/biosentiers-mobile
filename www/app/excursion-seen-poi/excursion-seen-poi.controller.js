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
        //TB-BIOSENTIERS gestion des templates de la fiche d'espèce selon l'affichage via 
        //l'instance Ionic (displayP) ou l'instance AR (displayTxtArea)
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
    //TB-BIOSENTIERS call the function when the page is loaded
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
      //make 2 promised requests
      var promise = {
        tab_allSeenPois : DbSeenPois.fetchAll($stateParams.qrId),
        tab_allObservations : DbObservation.fetchAll(paramObservation)
      }     
      
      //After all requests done, tab combinaison to get all the observations of the current species
      // linked to all pois. 
      $q.all(promise).then(function(resultat){
        //Fonction double boucle       
        for (var i = 0; i < resultat.tab_allObservations.length; i++) {         
          for (var j = 0; j < resultat.tab_allSeenPois.length; j++) {
            if(resultat.tab_allObservations[i].poiId == resultat.tab_allSeenPois[j].poiId){
              tab_filtredSeenPoisObservations.push({"text" : resultat.tab_allObservations[i].text}); 
            }
          }       
        }      
        if(tab_filtredSeenPoisObservations.length == 0){
          poiCtrl.displayObservation = false;
        }
        else{
          console.log("Tableau recompilé observations des points vus : ",tab_filtredSeenPoisObservations);
          poiCtrl.observations = tab_filtredSeenPoisObservations;        
        } 

      });       

    }


  }
})();
