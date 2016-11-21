(function() {
  'use strict';

  angular
    .module('filters-modal')
    .controller('FiltersModalCtrl', FiltersModalCtrl);

  function FiltersModalCtrl(Filters, FiltersModal, $scope) {
    var filters = this;

    filters.remove = FiltersModal.removeCurrent;
    // Public data
    filters.themes = Filters.themes;

    filters.selected = {
      themes: themesArrayToCheckedThemesObject(Filters.getSelected().themes)
    };

    // Functions
    filters.getThemeImageUrl = getThemeImageUrl;

    // Events
    var debouncedUpdateFilters = _.debounce(updateFilters, 650);
    $scope.$watch('filters.selected.themes', debouncedUpdateFilters, true);

    ////////////////////

    function updateFilters() {
      Filters.updateSelected({
        themes: checkedThemesObjectToThemesArray(filters.selected.themes)
      });
    }

    function getThemeImageUrl(theme) {
      return 'assets/' + theme + '.png';
    }

    /**
     * Transforms
     *     [ "theme1", "theme2", "theme3" ]
     * to
     *     { "theme1": true, "theme2": true, "theme3": true }
     */
    function themesArrayToCheckedThemesObject(themes) {
      return _.reduce(themes, function(memo, theme) {
        memo[theme] = true;
        return memo;
      }, {});
    }

    /**
     * Transforms
     *     { "theme1": true, "theme2": false, "theme3": true }
     * to
     *     [ "theme1", "theme3" ]
     */
    function checkedThemesObjectToThemesArray(checkedThemes) {
      return _.reduce(checkedThemes, function(memo, selected, theme) {
        if (selected) {
          memo.push(theme);
        }

        return memo;
      }, []);
    }
  }
})();
