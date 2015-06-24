var nbcities = v.length;

/* the earth */
var earth_sphere = new ol.Sphere(6371000);

/* the map layer */
var vectorLayer = [];

/* prevent redraw */
var freeze = false;

/* take into account airports? */
var AIRPORTS = 0;

/* enable debugging */
var DEBUG=0;
var PRINT_TIMES_TO_CITIES=0;
var resetdebug = function() {if(DEBUG){document.getElementById('debug').innerHTML="";}}
var debug = function(t) {if(DEBUG){document.getElementById('debug').innerHTML+=t+"<br />\n";}}

/* Distance between two (lng, lat) pairs */
var dist = function(pos1, pos2) {
  var latdiff = Math.PI / 180 * (pos2[1] - pos1[1]);
  var londiff = Math.PI / 180 * (pos2[0] - pos1[0]);
  var a = Math.sin(latdiff / 2) * Math.sin(latdiff / 2) +
    Math.cos(Math.PI / 180 * pos1[1]) * Math.cos(Math.PI / 180 * pos2[1]) *
    Math.sin(londiff / 2) * Math.sin(londiff / 2);
  var d = 6371 * 2 * Math.asin(Math.sqrt(a));
  return Math.abs(d);
}

/* pretty-printing of a duration */
var nicetime = function(minutes) {
  var h = Math.floor(minutes/60);
  var m = Math.floor(minutes%60);
  var z = (m<10)?'0':'';
  return h + ":" + z + m;
}

var closest_cities = new Array();

/* kms per minute, used to compute travel times without shorcuts */
var speed = 1;

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
var last_e_coordinate = [0,0];
var e_coordinate = [0,0];
var nextupdate = 1;
redraw = function() {
  requestAnimationFrame(redraw);
  
  /* if the map was clicked, don't update it */
  if(freeze){return;}
  
  if(last_e_coordinate == e_coordinate && !nextupdate) return;
  last_e_coordinate = e_coordinate;
  nextupdate = 0;
  
  resetdebug();
  nb_redraws++;
  debug(nb_redraws);

  /* get LonLat from pointer coordinates */
  earthmouse = ol.proj.transform(e_coordinate, 'EPSG:3857', 'EPSG:4326');
  debug("mouse: " + earthmouse);

  /* clear the layers */
  for(i=0; i<layers.length; i++){
    vectorLayer[i].getSource().clear();
  }
  
  // computing time to reach each city from earthmouse
  time_by_car = new Array();
  timetoreach = new Array();
  via = new Array();
  for(i=0;i<nbcities;i++){
    timetoreach[i] = time_by_car[i] = dist(earthmouse, pos[i]) / speed;
    via[i] = "";
  }
  for(i=0;i<nbcities;i++){
    for(j=0;j<nbcities;j++){
      // debug([i,j]);
      newtime = time_by_car[i] + v[i][j];
      if(newtime < timetoreach[j]) {
        timetoreach[j] = newtime;
        via[j] = " (via " + names[i] + ")";
      }
    }
  }
  
  // computing time to reach each AIRPORT from earthmouse
  air_timetoreach = new Array();
  air_via = new Array();
  if(AIRPORTS){
    time_by_car = new Array();
    for(i=0;i<flight.length;i++){
      air_timetoreach[i] = time_by_car[i] = dist(earthmouse, airport_pos[i]) / speed;
      air_via[i] = "";
    }
    for(i=0;i<flight.length;i++){
      for(j=0;j<flight.length;j++){
        newtime = time_by_car[i] + flight[i][j];
        if(newtime < air_timetoreach[j]) {
          air_timetoreach[j] = newtime;
          air_via[j] = " (via " + airport_name[i] + ")";
        }
      }
    }
  }
  
  /* display closest cities/airports */
  /* // this displays way too much text now, it's useless
  var closest = [];
  closest = closest.concat(    timetoreach.map(function(time,i){return [time,       names[i],    via[i]]}));
  closest = closest.concat(air_timetoreach.map(function(time,i){return [time,airport_name[i],air_via[i]]}));
  closest = closest.sort(function(x,y){return x[0]-y[0]});
  closest_cities.map(function(span, i){
    if(closest[i][0]<24*60)
      span.innerHTML = nicetime(closest[i][0]) + " to " + closest[i][1] + closest[i][2] + " <br/>\n"
    else
      span.innerHTML = '';
  });
  */
  
  // draw a circle of center p and radius km on layer l
  circle = function(p, km) {
    // project the circle w.r.t web-mercator
    return(ol.geom.Polygon.circular(earth_sphere, p, km*1000, 32).transform('EPSG:4326', 'EPSG:3857')); // 32 vertices
  };

  /* draw layers */
  var layer;
  for(layer = 0; layer < layers.length; layer++) {
    timeavailable = layers[layer].time;
    // the array of circles in the layer
    var layerCircles = new ol.geom.MultiPolygon([]);
    /* accessible without shortcut */
    layerCircles.appendPolygon(circle(earthmouse, timeavailable * speed));

    /* with shortcuts */
    for(i=0; i<nbcities; i++){
      if(layer==0 && PRINT_TIMES_TO_CITIES)
        debug("time to " + names[i] + ": " + Math.floor(timetoreach[i] / 60) + "h" + Math.floor(timetoreach[i] % 60) + "m");
      remaining_distance = (timeavailable - timetoreach[i]) * speed;
      if(remaining_distance > 0) {
        layerCircles.appendPolygon(circle(pos[i], remaining_distance));
      }
    }

    /* with flights */
    for(i=0; i<flight.length; i++){
      remaining_distance = (timeavailable - air_timetoreach[i]) * speed;
      if(remaining_distance > 0) {
        layerCircles.appendPolygon(circle(airport_pos[i], remaining_distance));
      }
    }

    // put the polygons on the layer
    vectorLayer[layer].getSource().addFeature(new ol.Feature(layerCircles));

  }
}

/* style for locations: */
var locationsStyle = new ol.style.Style({
  image: new ol.style.Circle({
    radius: 3,
    fill: new ol.style.Fill({color: "rgba(0,0,0,0.2)"})
  })
});

/* set up overlay, map and listeners */
init = function() {
  /* swaping positions. to be removed later */
  for(i = 0; i < pos.length; i++)
    pos[i] = [pos[i][1], pos[i][0]];
  for(i = 0; i < airport_pos.length; i++)
    airport_pos[i] = [airport_pos[i][1], airport_pos[i][0]];

  /* one layer per color */
  for(i=0; i<layers.length; i++){
    var newstyle = new ol.style.Style({
      fill: new ol.style.Fill({
        color: layers[i].color
      })
    });
    vectorLayer[i] = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: newstyle,
      transparent: false
    });
  }

  /* layer for the locations */
  var locationsLayer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: locationsStyle
  });

  var nb_of_closest_cities = 15;
  for(i=0;i<nb_of_closest_cities;i++) {
    closest_cities[i] = document.createElement('span');
    closest_cities[i].style.opacity = 1-i/nb_of_closest_cities;
    document.getElementById('closest').appendChild(closest_cities[i]);
  }

  // the background map
  var backgroundLayer =  new ol.layer.Tile({
    source: new ol.source.OSM(),
    opacity: 0.6
  })

  var map = new ol.Map({
    //layer for the background map
    layers: vectorLayer.concat([backgroundLayer, locationsLayer]), //.concat(vectorLayer)
    renderer: 'canvas',
    target: 'map3857',
    // initial view
    view: new ol.View({
      center: [2000000, 7000000], 
      zoom: 4 
    })
  });

  // fill locationsLayer with points 
  for(i=0; i<nbcities; i++){
    var newpoint = new ol.geom.Point(pos[i]); // put p[i] here
    locationsLayer.getSource().addFeature(new ol.Feature(newpoint.transform('EPSG:4326', 'EPSG:3857'))); 
  }
  // positions of airports
  // if(AIRPORTS) <--- cannot do that, this is a dynamic value
  for(i=0; i<airport_pos.length; i++){
    var newpoint = new ol.geom.Point(airport_pos[i]);
    locationsLayer.getSource().addFeature(new ol.Feature(newpoint.transform('EPSG:4326', 'EPSG:3857'))); 
  }
  
  /* freeze the map on click */
  map.on('singleclick', function(){freeze = !freeze; nextupdate=1;});
  
  /* update mouse position */
  map.on('pointermove', function(e){e_coordinate = e.coordinate;});
  
  /* give the refresh decision to requestAnimationFrame */
  requestAnimationFrame(redraw);
  
  window.addEventListener('keydown', function(e) {
    switch (String.fromCharCode(e.keyCode).toLowerCase()) {
      case "a": AIRPORTS ^= 1;
    }
    nextupdate=1;
  });
};

window.addEventListener('load', function(){window.setTimeout(init, 500);});
