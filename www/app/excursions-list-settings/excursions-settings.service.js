/**
 * Created by Mathias Oberson on 19.07.2017.
 */
(function() {
  'use strict';
  angular
    .module('excursions-list-settings', []);

  angular
    .module('excursions-list-settings')
    .factory('ExcursionsSettings', ExcursionsSettingsFn);

  function ExcursionsSettingsFn(ActivityTracker, EventLogFactory, rx) {
    var withArchive        = true,
        withArchiveSubject = new rx.BehaviorSubject(withArchive);

    var settings = {
      withArchive: {
        value: withArchive,
        changeObs: withArchiveSubject.asObservable(),
        toggle: toggleWithArchive
      },
      withArchiveChangeObs: withArchiveSubject.asObservable(),
      toggleWithArchive   : toggleWithArchive
    };

    return settings;

    ////////////////////

    function toggleWithArchive() {
      settings.withArchive.value = !settings.withArchive.value;
      ActivityTracker(settings.withArchive.value ? EventLogFactory.action.excursionsList.archives.showed() : EventLogFactory.action.excursionsList.archives.hidden());
      withArchiveSubject.onNext(settings.withArchive.value);
    }
  }
})();
