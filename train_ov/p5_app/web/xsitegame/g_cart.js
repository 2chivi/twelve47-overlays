
class g_cart extends Gobj {

    constructor(oid, type, stage = G.Stage_, world = G.World_) {
        super(oid, type, stage, world);
        var t = this;
        t.state = [];
        t.IsServerObject = true;
    }

    Init() {
        var t = this;

        super.Init('dynamic', -2000, G.bounds.max.y, {
            fixedRotation: true,
        });
        t.con.m_gravityScale = 0;

        t.con.setLinearDamping(0.6);
        t.w = 150;
        t.peep1 = null;
        t.peep2 = null;
        t.speed = 1;

        t.Part('body', G.pBox(t.w, 50), {
            density: 0.41, //mass 1.45
            isSensor: true,
        });

        if (!G.IsServer) {
            t.cdata = CG.cdata[0];
 
            t.txt = {
                fontSize: 14, strokeThickness: 4, alpha: 0,
                fontWeight: 600, fill: 'white', zIndex: 2,
            };
            t.emoteName1 = null;
            t.emoteName2 = null;

            t.addG(t.body, 'name1', G.text(null, '', null, t.txt), CG.sdata.trainEmoteH + CG.sdata.trainEmoteX, -50);
            t.addG(t.body, 'name2', G.text(null, '', null, t.txt), -CG.sdata.trainEmoteH + CG.sdata.trainEmoteX, -50);

            //var cms = UT.List(EM.channelEmotes);
            //var em1 = cms.length > 0 ? UT.ran(cms) : UT.ran(UT.List(EM.textures));
            //var em2 = cms.length > 0 ? UT.ran(cms) : UT.ran(UT.List(EM.textures));

            var em1 = EM.textures._first(x=> !x.chosen);
            if(em1)
                em1.chosen = true;
            var em2 = EM.textures._first(x => !x.chosen);
            if(em2)
                em2.chosen = true;

            if (!em1)
                em1 = EM.textures._first(x => x.chosen);
            if (!em2)
                em2 = EM.textures._first(x => x.chosen);

            CG.ResetRandomEmote();
            CG.ResetRandomEmote();

            t.addG(t.body, 'emote1', G.image(null, em1,
                { size: 0.6, zIndex: 1.4, alpha: 0 }), CG.sdata.trainEmoteH + CG.sdata.trainEmoteX, -4 + CG.sdata.trainEmoteY, 0, 25);
            t.addG(t.body, 'emote2', G.image(null, em2,
                { size: 0.6, zIndex: 1.4, alpha: 0 }), -CG.sdata.trainEmoteH + CG.sdata.trainEmoteX, -4 + CG.sdata.trainEmoteY, 0, 25);

            var isCustom = CG.textures.custom_car != null;
            var tex = CG.textures.custom_car ? CG.textures.custom_car : CG.textures.cart;
            var targetWidth = 170;
            var size = targetWidth / tex.width;
            t.cheight = tex.height * size;

            t.addG(t.body, 'b1', G.image(null, tex, 
                { tint: isCustom ? 0xffffff : t.cdata.dim, size: size, alpha:0, zIndex:1.5 }), 0, -10);

            var isCustom = CG.textures.custom_car_wheel != null;
            var tex = CG.textures.custom_car_wheel ? CG.textures.custom_car_wheel : CG.textures.wheel2;
            var targetWidth = 40;
            var size = targetWidth / tex.width;

            t.addG(t.body, 'wheel1', G.image(null, tex,
                { size: size, zIndex: 2, tint: isCustom ? 0xffffff : t.cdata.color }), -CG.sdata.trainWheelH + CG.sdata.trainWheelX, -17+ (t.cheight/2) + CG.sdata.trainWheelY);
            t.addG(t.body, 'wheel2', G.image(null, tex,
                { size: size, zIndex: 2, tint: isCustom ? 0xffffff : t.cdata.color }), CG.sdata.trainWheelH + CG.sdata.trainWheelX, -17 + (t.cheight/2) + CG.sdata.trainWheelY);

            t.AddAnimation(t.body, 'emote', 33, true, true, EN.Curves.get('quad'), {
                'emote1': [[0, 0, -0.1], [0, 5, 0.1]],
                'emote2': [[0, 0, -0.1], [0, 5, 0.1]],
            });
            t.AddAnimation(t.body, 'emote2', 20, true, true, EN.Curves.get('linear'), {
                'wheel1': [[0, 0, 0], [0, 0, Math.PI * 2]],
                'wheel2': [[0, 0, 0], [0, 0, Math.PI * 2]],
            }, false);
        }

        t.SetPos(-9999,0);
    };

    Tick() {
        var t = this;
        if(t.leader){
            t.speed = t.leader.speed;
            t.body.grs.wheel1.animate.period = Math.ceil(20 * t.speed);
            t.body.grs.wheel2.animate.period = Math.ceil(20 * t.speed);
        }
        
        var total = (t.peep1 ? t.peep1.amount : 0) + (t.peep2 ? t.peep2.amount : 0);
        if (total > 2000 && !CG.textures.custom_car){
            t.body.grs.b1.tint = 0xFFD700;
            t.body.grs.wheel1.tint = 0xD4AF37;
            t.body.grs.wheel2.tint = 0xD4AF37;
        }

        if (t.leader && t.leader.pos.x > -5500){
            var target = t.leader.pos.x-170+10;
            var vx = 0;
            var diff = Math.abs(t.pos.x-target);

            if(diff > 5)
                vx = t.pos.x > target ? -4 : 4;
            else
                t.SetPos(target, G.bounds.max.y - ((t.cheight / 2)+0));

            if(diff > 500)
                t.SetPos(t.leader.pos.x, G.bounds.max.y - ((t.cheight / 2)+0));

            t.SetVel(t.leader.vel.x+vx, 0);
        }

        if(t.body.grs.b1.alpha < 1)
            G.lerp(t.body.grs.b1, 'alpha', 1, 0.02);

        if(t.peep1){

            if(t.peep1.name != t.body.grs.name1.text)
                G.text(t.body.grs.name1, t.peep1.name, null, t.txt);

            if(t.peep1.emoteName != t.emoteName1){
                t.emoteName1 = t.peep1.emoteName;

                G.image(t.body.grs.emote1, EM.textures[t.peep1.emoteName],
                    { size: 0.6, zIndex: 3, alpha: 0 });

                //t.body.grs.emote1.pivot.set(t.body.grs.emote1.texture.width / 2, 25 + (t.body.grs.emote1.texture.height / 2));

                console.log(t.body.grs.emote2.wx, t.oid);
            }

            G.lerp(t.body.grs.emote1, 'alpha', 0.95, 0.02);
            t.body.grs.name1.alpha = 0.85;
            t.body.grs.name1.wa = -0.15;

            console.log(t.body.grs.emote1.alpha);

        }
        if(t.peep2){
            if (t.peep2.name != t.body.grs.name2.text)
                G.text(t.body.grs.name2, t.peep2.name, null, t.txt);

            if (t.peep2.emoteName != t.emoteName2) {
                t.emoteName2 = t.peep2.emoteName;

                G.image(t.body.grs.emote2, EM.textures[t.peep2.emoteName],
                    { size: 0.6, zIndex: 3, alpha: 0 });

                //t.body.grs.emote2.pivot.set(t.body.grs.emote2.texture.width/2, 25+(t.body.grs.emote2.texture.height/2));

                console.log(t.body.grs.emote2.wx, t.oid);
            }

            G.lerp(t.body.grs.emote2, 'alpha', 0.95, 0.02);
            t.body.grs.name2.alpha = 0.85;
            t.body.grs.name2.wa = -0.15;
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
    module.exports = g_cart;

