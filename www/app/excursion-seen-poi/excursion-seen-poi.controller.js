/**
 * Created by Mathias Oberson on 17.05.2017.
 */
(function() {
  'use strict';
  angular
    .module('app')
    .controller('ExcursionSeenPoiCtrl', ExcursionSeenPoiCtrlFn);

  function ExcursionSeenPoiCtrlFn(PoiCardService, PoiContent, $log, $stateParams) {
    var TAG     = "[ExcursionSeenPoiCtrl] ",
        poiCtrl = this;
        poiCtrl.resizeTxtArea = resizeTxtArea;

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

    //Auto Height resize function for textArea of "observation" on AR spcie
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
  }
})();
