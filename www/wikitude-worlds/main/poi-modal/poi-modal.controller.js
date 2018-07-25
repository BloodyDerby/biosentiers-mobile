/**
 * Created by Mathias Oberson on 08.05.2017.
 */
(function() {
  'use strict';
  angular
    .module('poi-modal')
    .controller('PoiModalCtrl', PoiModalCtrlFn);

  function PoiModalCtrlFn(AppActions, ArView, EventLogFactory, Excursion, $log, Modals, SeenTracker, PoiCardService) {
    var TAG     = "[PoiModalCtrl] ",
        poiCtrl = this;

    poiCtrl.remove = remove;
    poiCtrl.setPoiSeen = setPoiSeen;
    poiCtrl.checkBoxState = checkBoxState;
    poiCtrl.getImageSource = getImageSource;
    poiCtrl.resizeTxtArea = resizeTxtArea;
    poiCtrl.upsertObservation = upsertObservation;
    poiCtrl.observation;
    poiCtrl.displayObservation = true;
    poiCtrl.displayTxtArea = true;
    poiCtrl.displayP = false;

    Excursion.currentPoiChangeObs.subscribe(function(data) {
      $log.log(TAG + 'currentPoiChangeObs', data);
      PoiCardService.setup(poiCtrl, data.details);
      poiCtrl.poi = data.poi;
      poiCtrl.hasBeenSeen = SeenTracker.hasBeenSeen(poiCtrl.poi);
      poiCtrl.commonNameLanguages = Object.keys(poiCtrl.poi.properties.commonName);
      $log.log(TAG + 'poiCtrl.commonNameLanguages', poiCtrl.commonNameLanguages);
      poiCtrl.includeSrc = '../../utils/poi-card/poi-card-' + data.details.theme + '.html';
    });


    //TB-BIOSENTIERS Load the observation of the current opened poi
    console.log("Lancement de la fonction loadObservation() dans le controlleur poi");
    loadObservation();
    ////////////////////

    function loadObservation()
    {
      var param = {
        observationId : Excursion.qrId+poiCtrl.poi.properties.id
      };
      AppActions.execute('loadObservation', param, { return: true })
      .then(function(loadedObservation){
        console.log("Loaded Observation = ",loadedObservation);
        if(loadedObservation!=null)
          poiCtrl.observation = loadedObservation.text;
      });
    }

    //TB-BIOSENTIERS Auto Height resize function for textArea of "observation" on AR spcie
    function resizeTxtArea() {
      var tx = document.getElementsByTagName('textarea');
        for (var i = 0; i < tx.length; i++) {
          tx[i].setAttribute('style', 'height:' + (tx[i].scrollHeight) + 'px;overflow-y:hidden;');
          tx[i].addEventListener("input", OnInput, false);
        }

      function OnInput(e) {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
      }
    }
    //TB-BIOSENTIERS Create/update an observation from textArea, then save it in db
    function upsertObservation()
    {
      //TODELETE
      console.log(poiCtrl);
      //Creating an observation object with current values
      var param = {
        text          : poiCtrl.observation,
        observationId : Excursion.qrId+poiCtrl.poi.properties.id,
        qrId          : Excursion.qrId,
        participantId : Excursion.participantId,
        serverId      : Excursion.serverId,
        speciesId     : poiCtrl.poi.properties.speciesId,
        poiId         : poiCtrl.poi.properties.id
       };

      if(poiCtrl.observation !=null)
      {
        //TODELETE
        console.log("Ajout ou update d'observation-->upsert");
        AppActions.execute('upsertObservation', param);
      }
    }

    function getImageSource(id) {
      return "./assets/img/" + id + "a.jpg";
    }

    function setPoiSeen() {
      AppActions.execute('trackActivity', {eventObject: EventLogFactory.action.ar.poi.checked(Excursion.serverId, poiCtrl.poi.id, poiCtrl.content.id)});
      Modals.removeCurrent().then(function() {
        ArView.setPoiSeen(poiCtrl.poi);
      });
    }

    function checkBoxState() {
      return poiCtrl.hasBeenSeen ? 'ion-android-checkbox-outline' : 'ion-android-checkbox-outline-blank';
    }

    function remove() {
      AppActions.execute('trackActivity', {eventObject: EventLogFactory.action.ar.poi.closed(Excursion.serverId, poiCtrl.poi.id, poiCtrl.content.id)});
      Modals.removeCurrent();
    }


  }
})();
