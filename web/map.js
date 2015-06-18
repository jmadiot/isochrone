var nbcities = v.length;
var nbcities = 85; //lower is faster

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
  // {time: 80*60, color:"#008"},
  // {time: 40*60, color:"#80f"},
  // {time: 20*60, color:"#f08"},
  {time: 15*60, color:"#f00"},
  {time: 10*60, color:"#f80"},
  {time: 7*60, color:"#ff0"},
  {time: 5*60, color:"#8f0"},
  {time: 3*60, color:"#0f0"},
  {time: 2*60, color:"#8f8"},
  {time: 1*60, color:"#fff"}
];

/* draw */
redraw = function(mouse, ispixel) {
  resetdebug();
  nb_redraws++;
  debug(nb_redraws);
  
  // mouse position is computed properly when zooming, but not when
  // moving, I don't know why
  var earthmouse = mouse;
  if(ispixel)
    earthmouse = latlng_to_pair(latlng_from_screen(mouse.x, mouse.y));
  debug("mouse: " + earthmouse);
  
  var canvas = document.getElementById("canvas");
  var context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // computing time to reach each city from earthmouse
  time_by_car = new Array();
  timetoreach = new Array();
  for(i=0;i<nbcities;i++){
    timetoreach[i] = time_by_car[i] = dist(earthmouse, pos[i]) / speed;
  }
  for(i=0;i<nbcities;i++){
    for(j=0;j<nbcities;j++){
      // debug([i,j]);
      newtime = time_by_car[i] + v[i][j];
      if(newtime < timetoreach[j]) {
        timetoreach[j] = newtime;
      }
    }
  }

  // draw a circle of center p and radius km
  dummy_circle = function(p, km) {
    var pix = latlng_to_screen(p);
    context.moveTo(pix.x, pix.y);
    context.arc(pix.x, pix.y, km_to_pixels(p, km), 0, 2*Math.PI);
  };

  // draw a circle of center p and radius km, assuming mercator
  circle = function(p, km) {
    var top    = latlng_to_screen([p[0]+km/6371*180/Math.PI, p[1]]);
    var bottom = latlng_to_screen([p[0]-km/6371*180/Math.PI, p[1]]);
    context.moveTo(top.x, (top.y + bottom.y)/2);
    context.arc(top.x, (top.y + bottom.y)/2, -(top.y - bottom.y)/2, 0, 2*Math.PI);
  };

  /* draw layers */
  var layer;
  for(layer = 0; layer < layers.length; layer++) {
    timeavailable = layers[layer].time;
    context.fillStyle = layers[layer].color;

    /* accessible without shortcut */
    context.beginPath();
    circle(earthmouse, timeavailable * speed);

    /* with shortcuts */
    for(i=0; i<nbcities; i++){
      if(layer==0 && PRINT_TIMES_TO_CITIES)
        debug("time to " + names[i] + ": " + Math.floor(timetoreach[i] / 60) + "h" + Math.floor(timetoreach[i] % 60) + "m");
      remaining_distance = (timeavailable - timetoreach[i]) * speed;
      if(remaining_distance > 0) {
        circle(pos[i], remaining_distance);
      }
    }
    context.fill();
  }
  
  /* make all this transparent */
  context.save();
  context.globalCompositeOperation = "destination-out";
  context.fillStyle = "rgba(0,0,0,0.7)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.restore();
  
  /* mark cities */
  context.fillStyle = "rgba(0,0,0,0.5)";
  for(i=0; i<nbcities; i++){
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
  
  draw = function(e) {redraw({x:e.layerX, y:e.layerY}, true)};
  if(requestAnimationFrame) {
    canvas.onmousemove = (function(e){
      requestAnimationFrame(function(){draw(e);});
    });
  } else {
    canvas.onmousemove = draw;
  }
  canvas.onclick = draw;
  // canvas.ontouchmove = redraw;
  // canvas.addEventListener('touchstart', redraw, false); //does not work properly
  // canvas.addEventListener('touchmove', redraw, false);
  
  overlay = new google.maps.OverlayView();
  overlay.draw = function(e) {};
  //#15/52.2007/0.1306-
  var options = {center: new google.maps.LatLng(48,7), zoom: 5};
  // var zoom = parseInt(window.location.hash.substr(1).split('/')[0]);
  // if(zoom) {
  //   var lat = window.location.hash.substr(1).split('-')[0].split('/')[1];
  //   var lng = window.location.hash.substr(1).split('-')[0].split('/')[2];
  //   options = {center: new google.maps.LatLng(lat,lng), zoom: zoom};
  //   var latd = window.location.hash.substr(1).split('-')[1].split('/')[0];
  //   var lngd = window.location.hash.substr(1).split('-')[1].split('/')[0];
  //   if(latd||lngd) {
  //     canvas.onmousemove = "";
  //   }
  // }
  overlay.setMap(new google.maps.Map(document.getElementById('map'), options));
};

window.addEventListener('load', function(){window.setTimeout(init, 500);});
