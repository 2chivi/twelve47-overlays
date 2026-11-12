
class g_guy extends Gobj {

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

        if (!G.IsServer) {

            var grPlane = G.Shape(Parts.mats.shadow, Parts.geoPlane, { z: 0, shadow: true, size:45 });
            t.addG(t.core, 'grPlane', grPlane);

            var vsep = 40;
            var isBottom = GU.isBottom;
            var dir = isBottom ? -1 : 1;

            var textHeight = isBottom ? -GU.settings.pollRunners.length * vsep : -40;


            SF.TextMaterial(GU.settings.pollTitle, { fontSize: 24 }, (mat) => {
                var gr = G.Image(mat, {});
                t.addG(t.core, 'grTitle', gr, gr.scale.x / 2, textHeight - 20, 20);
            });

            if (GU.settings.pollLastVoteTwitch != null){
                var latist = `Latest: ${GU.settings.pollLastVoteTwitch} - ${GU.settings.pollLastVote}`;

                SF.TextMaterial(latist, { fontSize: 18 }, (mat) => {
                    var gr = G.Image(mat, {});
                    t.addG(t.core, 'grTitle2', gr, 15 + gr.scale.x / 2, textHeight +7, 20);
                });
            }



            var scaleOut = 7.5;

            //var grBox = G.Shape(Parts.mats.c1, Parts.geoBox, { z: 0, shadow: true, size: scaleOut, scaleY: 4 });
            //t.addG(t.core, 'grBox', grBox, scaleOut *grBox.geometry.width/2);
            //console.log(grBox.geometry.width)
        
            //get max value
            var scaledown = 750;
            var max = GU.settings.pollRunners._max(x=> x.score).score;

            if(max < 2000)
                scaledown = 500;
            if(max < 500)
                scaledown = 250;


            max = max + scaledown;

            GU.settings.pollRunners._orderBy(x=> x.score)._each((r,i)=>{
                var score = Math.max(7, r.score);
                
                //test animated emote
                //r.emote = 'CHEATING';


                var isMax = (max - scaledown) == r.score;
                if(r.score == 0)
                    isMax = false;

                //scaleOut * 100 = width

                var grBox1 = G.Shape(Parts.mats['c'+r.color], Parts.geoBox, 
                    { shadow: true, scaleY: isMax ? 0.3 : 0.28, scaleX: (score / max) * scaleOut });

                var w = grBox1.geometry.width * (score / max) * scaleOut;

                t.addG(t.core, `grBox${i}`, grBox1, w / 2, dir*i *vsep, 15);

     
                var name = r.name + " : " + r.score;



                SF.TextMaterial(name, {fontSize: isMax ? 22 : 19}, (mat)=> {
                    var grTxt = G.Image(mat, { });
                    t.addG(t.core, 'grText' + i, grTxt, grTxt.scale.x / 2, dir*i *vsep+1, 33);

                    console.log('try add img');

                    var emoteMat = Parts.mats[r.emote];

                    //testing aniation
                    if (EM.animations[r.emote] != null) {
                        emoteMat = EM.animations[r.emote].frames[0];
                    }

                    if (r.emote && emoteMat) {
                        var idealWidth = isMax ? 65 : 47;
                        var imgw = emoteMat.map.image.width;

                        var offx = Math.max(w + 15, grTxt.material.map.image.width + 22);

                        var grEmote = G.Image(emoteMat, { size: (idealWidth / imgw) });
                        t.addG(t.core, 'grEmote' + i, grEmote, offx, dir*i * vsep, 32);
                    }
                });

                var ans = {};
                ans[`grEmote${i}`] = [
                    {scale:1, ang:0}, {scale:1.5, ang:Math.PI}, {scale:1, ang:Math.PI*2}
                ];

                t.AddAnimation(t.core, 'score' + r.name.toLowerCase(), 30, { repeat: false, active: false, curve: EN.Curves.get('quad') }, ans);//x,y,ang,scale,alpha
            });

        }
    };

    Tick() {
        var t = this;
    };

    PreRender(){
        var t = this;

        GU.settings.pollRunners._each((runner, i) => {
            if (EM.animations[runner.emote]) {
                EM.FrameAnimation(t.core.grs[`grEmote${i}`], EM.animations[runner.emote]);
            }
        })
    }

    CollideStart(e) {
        var t = this;
    };

    CollideEnd(e) {
        var t = this;
    };

}
if (typeof exports !== 'undefined')
    module.exports = g_guy;

