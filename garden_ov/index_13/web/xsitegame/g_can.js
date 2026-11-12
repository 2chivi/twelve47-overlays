
class g_can extends Gobj {

    //background features need to be function of CG.Scale
    constructor(oid, type, stage = G.Stage_, world = G.World_) {
        super(oid, type, stage, world);
        var t = this;
    }

    Init() {
        var t = this;

        super.Init('dynamic', t.spx, t.spy);
        t.Part('core', G.pBox(5, 5), { isSensor: true, filterMaskBits: 0x0 });

        t.con.m_gravityScale = 0;
        t.target = 500;
        t.speed = 2;


        if (!G.IsServer) {
            var can = G.Image(Parts.mats.can, { size: 0.5 });
            t.addG(t.core, 'can', can, 0, 0, 30);

            t.core.grs.can.wx = t.core.grs.can.scale.x/2;
            t.core.grs.can.grAlpha = 0.01;
            
            t.txtOpts = {
                fontSize: 22,
                strokeThickness: 2,
                fontWeight: 600,
            };
            t.ChangeName('your_twitch');


            t.AddAnimation(t.core, 'pour', 70, { repeat: false, active: false, curve: EN.Curves.get('quad') }, {
                'can': [{ ang: 0 }, { ang: -1.3 }],
            });//x,y,ang,scale,alpha

            t.AddAnimation(t.core, 'pour2', 70, { repeat: false, active: false, curve: EN.Curves.get('quad') }, {
                'can': [{ ang: -1.3 }, { ang: 0 }],
            });//x,y,ang,scale,alpha
        }
    };

    ChangeName(name){
        var t = this;
        t.removeG(t.core, 'grTitle');
        SF.TextMaterial(name, t.txtOpts, (mat) => {
            var gr = G.Image(mat, { size: 1 });
            t.addG(t.core, 'grTitle', gr, 75, -100, 30);
        });
    }

    Pour(target){
        var t= this;
        if(t.going)
            return;
        
        t.going = true;
        t.target = target;

        t.SetPos(target, t.pos.y);
        t.ToggleAnimation('pour', true);
        G.TickFunc(G.Tick + 90, function () {
            t.ToggleAnimation('pour2', true);
        });

        G.TickFunc(G.Tick + 160, function () {
            t.going = false;
        });
    }

    Tick() {
        var t = this;


        if(G.Tick % 3 == 0 && t.core.grs.can.wa < -0.5){
            var p = t.getPivot({ x: 65, y: 50 }, t.core.grs.can);

            if(Math.random() > 0.5){
                Parts.EmitParticle(null, '3', {
                    lifetime: 50,
                    decayDelay: 15,
                    x: t.pos.x + 75 + p.x,
                    y: t.pos.y + 5 + p.y,
                    grav: 0.15,
                    vx: G.ran(-1, 0.25)
                });
            }
            Parts.EmitParticle(null, '3', {
                lifetime: 50,
                decayDelay: 15,
                x: t.pos.x + 75 + p.x + G.ran(0,2),
                y: t.pos.y + p.y + 5 + G.ran(0, 2),
                grav: 0.15,
                vx: G.ran(-1, 0.25)
            });
        }





        if(t.going){
            var nage = G.lerp2('m' + t.oid, t.core.grs.can.grAlpha, 1, 0.06);
            t.core.grs.can.grAlpha = nage;
            if(t.core.grs.grTitle)
                t.core.grs.grTitle.grAlpha = nage;

        }else{
            if(t.target){
                var nage = G.lerp2('m2' + t.oid, t.core.grs.can.grAlpha, 0, 0.06);
                t.core.grs.can.grAlpha = nage;
                if (t.core.grs.grTitle)
                    t.core.grs.grTitle.grAlpha = nage;
            }
        }
    };

    //graphically rotate around pivot
    getPivot(pivot, gr) {
        var t = this;
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
    module.exports = g_can;

