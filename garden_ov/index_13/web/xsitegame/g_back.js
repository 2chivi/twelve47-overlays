
class g_back extends Gobj {

    //background features need to be function of CG.Scale
    constructor(oid, type, stage = G.Stage_, world = G.World_) {
        super(oid, type, stage, world);
        var t = this;
        t.alwaysUpdate = true;
    }

    Init() {
        var t = this;

        super.Init('static', t.spx, t.spy);
        t.Part('core', G.pBox(5, 5), { isSensor: true, filterMaskBits: 0x0 });

        t.con.m_gravityScale = 0;


        if (!G.IsServer) {

            var b1 = G.Plane(Parts.mats.cl21, { scaleX: 30, scaleY:0.14 });
            t.addG(t.core, 'b1', b1, 0, 0, 30);

            var b2 = G.Plane(Parts.mats.cl1, { scaleX: 30, scaleY: 0.12 });
            t.addG(t.core, 'b2', b2, 0, -4, 0);
        }
    };

    Tick() {
        var t = this;


    };

    //graphically rotate around pivot


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
    module.exports = g_back;

