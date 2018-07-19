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
    poiCtrl.saveObservation = saveObservation;

    Excursion.currentPoiChangeObs.subscribe(function(data) {
      $log.log(TAG + 'currentPoiChangeObs', data);
      PoiCardService.setup(poiCtrl, data.details);
      poiCtrl.poi = data.poi;
      poiCtrl.hasBeenSeen = SeenTracker.hasBeenSeen(poiCtrl.poi);
      poiCtrl.commonNameLanguages = Object.keys(poiCtrl.poi.properties.commonName);
      $log.log(TAG + 'poiCtrl.commonNameLanguages', poiCtrl.commonNameLanguages);
      poiCtrl.includeSrc = '../../utils/poi-card/poi-card-' + data.details.theme + '.html';
    });

    ////////////////////
    //TB-BIOSENTIERS Auto Height resize function for textArea of "observation" on AR spcie
    function resizeTxtArea() {
      console.log("Size has changed");
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
    //TB-BIOSENTIERS Catch the observation from HTML specie viewAR
    function saveObservation(txt_obserervation)
    {
      //TODELETE
      console.log("Focus OUT !! you write :"+txt_obserervation+". This obeservation gonna be pass to ionic now");
      console.log(txt_obserervation);
      if(txt_obserervation !=null)
      {
        var param = {
          text        : txt_obserervation,
          observationId : Excursion.qrId+poiCtrl.poi.properties.id,
          qrId        : Excursion.qrId,
          participantId : Excursion.participantId,
          serverId    : Excursion.serverId,
          poiId       : poiCtrl.poi.properties.id
        };
        //TODELETE
        console.log("il y a une observation !")
        AppActions.execute('saveObservation', param);
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
