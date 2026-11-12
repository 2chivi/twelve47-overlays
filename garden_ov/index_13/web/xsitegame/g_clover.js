
class g_clover extends Gobj {

    //background features need to be function of CG.Scale
    constructor(oid, type, stage = G.Stage_, world = G.World_) {
        super(oid, type, stage, world);
        var t = this;
        t.alwaysUpdate = true;
    }

    Init() {
        var t = this;

        super.Init('dynamic', t.spx, t.spy);
        t.Part('core', G.pBox(5, 5), { isSensor: true, filterMaskBits: 0x0 });

        t.con.m_gravityScale = 0;

        t.isDaisy = t.flowerType == 'daisy';
        t.isBlue = t.flowerType == 'blue';
        t.isGrass = t.flowerType == 'grass';
        t.isDelphy = t.flowerType == 'delphy';
        t.isClover = t.flowerType == 'clover';
        t.bloom = false;
        t.targetAge = 0.8;
        t.age = 0.01;
        t.growthSpeed = 1.5;
        t.bloomDelay = G.ran(120,60);
        t.flowerAge = t.isBlue ? 0.01 : 0.5;
        t.tickCreated = G.Tick;

        if(t.isClover || t.isDelphy)
            t.bloomDelay = 20;


        //t.windResistance = 1;
        var z = t.isFar ? 25 : G.ran(35,5);
        t.scl = 0.46;
        var isFar = t.isFar;

        var coltex = Parts.mats['cd1'];
        
        if (isFar) {
            z = 10;
            t.scl *= 0.8;//0.8

            coltex = Parts.mats['cl1'];
        }

        //t.plantHeight = G.ran(t.averageHeight,t.averageHeight*0.2);
        t.lengthScaleDiff = 1;
        t.widthScaleDiff = 1;
        t.blength = t.plantHeight * t.scl * t.lengthScaleDiff;//gets reset in .tick
        t.dangle = G.ran(0, 0.23);

        t.stemWidth = t.stemWidth ? t.stemWidth : 10;
        //for wind wave calc
        var xaxis = t.spx - G.bounds.min.x;
        var pctxaxis = xaxis / (G.bounds.max.x - G.bounds.min.x);
        t.pctxaxis = pctxaxis;

        

        if (!G.IsServer) {

            var seed = G.Plane(coltex,
                { width: 20, height: 20 });
            //t.addG(t.core, 'seed', seed, 0, -100, z+20);


            var p1 = G.Plane(coltex, 
                { height: t.blength, width: t.stemWidth * t.scl * t.widthScaleDiff });
            t.addG(t.core, 'p1', p1, 0, 0, z-1);
            t.core.grs.p1.wa = 0.2;

            var p2Diff = t.isDelphy ? 0.6 : 0.8;
            var p2 = G.Plane(coltex,
                { height: t.blength, width: t.stemWidth * p2Diff * t.scl * t.widthScaleDiff });
            t.addG(t.core, 'p2', p2, 0, 0, z-1);


            //var flower = G.Plane(coltex, { size:0.8*scl });
            if(t.isDaisy){
                var m = Parts.mats.bulb;
                var bulb = G.Image(Parts.mats.bulb, { size: 0.0001 });

                t.addG(t.core, 'bulb', bulb, 0, 0, z + 2);
            }

            if(!t.isGrass && !t.isDelphy){
                var mdaisy = isFar ? Parts.mats[t.flowerType + 't'] : Parts.mats[t.flowerType];
                //mdaisy = Parts.mats.bulb;
                var flower = G.Image(mdaisy, { size: 0.001 });

                //var flower = G.Shape(coltex, Parts.geoPlane,
                //{ shadow: true, scaleY: 0.5 * scl, scaleX: 0.5 * scl });
                t.addG(t.core, 'flower', flower, 0, 0, z + 2);
                t.core.grs.flower.wa = G.ran(0, Math.PI * 0.2)
            }else if (t.isDelphy){
                //var lmat = G.Image(Parts.mats.leaf3, {size:0.55*t.scl});
                //t.lheight = Parts.mats.leaf3.map.source.data.height * 0.55 * t.scl;
                //t.addG(t.core, 'leafa', lmat, 0,0, z-1.5);
                //var lmat = G.Image(Parts.mats.leaf3, { size: 0.55 * t.scl });
                //t.addG(t.core, 'leafb', lmat, 0, 0, z -1.5);

                for(var i = 0; i < 14; i++){
                    var mdaisy = isFar ? Parts.mats[t.flowerType + 't'] : Parts.mats[t.flowerType];
                    var flower = G.Image(mdaisy, { size: 0.0001 });

                    t.addG(t.core, `delphy${i}`, flower, 0, 0, z + 2);
                    //t.core.grs[`delphy${i}`].wa = G.ran(0, Math.PI * 0.2)
                }
            }
            if(t.isBlue){
                var inner = G.Image(Parts.mats.blueInner, { size: 0.001 });
                t.addG(t.core, 'inner', inner, 0, 0, z + 2.2);
            }
            if(t.isDaisy){
                var mat = isFar ? Parts.mats.daisyInnert : Parts.mats.daisyInner;
                var inner = G.Image(mat, { size: 0.001 });
                t.addG(t.core, 'inner', inner, 0, 0, z + 2.2);
            }

            t.hidden = true;
        }
    };

    Fade(){
        var t= this;
        if(t.setToFade)
            return;
        t.setToFade = true;
        

        setTimeout(()=>{
            t.fading = true;

            setTimeout(()=>{
                G.RemoveObject_(t);
            },4000)
        },2000 + Math.random()*8000);
    }

    Tick() {
        var t = this;

        if(t.age > 0.05)
            t.hidden = false;

        if(t.fading){
            if(t.core.grs.flower)
                G.lerp(t.core.grs.flower, 'grAlpha', 0, 0.01);
            if(t.core.grs.inner)
                G.lerp(t.core.grs.inner, 'grAlpha', 0, 0.01);
            if (t.isDelphy){
                for(var i = 0; i < 14; i++){
                    G.lerp(t.core.grs[`delphy${i}`], 'grAlpha', 0, 0.01);
                }
            }
            G.lerp(t.core.grs.p1, 'grAlpha', 0, 0.01);
            G.lerp(t.core.grs.p2, 'grAlpha', 0, 0.01);
        }

        if(t.age < t.targetAge){
            //0.01
            var nage = G.lerp2('m' + t.oid, t.age, t.targetAge, 0.005 * t.growthSpeed);
            t.age = nage;


            var lengthAge = t.age;
            if(t.isBlue)
                lengthAge = Math.min(1.1, t.age);

            t.blength = t.plantHeight * t.scl * t.lengthScaleDiff * lengthAge;
            t.bwidth = t.stemWidth * t.scl * t.widthScaleDiff * lengthAge;
            t.setGHeight(t.core.grs.p1, t.bwidth, t.blength);
            t.setGHeight(t.core.grs.p2, t.bwidth * (t.isDelphy ? 0.5 : 0.8), t.blength);
        }

        if(t.flowerAge < t.targetAge && G.Tick > (t.tickCreated + t.bloomDelay)){
            var speed = t.isDelphy ? 0.002 : 0.005;
            speed = speed * t.growthSpeed;
            var nage = G.lerp2('m2' + t.oid, t.flowerAge, t.targetAge, speed);
            t.flowerAge = nage;
        }
        


        t.core.grs.p1.wa = t.dangle*0.5 + ((t.core.grs.p1.wa - (t.dangle*0.5)) * 0.95);
        t.core.grs.p2.wa = t.dangle + ((t.core.grs.p2.wa-t.dangle) * 0.96);



        if(G.Tick % 1 == 0){
            var wind = GU.lastWind;
            var test2 = t.pctxaxis * 50;

            if(G.Tick > GU.lastWindChange + test2){
                wind = GU.wind;
            }

            t.core.grs.p1.wa += wind * 0.75 * t.windResistance;
            t.core.grs.p2.wa += wind * t.windResistance;
        }
        
        t.applyPivot({x: 0, y: t.blength*0.5}, {x: 0, y:0}, t.core.grs.p1);

        t.applyPivot(
            { x: 0, y: t.blength * 0.5 }, 
            { x: t.core.grs.p1.nx.x * t.blength * 0.97, y: t.core.grs.p1.nx.y*t.blength*0.97 }, 
            t.core.grs.p2
        );

        if (!t.isGrass && !t.isDelphy){
            t.core.grs.flower.wx = t.core.grs.p2.wx + t.core.grs.p2.nx.x * (t.blength * 0.5 - 4);
            t.core.grs.flower.wy = t.core.grs.p2.wy + t.core.grs.p2.nx.y * (t.blength * 0.5 - 4);

            if (t.flowerAge < t.targetAge){
                var w = t.core.grs.flower.material.map.source.data.width;
                var h = t.core.grs.flower.material.map.source.data.height;

                t.core.grs.flower.scale.x = t.flowerAge * w * t.scl * t.flowerScale;
                t.core.grs.flower.scale.y = t.flowerAge * h * t.scl * t.flowerScale;
            }

            if (t.core.grs.inner) {
                t.core.grs.inner.wx = t.core.grs.flower.wx;
                t.core.grs.inner.wy = t.core.grs.flower.wy;
                t.core.grs.inner.scale.x = t.core.grs.flower.scale.x;
                t.core.grs.inner.scale.y = t.core.grs.flower.scale.y;
            }
        }

        if(t.isDaisy){
            if(G.Tick > (t.tickCreated + t.bloomDelay)){
                t.core.grs.flower.hidden = false;
                t.core.grs.inner.hidden = false;
                t.core.grs.bulb.hidden = true;
            }else{
                t.core.grs.flower.hidden = true;
                t.core.grs.inner.hidden = true;
                t.core.grs.bulb.hidden = false;

                t.core.grs.bulb.wx = t.core.grs.p2.wx + t.core.grs.p2.nx.x * (t.blength * 0.5 - 4);
                t.core.grs.bulb.wy = t.core.grs.p2.wy + t.core.grs.p2.nx.y * (t.blength * 0.5 - 4);
                if (t.age < t.targetAge) {
                    var w = t.core.grs.bulb.material.map.source.data.width;
                    var h = t.core.grs.bulb.material.map.source.data.height;

                    t.core.grs.bulb.scale.x = t.age * w * t.scl * t.flowerScale * 0.5;
                    t.core.grs.bulb.scale.y = t.age * h * t.scl * t.flowerScale * 0.5;
                }
                t.core.grs.bulb.wa = t.core.grs.p2.wa;
            }
        }

        if(t.isDelphy){
            var w = t.core.grs.delphy0.material.map.source.data.width;
            var h = t.core.grs.delphy0.material.map.source.data.height;


            for(var i = 0; i < 14; i++){
                var f = t.core.grs[`delphy${i}`];
                var scaleUp = Math.ceil(i / 2) * 2;
                f.scale.x = t.flowerAge * w * t.scl * t.flowerScale + (scaleUp * t.flowerAge * t.scl*2.2);
                f.scale.y = t.flowerAge * h * t.scl * t.flowerScale + (scaleUp * t.flowerAge * t.scl*2.2);
                
                var oscl = t.flowerAge * t.scl*3.3;

                var wsep = 0.2 * oscl * Math.ceil(i/2) + 4 * oscl;
                var vsep = oscl * 5 + i*0.18 * oscl;
                var length = (t.blength * 0.5 + 4) - i * vsep;
                var dx = i % 2 == 1 ? wsep : -wsep;
                f.wx = t.core.grs.p2.wx+ dx + t.core.grs.p2.nx.x * (length);
                f.wy = t.core.grs.p2.wy + t.core.grs.p2.nx.y * (length);
            }
        }

    };

    setGHeight(gr, w, h){
        //gr.scale.y = h / gr.geometry.height;

        gr.scale.set(w / 100, h / 100);
    }

    //graphically rotate around pivot
    applyPivot(pivot, off, gr) {
        var ang = gr.wa;
        //var rad = G.dist(pivot,gr.position);
        var x = Math.sin(ang) * (pivot.y) - Math.cos(ang) * (pivot.x);
        var y = Math.cos(ang) * (pivot.y) + Math.sin(ang) * (pivot.x);

        gr.nx = G.vnorm({x,y:-y});
        gr.wx = x + off.x;
        gr.wy = -y + off.y;
    }

    getPivot(pivot, gr) {
        var ang = gr.wa;
        //var rad = G.dist(pivot,gr.position);
        var x = Math.sin(ang) * (pivot.y) - Math.cos(ang) * (pivot.x);
        var y = Math.cos(ang) * (pivot.y) + Math.sin(ang) * (pivot.x);

        return { x: x, y: -y };
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
    module.exports = g_clover;

