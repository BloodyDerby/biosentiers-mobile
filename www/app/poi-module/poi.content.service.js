/**
 * Created by Mathias on 09.05.2016.
 */
(function () {
  'use strict';

  angular
    .module('poi-module')
    .factory('PoiContent', PoiContentService);

  function PoiContentService($http, $log) {

    var service = {
      getPoiData: getPoiData
    };

    return service;

    ////////////////////

    function getPoiData(specieId, theme) {
      var url = 'data/poi-details/' + theme + '/' + theme + specieId + '.json';
      $log.log('PoiContent:getPoiData:url', url);
      return $http.get(url).then(function(result) {
        $log.log('PoiContent:getPoiData:result', result);
        // TODO : retourner seulement result.data lorsque les données seront correctes
        return result.data;
      });
    }
  }
})();
