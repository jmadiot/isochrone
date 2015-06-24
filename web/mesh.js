/* enable debugging */
var DEBUG=1;
var PRINT_TIMES_TO_CITIES=0;
var resetdebug = function() {if(DEBUG){document.getElementById('debug').innerHTML="";}}
var debug = function(t) {if(DEBUG){document.getElementById('debug').innerHTML+=t+"<br />\n";}}

var DRAW_GRID=1;
var DRAW_CIRCLES=1;
var DRAW_ROUTES=1;

var pos = [];

var routes = [];
var v = [];

var d = function(p, q) {
  var x = p[0]-q[0], y = p[1]-q[1];
  return Math.sqrt(x*x+y*y);
};

init_graph = function() {
  var i;
  for(i=0; i<400; i++) {
    x = 2*Math.random()-1;
    y = 2*Math.random()-1;
    excentricity=0.1; // from 0 to 1 (0.5 is already a lot)
    x *= Math.pow(x*x+y*y,excentricity);
    y *= Math.pow(x*x+y*y,excentricity);
    pos[i] = [2*(x*100+200), 2*(y*100+200)];
    // pos[i] = [40*(i%8), 40*Math.floor(i/8)];
  }
  
  pos.map(function(p, i) {
    routes[i] = [];
    pos.map(function(q, j) {
      if(d(p, q) < 25) routes[i].push([j, d(p, q)*(1+Math.random())]);
    })  
  })
  
  for(i=0;i<pos.length;i++){
      v[i] = [];
      for(j=0;j<pos.length;j++){
          v[i][j] = Infinity;
      }
      v[i][i] = 0;
      routes[i].map(function(jd){v[i][jd[0]] = jd[1]})
  }
  
  var start = new Date();
  
  for(k=0;k<pos.length;k++)
      for(i=0;i<pos.length;i++)
          for(j=0;j<pos.length;j++)
              v[i][j] = Math.min(v[i][j],v[i][k]+v[k][j])

  debug((new Date() - start)/1000 + " s for floyd-warshall n^3 (=" + (pos.length*pos.length*pos.length) + ") algorithm");
}

var nicetime = function(minutes) {
  var h = Math.floor(minutes/60);
  var m = Math.floor(minutes%60);
  var z = (m<10)?'0':'';
  return h + ":" + z + m;
}

/* Distance between two (lat, lng) pairs */
var dummydist = function(p1, p2) {
  var x = p1[0]-p2[0];
  var y = p1[1]-p2[1];
  return Math.sqrt(x*x+y*y);
}

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
  // var angle = d / 6371 * 180 / Math.PI;
  // var p1 = latlng_to_screen(pos);
  // var p2 = latlng_to_screen([pos[0] + angle, pos[1]]);
  // var d = {x:p1.x-p2.x, y:p1.y-p2.y};
  return d;
  // return Math.sqrt(d.x * d.x + d.y * d.y);
}

/* kms per minute, used to compute travel times without shorcuts */
var carspeed = 0.05;

/* converting from and to google's latlng things */
var K = function (x){return function(){return x;}};
var latlng_to_pair = function(c){return [c.lat(), c.lng()];};
var pair_to_latlng = function(p){return {lat:K(p[0]), lng:K(p[1])};};

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

var via = []

/* draw */
var last_redraw = new Date();
var last_mousepos = window.mousepos;
// redraw = function(mouse, ispixel) {
redraw = function() {
  requestAnimationFrame(redraw);
  
  // if(last_mousepos == mousepos) return;
  last_mousepos = mousepos;
  
  resetdebug();
  nb_redraws++;
  debug(nb_redraws);
  
  // // mouse position is computed properly when zooming, but not when
  // // moving, I don't know why
  // var earthmouse = mouse;
  // if(ispixel)
  //   earthmouse = latlng_to_pair(latlng_from_screen(mouse.x, mouse.y));
  // debug("mouse: " + earthmouse);
  
  var earthmouse = window.mousepos;
  
  var canvas = document.getElementById("canvas");
  var context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  var cangrid = document.getElementById("grid");
  var ctxgrid = cangrid.getContext("2d");
  var grid = [];
  ctxgrid.clearRect(0, 0, cangrid.width, cangrid.height);
  for(i=0;i<50;i++){grid[i]=[];for(j=0;j<50;j++)grid[i][j]=Infinity;}
  ctxgrid.fillStyle = 'black';
  
  // computing time to reach each city from earthmouse
  time_by_car = new Array();
  timetoreach = new Array();
  for(i=0;i<pos.length;i++){
    timetoreach[i] = time_by_car[i] = dummydist(earthmouse, pos[i]) / carspeed;
  }
  for(i=0;i<pos.length;i++){
    via[i]="";
    for(j=0;j<pos.length;j++){
      // debug([i,j]);
      newtime = time_by_car[i] + v[i][j];
      if(newtime < timetoreach[j]) {
        timetoreach[j] = newtime;
        via[j] = " (via "+i+")"
      }
    }
  }
  
  var wcell = 20;
if(DRAW_GRID)
  for(i=0;i<pos.length;i++){
    var x = Math.floor(pos[i][0]/wcell);
    var y = Math.floor(pos[i][1]/wcell);
    if(0<=x && x<grid.length && 0<=y && y<grid[x].length)
      grid[x][y] = Math.min(grid[x][y], timetoreach[i]);
  }
// for(x=0;x<grid.length;x++)
//     console.log(grid[x])
  for(layer = 0; layer < layers.length; layer++) {
    ctxgrid.fillStyle = layers[layer].color;
    for(x=0;x<grid.length;x++)
      for(y=0;y<grid[x].length;y++)
        if(layers[layer].time > grid[x][y])
          ctxgrid.fillRect(x*wcell,y*wcell,wcell,wcell);
  }
  
  // draw a circle of center p and radius km
  circle = function(p, km) {
    var pix = latlng_to_screen(p);
    context.moveTo(pix.x, pix.y);
    context.arc(pix.x, pix.y, km_to_pixels(p, km), 0, 2*Math.PI);
  };

  // draw a circle of center p and radius km, assuming mercator
  elaborate_circle = function(p, km) {
    var top    = latlng_to_screen([p[0]+km/6371*180/Math.PI, p[1]]);
    var bottom = latlng_to_screen([p[0]-km/6371*180/Math.PI, p[1]]);
    context.moveTo(top.x, (top.y + bottom.y)/2);
    context.arc(top.x, (top.y + bottom.y)/2, -(top.y - bottom.y)/2, 0, 2*Math.PI);
  };
  
  /* draw layers */
  var layer;
if(DRAW_CIRCLES) //////////////
  for(layer = 0; layer < layers.length; layer++) {
    timeavailable = layers[layer].time;
    context.fillStyle = layers[layer].color;

    /* accessible without shortcut */
    context.beginPath();
    circle(earthmouse, timeavailable * carspeed);
    
    /* with shortcuts */
    for(i=0; i<pos.length; i++){
      remaining_distance = (timeavailable - timetoreach[i]) * carspeed;
      if(remaining_distance > 0) {
        circle(pos[i], remaining_distance);
      }
    }
    if(layer==0 && PRINT_TIMES_TO_CITIES) {
      timetoreach.map(function(x,i){return [x,i]}).sort(function(p,q){return p[0]-q[0]}).map(function(d){
        debug("time to " + d[1] + ": " + nicetime(d[0]));
      })
    }
    context.fill();
  }
  /* make all this transparent */
  context.save();
  context.globalCompositeOperation = "destination-out";
  context.fillStyle = "rgba(0,0,0,0.5)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.restore();
  
  /* mark cities */
  context.fillStyle = "rgba(0,0,0,0.5)";
  // context.font = "10px monospace";
  for(i=0; i<pos.length; i++){
    context.beginPath();
    var pix = latlng_to_screen(pos[i]);
    context.arc(pix.x, pix.y, 2, 0, 2*Math.PI);
    context.fill();
    // context.fillText(i + " " + nicetime(timetoreach[i]) + via[i], pos[i][0], pos[i][1]);
    // context.fillText(nicetime(timetoreach[i]), pos[i][0], pos[i][1]);
  }
  
  context.fillStyle = "rgba(0,0,0,0.9)";
  context.beginPath();
if(DRAW_ROUTES)
  routes.map(function(l,i){
    l.map(function(jd){
      if(i<jd[0]){
        context.moveTo(pos[i][0],pos[i][1]);
        context.lineTo(pos[jd[0]][0],pos[jd[0]][1]);
      }
    });
  });
  context.stroke();
  
    //BENCHMARKING
if(1){
    var t = new Date();
    var r = nb_redraws / 10;
    context.beginPath();
    var n = Math.sqrt(10000), ncircles = 0;
    for(ix=0; ix<n; ix++) {
        for(iy=0; iy<n; iy++) {
            ncircles++;
            // var R = 200*(Math.sin(i));
            // var x = 1000+R*Math.cos(Math.PI*2*i/n);
            // var y = 300+R*Math.sin(Math.PI*2*i/n);
            var x = 700+500*ix/n;
            var y = 100+500*iy/n;
            context.moveTo(x,y);
            context.arc(x,y,r,0,2*Math.PI);
        }
    }
    context.fill();
    t = new Date() - t;
    debug("time to draw "+ncircles+" circles: "+t+" ms (radius="+r+")")
}
    var t2 = performance.now();
    debug("time since frame: "+(t2-last_redraw)+" ms")
    last_redraw = t2
}

/* conversion function */
//var latlng_from_screen = function(x, y) {return overlay.getProjection().fromDivPixelToLatLng({x:x, y:y});};
//var latlng_to_screen = function(p) {return overlay.getProjection().fromLatLngToContainerPixel(pair_to_latlng(p));};
var latlng_from_screen = function(x, y) {return pair_to_latlng([x,y]);};
var latlng_to_screen = function(p) {return {x:p[0],y:p[1]};};

/* set up overlay, map and listeners */
init = function() {
  var canvas = document.getElementById("canvas");
  var context = canvas.getContext("2d");
  context.canvas.width = window.innerWidth;
  context.canvas.height = window.innerHeight;

  // var above = document.getElementById("above");
  // var context2 = above.getContext("2d");
  // context2.canvas.width = window.innerWidth;
  // context2.canvas.height = window.innerHeight;
  
  var grid = document.getElementById("grid");
  var context3 = grid.getContext("2d");
  context3.canvas.width = window.innerWidth;
  context3.canvas.height = window.innerHeight;
  
  bdraw = function(e) {redraw({x:e.layerX, y:e.layerY}, true)};
  
  draw = function(e) { var t=new Date(); bdraw(e); debug((new Date()-t) + " ms to draw last frame"); }
  
  // var last_c = new Date();
  // var iter_c = new Date();
  // var period_min = parseInt(window.location.hash.substr(1))||0;
  // draw = function(e) {
  //     var t=new Date();
  //     iter_c++;
  //     if(t - last_c > period_min) { cdraw(e); last_c = t; debug(iter_c+" ignored calls to redraw"); iter_c = 0; };
  // }
  
  init_graph();
  
  window.mousepos = [0,0];
  grid.onmousemove = (function(e){window.mousepos=[e.layerX, e.layerY];});
  requestAnimationFrame(redraw);
  
  // grid.onclick = draw;
  // if(requestAnimationFrame) {
  //   grid.onmousemove = (function(e){
  //     requestAnimationFrame(function(){draw(e);});
  //   });
  // } else {
  //   grid.onmousemove = draw;
  // }
  // grid.onclick = draw;
  
  // canvas.ontouchmove = redraw;
  // canvas.addEventListener('touchstart', redraw, false); //does not work properly
  // canvas.addEventListener('touchmove', redraw, false);
  
  // overlay = new google.maps.OverlayView();
  // overlay.draw = function(e) {};
  // //#15/52.2007/0.1306-
  // var options = {center: new google.maps.LatLng(48,7), zoom: 5};
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
  // overlay.setMap(new google.maps.Map(document.getElementById('map'), options));
};

window.addEventListener('load', function(){window.setTimeout(init, 0);});
