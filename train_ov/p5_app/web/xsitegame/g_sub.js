
class g_sub extends Gobj {

    constructor(oid, type, stage = G.Stage_, world = G.World_) {
        super(oid, type, stage, world);
        var t = this;
        t.state = [];
        t.IsServerObject = true;
        t.subType = 'sub';
        t.amount = 100;
    }

    Init() {
        var t = this;
        t.death = G.Tick + 34;

        super.Init('dynamic', t.spx, t.spy, {
            fixedRotation: true,
        });
        t.con.m_gravityScale = 0.2;

        t.con.setLinearDamping(0.6);

        t.Part('body', G.pBox(50, 50), {
            isSensor: true,
        });

        if (!G.IsServer) {
            t.cdata = CG.cdata[0];
            var size = t.subType == 'bit' ? 0.5 : 1.1;

            t.addG(t.body, 'b1', G.image(null, CG.textures[t.subType],
                { size, alpha: 0, zIndex:-1 }), 1, -10);
            

            t.AddAnimation(t.body, 'emote2', 60, true, true, EN.Curves.get('linear'), {
                'b1': [[0, 0, 0], [0, 0, Math.PI * 2]],
            }, false);

        }
    };

    Tick() {
        var t = this;
        if(GU.train && GU.train.vel)
            t.SetVel(GU.train.vel.x,t.vel.y);

        if (t.body.grs.b1.alpha < 1)
            G.lerp(t.body.grs.b1, 'alpha', 1, 0.04);

        if(G.Tick > t.death){
            if(GU.train){
                GU.train.gotFuel(t.amount);

                for(var i =0; i < 10; i++){
                    G.spawnParticle(Parts.fxCircle, t, {
                        life: 10,
                        tint: 0x772ce8,
                        pos: { x: t.pos.x, y: t.pos.y },
                        vel: { x: G.ran(0,2), y: G.ran(-4,2) }
                    });
                }
            }

            G.RemoveObject_(t);
        }
    };

    CollideStart(mySubType, objSubType, obj, contact) {
        var t = this;
    };

    CollideEnd(mySubType, objSubType, obj, contact) {
        var t = this;
    };
}
if (typeof exports !== 'undefined')
    module.exports = g_sub;

