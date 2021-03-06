/**
 * Created by Mathias on 25.08.2016.
 */
(function() {
  'use strict';

  angular
    .module('world')
    .factory('World', WorldService);

  function WorldService(AppActions, EventLogFactory, ArView, DeviceOrientation, Filters, Excursion, UserLocation, rx) {

    var service = {
      startup                : true,
      poiData                : null,
      loadExcursion          : Excursion.load,
      updateDeviceOrientation: updateDeviceOrientation,
      returnResultFromApp    : AppActions.returnResultFromApp
    };

    // Update the AR when:
    // * The excursion is loaded.
    // * The user location changes (spaced by interval).
    // * The user changes the filters.
    Excursion.excursionChangeObs.subscribe(ArView.updateAr);
    UserLocation.spacedObs.subscribe(ArView.updateAr);
    Filters.filtersChangeObs.subscribe(function(selected) {
      AppActions.execute('trackActivity', {eventObject: EventLogFactory.action.filters.changed(Excursion.serverId, selected)});
      ArView.updateAr();
    });

    // Display a message when the user location is first detected.
    UserLocation.realObs.first().subscribe(notifyUserLocated);

    rx.Observable.combineLatest(UserLocation.realObs, Excursion.excursionChangeObs).first().subscribe(ArView.loadExtremityPoints);

    // Excursion.excursionChangeObs.first().subscribe(ArView.loadExtremityPoints);

    // Faking the position to be localised in the office.
    // AppActions.execute('setPosition', {lat: 46.78071086, lon: 6.64763376, alt: Altitude.correct(432)});
    // AppActions.execute('setPosition', {lat: 46.783958, lon: 6.656963, alt: Altitude.correct(437)});

    return service;

    ////////////////////

    function notifyUserLocated() {
      AppActions.execute('toast', {message: 'Localisé !'});
    }

    function updateDeviceOrientation(data) {
      DeviceOrientation.updateOrientation(data);
    }
  }
})();
