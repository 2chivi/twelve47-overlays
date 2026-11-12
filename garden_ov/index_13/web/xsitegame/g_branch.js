
class g_branch extends Gobj {

    //background features need to be function of CG.Scale
    constructor(oid, type, stage = G.Stage_, world = G.World_) {
        super(oid, type, stage, world);
        var t = this;
        t.alwaysUpdate = true;
    }

    Init() {
        var t = this;

        super.Init('dynamic', 0, 0);
        //is childObject of 
        t.Part('core', G.pBox(20, 20), { isSensor: true, filterMaskBits: 0x0 });


        t.con.m_gravityScale = 0;

        t.ageRate = 1;
        t.mag = 1;//100
        t.magw = 2;
        t.age = 0;
        t.windResistance = t.height / 3;
        t.showApple = false;

        var p = G.Objs.get(t.parentid);

        var xaxis = GU.guy.spx - G.bounds.min.x;
        var pctxaxis = xaxis / (G.bounds.max.x - G.bounds.min.x);
        t.pctxaxis = pctxaxis;
        t.leafOrder = Math.random() > 0.5 ? 1 : -1;
        
        t.maxLength = p.maxLength *0.95;

        if (!G.IsServer) {

            //var grBox1 = G.Shape(Parts.mats['c0'], Parts.geoBox,
                //{ shadow: true, scaleY: 0, scaleX: 0.05 });
            //t.addG(t.core, 'grBox1', grBox1, 0, 0, 9);

            var grBox1 = G.Plane(Parts.mats['c0'], { scaleY: 0.001, scaleX: 0.0001 });
            t.addG(t.core, 'grBox1', grBox1, 0, 1500, 9);
            //t.core.grs.grBox1.hidden = true;


            t.CalcAngs();
            t.CheckBranchCloseness(p, 0);

            var end = {
                x: t.endOffset.x + t.pnorm.x * t.maxLength*0.8,
                y: t.endOffset.y + t.pnorm.y * t.maxLength*0.8
            }

            //t.v.x * parentMag

            t.lscale = 0.1;
            t.lheight = t.oheight = Parts.mats.leaf_0.map.source.data.height * t.lscale;
            t.lwidth = t.owidth = Parts.mats.leaf_0.map.source.data.width * t.lscale;

            if(t.height >= 2 && GU.guy){
                var leaf = G.Image(Parts.mats.leaf_0, { size: t.lscale });
                var myz = t.height <= 4 ? 14 : 12;
                t.addG(t.core, 'leaf1', leaf, end.x, end.y, myz);
                t.core.grs.leaf1.wa = t.dirAng;
                t.core.grs.leaf1.hidden = true;

                if(t.height == 4 || t.height == 5){
                    var leaf = G.Image(Parts.mats.leaf_0, { size: t.lscale });
                    t.addG(t.core, 'leaf2', leaf, end.x, end.y, myz+1);
                    t.core.grs.leaf2.wa = t.dirAng;
                    t.core.grs.leaf2.hidden = true;
                }
            }

            if(t.height >= 5 && GU.guy && t.hasApple){
                var apple = G.Image(Parts.mats.apple, { size: 0.4 });
                t.addG(t.core, 'apple', apple, 0, 0, 20);
            }


            var grBox2 = G.Shape(Parts.mats['c0'], Parts.geoBox,
                { shadow: true, scaleY: 0.01, scaleX: 0.01 });
            t.addG(t.core, 'grBox2', grBox2, t.endOffset.x, t.endOffset.y, 25);


            t.AddAnimation(t.core, 'leaf1', 300, { repeat: false, active: false, curve: EN.Curves.get('linear') }, {
                'leaf1': [{ y: 0, x: 0, ang:0 }, { y: 600, x: 0, ang: Math.PI*0.5 }],
            });//x,y,ang,scale,alpha
            t.AddAnimation(t.core, 'leaf2', 300, { repeat: false, active: false, curve: EN.Curves.get('linear') }, {
                'leaf2': [{ y: 0, x: 0, ang: 0 }, { y: 600, x: 0, ang: Math.PI * 0.5 }],
            });//x,y,ang,scale,alpha
            t.AddAnimation(t.core, 'apple', 100, { repeat: false, active: false, curve: EN.Curves.get('linear') }, {
                'apple': [{ y: 0, x: 0}, { y: 600, x: 0}],
            });//x,y,ang,scale,alpha
        }
    };

    KillLeaves(){
        var t= this;

        clearTimeout(t.ttKill);
        t.ttKill = setTimeout(function(){

            if (t.age <= 5 && !t.dead)
                return;

            clearTimeout(t.ttDead);
            t.ttDead = setTimeout(function () {
                t.dead = true;
            }, 240 * 33);


            G.TickFunc(G.Tick + G.ran(30, 28), function () {
                var l = t.core.grs[`leaf1`];
                if (l && !l.hidden) {
                    l.ogx = l.wx;
                    l.ogy = l.wy;
                    l.oga = l.wa;
                    t.ToggleAnimation(`leaf1`, true);
                }
            });
            G.TickFunc(G.Tick + G.ran(30, 28), function () {
                var l = t.core.grs[`leaf2`];
                if (l && !l.hidden) {
                    l.ogx = l.wx;
                    l.ogy = l.wy;
                    l.oga = l.wa;
                    t.ToggleAnimation(`leaf2`, true);
                }
            });

        },Math.random()*14000);
    }

    Apple(){
        var t = this;
        if(t.height == 5){
            t.showApple = true;
            console.log('apple', t.height);
        }
    }

    FallLeaves(time=1){
        var t = this;
        clearTimeout(t.ttDead);
        clearTimeout(t.ttKill);
        clearTimeout(t.ttFall);
        clearTimeout(t.ttApple);

        //t.ttFall = setTimeout(function(){

            t.dead = false;
            //t.showApple = false;

            if (t.showApple && t.core.grs.apple) {
                t.ttApple = setTimeout(function(){
                    setTimeout(function () {
                        t.showApple = false;
                    }, 2000);
                    t.core.grs.apple.ogx = t.core.grs.apple.wx;
                    t.core.grs.apple.ogy = t.core.grs.apple.wy;
                    t.ToggleAnimation(`apple`, true);
                }, Math.random()*5000)
            }


            for (var i = 1; i <= 2; i++) {
                var l = t.core.grs[`leaf${i}`];
                if (l) {
                    if (time == 1)
                        time = Math.random() > 0.5 ? 1 : 2;
                    var img = G.Image(Parts.mats[`leaf_${time}`], { size: t.lscale });
                    var oldz = l.wz;
                    var oldscalex = l.scale.x;
                    var oldscaley = l.scale.y;
                    var oldHidden = l.hidden;
                    var oldwx = l.wx;
                    var oldwy = l.wy;
                    var oldwa = l.wa;

                    t.removeG(t.core, `leaf${i}`);
                    t.addG(t.core, `leaf${i}`, img, 0, 0, oldz);
                    t.core.grs[`leaf${i}`].scale.x = oldscalex;
                    t.core.grs[`leaf${i}`].scale.y = oldscaley;
                    t.core.grs[`leaf${i}`].hidden = oldHidden;
                    t.core.grs[`leaf${i}`].wx = oldwx;
                    t.core.grs[`leaf${i}`].wy = oldwy;
                    t.core.grs[`leaf${i}`].wa = oldwa;

                    if (time == 0) {
                        console.log(t.lwidth, t.lheight)
                        t.core.grs[`leaf${i}`].scale.x = t.owidth;
                        t.core.grs[`leaf${i}`].scale.y = t.oheight;
                    }

                    t.AddAnimation(t.core, 'leaf1', 300, { repeat: false, active: false, curve: EN.Curves.get('linear') }, {
                        'leaf1': [{ y: 0, x: 0, ang: 0 }, { y: 600, x: 0, ang: Math.PI * 0.5 }],
                    });//x,y,ang,scale,alpha
                    t.AddAnimation(t.core, 'leaf2', 300, { repeat: false, active: false, curve: EN.Curves.get('linear') }, {
                        'leaf2': [{ y: 0, x: 0, ang: 0 }, { y: 600, x: 0, ang: Math.PI * 0.5 }],
                    });//x,y,ang,scale,alpha
                }
            }

       // }, Math.random()*5000);
    }

    CheckBranchCloseness(p, checkInterval){
        var t = this;

        if (!GU.guy.endPoints)
            GU.guy.endPoints = [];

        var testMag = t.maxLength;
        var tooClose = false;
        GU.guy.endPoints._each(ep => {
            var point = { x: p.endPoint.x + t.v.x * testMag, y: p.endPoint.y + t.v.y * testMag };
            var dist = G.dist(ep, point);
            if (dist < 34 || (t.height <= 4 && dist < 20))
                tooClose = true;
        });
        if (tooClose) {
            //console.log('too close', t.height, checkInterval);
            t.CalcAngs();
            if(checkInterval < 10)
                return t.CheckBranchCloseness(p, checkInterval+1);
            //recalc dirAng, and pnorm
        }
        var point = { x: p.endPoint.x + t.v.x * testMag, y: p.endPoint.y + t.v.y * testMag };
        GU.guy.endPoints.push(point);
        t.endPoint = point;
    }

    CalcAngs(){
        var t = this;

        t.parentAng = G.Objs.get(t.parentid).core.grs.grBox1.wa;
        var sourceAng = t.parentAng;

        sourceAng = sourceAng * 0.7;

        if (t.height <= 1)
            t.dirAng = G.ran(sourceAng, 0.6);
        else
            t.dirAng = G.ran(sourceAng, 1.4);

        //small chance of staying straight like parent?
        if (Math.random() > 0.9)
            t.dirAng = t.parentAng;

        t.core.grs.grBox1.wa = t.dirAng;

        var parentMag = G.Objs.get(t.parentid).mag;
        t.v = G.vnorm({ x: Math.sin(t.dirAng), y: -Math.cos(t.dirAng) });
        t.pnorm = t.v;

        t.endOffset = {
            x: t.v.x * parentMag,
            y: t.v.y * parentMag
        }
    }


    //have an idea.. to redo random gen.. 
    //if end-leaf is in an area close to another end-leaf?
    Tick() {
        super.Tick();
        var t = this;

        //Handle Updating rotation


        t.core.grs.grBox1.hidden = t.age <= 1;
        

        //wind stuff
        var bend = Math.abs(t.dirAng) < 1.4;
        if(bend){
            t.core.grs.grBox1.wa = t.dirAng + ((t.core.grs.grBox1.wa - t.dirAng) * 0.96);

            var wind = GU.lastWind;
            var test2 = t.pctxaxis * 50;

            if (G.Tick > GU.lastWindChange + test2)
                wind = GU.wind;
            t.core.grs.grBox1.wa += wind * 0.75 * t.windResistance;


            var newAng = t.core.grs.grBox1.wa;
            //t.dirAng = t.core.grs.grBox1.wa;
            var v = G.vnorm({ x: Math.sin(newAng), y: -Math.cos(newAng) });
            t.pnorm = v;
        }



        //Handle Growth
        var p = G.Objs.get(t.parentid);
        if(p){
            t.ageRate = p.ageRate;


            if(p.age > 30){
                //check height of plant

                if(t.height == GU.treeHeight && t.age >= 20) //18 last 5==
                    GU.guy.allowAging = false;

                t.age += t.ageRate;


                if(t.core.grs.leaf1 && t.core.grs.leaf1.scale.y < 43.5 && t.age > 16){
                    t.lscale+= 0.001;
                    t.lheight = t.core.grs.leaf1.scale.y
                    //t.core.grs.leaf1.scale.set(t.lscale, t.lscale);
                    t.core.grs.leaf1.scale.x *= 1.05;
                    t.core.grs.leaf1.scale.y *= 1.05;
                    t.core.grs.leaf1.hidden = false;

                    if(t.core.grs.leaf2){
                        t.core.grs.leaf2.scale.x *= 1.05;
                        t.core.grs.leaf2.scale.y *= 1.05;
                        t.core.grs.leaf2.hidden = false;
                    }
                }

                if (t.mag < t.maxLength)
                    t.mag+=t.ageRate*1.7;
            }else{

            }

            t.childwx = p.pnorm.x * p.mag;
            t.childwy = p.pnorm.y * p.mag;
        }

        /*
        if (GU.branch3 && (t.height == 2) && GU.branch3.age > 1)
            t.core.grs.leaf1.hidden = true;
        if(GU.branch4 && (t.height == 3) && GU.branch4.age > 1)
            t.core.grs.leaf1.hidden = true;
        if (GU.branch5 && t.height == 4 && GU.branch5.age > 1){
            t.core.grs.leaf2.hidden = true;
            //t.core.grs.leaf1.hidden = true;
        }
        */


        if (t.core.grs.leaf1)
            t.core.grs.leaf1.hidden = t.age <= 16 || t.dead || ((t.height == 2) && t.age > 21) || ((t.height == 3) && t.age > 21);
        if (t.core.grs.leaf2)
            t.core.grs.leaf2.hidden = t.age <= 16 || t.dead || (t.height == 4 && t.age > 21);

        if(G.Tick % 2 == 0){
            t.core.grs.grBox1.scale.y = (t.mag / 100)+0.05;//100
            //t.magw++;
            //t.core.grs.grBox1.scale.y = t.mag / 100;

            var growth = 5*t.age*0.25/1500;
            t.core.grs.grBox1.scale.x = 0.01 + growth;
        }


        t.core.grs.grBox1.wa = t.dirAng + ((t.core.grs.grBox1.wa - t.dirAng) * 0.96);

        if(t.core.grs.apple)
            t.core.grs.apple.hidden = !t.showApple;

        if(t.core.grs.leaf1){
            var loff = -14;
            if(t.height == 3 || t.height == 2)
                loff = -20;

            t.core.grs.leaf1.wa = t.core.grs.grBox1.wa+0.8*t.leafOrder;
            t.core.grs.leaf1.wx = t.pnorm.x * (t.maxLength + loff); // - 12? +2?
            t.core.grs.leaf1.wy = t.pnorm.y * (t.maxLength + loff);

            if(t.core.grs.apple){
                t.core.grs.apple.wx = t.pnorm.x * t.maxLength*0.75;
                t.core.grs.apple.wy = t.pnorm.y * t.maxLength*0.75 + 16;
            }


            if(t.core.grs.leaf2){
                t.core.grs.leaf2.wa = t.core.grs.grBox1.wa - 0.8 * t.leafOrder;
                t.core.grs.leaf2.wx = t.pnorm.x * t.maxLength * 0.4;
                t.core.grs.leaf2.wy = t.pnorm.y * t.maxLength * 0.4;
            }

            var p = t.getPivot({x: 0, y:(t.lheight/2)}, t.core.grs.leaf1);
            t.core.grs.leaf1.wx += p.x;
            t.core.grs.leaf1.wy += p.y;


            if(t.core.grs.leaf2){
                var p = t.getPivot({ x: 0, y: (t.lheight / 2) }, t.core.grs.leaf2);
                t.core.grs.leaf2.wx += p.x;
                t.core.grs.leaf2.wy += p.y;
            }
        }


        var p = t.getPivot({x:0,y:t.mag/2}, t.core.grs.grBox1);
        t.core.grs.grBox1.wx = p.x;
        t.core.grs.grBox1.wy = p.y;
    };


    //graphically rotate around pivot
    getPivot(pivot, gr){
        var t= this;
        var ang = gr.wa;
        //var rad = G.dist(pivot,gr.position);
        var x = Math.sin(ang) * (pivot.y) - Math.cos(ang) * (pivot.x);
        var y = Math.cos(ang) * (pivot.y) + Math.sin(ang) * (pivot.x);

        return {x: x, y: -y};
    }

    PreRender() {
        var t = this;
    }

    CollideStart(e) {
        var t = this;
    };

    CollideEnd(e) {
        var t = this;
    };


}
if (typeof exports !== 'undefined')
    module.exports = g_branch;

