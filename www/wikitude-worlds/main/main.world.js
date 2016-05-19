/**
 * Created by Mathias on 02.05.2016.
 */
angular
  .module('ar')
  .run(run);

function run(Do, POI, $rootScope) {
  World = {
    userCoord: {},
    locations: [],
    poiData: null,
    loadPoiData: loadPoiData,
    write: write,
    timer: timer,
    createMarkers: function (markers) {
      console.log(markers);
      markers.forEach(function (marker) {
        World.locations.push(new POI(marker));
      });
      console.log(World.locations);
    }
  };

  AR.context.clickBehavior = AR.CONST.CLICK_BEHAVIOR.TOUCH_DOWN;
  AR.context.scene.cullingDistance = 2500;
  AR.context.scene.maxScalingDistance = 250;
  AR.context.scene.minScalingDistance = 5;
  AR.context.scene.scalingFactor = 0.2;
  AR.context.onScreenClick = onScreenClick;
  AR.context.onLocationChanged = onLocationChanged;

  ////////////////////

  function onScreenClick() {
    console.log('screen clicked', World);
  }

  function onLocationChanged(lat, lon, alt, acc) {
    console.log('coord', lat, lon, alt, acc);
    World.userCoord = {lat: lat, lon: lon, alt: alt};
    Do.action('showPos', World.userCoord);
  }

  function loadPoiData(data) {
    console.log('setting the poi data');
    World.poiData = data;
    $rootScope.$emit('marker:loaded');
  }

  function write(message) {
    console.log("World writes", message);
  }

  function timer(start) {
    var stop = Date.now();
    console.log("Débuté", start);
    console.log("Terminé", stop);
    console.log("Diff1", (stop - start) / 1000);
  }
}
