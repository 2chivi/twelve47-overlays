
class g_plant extends Gobj {

    //background features need to be function of CG.Scale
    constructor(oid, type, stage = G.Stage_, world = G.World_) {
        super(oid, type, stage, world);
        var t = this;
        t.alwaysUpdate = true;
    }

    Init() {
        var t = this;

        super.Init('dynamic', t.spx, t.spy);
        t.Part('core', G.pBox(20, 20), { isSensor: true, filterMaskBits: 0x0 });

        t.con.m_gravityScale = 0;

        t.ageRate = 1;//this gets changed
        t.allowAging = true;
        t.age = 0;
        t.endOffset = {x: 0, y: -50};
        t.mag = 50;
        t.endPoint = {x: 0, y: 0};
        
        t.maxLength = 70;
        t.pnorm = {x: 0, y: -1};

        if (!G.IsServer) {

            var grBox1 = G.Shape(Parts.mats['cl1'], Parts.geoBox,
                { shadow: true, scaleY: 0.1, scaleX: 0.1 });

            t.addG(t.core, 'grBox1', grBox1, 0, 0, 10);
        }
    };

    Tick() {
        var t = this;

        if(t.allowAging){
            t.age++;
            t.ageRate = 1;
        }else{
            t.ageRate = 0;
        }
        


        if (G.Tick % 10 == 0) {
            //t.mag++;
            //t.core.grs.grBox1.scale.y = t.mag / 100;
        }
    };

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
    module.exports = g_plant;

