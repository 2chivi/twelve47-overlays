
class g_dude extends Gobj {

    constructor(oid, type, stage = G.Stage_, world = G.World_) {
        super(oid, type, stage, world);
        var t = this;
        t.state = [];
        t.IsServerObject = true;
    }

    Init() {
        var t = this;
        t.speed = 1;
        t.fuel = 0;

        super.Init('dynamic', G.bounds.min.x-200, G.bounds.max.y-44, {
            fixedRotation: true,
        });
        t.con.m_gravityScale = 0;
        t.targetX = (G.bounds.min.x + G.bounds.max.x)/4;
        t.con.setLinearDamping(0.6);
        t.w = 150;

        t.Part('body', G.pBox(t.w, 50), {
            density: 0.41, //mass 1.45
            isSensor: true,
        });

        if(!G.IsServer){
            t.cdata = CG.cdata[0];

            var txt = {
                fontSize: 20, strokeThickness: 4, alpha: 1,
                fontWeight: 600, fill: 'white', zIndex: 2
            };

            //t.addG(t.body, 'b1', { color: 0xffffff, zIndex: 2, alpha:0.5 });

            //var cms = UT.List(EM.channelEmotes);
            //var randomEm = cms.length > 0 ? UT.ran(cms) : UT.ran(UT.List(EM.textures));
            
            var em1 = EM.textures._first(x => !x.chosen);
            if(em1)
                em1.chosen = true;
            if (!em1)
                em1 = EM.textures._first(x => x.chosen);

            var emoteTex = EM.textures[CG.trainEmote] ? EM.textures[CG.trainEmote] : em1;


            t.addG(t.body, 'emote', G.image(null, emoteTex,
                { size: 0.5, zIndex: 1 }), -54+CG.sdata.trainConductorX, -8+CG.sdata.trainConductorY, 0, 25);

            var isCustomEngine = CG.textures.custom_engine != null;
            var tex = CG.textures.custom_engine ? CG.textures.custom_engine : CG.textures.engine;
            var targetWidth = 175;
            var size = targetWidth / tex.width;
            var height = tex.height * size;
            
            var gr = G.image(null, tex, { tint: isCustomEngine ? 0xffffff : t.cdata.color, size:size, zIndex:1 });
            //var ft = G.filterTex(CG.fWhite, 10, gr, { });

            t.SetPos(t.pos.x, G.bounds.max.y-((height/2)+0));


            t.addG(t.body, 'b1', gr);//G.image(null, ft, { zIndex:2 }));
            if(!isCustomEngine)
                t.body.grs.b1.wa = -0.05;

            if(!isCustomEngine){
                t.addG(t.body, 'smoke', G.rect(null, 18, 16, 3, 
                    { color: t.cdata.dark, zIndex: 2, alpha: 1 }), 37, -30);
            }


            //45 == wheel target

            var isCustom = CG.textures.custom_engine_wheel != null;
            var tex = CG.textures.custom_engine_wheel ? CG.textures.custom_engine_wheel : CG.textures.wheel;
            var targetWidth = 45;
            var size = targetWidth / tex.width;

            t.addG(t.body, 'wheel1', G.image(null, tex,
                { size: size, zIndex: 2, tint: isCustom ? 0xffffff : t.cdata.color }), -60, -20+ (height / 2) + CG.sdata.trainWheelY);
            t.addG(t.body, 'wheel2', G.image(null, tex,
                { size: size, zIndex: 2, tint: isCustom ? 0xffffff : t.cdata.color }), -16, -20 + (height / 2) + CG.sdata.trainWheelY);

            var isCustom = CG.textures.custom_car_wheel != null;
            var tex = CG.textures.custom_car_wheel ? CG.textures.custom_car_wheel : CG.textures.wheel2;
            var targetWidth = 40;
            var size = targetWidth / tex.width;


            t.addG(t.body, 'wheel3', G.image(null, tex,
                { size: size, zIndex: 2, tint: isCustom ? 0xffffff : t.cdata.color }), 20, -15 + (height/2) + CG.sdata.trainWheelY);

            t.AddAnimation(t.body, 'emote', 33, true, true, EN.Curves.get('quad'), {
                'emote': [[0, 0, -0.1], [0, 5, 0.1]]
            });
            if(!isCustomEngine){
                t.AddAnimation(t.body, 'smok', 7, true, true, EN.Curves.get('quad'), {
                    'smoke': [[0, 0, 0], [0, -6, 0]]
                });
            }
            t.AddAnimation(t.body, 'emote2', 20, true, true, EN.Curves.get('linear'), {
                'wheel3': [[0, 0, 0], [0, 0, Math.PI*2]]
            }, false);

            t.AddAnimation(t.body, 'emote2', 30, true, true, EN.Curves.get('linear'), {
                'wheel1': [[0, 0, 0], [0, 0, Math.PI * 2]],
                'wheel2': [[0, 0, 0], [0, 0, Math.PI * 2]],
            }, false);
        }
    };

    gotFuel(amount){
        var t = this;
        if(t.targetX < 5000){
            if(amount > 400){
                t.targetX = Math.min(G.bounds.max.x - 100, t.targetX + 120);
                G.TickFunc(G.Tick+180, function(){  
                    t.targetX -= 80;
                })
            }
        }
        t.fuel = 150;
    }

    Tick() {
        var t = this;
        var diff = Math.abs(t.pos.x - t.targetX);

        t.body.grs.wheel1.animate.period = Math.ceil(30*t.speed);
        t.body.grs.wheel2.animate.period = Math.ceil(30 * t.speed);
        t.body.grs.wheel3.animate.period = Math.ceil(20 * t.speed);

        if (t.body.grs.smoke)
            t.body.grs.smoke.animate.period = Math.ceil(7 * t.speed);

        if(GU.train && GU.train.targetX < 25000){
            if (G.Tick % 100 == 0)
                GU.train.targetX = Math.min(G.bounds.max.x - 100, GU.train.targetX + 10);
            if (G.Tick % 100 == 50)
                GU.train.targetX = Math.min(G.bounds.max.x - 100, GU.train.targetX - 10);
        }

        if(t.fuel > -30)
            t.fuel--;

        if(diff > 20 && t.pos.x < t.targetX)
            t.speed = 0.8;
        else
            t.speed = 1;

        if(diff > 5){
            if (t.pos.x < t.targetX) {
                t.SetVel(t.vel.x + 0.1, 0);
            }

            if (t.pos.x > t.targetX) {
                t.SetVel(t.vel.x - 0.1, 0);
            }
        }

        

        if ((G.Tick % Math.ceil(14 * t.speed) == 0)){
            G.spawnParticle(Parts.fxCircle, t, {
                life: 30,
                tint: t.fuel > 0 ? 0x772ce8 : 0xffffff,
                pos: { x: CG.sdata.trainSmokeX + t.body.grs.b1.x+37, y: CG.sdata.trainSmokeY + t.body.grs.b1.y-30 },
                vel: { x: -1.2, y: -1.5 }
            });
        }

        if(G.Tick % 7 == 0 && t.pos.x < t.targetX){
            G.spawnParticle(Parts.fxCircle, t, {
                life: 6,
                tint: 0xffff00,
                pos: { x: t.body.grs.wheel1.x, y: t.body.grs.wheel1.y + 20 },
                vel: { x: G.ran(-5,1), y: G.ran(-2,1) },
                scale: { x: 0.2, y: 0.2 },
            });
            
        }

        if (G.Tick % 7 == 3 && t.pos.x < t.targetX){
            G.spawnParticle(Parts.fxCircle, t, {
                life: 6,
                tint: 0xffff00,
                pos: { x: t.body.grs.wheel2.x, y: t.body.grs.wheel2.y + 20 },
                vel: { x: G.ran(-5, 1), y: G.ran(-2, 1) },
                scale: { x: 0.2, y: 0.2 },
            });
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
    module.exports = g_dude;

