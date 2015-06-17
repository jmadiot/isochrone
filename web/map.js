/* Precomputed data */

/* Number of minutes to travel between two cities */
var time_between_cities = [
  [1000000,267,312,313,138,293,368,260,318,329,284,289,288,336,297,261,129,82,243,304,304,357],
  [274,1000000,369,305,289,250,315,105,275,276,326,261,285,293,233,158,252,278,235,281,261,392],
  [292,346,1000000,312,296,342,398,344,377,413,155,338,302,360,361,340,305,295,322,298,393,361],
  [323,305,337,1000000,315,271,298,323,278,342,274,287,176,279,10000,296,304,334,278,70,367,234],
  [140,271,304,305,1000000,287,368,269,327,333,276,283,275,330,296,275,82,229,194,281,323,339],
  [290,239,354,260,298,1000000,270,257,155,261,286,176,255,243,174,253,263,366,250,241,291,362],
  [381,310,425,306,389,281,1000000,437,311,312,377,322,331,249,320,319,354,482,346,282,352,405],
  [266,104,355,316,284,266,442,1000000,286,282,327,267,286,409,260,154,244,259,192,287,262,398],
  [329,268,393,279,334,152,300,287,1000000,275,335,275,295,422,288,282,307,414,289,255,310,406],
  [309,253,398,314,323,244,294,266,259,1000000,345,280,309,272,263,237,287,419,295,10000,270,416],
  [285,314,157,265,269,300,356,327,325,361,1000000,301,265,313,324,328,283,288,290,246,366,324],
  [296,250,350,281,285,246,316,263,271,297,307,1000000,262,284,195,264,264,284,246,252,312,325],
  [278,272,327,176,262,253,318,283,291,319,264,267,1000000,284,285,281,256,294,261,219,329,43],
  [344,283,378,274,347,244,234,406,379,290,330,285,290,1000000,283,397,307,432,330,375,430,401],
  [292,237,371,10000,10000,172,308,249,282,278,323,188,278,290,1000000,245,265,372,252,268,288,389],
  [266,155,350,296,289,266,322,153,281,262,332,272,291,399,255,1000000,249,264,257,287,227,398],
  [125,245,315,291,88,266,342,238,301,307,282,257,256,309,265,244,1000000,214,139,272,287,350],
  [83,276,311,327,255,387,458,254,408,424,283,288,292,420,367,250,230,1000000,258,390,395,404],
  [238,227,332,273,195,248,344,185,278,309,289,214,258,311,252,251,104,256,1000000,259,289,347],
  [192,163,203,69,173,129,160,181,139,295,145,145,114,257,163,10000,172,301,154,1000000,305,188],
  [303,257,407,363,336,298,348,265,313,289,374,314,338,456,297,226,301,396,288,419,1000000,445],
  [291,336,317,245,296,317,334,341,349,383,269,269,43,342,343,345,301,352,308,234,393,1000000]];

/* positions of cities */
var pos = [
  [51.5073219,-0.1276474],[52.5170365,13.3888599],[40.4167047,-3.7035825],[41.8933439,12.4830718],
  [48.8565056,2.3521334],[48.2083537,16.3725042],[44.436139,26.1027436],[53.5437641,10.0099133],
  [47.4983815,19.0404707],[52.2319237,21.0067265],[41.3825596,2.1771353],[48.1372719,11.5754815],
  [45.466797,9.1905368],[42.6977211,23.3225964],[50.0874401,14.4212556],[55.6867243,12.5700724],
  [50.84404145,4.36720169448285],[52.4813679,-1.8980726],[50.9383611,6.9599738],[40.8441164,14.2422998],
  [59.3251172,18.0710935],[45.0709201,7.685972]];

/* names of cities */
var names = new Array("London", "Berlin", "Madrid", "Rome", "Paris", "Vienna",
  "Bucharest", "Hamburg", "Budapest", "Warsaw", "Barcelona", "Munich",
  "Milan", "Sofia", "Prague", "Copenhagen", "Brussels", "Birmingham",
  "Cologne", "Naples", "Stockholm", "Turin");

/* enable debugging */
var DEBUG=0;
var PRINT_TIMES_TO_CITIES=0;
var resetdebug = function() {if(DEBUG){document.getElementById('debug').innerHTML="";}}
var debug = function(t) {if(DEBUG){document.getElementById('debug').innerHTML+=t+"<br />\n";}}

/* Distance between two (lat, lng) pairs */
var dist = function(pos1, pos2) {
  var latdiff = Math.PI / 180 * (pos2[0] - pos1[0]);
  var londiff = Math.PI / 180 * (pos2[1] - pos1[1]); 
  var a = Math.sin(latdiff / 2) * Math.sin(latdiff / 2) +
        Math.cos(Math.PI / 180 * pos1[0]) * Math.cos(Math.PI / 180 * pos2[0]) * 
        Math.sin(londiff / 2) * Math.sin(londiff / 2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = 6371 * c;
  return Math.abs(d);
}

/* Givent a distance in kms, compute the corresponding number of
 * pixels on the screen. (we need p because it depends on the
 * latitude) */
function km_to_pixels(pos, d) {
  var angle = d / 6371 * 180 / Math.PI;
  var p1 = latlng_to_screen(pos);
  var p2 = latlng_to_screen([pos[0] + angle, pos[1]]);
  var d = {x:p1.x-p2.x, y:p1.y-p2.y};
  return Math.sqrt(d.x * d.x + d.y * d.y);
}

/* kms per minute, used to compute travel times without shorcuts */
var speed = 1;

/* converting from and to google's latlng things */
var k = function (x){return function(){return x;}};
var latlng_to_pair = function(c){return [c.lat(), c.lng()];};
var pair_to_latlng = function(p){return {lat:k(p[0]), lng:k(p[1])};};

var nb_redraws = 0;

/* list of 'layers' */
layers = [
  {time: 80*60, color:"#008"},
  {time: 40*60, color:"#80f"},
  {time: 20*60, color:"#f08"},
  {time: 15*60, color:"#f00"},
  {time: 10*60, color:"#f80"},
  {time: 7*60, color:"#ff0"},
  {time: 5*60, color:"#8f0"},
  {time: 3*60, color:"#0f0"},
  {time: 2*60, color:"#8f8"},
  {time: 1*60, color:"#fff"}
];

/* draw */
redraw = function(e) {
  resetdebug();
  nb_redraws++;
  debug(nb_redraws);
  
  // mouse position is computed properly when zooming, but not when
  // moving, I don't know why
  earthmouse = latlng_to_pair(latlng_from_screen(e.layerX, e.layerY));
  debug("mouse: " + earthmouse);
  
  var canvas = document.getElementById("canvas");
  var context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // computing time to reach each city from earthmouse
  time_by_car = new Array();
  timetoreach = new Array();
  for(i=0;i<pos.length;i++){
    timetoreach[i] = time_by_car[i] = dist(earthmouse, pos[i]) / speed;
  }
  for(i=0;i<pos.length;i++){
    for(j=0;j<pos.length;j++){
      newtime = time_by_car[i] + time_between_cities[i][j];
      if(newtime < timetoreach[j]) {
        timetoreach[j] = newtime;
      }
    }
  }
  
  // draw a circle of center p and radius km
  circle = function(p, km) {
    context.beginPath();
    var pix = latlng_to_screen(p);
    context.arc(pix.x, pix.y, km_to_pixels(p, km), 0, 2*Math.PI);
    context.fill();
  };
  
  /* draw layers */
  var layer;
  for(layer = 0; layer < layers.length; layer++) {
    timeavailable = layers[layer].time;
    context.fillStyle = layers[layer].color;
    
    /* accessible without shortcut */
    circle(earthmouse, timeavailable * speed);
    
    /* with shortcuts */
    for(i=0; i<pos.length; i++){
      if(layer==0 && PRINT_TIMES_TO_CITIES)
        debug("time to " + names[i] + ": " + Math.floor(timetoreach[i] / 60) + "h" + Math.floor(timetoreach[i] % 60) + "m");
      remaining_distance = (timeavailable - timetoreach[i]) * speed;
      if(remaining_distance > 0) {
        circle(pos[i], remaining_distance);
      }
    }
  }
  
  /* make all this transparent */
  context.save();
  context.globalCompositeOperation = "destination-out";
  context.fillStyle = "rgba(0,0,0,0.7)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.restore();
  
  /* mark cities */
  context.fillStyle = "rgba(0,0,0,0.5)";
  for(i=0; i<pos.length; i++){
    context.beginPath();
    var pix = latlng_to_screen(pos[i]);
    context.arc(pix.x, pix.y, 2, 0, 2*Math.PI);
    context.fill();
  }
}

/* conversion function */
var latlng_from_screen = function(x, y) {return overlay.getProjection().fromDivPixelToLatLng({x:x, y:y});};
var latlng_to_screen = function(p) {return overlay.getProjection().fromLatLngToContainerPixel(pair_to_latlng(p));};

/* set up overlay, map and listeners */
init = function() {
  var canvas = document.getElementById("canvas");
  var context = canvas.getContext("2d");
  context.canvas.width = window.innerWidth;
  context.canvas.height = window.innerHeight;
  
  if(requestAnimationFrame) {
    canvas.onmousemove = (function(e){requestAnimationFrame(function(){redraw(e);});});
  } else {
    canvas.onmousemove = redraw;
  }
  canvas.onclick = redraw;
  // canvas.ontouchmove = redraw;
  // canvas.addEventListener('touchstart', redraw, false); //does not work properly
  // canvas.addEventListener('touchmove', redraw, false);
  
  overlay = new google.maps.OverlayView();
  overlay.draw = function(e) {};
  overlay.setMap(new google.maps.Map(document.getElementById('map'), {center: new google.maps.LatLng(48,7), zoom: 5}));
};

window.addEventListener('load', function(){window.setTimeout(init, 500);});
