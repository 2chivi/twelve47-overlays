
var g_wedge = class g_wedge extends Gobj {

    constructor(oid, type, stage = G.Stage_, world = G.World_) {
        super(oid, type, stage, world);
        var t = this;
        t.width = 20;
        t.height = 20;
        t.state = ['spx', 'spy', 'width', 'height'];
        t.mods = ['spx', 'spy', 'width', 'height'];
        t.alwaysUpdate = true;
        t.radius = 200;
        t.flipflash = 1;
        t.dotTick = 0;
    }

    //text appearing / shrinking dynamically
    //tickers on the edges + arrows.  Slows down on turn

    Init() {
        var t = this;
        super.Init('static', t.spx, t.spy);
        t.IsTerrain = true;
        t.speed = 0;
        t.txts = [];
        t.idle = true;
        t.angAccum = 0;
        t.currentDotAng = 0;
        t.dots = [];

        //t.fxRect = G.rect(5,5,2, { color: 0x000000 });

        t.fxRect = G.particle({
            gr: G.rect(null, 5, 5, 3, { color: 0xffffff, alpha: 0.75 }),
            name: 'rect', z: 20, alwaysUpdate: false, canScale: true, isStatic: false
        });

        t.Part('terrain', G.pCircle(12), { 
            filterCategoryBits: G.cats[2]
        });

        if (!G.IsServer) {
            var cdata = UT.ran(CG.cdata);

            t.txt = {
                fontSize: 26, strokeThickness: 3, alpha: 1,
                fontWeight: 500, fill: 'white', zIndex: 2, wordWrap: true,
            };

            //var gr = G.poly(null, wedgePoints, { color: cdata.color })

            console.log('make circle info: ', GU.wInfo)
            t.makeCircle(GU.wInfo, t.radius);
            t.makeDots(20)

            //var points = [0,0,2,3, 4,0];
            //var gr = G.poly(null, points, { color: 0x00ff00, size:20 })
            //t.addG(t.terrain, 'grArrow', gr, 0, -t.radius)
            //t.grArrow = gr;
           // G.Stage_.addChild(gr);

            t.addG(t.terrain, 'gr1', { color: 0x0, alpha: 1 }, 0, 0, -1);
            //t.terrain.grs.gr1.hidden = true;
        }
    };

    spin(){
        var t= this;
        if(!t.spinning){
            t.speed = 0.12 + Math.random() * 0.06;
            t.spinning = true;
        }
    }

    makeDots(total){
        var t = this;
        var angDiff = (Math.PI*2) / total;
        t.dotAngs = [];

        for(var i = 0; i < total; i++){
            var gr = G.rect(null, 5,10,2, { color: 0xffffff, tint: CG.cdata[2].color, lineWidth:1 });
            var x = (t.radius+0)*Math.sin(angDiff*i);
            var y = (t.radius+0)*Math.cos(angDiff*i);
            var g = t.addG(t.terrain, 'grdot'+i, gr, x , y);
            g.wa = -(i/total) * Math.PI*2
            t.dotAngs.push((i / total) * Math.PI * 2);
            t.dots.push(g);
        }
    }

    makeCircle(wInfo, radius){
        var t= this;
        t.wedges = [];

        var takenAngCumm = 0;
        var totalSlices = 0;
        wInfo._each(x => { if(x.pct != 1){ takenAngCumm += x.pct*(Math.PI*2); totalSlices++; } });

        var BaseAngSplit = ((Math.PI * 2) - takenAngCumm) / (wInfo.length-totalSlices);
        var lastAng = 0;

        console.log(BaseAngSplit, 'base ang split');

        for (var i = 0; i < wInfo.length; i++){
            var w = wInfo[i];
            var angSplit = w.pct == 1 ? BaseAngSplit : w.pct*(2*Math.PI);
            var points = t.wedgePoints(radius, 0 + lastAng, angSplit);
            

            var cdata = CG.cdata[i%CG.cdata.length];

            var gr = G.poly(null, points, { texture: CG.textures.metalTile, tint: cdata.color, lineWidth:3, center:false, alpha:1 })
            var g = t.addG(t.terrain, 'grw'+i, gr, i*0);
            t.wedges.push(g);
            g.oldCdata = cdata;


            var ang = (lastAng + angSplit*0.5);// - Math.PI*0.2;
            var xd = Math.sin(ang);
            var yd = -Math.cos(ang);
           // lastAng = lastAng + angSplit;
            g.angSplit = angSplit;


            var boxHeight = t.radius*0.55;
            var boxWidth = 2 * (Math.sin(0.5 * Math.min(Math.PI*1,angSplit)) * boxHeight);
            var txtOpts = {
                fontSize: 35, strokeThickness: 3, hidden: true, wordWrapWidth:boxWidth,
                fontWeight: 500, fill: 'white', zIndex: 2, wordWrap: true,
            };

            
            //outer number htingys
            var ang2 = (lastAng + angSplit);// - Math.PI*0.2;
            var xd2 = Math.sin(ang2);
            var yd2 = -Math.cos(ang2);

            var opts = {
                fontSize: 18, strokeThickness: 3, alpha:0.35,
                fontWeight: 600, fill: 'white', zIndex: 2,
            };
            var gr = G.text(null, i, null, opts);
            //var gr = G.rect(null, 50,50,3, { color:0xff0000 })
            var g = t.addG(t.terrain, 'grnuma'+i, gr);

            g.wx = xd * (t.radius+11);
            g.wy = yd * (t.radius+11);
            g.wa = ang;


            lastAng = lastAng + angSplit;

            //if(i == 0){
            var text = w.text ? w.text : i+ 'Chance Wheel';
            var gr = G.text(null, text, null, txtOpts)
            var g = t.addG(t.terrain, 'grtext' + i, gr, 0, 0);


            g.xd = xd;
            g.yd = yd;
            g.boxWidth = Math.max(6, boxWidth);
            t.txts.push(g);

            

            if (angSplit > 0.8 * Math.PI) {
                g.wx = xd * (0 + g.height * 0.5 + 30);
                    g.wy = yd * (0 + g.height * 0.5 + 30);
            } else {
                g.wx = xd * (t.radius - g.height * 0.5 - 30);
                g.wy = yd * (t.radius - g.height * 0.5 - 30);
            }

            g.wa = ang;
            //}

        }
    }

    adjustSize(){
        var t = this;

        t.txts._each((txt,i)=>{
            if (txt.height > t.radius * 0.5 || txt.width > txt.boxWidth*1.3) {
                var width = txt.boxWidth;
                var oldSize = txt.fontSize;
                var oldText = txt._text;
                var oldxd = txt.xd;
                var oldyd = txt.yd;
                var oldwa = txt.wa;

                t.removeG(t.terrain, 'grtext'+i);

                var txtOpts = {
                    fontSize: oldSize - 1, strokeThickness: 3, alpha: 1, wordWrapWidth: width,
                    hidden: true,
                    fontWeight: 500, fill: 'white', zIndex: 2, wordWrap: true,
                };

                t.txts[i] = t.addG(t.terrain, 'grtext'+i, G.text(null, oldText, null, txtOpts));
                var g = t.txts[i];

                g.boxWidth = width;
                g.wx = oldxd * (t.radius - g.height * 0.5 - 30);
                g.wy = oldyd * (t.radius - g.height * 0.5 - 30);
                g.wa = oldwa;
                g.xd = oldxd;
                g.yd = oldyd;


                G.reOrderNeeded = true;
            }else{
                txt.hidden = false;// = 1;
            }
        });
    }

    wedgePoints(radius, angStart, angSize){
        var segments = radius > Math.PI*0.5 ?  16 : 8;
        var points = [0,0];
        var angDiff = angSize/segments;

        for(var i = 0; i < segments+1; i++){
            points.push(radius*Math.sin(angStart+angDiff*i));
            points.push(radius * -Math.cos(angStart + angDiff*i))
        }
        points.push(0,0);
        return points;
    }

    Tick() {
        var t = this;
        //t.grArrow.x = t.pos.x;
        //t.grArrow.y = t.pos.y - t.radius;
        
        //flashing rings
        if(G.Objs.get('back').ms < 800 && !t.spinning){
            if (t.flashDot) {
                t.flashDot.tint = CG.cdata[2].color;
                t.flashDot.scale.x = 1;
            }

            if(G.Tick % 4 == 1){
                var dot = t.dots[t.dotTick % (t.dots.length)];
                dot.tint = 0xffffff;
                dot.scale.x = 1.4;
                t.flashDot = dot;
                t.dotTick++;
            }

        }else{

            //found winner
            if(!t.spinning && !t.idle){
                if(G.Tick % 10 == 0)
                    t.flipflash = t.flipflash*-1;

                if(t.flipflash > 0){
                    t.dots._each((d, i) => {
                        if (i % 2 == 1) {
                            d.tint = 0xffffff;
                            d.scale.x = 1.2;
                        }else{
                            d.tint = CG.cdata[2].color;
                            d.scale.x = 1;
                        }
                    });
                }else if(t.flipflash < 0){
                    t.dots._each((d, i) => {
                        if (i % 2 == 1) {
                            d.tint = CG.cdata[2].color;
                            d.scale.x = 1;
                        } else {
                            d.tint = 0xffffff;
                            d.scale.x = 1.2;
                        }
                    });
                }
            }else{
                t.dots._each((d, i) => {
                    d.tint = CG.cdata[2].color;
                    d.scale.x = 1;
                });
            }
        }



        if(G.Tick % 2 == 0){
            t.adjustSize();
        }

        if(t.speed > 0 && t.spinning){
            t.idle = false;
            t.con.setAngle(t.con.getAngle() + t.speed);

            if(G.Tick % 5 == 0){
                t.speed -= 0.002;//0.00005
            }

        }


        //Winner is ready
        if(t.spinning && t.speed <= 0){
            
            t.spinning = false;

            //check for winner
            var checkAng = t.con.getAngle() < 0 ? (t.con.getAngle() + Math.PI * 2) : t.con.getAngle();
            var angCheck = Math.PI*2;
            t.wedges._each((w,i)=>{
                if(checkAng <= angCheck && checkAng > (angCheck-w.angSplit)){
                    console.log('winner ' + i +  " " + t.txts[i].text);

                    for(var h = 0; h < 10; h++){
                        G.TickFunc(G.Tick+h*10, function(){
                            w.tint = w.tint == w.oldCdata.light ? w.oldCdata.color : w.oldCdata.light;
                        })
                    }


                    GU.ShowMessage(t.txts[i].text);
                    //GU.TryChangeScene(t.txts[i].text)
                    //GU.ChangeModel(t.txts[i].text);
                }

                console.log(checkAng, angCheck, w.angSplit);
                angCheck -= w.angSplit;
            });

            G.Objs.get('back').StartTimer();

            G.TickFunc(G.Tick+150, ()=>{
                if(!t.spinning)
                    t.idle = true;
            })
        }

        if(!t.spinning && t.idle){
            t.con.setAngle(t.con.getAngle() + 0.001);
        }


        var checkAng = t.con.getAngle() < 0 ? (t.con.getAngle() + Math.PI*2) : t.con.getAngle();

        if ((checkAng) > t.dotAngs[t.currentDotAng]){
            if (t.dotAngs[t.currentDotAng] != 0 || checkAng < 4){
                t.currentDotAng++;
                t.currentDotAng = t.currentDotAng % t.dotAngs.length;

                if(t.spinning){
                    var sid = CG.sxTick.play();
                    CG.sxTick.volume(0.2 + (10 * t.speed), sid);
                }
               

                //G.sound('sxTick', t, 0.2 + (10*t.speed), true);

                G.Objs.get('back').terrain.grs.grArrow.wa = -0.2;
                //t.terrain.grArrow.rotation = -0.3;

                if (t.speed > 0.005) {
                    for (var i = 0; i < 2; i++) {
                        G.spawnParticle(t.fxRect, t, {
                            life: 5,
                            pos: { x: t.pos.x, y: t.pos.y - t.radius },
                            vel: { x: 100 * t.speed, y: G.ran(0, 1.5) },
                        });
                    }
                }
            }
        }



        if (G.Objs.get('back').terrain.grs.grArrow.wa <= 0){
            G.Objs.get('back').terrain.grs.grArrow.wa += 0.035;
        }
    };

    CollideStart(e) {
        var t = this;
    };

    CollideEnd(e) {
        var t = this;
    };
}
if (typeof exports !== 'undefined')
    module.exports = g_wedge;

