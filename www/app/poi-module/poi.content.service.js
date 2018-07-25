/**
 * Created by Mathias on 09.05.2016.
 */
(function() {
  'use strict';

  angular
    .module('poi-module')
    .factory('PoiContent', PoiContentService);

  function PoiContentService($http, $log) {

    var TAG     = "[PoiContent] ",
        service = {
          getPoiData: getPoiData
        };

    return service;

    ////////////////////

    function getPoiData(speciesId, theme) {
      var url = 'data/poi-details/' + theme + '/' + theme + speciesId + '.json';
      $log.log(TAG + 'getPoiData:url', url);
      return $http.get(url).then(function(result) {
        $log.log(TAG + 'getPoiData:result', result);
        // TODO : retourner seulement result.data lorsque les données seront correctes
        return result.data;
      });
    }
  }
})();
