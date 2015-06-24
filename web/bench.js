/* enable debugging */

var DEBUG=1;
var resetdebug = function() {if(DEBUG){document.getElementById('debug').innerHTML="";}}
var debug = function(t) {if(DEBUG){document.getElementById('debug').innerHTML+=t+"<br />\n";}}


/* draw */

var last_redraw = new Date();
var nb_redraws = 0;
var N = 10;
var radius = 0;
redraw = function() {
    requestAnimationFrame(redraw);
    
    resetdebug();
    nb_redraws++;
    debug(nb_redraws);
    
    var testing = document.getElementById("testing");
    var context = testing.getContext("2d");
    // context.clearRect(0, 0, testing.width, testing.height);
    
    var t = new Date();
    // var radius = nb_redraws / 10;
    var n = Math.sqrt(1000), ncircles = 0;
    // radius = 10;
    for(iy=0; iy<n; iy++) {
        for(ix=0; ix<n; ix++) {
            context.beginPath();
            ncircles++;
            var x = 100+500.*(ix/n);
            var y = 100+500.*(iy/n);
            context.moveTo(x,y);
            context.arc(x,y,radius,0,2*Math.PI);
            context.moveTo(x+radius,y);
            // for(k=0;k<=2*N;k++)
            //   context.lineTo(x+(2-k%2)/2*radius*Math.cos(k/N/2*Math.PI*2),y+(2-k%2)/2*radius*Math.sin(k/N/2*Math.PI*2));
            context.stroke();
        }
    }
    
    var t = performance.now();
    var dt = t-last_redraw;
    debug("time since last frame: "+dt+" ms")
    last_redraw = t

    var results = document.getElementById("results");
    var context2 = results.getContext("2d");
    context2.fillStyle = 'black';
    var x = ox + radius / scalex;
    var y = oy + hy - dt / scaley;
    context2.beginPath();
    context2.moveTo(x,y);
    context2.arc(x,y,1,0,2*Math.PI);
    context2.fill();
    // N = Math.round(2+(38-22)*Math.random())
    radius = hx * scalex * Math.random()
    // radius += 0.1
}

/* set up overlay, map and listeners */
init = function() {
    var testing = document.getElementById("testing");
    var context = testing.getContext("2d");
    context.canvas.width = window.innerWidth/2-1;
    context.canvas.height = window.innerHeight;
    
    var results = document.getElementById("results");
    var context2 = results.getContext("2d");
    context2.canvas.width = window.innerWidth/2-1;
    context2.canvas.height = window.innerHeight;
    ox = 30;
    oy = 100;
    scalex = 0.01; //
    scaley = 1;    // how much is 1 pixel
    hy = 400;
    hx = 500;
    context2.beginPath();
    context2.moveTo(ox,oy+hy); context2.lineTo(ox+hx,oy+hy);
    context2.moveTo(ox,oy+hy); context2.lineTo(ox,oy);
    context2.stroke();
    context2.font = "12px monospace";
    var dx = 50; var dy = dx;
    for(ix=0;ix*dx<=hx;ix++) {
        context2.beginPath();
        context2.moveTo(ox + ix * dx, oy+hy-3);
        context2.lineTo(ox + ix * dx, oy+hy+3);
        context2.stroke();
        context2.fillText(ix * dx * scalex, ox + ix * dx, oy+hy+15);
    }
    for(iy=0;iy*dy<=hy;iy++) {
        context2.beginPath();
        context2.moveTo(ox+3, oy+hy - iy * dy);
        context2.lineTo(ox-3, oy+hy - iy * dy);
        context2.stroke();
        context2.fillText(iy * dy * scaley, ox - 22, oy+hy - iy * dy);
    }
    
    requestAnimationFrame(redraw);
};

window.addEventListener('load', function(){window.setTimeout(init, 0);});
