/**
 * Created by Mathias on 29.08.2016.
 * This module manages the different icons needed on the several map in the application
 */
(function () {
  'use strict';
  angular.module('icons', []);

  angular
    .module('icons')
    .factory('Icons', IconsService);

  function IconsService() {
    var service = {
      user: getUserIcon,
      get: getIcon
    };

    var icons = {
      user   : {
        iconUrl   : '../../img/icons/user.png',
        iconSize  : [20, 20], // size of the icon
        iconAnchor: [10, 10] // point of the icon which will correspond to marker's location
      },
      Oiseaux: {
        iconUrl   : '../../img/icons/Oiseaux.png',
        iconSize  : [16, 16],
        iconAnchor: [8, 8]
      },
      Flore  : {
        iconUrl   : '../../img/icons/Flore.png',
        iconSize  : [16, 16],
        iconAnchor: [8, 8]
      },
      Papillon: {
        iconUrl   : '../../img/icons/Papillon.png',
        iconSize  : [16, 16],
        iconAnchor: [8, 8]
      }
    };

    return service;

    ////////////////////

    /**
     * Returns the icon definition for the user
     * @returns Object
     */
    function getUserIcon() {
      return angular.copy(icons.user);
    }

    /**
     * Returns the icon definition corresponding to the name given.
     * If the name is registered in the 'icons' repository, a copy is returned.
     * If not, undefined is returned.
     * @param name The name of the icon to retrieve
     * @returns Object|undefined
     */
    function getIcon(name) {
      return icons.hasOwnProperty(name) ? angular.copy(icons[name]) : undefined;
    }
  }
})();