
g_back = class g_back extends Gobj {

    constructor(oid, type, stage = G.Stage_, world = G.World_) {
        super(oid, type, stage, world);
        var t = this;
        t.radius = 200;
        t.ms = 0;

        t.width = t.radius*2 + 25;
        t.height = t.radius * 2 + 25;
        t.state = ['spx', 'spy', 'width', 'height'];
        t.mods = ['spx', 'spy', 'width', 'height'];
        t.alwaysUpdate = true;
        
    }

    //text appearing / shrinking dynamically
    //tickers on the edges + arrows.  Slows down on turn

    Init() {
        var t = this;
        super.Init('static', t.spx, t.spy);
        t.IsTerrain = true;

        t.Part('terrain', G.pBox(t.width, t.height), {
            filterCategoryBits: G.cats[2]
        });

        t.lastTime = Date.now();

        if (!G.IsServer) {
            t.txt = {
                fontSize: 65, strokeThickness: 4, alpha: 1,
                fontWeight: 500, fill: 'white', zIndex: 12,
            };


            var points = [0,0, 0.7,3, 1.4,0];
            var gr = G.poly(null, points, { alignment:0, color: 0xff1110, size: 11, zIndex:2, lineWidth:0.2, lineColor: 0xffffff })
            t.addG(t.terrain, 'grArrow', gr, 0, -t.radius-12);

            //var gr = G.rect(null, 44,60, 16, { color:CG.cdata[1].dark, zIndex:-0.001, lineWidth:2 });
            //t.addG(t.terrain, 'grArrowBack', gr, 2, -t.radius-8)

            var gr = G.rect(null, t.width+15, t.height+15, 20, { zIndex:-1, texture: CG.textures.metalTile, tint: CG.cdata[5].dark2, alpha: 0.5, lineWidth:3 })
            t.addG(t.terrain, 'grBack', gr, 3);

            var gr = G.rect(null, 205, 70, 5, { texture: CG.textures.metalTile, tint: 0x000077, zIndex: 10, lineWidth:3 })
            t.addG(t.terrain, 'grc1', gr, 0, t.radius);

            var gr = G.text(null, '00:00',null, t.txt);
            t.addG(t.terrain, 'grclock', gr, -2, t.radius);

            var gr = G.circle(null, t.radius+22, { color: 0x0, zIndex:-0.1, alpha:0.6  })
            t.addG(t.terrain, 'grcircle', gr, 0,0);

            //t.StartTimer();
        }
    };

    StartTimer(){
        var t= this;
        t.lastTime = Date.now();
        t.ms = (GU.appInfo.wheelTimer ? GU.appInfo.wheelTimer : 120) * 1000;
    }

    ShowMessage(msg){
        var t = this;
        t.removeG(t.terrain, 'grmsg');
        t.removeG(t.terrain, 'grboxmsg');

        var txtOpts = {
            fontSize: 35, strokeThickness: 4, alpha: 1,
            fontWeight: 500, fill: 'white', zIndex: 12, wordWrap: true, wordWrapWidth: 500
        };

        var grtxt = G.text(null, msg, null, txtOpts);

        while (grtxt.width > 600 || grtxt.height > 150){
            txtOpts.fontSize--;
            grtxt = G.text(null, msg, null, txtOpts)
        }


        var gr = G.rect(null, grtxt.width + 20, grtxt.height+20, 4, { color: 0x0, alpha:0.8 })
        t.addG(t.terrain, 'grboxmsg', gr, 0, -t.radius - 70);
        G.reOrderNeeded = true;


        var g = t.addG(t.terrain, 'grmsg', grtxt, 0, -t.radius - 70);

        clearTimeout(t.ttMessage);
        t.ttMessage = setTimeout(function(){
            t.removeG(t.terrain, 'grmsg');
            t.removeG(t.terrain, 'grboxmsg');
        }, 5000)
    }

    Tick() {
        var t = this;

        t.terrain.grs.grclock.hidden = t.ms <= 800;
        t.terrain.grs.grc1.hidden = t.ms <= 800;

        if(G.Tick % 10 == 0 && t.ms > 800){

            
            t.ms -= Date.now() - t.lastTime;
            var seconds = Math.floor(t.ms / 1000);
            var minutes = Math.floor(seconds / 60);

            G.text(t.terrain.grs.grclock, String(minutes).padStart(2,'0') + ":" + String(seconds-(minutes*60)).padStart(2,'0'), null, t.txt);
            t.lastTime = Date.now();
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
    module.exports = g_back;

