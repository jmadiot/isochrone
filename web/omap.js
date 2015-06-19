var nbcities = v.length;
var nbcities = 85; //lower is faster

/* the earth */
var earth_sphere = new ol.Sphere(6371000);

/* the map layer */
var vectorLayer = [];

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
redraw = function(e) {
  resetdebug();
  nb_redraws++;
  debug(nb_redraws);

  /* get LonLat from pointer coordinates */
  earthmouse = ol.proj.transform(e.coordinate, 'EPSG:3857', 'EPSG:4326');
  debug("mouse: " + earthmouse);

  /* clear the layers */
  for(i=0; i<layers.length; i++){
    vectorLayer[i].getSource().clear();
  }
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

    // put the polygons on the layer
    vectorLayer[layer].getSource().addFeature(new ol.Feature(layerCircles));

  }

  /* make all this transparent */
  //context.save();
  //context.globalCompositeOperation = "destination-out";
  //context.fillStyle = "rgba(0,0,0,0.7)";
  //context.fillRect(0, 0, canvas.width, canvas.height);
  //context.restore();

  /* mark cities */ // TODO
  //  context.fillStyle = "rgba(0,0,0,0.5)";
  //  for(i=0; i<nbcities; i++){
  //    context.beginPath();
  //    var pix = latlng_to_screen(pos[i]);
  //    context.arc(pix.x, pix.y, 2, 0, 2*Math.PI);
  //    context.fill();
  //  }
}

/* style for locations: TODO*/
var locationsStyle = new ol.style.Style({
});


/* set up overlay, map and listeners */
init = function() {
  /* swaping positions. to be removed later */
  for(i = 0; i < nbcities; i++){
    var temp = pos[i][0];
    pos[i][0] = pos[i][1];
    pos[i][1] = temp;
  }

  /* one layer per color */
  for(i=0; i<layers.length; i++){
    var newstyle = new ol.style.Style({
      fill: new ol.style.Fill({
        color: layers[i].color,

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
    source: new ol.source.Vector()
      //  , style: locationsStyle //TODO
  });


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

  // TODO: fill locationsLayer with points ...
  for(i=0; i<nbcities; i++){
    var newpoint = new ol.geom.Point(pos[i]); // put p[i] here
    locationsLayer.getSource().addFeature(new ol.Feature(newpoint.transform('EPSG:4326', 'EPSG:3857'))); 
  }  

  if(requestAnimationFrame) {
    map.on('pointermove', function(e){requestAnimationFrame(function(){redraw(e);});});
  } else {
    //map.singleckick = redraw;
  }

  //.LatLng(48,7), zoom: 5}));
};

window.addEventListener('load', function(){window.setTimeout(init, 500);});
